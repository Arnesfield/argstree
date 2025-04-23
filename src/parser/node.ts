import { ParseError } from '../lib/error';
import { split, Split } from '../lib/split';
import { Schema } from '../schema/schema.class';
import { ArgConfig, Config } from '../schema/schema.types';
import { Arg, Node as INode } from '../types/node.types';
import { NonEmptyArray } from '../types/util.types';
import { isAlias } from '../utils/arg';
import { display } from '../utils/display';
import { Alias, NormalizedOptions, NormalizeOptions } from './normalize';

// NOTE: internal

// same as INode but cannot be a value type
export interface NodeData extends Omit<INode, 'type'>, Pick<Config, 'type'> {}

// same as NormalizeOptions but with required args
export interface ParsedNodeOptions
  extends Omit<NormalizeOptions, 'args'>,
    Required<Pick<NormalizeOptions, 'args'>> {}

export interface NodeSplit extends Split {
  list: NonEmptyArray<Alias>;
}

// NOTE: node instances will only have data types 'option' and 'command'
// directly save value nodes into data.children instead
export class Node {
  readonly strict: boolean | undefined;
  /** The strict mode value for descendants. */
  private readonly dstrict: boolean | undefined;

  constructor(
    readonly opts: NormalizedOptions,
    readonly data: NodeData,
    parent?: Node
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

    this.run('preArgs');
  }

  run(name: 'preArgs' | 'postArgs' | 'preValidate' | 'postValidate'): void {
    // preserve `this` for callbacks
    typeof this.opts.src[name] === 'function' && this.opts.src[name](this.data);
  }

  parse(
    arg: Arg,
    flags: { exact?: boolean; hasValue?: boolean } = {}
  ): NonEmptyArray<ParsedNodeOptions> | false | undefined {
    // scenario: -a=6
    // alias -a: --option=3, 4, 5
    // option --option: initial 1, 2
    // order of args: [options.initial, arg assigned, alias.args, alias assigned]

    // use arg.raw as key if not using arg.value or if parsing via handler
    let key = arg.raw,
      value,
      opts;

    // first, find exact options match
    if ((opts = this.opts.args[key])) {
      // ok, use arg.raw as key
    } else if (arg.value != null && (opts = this.opts.args[arg.key])) {
      key = arg.key;
      value = arg.value;
    }

    // if no exact match, fallback to handler
    // no need to check if this is assignable
    // since the consumer would have already handled the value
    else {
      // 'opts' is undefined at this point
      return !flags.exact && this.handle(arg);
    }

    // if exact match was found, check assignable only if
    // - for arg.raw match (value == null): check with flags.hasValue
    // - for arg.key match: always check
    if (
      (value == null && !flags.hasValue) ||
      (opts.options.assign ?? opts.type === 'option')
    ) {
      // only create schema when needed to handle recursive init functions
      // having args and aliases means that the schema was already configured
      const { raw, alias } = arg;
      const cfg =
        opts.args && opts.aliases
          ? (opts as Config)
          : new Schema(opts as ArgConfig).config();
      return [{ raw, key, alias, args: value != null ? [value] : [], cfg }];
    }
  }

  handle(arg: Arg): NonEmptyArray<ParsedNodeOptions> | undefined {
    // preserve `this` for callbacks
    let schemas;
    if (
      typeof this.opts.src.handler === 'function' &&
      (schemas = this.opts.src.handler(arg, this.data)) &&
      (schemas = Array.isArray(schemas) ? schemas : [schemas]).length > 0
    ) {
      const { raw, key, alias } = arg;
      return schemas.map((schema): ParsedNodeOptions => {
        // use arg.key as key here despite not using arg.value
        // since we assume that the consumer will handle arg.value manually
        return { raw, key, alias, args: [], cfg: schema.config() };
      }) as NonEmptyArray<ParsedNodeOptions>;
    }
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
      this.error(ParseError.RANGE_ERROR, 'e', 'E', err);
    }

    this.run('postValidate');
  }

  error(code: string, prefix1: string, prefix2: string, msg: string): never {
    const name = display(this.data);
    msg = (name ? name + prefix1 : prefix2) + msg;
    throw new ParseError(code, msg, this.data, this.opts.src);
  }

  // aliases

  split(arg: string): NodeSplit | undefined {
    // accept optional for split.list (internal only)
    interface PartialNodeSplit
      extends Split,
        Partial<Pick<NodeSplit, 'list'>> {}
    type A = NonEmptyArray<Alias>;

    // only accept aliases
    // remove first `-` for alias
    // considered as split only if alias args were found.
    // note that split.values would always exist as keys in opts.aliases
    // as we use opts.names for splitting which is derived from opts.aliases
    let s: PartialNodeSplit | undefined;
    if (
      isAlias(arg) &&
      (s = split(arg.slice(1), this.opts.keys)).values.length > 0
    ) {
      // get args per alias and assume `-{name}` always exists
      s.list = s.values.flatMap(key => this.opts.aliases['-' + key]) as A;
      return s as NodeSplit;
    }
  }
}
