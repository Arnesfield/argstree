import { ParseError } from '../lib/error';
import { Config, ConfigMap, InitializedConfig } from '../types/config.types';
import { Node } from '../types/node.types';
import { Context, Options } from '../types/options.types';
import { ResolvedItem } from '../types/spec.types';

// NOTE: internal

export interface NodeContext<T> {
  cfg: Config<T>;
  ctx: Context<T>;
}

export function init<T>(
  cfg: ConfigMap<T>[string]
): InitializedConfig<T> | null | undefined {
  // remove `this` from function call
  const i = cfg?.init;
  if (i && cfg.ref === undefined) cfg.ref = i()?.cfg || null;

  return cfg as InitializedConfig<T> | null | undefined;
}

export function getCfg<T>(
  cfg: InitializedConfig<T>
): Config<T> | null | undefined {
  return cfg.ref !== undefined ? cfg.ref : cfg;
}

export function getArgs<T>(
  a: Options<T>['args'],
  val?: string | null
): string[] {
  a = Array.isArray(a) ? a.slice() : a != null ? [a] : [];
  val != null && a.push(val);
  return a;
}

/** Checks whether the config is assignable. */
export function assign<T>(cfg: Config<T>): boolean {
  const o = cfg.options;
  return (
    o.assignable ?? (o.type ? o.type === 'option' : !cfg.mapv && !cfg.fallback)
  );
}

export function ok<T>(c: NodeContext<T>): void {
  c.cfg.options.onData?.(c.ctx);
}

/**
 * Checks if {@linkcode Node.args} has reached the
 * {@linkcode Context.max} length.
 */
export function full<T>(c: NodeContext<T>): boolean {
  return c.ctx.max != null && c.ctx.max <= c.ctx.node.args.length;
}

export function display<T>(node: Node<T>): string | false {
  return (
    node.name != null &&
    `${node.type === 'option' ? 'Option' : 'Command'} '${node.name}' `
  );
}

/** Creates an unrecognized error to throw later before validation. */
export function uErr<T>(c: NodeContext<T>, raw: string): ParseError<T> {
  // always use parent node for unrecognized arguments
  const name = display(c.ctx.node);
  // prettier-ignore
  return new ParseError(ParseError.UNRECOGNIZED_ERROR, `${name ? name + 'does not recognize the' : 'Unrecognized'} argument: ${raw}`, c.ctx);
}

export function item<T>(
  key: string,
  ic: InitializedConfig<T>,
  cfg: Config<T>,
  value: string | null = null
): ResolvedItem<T> {
  const o = cfg.options,
    k = ic.id ?? key,
    { id = k, name = k } = o;

  // prettier-ignore
  return { key, value, options: { ...o, id, name, args: getArgs(o.args, value) }, spec: ic.init };
}
