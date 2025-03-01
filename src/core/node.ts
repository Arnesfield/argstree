import { isAlias, isAssignable } from '../utils/arg.utils.js';
import { slice } from '../utils/slice.js';
import {
  Arg,
  Args,
  Node as INode,
  NodeData,
  ParseOptions
} from './core.types.js';
import { NormalizedOptions } from './options.js';
import { Split } from './split.js';

// NOTE: internal

export function toArg(raw: string): Arg {
  const index = raw.lastIndexOf('=');
  const split = index > -1;
  return {
    raw,
    key: split ? raw.slice(0, index) : raw,
    value: split ? raw.slice(index + 1) : null
  };
}

export interface ResolvedAlias {
  /** Alias name. */
  name: string;
  args: [string, ...string[]];
}

export interface NodeSplit extends Split {
  list: ResolvedAlias[];
}

export interface NodeOptions {
  options: NormalizedOptions;
  raw?: string | null;
  key?: string | null;
  alias?: string | null;
  // why not args? well, rollup renames the variable
  // to args2 due to variable shadowing
  argv?: string[];
}

export class Node {
  readonly args: string[];
  readonly children: Node[] = [];
  readonly options: NormalizedOptions;
  readonly strict: boolean;
  readonly data: NodeData;

  // strict by default
  constructor(opts: NodeOptions, strict = true) {
    const { src } = (this.options = opts.options);
    this.args = (src.initial || []).concat(opts.argv || []);

    const { raw = null, key = null, alias = null } = opts;
    this.data = { raw, key, alias, args: this.args, options: src };

    // set parent.strict to constructor param, but override using provided options.strict
    this.strict = src.strict ?? strict;
  }

  parse(arg: string, hasValue: boolean | undefined): Args[string] {
    let opts;
    return (
      (opts = this.options.args[arg]) &&
      (!hasValue || isAssignable(arg, opts)) &&
      opts
    );
  }

  hparse(arg: Arg): ReturnType<NonNullable<ParseOptions['handler']>> {
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
      this.options.range.maxRead >= this.args.length + 1
    );
  }

  done(): void {
    // validate assumes the node has lost reference
    // so validate range here, too
    const len = this.args.length;
    const { min, max } = this.options.range;
    const phrase: [string | number, number] | null =
      min != null && max != null && (len < min || len > max)
        ? min === max
          ? [min, min]
          : [`${min}-${max}`, 2]
        : min != null && len < min
          ? [`at least ${min}`, min]
          : max != null && len > max
            ? [max && `up to ${max}`, max]
            : null;
    if (phrase) {
      // TODO: error
      throw new Error(
        `Expected ${phrase[0]} argument${phrase[1] === 1 ? '' : 's'}, but got ${len}.`
      );
      // const name = this.name();
      // this.error(
      //   ArgsTreeError.INVALID_RANGE_ERROR,
      //   (name ? name + 'e' : 'E') +
      //     `xpected ${phrase[0]} argument${phrase[1] === 1 ? '' : 's'}, but got ${len}.`
      // );
    }

    // preserve `this` for callbacks
    const { src } = this.options;
    typeof src.done === 'function' && src.done(this.data);
  }

  tree(parent: INode | null, depth: number): INode {
    const { src } = this.options;
    const { raw, key, alias } = this.data;
    const node: INode = {
      id:
        (typeof src.id === 'function' ? src.id(this.data) : src.id) ??
        raw ??
        key,
      name: src.name ?? null,
      raw,
      key,
      alias,
      depth,
      args: this.args,
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
