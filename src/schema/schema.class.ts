import { Aliases, Node, NodeData, Options } from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { parse } from '../core/parse.js';
import { getArgs, ndata, NormalizedAlias } from '../lib/normalize.js';
import { display } from '../utils/display.utils.js';
import { Config, Schema as ISchema } from './schema.types.js';

// NOTE: internal

export class Schema implements ISchema {
  private readonly cfg: Config;

  constructor(type: NodeData['type'], options: Options = {}) {
    this.cfg = { type, options };
    // only call setup once all states are ready
    typeof options.setup === 'function' && options.setup(this);
  }

  private setAlias(cfg: Config, key: string, args: NormalizedAlias) {
    this.cfg.aliases ||= { __proto__: null };

    if (this.cfg.aliases[key]) {
      const data = ndata(cfg);
      const name = display(data);
      throw new ParseError(
        ParseError.OPTIONS_ERROR,
        (name ? name + 'c' : 'C') + `annot use an existing alias: ${key}`,
        data
      );
    }

    this.cfg.aliases[key] = args;
    // // skip command aliases since we don't need to split them
    // // and remove `-` prefix
    // isAlias(key) && opts.names.push(key.slice(1));
  }

  private add(type: NodeData['type'], arg: string, options: Options = {}) {
    this.cfg.args ||= { __proto__: null };

    const exists = this.cfg.args[arg];
    if (exists) {
      const data = ndata(this.cfg);
      const name = display(data);
      throw new ParseError(
        ParseError.OPTIONS_ERROR,
        (name ? name + 'c' : 'C') +
          `annot override an existing ${exists.type}: ${arg}`,
        data
      );
    }

    const cfg = (this.cfg.args[arg] = { arg, type, options });

    // use `alias[0]` as alias and `arg` as arg
    const items =
      typeof options.alias === 'string'
        ? [options.alias]
        : Array.isArray(options.alias)
          ? options.alias
          : [];
    for (const item of items) {
      // each item is an alias
      // if item is an array, item[0] is an alias
      const arr =
        typeof item === 'string' ? [item] : Array.isArray(item) ? item : [];
      if (arr.length > 0) {
        this.setAlias(cfg, arr[0], [[arg].concat(arr.slice(1))] as [
          [string, ...string[]]
        ]);
      }
    }

    return this;
  }

  option(arg: string, options?: Options): this {
    return this.add('option', arg, options);
  }

  command(arg: string, options?: Options): this {
    return this.add('command', arg, options);
  }

  alias(aliases: Aliases): this {
    for (const [arg, alias] of Object.entries(aliases)) {
      const args = getArgs(alias);
      args.length > 0 && this.setAlias(this.cfg, arg, args as NormalizedAlias);
    }
    return this;
  }

  config(): Config {
    return this.cfg;
  }

  parse(args: readonly string[]): Node {
    return parse(args, this.cfg);
  }
}
