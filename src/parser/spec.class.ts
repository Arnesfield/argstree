/* eslint-disable prefer-const */
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
import { array, size } from '../utils/array';
import { hasValues } from '../utils/has-values';
import { assign, getCfg, init, item } from './helpers';
import { parse } from './parse';

// NOTE: internal

export class Spec<T> implements ISpec<T> {
  constructor(readonly cfg: Config<T>) {}

  arg(
    arg: string | string[],
    options: Options<T> | Spec<T> | InitFunction<T> | null = {}
  ): this {
    if ((arg = array(arg)).length === 0) return this;

    let c = this.cfg,
      k: string,
      alias: boolean | undefined,
      uc: InitializedConfig<T> | UninitializedConfig<T> | null =
        options &&
        (typeof options === 'function'
          ? { id: arg[0], init: options }
          : (options as Spec<T>).cfg
            ? { id: arg[0], ref: (options as Spec<T>).cfg }
            : ({ id: arg[0], options } as Config<T>));

    // intentionally mutate cfg
    c.map ??= { __proto__: null! };
    c.alias ??= { __proto__: null! };

    for (const a of arg) {
      c.map[a] = uc;

      // check if single character short option
      if (a.length === 2 && a[0] === '-' && (k = a[1]) !== '-') {
        alias = true;
        c.alias[k] = uc;
      }
    }

    c.mapv = !!uc || hasValues(c.map);
    if (alias) c.aliasv = !!uc || hasValues(c.alias);

    return this;
  }

  fallback(fn: Fallback<T> | null): this {
    this.cfg.fallback = fn;
    return this;
  }

  resolve(key: string, value?: string | null): ResolvedArg<T> | undefined {
    if (!this.cfg.mapv) return;

    let raw = key,
      val: string | null = null,
      ic: InitializedConfig<T> | null | undefined,
      cfg: Config<T> | null | undefined,
      i: number,
      items: ResolvedItem<T>[] | undefined,
      rem: string | undefined;

    if (value === undefined && (i = raw.indexOf('=')) >= 0) {
      key = raw.slice(0, i);
      val = raw.slice(i + 1);
    } else if (value != null) val = value;

    // get item by map
    if (
      (ic = init(this.cfg.map[key])) &&
      (cfg = getCfg(ic)) &&
      (val == null || assign(cfg))
    ) {
      items = [item(key, ic, cfg, val)];
    }

    // handle split
    // require length of at least 3 since keys with length of 2
    // should have been matched by the alias check before this
    else if (key.length > 2 && this.cfg.aliasv && isOption(key, 'short')) {
      // incomplete aliases parsed
      let alias: Alias<T> | undefined, inc: boolean, o: Options<T> | string;

      // if an alias exists, stop loop if it requires a value
      for (
        i = 1, items = [];
        (inc = i < key.length) &&
        !(
          alias &&
          (o = alias.cfg.options).min != null &&
          o.min > size(o.args)
        ) &&
        (ic = init(this.cfg.alias[(o = key[i])])) &&
        (cfg = getCfg(ic));
        i++
      ) {
        alias && items.push(item(alias.key, alias.ic, alias.cfg));
        alias = { ic, key: '-' + o, cfg };
      }

      // if no alias was parsed, then assume that it's an invalid argument
      if (!alias) return;

      if (
        inc &&
        (value !== undefined ||
          ((o = alias.cfg.options).max != null && o.max <= size(o.args)))
      ) {
        // if the config accepts no arguments, treat the rest as remainder
        items.push(item(alias.key, alias.ic, alias.cfg));
        rem = key.slice(i);
      } else if ((val == null && !inc) || assign(alias.cfg)) {
        // prettier-ignore
        items.push(item(alias.key, alias.ic, alias.cfg, inc ? raw.slice(i) : val));
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
