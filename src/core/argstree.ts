import { Node as INode, Options } from '../types/core.types';
import { Node } from './node';
import { Parser } from './parser';

export function argstree(args: string[], options: Options = {}): INode {
  return new Parser(args).parse(new Node(null, options)).build();
}
