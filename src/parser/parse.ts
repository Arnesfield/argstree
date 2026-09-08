/* eslint-disable prefer-const */
import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { Config, InitializedConfig, Short } from '../types/config.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { Fallback, FallbackArgs } from '../types/spec.types';
import { array, size } from '../utils/array';
import { __assertNotNull } from '../utils/assert';
import {
  assign,
  display,
  full,
  getArgs,
  getCfg,
  init,
  NodeContext,
  ok
} from './helpers';
import type { Spec } from './spec.class';

// NOTE: internal

export function parse<T>(argv: readonly string[], cfg: Config<T>): Node<T>;
export function parse<T>(
  argv: readonly string[],
  cfg: Config<T> | null | undefined
): Node<T> {
  let all: NodeContext<T>[] = [], // all node contexts
    bAll: NodeContext<T>[] = [], // all with an onBeforeValidate callback option
    pc: NodeContext<T>, // parent node context
    cn: Node<T> | null | undefined, // child node (can be an argument node)
    cc: NodeContext<T> | null | undefined, // child node context
    pdstrict = true, // parent node strict descendants
    dstrict: boolean, // current child node strict descendants
    err: ParseError<T> | undefined; // error before validation

  /** Creates an unrecognized error to throw later before validation. */
  function uErr(raw: string): ParseError<T> {
    // always use parent node for unrecognized arguments
    const name = display(pc.node);

    // prettier-ignore
    return new ParseError(ParseError.UNRECOGNIZED_ERROR, `${name ? name + 'does not recognize the' : 'Unrecognized'} argument: ${raw}`, pc.node);
  }

  function node(
    c: Config<T>,
    raw: string | null,
    key: string | null,
    value: string | null = null,
    cid = c.id,
    val = value
  ) {
    // mark previous node as parsed before creating next node
    cc && ok(cc);

    const o = c.options,
      p = pc ? pc.node : null,
      // prettier-ignore
      { min, max, consume = true, id = cid ?? key, name = cid ?? key, strict: s, type = c.mapv || c.fallback ? 'command' : 'option' } = o,
      strict =
        s == null
          ? (dstrict = pdstrict)
          : typeof s === 'boolean'
            ? (dstrict = s)
            : !(dstrict = s !== 'self');

    // prettier-ignore
    cc = { cfg: c, node: (cn = { id, name, raw, key, value, type, depth: p ? p.depth + 1 : 0, args: getArgs(o.args, val), parent: p, children: [], min, max, consume, strict }) };
    p?.children.push(cn);

    o.onCreate?.(cn);
    pc?.cfg.options.onChild?.(p!);

    // save to before validate list if has onBeforeValidate callback
    o.onBeforeValidate && bAll.push(cc);
    all.push(cc);
  }

  /** Creates an argument node. */
  function aNode(args: string[]) {
    const p = pc.node;
    // prettier-ignore
    p.children.push((cn = { id: p.id, name: p.name, raw: p.raw, key: p.key, value: p.value, type: 'arg', depth: p.depth + 1, args, parent: p, children: [] }));
  }

  function next() {
    // set current child node context as new parent node context
    __assertNotNull(cc);
    pc = cc;

    // set dstrict for parent node context
    pdstrict = dstrict;

    // clear child node context since it's now the parent node
    cc = cn = null;
  }

  function use() {
    __assertNotNull(cc);

    // check if parent node
    if (
      cc.cfg.options.parent ??
      (cc.cfg.mapv || cc.cfg.fallback || cc.cfg.options.type === 'command')
    ) {
      ok(pc);
      next();
    }
  }

  function setArg(raw: string, strict?: boolean) {
    // if child is strict, pass it over to parent
    // if parent is non-strict, child is marked as parsed and accept arg

    // cache isOption result
    let opt: boolean | undefined;

    // save value to child node if it exists and strict mode is satisfied
    if (
      cc &&
      cn!.consume &&
      !full(cn!) &&
      !((strict ?? cn!.strict) && (opt = isOption(raw)))
    ) {
      __assertNotNull(cn);
      cn.args.push(raw);
      return;
    }

    // if the raw argument isn't saved to the existing child node, mark the
    // child node as parsed before attempting to save it to the parent node
    if (cc) {
      ok(cc);
      cc = cn = null;
    }

    // save value to parent node
    // unrecognized argument if parent cannot consume or if strict mode
    // at this point, the value of `opt` is either true or undefined
    if (
      !pc.node.consume ||
      full(pc.node) ||
      ((strict ?? pc.node.strict) && (opt ?? isOption(raw)))
    ) {
      err ||= uErr(raw);
      return;
    }

    pc.node.args.push(raw);

    // if the current node exists, it is an argument node
    // otherwise, create a new argument node
    cn ? cn.args.push(raw) : aNode([raw]);
  }

  // create root node
  __assertNotNull(cfg);
  node(cfg, null, null);
  next();
  __assertNotNull(pc!);

  for (let a = 0; a < argv.length; a++) {
    if (!pc.cfg.mapv && !pc.cfg.fallback) {
      // if not strict mode for the current node,
      // capture the rest of the args until the end is reached
      // note that `end` is used twice:
      // once to get length of args and another for the end index

      let end: number | undefined;

      if (
        !cc &&
        pc.node.consume &&
        !pc.node.strict &&
        (pc.node.max == null ||
          (pc.node.max > (end = pc.node.args.length) &&
            ((end = a + pc.node.max - end), true)))
      ) {
        // when using fallback, the current node can be an argument node
        const args = argv.slice(a, end);

        pc.node.args.push(...args);
        cn ? cn.args.push(...args) : aNode(args);

        // stop here if the rest of the args were captured
        if (end == null || end >= argv.length) break;

        // call setArg for next raw argument
        a = end;
      }

      setArg(argv[a]);
      continue;
    }

    let raw = argv[a],
      key = raw,
      value: string | null = null,
      ic: InitializedConfig<T> | null | undefined,
      i = raw.indexOf('='),
      // save argument to child node
      ca =
        cc &&
        cn!.min != null &&
        cn!.consume === 'min' &&
        cn!.min > cn!.args.length &&
        !full(cn!) &&
        !(cn!.strict && isOption(raw));

    if (i >= 0) {
      key = raw.slice(0, i);
      value = raw.slice(i + 1);
    }

    // get node by map
    if (
      (ic = init(pc.cfg.map?.[key])) &&
      (cfg = getCfg(ic)) &&
      !(ca && cfg.options.consumable !== false) &&
      (value == null || assign(cfg))
    ) {
      node(cfg, raw, key, value, ic.id);
      use();
      continue;
    }

    // save value to child node if condition is satisfied
    if (ca) {
      __assertNotNull(cn);
      cn.args.push(raw);
      continue;
    }

    let shorts: Short<T>[] = [],
      short: Short<T> | undefined,
      sVal: string | null | undefined, // short value
      rem: string | undefined, // remainder
      f = pc.cfg.fallback, // fallback function, remove `this` from function call
      res: ReturnType<Fallback<T>>; // fallback result

    // handle split
    // require length of at least 3 since keys with length of 2
    // should have been matched before this
    if (key.length > 2 && pc.cfg.shortv && isOption(key, 'short')) {
      // `inc` for incomplete short options parsed
      let inc: boolean, o: Options<T> | string;

      // if a short option exists,
      // stop loop if it requires a value or if it's not combinable
      for (
        i = 1;
        (inc = i < key.length) &&
        !(
          short &&
          ((o = short.cfg.options).combinable === false ||
            (o.min != null && o.min > size(o.args)))
        ) &&
        (ic = init(pc.cfg.short[(o = key[i])])) &&
        (cfg = getCfg(ic)) &&
        (!short || cfg.options.combinable !== false);
        i++
      ) {
        // delay pushing the last short option to the next iteration instead
        // so that it is pushed outside only after condition checks
        short && shorts.push(short);
        short = { key: o, ic, cfg };
      }

      // if incomplete short option parsed, check if the rest of the argument
      // can be assigned and also go through the fallback function
      // otherwise, use the parsed value if it can be assigned

      if (!short) {
        // continue to fallback if no short option was parsed
      } else if (
        inc &&
        (o = short.cfg.options).max != null &&
        o.max <= size(o.args)
      ) {
        // if the config accepts no arguments, treat the rest as remainder
        shorts.push(short);
        rem = key.slice(i);
      } else if ((value == null && !inc) || assign(short.cfg)) {
        shorts.push(short);
        sVal = inc ? raw.slice(i) : value;

        // skip fallback if parsed completely
        if (!inc) f = null;
      } else rem = key.slice(i - 1);
    }

    // parse by fallback

    // if false, ignore raw argument
    // prettier-ignore
    if ((res = f?.({ raw, key, value, remainder: rem, node: pc.node, subnode: cc ? cn! : null })) === false) continue;

    // default behavior if no parsed or true
    // default behavior if empty array
    // otherwise, iterate through parsed
    if (res && res !== true && (res = array(res)).length > 0) {
      type A = FallbackArgs;

      // allow the current working nodes to change
      for (const r of res) {
        if (!r) {
          // skip if null or undefined
        } else if ((cfg = (r as Spec<T>).cfg)) {
          // do not include value to node.args
          // since we leave it to the fallback to set the value as an argument
          node(cfg, raw, key, value, cfg.id, null);
          use();
        }
        // set parsed values to the current node
        else for (const v of array((r as A).args)) setArg(v, (r as A).strict);
      }

      // always skip after successful fallback call
      continue;
    }

    // fallback done

    if (shorts.length > 0) {
      // process short options even if there is an unparsed part
      for (i = 0; i < shorts.length; i++) {
        // prettier-ignore
        node((short = shorts[i]).cfg, raw, '-' + short.key, i === shorts.length - 1 ? sVal : null, short.ic.id);
      }

      use();
    } else if (!rem) setArg(raw);

    if (rem) err ||= uErr('-' + rem);
  }

  // finally, mark nodes as parsed then build tree and validate nodes
  cc && ok(cc);
  ok(pc);

  // run onBeforeValidate for all nodes per depth level incrementally
  // NOTE: expect onBeforeValidate to exist if part of `bAll`
  for (const c of bAll) c.cfg.options.onBeforeValidate!(c.node);

  // throw error before validation
  if (err) throw err;

  // validate and run onValidate for all nodes
  for (const c of all) {
    // validate node
    const n = c.node,
      { min, max } = n,
      len = n.args.length,
      cmin = min != null && min >= 0 && isFinite(min),
      cmax = max != null && max >= 0 && isFinite(max),
      m: [string | number, number?] | false =
        cmin && cmax && max >= min && (len < min || len > max)
          ? min === max
            ? [min, max]
            : [min + '-' + max]
          : cmin && len < min
            ? ['at least ' + min, min]
            : cmax && len > max && [max && 'up to ' + max, max];

    if (m) {
      const name = display(n);
      // prettier-ignore
      throw new ParseError(ParseError.RANGE_ERROR, `${name ? name + 'e' : 'E'}xpected ${m[0]} argument${m[1] === 1 ? '' : 's'}, but got ${len}.`, n);
    }

    // run onValidate if no errors
    c.cfg.options.onValidate?.(n);
  }

  // return the root node
  return all[0].node;
}
