import { Options } from '../core/core.types.js';

export class SpecError extends Error {
  constructor(
    readonly id: string | null,
    readonly options: Options | undefined,
    message: string
  ) {
    super(message);
  }
}
