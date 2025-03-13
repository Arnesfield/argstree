import { SchemaOptions } from '../types/options.types.js';
import { Schema as SchemaClass } from './schema.class.js';
import { Schema } from './schema.types.js';

/**
 * Create an option schema.
 * @param options The schema options.
 * @returns The schema object.
 */
export function option(options: SchemaOptions = {}): Schema {
  return new SchemaClass({ type: 'option', options });
}

/**
 * Create a command schema.
 * @param options The schema options.
 * @returns The schema object.
 */
export function command(options: SchemaOptions = {}): Schema {
  return new SchemaClass({ type: 'command', options });
}
