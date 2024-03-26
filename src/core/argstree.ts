import { Node as Tree } from '../lib/node.js';
import { Parser } from '../lib/parser.js';
import { Node, Options } from './core.types.js';

/**
 * Parse arguments into a tree structure.
 * @param args The arguments to parse.
 * @param options The options object.
 * @returns The {@linkcode Node} object.
 */
export function argstree(args: readonly string[], options: Options = {}): Node {
  return new Parser(new Tree(null, options)).parse(args).build();
}
