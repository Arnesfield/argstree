import { Aliases, Node, Options } from '../core/core.types.js';
import { parse } from '../core/parse.js';
import { Config, Schema as ISchema } from './schema.types.js';

// NOTE: internal

export class Schema implements ISchema {
  constructor(private readonly cfg: Config) {
    // only call setup once all states are ready
    typeof cfg.options.setup === 'function' && cfg.options.setup(this);
  }

  option(arg: string, options: Options = {}): this {
    (this.cfg.args ||= []).push({ type: 'option', arg, options });
    return this;
  }

  command(arg: string, options: Options = {}): this {
    (this.cfg.args ||= []).push({ type: 'command', arg, options });
    return this;
  }

  alias(aliases: Aliases): this {
    (this.cfg.aliases ||= []).push(aliases);
    return this;
  }

  config(): Config {
    return this.cfg;
  }

  parse(args: readonly string[]): Node {
    return parse(args, this.cfg);
  }
}
