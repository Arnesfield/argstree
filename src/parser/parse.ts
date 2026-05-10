import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { Alias, Config } from '../types/config.types';
import { Node } from '../types/node.types';
import { Options, Value } from '../types/options.types';
import { array } from '../utils/array';
import { __assertNotNull } from '../utils/assert';
import { hasValues } from '../utils/has-values';
import { number } from '../utils/number';
import { assign, Context, display, full, getArgs, ok, uErr } from './node';
import { Parser } from './parser';

// NOTE: internal

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
    pdstrict: boolean | undefined, // parent node strict descendants
    dstrict: boolean | undefined, // current child node strict descendants
    err: ParseError<T> | undefined; // error before validation

  function node(
    c: Config<T>,
    raw: string | null,
    key: string | null,
    value: string | null = null
  ) {
    // mark previous node as parsed before creating next node
    cCtx && ok(cCtx);

    // make sure to initialize config before accessing options
    // creating the parser instance should mutate and initialize
    // the config object
    // also note that this is a partial initialization check
    !c.map && c.options.init && new Parser(c);

    const o = c.options;
    const p = pCtx ? pCtx.node : null;
    const { id = key, name = key, strict: s } = o;

    // prettier-ignore
    cNode = { id, name, raw, key, value, type: c.type, depth: p ? p.depth + 1 : 0, args: getArgs(o, value), parent: p, children: [] };
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
        ? (dstrict = pdstrict ?? true)
        : typeof s === 'boolean'
          ? (dstrict = s)
          : !(dstrict = s !== 'self');

    // set initial value to pdstrict
    if (pdstrict == null) pdstrict = strict;

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

  function use() {
    __assertNotNull(cCtx);

    // check if not leaf node
    if (
      !(
        cCtx.cfg.options.leaf ??
        (!cCtx.cfg.options.parser &&
          cCtx.cfg.type === 'option' &&
          !hasValues(cCtx.cfg.map))
      )
    ) {
      ok(pCtx);

      // set current child node context as new parent node context
      pCtx = cCtx;
      pdstrict = dstrict;
      cNode = cCtx = null;
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

  __assertNotNull(cCtx);
  pCtx = cCtx;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cNode = cCtx = null as any;

  const root = pCtx.node;

  for (let a = 0; a < argv.length; a++) {
    let raw = argv[a];

    if (!pCtx.cfg.options.parser && !hasValues(pCtx.cfg.map)) {
      // if a value node exists and not strict mode for the current node,
      // capture all args up until the end is reached if it's not null
      // allow number and undefined for end value
      // note that `end` is used twice:
      // once to get length of args and another for the end index
      // also note that `cNode` is expected to be a value node at this point
      let end: number | null | undefined;
      if (
        pCtx.read &&
        !pCtx.strict &&
        (end =
          pCtx.max == null
            ? undefined
            : pCtx.max > (end = pCtx.node.args.length)
              ? a + pCtx.max - end
              : null) !== null
      ) {
        // when using options.parser,
        // there is a change that the `cNode` is already a value node
        const args = argv.slice(a, end);
        cNode ? cNode.args.push(...args) : vNode(args);
        pCtx.node.args.push(...args);

        // stop here if capturing all args
        if (end == null || end >= argv.length) break;

        // call setArg for next raw argument
        raw = argv[(a = end)];
      }

      setArg(raw);
      continue;
    }

    let key = raw,
      value: string | undefined,
      i = raw.indexOf('='),
      // eslint-disable-next-line prefer-const
      noVal = i === -1; // would imply `value == null`

    if (!noVal) {
      key = raw.slice(0, i);
      value = raw.slice(i + 1);
    }

    // get node by map
    if ((cfg = pCtx.cfg.map?.[key]) && (noVal || assign(cfg))) {
      node(cfg, raw, key, value);
      use();
      continue;
    }

    // eslint-disable-next-line prefer-const
    let aliases: Alias<T>[] = [],
      alias: Alias<T> | undefined,
      noParse: boolean | undefined, // skip parser callback
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
        (cfg = pCtx.cfg.alias[(m = key[i])]);
        i++
      ) {
        // delay pushing the last alias to the next iteration instead
        // so that the last alias is pushed outside only after condition checks
        alias && aliases.push(alias);
        alias = { key: m, cfg };
      }

      // if incomplete aliases parsed, check if the rest of the argument
      // can be assigned and also go through the parser function (!noParse)
      // otherwise, use the parsed value if it can be assigned

      if (!alias) {
        // continue to parser if no alias was parsed
      } else if (
        inc &&
        (m = number((o = alias.cfg.options).max)) != null &&
        m - array(o.args).length < 1
      ) {
        // if the config accepts no arguments, treat the rest as remainder
        aliases.push(alias);
        rem = key.slice(i);
      } else if ((noVal && !inc) || assign(alias.cfg)) {
        aliases.push(alias);
        // eslint-disable-next-line no-cond-assign
        aVal = (noParse = !inc) ? value : raw.slice(i);
      } else rem = key.slice(i - 1);
    }

    // parse by parser

    // prettier-ignore
    let res = noParse ? null : pCtx.cfg.options.parser?.({ raw, key, value, remainder: rem }, pCtx.node);
    // ignore raw argument
    if (res === false) continue;

    // default behavior if no parsed or true
    // default behavior if empty array
    // otherwise, iterate through parsed
    if (
      res != null &&
      res !== true &&
      (res = Array.isArray(res) ? res : [res]).length > 0
    ) {
      type V = Value;

      // allow the current working nodes to change
      for (const r of res) {
        if ((r as Parser<T>).cfg) {
          // set node value but not for args
          // since we leave it to the parser to set the value as an argument
          node((r as Parser<T>).cfg, raw, key);

          __assertNotNull(cNode);
          cNode.value = value ?? null;

          use();
        }
        // handle parsed values (will set it to the current node)
        else for (const v of array((r as V).args)) setArg(v, (r as V).strict);
      }

      // always skip after successful parser call
      continue;
    }

    // parser done

    if (aliases.length > 0) {
      // process aliases (even partial)
      for (i = 0; i < aliases.length; i++) {
        // prettier-ignore
        node((alias = aliases[i]).cfg, raw, '-' + alias.key, i === aliases.length - 1 ? aVal : null);
      }
      use();
    } else if (!rem) setArg(raw);

    if (rem) err ||= uErr(pCtx, '-' + rem);
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
