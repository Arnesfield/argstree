import { isOption } from '../lib/is-option';
import { assign, getArgs, read } from '../parser/node';
import { Alias, NormalizedOptions } from '../parser/normalize';
import { Config, ResolvedArg, ResolvedItem } from '../types/schema.types';
import { __assertNotNull } from '../utils/assert';
import { number } from '../utils/number';

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
    alias: Alias<T> | null | undefined,
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
  else if (isOption(arg.key, 'short')) {
    arg.items = [];

    // if an alias exists, stop loop if it requires a value
    for (
      i = 1, alias = null;
      i < arg.key.length && !(alias && number(alias.cfg.options.min));
      i++
    ) {
      const curr = opts.short[arg.key.charCodeAt(i)];
      if (!curr) break;

      alias && arg.items.push(item(null, alias));
      alias = curr;
    }

    // if no alias was parsed, then assume that it's an invalid argument
    if (!alias) return;

    // incomplete aliases parsed
    const inc = i < arg.key.length;

    if (inc && val !== undefined) {
      arg.items.push(item(null, alias));
      arg.remainder = arg.key.slice(i);
    } else if (inc ? read(alias.cfg) : noVal || assign(alias.cfg)) {
      arg.items.push(item(inc ? raw.slice(i) : arg.value, alias));
    } else arg.remainder = arg.key.slice(i - 1);
  }

  return arg;
}
