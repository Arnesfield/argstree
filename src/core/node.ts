import { splitAlias } from '../helpers/split-alias';
import { Node as INode, NodeOptions, Tree } from '../types/core.types';
import { range } from '../utils/range';

export class Node {
  readonly id: string | null;
  readonly args: string[] = [];
  readonly hasChildren: boolean = true;
  readonly parse: (arg: string) => NodeOptions | null | undefined;
  private readonly nodes: Node[] = [];
  private readonly aliases: string[];
  private readonly aliasMap: {
    [name: string]: string | string[] | null | undefined;
  };

  constructor(id: string | null = null, private readonly options: NodeOptions) {
    this.id = options.id ?? id;

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

    // get aliases and sort by highest length
    this.aliases = Object.keys(this.aliasMap)
      .map(alias => alias.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
  }

  getAliasArgs(alias: string): string[] {
    const args = this.aliasMap[alias];
    return Array.isArray(args) ? args : typeof args === 'string' ? [args] : [];
  }

  expandAlias(arg: string): string[] {
    const split = splitAlias(arg, this.aliases);
    // left over string from split, not matched by any of the aliases
    const unknown = split.value.trim();
    if (unknown) {
      const parts = Array.from(new Set(unknown.split('')));
      const label = parts.length === 1 ? 'alias' : 'aliases';
      const opts = parts.map(part => '-' + part).join(', ');
      // TODO: update error handling
      throw new Error(`Unknown ${label}: ${opts}`);
    }

    const args: string[] = [];
    for (const alias of split.aliases) {
      // get arg from alias map and use first arg if any
      const aliasArgs = this.getAliasArgs(alias);
      if (aliasArgs.length > 0) {
        args.push(aliasArgs[0]);
      }
    }
    return args;
  }

  push(arg: string): this {
    this.args.push(arg);
    return this;
  }

  save(node: Node): void {
    this.nodes.push(node);
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

  validate(options: { argsLength?: number; throwError?: boolean } = {}): {
    min: boolean;
    max: boolean;
  } {
    const { argsLength = this.args.length, throwError = true } = options;
    const { min, max } = range(this.options);
    const satisfies = {
      min: min === null || argsLength >= min,
      max: max === null || argsLength <= max
    };
    if (throwError && !(satisfies.min && satisfies.max)) {
      const what: string[] = [];
      !satisfies.min && what.push('min');
      !satisfies.max && what.push('max');
      // TODO: update error handling
      throw new Error(
        `Option '${this.id}' does not satisfy: ${what.join(' ')}`
      );
    }
    return satisfies;
  }
}
