import { Aliases, Args, Node, Options } from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { parse } from '../core/parse.js';
import { ndata } from '../lib/node.js';
import { isOptionType } from '../utils/arg.utils.js';
import { display } from '../utils/display.utils.js';
import { Spec as ISpec } from './spec.types.js';

// NOTE: internal

type RequiredPick<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>;
};
type SpecOptions = RequiredPick<Options, 'aliases'>;

export class Spec implements ISpec {
  private readonly opts: SpecOptions;
  private args: Args | undefined;

  constructor(opts: Options = {}) {
    this.opts = { ...opts, aliases: { __proto__: null, ...opts.aliases } };
  }

  options(): Options {
    return this.opts;
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
        throw new ParseError(
          ParseError.OPTIONS_ERROR,
          (name ? name + 'c' : 'C') + `annot use an existing alias: ${key}`,
          data
        );
      }

      this.opts.aliases[key] = value;
    }
    return this;
  }

  arg(arg: string, options: Options | (() => ISpec | Options) = {}): this {
    const o = typeof options === 'function' ? options() : options;
    options =
      typeof (o as ISpec).options === 'function'
        ? (o as ISpec).options()
        : (o as Options);

    // only set this.opts.args if needed since the
    // existence of options.args is checked
    if (!this.args) {
      this.opts.args = this.args = { __proto__: null, ...this.opts.args };
    }

    const opts = this.args[arg];
    if (opts) {
      const data = ndata(this.opts);
      const name = display(data);
      throw new ParseError(
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

    this.args[arg] = options;
    return this;
  }

  parse(args: readonly string[]): Node {
    return parse(args, this.opts);
  }
}
