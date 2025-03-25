import { ParseError } from '../core/error.js';
import { Config } from '../schema/schema.types.js';
import { Arg, Node as INode } from '../types/node.types.js';
import { isOption } from '../utils/arg.js';
import { display } from '../utils/display.js';
import { Node, NodeOptions, NodeSplit } from './node.js';
import { normalize, NormalizedOptions } from './normalize.js';

// NOTE: internal

interface Stack {
  tree: Node;
  node?: INode;
  parent: INode | null;
}

function toArg(raw: string, alias: string | null): Arg {
  const index = raw.lastIndexOf('=');
  const split = index > -1;
  return {
    raw,
    key: split ? raw.slice(0, index) : raw,
    alias,
    value: split ? raw.slice(index + 1) : null
  };
}

export function parse(args: readonly string[], cfg: Config): INode {
  // keep track of and reuse existing normalized options
  const map = new WeakMap<Config, NormalizedOptions>();
  function n(opts: NodeOptions, dstrict?: boolean) {
    let nOpts;
    (nOpts = map.get(opts.cfg)) || map.set(opts.cfg, (nOpts = normalize(opts)));
    return new Node(nOpts, opts, dstrict);
  }

  const root: Stack = { tree: n({ cfg }), parent: null };
  let parent = root.tree,
    child: Node | null | undefined;

  function unrecognized(
    msg: string,
    reason = ParseError.UNRECOGNIZED_ARGUMENT_ERROR
  ): never {
    const name = display(parent.data);
    throw new ParseError(
      reason,
      (name ? name + 'does not recognize the ' : 'Unrecognized ') + msg,
      parent.data
    );
  }

  function setAlias(aliases: NodeSplit['list'], value?: string | null) {
    // assignable arg --option: initial 1, 2
    // alias -a: --option=3, 4, 5
    // scenario: -a=6

    // convert aliases to options
    // make sure the last option is assignable
    const hasValue = value != null;
    const lastAlias = aliases[aliases.length - 1];
    const lastArg = toArg(lastAlias.args[0], lastAlias.name);
    const lastParsed = parent.parse(lastArg, { hasValue });

    // skip if assiging a value to alias but no parsed last options
    if (hasValue && !lastParsed) return;

    // at this point, if a value is assigned, lastParsed would always be set
    // otherwise, lastParsed was parsed normally like the loop below.
    // this ensures that the options.handler call is not called twice

    const items = aliases.flatMap((alias, i) => {
      const last = i === aliases.length - 1;
      const arg = last ? lastArg : toArg(alias.args[0], alias.name);
      // no need to check assignable here since
      // we only need to check that for the last alias arg
      const parsed = last ? lastParsed : parent.parse(arg);

      if (!parsed) {
        unrecognized(`argument from alias '${alias.name}': ${arg.raw}`);
      }

      // assume parsed always contains at least 1 item
      // save alias args to the last item only
      const item = parsed[parsed.length - 1];
      item.args.push(...alias.args.slice(1));
      // add value to the last item (assume last item is assignable)
      last && hasValue && item.args.push(value);

      return parsed;
    });
    set(items);

    return true;
  }

  function set(items: NodeOptions[]) {
    // mark existing child as parsed then make new children
    child?.done();

    // consider items: [option1, command1, option2, command2, option3]
    // the previous implementation would only get
    // the last child that can have children (command2)
    // now, only the last child is checked if it can have children (option3)
    // why? it may be unfair for command1 if command2 is chosen
    // just because it was the last child that can do so.
    // handling this edge case probably has no practical use
    // and just adds more complexity for building the tree later

    for (let i = 0; i < items.length; i++) {
      // create child nodes from options
      parent.children.push((child = n(items[i], parent.dstrict)));

      // mark all children as parsed except the last child
      i < items.length - 1 && child.done();
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

  function setValue(raw: string) {
    // check if child can read one more argument
    // fallback to parent if child cannot accept anymore args
    const curr =
      child &&
      (child.opts.range.maxRead == null ||
        child.opts.range.maxRead > child.data.args.length)
        ? child
        : parent;
    // strict mode: throw error if arg is an option-like
    curr.strict && isOption(raw) && unrecognized(`option: ${raw}`);
    curr.data.args.push(raw);
  }

  for (const raw of args) {
    // immediately treat as value if the current node
    // cannot actually create children
    if (!parent.opts.fertile) {
      setValue(raw);
      continue;
    }

    // assume arg.raw and raw are the same
    const arg = toArg(raw, null);
    const hasValue = arg.value != null;
    let parsed, split;

    // parse options from options.args only
    if ((parsed = parent.parse(arg, { exact: true }))) {
      set(parsed);
    }

    // at this point, if there are no parsed options, arg can be:
    // - an exact alias
    // - a merged alias
    // - options from handler
    // - a value (or, if in strict mode, an unknown option-like)
    // for this case, handle exact alias
    else if (raw in parent.opts.aliases && setAlias(parent.alias([raw]))) {
      // setAlias was successful, do nothing and go to next iteration
    } else if (
      hasValue &&
      arg.key in parent.opts.aliases &&
      setAlias(parent.alias([arg.key]), arg.value)
    ) {
      // setAlias was successful, do nothing and go to next iteration
    }

    // now, arg cannot be an exact alias.
    // try to split raw by aliases
    // if no remainder, resolve split aliases with no value
    // otherwise, split arg.name by aliases if not the same as raw
    // if no remainder, resolve split aliases with arg.value
    // otherwise, parse by handler
    // if has value, use parsed options
    // otherwise, arg must either be a value or an incorrect merged alias
    // if there are split remainders, throw error
    // otherwise, treat as value
    // if value is an option-like with strict mode, throw error
    // otherwise, save value to node.args

    // split cases:
    // - raw no equal sign, same key (-abc, -abc, null)
    // - raw equal sign, different key no equal sign (-abc=1, -abc, 1)
    // - raw equal sign, different key equal sign (-abc=a=1, -abc=a, 1)

    // if safe alias (no alias equal signs),
    // then there is no reason to split raw as raw could contain an equal sign
    // if unsafe, split raw
    // if unsafe, split arg.key only if it does not match raw (hasValue)
    else if (
      !parent.opts.safeAlias &&
      (split = parent.split(raw)) &&
      split.remainder.length === 0 &&
      setAlias(split.list)
    ) {
      // you would think it might be ideal to stop parent.split()
      // when it finds at least 1 remainder, but we'll need to display
      // the list of remainders for the error message anyway,
      // so this is probably ok.
      // also set alias was successful, do nothing and go to next iteration
    } else if (
      (parent.opts.safeAlias || hasValue) &&
      (split = parent.split(arg.key)) &&
      split.remainder.length === 0 &&
      setAlias(split.list, arg.value)
    ) {
      // setAlias was successful, do nothing and go to next iteration
    }

    // parse options using handler
    else if ((parsed = parent.handle(arg))) {
      // use arg.key as key here despite not using arg.value
      // assume that the consumer handles arg.value manually
      set(parsed);
    }

    // split can be unset by the 2nd parent.split() call
    // which is ok since it would be weird to show remainders from raw
    else if (split && split.remainder.length > 0) {
      unrecognized(
        'alias' +
          (split.remainder.length === 1 ? '' : 'es') +
          ': -' +
          split.items
            .map(item => (item.remainder ? `(${item.value})` : item.value))
            .join(''),
        ParseError.UNRECOGNIZED_ALIAS_ERROR
      );
    }

    // treat as value
    else {
      setValue(raw);
    }
  }

  // finally, mark nodes as parsed then build tree and validate nodes
  child?.done();
  parent.done();

  const stack = [root];
  for (let i = 0; i < stack.length; i++) {
    const item = stack[i];
    item.node = item.tree.node(item.parent);

    // insert children to stack at current index
    const items = item.tree.children.map(
      (c): Stack => ({ tree: c, parent: item.node! })
    );
    stack.splice(i + 1, 0, ...items);
  }

  // validate from the end of stack
  for (let i = stack.length - 1; i >= 0; i--) {
    const { node, tree } = stack[i] as Required<Stack>;
    if (typeof tree.opts.src.postParse === 'function') {
      // preserve `this` for callbacks
      tree.opts.src.postParse(tree.error, node);
    } else if (tree.error) {
      // throw error if any if no postParse
      throw tree.error;
    }
  }

  // assume root.node will always be set after loop above
  return root.node!;
}
