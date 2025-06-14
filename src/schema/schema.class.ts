import { normalize, NormalizedOptions } from '../parser/normalize';
import { parse } from '../parser/parse';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { Config, Schema as ISchema, ResolvedArg } from '../types/schema.types';
import { Mutable, PartialPick } from '../types/util.types';
import { resolve } from './resolve';

// NOTE: internal

export class Schema<T> implements ISchema<T> {
  // make sure to clear cached options to re-evaluate it when needed
  private opts: NormalizedOptions<T> | null | undefined;

  constructor(cfg: PartialPick<Config<T>, 'options'>);
  constructor(private readonly cfg: Mutable<Required<Config<T>>>) {
    // NOTE: intentional mutate cfg
    cfg.map = { __proto__: null! };
    // always create a new copy of options
    // since it can be updated in config(options), possibly through init()
    cfg.options = { ...cfg.options };
    cfg.options.init?.(this);
  }

  option(arg: string, options: Options<T> = {}): this {
    this.cfg.map[arg] = { type: 'option', options };
    this.opts = null;
    return this;
  }

  command(arg: string, options: Options<T> = {}): this {
    this.cfg.map[arg] = { type: 'command', options };
    this.opts = null;
    return this;
  }

  config(options?: Options<T>): Required<Config<T>> {
    if (options) {
      Object.assign(this.cfg.options, options);
      this.opts = null;
    }
    return this.cfg;
  }

  resolve(key: string, value?: string | null): ResolvedArg<T> | undefined {
    return resolve((this.opts ||= normalize(this.cfg)), key, value);
  }

  parse(args: readonly string[]): Node<T> {
    // create copy of args to avoid external mutation
    return parse(args.slice(), this.cfg);
  }
}
