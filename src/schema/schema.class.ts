import { parse } from '../parser/parse';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { obj } from '../utils/obj';
import { ArgConfig, Config, Schema as ISchema } from './schema.types';

// NOTE: internal

export class Schema implements ISchema {
  // expose as ArgConfig but use Config internally
  constructor(cfg: ArgConfig);
  constructor(private readonly cfg: Config) {
    // NOTE: intentional cfg object mutation to update existing ArgConfig object
    // always replace args
    cfg.args = obj();

    // only call init once all states are ready
    typeof cfg.options.init === 'function' && cfg.options.init(this);
  }

  option(arg: string, options: Options = {}): this {
    this.cfg.args[arg] = { type: 'option', options };
    return this;
  }

  command(arg: string, options: Options = {}): this {
    this.cfg.args[arg] = { type: 'command', options };
    return this;
  }

  config(): Config {
    return this.cfg;
  }

  parse(args: readonly string[]): Node {
    // create copy of args to avoid external mutation
    return parse(args.slice(), this.cfg);
  }
}
