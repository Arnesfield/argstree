import { Node, Options, ParseOptions } from '../core/core.types.js';

export interface Spec {
  option(arg: string, options?: Omit<Options, 'type'>): this;
  command(arg: string, options?: Omit<Options, 'type'>): this;
  options(): ParseOptions;
  parse(args: readonly string[]): Node;
}
