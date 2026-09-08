import { Config, ConfigMap, InitializedConfig } from '../types/config.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { ResolvedItem } from '../types/spec.types';

// NOTE: internal

// TODO: rename?
export interface NodeContext<T> {
  cfg: Config<T>;
  node: Node<T>;
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
    o.assign ?? (o.type ? o.type === 'option' : !cfg.mapv && !cfg.fallback)
  );
}

export function ok<T>(c: NodeContext<T>): void {
  c.cfg.options.onData?.(c.node);
}

/**
 * Checks if {@linkcode Node.args} has reached the {@linkcode Node.max} length.
 */
export function full<T>(node: Node<T>): boolean {
  return node.max != null && node.max <= node.args.length;
}

export function display<T>(node: Node<T>): string | false {
  return (
    node.name != null &&
    `${node.type === 'option' ? 'Option' : 'Command'} '${node.name}' `
  );
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
