import { Options } from '../core/core.types.js';

// NOTE: internal. evaluate from public types (not the other way around)

export type Alias = Required<Options>['alias'];
export type Args = Required<Options>['args'];
export type ArgsFunction = Exclude<
  Args,
  { [arg: string]: Options | null | undefined }
>;
export type ArgsObject = Exclude<Args, ArgsFunction>;
