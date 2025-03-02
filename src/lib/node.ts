import {
  Arg,
  Node as INode,
  NodeData,
  Options,
  ParseOptions
} from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { NormalizedOptions } from '../core/options.js';
import { Split } from '../core/split.js';
import { isAlias, isOption, isOptionType } from '../utils/arg.utils.js';
import { display } from '../utils/display.utils.js';
import { error } from '../utils/error.utils.js';
import { slice } from '../utils/slice.js';

// NOTE: internal

export interface ResolvedAlias {
  /** Alias name. */
  name: string;
  args: [string, ...string[]];
}

export interface NodeSplit extends Split {
  list: ResolvedAlias[];
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

export class Node {
  readonly data: NodeData;
  readonly children: Node[] = [];

  // strict by default
  constructor(
    readonly options: NormalizedOptions,
    opts: Omit<NodeOptions, 'src'>,
    // set parent.strict to constructor param,
    // but override using provided options.strict
    readonly strict = options.src.strict ?? true,
    // this is only here to make the build a teeny bit smaller, lol
    readonly args = (options.src.initial || []).concat(opts.args || [])
  ) {
    // data.args is a reference to this.args
    const { raw = null, key = null, alias = null } = opts;
    this.data = { raw, key, alias, args, options: options.src };

    // if no max, skip all checks as they all require max to be provided
    const { min, max, maxRead } = options.range;
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
      error(
        this.data,
        ParseError.OPTIONS_ERROR,
        (name ? name + 'has i' : 'I') + `nvalid ${msg}`
      );
    }
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

  /** Check if this node can read one more argument. */
  read(): boolean {
    return (
      this.options.range.maxRead == null ||
      this.options.range.maxRead > this.args.length
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
      error(
        this.data,
        ParseError.RANGE_ERROR,
        (name ? name + 'e' : 'E') +
          `xpected ${msg[0]} argument${msg[1] === 1 ? '' : 's'}, but got ${len}.`
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
    // only accept aliases
    // remove first `-` for alias
    // considered as split only if alias args were found
    let data, list;
    if (
      isAlias(arg) &&
      (data = slice(arg.slice(1), this.options.names) as NodeSplit) &&
      (list = this.alias(data.values, '-'))
    ) {
      data.list = list;
      return data;
    }
  }

  alias(aliases: string[], prefix = ''): ResolvedAlias[] | null {
    // get args per alias
    const all: ResolvedAlias[] = [];
    for (let name of aliases) {
      name = prefix + name;
      for (const args of this.options.aliases[name] || []) {
        all.push({ name, args });
      }
    }
    return all.length > 0 ? all : null;
  }
}
