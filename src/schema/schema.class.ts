import { Aliases, Node, Options } from '../core/core.types.js';
import { parse } from '../core/parse.js';
import { Schema as ISchema, SchemaConfig } from './schema.types.js';

// NOTE: internal

export class Schema implements ISchema {
  constructor(private readonly cfg: SchemaConfig) {
    // only call setup once all states are ready
    typeof cfg.options.setup === 'function' && cfg.options.setup(this);
  }

  config(): SchemaConfig {
    return this.cfg;
  }

  private add(type: SchemaConfig['type'], arg: string, options: Options = {}) {
    (this.cfg.args ||= []).push({ type, arg, options });
    return this;
  }

  option(arg: string, options?: Options): this {
    return this.add('option', arg, options);
  }

  command(arg: string, options?: Options): this {
    return this.add('command', arg, options);
  }

  alias(aliases: Aliases): this {
    (this.cfg.aliases ||= []).push(aliases);
    return this;
  }

  parse(args: readonly string[]): Node {
    return parse(args, this.cfg);
  }
}
