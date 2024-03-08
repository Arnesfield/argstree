import { ArgsTreeOptions, Tree } from '../types/core.types';
import { Node } from './node';
import { Parser } from './parser';

export function argstree(args: string[], options: ArgsTreeOptions = {}): Tree {
  return new Parser(args).parse(new Node(null, options)).toJSON();
}
