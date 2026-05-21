import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import {
  Alias,
  Config,
  ConfigMap,
  InitializedConfig
} from '../types/config.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { SpecType, Value } from '../types/spec.types';
import { array } from '../utils/array';
import { __assertNotNull } from '../utils/assert';
import { hasValues } from '../utils/has-values';
import { number } from '../utils/number';
import { assign, Context, display, full, getArgs, ok, uErr } from './node';
import type { Spec } from './spec.class';

// NOTE: internal

export function init<T>(
  cfg: ConfigMap<T>[string]
): InitializedConfig<T> | null | undefined {
  // remove `this` from function call
  const ref = cfg?.ref;
  if (typeof ref === 'function') cfg!.ref = ref()?.cfg || null;
  return cfg as InitializedConfig<T> | null | undefined;
}

export function getCfg<T>(
  cfg: InitializedConfig<T>
): Config<T> | null | undefined {
  return cfg.ref !== undefined ? cfg.ref : cfg;
}

export function getType<T>(cfg: Config<T>): SpecType {
  return cfg.options.type || (hasValues(cfg.map) ? 'command' : 'option');
}

export function parse<T>(argv: readonly string[], cfg: Config<T>): Node<T>;

export function parse<T>(
  argv: readonly string[],
  cfg: Config<T> | null | undefined
): Node<T> {
  const all: Context<T>[] = [], // all node contexts
    bAll: Context<T>[] = []; // all with an onBeforeValidate callback option

  let pCtx: Context<T>, // parent node context
    cNode: Node<T> | null | undefined, // child node (can be value node)
    cCtx: Context<T> | null | undefined, // child node context
    pdstrict = true, // parent node strict descendants
    dstrict: boolean, // current child node strict descendants
    err: ParseError<T> | undefined, // error before validation
    a = 0; // argv index

  function node(
    c: Config<T>,
    raw: string | null,
    key: string | null,
    value: string | null = null,
    cid = c.id,
    arg: string | null = value
  ) {
    // mark previous node as parsed before creating next node
    cCtx && ok(cCtx);

    const o = c.options;
    const p = pCtx ? pCtx.node : null;
    const { id = cid ?? key, name = cid ?? key, strict: s } = o;

    // prettier-ignore
    cNode = { id, name, raw, key, value, type: getType(c), depth: p ? p.depth + 1 : 0, args: getArgs(o, arg), parent: p, children: [] };
    p?.children.push(cNode);

    // run onCreate and get parse options
    // prettier-ignore
    let { min = o.min, max = o.max, read = o.read ?? true } = o.onCreate?.(cNode) || o;
    // run onChild for parent node
    pCtx?.cfg.options.onChild?.(p!);

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

    cCtx = { cfg: c, node: cNode, min, max, read, strict };

    // save to list if node can be validated
    (min != null || max != null || o.onValidate) && all.push(cCtx);

    // save to before validate list if has onBeforeValidate callback
    o.onBeforeValidate && bAll.push(cCtx);
  }

  function vNode(args: string[]) {
    const p = pCtx.node;
    // prettier-ignore
    p.children.push(cNode = { id: p.id, name: p.name, raw: p.raw, key: p.key, value: p.value, type: 'value', depth: p.depth + 1, args, parent: p, children: [] });
  }

  /** Sets `cCtx` as the next `pCtx`. */
  function next() {
    // set current child node context as new parent node context
    __assertNotNull(cCtx);
    pCtx = cCtx;

    // set dstrict for parent node context
    pdstrict = dstrict;

    // clear child node context since it's now the parent node
    cNode = cCtx = null;
  }

  function use() {
    __assertNotNull(cCtx);

    // check if not leaf node
    const o = cCtx.cfg.options;
    if (
      !(
        o.leaf ??
        !(
          cCtx.cfg.fallback ||
          (o.type && o.type !== 'option') ||
          hasValues(cCtx.cfg.map)
        )
      )
    ) {
      ok(pCtx);
      next();
    } else if (!cCtx.read || full(cCtx)) {
      ok(cCtx);
      cNode = cCtx = null;
    }
  }

  function setArg(raw: string, strict?: boolean) {
    // if child is strict, pass it over to parent
    // if parent is non-strict, child is marked as parsed and accept arg

    // cache isOption result
    let opt: boolean | undefined;

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
      return (err ||= uErr(pCtx, raw));
    }

    pCtx.node.args.push(raw);

    // if cCtx exists, it means cNode is not a value node yet
    if (cCtx) {
      ok(cCtx);
      cCtx = null;
      vNode([raw]);
    }

    // save to value node if cNode exists
    // otherwise, add value node
    else cNode ? cNode.args.push(raw) : vNode([raw]);
  }

  // create root node
  __assertNotNull(cfg);
  node(cfg, null, null);
  // calling next() should set pCtx
  next();
  __assertNotNull(pCtx!);

  const root = pCtx.node;

  for (
    ;
    a < argv.length && (pCtx.cfg.fallback || hasValues(pCtx.cfg.map));
    a++
  ) {
    // eslint-disable-next-line prefer-const
    let raw = argv[a],
      key = raw,
      value: string | undefined,
      ic: InitializedConfig<T> | null | undefined,
      i = raw.indexOf('=');

    if (i > -1) {
      key = raw.slice(0, i);
      value = raw.slice(i + 1);
    }

    // get node by map
    if (
      (ic = init(pCtx.cfg.map?.[key])) &&
      (cfg = getCfg(ic)) &&
      (value == null || assign(cfg))
    ) {
      node(cfg, raw, key, value, ic.id);
      use();
      continue;
    }

    // eslint-disable-next-line prefer-const
    let aliases: Alias<T>[] = [],
      alias: Alias<T> | undefined,
      skip: boolean | undefined, // skip handler callback
      aVal: string | undefined, // alias value
      rem: string | undefined; // remainder

    // handle split
    // require length of at least 3 since keys with length of 2
    // should have been matched before this
    if (key.length > 2 && isOption(key, 'short') && hasValues(pCtx.cfg.alias)) {
      // incomplete aliases parsed
      let inc: boolean, m: string | number | null, o: Options<T>;

      // if an alias exists, stop loop if it requires a value
      for (
        i = 1;
        (inc = i < key.length) &&
        !(
          alias &&
          (m = number((o = alias.cfg.options).min)) != null &&
          m - array(o.args).length > 0
        ) &&
        (ic = init(pCtx.cfg.alias[(m = key[i])])) &&
        (cfg = getCfg(ic));
        i++
      ) {
        // delay pushing the last alias to the next iteration instead
        // so that the last alias is pushed outside only after condition checks
        alias && aliases.push(alias);
        alias = { id: ic.id, key: m, cfg };
      }

      // if incomplete aliases parsed, check if the rest of the argument
      // can be assigned and also go through the handler function (!noParse)
      // otherwise, use the parsed value if it can be assigned

      if (!alias) {
        // continue to handler if no alias was parsed
      } else if (
        inc &&
        (m = number((o = alias.cfg.options).max)) != null &&
        m - array(o.args).length < 1
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

    // parse by handler

    // remove `this` from function call
    const f = pCtx.cfg.fallback;
    let res = skip ? null : f?.({ raw, key, value, remainder: rem }, pCtx.node);

    // ignore raw argument
    if (res === false) continue;

    // default behavior if no parsed or true
    // default behavior if empty array
    // otherwise, iterate through parsed
    if (
      res &&
      res !== true &&
      (res = Array.isArray(res) ? res : [res]).length > 0
    ) {
      type V = Value;

      // allow the current working nodes to change
      for (const r of res) {
        if ((cfg = (r as Spec<T>).cfg)) {
          // do not include value to node.args
          // since we leave it to the handler to set the value as an argument
          node(cfg, raw, key, value, cfg.id, null);
          use();
        }
        // handle parsed values (will set it to the current node)
        else for (const v of array((r as V).args)) setArg(v, (r as V).strict);
      }

      // always skip after successful handler call
      continue;
    }

    // handler done

    if (aliases.length > 0) {
      // process aliases (even partial)
      for (i = 0; i < aliases.length; i++) {
        // prettier-ignore
        node((alias = aliases[i]).cfg, raw, '-' + alias.key, i === aliases.length - 1 ? aVal : null, alias.id);
      }
      use();
    } else if (!rem) setArg(raw);

    if (rem) err ||= uErr(pCtx, '-' + rem);
  }

  for (; a < argv.length; a++) {
    // if not strict mode for the current node,
    // capture the rest of the args until the end is reached
    // note that `end` is used twice:
    // once to get length of args and another for the end index
    // also note that `cNode` is expected to be a value node at this point

    let raw = argv[a],
      end: number | undefined;

    if (
      !cCtx &&
      pCtx.read &&
      !pCtx.strict &&
      (pCtx.max == null ||
        (pCtx.max > (end = pCtx.node.args.length) &&
          (end = a + pCtx.max - end)) !== false)
    ) {
      // when using unknown handler,
      // there is a chance that `cNode` is already a value node
      const args = argv.slice(a, end);

      pCtx.node.args.push(...args);
      cNode ? cNode.args.push(...args) : vNode(args);

      // stop here if the rest of the args were captured
      if (end == null || end >= argv.length) break;

      // call setArg for next raw argument
      raw = argv[(a = end)];
    }

    setArg(raw);
  }

  // finally, mark nodes as parsed then build tree and validate nodes
  cCtx && ok(cCtx);
  ok(pCtx);

  // run onBeforeValidate for all nodes per depth level incrementally
  // NOTE: expect onBeforeValidate to exist if part of `bAll`
  for (const c of bAll) c.cfg.options.onBeforeValidate!(c.node);

  // throw error before validation
  if (err) throw err;

  // validate and run onValidate for all nodes
  for (const c of all) {
    // validate node
    const { min, max } = c;
    const len = c.node.args.length;
    const m: [string | number, number] | null =
      min != null && max != null && (len < min || len > max)
        ? min === max
          ? [min, min]
          : [min + '-' + max, 0]
        : min != null && len < min
          ? ['at least ' + min, min]
          : max != null && len > max
            ? [max && 'up to ' + max, max]
            : null;

    if (m) {
      const name = display(c.node);
      // prettier-ignore
      throw new ParseError(ParseError.RANGE_ERROR, `${name ? name + 'e' : 'E'}xpected ${m[0]} argument${m[1] === 1 ? '' : 's'}, but got ${len}.`, c.node);
    }

    // run onValidate if no errors
    c.cfg.options.onValidate?.(c.node);
  }

  // return the root node
  return root;
}
