import { ParseError } from '../core/error.js';
import { split, Split } from '../core/split.js';
import { Schema } from '../schema/schema.class.js';
import { ArgConfig, Config } from '../schema/schema.types.js';
import { Arg, Node as INode, NodeData, NodeType } from '../types/node.types.js';
import { Options } from '../types/options.types.js';
import { isAlias } from '../utils/arg.js';
import { display } from '../utils/display.js';
import { Alias, NormalizedOptions } from './normalize.js';

// NOTE: internal

export interface NodeSplit extends Split {
  list: [Alias, ...Alias[]];
}

export interface NodeOptions {
  raw?: string | null;
  key?: string | null;
  alias?: string | null;
  args?: string[];
  cfg: Config;
}

export function ndata(
  opts: Pick<NodeOptions, 'raw' | 'key' | 'alias'>,
  options: Options,
  type: NodeType,
  args: string[]
): NodeData {
  const { raw = null, key = null, alias = null } = opts;
  return { raw, key, alias, type, args, options, children: [] };
}

// required args
export interface ParsedNodeOptions
  extends Omit<NodeOptions, 'args'>,
    Required<Pick<NodeOptions, 'args'>> {}

export class Node {
  readonly children: Node[] = [];
  readonly strict: boolean | undefined;
  /** The strict mode value for descendants. */
  readonly dstrict: boolean | undefined;

  constructor(
    readonly opts: NormalizedOptions,
    readonly data: NodeData,
    dstrict?: boolean
  ) {
    // if options.strict is not set, follow ancestor strict mode
    // otherwise, follow options.strict and also update this.dstrict
    // for descendant nodes
    this.strict =
      opts.src.strict == null
        ? (this.dstrict = dstrict)
        : typeof opts.src.strict === 'boolean'
          ? (this.dstrict = opts.src.strict)
          : !(this.dstrict = opts.src.strict !== 'self');

    // preserve `this` for callbacks, skip for value nodes
    data.type !== 'value' &&
      typeof opts.src.preData === 'function' &&
      opts.src.preData(data);
  }

  parse(
    arg: Arg,
    flags: { exact?: boolean; hasValue?: boolean } = {}
  ): [ParsedNodeOptions, ...ParsedNodeOptions[]] | false | undefined {
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

  handle(arg: Arg): [ParsedNodeOptions, ...ParsedNodeOptions[]] | undefined {
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
      }) as [ParsedNodeOptions, ...ParsedNodeOptions[]];
    }
  }

  // save arg to the last value child node
  value(arg: string): void {
    let node;
    if (
      this.children.length > 0 &&
      (node = this.children[this.children.length - 1]).data.type === 'value'
    ) {
      node.data.args.push(arg);
    } else {
      this.children.push(
        new Node(this.opts, ndata(this.data, this.opts.src, 'value', [arg]))
      );
    }
  }

  // mark as parsed
  done(): void {
    // assume this is never called for value nodes
    // preserve `this` for callbacks
    typeof this.opts.src.postData === 'function' &&
      this.opts.src.postData(this.data);
  }

  node(parent: INode | null): INode {
    const { src } = this.opts;
    const { raw, key, alias, type, args } = this.data;

    // preserve `this` for callbacks, skip for value nodes
    type !== 'value' &&
      typeof src.preParse === 'function' &&
      src.preParse(this.data);

    // always prioritize options.id
    // only fallback to key if undefined (accept nulls)
    const id = typeof src.id === 'function' ? src.id(this.data) : src.id;

    const node: INode = {
      id: typeof id !== 'undefined' ? id : key,
      name: src.name ?? key,
      raw,
      key,
      alias,
      type,
      depth: parent ? parent.depth + 1 : 0,
      args,
      parent,
      children: []
    };
    parent?.children.push(node);

    return node;
  }

  final(node: INode): void {
    // skip for value nodes
    if (node.type === 'value') return;

    // prettier-ignore
    const { src, range: { min, max } } = this.opts;

    // validate node
    const len = this.data.args.length;
    const msg: [string | number, number] | null =
      min != null && max != null && (len < min || len > max)
        ? min === max
          ? [min, min]
          : [`${min}-${max}`, 2]
        : min != null && len < min
          ? [`at least ${min}`, min]
          : max != null && len > max
            ? [max && `up to ${max}`, max]
            : null;

    if (msg) {
      const name = display(this.data);
      throw new ParseError(
        ParseError.RANGE_ERROR,
        (name ? name + 'e' : 'E') +
          `xpected ${msg[0]} argument${msg[1] === 1 ? '' : 's'}, but got ${len}.`,
        this.data
      );
    }

    // preserve `this` for callbacks
    typeof src.postParse === 'function' && src.postParse(node);
  }

  // aliases

  // assume alias keys always exist in opts.aliases
  alias(names: string[], prefix = ''): NodeSplit['list'] {
    // get args per alias and assume name always exists
    type L = NodeSplit['list'];
    return names.flatMap(name => this.opts.aliases[prefix + name]) as L;
  }

  split(arg: string): NodeSplit | false {
    // accept optional for split.list (internal only)
    interface PartialNodeSplit
      extends Split,
        Partial<Pick<NodeSplit, 'list'>> {}

    // only accept aliases
    // remove first `-` for alias
    // considered as split only if alias args were found.
    // note that split.values would always exist as keys in opts.aliases
    // as we use opts.names for splitting which is derived from opts.aliases
    let data: PartialNodeSplit | undefined;
    return (
      isAlias(arg) &&
      (data = split(arg.slice(1), this.opts.names)).values.length > 0 &&
      ((data.list = this.alias(data.values, '-')), data as NodeSplit)
    );
  }
}
