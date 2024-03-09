import { splitAlias } from '../helpers/split-alias';
import { Node as INode, NodeOptions, Tree } from '../types/core.types';
import { NodeRange } from '../types/node.types';
import { isAlias, isOption } from '../utils/arg.utils';
import { range } from '../utils/range';

export class Node {
  readonly id: string | null;
  readonly args: string[] = [];
  readonly hasChildren: boolean = true;
  readonly parse: (arg: string) => NodeOptions | null | undefined;
  private readonly nodes: Node[] = [];
  private readonly aliases: string[] = [];
  private readonly aliasMap: {
    [name: string]: string | string[] | null | undefined;
  };
  private readonly options: NodeOptions;

  constructor(id: string | null, options: NodeOptions) {
    this.options = options;
    this.id = options.id ?? id ?? null;

    const { args, alias } = options;
    let _opts: { [name: string]: NodeOptions | null | undefined };
    this.parse =
      typeof args === 'function'
        ? args
        : typeof args === 'object' && args !== null
        ? ((_opts = Object.assign(Object.create(null), args)),
          (arg: string) => _opts[arg] ?? null)
        : ((this.hasChildren = false), () => null);

    this.aliasMap = Object.create(null);
    if (typeof alias === 'object' && alias !== null) {
      Object.assign(this.aliasMap, alias);
    }

    // get aliases and sort by length desc
    for (let alias in this.aliasMap) {
      alias = alias.trim();
      if (!isAlias(alias)) {
        continue;
      }
      const args = alias ? this.getAliasArgs(alias) : [];
      // skip command aliases since we don't need to split them
      if (args.length > 0 && isOption(args[0])) {
        // remove prefix only when saving
        this.aliases.push(alias.slice(1));
      }
    }
    this.aliases.sort((a, b) => b.length - a.length);
  }

  getAliasArgs(alias: string): string[] {
    const args = this.aliasMap[alias];
    return Array.isArray(args) ? args : typeof args === 'string' ? [args] : [];
  }

  expandAlias(arg: string): { arg: string | null; args: string[] } {
    const isAnAlias = isAlias(arg);
    // remove first `-` for alias
    const split = isAnAlias
      ? splitAlias(arg.slice(1), this.aliases)
      : { value: arg, aliases: [arg] };

    const args: string[] = [];
    for (let alias of split.aliases) {
      // note that split.aliases does not have `-` prefix
      // get arg from alias map and use first arg if any
      alias = (isAnAlias ? '-' : '') + alias;
      const aliasArgs = this.getAliasArgs(alias);
      if (aliasArgs.length > 0) {
        args.push(aliasArgs[0]);
      }
    }
    return { args, arg: args.length > 0 ? null : split.value };
  }

  push(arg: string): this {
    this.args.push(arg);
    return this;
  }

  save(node: Node): Node {
    this.nodes.push(node);
    return node;
  }

  toJSON<T extends Tree | INode>(): T {
    const tree = { id: this.id } as T;
    if (this.args.length > 0) {
      tree.args = this.args;
    }
    if (this.nodes.length > 0) {
      tree.nodes = this.nodes.map(node => node.toJSON());
    }
    return tree;
  }

  range(argsLength = this.args.length): NodeRange {
    const { min, max } = range(this.options);
    return {
      min,
      max,
      satisfies: {
        min: min === null || argsLength >= min,
        max: max === null || argsLength <= max,
        exactMax: max === argsLength
      }
    };
  }
}
