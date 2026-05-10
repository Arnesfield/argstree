import { isOption } from '../lib/is-option';
import { assign, getArgs } from '../parser/node';
import { Alias, Config, SchemaConfig } from '../types/config.types';
import { Options } from '../types/options.types';
import { ResolvedArg, ResolvedItem } from '../types/schema.types';
import { array } from '../utils/array';
import { hasValues } from '../utils/has-values';
import { number } from '../utils/number';

function item<T>(key: string, cfg: Config<T>, value?: string): ResolvedItem<T> {
  const o = cfg.options;
  const { id = key, name = key } = o;
  // prettier-ignore
  return { key, type: cfg.type, options: { ...o, id, name, args: getArgs(o, value) } };
}

export function resolve<T>(
  sc: SchemaConfig<T>,
  raw: string,
  val?: string | null
): ResolvedArg<T> | undefined {
  let key = raw,
    value: string | undefined,
    cfg: Config<T> | null | undefined,
    i: number,
    noVal: boolean | undefined; // would imply `arg.value == null`

  if (val === undefined && (i = raw.indexOf('=')) > -1) {
    key = raw.slice(0, i);
    value = raw.slice(i + 1);
  } else if (!(noVal = val == null)) value = val;

  const arg: ResolvedArg<T> = { raw, key: raw, value };

  // get item by map
  if ((cfg = sc.map[key]) && (noVal || assign(cfg))) {
    arg.items = [item(key, cfg, value)];
  }

  // handle split
  // require length of at least 3 since keys with length of 2
  // should have been matched by the alias check before this
  else if (key.length > 2 && isOption(key, 'short') && hasValues(sc.alias)) {
    // incomplete aliases parsed
    let alias: Alias<T> | undefined,
      inc: boolean,
      m: string | number | null,
      o: Options<T>;

    // if an alias exists, stop loop if it requires a value
    for (
      i = 1, arg.items = [];
      (inc = i < key.length) &&
      !(
        alias &&
        (m = number((o = alias.cfg.options).min)) != null &&
        m - array(o.args).length > 0
      ) &&
      (cfg = sc.alias[(m = key[i])]);
      i++
    ) {
      alias && arg.items.push(item(alias.key, alias.cfg));
      alias = { key: '-' + m, cfg };
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
      arg.items.push(item(alias.key, alias.cfg));
      arg.remainder = key.slice(i);
    } else if ((noVal && !inc) || assign(alias.cfg)) {
      arg.items.push(item(alias.key, alias.cfg, inc ? raw.slice(i) : value));
    } else arg.remainder = key.slice(i - 1);
  }

  // if cannot be split, treat as value
  else return;

  return arg;
}
