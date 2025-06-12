import { Node } from '../types/node.types';
import { Context, Options } from '../types/options.types';
import { Schema } from '../types/schema.types';
import { array } from '../utils/array';

export function display<T>(node: Node<T>): string | false {
  return (
    node.name != null &&
    `${node.type === 'option' ? 'Option' : 'Command'} '${node.name}' `
  );
}

export function getArgs<T>(
  schema: Schema<T>, // only to get options.args
  args?: string[],
  value?: string | null
): string[] {
  const a = array(schema.options.args, true);
  args && a.push(...args);
  value != null && a.push(value);
  return a;
}

export function isLeaf<T>(schema: Schema<T>): boolean {
  let o: Options<T> | string = schema.options;
  if (o.leaf != null) return o.leaf;
  if (o.parser) return false;
  // WARNING:
  // side effect: this would initialize the schema if options aren't satisfied
  // and might be unsafe if consumer decides to implement their own schema object
  for (o in schema.schemas()) return false;
  return schema.type === 'option';
}

export function canAssign<T>(
  schema: Schema<T>,
  value: string | null | undefined
): boolean {
  return value == null || (schema.options.assign ?? schema.type === 'option');
}

export function noRead<T>(ctx: Context<T>): boolean {
  return !ctx.read || (ctx.max != null && ctx.max <= ctx.node.args.length);
}
