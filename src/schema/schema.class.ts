import { isOption } from '../lib/is-option';
import { assign, getArgs } from '../parser/node';
import { parse } from '../parser/parse';
import { Alias, Config, SchemaConfig } from '../types/config.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import {
  Schema as ISchema,
  ResolvedArg,
  ResolvedItem,
  SchemaType
} from '../types/schema.types';
import { DeepMutable, PartialPick } from '../types/util.types';
import { array } from '../utils/array';
import { hasValues } from '../utils/has-values';
import { number } from '../utils/number';

// NOTE: internal

export class Schema<T> implements ISchema<T> {
  // NOTE: using partial config type, but keep member property required
  constructor(cfg: PartialPick<Config<T>, 'options'>);
  constructor(readonly cfg: DeepMutable<SchemaConfig<T>>) {
    // NOTE: intentional mutate cfg
    cfg.map = { __proto__: null! };
    cfg.alias = { __proto__: null! };

    // always create a new copy of options
    cfg.options = { ...cfg.options, ...cfg.options?.init?.(this) };
  }

  option(arg: string | string[], options?: Options<T> | null): this {
    use(this.cfg, arg, 'option', options);
    return this;
  }

  command(arg: string | string[], options?: Options<T> | null): this {
    use(this.cfg, arg, 'command', options);
    return this;
  }

  resolve(key: string, value?: string | null): ResolvedArg<T> | undefined {
    if (!hasValues(this.cfg.map)) return;

    // eslint-disable-next-line prefer-const
    let raw = key,
      val: string | undefined,
      cfg: Config<T> | null | undefined,
      i: number,
      noVal: boolean | undefined; // would imply `arg.value == null`

    if (value === undefined && (i = raw.indexOf('=')) > -1) {
      key = raw.slice(0, i);
      val = raw.slice(i + 1);
    } else if (!(noVal = value == null)) val = value;

    const arg: ResolvedArg<T> = { raw, key, value: val };

    // get item by map
    if ((cfg = this.cfg.map[key]) && (noVal || assign(cfg))) {
      arg.items = [item(key, cfg, val)];
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
        i = 1, arg.items = [];
        (inc = i < key.length) &&
        !(
          alias &&
          (m = number((o = alias.cfg.options).min)) != null &&
          m - array(o.args).length > 0
        ) &&
        (cfg = this.cfg.alias[(m = key[i])]);
        i++
      ) {
        alias && arg.items.push(item(alias.key, alias.cfg));
        alias = { key: '-' + m, cfg };
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
        arg.items.push(item(alias.key, alias.cfg));
        arg.remainder = key.slice(i);
      } else if ((noVal && !inc) || assign(alias.cfg)) {
        arg.items.push(item(alias.key, alias.cfg, inc ? raw.slice(i) : val));
      } else arg.remainder = key.slice(i - 1);
    }

    // if cannot be split, treat as value
    else return;

    return arg;
  }

  parse(args: readonly string[]): Node<T> {
    // create copy of args to avoid external mutation
    return parse(args.slice(), this.cfg);
  }
}

function use<T>(
  sc: DeepMutable<SchemaConfig<T>>,
  arg: string | string[],
  type: SchemaType,
  options: Options<T> | null = {}
) {
  // it's possible that cfg is unused, but it's not worth checking for that case
  const cfg: Config<T> | null = options && { type, options };

  for (const a of array(arg)) {
    sc.map[a] = cfg;

    // check if single character short option
    let c: string;
    if (a.length === 2 && a[0] === '-' && (c = a[1]) !== '-') sc.alias[c] = cfg;
  }
}

function item<T>(key: string, cfg: Config<T>, value?: string): ResolvedItem<T> {
  const o = cfg.options;
  const { id = key, name = key } = o;
  // prettier-ignore
  return { key, type: cfg.type, options: { ...o, id, name, args: getArgs(o, value) } };
}
