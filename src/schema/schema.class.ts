import { Aliases, Node, Options } from '../core/core.types.js';
import { parse } from '../core/parse.js';
import { obj } from '../utils/object.utils.js';
import { ArgConfig, Config, Schema as ISchema } from './schema.types.js';

// NOTE: internal

interface PartialConfig
  extends Omit<ArgConfig, 'arg'>,
    Partial<Pick<ArgConfig, 'arg'>> {}

export class Schema implements ISchema {
  private readonly cfg: Config;

  constructor(cfg: PartialConfig) {
    // NOTE: intentional cfg object mutation to update existing ArgConfig object
    // always replace args and aliases
    cfg.args = obj();
    cfg.aliases = obj();
    this.cfg = cfg as Config;

    // only call setup once all states are ready
    typeof cfg.options.setup === 'function' && cfg.options.setup(this);
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
