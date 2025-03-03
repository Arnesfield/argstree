import { Aliases, Node, Options, ParseOptions } from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { parse } from '../core/parse.js';
import { ndata } from '../lib/node.js';
import { display } from '../utils/display.utils.js';
import { error } from '../utils/error.utils.js';
import { Spec as ISpec } from './spec.types.js';

// NOTE: internal

type RequiredPick<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
type SpecParseOptions = RequiredPick<ParseOptions, 'args' | 'aliases'>;

export class Spec implements ISpec {
  private opts: SpecParseOptions;

  constructor(opts: ParseOptions) {
    this.opts = {
      ...opts,
      args: { __proto__: null, ...opts.args },
      aliases: { __proto__: null, ...opts.aliases }
    };
  }

  options(): ParseOptions {
    return this.opts;
  }

  add(arg: string, options: Options = {}): this {
    const opts = this.opts.args[arg];
    if (opts) {
      error(
        ParseError.OPTIONS_ERROR,
        display({ key: arg, options: typeof opts === 'object' ? opts : {} }) +
          'already exists.',
        ndata(arg, options)
      );
    }

    this.opts.args[arg] = options;
    return this;
  }

  alias(aliases: Aliases): this {
    for (const [key, value] of Object.entries(aliases)) {
      if (this.opts.aliases[key]) {
        const data = ndata(key, this.opts);
        error(
          ParseError.OPTIONS_ERROR,
          `${display(data)}cannot use an existing alias: ${key}`,
          data
        );
      }

      this.opts.aliases[key] = value;
    }
    return this;
  }

  parse(args: readonly string[]): Node {
    return parse(args, this.opts);
  }
}
