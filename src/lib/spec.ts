import { Spec as SpecClass } from '../parser/spec.class';
import { Options } from '../types/options.types';
import { Spec } from '../types/spec.types';

/**
 * Creates a spec object.
 * @param options The spec options.
 * @returns The spec object.
 */
export function spec<T>(options: Options<T> = {}): Spec<T> {
  return new SpecClass({ options });
}
