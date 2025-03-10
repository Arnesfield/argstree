import { Aliases, Node, NodeData, Options } from '../core/core.types.js';
import { parse } from '../core/parse.js';
import { Config, Schema as ISchema } from './schema.types.js';

// NOTE: internal

export class Schema implements ISchema {
  private readonly cfg: Config;

  constructor(type: NodeData['type'], options: Options = {}) {
    this.cfg = { type, options };
    // only call setup once all states are ready
    typeof options.setup === 'function' && options.setup(this);
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
