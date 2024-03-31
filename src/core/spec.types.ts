// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { argstree } from './argstree.js';
import { Node, NodeData, Options } from './core.types.js';

/** The spec options. */
export interface SpecOptions extends Omit<Options, 'alias' | 'args'> {}

/** The spec object. */
export interface Spec {
  /**
   * The raw argument to parse. This is the `arg` value
   * from the {@linkcode option} or {@linkcode command} call.
   */
  readonly id: string | null;
  /** Depth of spec. */
  readonly depth: number;
  /**
   * Add an option or command.
   * @param arg The option or command to match.
   * @param options The spec options.
   * @returns `this` for chaining.
   */
  option(arg: string, options?: SpecOptions): this;
  /**
   * Add an option or command.
   *
   * This is an alias for {@linkcode option} with {@linkcode args} setup:
   * ```javascript
   * spec.option(arg, options).spec(spec => spec.args());
   * ```
   * @param arg The option or command to match.
   * @param options The spec options.
   * @returns `this` for chaining.
   */
  command(arg: string, options?: SpecOptions): this;
  /**
   * Add an alias for the current option or command.
   *
   * Requires a call to {@linkcode option} or {@linkcode command} beforehand
   * to create the option or command. Otherwise, an error is thrown.
   * @param alias The alias or list of aliases for the current option or command.
   * @param args The alias arguments.
   * @returns `this` for chaining.
   */
  alias(alias: string | string[], args?: string | string[]): this;
  /**
   * Setup the options for the current option or command.
   *
   * Requires a call to {@linkcode option} or {@linkcode command} beforehand
   * to create the option or command. Otherwise, an error is thrown.
   * @param setup The setup callback with a new {@linkcode Spec} object.
   * @returns `this` for chaining.
   */
  spec(setup: (spec: Spec) => void): this;
  /**
   * List of aliases mapped to {@linkcode Options.args}.
   * @param alias The alias options.
   * @returns `this` for chaining.
   */
  aliases(alias: Required<Options>['alias']): this;
  /**
   * Add an empty object to {@linkcode Options.args}.
   * @returns `this` for chaining.
   */
  args(): this;
  /**
   * Add an {@linkcode Options.args} function.
   * Additional calls will replace the existing {@linkcode handler}.
   * @param handler The `args` function.
   * @param data The node data.
   * @returns `this` for chaining.
   */
  args(
    handler: (arg: string, data: NodeData) => Options | null | undefined
  ): this;
  /**
   * Get the parse options for this spec.
   * @returns The parse options.
   */
  options(): Options;
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
  parse(args: readonly string[]): Node;
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
