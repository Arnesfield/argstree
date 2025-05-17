import { isOption } from '../lib/is-option';
import { split as $split, Split } from '../lib/split';
import { Schema } from '../schema/schema.types';
import { Arg } from '../types/arg.types';
import { NonEmptyArray } from '../types/util.types';
import { NodeOptions } from './cnode';
import { Alias, NormalizedOptions } from './normalize';

// NOTE: internal

export interface ParsedArg extends Omit<Arg, 'raw'> {
  /** The alias used to parse argument if any. */
  alias?: string;
}

export interface ResolverSplit extends Split {
  list?: NonEmptyArray<Alias>;
}

// same as NodeOptions but some props are required
export type ResolverItem<T> = Omit<NodeOptions<T>, 'key' | 'args'> &
  Required<Pick<NodeOptions<T>, 'key' | 'args'>>;

export interface ResolverResult<T> {
  arg: Arg;
  split?: ResolverSplit;
  items?: NonEmptyArray<ResolverItem<T>>;
}

export function resolveArgs<T>(s: Pick<Schema<T>, 'options'>): string[] {
  const a = s.options.args;
  return typeof a === 'string' ? [a] : Array.isArray(a) ? a.slice() : [];
}

/**
 * WARNING: Note that {@linkcode resolve} should finish before another
 * {@linkcode resolve} call since the normalized options state {@linkcode opts}
 * is persisted every call and would overwrite the options of the previous call
 * if it was still ongoing.
 */
export class Resolver<T> {
  private opts!: NormalizedOptions<T>;

  private get(
    arg: ParsedArg,
    assignable?: boolean
  ): ResolverItem<T> | undefined {
    const schema = this.opts.args[arg.key];
    if (
      schema &&
      (!assignable || (schema.options.assign ?? schema.type === 'option'))
    ) {
      // save value if any
      const args = resolveArgs(schema);
      arg.value != null && args.push(arg.value);
      return { key: arg.key, alias: arg.alias, value: arg.value, args, schema };
    }
  }

  private alias(aliases: NonEmptyArray<Alias>, value?: string) {
    // assignable arg --option: initial 1, 2
    // alias -a: --option 3, 4, 5
    // scenario: -a=6

    // convert aliases to options
    // make sure the last option is assignable
    const hasValue = value != null;
    const lItem = this.get(aliases[aliases.length - 1], hasValue);

    if (!lItem) return;

    // at this point, if a value is assigned, lItem would always be set
    // otherwise, lItem was parsed normally like the loop below.
    // this ensures that the options.handler call is not called twice

    // assume 'items' always has value
    return aliases.map((alias, i) => {
      // reuse last parsed item
      // otherwise, assume that aliases will always map to options since
      // it does not have to be assignable (only for the last alias arg)
      // also, no handler fallback for aliases!
      const last = i === aliases.length - 1;
      const item = last ? lItem : this.get(alias)!;

      item.args.push(...alias.args);
      // add value to the last item
      if (last && hasValue) {
        item.args.push(value);
        item.value = value;
      }

      return item;
    }) as NonEmptyArray<ResolverItem<T>>;
  }

  private split(arg: string) {
    // only accept aliases
    // remove first `-` for alias
    // considered as split only if alias args were found.
    // note that split.values would always exist as keys in opts.aliases
    // as we use opts.names for splitting which is derived from opts.aliases
    let s: ResolverSplit | undefined;
    if (
      isOption(arg, 'short') &&
      (s = $split(arg.slice(1), this.opts.keys)).values.length > 0
    ) {
      // only set list if has no remainder
      if (s.remainder.length === 0) {
        // get args per alias and assume `-{name}` always exists
        type A = NonEmptyArray<Alias>;
        s.list = s.values.map(key => this.opts.aliases['-' + key]) as A;
      }
      return s;
    }
  }

  resolve(
    raw: string,
    opts: NormalizedOptions<T>
  ): ResolverResult<T> | undefined {
    // immediately treat as value if the current node cannot actually create children
    if (!opts.fertile) return;

    // NOTE: set normalized options for other methods to access
    this.opts = opts;

    let items, alias, split;
    const arg: Arg = { raw, key: raw };

    if ((items = this.get(arg))) {
      return { arg, items: [items] };
    }

    // assume arg.raw and raw are the same
    const index = raw.lastIndexOf('=');
    const hasValue = index > -1;
    if (hasValue) {
      arg.key = raw.slice(0, index);
      arg.value = raw.slice(index + 1);
    }

    // parse options from options.args only
    if (hasValue && (items = this.get(arg, true))) {
      items = [items] as NonEmptyArray<ResolverItem<T>>;
    }

    // at this point, if there are no parsed options, arg can be:
    // - an exact alias
    // - a merged alias
    // - options from handler
    // - a value (or, if in strict mode, an unknown option-like)
    // for this case, handle exact alias
    else if ((alias = opts.aliases[raw]) && (items = this.alias([alias]))) {
      // alias items found, do nothing and return value
    } else if (
      hasValue &&
      (alias = opts.aliases[arg.key]) &&
      (items = this.alias([alias], arg.value))
    ) {
      // alias items found, do nothing and return value
    }

    // now, arg cannot be an exact alias.
    // try to split raw by aliases
    // if no remainder, resolve split aliases with no value
    // otherwise, split arg.name by aliases if not the same as raw
    // if no remainder, resolve split aliases with arg.value
    // otherwise, parse by handler
    // if has value, use parsed options
    // otherwise, arg must either be a value or an incorrect merged alias
    // if there are split remainders, throw error
    // otherwise, treat as value
    // if value is an option-like with strict mode, throw error
    // otherwise, save value to node.args

    // split cases:
    // - raw no equal sign, same key (-abc, -abc, null)
    // - raw equal sign, different key no equal sign (-abc=1, -abc, 1)
    // - raw equal sign, different key equal sign (-abc=a=1, -abc=a, 1)

    // if safe alias (no alias equal signs),
    // then there is no reason to split raw as raw could contain an equal sign
    // if unsafe, split raw
    // if unsafe, split arg.key only if it does not match raw (hasValue)
    else if (
      !opts.safeAlias &&
      (split = this.split(raw))?.list &&
      (items = this.alias(split.list))
    ) {
      // you would think it might be ideal to stop parent.split()
      // when it finds at least 1 remainder, but we'll need to display
      // the list of remainders for the error message anyway,
      // so this is probably ok.
      // also set alias was successful, do nothing and return value
    } else if (
      (opts.safeAlias || hasValue) &&
      (split = this.split(arg.key))?.list &&
      (items = this.alias(split.list, arg.value))
    ) {
      // alias items found, do nothing and return value
    }

    // NOTE: parse by handler outside of resolver

    // split can be unset by the 2nd parent.split() call
    // which is ok since it would be weird to show remainders from raw
    else if (split && split.remainder.length > 0) {
      return { arg, split };
    }

    // either treat as raw value or use parsed configs
    return { arg, items };
  }
}
