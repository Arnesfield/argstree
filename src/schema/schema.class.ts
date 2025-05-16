import { normalize, NormalizedOptions } from '../parser/normalize';
import { parse } from '../parser/parse';
import { Resolver } from '../parser/resolver';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { obj } from '../utils/obj';
import {
  ArgConfig,
  Config,
  Schema as ISchema,
  ResolvedArg,
  ResolvedConfig
} from './schema.types';

// NOTE: internal

export class Schema<T> implements ISchema<T> {
  private opts: NormalizedOptions<T> | null | undefined;

  // expose as ArgConfig but use Config internally
  constructor(cfg: ArgConfig<T>);
  constructor(private readonly cfg: Config<T>) {
    // consider as initialized if 'args' is already provided
    if (cfg.args) return;

    // NOTE: intentional cfg object mutation to update existing ArgConfig object
    cfg.args = obj();

    // only call init once all states are ready
    cfg.options.init?.(this);
  }

  private add(arg: string, type: Config<T>['type'], options: Options<T> = {}) {
    this.cfg.args[arg] = { type, options };
    // clear cached options to re-evaluate it when needed
    this.opts = null;
    return this;
  }

  option(arg: string, options?: Options<T>): this {
    return this.add(arg, 'option', options);
  }

  command(arg: string, options?: Options<T>): this {
    return this.add(arg, 'command', options);
  }

  config(): Config<T> {
    return this.cfg;
  }

  resolve(arg: string): ResolvedArg<T> | undefined {
    // prettier-ignore
    const res = new Resolver<T>().resolve(arg, (this.opts ||= normalize(this.cfg)));
    if (!res) {
      // do nothing
    } else if (res.split) {
      return { split: res.split };
    } else if (res.items) {
      const configs = res.items.map(
        (r): ResolvedConfig<T> => ({
          key: r.key,
          alias: r.alias,
          type: r.cfg.type,
          options: { ...r.cfg.options, args: r.args }
        })
      );
      return { configs };
    }
  }

  parse(args: readonly string[]): Node<T> {
    // create copy of args to avoid external mutation
    return parse(args.slice(), this);
  }
}
