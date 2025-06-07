import { ParseError } from '../lib/error';
import { Arg } from '../types/arg.types';
import { Context, Options, Value } from '../types/options.types';
import { Schema } from '../types/schema.types';
import { Mutable } from '../types/util.types';
import { display } from '../utils/display';
import { range } from '../utils/range';
import { NodeData } from './cnode';
import { NormalizedOptions } from './normalize';

// NOTE: internal

export type NodeEvent<T> = keyof {
  [K in keyof Options<T> as K extends 'onError'
    ? never
    : K extends `on${string}`
      ? K
      : never]: Options<T>[K];
};

export type Parsed<T> = Schema<T> | Value;

// NOTE: node instances will only have data types 'option' and 'command'
// directly save value nodes into `this.node.children` instead
export class Node<T> {
  readonly ctx: Mutable<Context<T>>;
  readonly strict: boolean | undefined;
  /** The strict mode value for descendants. */
  private readonly dstrict: boolean | undefined;
  private readonly children: Node<T>[] = [];
  private err?: ParseError<T>;

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

  /** Run the callback option. */
  cb(e: NodeEvent<T>): void {
    // preserve `this` for callbacks
    this.schema.options[e]?.(this.ctx);
  }

  /** Determines if the node can accept any more arguments. */
  read(): boolean {
    return (
      this.ctx.read &&
      (this.ctx.max == null || this.ctx.max > this.node.args.length)
    );
  }

  // NOTE: return empty arrays to ignore values
  // return undefined to fallback to default behavior
  parse(arg: Arg): Parsed<T>[] | undefined {
    // preserve `this` for callbacks
    let p = this.schema.options.parser?.(arg, this.ctx);

    // fallback to default behavior for null, undefined, true
    if (p == null || p === true) return;

    // ignore when false by returning empty result
    if (p === false) return [];

    // fallback to default behavior for empty arrays
    if ((p = Array.isArray(p) ? p : [p]).length > 0) return p;
  }

  // save arg to the last value child node
  value(arg: string): void {
    const p = this.node;
    const node = p.children.at(-1);

    if (node?.type === 'value') node.args.push(arg);
    // value node is almost the same as its parent but with different props
    // keep value property since it acts as an identifier (key-value pair)
    // also ignore node.meta since from the consumer's point of view,
    // the meta property was only ever set to the main node
    // prettier-ignore
    else p.children.push({ id: p.id, name: p.name, raw: p.raw, key: p.key, alias: p.alias, value: p.value, type: 'value', depth: p.depth + 1, args: [arg], parent: p, children: [] });
  }

  /** Depth parsed. */
  ok(): void {
    for (const n of this.children) n.cb('onDepth');
    this.cb('onData');
  }

  done(): void {
    if (this.err) throw this.err;

    // there is no need to validate the range once a callback option is fired
    // validate only after parsing since the context object
    // may not have the correct range set by the consumer
    // prettier-ignore
    const [min, max] = range(this.ctx.min, this.ctx.max, this.node, this.schema);

    // validate node
    const len = this.node.args.length;
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
      const msg = `xpected ${m[0]} argument${m[1] === 1 ? '' : 's'}, but got ${len}.`;
      this.error(msg, ParseError.RANGE_ERROR, 'e', 'E');
      if (this.err) throw this.err;
    }

    // only run onValidate if no errors (even ignored ones)
    else this.cb('onValidate');
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
  ): void {
    // skip if an error already exists
    if (this.err) return;

    const name = display(this.node);
    // prettier-ignore
    const err = new ParseError(code, (name ? name + p1 : p2) + msg, this.node, this.schema);

    // save error to throw later if onError does not return false
    if (this.schema.options.onError?.(err, this.ctx) !== false) this.err = err;
  }
}
