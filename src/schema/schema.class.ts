import { parse } from '../parser/parse.js';
import { Node } from '../types/node.types.js';
import { Options } from '../types/options.types.js';
import { obj } from '../utils/obj.js';
import {
  Aliases,
  ArgConfig,
  Config,
  Schema as ISchema
} from './schema.types.js';

// NOTE: internal

export interface PartialConfig
  extends Omit<ArgConfig, 'arg'>,
    Partial<Pick<ArgConfig, 'arg'>> {}

export class Schema implements ISchema {
  // expose as PartialConfig but use Config internally
  constructor(cfg: PartialConfig);
  constructor(private readonly cfg: Config) {
    // NOTE: intentional cfg object mutation to update existing ArgConfig object
    // always replace args and aliases
    cfg.args = obj();
    cfg.aliases = obj();

    // only call init once all states are ready
    typeof cfg.options.init === 'function' && cfg.options.init(this);
  }

  option(arg: string, options: Options = {}): this {
    this.cfg.args[arg] = { arg, type: 'option', options };
    return this;
  }

  command(arg: string, options: Options = {}): this {
    this.cfg.args[arg] = { arg, type: 'command', options };
    return this;
  }

  alias(aliases: Aliases): this {
    Object.assign(this.cfg.aliases, aliases);
    return this;
  }

  config(): Config {
    return this.cfg;
  }

  parse(args: readonly string[]): Node {
    return parse(args, this.cfg);
  }
}
