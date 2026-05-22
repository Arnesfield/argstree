import { ParseError } from '../lib/error';
import { Config, ConfigMap, InitializedConfig } from '../types/config.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { ResolvedItem, SpecType } from '../types/spec.types';
import { array } from '../utils/array';
import { hasValues } from '../utils/has-values';

export interface Context<T> {
  cfg: Config<T>;
  node: Node<T>;
  min: number | null;
  max: number | null;
  read: boolean;
  strict: boolean;
}

export function init<T>(
  cfg: ConfigMap<T>[string]
): InitializedConfig<T> | null | undefined {
  // remove `this` from function call
  const ref = cfg?.ref;
  if (typeof ref === 'function') cfg!.ref = ref()?.cfg || null;
  return cfg as InitializedConfig<T> | null | undefined;
}

export function getCfg<T>(
  cfg: InitializedConfig<T>
): Config<T> | null | undefined {
  return cfg.ref !== undefined ? cfg.ref : cfg;
}

export function getType<T>(cfg: Config<T>): SpecType {
  return cfg.options.type || (hasValues(cfg.map) ? 'command' : 'option');
}

export function getArgs<T>(opts: Options<T>, val?: string | null): string[] {
  const a = array(opts.args, true);
  val != null && a.push(val);
  return a;
}

/** Checks whether the config is assignable. */
export function assign<T>(cfg: Config<T>): boolean {
  return (
    cfg.options.assign ??
    (cfg.options.type ? cfg.options.type === 'option' : !hasValues(cfg.map))
  );
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
export function uErr<T>(ctx: Context<T>, raw: string): ParseError<T> {
  // always use parent node for unrecognized arguments
  const name = display(ctx.node);
  // prettier-ignore
  return new ParseError(ParseError.UNRECOGNIZED_ERROR, `${name ? name + 'does not recognize the' : 'Unrecognized'} argument: ${raw}`, ctx.node);
}

export function item<T>(
  cid: string | undefined,
  key: string,
  cfg: Config<T>,
  value?: string
): ResolvedItem<T> {
  const o = cfg.options,
    { id = cid ?? key, name = cid ?? key } = o;

  // prettier-ignore
  return { key, type: getType(cfg), options: { ...o, id, name, args: getArgs(o, value) } };
}
