import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { split, Split, SplitItem } from '../lib/split';
import { Node } from '../types/node.types';
import { Context, Options, Value } from '../types/options.types';
import { Schema } from '../types/schema.types';
import { array } from '../utils/array';
import { Alias, normalize, NormalizedOptions } from './normalize';
import { canAssign, getArgs, isLeaf, noRead } from './utils';

// NOTE: internal

export type NodeEvent<T> = keyof {
  [K in keyof Options<T> as K extends 'onError'
    ? never
    : K extends `on${string}`
      ? K
      : never]: Options<T>[K];
};

interface NodeInfo<T> {
  ctx: Context<T>;
  // children with onDepth callbacks only
  onDepths: NodeInfo<T>[];
  opts?: NormalizedOptions<T>;
}

interface NormalizedNodeInfo<T>
  extends Omit<NodeInfo<T>, 'opts'>,
    Required<Pick<NodeInfo<T>, 'opts'>> {}

function cb<T>(ctx: Context<T>, e: NodeEvent<T>) {
  ctx.schema.options[e]?.(ctx);
}

function ok<T>(info: NodeInfo<T>) {
  for (const c of info.onDepths) cb(c.ctx, 'onDepth');
  cb(info.ctx, 'onData');
}

// ensure non-negative number
function number(n: number | null | undefined): number | null {
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : null;
}

function done<T>(ctx: Context<T>): void {
  const min = number(ctx.min);
  let max = number(ctx.max);

  // if min is greater than max,
  // prioritize the min value instead of throwing an error
  // also expect max to have value
  const rng = min != null && max != null;
  if (rng && min > max!) max = min;

  // validate node
  const len = ctx.node.args.length;
  const m: [string | number, number] | null =
    rng && (len < min || len > max!)
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
  ctx: Context<T>,
  msg: string,
  code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR,
  p?: string,
  q?: string
): ParseError<T> | undefined {
  const name =
    ctx.node.name != null &&
    `${ctx.node.type === 'option' ? 'Option' : 'Command'} '${ctx.node.name}' `;

  // prettier-ignore
  const err = new ParseError(code, (name ? name + (p || 'does not recognize the ') : (q || 'Unrecognized ')) + msg, ctx.node, ctx.schema);

  // return error to throw later if onError does not return false
  if (ctx.schema.options.onError?.(err, ctx) !== false) return err;
}

export function parse<T>(args: readonly string[], schema: Schema<T>): Node<T> {
  const list: NodeInfo<T>[] = [], // all info items
    bvList: NodeInfo<T>[] = []; // all info items that have an onBeforeValidate callback option

  let pInfo: NormalizedNodeInfo<T>, // parent info
    cNode: Node<T> | null | undefined, // child node (can be value node)
    cInfo: NodeInfo<T> | null | undefined, // child info
    pdstrict = false, // parent node strict descendants
    dstrict: boolean, // current child node strict descendants
    err: { pos: number; error: ParseError<T> } | undefined; // error at list position

  function node(
    s: Schema<T>,
    raw: string | null,
    key: string | null,
    value: string | null = null,
    alias: string | null = null,
    argv?: string[]
  ) {
    // mark previous info as parsed before creating next node info
    cInfo && ok(cInfo);

    const { type, options: o } = s;
    const p = pInfo ? pInfo.ctx.node : null;

    // prettier-ignore
    const { id = key, name = key, min = null, max = null, read = true, strict: st } = o;
    // prettier-ignore
    cNode = { id, name, raw, key, alias, value, type, depth: p ? p.depth + 1 : 0, args: getArgs(s, argv, value), parent: p, children: [] };
    p?.children.push(cNode);

    const strict =
      st == null
        ? (dstrict = pdstrict)
        : typeof st === 'boolean'
          ? (dstrict = st)
          : !(dstrict = st !== 'self');

    // prettier-ignore
    list.push(cInfo = { onDepths: [], ctx: { min, max, read, strict, node: cNode, schema: s } });
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

  function nInfo() {
    const info = cInfo as NormalizedNodeInfo<T>;

    // set dstrict and normalized options for parent node info
    pdstrict = dstrict;
    info.opts = normalize(info.ctx.schema);

    cNode = cInfo = null;
    return info;
  }

  function use() {
    if (!isLeaf(cInfo!.ctx.schema)) {
      ok(pInfo);
      pInfo = nInfo();
    } else if (noRead(cInfo!.ctx)) {
      ok(cInfo!);
      cNode = cInfo = null;
    }
  }

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
    if (noRead(pInfo.ctx) || ((strict ?? pInfo.ctx.strict) && isOption(raw))) {
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

  // create root node
  node(schema, null, null);
  const root = (pInfo = nInfo());
  cb(root.ctx, 'onDepth');

  // NOTE: instead of saving `leaf` to multiple info objects,
  // get it once since the next parent node info will always be non-leaf
  // assume leaf is almost always false
  const leaf = root.opts.value || isLeaf(schema);

  for (const raw of args) {
    if (pInfo.opts.value || leaf) {
      setValue(raw);
      continue;
    }

    let key = raw,
      value: string | undefined,
      alias: Alias | undefined;

    const index = raw.indexOf('=');
    if (index > -1) {
      key = raw.slice(0, index);
      value = raw.slice(index + 1);
    }

    const { ctx, opts } = pInfo;

    // NOTE: reuse schema variable
    if ((schema = opts.map[key]!) && canAssign(schema, value)) {
      node(schema, raw, key, value);
      use();
      continue;
    }

    if (
      (alias = opts.alias[key]) &&
      canAssign((schema = opts.map[alias.key]!), value)
    ) {
      node(schema, raw, alias.key, value, alias.alias, alias.args);
      use();
      continue;
    }

    // split
    let rSplit: Split | undefined, s: Split | undefined, last: SplitItem;
    if (
      !(
        opts.keys.length > 0 &&
        isOption(key, 'short') &&
        (s = split(key.slice(1), opts.keys)).values.length > 0
      )
    ) {
      // treat as value if no split items
    }

    // handle split
    // if last split item is a value
    // check if last item is assignable
    else if (
      value != null &&
      !(last = s.items.at(-1)!).remainder &&
      !canAssign(opts.map[opts.alias['-' + last.value].key]!, value)
    ) {
      // treat as value if last split item value is not assignable
    }

    // set split result for error later after parser
    else if (s.remainders.length > 0) rSplit = s;
    // handle split values
    else {
      for (let i = 0; i < s.values.length; i++) {
        schema = opts.map[(alias = opts.alias['-' + s.values[i]]).key]!;

        // prettier-ignore
        node(schema, raw, alias.key, i === s.values.length - 1 ? value : null, alias.alias, alias.args);
      }

      use();
      continue;
    }

    // parse by parser

    // prettier-ignore
    let parsed = ctx.schema.options.parser?.({ raw, key, value, split: rSplit }, ctx);
    if (parsed === false) {
      // ignore raw argument
    }

    // default behavior if no parsed or true
    // default behavior if empty array
    // otherwise, iterate through parsed
    else if (
      parsed != null &&
      parsed !== true &&
      (parsed = Array.isArray(parsed) ? parsed : [parsed]).length > 0
    ) {
      type V = Value;

      let doUse: boolean | undefined;
      for (const p of parsed) {
        if ((p as Schema<T>).schemas) {
          doUse = true;
          // no value since it is handler by parser
          node(p as Schema<T>, raw, key);
        } else for (const v of array((p as V).args)) setValue(v, (p as V).strict); // prettier-ignore
      }

      // if make() was called, call use() after
      doUse && use();

      // always skip after successful parser call (parsed.length > 0)
    }

    // parser done

    // handle split error
    else if (rSplit) {
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

  return root.ctx.node;
}
