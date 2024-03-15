import { Node } from '../lib/node';
import { Parser } from '../lib/parser';
import { Node as INode, Options } from './core.types';

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
