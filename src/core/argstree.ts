import { Validate } from '../helpers/validate';
import { Parser } from '../parser/parser';
import { Node as INode, Options } from '../types/core.types';
import { Node } from './node';

export function argstree(
  args: readonly string[],
  options: Options = {}
): INode {
  return new Parser(new Node(null, options), new Validate())
    .parse(args)
    .build();
}
