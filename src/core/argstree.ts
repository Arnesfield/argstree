import { Validate } from '../helpers/validate';
import { Node } from '../node/node';
import { Parser } from '../parser/parser';
import { Node as INode, Options } from '../types/core.types';

export function argstree(
  args: readonly string[],
  options: Options = {}
): INode {
  return new Parser(new Node(null, options), new Validate())
    .parse(args)
    .build();
}
