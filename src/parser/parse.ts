import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { split, Split } from '../lib/split';
import { Node as INode } from '../types/node.types';
import { Context, Value } from '../types/options.types';
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
  opts?: NormalizedOptions<T>;
  children: NodeInfo<T>[];
}

type NormalizedNodeInfo<T> = Required<NodeInfo<T>>;

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
  for (const c of info.children) cb(c.ctx, 'onDepth');
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
  // keep track of and reuse existing normalized options
  const map = new WeakMap<Schema<T>, NormalizedOptions<T>>(),
    list: NodeInfo<T>[] = [];

  let info: NodeInfo<T>,
    pInfo: NormalizedNodeInfo<T>,
    cNode: INode<T> | null | undefined,
    cInfo: NormalizedNodeInfo<T> | null | undefined,
    err: { pos: number; error: ParseError<T> } | undefined;

  function make(
    schema: Schema<T>,
    raw: string | null,
    key: string | null,
    value: string | null = null,
    alias: string | null = null,
    aArgs?: string[]
  ) {
    // create copy of args
    const args = array(schema.options.args, true);
    aArgs && args.push(...aArgs);
    value != null && args.push(value);

    const p = pInfo ? pInfo.ctx.node : null;

    // prettier-ignore
    const { type, options: { id = key, name = key } } = schema;
    // prettier-ignore
    const node: NodeData<T> = { id, name, raw, key, alias, value, type, depth: p ? p.depth + 1 : 0, args, parent: p, children: [] };
    p?.children.push(node);

    let dstrict: boolean;
    const { min = null, max = null, read = true, strict: s } = schema.options;
    const strict =
      s == null
        ? (dstrict = !!pInfo?.dstrict)
        : typeof s === 'boolean'
          ? (dstrict = s)
          : !(dstrict = s !== 'self');

    // prettier-ignore
    list.push(info = { dstrict, children: [], ctx: { min, max, read, strict, node, schema } });

    // run callback options
    cb(info.ctx, 'onCreate');
    if (pInfo) {
      pInfo.children.push(info);
      cb(pInfo.ctx, 'onChild');
    }
  }

  function nInfo() {
    const { node, schema } = info.ctx;
    (info.opts = map.get(schema)) ||
      map.set(schema, (info.opts = normalize(schema, node)));
    return info as NormalizedNodeInfo<T>;
  }

  function use() {
    const { node, schema } = info.ctx;

    if (!isLeaf(schema)) {
      ok(pInfo);

      pInfo = nInfo();
      cNode = cInfo = null;
    } else {
      cInfo && ok(cInfo);

      if (schema.options.max == null || node.args.length < schema.options.max) {
        cNode = node;
        cInfo = nInfo();
      } else {
        cNode = cInfo = null;
      }
    }
  }

  // function node(opts: NodeOptions<T>, raw?: string | null, curr?: Node<T>) {
  //   const s = opts.schema;
  //   const data = cnode(opts, raw, curr?.node, opts.args);

  //   let nOpts;
  //   (nOpts = map.get(s)) || map.set(s, (nOpts = normalize(s, data)));

  //   return new Node<T>(s, nOpts, data, curr);
  // }

  make(schema, null, null);
  const rInfo = (pInfo = nInfo());
  cb(rInfo.ctx, 'onDepth');

  // const root = node({ schema });
  // root.cb('onDepth');
  // const nodes = [root];
  // let parent: Node<T> = root,
  //   child: Node<T> | null | undefined,
  // let err: { pos: number; error: ParseError<T> } | undefined;

  /** Saves the {@linkcode ParseError} to throw later during validation. */
  function nErr(e: ParseError<T> | undefined) {
    err ||= e && { pos: list.length, error: e };
  }

  // function cOk() {
  //   // NOTE: assume child exists whenever this function is called
  //   // mark child as parsed and unset it if it cannot accept any more arguments
  //   if (child!.read()) return;
  //   child!.ok();
  //   child = null;
  // }

  // function set(raw: string, items: NonEmptyArray<NodeOptions<T>>) {
  //   // consider items: [option1, command1, option2, command2, option3]
  //   // the previous implementation would only get
  //   // the last child that can have children (command2)
  //   // now, only the last child is checked if it can have children (option3)
  //   // why? it may be unfair for command1 if command2 is chosen
  //   // just because it was the last child that can do so.
  //   // handling this edge case probably has no practical use
  //   // and just adds more complexity for building the tree later

  //   for (const item of items) {
  //     // mark existing child as parsed then make new child
  //     child?.ok();

  //     // create child node from options
  //     nodes.push((child = node(item, raw, parent)));
  //   }

  //   // assume child always exists (items has length)
  //   // use child as next parent if it's not a leaf node
  //   if (!child!.opts.leaf) {
  //     // since we're removing reference to parent, mark it as parsed
  //     parent.ok();
  //     parent = child!;
  //     child = null;
  //   }

  //   // if child cannot accept args, mark it as parsed
  //   else cOk();
  // }

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
      (!(pInfo.ctx.read ?? true) &&
        (pInfo.ctx.max == null ||
          pInfo.ctx.max > pInfo.ctx.node.args.length)) ||
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

  // function setValue(raw: string, strict?: boolean) {
  //   // normally, you'd check if the child node can read one more argument
  //   // assume that it already can since there is a child.read() check
  //   // in the set() call where the child node is set
  //   // otherwise, fallback to parent if child cannot accept any more args
  //   // if parent cannot read args, assume unrecognized argument

  //   const curr = child || (parent.read() && parent);

  //   // strict mode: throw error if arg looks like an option
  //   // save isOption value so there's no need to re-evaluate it
  //   let opt: boolean | undefined;

  //   // the parent is checked first for strict mode
  //   // since it is the node that parses child nodes as options
  //   // also throw if no current node (assume parent.read() is false)
  //   if (!curr || ((strict ?? parent.ctx.strict) && (opt = isOption(raw)))) {
  //     return nErr(parent.error(`argument: ${raw}`));
  //   }

  //   // condition here is if child exists since we can assume
  //   // that the child will be the current node (curr === child)
  //   if (child && (strict ?? child.ctx.strict) && (opt ?? isOption(raw))) {
  //     return nErr(child.error(`argument: ${raw}`));
  //   }

  //   curr.node.args.push(raw);

  //   // if saving to parent, save arg to the value node
  //   curr === parent && curr.value(raw);

  //   curr.cb('onArg');

  //   // if argument was saved to the child node,
  //   // mark it as parsed if it cannot accept anymore arguments
  //   curr === child && cOk();
  // }

  for (const raw of args) {
    let key = raw,
      value: string | undefined;
    const index = raw.indexOf('=');
    if (index > -1) {
      key = raw.slice(0, index);
      value = raw.slice(index + 1);
    }

    const { ctx, opts } = pInfo;
    let schema = opts.map[key],
      alias: Alias | undefined;

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
        // TODO: throw split after failed parser
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

    let parsed = ctx.schema.options.parser?.({ raw, key, value }, ctx);
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

      let hasNodes: boolean | undefined;
      for (const p of parsed) {
        if ((p as Schema<T>).schemas) {
          hasNodes = true;
          // no value since it is handler by parser
          make(p as Schema<T>, raw, key);
        } else for (const v of array((p as V).args)) setValue(v, (p as V).strict); // prettier-ignore
      }

      // skip if value was set (parsed.length > 0) but no created nodes
      if (hasNodes) {
        use();
        continue;
      }
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
  ok(pInfo);
  cInfo && ok(cInfo);

  // // finally, mark nodes as parsed then build tree and validate nodes
  // child?.ok();
  // parent.ok();

  // // run onBeforeValidate for all nodes per depth level incrementally
  // for (const n of nodes) n.cb('onBeforeValidate');

  // // validate and run onValidate for all nodes
  // let i = 0;
  // for (const n of nodes) {
  //   n.done();
  //   // throw the error at the given position
  //   // assume that position can never be 0
  //   if (++i === err?.pos) throw err.error;
  // }

  for (const n of list) cb(n.ctx, 'onBeforeValidate');

  let l = 0;
  for (const n of list) {
    done(n.ctx);
    // throw the error at the given position
    // assume that position can never be 0
    if (++l === err?.pos) throw err.error;
  }

  return rInfo.ctx.node;
}
