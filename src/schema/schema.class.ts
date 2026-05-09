import { parse } from '../parser/parse';
import { Config, SchemaConfig } from '../types/config.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import {
  Schema as ISchema,
  ResolvedArg,
  SchemaType
} from '../types/schema.types';
import { DeepMutable, PartialPick } from '../types/util.types';
import { array } from '../utils/array';
import { hasValues } from '../utils/has-values';
import { resolve } from './resolve';

// NOTE: internal

export class Schema<T> implements ISchema<T> {
  // NOTE: using partial config type, but keep member property required
  constructor(cfg: PartialPick<Config<T>, 'options'>);
  constructor(readonly cfg: DeepMutable<SchemaConfig<T>>) {
    // NOTE: intentional mutate cfg
    cfg.map = { __proto__: null! };
    cfg.alias = { __proto__: null! };
    cfg.short = { __proto__: null } as Required<Config<T>>['short'];

    // always create a new copy of options
    cfg.options = { ...cfg.options, ...cfg.options?.init?.(this) };
  }

  option(arg: string, options?: Options<T> | null): this {
    use(this.cfg, arg, 'option', options);
    return this;
  }

  command(arg: string, options?: Options<T> | null): this {
    use(this.cfg, arg, 'command', options);
    return this;
  }

  resolve(key: string, value?: string | null): ResolvedArg<T> | undefined {
    if (hasValues(this.cfg.map)) return resolve(this.cfg, key, value);
  }

  parse(args: readonly string[]): Node<T> {
    // create copy of args to avoid external mutation
    return parse(args.slice(), this.cfg);
  }
}

function use<T>(
  sc: DeepMutable<SchemaConfig<T>>,
  key: string,
  type: SchemaType,
  options: Options<T> | null = {}
) {
  const old = sc.map[key];

  // set/unset the new config and apply aliases
  (sc.map[key] = options && { type, options }) &&
    set(sc, key, sc.map[key], true);

  // unset old config, if any
  old && set(sc, key, old);
}

/**
 * @param ok When not `true`, {@linkcode cfg} is unset instead.
 */
function set<T>(
  sc: DeepMutable<SchemaConfig<T>>,
  key: string,
  cfg: Config<T>,
  ok?: boolean
) {
  // note that when removing the alias, they're removed based on
  // the existing aliases only and other aliases are not checked
  for (let arr of array(cfg.options.alias)) {
    if ((arr = array(arr)).length === 0) continue;

    // eslint-disable-next-line prefer-const
    let a = arr[0],
      c: number;

    if (ok) sc.alias[a] = { key, alias: a, args: arr.slice(1), cfg };
    else if (sc.alias[a]?.cfg === cfg) sc.alias[a] = null;

    // check if single character short option, 45: '-'
    if (
      a.length !== 2 ||
      a.charCodeAt(0) !== 45 ||
      (c = a.charCodeAt(1)) === 45
    ) {
      // skip if not a valid short option
    } else if (ok) sc.short[c] = sc.alias[a];
    else if (sc.short[c]?.cfg === cfg) sc.short[c] = null;
  }
}
