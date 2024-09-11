import { Alias, Options, Type } from './core.types.js';

export interface Aliases {
  [alias: string]: Alias;
}

export interface Spec {
  /**
   * The raw argument to parse. This is the `arg` value
   * from the {@linkcode option} or {@linkcode command} call.
   */
  readonly id: string | null;
  /** Type of spec. */
  readonly type: Type;
  /** Depth of spec. */
  readonly depth: number;
  /**
   * Add an option.
   * @param arg The option or command to match.
   * @param options The options.
   * @returns `this` for chaining.
   */
  option(arg: string, options?: Options): this;
  /**
   * Add a command.
   * @param arg The option or command to match.
   * @param options The options.
   * @returns `this` for chaining.
   */
  command(arg: string, options?: Options): this;
  /**
   * List of aliases mapped to {@linkcode Options.args}.
   * @param aliases The alias options.
   * @returns `this` for chaining.
   */
  aliases(aliases: Aliases): this;
  /**
   * Parse arguments into a tree structure.
   *
   * This is an alias for {@linkcode argstree} call:
   * ```javascript
   * argstree(args, spec.options());
   * ```
   * @param args The arguments to parse.
   * @returns The node object.
   */
  // TODO: return
  parse(args: readonly string[]): any;
  /**
   * Get the parent spec object. If `null`, then this is the root spec.
   * @returns The parent spec object.
   */
  parent(): Spec | null;
  /**
   * Get the children spec objects.
   * @returns The children spec objects.
   */
  children(): Spec[];
  /**
   * Get the ancestor spec objects starting from the root spec to the parent spec.
   * @returns The descendant spec objects.
   */
  ancestors(): Spec[];
  /**
   * Get the descendant spec objects.
   * @returns The descendant spec objects.
   */
  descendants(): Spec[];
}
