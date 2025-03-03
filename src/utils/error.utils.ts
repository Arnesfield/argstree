import { NodeData } from '../core/core.types.js';
import { ParseError } from '../core/error.js';

export function error(reason: string, message: string, data?: NodeData): never {
  throw new ParseError(reason, message, data);
}
