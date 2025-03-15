import { NodeData } from '../types/node.types.js';
import { getRange } from '../utils/get-range.js';
import { validateNode } from '../utils/validate-node.js';

export function validate(data: NodeData): void | never {
  validateNode(data, getRange(data.options));
}
