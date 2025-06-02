import { ParseError } from '../lib/error';
import { Arg } from '../types/arg.types';
import { Node as INode } from '../types/node.types';
import { Context, Options } from '../types/options.types';
import { Schema } from '../types/schema.types';
import { Mutable } from '../types/util.types';
import { display } from '../utils/display';
import { range } from '../utils/range';
import { NodeData, NodeOptions } from './cnode';
import { NormalizedOptions } from './normalize';

// NOTE: internal

export type NodeEvent<T> = keyof {
  [K in keyof Options<T> as K extends `on${string}` ? K : never]: Options<T>[K];
};

export interface HandlerResult<T> {
  args: string[];
  opts: NodeOptions<T>[];
}

// NOTE: node instances will only have data types 'option' and 'command'
// directly save value nodes into `this.node.children` instead
export class Node<T> {
  readonly ctx: Mutable<Context<T>>;
  readonly strict: boolean | undefined;
  /** The strict mode value for descendants. */
  private readonly dstrict: boolean | undefined;
  private readonly children: Node<T>[] = [];

  constructor(
    private readonly schema: Schema<T>,
    readonly opts: NormalizedOptions<T>,
    readonly node: NodeData<T>,
    parent: Node<T> | undefined
  ) {
    const { read = true, strict } = schema.options;

    // set context for callbacks
    this.ctx = { min: opts.min, max: opts.max, read, node, schema };

    // if options.strict is not set, follow ancestor strict mode
    // otherwise, follow options.strict and also update this.dstrict
    // for descendant nodes
    this.strict =
      strict == null
        ? (this.dstrict = parent?.dstrict)
        : typeof strict === 'boolean'
          ? (this.dstrict = strict)
          : !(this.dstrict = strict !== 'self');

    // make sure the parent node adds the child node before any callbacks are fired
    parent?.children.push(this);
    parent?.node.children.push(node);

    this.cb('onCreate');

    parent?.cb('onChild');
  }

  /** Run callback option and handle options. */
  cb(e: NodeEvent<T>): void {
    // NOTE: consumer can directly modify the context object and skip validation
    // should we prevent this? nope. probably not worth creating a shallow copy
    // of the context object for this edge case

    const c = this.ctx;

    // preserve `this` for callbacks
    const opts = this.schema.options[e]?.(c);
    if (!opts) return;

    const { min = c.min, max = c.max } = opts;
    if (opts.read != null) c.read = opts.read;

    [c.min, c.max] = range(min, max, this.node, this.schema);
  }

  // NOTE: return empty arrays to ignore values
  // return falsy to fallback to default behavior
  handle(arg: Arg): HandlerResult<T> | undefined {
    // preserve `this` for callbacks
    let schemas = this.schema.options.handler?.(arg, this.ctx);
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
        result.opts.push({ key: arg.key, schema });
      }
    }

    return result;
  }

  // save arg to the last value child node
  value(arg: string): void {
    let node: INode<T>;
    const p = this.node;
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
    for (const n of this.children) n.cb('onDepth');
    this.cb('onData');
  }

  check(): void {
    const { min, max } = this.ctx;

    // validate node
    const len = this.node.args.length;
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
      this.error(err, ParseError.RANGE_ERROR, 'e', 'E');
    }

    this.cb('onValidate');
  }

  /**
   * Throws a {@linkcode ParseError}.
   * @param msg The error message after the prefix.
   * @param code The error code.
   * @param p1 Prefix before {@linkcode msg} if a display name is available.
   * @param p2 Prefix before {@linkcode msg} if a display name is not available.
   */
  error(
    msg: string,
    code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR,
    p1 = 'does not recognize the ',
    p2 = 'Unrecognized '
  ): never {
    const name = display(this.node);
    // prettier-ignore
    throw new ParseError(code, (name ? name + p1 : p2) + msg, this.node, this.schema);
  }
}
