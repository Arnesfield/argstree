import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { split, Split, SplitItem } from '../lib/split';
import { Schema } from '../schema/schema.class';
import { Node } from '../types/node.types';
import { Value } from '../types/options.types';
import { Config } from '../types/schema.types';
import { array } from '../utils/array';
import { __assertNotNull } from '../utils/assert';
import {
  assign,
  Context,
  display,
  done,
  full,
  getArgs,
  isLeaf,
  ok
} from './node';
import { Alias, normalize, NormalizedOptions } from './normalize';

// NOTE: internal

// ensure non-negative number
function number(n: number | null | undefined): number | null {
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : null;
}

export function parse<T>(argv: readonly string[], cfg: Config<T>): Node<T> {
  const all: Context<T>[] = [], // all node contexts
    bvAll: Context<T>[] = []; // all node contexts that have an onBeforeValidate callback option

  let opts: NormalizedOptions<T>, // parent normalized options
    pCtx: Context<T>, // parent node context
    cNode: Node<T> | null | undefined, // child node (can be value node)
    cCtx: Context<T> | null | undefined, // child node context
    pdstrict: boolean | undefined, // parent node strict descendants
    dstrict: boolean | undefined, // current child node strict descendants
    err: ParseError<T> | undefined; // error before validation

  function node(
    c: Config<T>,
    raw: string | null,
    key: string | null,
    value: string | null = null,
    alias: string | null = null,
    args?: string[]
  ) {
    // mark previous node as parsed before creating next node
    cCtx && ok(cCtx);

    // make sure to initialize config before accessing options
    // NOTE: creating the schema instance should mutate and initialize the config object
    !c.map && c.options.init && new Schema(c);

    const o = c.options;
    const p = pCtx ? pCtx.node : null;
    const { id = key, name = key, strict: s } = o;

    // prettier-ignore
    cNode = { id, name, raw, key, alias, value, type: c.type, depth: p ? p.depth + 1 : 0, args: getArgs(o, args, value), parent: p, children: [] };
    p?.children.push(cNode);

    // run onCreate and get parse options
    // prettier-ignore
    // eslint-disable-next-line prefer-const
    let { min = o.min, max = o.max, read = o.read ?? true } = o.onCreate?.(cNode) || o;
    // run onChild for parent node
    p && pCtx!.cfg.options.onChild?.(p);

    // validate range: if min is greater than max,
    // prioritize the min value instead of throwing an error
    min = number(min);
    max = number(max);
    if (min != null && max != null && min > max) max = min;

    const strict =
      s == null
        ? (dstrict = pdstrict)
        : typeof s === 'boolean'
          ? (dstrict = s)
          : !(dstrict = s !== 'self');

    all.push((cCtx = { cfg: c, node: cNode, min, max, read, strict }));
    // save to before validate list if has onBeforeValidate callback
    o.onBeforeValidate && bvAll.push(cCtx);
  }

  function vNode(args: string[]) {
    const p = pCtx.node;
    // prettier-ignore
    p.children.push(cNode = { id: p.id, name: p.name, raw: p.raw, key: p.key, alias: p.alias, value: p.value, type: 'value', depth: p.depth + 1, args, parent: p, children: [] });
  }

  /** Sets `cCtx` as the next `pCtx` and normalizes its config. */
  function next() {
    // set current child node context as new parent node context
    __assertNotNull(cCtx);
    pCtx = cCtx;

    // set dstrict and normalized options for parent node context
    pdstrict = dstrict;
    opts = normalize(pCtx.cfg);

    // clear child node context since it's now the parent node
    cNode = cCtx = null;
  }

  function use() {
    __assertNotNull(cCtx);
    if (!isLeaf(cCtx.cfg)) {
      ok(pCtx);
      next();
    } else if (!cCtx.read || full(cCtx)) {
      ok(cCtx);
      cNode = cCtx = null;
    }
  }

  /** Saves the unrecognized error to throw later during validation. */
  function uErr(msg: string, code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR) {
    // skip if cached error is already set
    if (err) return;

    // always use parent node for unrecognized arguments
    const name = display(pCtx.node);
    // prettier-ignore
    err = new ParseError(code, (name ? name + 'does not recognize the ' : 'Unrecognized ') + msg, pCtx.node, pCtx.cfg.options);
  }

  function setValue(raw: string, strict?: boolean) {
    // if child is strict, pass it over to parent
    // if parent is non-strict, child is marked as parsed and accept arg

    // cache isOption result
    let opt;

    // save value to child node if it exists and strict mode is satisfied
    if (cCtx && !((strict ?? cCtx.strict) && (opt = isOption(raw)))) {
      // assume cNode exists if cCtx exists
      __assertNotNull(cNode);

      cNode.args.push(raw);

      if (full(cCtx)) {
        ok(cCtx);
        cNode = cCtx = null;
      }
      return;
    }

    // save value to parent node
    // unrecognized argument if parent cannot read or if strict mode
    // at this point, the value of `opt` is either true or undefined
    if (
      !pCtx.read ||
      full(pCtx) ||
      ((strict ?? pCtx.strict) && (opt ?? isOption(raw)))
    ) {
      return uErr(`argument: ${raw}`);
    }

    pCtx.node.args.push(raw);

    // if cCtx exists, it means cNode is not a value node yet
    if (cCtx) {
      ok(cCtx);
      cCtx = null;
      vNode([raw]);
    }
    // save to value node
    else if (cNode) cNode.args.push(raw);
    // add value node if it doesn't exist
    else vNode([raw]);
  }

  // create root node
  node(cfg, null, null);
  // calling next() should set opts and pCtx
  next();
  __assertNotNull(opts!);
  __assertNotNull(pCtx!);

  for (let i = 0; i < argv.length; i++) {
    let raw = argv[i];

    if (opts.pure) {
      // if a value node exists and not strict mode for the current node,
      // capture all args up until the end is reached if it's not null
      // allow number and undefined for end value
      // note that `end` is used twice (to get length of args and for the end index)
      // also note that `cNode` is expected to be a value node at this point
      let end: number | null | undefined;
      if (
        pCtx.read &&
        !pCtx.strict &&
        (end =
          pCtx.max == null
            ? undefined
            : pCtx.max > (end = pCtx.node.args.length)
              ? i + pCtx.max - end
              : null) !== null
      ) {
        // assume that at this point, there is no existing cNode
        // so always create a new child value node with the args
        vNode(argv.slice(i, end));
        // vNode() should create the cNode
        __assertNotNull(cNode);
        pCtx.node.args.push(...cNode.args);

        // stop here if capturing all args
        if (end == null || end >= argv.length) break;

        // call setValue for next raw argument
        raw = argv[(i = end)];
      }

      setValue(raw);
      continue;
    }

    let key = raw,
      value: string | undefined,
      alias: Alias<T> | undefined,
      j = raw.indexOf('='),
      // eslint-disable-next-line prefer-const
      noVal = j === -1; // implies `value == null` after setting value

    if (!noVal) {
      key = raw.slice(0, j);
      value = raw.slice(j + 1);
    }

    // NOTE: reuse `cfg` variable
    // get node by map
    if ((cfg = opts.map[key]!) && (noVal || assign(cfg))) {
      node(cfg, raw, key, value);
      use();
      continue;
    }

    // get node by alias
    if ((alias = opts.alias[key]) && (noVal || assign(alias.cfg))) {
      node(alias.cfg, raw, alias.key, value, alias.alias, alias.args);
      use();
      continue;
    }

    // handle split
    // condition 1 - check if can split and has split values
    // condition 2 - check if last split item is a value and is assignable
    let spl: Split | undefined, s: Split | undefined, last: SplitItem;
    if (
      !(
        opts.keys.length > 0 &&
        isOption(key, 'short') &&
        (s = split(key.slice(1), opts.keys)).values.length > 0 &&
        (noVal ||
          (last = s.items.at(-1)!).remainder ||
          assign(opts.alias['-' + last.value].cfg))
      )
    ) {
      // parse by parser or treat as value
      // if no split items or if last split item value is not assignable
    }

    // set split result for error later after parser
    else if (s.remainders.length > 0) {
      spl = s;
    }

    // if no remainders, resolve all split values
    else {
      // NOTE: reuse `j` variable
      for (j = 0; j < s.values.length; j++) {
        // NOTE: reuse `alias` variable
        alias = opts.alias['-' + s.values[j]];

        // assign value to the last node
        // prettier-ignore
        node(alias.cfg, raw, alias.key, j === s.values.length - 1 ? value : null, alias.alias, alias.args);
      }

      use();
      continue;
    }

    // parse by parser

    // prettier-ignore
    let res = pCtx.cfg.options.parser?.({ raw, key, value, split: spl }, pCtx.node);
    if (res === false) {
      // ignore raw argument
    }

    // default behavior if no parsed or true
    // default behavior if empty array
    // otherwise, iterate through parsed
    else if (
      res != null &&
      res !== true &&
      (res = Array.isArray(res) ? res : [res]).length > 0
    ) {
      type V = Value;

      // NOTE: setValue calls will use the current node
      // which can change when a new node is created within the same loop
      // both `cCtx` and `cNode` can be unset after this loop
      let call: boolean | undefined;
      for (const r of res) {
        if ((r as Schema<T>).config) {
          // create nodes without value since we assume that it is handled by the parser
          node((r as Schema<T>).config(), raw, key);
          call = true;
        }
        // handle parsed values (will set it to the current node)
        else for (const v of array((r as V).args)) setValue(v, (r as V).strict);
      }

      // call use() if node() was called
      // also make sure that `cCtx` exists since it can be unset by setValue
      call && cCtx && use();

      // always skip after successful parser call (parsed.length > 0)
    }

    // parser done

    // handle split error
    else if (spl) {
      const msg =
        `alias${spl.remainders.length === 1 ? '' : 'es'}: -` +
        spl.items.map(v => (v.remainder ? `(${v.value})` : v.value)).join('');
      uErr(msg, ParseError.UNRECOGNIZED_ALIAS_ERROR);
    }

    // otherwise, set value
    else setValue(raw);
  }

  // finally, mark nodes as parsed then build tree and validate nodes
  cCtx && ok(cCtx);
  ok(pCtx);

  // run onBeforeValidate for all nodes per depth level incrementally
  // NOTE: expect onBeforeValidate to exist if part of `bvAll`
  for (const c of bvAll) c.cfg.options.onBeforeValidate!(c.node);

  // throw error before validation
  if (err) throw err;

  // validate and run onValidate for all nodes
  for (const c of all) done(c);

  // return the root node
  return all[0].node;
}
