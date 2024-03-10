import { Node } from '../types/core.types';

export interface StreengifyOptions {
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

export function streengify(
  node: Node,
  options: StreengifyOptions = {}
): string {
  // set default show values
  const show = { ...options.show };
  show.args ??= true;
  const logs: string[] = [];
  // TODO: update implementation
  // save logged nodes to avoid circular logging
  const loggedList = new Set<Node>();
  const states = { normal: 0, first: 1, last: 2 };

  // NOTE: taken from:
  // - https://github.com/megahertz/howfat
  // - https://github.com/megahertz/howfat/blob/master/src/reporters/Tree.js
  function log(label: string, hasNext: boolean, prefix: string, state: number) {
    const nameChar = hasNext ? '┬' : '─';
    let selfPrefix =
      prefix + (state === states.last ? '└─' : '├─') + nameChar + ' ';
    let childPrefix = prefix + (state === states.last ? '  ' : '│ ');

    if (state === states.first) {
      selfPrefix = '';
      childPrefix = '';
    }

    logs.push(selfPrefix + label);
    return childPrefix;
  }

  function draw(node: Node, prefix: string, state: number) {
    // get direct children for this log
    // 1 - list of children
    // 2 - the args label
    // 3 - the ancestors label
    // 4 - the descendants label
    const directNextLength =
      node.children.length +
      +!!(show.args && node.args.length > 0) +
      +!!(show.ancestors && node.ancestors.length > 0) +
      +!!(show.descendants && node.descendants.length > 0);

    const labels = [`depth: ${node.depth}`];
    node.class != null && labels.push(`class: ${node.class}`);
    const logged = loggedList.has(node);
    const childPrefix = log(
      (node.name ?? node.id) + ` (${labels.join(', ')})`,
      !logged && directNextLength > 0,
      prefix,
      state
    );

    // avoid circular logging!
    if (logged) {
      return;
    }

    function getState(index: number, length: number) {
      return index >= length - 1 ? states.last : states.normal;
    }

    loggedList.add(node);
    let index = -1;
    for (const child of node.children) {
      draw(child, childPrefix, getState(++index, directNextLength));
    }

    for (const type of ['args', 'ancestors', 'descendants'] as const) {
      if (!show[type] || node[type].length === 0) {
        continue;
      }
      log(
        `${type} (total: ${node[type].length})`,
        true,
        childPrefix,
        getState(++index, directNextLength)
      );
      node[type].forEach((value, valueIndex, array) => {
        const end = index >= directNextLength - 1 ? '  ' : '│ ';
        const prefix = childPrefix + end;
        const state = getState(valueIndex, array.length);
        if (type === 'args') {
          // no sub nodes for args
          log(value as string, false, prefix, state);
        } else {
          draw(value as Node, prefix, state);
        }
      });
    }
  }

  draw(node, '', states.first);
  return logs.join('\n');
}
