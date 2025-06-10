import { isOption } from '../lib/is-option';
import { split, Split, SplitItem } from '../lib/split';
import { Alias, NormalizedOptions } from '../parser/normalize';
import { canAssign, getArgs } from '../parser/utils';
import { Arg } from '../types/arg.types';
import { ResolvedArg, ResolvedItem, Schema } from '../types/schema.types';
import { NonEmptyArray } from '../types/util.types';

// like Arg but has conditional props `split` and `items`
export type ResolveArg<T> = Arg &
  (
    | { split: Split; items?: never }
    | { split?: never; items?: NonEmptyArray<ResolvedItem<T>> }
  );

// make props optional except 'key' and make 'alias' nullable
interface ParsedArg
  extends Pick<Alias, 'key'>,
    Partial<Omit<Alias, 'key' | 'alias'>> {
  alias?: string | null;
}

function item<T>(
  schema: Schema<T>,
  value: string | null | undefined,
  { key, alias = null, args }: ParsedArg
): ResolvedItem<T> {
  const { id = key, name = key } = schema.options;
  // prettier-ignore
  return { key, alias, type: schema.type, options: { ...schema.options, id, name, args: getArgs(schema, args, value) } };
}

export function resolve<T>(
  opts: NormalizedOptions<T>,
  raw: string,
  val?: string | null
): ResolvedArg<T> | undefined {
  const arg = { raw, key: raw } as ResolveArg<T>;

  if (val === undefined) {
    const index = raw.indexOf('=');
    if (index > -1) {
      arg.key = raw.slice(0, index);
      arg.value = raw.slice(index + 1);
    }
  } else if (val != null) arg.value = val;

  let schema = opts.map[arg.key],
    alias: Alias | undefined,
    s: Split | undefined,
    last: SplitItem;

  if (schema && canAssign(schema, arg.value)) {
    arg.items = [item(schema, arg.value, arg)];
  }

  // alias
  else if (
    (alias = opts.alias[arg.key]) &&
    canAssign((schema = opts.map[alias.key]!), arg.value)
  ) {
    arg.items = [item(schema, arg.value, alias)];
  }

  // split
  else if (
    opts.keys.length > 0 &&
    isOption(arg.key, 'short') &&
    (s = split(arg.key.slice(1), opts.keys)).values.length > 0
  ) {
    // if last split item is a value
    // check if last item is assignable

    if (
      arg.value != null &&
      !(last = s.items.at(-1)!).remainder &&
      !canAssign(opts.map[opts.alias['-' + last.value].key]!, arg.value)
    ) {
      // treat as value
    } else if (s.remainders.length > 0) {
      arg.split = s;
    } else {
      arg.items = [] as unknown as NonEmptyArray<ResolvedItem<T>>;

      for (let i = 0; i < s.values.length; i++) {
        alias = opts.alias['-' + s.values[i]];
        // prettier-ignore
        arg.items.push(item(opts.map[alias.key]!, i === s.values.length - 1 ? arg.value : null, alias));
      }
    }
  }

  if (arg.items || arg.split) return arg as ResolvedArg<T>;
}
