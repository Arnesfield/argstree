import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { Schema } from '../schema/schema.types';
import { Node as INode } from '../types/node.types';
import { NonEmptyArray } from '../types/util.types';
import { cnode, NodeOptions } from './cnode';
import { HandlerResult, Node } from './node';
import { normalize, NormalizedOptions } from './normalize';
import { Resolver } from './resolver';

// NOTE: internal

export function parse<T>(args: readonly string[], schema: Schema<T>): INode<T> {
  // keep track of and reuse existing normalized options
  const map = new WeakMap<Schema<T>, NormalizedOptions<T>>();
  function node(raw: string | null, opts: NodeOptions<T>, curr?: Node<T>) {
    const s = opts.schema;
    const data = cnode(raw, opts, curr ? curr.data : null, opts.args);

    let nOpts;
    (nOpts = map.get(s)) || map.set(s, (nOpts = normalize(s, data)));

    return new Node<T>(s, nOpts, data, curr);
  }

  const root = node(null, { schema });
  root.cb('onDepth');
  const nodes = [root];
  let parent: Node<T> = root,
    child: Node<T> | null | undefined;

  function unrecognized(msg: string, code?: string): never {
    parent.error('does not recognize the ', 'Unrecognized ', msg, code);
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
      nodes.push((child = node(raw, item, parent)));
      parent.children.push(child);
      parent.data.children.push(child.data);

      parent.cb('onChild');
    }

    // assume child always exists (items has length)
    // use child as next parent if it's not a leaf node
    if (!child!.opts.leaf) {
      // since we're removing reference to parent, mark it as parsed
      parent.done();
      parent = child!;
      child = null;
    }
  }

  function setValue(raw: string, noStrict?: boolean) {
    // check if child can read one more argument
    // fallback to parent if child cannot accept any more args
    // if parent cannot read args, assume unrecognized argument
    const curr =
      child?.ctx.read &&
      (child.ctx.max == null || child.ctx.max > child.data.args.length)
        ? child
        : parent.ctx.read
          ? parent
          : parent.opts.fertile
            ? unrecognized(`option or command: ${raw}`)
            : parent.error('e', 'E', `xpected no arguments, but got: ${raw}`);

    // strict mode: throw error if arg is an option-like
    !noStrict && curr.strict && isOption(raw) && unrecognized(`option: ${raw}`);
    curr.data.args.push(raw);

    // if saving to parent, save args to the value node
    curr === parent && curr.value(raw);

    curr.cb('onArg');
  }

  const resolver = new Resolver<T>();
  for (const raw of args) {
    let hres: HandlerResult<T> | undefined;
    const res = resolver.resolve(raw, parent.opts);

    // treat as value
    if (!res) {
      setValue(raw);
    }

    // save resolved options
    else if (res.items) {
      set(raw, res.items);
    }

    // parse options using handler before error
    else if ((hres = parent.handle(res.arg))) {
      for (const arg of hres.args) setValue(arg, true);

      type O = NonEmptyArray<NodeOptions<T>>;
      hres.opts.length > 0 && set(raw, hres.opts as O);
    }

    // throw error if split remainders are present
    else if (res.split) {
      const msg =
        'alias' +
        (res.split.remainder.length === 1 ? '' : 'es') +
        ': -' +
        res.split.items
          .map(item => (item.remainder ? `(${item.value})` : item.value))
          .join('');
      unrecognized(msg, ParseError.UNRECOGNIZED_ALIAS_ERROR);
    }

    // treat as value
    else {
      setValue(raw);
    }
  }

  // finally, mark nodes as parsed then build tree and validate nodes
  child?.done();
  parent.done();

  // run onBeforeValidate for all nodes per depth level incrementally
  for (const item of nodes) item.cb('onBeforeValidate');

  // validate and run onValidate for all nodes
  for (const item of nodes) item.check();

  return root.data;
}
