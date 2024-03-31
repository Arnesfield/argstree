import * as PREFIX from '../utils/prefix.js';
import { PrefixOptions } from '../utils/prefix.js';
import { Node } from './core.types.js';

/** The stringify options. */
export interface StringifyOptions {
  /**
   * Include node arguments.
   * @default true
   */
  args?: boolean;
  /** Include node ancestors. */
  ancestors?: boolean;
  /** Include node descendants. */
  descendants?: boolean;
}

/**
 * Create a tree structure string from the provided node object.
 * @param node The node object.
 * @param options The stringify options.
 * @returns The tree string.
 */
export function stringify(node: Node, options: StringifyOptions = {}): string {
  // set default show values
  options = { ...options };
  options.args ??= true;
  const lines: string[] = [];
  const indicator = ':';

  function draw(opts: PrefixOptions & { node: Node; childNodes?: boolean }) {
    const { node, childNodes, ...prefix } = opts;

    // 1 - the args label
    // 2 - list of children
    // 3 - the ancestors label
    // 4 - the descendants label
    const child = {
      index: -1,
      prefix: PREFIX.child(prefix),
      length: childNodes
        ? +!!(options.args && node.args.length > 0) +
          node.children.length +
          +!!(options.ancestors && node.ancestors.length > 0) +
          +!!(options.descendants && node.descendants.length > 0)
        : 0
    };

    prefix.next = child.length > 0;
    const id = node.id ?? node.raw;
    const labels = [`depth: ${node.depth}`];
    // only show if not the same as the displayed id
    if (node.raw != null && node.raw !== id) {
      labels.push(`raw: ${node.raw}`);
    }
    if (node.alias != null) {
      labels.push(`alias: ${node.alias}`);
    }
    if (node.name != null && node.name !== id) {
      labels.push(`name: ${node.name}`);
    }
    lines.push(PREFIX.self(prefix) + id + ` (${labels.join(', ')})`);

    if (!prefix.next) {
      return;
    }

    // draw args
    if (options.args && node.args.length > 0) {
      // increment once only
      const last = ++child.index >= child.length - 1;
      const self = PREFIX.self({ last, next: true, prefix: child.prefix });
      lines.push(self + indicator + `args (total: ${node.args.length})`);

      const prefix = PREFIX.child({ last, prefix: child.prefix });
      // no sub nodes for args
      node.args.forEach((arg, index, array) => {
        const self = PREFIX.self({ prefix, last: index >= array.length - 1 });
        lines.push(self + arg);
      });
    }

    // draw children
    for (const childNode of node.children) {
      // child.length already accounts for node.children.length
      draw({
        node: childNode,
        childNodes: true,
        prefix: child.prefix,
        last: ++child.index >= child.length - 1
      });
    }

    // draw ancestors and descendants
    for (const type of ['ancestors', 'descendants'] as const) {
      if (!options[type] || node[type].length === 0) {
        continue;
      }
      // increment once per type
      const last = ++child.index >= child.length - 1;
      const self = PREFIX.self({ last, next: true, prefix: child.prefix });
      lines.push(self + indicator + type + ` (total: ${node[type].length})`);

      node[type].forEach((node, index, array) => {
        const prefix = PREFIX.child({ last, prefix: child.prefix });
        draw({ node, prefix, last: index >= array.length - 1 });
      });
    }
  }

  draw({ node, first: true, childNodes: true });
  return lines.join('\n');
}
