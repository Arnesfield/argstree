import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { split, Split } from '../lib/split';
import { Arg } from '../types/arg.types';
import { Node as INode } from '../types/node.types';
import { Context, Options, Value } from '../types/options.types';
import { Schema } from '../types/schema.types';
import { array } from '../utils/array';
import { display } from '../utils/display';
import { range } from '../utils/range';
import { NodeData } from './cnode';
import { NodeEvent } from './node';
import { Alias, normalize, NormalizedOptions } from './normalize';

// NOTE: internal

interface InternalContext<T> extends Omit<Context<T>, 'node'> {
  node: NodeData<T>;
}

interface NodeInfo<T> {
  dstrict: boolean;
  ctx: InternalContext<T>;
  leaf?: boolean;
  opts?: NormalizedOptions<T>;
  // children with onDepth callbacks only
  onDepths: NodeInfo<T>[];
}

type NormalizedNodeInfo<T> = Required<NodeInfo<T>>;

// NOTE: side effect: this would initialize the schema if options aren't satisfied
function isLeaf<T>(schema: Schema<T>) {
  const o = schema.options;
  if (o.leaf != null) return o.leaf;
  if (o.parser) return false;
  for (const _ in schema.schemas()) return false;
  return schema.type !== 'command';
}

function assignable<T>(schema: Schema<T>, value: string | null | undefined) {
  return value == null || (schema.options.assign ?? schema.type === 'option');
}

function cb<T>(ctx: InternalContext<T>, e: NodeEvent<T>) {
  ctx.schema.options[e]?.(ctx);
}

function ok<T>(info: NodeInfo<T>) {
  for (const c of info.onDepths) cb(c.ctx, 'onDepth');
  cb(info.ctx, 'onData');
}

function done<T>(ctx: InternalContext<T>): void {
  // there is no need to validate the range once a callback option is fired
  // validate only after parsing since the context object
  // may not have the correct range set by the consumer
  const [min, max] = range(ctx.min, ctx.max, ctx.node, ctx.schema);

  // validate node
  const len = ctx.node.args.length;
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
    const err = error(ctx, msg, ParseError.RANGE_ERROR, 'e', 'E');
    if (err) throw err;
  }

  // only run onValidate if no errors (even ignored ones)
  else cb(ctx, 'onValidate');
}

/**
 * Creates a {@linkcode ParseError}.
 * @param msg The error message after the prefix.
 * @param code The error code.
 * @param p Prefix before {@linkcode msg} if a display name is available.
 * @param q Prefix before {@linkcode msg} if a display name is not available.
 * @returns The {@linkcode ParseError} if {@linkcode Options.onError} does not return `false`.
 */
function error<T>(
  ctx: InternalContext<T>,
  msg: string,
  code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR,
  p?: string,
  q?: string
): ParseError<T> | undefined {
  const name = display(ctx.node);
  // prettier-ignore
  const err = new ParseError(code, (name ? name + (p || 'does not recognize the ') : (q || 'Unrecognized ')) + msg, ctx.node, ctx.schema);

  // return error to throw later if onError does not return false
  if (ctx.schema.options.onError?.(err, ctx) !== false) return err;
}

export function parse<T>(args: readonly string[], schema: Schema<T>): INode<T> {
  const list: NodeInfo<T>[] = [],
    bvList: NodeInfo<T>[] = [];

  let pInfo: NormalizedNodeInfo<T>,
    cNode: INode<T> | null | undefined,
    cInfo: NodeInfo<T> | null | undefined,
    err: { pos: number; error: ParseError<T> } | undefined;

  function make(
    schema: Schema<T>,
    raw: string | null,
    key: string | null,
    value: string | null = null,
    alias: string | null = null,
    aArgs?: string[]
  ) {
    // mark previous info as parsed before creating next node info
    cInfo && ok(cInfo);

    const { type, options: o } = schema;

    // create copy of args
    const args = array(o.args, true);
    aArgs && args.push(...aArgs);
    value != null && args.push(value);

    const p = pInfo ? pInfo.ctx.node : null;

    // prettier-ignore
    const { id = key, name = key, min = null, max = null, read = true, strict: s } = o;
    // prettier-ignore
    const node: NodeData<T> = cNode = { id, name, raw, key, alias, value, type, depth: p ? p.depth + 1 : 0, args, parent: p, children: [] };
    p?.children.push(node);

    let dstrict: boolean;
    const strict =
      s == null
        ? (dstrict = !!pInfo?.dstrict)
        : typeof s === 'boolean'
          ? (dstrict = s)
          : !(dstrict = s !== 'self');

    // prettier-ignore
    list.push(cInfo = { dstrict, onDepths: [], ctx: { min, max, read, strict, node, schema } });
    // save to before validate list if has onBeforeValidate callback
    o.onBeforeValidate && bvList.push(cInfo);

    // run callback options
    cb(cInfo.ctx, 'onCreate');

    if (pInfo) {
      // save info to onDepths if has onDepth callback
      o.onDepth && pInfo.onDepths.push(cInfo);

      cb(pInfo.ctx, 'onChild');
    }
  }

  function nInfo(leaf: boolean) {
    const info = cInfo as NormalizedNodeInfo<T>;

    info.leaf = leaf;
    info.opts = normalize(info.ctx.schema);

    cNode = cInfo = null;
    return info;
  }

  function use() {
    const { ctx } = cInfo!;
    const leaf = isLeaf(ctx.schema);

    if (!leaf) {
      ok(pInfo);

      pInfo = nInfo(leaf);
    } else if (
      !(ctx.read && (ctx.max == null || ctx.max > cNode!.args.length))
    ) {
      ok(cInfo!);
      cNode = cInfo = null;
    }
  }

  make(schema, null, null);
  const rInfo = (pInfo = nInfo(isLeaf(schema)));
  cb(rInfo.ctx, 'onDepth');

  /** Saves the {@linkcode ParseError} to throw later during validation. */
  function nErr(e: ParseError<T> | undefined) {
    err ||= e && { pos: list.length, error: e };
  }

  function setValue(raw: string, strict?: boolean) {
    // save value to child node if it exists
    if (cNode && cInfo) {
      if ((strict ?? cInfo.ctx.strict) && isOption(raw)) {
        return nErr(error(cInfo.ctx, `argument: ${raw}`));
      }

      cNode.args.push(raw);
      cb(cInfo.ctx, 'onArg');

      if (cInfo.ctx.max != null && cNode.args.length >= cInfo.ctx.max) {
        ok(cInfo);
        cNode = cInfo = null;
      }
      return;
    }

    // save value to parent node
    // unrecognized argument if parent cannot read or if strict mode
    if (
      !(
        pInfo.ctx.read &&
        (pInfo.ctx.max == null || pInfo.ctx.max > pInfo.ctx.node.args.length)
      ) ||
      ((strict ?? pInfo.ctx.strict) && isOption(raw))
    ) {
      return nErr(error(pInfo.ctx, `argument: ${raw}`));
    }

    const p = pInfo.ctx.node;
    p.args.push(raw);

    // save to value node
    if (cNode) cNode.args.push(raw);
    // add value node if it doesn't exist
    // prettier-ignore
    else p.children.push(cNode = { id: p.id, name: p.name, raw: p.raw, key: p.key, alias: p.alias, value: p.value, type: 'value', depth: p.depth + 1, args: [raw], parent: p, children: [] });

    cb(pInfo.ctx, 'onArg');
  }

  for (const raw of args) {
    if (pInfo.leaf) {
      setValue(raw);
      continue;
    }

    let key = raw,
      value: string | undefined;
    const index = raw.indexOf('=');
    if (index > -1) {
      key = raw.slice(0, index);
      value = raw.slice(index + 1);
    }

    const { ctx, opts } = pInfo;
    let schema = opts.map[key],
      alias: Alias | undefined,
      parsed: ReturnType<NonNullable<Options['parser']>> | undefined;

    if (schema && assignable(schema, value)) {
      make(schema, raw, key, value);
      use();
      continue;
    }

    if ((alias = opts.alias[key])) {
      schema = opts.map[alias.key]!;
      if (assignable(schema, value)) {
        make(schema, raw, alias.key, value, alias.alias, alias.args);
        use();
        continue;
      }
    }

    // split
    let rSplit: Split | undefined, s: Split | undefined;
    if (
      opts.keys.length > 0 &&
      isOption(key, 'short') &&
      (s = split(key.slice(1), opts.keys)).values.length > 0
    ) {
      // if last split item is a value
      // check if last item is assignable
      let last;

      if (
        value != null &&
        !(last = s.items.at(-1)!).remainder &&
        !assignable(opts.map[opts.alias['-' + last.value].key]!, value)
      ) {
        // treat as value
      } else if (s.remainders.length > 0) {
        rSplit = s;
      } else {
        for (let i = 0, val; i < s.values.length; i++) {
          alias = opts.alias['-' + s.values[i]];
          schema = opts.map[alias.key]!;
          val = i === s.values.length - 1 ? value : null;

          make(schema, raw, alias.key, val, alias.alias, alias.args);
        }

        use();
        continue;
      }
    }

    // parse by parser

    const o = ctx.schema.options;
    if (o.parser) {
      const arg: Arg = { raw, key, value };
      rSplit && (arg.split = rSplit);
      parsed = o.parser(arg, ctx);
    }

    // ignore raw argument
    if (parsed === false) continue;

    // default behavior if no parsed or true
    // default behavior if empty array
    // otherwise, iterate through parsed
    if (
      parsed != null &&
      parsed !== true &&
      (parsed = Array.isArray(parsed) ? parsed : [parsed]).length > 0
    ) {
      type V = Value;

      let hasNode: boolean | undefined;
      for (const p of parsed) {
        if ((p as Schema<T>).schemas) {
          hasNode = true;
          // no value since it is handler by parser
          make(p as Schema<T>, raw, key);
        } else for (const v of array((p as V).args)) setValue(v, (p as V).strict); // prettier-ignore
      }

      // if make() was called, call use() after
      hasNode && use();

      // always skip after successful parser call (parsed.length > 0)
      continue;
    }

    // parser done

    // handle split error
    if (rSplit) {
      const msg =
        `alias${rSplit.remainders.length === 1 ? '' : 'es'}: -` +
        rSplit.items
          .map(v => (v.remainder ? `(${v.value})` : v.value))
          .join('');
      nErr(error(pInfo.ctx, msg, ParseError.UNRECOGNIZED_ALIAS_ERROR));
    }

    // otherwise, set value
    else setValue(raw);
  }

  // finally, mark nodes as parsed then build tree and validate nodes
  cInfo && ok(cInfo);
  ok(pInfo);

  // run onBeforeValidate for all nodes per depth level incrementally
  for (const n of bvList) cb(n.ctx, 'onBeforeValidate');

  // validate and run onValidate for all nodes
  let l = 0;
  for (const n of list) {
    done(n.ctx);
    // throw the error at the given position
    // assume that position can never be 0
    if (++l === err?.pos) throw err.error;
  }

  return rInfo.ctx.node;
}
