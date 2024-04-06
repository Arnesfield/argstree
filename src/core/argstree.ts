import { Node, NodeOptions, ResolvedAlias } from '../lib/node.js';
import { isAssignable, isOption } from '../utils/arg.utils.js';
import * as T from './core.types.js';

/**
 * Parse arguments into a tree structure.
 * @param args The arguments to parse.
 * @param options The parse options.
 * @returns The node object.
 */
export function argstree(
  args: readonly string[],
  options: T.Options = {}
): T.Node {
  const root = new Node({ options });
  // this might seem counterintuitive, but assigned is being passed
  // around throughout multiple methods so it probably makes sense to
  // keep track of it here and only unset it before every parse iteration
  let parent = root,
    child: Node | null | undefined,
    assigned: string | null | undefined;

  function setArg(raw: string) {
    const options = parent.parse(raw);
    if (!options) {
      // raw arg is alias
      const list = parent.resolve([raw]);
      return list && setAlias(list);
    } else if (assigned == null || isAssignable(raw, options)) {
      // check if assignable
      set([{ raw, options }]);
      return true;
    }
  }

  function setAlias(list: ResolvedAlias[], remainder?: string[]) {
    // e.g. -fb=value, cases:
    // -b is null -> error
    // -b is not assignable -> treat as value
    // -b is assignable -> continue split
    // allow assign if no options or if assignable
    let arg: string, options: T.Options | null;
    if (
      assigned != null &&
      list.length > 0 &&
      (options = parent.parse((arg = list[list.length - 1].args[0]))) &&
      !isAssignable(arg, options)
    ) {
      return;
    }
    // treat left over from split as argument
    if (remainder && remainder.length > 0) {
      parent.unrecognized(remainder);
    }

    const items = list.map((item, index): NodeOptions => {
      const raw = item.args[0];
      return {
        raw,
        alias: item.alias,
        args: item.args.slice(1),
        // reuse last options when available
        options:
          (index >= list.length - 1 && options) || parent.parse(raw, true)
      };
    });
    set(items);

    return true;
  }

  function set(items: NodeOptions[]) {
    // skipping does not mean saving failed
    if (items.length === 0) {
      return;
    }
    // validate existing child then make new child
    child?.done();

    let nextChild: Node | undefined;
    const children = items.map((item, index) => {
      // make new child and save values
      // probably don't need to validate now since it will be
      // validated when changing child node or at the end of parse
      parent.children.push((child = new Node(item, parent.strict)));
      // save assigned to last saved node
      if (assigned != null && index >= items.length - 1) {
        child.args.push(assigned);
      }
      // if child has args, use this as next child
      return child.hasArgs ? (nextChild = child) : child;
    });

    // validate all children except next or latest child
    for (const child of children) {
      if (child !== (nextChild || child)) {
        child.done();
      }
    }

    // if this child has args, switch it for next parse iteration
    if (nextChild) {
      // since we're removing reference to parent, validate it now
      parent.done();
      parent = nextChild;
      child = null;
    }
  }

  // start parsing args
  // create copy of args to avoid modification
  for (const arg of args.slice()) {
    // 1 - check if arg matches any arguments. if valid, use options
    // 2 - check if arg matches any alias. if valid, use alias args
    // 3 - split by equal sign. otherwise, treat as value
    // 4 - after splitting equal sign, perform #1 and #2 for first part and check if assignable
    // 5 - if match, use second part value as an arg for child
    // 6 - if no match, split alias for first part
    // 7 - if has alias args, check if last option can be assigned
    // 8 - if assignable, use second part value as an arg for child (last option)
    // 9 - otherwise, use original arg and treat as value
    // 10 - for strict mode, error if value is an option-like

    // clear assigned every start of parse iteration
    assigned = null;
    if (setArg(arg)) {
      continue;
    }

    // no need to check for min index, always split equal sign
    // first part (last option if alias) is checked if assignable
    const equalIndex = arg.indexOf('=');
    // set assigned here
    const match =
      equalIndex > -1
        ? ((assigned = arg.slice(equalIndex + 1)), arg.slice(0, equalIndex))
        : arg;
    // skip the same call (assigned value not set)
    if (assigned != null && setArg(match)) {
      continue;
    }

    // treat first as is (alias) while the rest as values
    // if not successful, save arg as value
    // only check assignable if assigned value exists
    const split = parent.split(match);
    if (!split || !setAlias(split.list, split.remainder)) {
      // treat arg as value
      // if current node exists, check if it reached its max args, if not then save arg
      // otherwise, treat this as an arg for the main node
      const node = child?.read() ? child : parent;
      // strict mode: throw error if arg is an option-like
      if (node.strict && isOption(arg)) {
        node.unrecognized(arg);
      }
      node.args.push(arg);
    }
  }

  // finally, make sure to validate the rest of the nodes
  child?.done();
  parent.done();
  return root.build();
}
