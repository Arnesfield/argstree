import { ArgsTreeOptions, Node as INode } from '../types/core.types';
import { Node } from './node';
import { Parser } from './parser';

export function argstree(args: string[], options: ArgsTreeOptions = {}): INode {
  return new Parser(args).parse(new Node(null, options)).build();
}
