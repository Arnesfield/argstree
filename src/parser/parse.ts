/* eslint-disable prefer-const */
import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { Alias, Config, InitializedConfig } from '../types/config.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { FallbackArgs } from '../types/spec.types';
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
  ok,
  uErr
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
    cNode: Node<T> | null | undefined, // child node (can be value node)
    cc: NodeContext<T> | null | undefined, // child node context
    pdstrict = true, // parent node strict descendants
    dstrict: boolean, // current child node strict descendants
    err: ParseError<T> | undefined; // error before validation

  function node(
    c: Config<T>,
    raw: string | null,
    key: string | null,
    value: string | null = null,
    cid = c.id,
    arg = value
  ) {
    // mark previous node as parsed before creating next node
    cc && ok(cc);

    const o = c.options,
      p = pc ? pc.ctx.node : null,
      // prettier-ignore
      { min, max, consume = true, id = cid ?? key, name = cid ?? key, strict: s, type = c.mapv || c.fallback ? 'command' : 'option' } = o;

    // prettier-ignore
    cNode = { id, name, raw, key, value, type, depth: p ? p.depth + 1 : 0, args: getArgs(o.args, arg), parent: p, children: [] };
    p?.children.push(cNode);

    const strict =
      s == null
        ? (dstrict = pdstrict)
        : typeof s === 'boolean'
          ? (dstrict = s)
          : !(dstrict = s !== 'self');

    // prettier-ignore
    cc = { cfg: c, ctx: { node: cNode, min, max, consume, strict, parent: pc ? pc.ctx : null } };

    o.onCreate?.(cc.ctx);
    pc?.cfg.options.onChild?.(pc.ctx);

    // save to before validate list if has onBeforeValidate callback
    o.onBeforeValidate && bAll.push(cc);
    all.push(cc);
  }

  function vNode(args: string[]) {
    const p = pc.ctx.node;
    // prettier-ignore
    p.children.push(cNode = { id: p.id, name: p.name, raw: p.raw, key: p.key, value: p.value, type: 'value', depth: p.depth + 1, args, parent: p, children: [] });
  }

  function next() {
    // set current child node context as new parent node context
    __assertNotNull(cc);
    pc = cc;

    // set dstrict for parent node context
    pdstrict = dstrict;

    // clear child node context since it's now the parent node
    cNode = cc = null;
  }

  function use() {
    __assertNotNull(cc);

    // check if not leaf node
    const o = cc.cfg.options;
    if (
      !(
        o.leaf ??
        !(cc.cfg.mapv || cc.cfg.fallback || (o.type && o.type !== 'option'))
      )
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
      cc?.ctx.consume &&
      !full(cc) &&
      !((strict ?? cc.ctx.strict) && (opt = isOption(raw)))
    ) {
      __assertNotNull(cNode);
      cNode.args.push(raw);
      return;
    }

    // if the raw argument isn't saved to the existing child node, mark the
    // child node as parsed before attempting to save it to the parent node
    if (cc) {
      ok(cc);
      cNode = cc = null;
    }

    // save value to parent node
    // unrecognized argument if parent cannot consume or if strict mode
    // at this point, the value of `opt` is either true or undefined
    if (
      !pc.ctx.consume ||
      full(pc) ||
      ((strict ?? pc.ctx.strict) && (opt ?? isOption(raw)))
    ) {
      return (err ||= uErr(pc, raw));
    }

    pc.ctx.node.args.push(raw);

    // if cNode exists, it is a value node
    // otherwise, create a new value node
    cNode ? cNode.args.push(raw) : vNode([raw]);
  }

  // create root node
  __assertNotNull(cfg);
  node(cfg, null, null);
  next();
  __assertNotNull(pc!);

  const root = pc.ctx.node;

  for (let a = 0; a < argv.length; a++) {
    if (!pc.cfg.mapv && !pc.cfg.fallback) {
      // if not strict mode for the current node,
      // capture the rest of the args until the end is reached
      // note that `end` is used twice:
      // once to get length of args and another for the end index

      let end: number | undefined;

      if (
        !cc &&
        pc.ctx.consume &&
        !pc.ctx.strict &&
        (pc.ctx.max == null ||
          (pc.ctx.max > (end = pc.ctx.node.args.length) &&
            ((end = a + pc.ctx.max - end), true)))
      ) {
        // when using fallback, `cNode` can already a value node
        const args = argv.slice(a, end);

        pc.ctx.node.args.push(...args);
        cNode ? cNode.args.push(...args) : vNode(args);

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
        cc?.ctx.min != null &&
        cc.ctx.consume === 'min' &&
        cc.ctx.min > cNode!.args.length &&
        !full(cc) &&
        !(cc.ctx.strict && isOption(raw));

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
      __assertNotNull(cNode);
      cNode.args.push(raw);
      continue;
    }

    let aliases: Alias<T>[] = [],
      alias: Alias<T> | undefined,
      skip: boolean | undefined, // skip fallback
      aVal: string | null | undefined, // alias value
      rem: string | undefined; // remainder

    // handle split
    // require length of at least 3 since keys with length of 2
    // should have been matched before this
    if (key.length > 2 && pc.cfg.aliasv && isOption(key, 'short')) {
      // incomplete aliases parsed
      let inc: boolean, o: Options<T> | string;

      // if an alias exists, stop loop if it requires a value or if not combinable
      for (
        i = 1;
        (inc = i < key.length) &&
        !(
          alias &&
          ((o = alias.cfg.options).combinable === false ||
            (o.min != null && o.min > size(o.args)))
        ) &&
        (ic = init(pc.cfg.alias[(o = key[i])])) &&
        (cfg = getCfg(ic)) &&
        (!alias || cfg.options.combinable !== false);
        i++
      ) {
        // delay pushing the last alias to the next iteration instead
        // so that the last alias is pushed outside only after condition checks
        alias && aliases.push(alias);
        alias = { key: o, ic, cfg };
      }

      // if incomplete aliases parsed, check if the rest of the argument
      // can be assigned and also go through the fallback function
      // otherwise, use the parsed value if it can be assigned

      if (!alias) {
        // continue to fallback if no alias was parsed
      } else if (
        inc &&
        (o = alias.cfg.options).max != null &&
        o.max <= size(o.args)
      ) {
        // if the config accepts no arguments, treat the rest as remainder
        aliases.push(alias);
        rem = key.slice(i);
      } else if ((value == null && !inc) || assign(alias.cfg)) {
        aliases.push(alias);
        // eslint-disable-next-line no-cond-assign
        aVal = (skip = !inc) ? value : raw.slice(i);
      } else rem = key.slice(i - 1);
    }

    // parse by fallback

    // remove `this` from function call
    let f = skip ? null : pc.cfg.fallback,
      // prettier-ignore
      res = f?.({ raw, key, value, remainder: rem, ctx: pc.ctx, childCtx: cc ? cc.ctx : null });

    // ignore raw argument
    if (res === false) continue;

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
        // handle parsed values (will set it to the current node)
        else for (const v of array((r as A).args)) setArg(v, (r as A).strict);
      }

      // always skip after successful fallback call
      continue;
    }

    // fallback done

    if (aliases.length > 0) {
      // process aliases (even partial)
      for (i = 0; i < aliases.length; i++) {
        // prettier-ignore
        node((alias = aliases[i]).cfg, raw, '-' + alias.key, i === aliases.length - 1 ? aVal : null, alias.ic.id);
      }
      use();
    } else if (!rem) setArg(raw);

    if (rem) err ||= uErr(pc, '-' + rem);
  }

  // finally, mark nodes as parsed then build tree and validate nodes
  cc && ok(cc);
  ok(pc);

  // run onBeforeValidate for all nodes per depth level incrementally
  // NOTE: expect onBeforeValidate to exist if part of `bAll`
  for (const c of bAll) c.cfg.options.onBeforeValidate!(c.ctx);

  // throw error before validation
  if (err) throw err;

  // validate and run onValidate for all nodes
  for (const c of all) {
    // validate node
    const { min, max } = c.ctx,
      len = c.ctx.node.args.length,
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
      const name = display(c.ctx.node);
      // prettier-ignore
      throw new ParseError(ParseError.RANGE_ERROR, `${name ? name + 'e' : 'E'}xpected ${m[0]} argument${m[1] === 1 ? '' : 's'}, but got ${len}.`, c.ctx);
    }

    // run onValidate if no errors
    c.cfg.options.onValidate?.(c.ctx);
  }

  // return the root node
  return root;
}
