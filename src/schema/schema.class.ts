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

  option(arg: string, options?: Options<T>): this {
    use(this.cfg, 'option', arg, options);
    return this;
  }

  command(arg: string, options?: Options<T>): this {
    use(this.cfg, 'command', arg, options);
    return this;
  }

  resolve(key: string, value?: string | null): ResolvedArg<T> | undefined {
    if (this.cfg.mapc) return resolve(this.cfg, key, value);
  }

  parse(args: readonly string[]): Node<T> {
    // create copy of args to avoid external mutation
    return parse(args.slice(), this.cfg);
  }
}

function use<T>(
  opts: DeepMutable<SchemaConfig<T>>,
  type: SchemaType,
  key: string,
  options: Options<T> = {}
) {
  opts.mapc = true;

  const cfg = (opts.map[key] = { type, options });

  for (let arr of array(options.alias)) {
    // each array item is an alias
    // if `arr` is an array, then `arr[0]` is an alias
    if ((arr = array(arr)).length === 0) continue;

    // override existing alias, if any
    // eslint-disable-next-line prefer-const
    let a = arr[0],
      c: number;
    opts.alias[a] = { key, alias: a, args: arr.slice(1), cfg };

    // check if single character short option
    // 45: '-'
    if (
      a.length === 2 &&
      a.charCodeAt(0) === 45 &&
      (c = a.charCodeAt(1)) !== 45
    ) {
      opts.split = true;
      opts.short[c] = opts.alias[a];
    }
  }
}
