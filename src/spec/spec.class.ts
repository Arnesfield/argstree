import {
  Args,
  Node,
  NodeData,
  Options,
  ParseOptions
} from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { parse } from '../core/parse.js';
import { display } from '../utils/display.utils.js';
import { Spec as ISpec } from './spec.types.js';

// NOTE: internal

export class Spec implements ISpec {
  private args: Args | undefined;

  constructor(private opts: ParseOptions) {}

  private add(raw: string, options: Options) {
    // only create copy of args when needed
    if (!this.args) {
      this.args = { __proto__: null, ...this.opts.args };
      this.opts = { ...this.opts, args: this.args };
    }

    let exists;
    if (
      (exists = this.args[raw]) && typeof exists === 'object'
        ? exists
        : (exists = {})
    ) {
      type N = NodeData;
      const data: N = { raw, key: raw, alias: null, args: [], options: exists };
      throw new ParseError(
        ParseError.OPTIONS_ERROR,
        `${display(data)}already exists.`,
        data
      );
    }
    this.args[raw] = options;

    return this;
  }

  option(arg: string, options?: Omit<Options, 'type'>): this {
    return this.add(arg, { ...options, type: 'option' });
  }

  command(arg: string, options?: Omit<Options, 'type'>): this {
    return this.add(arg, { ...options, type: 'command' });
  }

  options(): ParseOptions {
    return this.opts;
  }

  parse(args: readonly string[]): Node {
    return parse(args, this.opts);
  }
}
