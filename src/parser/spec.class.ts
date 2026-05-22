import { isOption } from '../lib/is-option';
import {
  Alias,
  Config,
  InitFunction,
  InitializedConfig,
  UninitializedConfig
} from '../types/config.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import {
  Fallback,
  Spec as ISpec,
  ResolvedArg,
  ResolvedItem
} from '../types/spec.types';
import { array } from '../utils/array';
import { hasValues } from '../utils/has-values';
import { number } from '../utils/number';
import { assign, getCfg, init, item } from './helpers';
import { parse } from './parse';

// NOTE: internal

export class Spec<T> implements ISpec<T> {
  constructor(readonly cfg: Config<T>) {}

  arg(
    arg: string | string[],
    options: Options<T> | Spec<T> | InitFunction<T> | null = {}
  ): this {
    arg = array(arg);

    const uc: UninitializedConfig<T> | null =
      options &&
      (typeof options === 'function'
        ? { id: arg[0], ref: options }
        : (options as Spec<T>).cfg
          ? { id: arg[0], ref: (options as Spec<T>).cfg }
          : ({ id: arg[0], options } as Config<T>));

    // intentionally mutate cfg
    this.cfg.map ??= { __proto__: null! };
    this.cfg.alias ??= { __proto__: null! };

    for (const a of arg) {
      this.cfg.map[a] = uc;

      // check if single character short option
      let c: string;
      // prettier-ignore
      if (a.length === 2 && a[0] === '-' && (c = a[1]) !== '-') this.cfg.alias[c] = uc;
    }

    return this;
  }

  fallback(fn: Fallback<T> | null): this {
    this.cfg.fallback = fn;
    return this;
  }

  resolve(key: string, value?: string | null): ResolvedArg<T> | undefined {
    if (!hasValues(this.cfg.map)) return;

    // eslint-disable-next-line prefer-const
    let raw = key,
      val: string | undefined,
      ic: InitializedConfig<T> | null | undefined,
      cfg: Config<T> | null | undefined,
      i: number,
      items: ResolvedItem<T>[] | undefined,
      rem: string | undefined;

    if (value === undefined && (i = raw.indexOf('=')) > -1) {
      key = raw.slice(0, i);
      val = raw.slice(i + 1);
    } else if (value != null) val = value;

    // const arg: ResolvedArg<T> = { raw, key, value: val };

    // get item by map
    if (
      (ic = init(this.cfg.map[key])) &&
      (cfg = getCfg(ic)) &&
      (val == null || assign(cfg))
    ) {
      items = [item(ic.id, key, cfg, val)];
    }

    // handle split
    // require length of at least 3 since keys with length of 2
    // should have been matched by the alias check before this
    else if (
      key.length > 2 &&
      isOption(key, 'short') &&
      hasValues(this.cfg.alias)
    ) {
      // incomplete aliases parsed
      let alias: Alias<T> | undefined,
        inc: boolean,
        m: string | number | null,
        o: Options<T>;

      // if an alias exists, stop loop if it requires a value
      for (
        i = 1, items = [];
        (inc = i < key.length) &&
        !(
          alias &&
          (m = number((o = alias.cfg.options).min)) != null &&
          m - array(o.args).length > 0
        ) &&
        (ic = init(this.cfg.alias[(m = key[i])])) &&
        (cfg = getCfg(ic));
        i++
      ) {
        alias && items.push(item(alias.id, alias.key, alias.cfg));
        alias = { id: ic.id, key: '-' + m, cfg };
      }

      // if no alias was parsed, then assume that it's an invalid argument
      if (!alias) return;

      if (
        inc &&
        (value !== undefined ||
          ((m = number((o = alias.cfg.options).max)) != null &&
            m - array(o.args).length < 1))
      ) {
        // if the config accepts no arguments, treat the rest as remainder
        items.push(item(alias.id, alias.key, alias.cfg));
        rem = key.slice(i);
      } else if ((val == null && !inc) || assign(alias.cfg)) {
        // prettier-ignore
        items.push(item(alias.id, alias.key, alias.cfg, inc ? raw.slice(i) : val));
      } else rem = key.slice(i - 1);
    }

    // if cannot be split, treat as value
    else return;

    return { raw, key, value: val, items, remainder: rem };
  }

  parse(args: readonly string[]): Node<T> {
    // create copy of args to avoid external mutation
    return parse(args.slice(), this.cfg);
  }
}
