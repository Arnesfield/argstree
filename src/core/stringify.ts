import { Node } from '../types/core.types';
import * as PREFIX from '../utils/prefix';
import { PrefixOptions } from '../utils/prefix';

export interface StringifyOptions {
  show?: {
    /**
     * @default true
     */
    args?: boolean;
    /**
     * @default false
     */
    ancestors?: boolean;
    /**
     * @default false
     */
    descendants?: boolean;
  };
}

export function stringify(node: Node, options: StringifyOptions = {}): string {
  // set default show values
  const show = { ...options.show };
  show.args ??= true;
  const lines: string[] = [];
  const indicator = ':';

  function draw(options: PrefixOptions & { node: Node; childNodes?: boolean }) {
    const { node, childNodes, ...prefix } = options;

    // 1 - the args label
    // 2 - list of children
    // 3 - the ancestors label
    // 4 - the descendants label
    const child = {
      index: -1,
      prefix: PREFIX.child(prefix),
      length: childNodes
        ? +!!(show.args && node.args.length > 0) +
          node.children.length +
          +!!(show.ancestors && node.ancestors.length > 0) +
          +!!(show.descendants && node.descendants.length > 0)
        : 0
    };

    prefix.next = child.length > 0;
    const labels = [`depth: ${node.depth}`];
    node.class != null && labels.push(`class: ${node.class}`);
    lines.push(
      PREFIX.self(prefix) + (node.name ?? node.id) + ` (${labels.join(', ')})`
    );

    if (!prefix.next) {
      return;
    }

    // draw args
    if (show.args && node.args.length > 0) {
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
      if (!show[type] || node[type].length === 0) {
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
