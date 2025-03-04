import {
  Arg,
  Node as INode,
  NodeData,
  Options,
  ParseOptions
} from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { Split } from '../core/split.js';
import { isAlias, isOption, isOptionType } from '../utils/arg.utils.js';
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
  raw?: string | null;
  key?: string | null;
  alias?: string | null;
  args?: string[];
  src: Options | true;
}

// required args
export interface ParsedNodeOptions
  extends Omit<NodeOptions, 'args'>,
    Required<Pick<NodeOptions, 'args'>> {}

// create empty node data for errors
export function ndata(
  options: Options,
  key: string | null = null
): Pick<NodeData, 'raw' | 'key' | 'options'> {
  return { raw: key, key, options };
}

export class Node {
  readonly data: NodeData;
  readonly args: string[] = [];
  readonly children: Node[] = [];
  /** Determines if the Node is a leaf node and cannot have descendants. */
  readonly leaf: boolean;
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
    const { src, range: { min, max, maxRead } } = options;
    const { raw = null, key = null, alias = null } = opts;

    // data.args is a reference to this.args
    this.args = (src.initial || []).concat(opts.args || []);
    this.data = { raw, key, alias, args: this.args, options: src };

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

    this.leaf = !(src.args || src.handler) && isOptionType(key, src);

    // if options.strict is not set, follow ancestor strict mode
    // otherwise, follow options.strict and also update this.dstrict
    // for descendant nodes
    this.strict =
      src.strict == null
        ? this.dstrict
        : typeof src.strict === 'boolean'
          ? (this.dstrict = src.strict)
          : !(this.dstrict = src.strict !== 'self');
  }

  private arg(arg: string, hasValue: boolean | undefined) {
    // check if assignable if has value
    let opts;
    return (
      (opts = this.options.args[arg]) &&
      (!hasValue ||
        (typeof opts === 'object'
          ? (opts.assign ?? isOptionType(arg, opts))
          : isOption(arg))) &&
      opts
    );
  }

  parse(
    arg: Arg,
    flags: { exact?: boolean; hasValue?: boolean } = {}
  ): ParsedNodeOptions | undefined {
    // scenario: -a=6
    // alias -a: --option=3, 4, 5
    // option --option: initial 1, 2
    // order of args: [options.initial, arg assigned, alias.args, alias assigned]

    let src,
      key = arg.raw,
      args: string[] = [];

    if ((src = this.arg(key, flags.hasValue))) {
      // do nothing
    } else if (arg.value != null && (src = this.arg(arg.key, true))) {
      key = arg.key;
      args = [arg.value];
    } else if (!flags.exact) {
      src = this.handle(arg);
    }

    if (src) {
      return { raw: arg.raw, key, args, src };
    }
  }

  handle(arg: Arg): ReturnType<NonNullable<ParseOptions['handler']>> {
    // preserve `this` for callbacks
    return (
      typeof this.options.src.handler === 'function' &&
      this.options.src.handler(arg, this.data)
    );
  }

  done(): void {
    // validate assumes the node has lost reference
    // so validate range here, too
    const len = this.args.length;
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
    typeof src.done === 'function' && src.done(this.data);
  }

  tree(parent: INode | null, depth: number): INode {
    const { src } = this.options;
    const { raw, key, alias, args } = this.data;
    const node: INode = {
      id: (typeof src.id === 'function' ? src.id(this.data) : src.id) ?? key,
      name: src.name ?? key,
      raw,
      key,
      alias,
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
