import { Validate } from '../helpers/validate';
import { Node as INode, Options } from '../types/core.types';
import { Node } from './node';
import { Parser } from './parser';

export function argstree(args: string[], options: Options = {}): INode {
  const node = new Node(null, options);
  const validate = new Validate();
  validate.options(node);
  return new Parser(node, validate).parse(args).build();
}
