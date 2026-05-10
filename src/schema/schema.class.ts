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
    cfg.alias = { __proto__: null! } as Required<Config<T>>['alias'];

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
    if (hasValues(this.cfg.map)) return resolve(this.cfg, key, value);
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
