import { NodeData } from '../core/core.types.js';
import { ParseError } from '../core/error.js';

export function error(data: NodeData, reason: string, message: string): never {
  throw new ParseError({ ...data, reason, message });
}
