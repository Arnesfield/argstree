import { Arg, Node as INode, NodeData } from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { Split } from '../core/split.js';
import { Schema } from '../schema/schema.class.js';
import { SchemaConfig } from '../schema/schema.types.js';
import { isAlias } from '../utils/arg.utils.js';
import { display } from '../utils/display.utils.js';
import { slice } from '../utils/slice.js';
import { NormalizedOptions } from './normalize.js';

// NOTE: internal

export interface AliasItem {
  /** Alias name. */
  name: string;
  args: [string, ...string[]];
}

export interface NodeSplit extends Split {
  list: [AliasItem, ...AliasItem[]];
}

export interface NodeOptions {
  raw?: string;
  key?: string;
  alias?: string;
  args?: string[];
  src: SchemaConfig;
}

// required args
export interface ParsedNodeOptions
  extends Omit<NodeOptions, 'args'>,
    Required<Pick<NodeOptions, 'args'>> {}

export class Node {
  readonly data: NodeData;
  readonly children: Node[] = [];
  readonly strict: boolean | undefined;

  /**
   * @param dstrict The strict mode value for descendants.
   */
  constructor(
    readonly options: NormalizedOptions,
    opts: Omit<NodeOptions, 'src'>,
    readonly dstrict?: boolean
  ) {
    // prettier-ignore
    const { type, src, range: { min, max, maxRead } } = options;
    const { raw = null, key = null, alias = null } = opts;

    // data.args is a reference to this.args
    const args = (src.initial || []).concat(opts.args || []);
    this.data = { type, raw, key, alias, args, options: src };

    // if no max, skip all checks as they all require max to be provided
    const msg =
      max == null
        ? null
        : min != null && min > max
          ? `min and max range: ${min}-${max}`
          : maxRead != null && max < maxRead
            ? `max and maxRead range: ${max} >= ${maxRead}`
            : null;
    if (msg) {
      const name = display(this.data);
      throw new ParseError(
        ParseError.OPTIONS_ERROR,
        (name ? name + 'has i' : 'I') + `nvalid ${msg}`,
        this.data
      );
    }

    // if options.strict is not set, follow ancestor strict mode
    // otherwise, follow options.strict and also update this.dstrict
    // for descendant nodes
    this.strict =
      src.strict == null
        ? dstrict
        : typeof src.strict === 'boolean'
          ? (this.dstrict = src.strict)
          : !(this.dstrict = src.strict !== 'self');

    // preserve `this` for callbacks
    typeof src.onBeforeParse === 'function' && src.onBeforeParse(this.data);
  }

  private arg(arg: string, hasValue: boolean | undefined) {
    // check if assignable if has value
    let opts;
    return (
      this.options.schemas[arg] ||
      ((opts = this.options.args[arg]) &&
        (!hasValue || (opts.options.assign ?? opts.type === 'option')) &&
        (this.options.schemas[arg] = new Schema(opts).config()))
    );
  }

  parse(
    arg: Arg,
    flags: { exact?: boolean; hasValue?: boolean } = {}
  ): ParsedNodeOptions | false | null | void {
    // scenario: -a=6
    // alias -a: --option=3, 4, 5
    // option --option: initial 1, 2
    // order of args: [options.initial, arg assigned, alias.args, alias assigned]

    let src,
      key = arg.raw,
      value;

    if ((src = this.arg(key, flags.hasValue))) {
      // do nothing
    } else if (arg.value != null && (src = this.arg(arg.key, true))) {
      key = arg.key;
      value = arg.value;
    } else if (!flags.exact) {
      src = this.handle(arg);
    }

    return (
      src && { raw: arg.raw, key, args: value != null ? [value] : [], src }
    );
  }

  handle(arg: Arg): SchemaConfig | false | null | undefined | void {
    // preserve `this` for callbacks
    let schema;
    return (
      typeof this.options.src.handler === 'function' &&
      (schema = this.options.src.handler(arg, this.data)) &&
      schema.config()
    );
  }

  done(): void {
    // validate assumes the node has lost reference
    // so validate range here, too
    const len = this.data.args.length;
    const { min, max } = this.options.range;
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
    const { src } = this.options;
    typeof src.onAfterParse === 'function' && src.onAfterParse(this.data);
  }

  tree(parent: INode | null, depth: number): INode {
    const { src } = this.options;
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
      descendants: []
    };
    for (const sub of this.children) {
      const child = sub.tree(node, depth + 1);
      node.children.push(child);
      // also save descendants of child
      node.descendants.push(child, ...child.descendants);
    }
    return node;
  }

  // aliases

  split(arg: string): NodeSplit | undefined {
    // accept false for split.list (internal to Node only)
    type PartialNodeSplit = Split & { list: NodeSplit['list'] | false };

    // only accept aliases
    // remove first `-` for alias
    // considered as split only if alias args were found
    let data;
    if (
      isAlias(arg) &&
      (data = slice(arg.slice(1), this.options.names) as PartialNodeSplit) &&
      (data.list = this.alias(data.values, '-'))
    ) {
      // list should have value here
      return data as NodeSplit;
    }
  }

  alias(aliases: string[], prefix = ''): NodeSplit['list'] | false {
    // get args per alias
    const all: AliasItem[] = [];
    for (let name of aliases) {
      name = prefix + name;
      for (const args of this.options.aliases[name] || []) {
        all.push({ name, args });
      }
    }
    return all.length > 0 && (all as NodeSplit['list']);
  }
}
