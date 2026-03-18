import { ParseError } from '../lib/error';
import { Config } from '../types/config.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { array } from '../utils/array';

export interface Context<T> {
  cfg: Config<T>;
  node: Node<T>;
  min: number | null;
  max: number | null;
  read: boolean;
  strict: boolean | undefined;
}

export function getArgs<T>(
  opts: Options<T>,
  args?: string[],
  val?: string | null
): string[] {
  const a = array(opts.args, true);
  args && a.push(...args);
  val != null && a.push(val);
  return a;
}

/** Checks whether the config is assignable. */
export function assign<T>(cfg: Config<T>): boolean {
  return cfg.options.assign ?? cfg.type === 'option';
}

export function ok<T>(ctx: Context<T>): void {
  ctx.cfg.options.onData?.(ctx.node);
}

/**
 * Checks if {@linkcode Node.args} has reached the
 * {@linkcode Context.max} length.
 */
export function full<T>(ctx: Context<T>): boolean {
  return ctx.max != null && ctx.max <= ctx.node.args.length;
}

export function display<T>(node: Node<T>): string | false {
  return (
    node.name != null &&
    `${node.type === 'option' ? 'Option' : 'Command'} '${node.name}' `
  );
}

/** Creates an unrecognized error to throw later before validation. */
export function uErr<T>(
  ctx: Context<T>,
  raw: string,
  code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR
): ParseError<T> {
  // always use parent node for unrecognized arguments
  const name = display(ctx.node);
  // prettier-ignore
  return new ParseError(code, `${name ? name + 'does not recognize the' : 'Unrecognized'} argument: ${raw}`, ctx.node, ctx.cfg.options);
}
