import { SchemaOptions } from '../types/options.types';
import { Schema as SchemaClass } from './schema.class';
import { Schema } from './schema.types';

/**
 * Creates an option schema.
 * @param options The schema options.
 * @returns The schema object.
 */
export function option<T>(options: SchemaOptions<T> = {}): Schema<T> {
  return new SchemaClass({ type: 'option', options });
}

/**
 * Creates a command schema.
 * @param options The schema options.
 * @returns The schema object.
 */
export function command<T>(options: SchemaOptions<T> = {}): Schema<T> {
  return new SchemaClass({ type: 'command', options });
}
