import { Aliases, Node, Options, ParseOptions } from '../core/core.types.js';

export type SpecOptions = Omit<Options, 'type'>;

export interface Spec {
  options(): ParseOptions;
  add(arg: string, options?: SpecOptions): this;
  alias(aliases: Aliases): this;
  parse(args: readonly string[]): Node;
}
