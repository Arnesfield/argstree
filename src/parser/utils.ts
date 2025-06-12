import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { ArgConfig } from '../types/schema.types';
import { array } from '../utils/array';

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

export function isLeaf<T>(cfg: ArgConfig<T>): boolean {
  let o: Options<T> | string = cfg.options;
  if (o.leaf != null) return o.leaf;
  if (o.parser) return false;
  // WARNING:
  // side effect: this would initialize the schema if options aren't satisfied
  // and might be unsafe if consumer decides to implement their own schema object
  for (o in cfg.map) return false;
  return cfg.type === 'option';
}

export function canAssign<T>(
  cfg: ArgConfig<T>,
  value: string | null | undefined
): boolean {
  return value == null || (cfg.options.assign ?? cfg.type === 'option');
}
