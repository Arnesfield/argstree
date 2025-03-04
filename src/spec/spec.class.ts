import { Aliases, Node, Options } from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { parse } from '../core/parse.js';
import { ndata } from '../lib/node.js';
import { isOptionType } from '../utils/arg.utils.js';
import { display } from '../utils/display.utils.js';
import { error } from '../utils/error.utils.js';
import { Spec as ISpec } from './spec.types.js';

// NOTE: internal

type RequiredPick<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
type SpecParseOptions = RequiredPick<Options, 'args' | 'aliases'>;

export class Spec implements ISpec {
  private opts: SpecParseOptions;

  constructor(opts: Options = {}) {
    this.opts = {
      ...opts,
      args: { __proto__: null, ...opts.args },
      aliases: { __proto__: null, ...opts.aliases }
    };
  }

  options(): Options {
    return this.opts;
  }

  arg(arg: string, options: Options | (() => ISpec | Options) = {}): this {
    const o = typeof options === 'function' ? options() : options;
    options =
      typeof (o as ISpec).options === 'function'
        ? (o as ISpec).options()
        : (o as Options);

    const opts = this.opts.args[arg];
    if (opts) {
      const data = ndata(this.opts);
      const name = display(data);
      error(
        ParseError.OPTIONS_ERROR,
        (name ? name + 'c' : 'C') +
          'annot override an existing ' +
          (isOptionType(arg, typeof opts === 'object' ? opts : {})
            ? 'option'
            : 'command') +
          `: ${arg}`,
        data
      );
    }

    this.opts.args[arg] = options;
    return this;
  }

  alias(aliases: Aliases): this {
    for (const [key, value] of Object.entries(aliases)) {
      const args = this.opts.aliases[key];
      // make sure alias args does not actually have value
      if (
        typeof args === 'string' ||
        (Array.isArray(args) &&
          args.some(a => typeof a === 'string' || a.length > 0))
      ) {
        const data = ndata(this.opts);
        const name = display(data);
        error(
          ParseError.OPTIONS_ERROR,
          (name ? name + 'c' : 'C') + `annot use an existing alias: ${key}`,
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
