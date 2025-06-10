import { isOption } from '../lib/is-option';
import { split, Split, SplitItem } from '../lib/split';
import { Alias, NormalizedOptions } from '../parser/normalize';
import { canAssign, getArgs } from '../parser/utils';
import { ResolvedArg, ResolvedItem, Schema } from '../types/schema.types';
import { NonEmptyArray } from '../types/util.types';

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
  const arg = { raw, key: raw } as ResolvedArg<T>;

  let schema: Schema<T> | undefined,
    alias: Alias | undefined,
    s: Split | undefined,
    last: SplitItem,
    i: number;

  if (val === undefined && (i = raw.indexOf('=')) > -1) {
    arg.key = raw.slice(0, i);
    arg.value = raw.slice(i + 1);
  } else if (val != null) arg.value = val;

  const { key, value } = arg;

  if ((schema = opts.map[key]) && canAssign(schema, value)) {
    arg.items = [item(schema, value, arg)];
  }

  // alias
  else if (
    (alias = opts.alias[key]) &&
    canAssign((schema = opts.map[alias.key]!), value)
  ) {
    arg.items = [item(schema, value, alias)];
  }

  // split
  else if (
    !(
      opts.keys.length > 0 &&
      isOption(key, 'short') &&
      (s = split(key.slice(1), opts.keys)).values.length > 0
    )
  ) {
    // treat as value if no split items
  }

  // handle split
  // if last split item is a value, check if last item is assignable
  else if (
    value != null &&
    !(last = s.items.at(-1)!).remainder &&
    !canAssign(opts.map[opts.alias['-' + last.value].key]!, value)
  ) {
    // treat as value if last split item value is not assignable
  }

  // set split result and skip setting items
  else if (s.remainders.length > 0) arg.split = s;
  else {
    arg.items = [] as unknown as NonEmptyArray<ResolvedItem<T>>;

    // NOTE: reuse i variable
    for (i = 0; i < s.values.length; i++) {
      alias = opts.alias['-' + s.values[i]];
      // prettier-ignore
      arg.items.push(item(opts.map[alias.key]!, i === s.values.length - 1 ? value : null, alias));
    }
  }

  if (arg.items || arg.split) return arg;
}
