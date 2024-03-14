import { Node } from '../lib/node';
import { Parser } from '../lib/parser';
import { ArgsMap, Node as INode, Options } from './core.types';

/**
 * Parse arguments into a tree structure.
 * @param args The arguments to parse.
 * @param options The options object.
 * @returns A {@linkcode INode Node} object.
 */
export function argstree<T extends ArgsMap>(
  args: readonly string[],
  options: Options<T> = {}
): INode {
  return new Parser(new Node(null, options as unknown as Options<ArgsMap>))
    .parse(args)
    .build();
}
