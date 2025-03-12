import { ParseOptions } from '../core/core.types.js';
import { Schema as SchemaClass } from './schema.class.js';
import { Schema } from './schema.types.js';

export function option(options: ParseOptions = {}): Schema {
  return new SchemaClass({ type: 'option', options });
}

export function command(options: ParseOptions = {}): Schema {
  return new SchemaClass({ type: 'command', options });
}
