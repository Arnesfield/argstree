import { isOption } from '../lib/is-option';
import { split, Split, SplitItem } from '../lib/split';
import { Alias, NormalizedOptions } from '../parser/normalize';
import { canAssign, getArgs } from '../parser/utils';
import { ArgConfig, ResolvedArg, ResolvedItem } from '../types/schema.types';
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
  cfg: ArgConfig<T>
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
  if (opts.value) return;

  const arg = { raw, key: raw } as ResolvedArg<T>;

  let cfg: ArgConfig<T> | undefined,
    alias: Alias<T> | undefined,
    s: Split | undefined,
    last: SplitItem,
    i: number;

  if (val === undefined && (i = raw.indexOf('=')) > -1) {
    arg.key = raw.slice(0, i);
    arg.value = raw.slice(i + 1);
  } else if (val != null) arg.value = val;

  const { key, value } = arg;

  // get item by map
  if ((cfg = opts.map[key]) && canAssign(cfg, value)) {
    arg.items = [item(value, arg, cfg)];
  }

  // get item by alias
  else if ((alias = opts.alias[key]) && canAssign(alias.cfg, value)) {
    arg.items = [item(value, alias)];
  }

  // handle split
  // condition 1 - check if can split and has split values
  // condition 2 - check if last split item is a value and is assignable
  else if (
    !(
      opts.keys.length > 0 &&
      isOption(key, 'short') &&
      (s = split(key.slice(1), opts.keys)).values.length > 0
    ) ||
    (value != null &&
      !(last = s.items.at(-1)!).remainder &&
      !canAssign(opts.alias['-' + last.value].cfg, value))
  ) {
    // treat as value if no split items
    // or if last split item value is not assignable
    return;
  }

  // set split result and skip setting items
  else if (s.remainders.length > 0) {
    arg.split = s;
  }

  // if no remainders, resolve all split values
  else {
    // NOTE: reuse `i` variable
    i = 0;
    arg.items = [] as unknown as NonEmptyArray<ResolvedItem<T>>;
    for (const v of s.values) {
      alias = opts.alias['-' + v];
      arg.items.push(item(i++ === s.values.length - 1 ? value : null, alias));
    }
  }

  return arg;
}
