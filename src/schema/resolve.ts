import { isOption } from '../lib/is-option';
import { split, Split, SplitItem } from '../lib/split';
import { assign, getArgs } from '../parser/node';
import { Alias, NormalizedOptions } from '../parser/normalize';
import { Config, ResolvedArg, ResolvedItem } from '../types/schema.types';
import { NonEmptyArray } from '../types/util.types';
import { __assertNotNull } from '../utils/assert';

// make props optional except 'key' and make 'alias' nullable
interface ParsedArg<T>
  extends Pick<Alias<T>, 'key'>,
    Partial<Omit<Alias<T>, 'key' | 'alias'>> {
  alias?: string | null;
}

function item<T>(
  value: string | null | undefined,
  alias: Alias<T>
): ResolvedItem<T>;

function item<T>(
  value: string | null | undefined,
  arg: ParsedArg<T>,
  cfg: Config<T>
): ResolvedItem<T>;

function item<T>(
  value: string | null | undefined,
  { key, alias = null, args, cfg }: ParsedArg<T>,
  c = cfg
): ResolvedItem<T> {
  // assume that config will always be provided
  __assertNotNull(c);
  const o = c.options;
  const { id = key, name = key } = o;
  // prettier-ignore
  return { key, alias, type: c.type, options: { ...o, id, name, args: getArgs(o, args, value) } };
}

export function resolve<T>(
  opts: NormalizedOptions<T>,
  raw: string,
  val?: string | null
): ResolvedArg<T> | undefined {
  if (opts.pure) return;

  const arg = { raw, key: raw } as ResolvedArg<T>;

  let cfg: Config<T> | undefined,
    alias: Alias<T> | undefined,
    s: Split | undefined,
    last: SplitItem,
    i: number,
    noVal: boolean | undefined; // implies `arg.value == null` after setting arg.value

  if (val === undefined && (i = raw.indexOf('=')) > -1) {
    arg.key = raw.slice(0, i);
    arg.value = raw.slice(i + 1);
  } else if (val != null) arg.value = val;
  else noVal = true;

  // get item by map
  if ((cfg = opts.map[arg.key]) && (noVal || assign(cfg))) {
    arg.items = [item(arg.value, arg, cfg)];
  }

  // get item by alias
  else if ((alias = opts.alias[arg.key]) && (noVal || assign(alias.cfg))) {
    arg.items = [item(arg.value, alias)];
  }

  // handle split
  // condition 1 - check if can split and has split values
  // condition 2 - check if last split item is a value and is assignable
  else if (
    !(
      opts.keys.length > 0 &&
      isOption(arg.key, 'short') &&
      (s = split(arg.key.slice(1), opts.keys)).values.length > 0 &&
      (noVal ||
        (last = s.items.at(-1)!).remainder ||
        assign(opts.alias['-' + last.value].cfg))
    )
  ) {
    // treat as value
    // if no split items or if last split item value is not assignable
    return;
  }

  // set split result and skip setting items
  else if (s.remainders.length > 0) {
    arg.split = s;
  }

  // if no remainders, resolve all split values
  else {
    arg.items = [] as unknown as NonEmptyArray<ResolvedItem<T>>;

    // NOTE: reuse `i` variable
    for (i = 0; i < s.values.length; i++) {
      // NOTE: reuse `alias` variable
      alias = opts.alias['-' + s.values[i]];
      // assign value to the last item
      arg.items.push(item(i === s.values.length - 1 ? arg.value : null, alias));
    }
  }

  return arg;
}
