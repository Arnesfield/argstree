import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { split, Split, SplitItem } from '../lib/split';
import { Schema } from '../schema/schema.class';
import { Node } from '../types/node.types';
import { Options, Value } from '../types/options.types';
import { ArgConfig } from '../types/schema.types';
import { array } from '../utils/array';
import { __assertNotNull } from '../utils/assert';
import { Alias, normalize, NormalizedOptions } from './normalize';
import { canAssign, display, getArgs, isLeaf } from './utils';

// NOTE: internal

export type NodeEvent<T> = keyof {
  [K in keyof Options<T> as K extends 'onCreate'
    ? never
    : K extends `on${string}`
      ? K
      : never]: Options<T>[K];
};

// TODO: rename to Context
export interface NodeInfo<T> {
  cfg: ArgConfig<T>;
  node: Node<T>;
  min: number | null | undefined;
  max: number | null | undefined;
  read: boolean | undefined;
  strict: boolean | undefined;
  /** Children with `onDepth` callbacks only. */
  children: NodeInfo<T>[];
}

function cb<T>(ctx: NodeInfo<T>, e: NodeEvent<T>) {
  ctx.cfg.options[e]?.(ctx.node);
}

function ok<T>(info: NodeInfo<T>) {
  for (const n of info.children) cb(n, 'onDepth');
  cb(info, 'onData');
}

function noRead<T>(ctx: NodeInfo<T>) {
  return !ctx.read || (ctx.max != null && ctx.max <= ctx.node.args.length);
}

// ensure non-negative number
function number(n: number | null | undefined): number | null {
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : null;
}

function done<T>(ctx: NodeInfo<T>): void {
  const min = number(ctx.min);
  let max = number(ctx.max);

  // if min is greater than max,
  // prioritize the min value instead of throwing an error
  // also expect max to have value
  const rng = min != null && max != null;

  __assertNotNull(max);
  if (rng && min > max) max = min;

  // validate node
  const len = ctx.node.args.length;
  const m: [string | number, number] | null =
    rng && (len < min || len > max)
      ? min === max
        ? [min, min]
        : [`${min}-${max}`, 0]
      : min != null && len < min
        ? [`at least ${min}`, min]
        : max != null && len > max
          ? [max && `up to ${max}`, max]
          : null;

  if (m) {
    const name = display(ctx.node);
    const msg = `${name ? name + 'e' : 'E'}xpected ${m[0]} argument${m[1] === 1 ? '' : 's'}, but got ${len}.`;
    // prettier-ignore
    throw new ParseError(ParseError.RANGE_ERROR, msg, ctx.node, ctx.cfg.options);
  }

  // run onValidate if no errors
  cb(ctx, 'onValidate');
}

export function parse<T>(args: readonly string[], cfg: ArgConfig<T>): Node<T> {
  const list: NodeInfo<T>[] = [], // all info items
    bvList: NodeInfo<T>[] = []; // all info items that have an onBeforeValidate callback option

  let opts: NormalizedOptions<T>, // parent normalized options
    pInfo: NodeInfo<T>, // parent info
    cNode: Node<T> | null | undefined, // child node (can be value node)
    cInfo: NodeInfo<T> | null | undefined, // child info
    pdstrict: boolean | undefined, // parent node strict descendants
    dstrict: boolean | undefined, // current child node strict descendants
    err: ParseError<T> | undefined; // error before validation

  function node(
    c: ArgConfig<T>,
    raw: string | null,
    key: string | null,
    value: string | null = null,
    alias: string | null = null,
    argv?: string[]
  ) {
    // mark previous info as parsed before creating next node info
    cInfo && ok(cInfo);

    // make sure to initialize config before accessing options
    // NOTE: creating the schema instance should mutate and initialize the config object
    !c.map && c.options.init && new Schema(c);

    const { type, options: o } = c;
    const p = pInfo ? pInfo.node : null;

    // prettier-ignore
    const { id = key, name = key, strict: st } = o;
    // prettier-ignore
    cNode = { id, name, raw, key, alias, value, type, depth: p ? p.depth + 1 : 0, args: getArgs(o, argv, value), parent: p, children: [] };
    p?.children.push(cNode);

    // run onCreate and get parse options
    // prettier-ignore
    const { min = o.min, max = o.max, read = o.read ?? true } = o.onCreate?.(cNode) || o;

    const strict =
      st == null
        ? (dstrict = pdstrict)
        : typeof st === 'boolean'
          ? (dstrict = st)
          : !(dstrict = st !== 'self');

    // prettier-ignore
    list.push(cInfo = { cfg: c, node: cNode, min, max, read, strict, children: [] });
    // save to before validate list if has onBeforeValidate callback
    o.onBeforeValidate && bvList.push(cInfo);

    if (pInfo) {
      // save info to onDepths if has onDepth callback
      o.onDepth && pInfo.children.push(cInfo);

      o.onChild?.(pInfo.node);
    }
  }

  function nOpts() {
    // set current child node info as new parent node info
    __assertNotNull(cInfo);
    pInfo = cInfo;

    // set dstrict and normalized options for parent node info
    pdstrict = dstrict;
    opts = normalize(pInfo.cfg);

    // clear child node info since it's now the parent node
    cNode = cInfo = null;
  }

  function use() {
    __assertNotNull(cInfo);
    if (!isLeaf(cInfo.cfg)) {
      ok(pInfo);
      nOpts();
    } else if (noRead(cInfo)) {
      ok(cInfo);
      cNode = cInfo = null;
    }
  }

  /** Saves the unrecognized error to throw later during validation. */
  function uerr(msg: string, code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR) {
    // skip if cached error is already set
    if (err) return;

    // always use parent node for unrecognized arguments
    const name = display(pInfo.node);
    msg = (name ? name + 'does not recognize the ' : 'Unrecognized ') + msg;
    err = new ParseError(code, msg, pInfo.node, pInfo.cfg.options);
  }

  function setValue(raw: string, strict?: boolean) {
    // save value to child node if it exists
    if (cInfo) {
      // assume cNode exists if cInfo exists
      __assertNotNull(cNode);

      if ((strict ?? cInfo.strict) && isOption(raw)) {
        // use parent node for unrecognized argument errors even for child nodes
        return uerr(`argument: ${raw}`);
      }

      cNode.args.push(raw);
      cb(cInfo, 'onArg');

      if (cInfo.max != null && cNode.args.length >= cInfo.max) {
        ok(cInfo);
        cNode = cInfo = null;
      }
      return;
    }

    // save value to parent node
    // unrecognized argument if parent cannot read or if strict mode
    if (noRead(pInfo) || ((strict ?? pInfo.strict) && isOption(raw))) {
      return uerr(`argument: ${raw}`);
    }

    const p = pInfo.node;
    p.args.push(raw);

    // save to value node
    if (cNode) cNode.args.push(raw);
    // add value node if it doesn't exist
    // prettier-ignore
    else p.children.push(cNode = { id: p.id, name: p.name, raw: p.raw, key: p.key, alias: p.alias, value: p.value, type: 'value', depth: p.depth + 1, args: [raw], parent: p, children: [] });

    cb(pInfo, 'onArg');
  }

  // create root node
  node(cfg, null, null);
  // calling nOpts() should set opts and pInfo
  nOpts();
  __assertNotNull(opts!);
  __assertNotNull(pInfo!);

  const root = pInfo;
  cb(root, 'onDepth');

  // NOTE: instead of saving `leaf` to multiple info objects,
  // get it once since the next parent node info will always be non-leaf
  // assume leaf is almost always false
  const leaf = opts.value || isLeaf(cfg);

  for (const raw of args) {
    if (opts.value || leaf) {
      setValue(raw);
      continue;
    }

    let key = raw,
      value: string | undefined,
      alias: Alias<T> | undefined,
      i = raw.indexOf('=');

    if (i > -1) {
      key = raw.slice(0, i);
      value = raw.slice(i + 1);
    }

    // NOTE: reuse `cfg` variable
    // get node by map
    if ((cfg = opts.map[key]!) && canAssign(cfg, value)) {
      node(cfg, raw, key, value);
      use();
      continue;
    }

    // get node by alias
    if ((alias = opts.alias[key]) && canAssign(alias.cfg, value)) {
      node(alias.cfg, raw, alias.key, value, alias.alias, alias.args);
      use();
      continue;
    }

    // handle split
    // condition 1 - check if can split and has split values
    // condition 2 - check if last split item is a value and is assignable
    let rSplit: Split | undefined, s: Split | undefined, last: SplitItem;
    if (
      !(
        opts.keys.length > 0 &&
        isOption(key, 'short') &&
        (s = split(key.slice(1), opts.keys)).values.length > 0
      ) ||
      (value != null &&
        !(last = s.items.at(-1)!).remainder &&
        !canAssign(opts.alias['-' + last.value].cfg, value))
    ) {
      // parse by parser or treat as value if no split items
      // or if last split item value is not assignable
    }

    // set split result for error later after parser
    else if (s.remainders.length > 0) {
      rSplit = s;
    }

    // if no remainders, resolve all split values
    else {
      // NOTE: reuse `i` variable
      i = 0;
      for (const v of s.values) {
        alias = opts.alias['-' + v];

        // prettier-ignore
        node(alias.cfg, raw, alias.key, i++ === s.values.length - 1 ? value : null, alias.alias, alias.args);
      }

      use();
      continue;
    }

    // parse by parser

    // prettier-ignore
    let parsed = pInfo.cfg.options.parser?.({ raw, key, value, split: rSplit }, pInfo.node);
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

      let call: boolean | undefined;
      for (const p of parsed) {
        if ((p as Schema<T>).config) {
          call = true;
          // no value since it is handler by parser
          node((p as Schema<T>).config(), raw, key);
        } else for (const v of array((p as V).args)) setValue(v, (p as V).strict); // prettier-ignore
      }

      // if node() was called, call use() after
      call && use();

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
      uerr(msg, ParseError.UNRECOGNIZED_ALIAS_ERROR);
    }

    // otherwise, set value
    else setValue(raw);
  }

  // finally, mark nodes as parsed then build tree and validate nodes
  cInfo && ok(cInfo);
  ok(pInfo);

  // run onBeforeValidate for all nodes per depth level incrementally
  for (const n of bvList) cb(n, 'onBeforeValidate');

  // throw error before validation
  if (err) throw err;

  // validate and run onValidate for all nodes
  for (const n of list) done(n);

  return root.node;
}
