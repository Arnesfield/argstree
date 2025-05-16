import { ParseError } from '../lib/error';
import { Config, Schema } from '../schema/schema.types';
import { Arg } from '../types/arg.types';
import { Node as INode } from '../types/node.types';
import { Context, Options, VariableOptions } from '../types/options.types';
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
    Pick<Config<T>, 'type'> {}

export type NodeEvent<T> = keyof {
  [K in keyof Options<T> as K extends `on${string}` ? K : never]: Options<T>[K];
};

// NOTE: node instances will only have data types 'option' and 'command'
// directly save value nodes into data.children instead
export class Node<T> {
  readonly children: Node<T>[] = [];
  readonly strict: boolean | undefined;
  /** Variable options for this node. */
  readonly vo: VariableOptions;
  /** The strict mode value for descendants. */
  private readonly dstrict: boolean | undefined;

  constructor(
    readonly schema: Schema<T>,
    readonly opts: NormalizedOptions<T>,
    readonly data: NodeData<T>,
    parent?: Node<T>
  ) {
    // if options.strict is not set, follow ancestor strict mode
    // otherwise, follow options.strict and also update this.dstrict
    // for descendant nodes
    this.strict =
      opts.src.strict == null
        ? (this.dstrict = parent?.dstrict)
        : typeof opts.src.strict === 'boolean'
          ? (this.dstrict = opts.src.strict)
          : !(this.dstrict = opts.src.strict !== 'self');

    this.vo = { min: opts.min, max: opts.max, read: opts.read };

    this.cb('onCreate');
  }

  ctx(): Context<T> {
    return { ...this.vo, node: this.data, schema: this.schema };
  }

  /** Run variable callback. */
  cb(e: NodeEvent<T>): void {
    // preserve `this` for callbacks
    const { src } = this.opts;
    const opts = src[e]?.(this.ctx());
    if (!opts) return;

    const v = this.vo;
    if (opts.min !== undefined) v.min = opts.min;
    if (opts.max !== undefined) v.max = opts.max;
    if (opts.read != null) v.read = opts.read;

    [v.min, v.max] = range(v, this.data, src);
  }

  // NOTE: return empty arrays to ignore values
  // return falsy to fallback to default behavior
  handle(arg: Arg): HandlerResult<T> | undefined {
    // preserve `this` for callbacks
    let schemas = this.opts.src.handler?.(arg, this.ctx());
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
        const cfg = schema.config();
        result.opts.push({ key: arg.key, args: resolveArgs(cfg), cfg, schema });
      }
    }

    return result;
  }

  // save arg to the last value child node
  value(arg: string): void {
    let node;
    const { children } = this.data;
    if (
      children.length > 0 &&
      (node = children[children.length - 1]).type === 'value'
    ) {
      node.args.push(arg);
    } else {
      // value node is almost the same as its parent but with different props
      children.push({
        ...this.data,
        type: 'value',
        depth: this.data.depth + 1,
        args: [arg],
        parent: this.data,
        children: []
      });
    }
  }

  /** Depth parsed. */
  done(): void {
    this.cb('onData');
    for (const node of this.children) node.cb('onDepth');
  }

  check(): void {
    const { min, max } = this.vo;

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
