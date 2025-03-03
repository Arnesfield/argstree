import { Options } from '../core/core.types.js';
import { Spec as SpecClass } from './spec.class.js';
import { Spec } from './spec.types.js';

export function spec(options?: Options): Spec {
  return new SpecClass(options);
}
