import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { Node as INode } from '../types/node.types';
import { Value } from '../types/options.types';
import { Schema } from '../types/schema.types';
import { NonEmptyArray } from '../types/util.types';
import { array } from '../utils/array';
import { cnode, NodeOptions } from './cnode';
import { Node, Parsed } from './node';
import { normalize, NormalizedOptions } from './normalize';
import { resolve } from './resolve';

// NOTE: internal

export function parse<T>(args: readonly string[], schema: Schema<T>): INode<T> {
  // keep track of and reuse existing normalized options
  const map = new WeakMap<Schema<T>, NormalizedOptions<T>>();
  function node(opts: NodeOptions<T>, raw?: string | null, curr?: Node<T>) {
    const s = opts.schema;
    const data = cnode(opts, raw, curr?.node, opts.args);

    let nOpts;
    (nOpts = map.get(s)) || map.set(s, (nOpts = normalize(s, data)));

    return new Node<T>(s, nOpts, data, curr);
  }

  const root = node({ schema });
  root.cb('onDepth');
  const nodes = [root];
  let parent: Node<T> = root,
    child: Node<T> | null | undefined;

  function cdone() {
    // NOTE: assume child exists whenever this function is called
    // mark child as parsed and unset it
    if (
      !(
        child!.ctx.read &&
        (child!.ctx.max == null || child!.ctx.max > child!.node.args.length)
      )
    ) {
      child!.done();
      child = null;
    }
  }

  function set(raw: string, items: NonEmptyArray<NodeOptions<T>>) {
    // consider items: [option1, command1, option2, command2, option3]
    // the previous implementation would only get
    // the last child that can have children (command2)
    // now, only the last child is checked if it can have children (option3)
    // why? it may be unfair for command1 if command2 is chosen
    // just because it was the last child that can do so.
    // handling this edge case probably has no practical use
    // and just adds more complexity for building the tree later

    for (const item of items) {
      // mark existing child as parsed then make new child
      child?.done();

      // create child node from options
      nodes.push((child = node(item, raw, parent)));
    }

    // assume child always exists (items has length)
    // use child as next parent if it's not a leaf node
    if (!child!.opts.leaf) {
      // since we're removing reference to parent, mark it as parsed
      parent.done();
      parent = child!;
      child = null;
    }

    // if child cannot accept args, mark it as parsed
    else cdone();
  }

  function setValue(raw: string, strict?: boolean) {
    // normally, you'd check if the child node can read one more argument
    // assume that it already can since there is a child.read() check
    // in the set() call where the child node is set
    // otherwise, fallback to parent if child cannot accept any more args
    // if parent cannot read args, assume unrecognized argument

    // prettier-ignore
    const curr =
      child ||
      (parent.ctx.read
        ? parent
        : parent.opts.fertile
          ? parent.error(`option or command: ${raw}`)
          : parent.error(`xpected no arguments, but got: ${raw}`, undefined, 'e', 'E'));

    // strict mode: throw error if arg is an option-like
    (strict ?? curr.strict) && isOption(raw) && curr.error(`option: ${raw}`);
    curr.node.args.push(raw);

    // if saving to parent, save arg to the value node
    curr === parent && curr.value(raw);

    curr.cb('onArg');

    // if argument was saved to the child node,
    // mark it as parsed if it cannot accept anymore arguments
    curr === child && cdone();
  }

  for (const raw of args) {
    let p: Parsed<T>[] | undefined;
    const arg = resolve(parent.opts, raw);

    // treat as value
    if (!arg) setValue(raw);
    // save resolved options
    else if (arg.items) set(raw, arg.items);
    // parse options using parser before error
    else if ((p = parent.parse(arg))) {
      type S = Schema<T>;
      type V = Value;
      const opts: NodeOptions<T>[] = [];

      for (const v of p) {
        if ((v as S).schemas) opts.push({ key: arg.key, schema: v as S });
        else for (const a of array((v as V).args)) setValue(a, (v as V).strict);
      }

      opts.length > 0 && set(raw, opts as NonEmptyArray<NodeOptions<T>>);
    }

    // throw error if split remainders are present
    else if (arg.split) {
      const msg =
        `alias${arg.split.remainders.length === 1 ? '' : 'es'}: -` +
        arg.split.items
          .map(i => (i.remainder ? `(${i.value})` : i.value))
          .join('');
      parent.error(msg, ParseError.UNRECOGNIZED_ALIAS_ERROR);
    }

    // treat as value
    else setValue(raw);
  }

  // finally, mark nodes as parsed then build tree and validate nodes
  child?.done();
  parent.done();

  // run onBeforeValidate for all nodes per depth level incrementally
  for (const n of nodes) n.cb('onBeforeValidate');

  // validate and run onValidate for all nodes
  for (const n of nodes) n.check();

  return root.node;
}
