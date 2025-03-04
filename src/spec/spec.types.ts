import { Aliases, Node, Options, ParseOptions } from '../core/core.types.js';

export interface Spec {
  options(): ParseOptions;
  alias(aliases: Aliases): this;
  arg(arg: string, options?: Options): this;
  arg(arg: string, setup?: () => Options): this;
  arg(arg: string, setup?: () => Spec): this;
  parse(args: readonly string[]): Node;
}
