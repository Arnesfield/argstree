import { Options } from '../types/options.types';
import { Schema } from '../types/schema.types';
import { Schema as SchemaClass } from './schema.class';

/**
 * Creates an option schema.
 * @template T The metadata type.
 * @param options The schema options.
 * @returns The schema object.
 */
export function option<T>(options?: Options<T>): Schema<T> {
  return new SchemaClass('option', options);
}

/**
 * Creates a command schema.
 * @template T The metadata type.
 * @param options The schema options.
 * @returns The schema object.
 */
export function command<T>(options?: Options<T>): Schema<T> {
  return new SchemaClass('command', options);
}
