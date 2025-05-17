import { ParseError } from '../lib/error';
import { Schema } from '../schema/schema.types';
import { Arg } from '../types/arg.types';
import { Node as INode } from '../types/node.types';
import { Context, Options } from '../types/options.types';
import { Mutable } from '../types/util.types';
import { display } from '../utils/display';
import { range } from '../utils/range';
import { NodeOptions } from './cnode';
import { NormalizedOptions } from './normalize';
import { resolveArgs } from './resolver';

// NOTE: internal

export interface HandlerResult<T> {
  args: string[];
  opts: NodeOptions<T>[];
}

// same as INode but cannot be a value type
export interface NodeData<T>
  extends Omit<INode<T>, 'type'>,
    Pick<Schema<T>, 'type'> {}

export type NodeEvent<T> = keyof {
  [K in keyof Options<T> as K extends `on${string}` ? K : never]: Options<T>[K];
};

// NOTE: node instances will only have data types 'option' and 'command'
// directly save value nodes into data.children instead
export class Node<T> {
  readonly children: Node<T>[] = [];
  readonly ctx: Mutable<Context<T>>;
  readonly strict: boolean | undefined;
  /** The strict mode value for descendants. */
  private readonly dstrict: boolean | undefined;

  constructor(
    schema: Schema<T>,
    readonly opts: NormalizedOptions<T>,
    readonly data: NodeData<T>,
    parent?: Node<T>
  ) {
    // prettier-ignore
    const { min, max, read, src: { strict } } = opts;

    // set context for callbacks
    this.ctx = { min, max, read, node: data, schema };

    // if options.strict is not set, follow ancestor strict mode
    // otherwise, follow options.strict and also update this.dstrict
    // for descendant nodes
    this.strict =
      strict == null
        ? (this.dstrict = parent?.dstrict)
        : typeof strict === 'boolean'
          ? (this.dstrict = strict)
          : !(this.dstrict = strict !== 'self');

    this.cb('onCreate');
  }

  /** Run variable callback. */
  cb(e: NodeEvent<T>): void {
    // NOTE: consumer can directly modify the context object and skip validation
    // should we prevent this? nope. probably not worth creating a shallow copy
    // of the context object for this edge case

    const c = this.ctx;
    const { src } = this.opts;

    // preserve `this` for callbacks
    const opts = src[e]?.(c);
    if (!opts) return;

    const { min = c.min, max = c.max } = opts;
    if (opts.read != null) c.read = opts.read;

    [c.min, c.max] = range(min, max, this.data, src);
  }

  // NOTE: return empty arrays to ignore values
  // return falsy to fallback to default behavior
  handle(arg: Arg): HandlerResult<T> | undefined {
    // preserve `this` for callbacks
    let schemas = this.opts.src.handler?.(arg, this.ctx);
    // fallback to default behavior for null, undefined, true
    if (schemas == null || schemas === true) return;

    const result: HandlerResult<T> = { args: [], opts: [] };
    // ignore when false by returning empty result
    if (schemas === false) return result;

    schemas = Array.isArray(schemas) ? schemas : [schemas];
    // fallback to default behavior for empty arrays
    if (schemas.length === 0) return;

    for (const schema of schemas) {
      if (typeof schema === 'string') {
        result.args.push(schema);
      } else {
        // use arg.key as key here despite not using arg.value
        // assume that the consumer handles arg.value manually
        result.opts.push({ key: arg.key, args: resolveArgs(schema), schema });
      }
    }

    return result;
  }

  // save arg to the last value child node
  value(arg: string): void {
    let node: INode<T>;
    const p = this.data;
    const c = p.children;

    if (c.length > 0 && (node = c[c.length - 1]).type === 'value') {
      node.args.push(arg);
    } else {
      // value node is almost the same as its parent but with different props

      // keep value property since it acts as an identifier (key-value pair)
      // prettier-ignore
      node = { ...p, type: 'value', depth: p.depth + 1, args: [arg], parent: p, children: [] };

      // remove meta since from the consumer's point of view,
      // the meta property was only ever set to the main node
      delete node.meta;

      c.push(node);
    }
  }

  /** Depth parsed. */
  done(): void {
    this.cb('onData');
    for (const node of this.children) node.cb('onDepth');
  }

  check(): void {
    const { min, max } = this.ctx;

    // validate node
    const len = this.data.args.length;
    const msg: [string | number, number] | null =
      min != null && max != null && (len < min || len > max)
        ? min === max
          ? [min, min]
          : [`${min}-${max}`, 0]
        : min != null && len < min
          ? [`at least ${min}`, min]
          : max != null && len > max
            ? [max && `up to ${max}`, max]
            : null;

    if (msg) {
      const err = `xpected ${msg[0]} argument${msg[1] === 1 ? '' : 's'}, but got ${len}.`;
      this.error('e', 'E', err, ParseError.RANGE_ERROR);
    }

    this.cb('onValidate');
  }

  error(
    prefix1: string,
    prefix2: string,
    msg: string,
    code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR
  ): never {
    const name = display(this.data);
    msg = (name ? name + prefix1 : prefix2) + msg;
    throw new ParseError(code, msg, this.data, this.opts.src);
  }
}
