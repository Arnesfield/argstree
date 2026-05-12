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
  Handler,
  Parser as IParser,
  ResolvedArg,
  ResolvedItem
} from '../types/parser.types';
import { DeepMutable } from '../types/util.types';
import { array } from '../utils/array';
import { hasValues } from '../utils/has-values';
import { number } from '../utils/number';
import { assign, getArgs } from './node';
import { getCfg, init, parse } from './parse';

// NOTE: internal

export class Parser<T> implements IParser<T> {
  constructor(readonly cfg: Config<T>) {}

  option(arg: string | string[], options: Options<T> = {}): this {
    use(this.cfg, arg, { type: 'option', options });
    return this;
  }

  command(arg: string | string[], options: Options<T> = {}): Parser<T> {
    const cfg: Config<T> = { type: 'command', options };
    use(this.cfg, arg, cfg);
    return new Parser(cfg);
  }

  arg(arg: string | string[], value: Parser<T> | InitFunction<T> | null): this {
    // prettier-ignore
    use(this.cfg, arg, value && { ref: typeof value === 'function' ? value : value.cfg });
    return this;
  }

  unknown(handler: Handler<T> | null): this {
    this.cfg.handler = handler;
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
      noVal: boolean | undefined; // would imply `arg.value == null`

    if (value === undefined && (i = raw.indexOf('=')) > -1) {
      key = raw.slice(0, i);
      val = raw.slice(i + 1);
    } else if (!(noVal = value == null)) val = value;

    const arg: ResolvedArg<T> = { raw, key, value: val };

    // get item by map
    if (
      (ic = init(this.cfg.map[key])) &&
      (cfg = getCfg(ic)) &&
      (noVal || assign(cfg))
    ) {
      arg.items = [item(ic.id, key, cfg, val)];
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
        (ic = init(this.cfg.alias[(m = key[i])])) &&
        (cfg = getCfg(ic));
        i++
      ) {
        alias && arg.items.push(item(alias.id, alias.key, alias.cfg));
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
        arg.items.push(item(alias.id, alias.key, alias.cfg));
        arg.remainder = key.slice(i);
      } else if ((noVal && !inc) || assign(alias.cfg)) {
        // prettier-ignore
        arg.items.push(item(alias.id, alias.key, alias.cfg, inc ? raw.slice(i) : val));
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
  cfg: DeepMutable<Config<T>>,
  arg: string | string[],
  uc: UninitializedConfig<T> | null
) {
  arg = array(arg);
  if (uc) uc.id ??= arg[0];

  // NOTE: intentional mutate cfg
  cfg.map ??= { __proto__: null! };
  cfg.alias ??= { __proto__: null! };

  for (const a of arg) {
    cfg.map[a] = uc;

    // check if single character short option
    let c: string;
    if (a.length === 2 && a[0] === '-' && (c = a[1]) !== '-') cfg.alias[c] = uc;
  }
}

function item<T>(
  cid: string | undefined,
  key: string,
  cfg: Config<T>,
  value?: string
): ResolvedItem<T> {
  const o = cfg.options;
  const { id = cid ?? key, name = cid ?? key } = o;
  // prettier-ignore
  return { key, type: cfg.type, options: { ...o, id, name, args: getArgs(o, value) } };
}
