import { Aliases, Node, Options, ParseOptions } from '../core/core.types.js';

export interface Spec {
  options(): ParseOptions;
  arg(arg: string, options?: Options): this;
  arg(arg: string, setup?: () => Options): this;
  arg(arg: string, setup?: () => Spec): this;
  alias(aliases: Aliases): this;
  parse(args: readonly string[]): Node;
}
