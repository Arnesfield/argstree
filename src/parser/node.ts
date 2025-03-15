import { ParseError } from '../core/error.js';
import { Split } from '../core/split.js';
import { Schema } from '../schema/schema.class.js';
import { ArgConfig, Config } from '../schema/schema.types.js';
import { Arg, Node as INode, NodeData } from '../types/node.types.js';
import { isAlias } from '../utils/arg.utils.js';
import { display } from '../utils/display.utils.js';
import { slice } from '../utils/slice.js';
import { json } from './json.js';
import { Alias, NormalizedOptions } from './normalize.js';

// NOTE: internal

export interface NodeSplit extends Split {
  list: [Alias, ...Alias[]];
}

export interface NodeOptions {
  raw?: string;
  key?: string;
  alias?: string;
  args?: string[];
  cfg: Config;
}

// required args
export interface ParsedNodeOptions
  extends Omit<NodeOptions, 'args'>,
    Required<Pick<NodeOptions, 'args'>> {}

export class Node {
  readonly data: NodeData;
  readonly children: Node[] = [];
  readonly strict: boolean | undefined;
  /** The strict mode value for descendants. */
  readonly dstrict: boolean | undefined;

  constructor(
    readonly opts: NormalizedOptions,
    options: Omit<NodeOptions, 'cfg'>,
    dstrict?: boolean
  ) {
    // prettier-ignore
    const { type, src, range: { error } } = opts;
    const { raw = null, key = null, alias = null } = options;

    // data.args is a reference to this.args
    const args = (src.args || []).concat(options.args || []);
    this.data = { type, raw, key, alias, args, options: src };

    // throw range error
    if (error) {
      const name = display(this.data);
      throw new ParseError(
        ParseError.OPTIONS_ERROR,
        (name ? name + 'has i' : 'I') + `nvalid ${error}`,
        this.data
      );
    }

    // if options.strict is not set, follow ancestor strict mode
    // otherwise, follow options.strict and also update this.dstrict
    // for descendant nodes
    this.strict =
      src.strict == null
        ? (this.dstrict = dstrict)
        : typeof src.strict === 'boolean'
          ? (this.dstrict = src.strict)
          : !(this.dstrict = src.strict !== 'self');

    // preserve `this` for callbacks
    typeof src.preParse === 'function' && src.preParse(this.data);
  }

  parse(
    arg: Arg,
    flags: { exact?: boolean; hasValue?: boolean } = {}
  ): ParsedNodeOptions | false | null | void {
    // scenario: -a=6
    // alias -a: --option=3, 4, 5
    // option --option: initial 1, 2
    // order of args: [options.initial, arg assigned, alias.args, alias assigned]

    let key = arg.raw,
      value,
      opts,
      cfg;

    // first, find exact options match
    if ((opts = this.opts.args[key])) {
      // ok
    } else if (arg.value != null && (opts = this.opts.args[arg.key])) {
      key = arg.key;
      value = arg.value;
    }

    // if no exact match, fallback to handler
    // no need to check if this is assignable
    // since the consumer would have already handled the value
    if (!opts) {
      !flags.exact && (cfg = this.handle(arg));
    }

    // if exact match was found, check assignable only if
    // - for arg.raw match (value == null): check with flags.hasValue
    // - for arg.key match: always check
    else if (
      (value == null && !flags.hasValue) ||
      (opts.options.assign ?? opts.type === 'option')
    ) {
      // also only create schema when needed since
      // it is possible to have recursive init functions
      // note that having args and aliases means that the schema was already configured
      cfg =
        opts.args && opts.aliases
          ? (opts as Config)
          : new Schema(opts as ArgConfig).config();
    }

    return (
      cfg && { raw: arg.raw, key, args: value != null ? [value] : [], cfg }
    );
  }

  handle(arg: Arg): Config | false | undefined {
    // preserve `this` for callbacks
    return (
      typeof this.opts.src.handler === 'function' &&
      this.opts.src.handler(arg, this.data)?.config()
    );
  }

  parsed(): void {
    // preserve `this` for callbacks
    const { src } = this.opts;
    typeof src.postParse === 'function' && src.postParse(this.data);
  }

  private done(): void {
    // validate assumes the node has lost reference
    // so validate range here, too
    const len = this.data.args.length;
    const { min, max } = this.opts.range;
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
    const { src } = this.opts;
    typeof src.done === 'function' && src.done(this.data);
  }

  // build tree and validate nodes (children are validated first)
  tree(parent: INode | null, depth: number): INode {
    const { src } = this.opts;
    const { raw, key, alias, type, args } = this.data;
    const node: INode = {
      id: (typeof src.id === 'function' ? src.id(this.data) : src.id) ?? key,
      name: src.name ?? key,
      raw,
      key,
      alias,
      type,
      depth,
      args,
      // prepare ancestors before checking children and descendants
      parent,
      children: [],
      ancestors: parent ? parent.ancestors.concat(parent) : [],
      descendants: [],
      json
    };
    for (const sub of this.children) {
      const child = sub.tree(node, depth + 1);
      node.children.push(child);
      // also save descendants of child
      node.descendants.push(child, ...child.descendants);
    }
    // validate children before parent
    this.done();
    return node;
  }

  // aliases

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
      (data = slice(arg.slice(1), this.opts.names)).values.length > 0 &&
      ((data.list = this.alias(data.values, '-')), data as NodeSplit)
    );
  }

  // assume alias keys always exist in opts.aliases
  alias(aliases: string[], prefix = ''): NodeSplit['list'] {
    // get args per alias
    const all: Alias[] = [];
    for (const name of aliases) {
      // assume name always exists
      all.push(...this.opts.aliases[prefix + name]);
    }
    return all as NodeSplit['list'];
  }
}
