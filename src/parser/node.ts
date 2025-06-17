import { ParseError } from '../lib/error';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { Config } from '../types/schema.types';
import { array } from '../utils/array';

export interface Context<T> {
  cfg: Config<T>;
  node: Node<T>;
  min: number | null;
  max: number | null;
  read: boolean;
  strict: boolean | undefined;
}

export function display<T>(node: Node<T>): string | false {
  return (
    node.name != null &&
    `${node.type === 'option' ? 'Option' : 'Command'} '${node.name}' `
  );
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

/** Checks whether the config is a leaf node. */
export function leaf<T>(cfg: Config<T>): boolean {
  let o: Options<T> | string = cfg.options;
  if (o.leaf != null) return o.leaf;
  if (o.parser) return false;
  // WARNING:
  // side effect: this would initialize the schema if options aren't satisfied
  // and might be unsafe if consumer decides to implement their own schema object
  for (o in cfg.map) return false;
  return cfg.type === 'option';
}

/** Checks whether the config is assignable. */
export function assign<T>(cfg: Config<T>): boolean {
  return cfg.options.assign ?? cfg.type === 'option';
}

export function ok<T>(ctx: Context<T>): void {
  ctx.cfg.options.onData?.(ctx.node);
}

/** Checks if {@linkcode Node.args} has reached the {@linkcode Context.max} length. */
export function full<T>(ctx: Context<T>): boolean {
  return ctx.max != null && ctx.max <= ctx.node.args.length;
}

export function done<T>(ctx: Context<T>): void {
  // validate node
  const { min, max, node, cfg } = ctx;
  const len = node.args.length;
  const m: [string | number, number] | null =
    min != null && max != null && (len < min || len > max)
      ? min === max
        ? [min, min]
        : [`${min}-${max}`, 0]
      : min != null && len < min
        ? [`at least ${min}`, min]
        : max != null && len > max
          ? [max && `up to ${max}`, max]
          : null;

  if (m) {
    const name = display(node);
    const msg = `${name ? name + 'e' : 'E'}xpected ${m[0]} argument${m[1] === 1 ? '' : 's'}, but got ${len}.`;
    throw new ParseError(ParseError.RANGE_ERROR, msg, node, cfg.options);
  }

  // run onValidate if no errors
  cfg.options.onValidate?.(node);
}
