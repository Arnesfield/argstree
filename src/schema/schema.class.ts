import { Aliases, Node, NodeData, Options } from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { parse } from '../core/parse.js';
import { display } from '../utils/display.utils.js';
import {
  ArgConfig,
  Config,
  ConfigAlias,
  Schema as ISchema
} from './schema.types.js';

// NOTE: internal

function getArgs(alias: Aliases[string]): [string, ...string[]][] {
  /** List of strings in `args`. */
  let strs: [string, ...string[]] | undefined;
  const list: [string, ...string[]][] = [];
  const args =
    typeof alias === 'string' ? [alias] : Array.isArray(alias) ? alias : [];

  for (const arg of args) {
    if (typeof arg === 'string') {
      strs ? strs.push(arg) : list.push((strs = [arg]));
    } else if (Array.isArray(arg) && arg.length > 0) {
      // filter out empty array
      list.push(arg as [string, ...string[]]);
    }
  }

  return list;
}

interface PartialConfig
  extends Omit<ArgConfig, 'key'>,
    Partial<Pick<ArgConfig, 'key'>> {}

// create empty node data for errors
function ndata(cfg: PartialConfig): NodeData {
  const { key = null, type, options } = cfg;
  return { raw: key, key, alias: null, type, args: [], options };
}

export class Schema implements ISchema {
  private readonly cfg: Config;

  constructor(cfg: PartialConfig) {
    // NOTE: intentional cfg object mutation to update existing ArgConfig object
    // always replace args and aliases
    cfg.args = { __proto__: null };
    cfg.aliases = { __proto__: null };
    this.cfg = cfg as Config;

    // only call setup once all states are ready
    typeof cfg.options.setup === 'function' && cfg.options.setup(this);
  }

  private setAlias(cfg: PartialConfig, key: string, args: ConfigAlias) {
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
  }

  private add(type: NodeData['type'], key: string, options: Options = {}) {
    const exists = this.cfg.args[key];
    if (exists) {
      const data = ndata(this.cfg);
      const name = display(data);
      throw new ParseError(
        ParseError.OPTIONS_ERROR,
        (name ? name + 'c' : 'C') +
          `annot override an existing ${exists.type}: ${key}`,
        data
      );
    }

    const cfg: ArgConfig = (this.cfg.args[key] = { key, type, options });

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
        this.setAlias(cfg, arr[0], [[key].concat(arr.slice(1))] as [
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
      args.length > 0 && this.setAlias(this.cfg, arg, args as ConfigAlias);
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
