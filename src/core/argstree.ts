import { Node } from '../lib/node.js';
import { Parser } from '../lib/parser.js';
import { Node as INode, Options } from './core.types.js';

/**
 * Parse arguments into a tree structure.
 * @param args The arguments to parse.
 * @param options The options object.
 * @returns A {@linkcode INode Node} object.
 */
export function argstree(
  args: readonly string[],
  options: Options = {}
): INode {
  return new Parser(new Node(null, options)).parse(args).build();
}
