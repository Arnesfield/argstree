/* eslint-disable prefer-const */
import { isOption } from '../lib/is-option';
import {
  Config,
  InitFunction,
  InitializedConfig,
  Short,
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
    options: Options<T> | InitFunction<T> | null = {}
  ): this {
    if ((arg = array(arg)).length === 0) return this;

    let c = this.cfg,
      id = arg[0], // use as id and short character
      short: boolean | undefined,
      uc: UninitializedConfig<T> | null =
        options &&
        (typeof options === 'function'
          ? { id, init: options }
          : { id, options });

    // intentionally mutate cfg
    c.map ??= { __proto__: null! };
    c.short ??= { __proto__: null! };

    for (const a of arg) {
      c.map[a] = uc;

      // check if single character short option
      if (a.length === 2 && a[0] === '-' && (id = a[1]) !== '-') {
        short = true;
        c.short[id] = uc;
      }
    }

    c.mapv = !!uc || hasValues(c.map);
    if (short) c.shortv = !!uc || hasValues(c.short);

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
      rem: string | undefined,
      items: ResolvedItem<T>[] | undefined;

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
    // should have been matched before this
    else if (key.length > 2 && this.cfg.shortv && isOption(key, 'short')) {
      // `inc` for incomplete short options parsed
      let short: Short<T> | undefined, inc: boolean, o: Options<T> | string;

      // if a short option exists,
      // stop loop if it requires a value or if it's not combinable
      for (
        i = 1, items = [];
        (inc = i < key.length) &&
        !(
          short &&
          ((o = short.cfg.options).combinable === false ||
            (o.min != null && o.min > size(o.args)))
        ) &&
        (ic = init(this.cfg.short[(o = key[i])])) &&
        (cfg = getCfg(ic)) &&
        (!short || cfg.options.combinable !== false);
        i++
      ) {
        short && items.push(item(short.key, short.ic, short.cfg));
        short = { key: '-' + o, ic, cfg };
      }

      // if no short option was parsed, assume that it's an invalid argument
      if (!short) return;

      if (
        inc &&
        (value !== undefined ||
          ((o = short.cfg.options).max != null && o.max <= size(o.args)))
      ) {
        // if the config accepts no arguments, treat the rest as remainder
        items.push(item(short.key, short.ic, short.cfg));
        rem = key.slice(i);
      } else if ((val == null && !inc) || assign(short.cfg)) {
        // prettier-ignore
        items.push(item(short.key, short.ic, short.cfg, inc ? raw.slice(i) : val));
      } else rem = key.slice(i - 1);
    }

    // if cannot be split, treat as value
    else return;

    return { raw, key, value: val, remainder: rem, items };
  }

  parse(args: readonly string[]): Node<T> {
    // create copy of args to avoid external mutation
    return parse(args.slice(), this.cfg);
  }
}
