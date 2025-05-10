import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { split, Split } from '../lib/split';
import { Schema } from '../schema/schema.class';
import { ArgConfig, Config } from '../schema/schema.types';
import { Arg } from '../types/arg.types';
import { Node as INode } from '../types/node.types';
import { Options } from '../types/options.types';
import { NonEmptyArray } from '../types/util.types';
import { display } from '../utils/display';
import { Alias, NormalizedOptions, NormalizeOptions } from './normalize';

// NOTE: internal

export interface ParsedArg extends Arg {
  /** The alias used when the argument was parsed through an alias. */
  alias?: string;
}

export interface HandlerResult<T> {
  values: string[];
  opts: ParsedNodeOptions<T>[];
}

// same as INode but cannot be a value type
export interface NodeData<T>
  extends Omit<INode<T>, 'type'>,
    Pick<Config<T>, 'type'> {}

export type NodeEvent<T> = keyof {
  [K in keyof Options<T> as K extends `on${string}` ? K : never]: Options<T>[K];
};

// same as NormalizeOptions but with required args
export interface ParsedNodeOptions<T>
  extends Omit<NormalizeOptions<T>, 'args'>,
    Required<Pick<NormalizeOptions<T>, 'args'>> {}

export interface NodeSplit extends Split {
  list?: NonEmptyArray<Alias>;
}

// NOTE: node instances will only have data types 'option' and 'command'
// directly save value nodes into data.children instead
export class Node<T> {
  readonly children: Node<T>[] = [];
  readonly strict: boolean | undefined;
  /** The strict mode value for descendants. */
  private readonly dstrict: boolean | undefined;

  constructor(
    readonly opts: NormalizedOptions<T>,
    readonly data: NodeData<T>,
    parent?: Node<T>
  ) {
    // if options.strict is not set, follow ancestor strict mode
    // otherwise, follow options.strict and also update this.dstrict
    // for descendant nodes
    this.strict =
      opts.src.strict == null
        ? (this.dstrict = parent?.dstrict)
        : typeof opts.src.strict === 'boolean'
          ? (this.dstrict = opts.src.strict)
          : !(this.dstrict = opts.src.strict !== 'self');

    this.run('onCreate');
  }

  run(name: NodeEvent<T>): void {
    // preserve `this` for callbacks
    this.opts.src[name]?.(this.data);
  }

  /**
   * Gets the node options from the normalized arguments using the parsed argument.
   * @param arg The parsed argument.
   * @param assignable Set to `true` to accept assignable option or command only.
   * @returns The parsed node options.
   */
  parse(
    arg: ParsedArg,
    assignable?: boolean
  ): ParsedNodeOptions<T> | undefined {
    // if exact match was found, check assignable only if value exists
    const { raw, key, alias, value } = arg;
    const opts = this.opts.args[key];
    if (
      opts &&
      (!assignable || (opts.options.assign ?? opts.type === 'option'))
    ) {
      // only create schema when needed to handle recursive init functions
      // having args and aliases means that the schema was already configured
      const cfg = opts.args
        ? (opts as Config<T>)
        : new Schema(opts as ArgConfig<T>).config();
      return { raw, key, alias, args: value != null ? [value] : [], cfg };
    }
  }

  // NOTE: return empty arrays to ignore values
  // return falsy to fallback to default behavior
  handle(arg: ParsedArg): HandlerResult<T> | undefined {
    // preserve `this` for callbacks
    let schemas = this.opts.src.handler?.(arg, this.data);
    // fallback to default behavior for null, undefined, true
    if (schemas == null || schemas === true) return;

    const result: HandlerResult<T> = { values: [], opts: [] };
    // ignore when false by returning empty result
    if (schemas === false) return result;

    schemas = Array.isArray(schemas) ? schemas : [schemas];
    // fallback to default behavior for empty arrays
    if (schemas.length === 0) return;

    const { raw, key, alias } = arg;
    for (const schema of schemas) {
      if (typeof schema === 'string') {
        result.values.push(schema);
      } else {
        // use arg.key as key here despite not using arg.value
        // since we assume that the consumer will handle arg.value manually
        result.opts.push({ raw, key, alias, args: [], cfg: schema.config() });
      }
    }

    return result;
  }

  // save arg to the last value child node
  value(arg: string): void {
    let node;
    const { children } = this.data;
    if (
      children.length > 0 &&
      (node = children[children.length - 1]).type === 'value'
    ) {
      node.args.push(arg);
    } else {
      // value node is almost the same as its parent but with different props
      children.push({
        ...this.data,
        type: 'value',
        depth: this.data.depth + 1,
        args: [arg],
        parent: this.data,
        children: []
      });
    }
  }

  /** Depth parsed. */
  done(): void {
    this.run('onData');
    for (const node of this.children) node.run('onDepth');
  }

  check(): void {
    const { min, max } = this.opts;

    // validate node
    const len = this.data.args.length;
    const msg: [string | number, number] | null =
      min != null && max != null && (len < min || len > max)
        ? min === max
          ? [min, min]
          : [`${min}-${max}`, 0]
        : min != null && len < min
          ? [`at least ${min}`, min]
          : max != null && len > max
            ? [max && `up to ${max}`, max]
            : null;

    if (msg) {
      const err = `xpected ${msg[0]} argument${msg[1] === 1 ? '' : 's'}, but got ${len}.`;
      this.error('e', 'E', err, ParseError.RANGE_ERROR);
    }

    this.run('onValidate');
  }

  error(
    prefix1: string,
    prefix2: string,
    msg: string,
    code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR
  ): never {
    const name = display(this.data);
    msg = (name ? name + prefix1 : prefix2) + msg;
    throw new ParseError(code, msg, this.data, this.opts.src);
  }

  // aliases

  split(arg: string): NodeSplit | undefined {
    type A = NonEmptyArray<Alias>;

    // only accept aliases
    // remove first `-` for alias
    // considered as split only if alias args were found.
    // note that split.values would always exist as keys in opts.aliases
    // as we use opts.names for splitting which is derived from opts.aliases
    let s: NodeSplit | undefined;
    if (
      isOption(arg, 'short') &&
      (s = split(arg.slice(1), this.opts.keys)).values.length > 0
    ) {
      // only set list if has no remainder
      if (s.remainder.length === 0) {
        // get args per alias and assume `-{name}` always exists
        s.list = s.values.map(key => this.opts.aliases['-' + key]) as A;
      }
      return s;
    }
  }
}
