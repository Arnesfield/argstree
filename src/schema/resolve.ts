import { isOption } from '../lib/is-option';
import { assign, getArgs } from '../parser/node';
import { Alias, NormalizedOptions } from '../parser/normalize';
import { Options } from '../types/options.types';
import { Config, ResolvedArg, ResolvedItem } from '../types/schema.types';
import { array } from '../utils/array';
import { __assertNotNull } from '../utils/assert';
import { number } from '../utils/number';

// make props optional except 'key' and make 'alias' nullable
interface ParsedArg<T>
  extends Pick<Alias<T>, 'key'>,
    Partial<Omit<Alias<T>, 'key' | 'alias'>> {
  alias?: string | null;
}

function item<T>(
  { key, alias = null, args, cfg }: ParsedArg<T>,
  value?: string,
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

  let key = raw,
    value: string | undefined,
    cfg: Config<T> | undefined,
    alias: Alias<T> | null | undefined,
    i: number,
    noVal: boolean | undefined; // would imply `arg.value == null`

  if (val === undefined && (i = raw.indexOf('=')) > -1) {
    key = raw.slice(0, i);
    value = raw.slice(i + 1);
  } else if (val != null) value = val;
  else noVal = true;

  const arg: ResolvedArg<T> = { raw, key: raw, value };

  // get item by map
  if ((cfg = opts.map[key]) && (noVal || assign(cfg))) {
    arg.items = [item(arg, value, cfg)];
  }

  // get item by alias
  else if ((alias = opts.alias[key]) && (noVal || assign(alias.cfg))) {
    arg.items = [item(alias, value)];
  }

  // handle split
  // require length of at least 3 since keys with length of 2
  // should have been matched by the alias check before this
  else if (opts.split && key.length > 2 && isOption(key, 'short')) {
    // incomplete aliases parsed
    let inc: boolean, m: number | null, o: Options<T>;
    i = 1;
    alias = null;
    arg.items = [];

    // if an alias exists, stop loop if it requires a value
    for (
      let curr: Alias<T> | undefined;
      (inc = i < key.length) &&
      !(
        alias &&
        (m = number((o = alias.cfg.options).min)) != null &&
        m - array(o.args).length > 0
      ) &&
      (curr = opts.short[key.charCodeAt(i)]);
      i++
    ) {
      alias && arg.items.push(item(alias));
      alias = curr;
    }

    // if no alias was parsed, then assume that it's an invalid argument
    if (!alias) return;

    if (
      inc &&
      (val !== undefined ||
        ((m = number((o = alias.cfg.options).max)) != null &&
          m - array(o.args).length < 1))
    ) {
      // if the config accepts no arguments, treat the rest as remainder
      arg.items.push(item(alias));
      arg.remainder = key.slice(i);
    } else if ((!inc && noVal) || assign(alias.cfg)) {
      arg.items.push(item(alias, inc ? raw.slice(i) : value));
    } else arg.remainder = key.slice(i - 1);
  }

  // if cannot be split, treat as value
  else return;

  return arg;
}
