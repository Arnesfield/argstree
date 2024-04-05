import { isAssignable, isOption } from '../utils/arg.utils.js';
import { ResolvedAlias } from './alias.js';
import { Node, NodeOptions } from './node.js';

export class Parser {
  private parent: Node;
  private child: Node | null | undefined;
  // this might seem counterintuitive, but assigned is being passed
  // around throughout multiple methods so it probably makes sense to
  // keep track of it here and only unset it before every parse iteration
  private assigned: string | null | undefined;

  constructor(private readonly root: Node) {
    this.parent = root;
  }

  private parseArg(arg: string) {
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
    this.assigned = null;
    if (this.saveArg(arg)) {
      return;
    }

    // no need to check for min index, always split equal sign
    // first part (last option if alias) is checked if assignable
    const equalIndex = arg.indexOf('=');
    // set assigned here
    const match =
      equalIndex > -1
        ? ((this.assigned = arg.slice(equalIndex + 1)),
          arg.slice(0, equalIndex))
        : arg;
    // skip the same saveArg call (assigned value not set)
    if (this.assigned != null && this.saveArg(match)) {
      return;
    }

    // treat first as is (alias) while the rest as values
    // if not successful, save arg as value
    // only check assignable if assigned value exists
    const split = this.parent.split(match);
    if (!split || !this.saveAlias(split.list, split.remainder)) {
      // treat arg as value
      // if current node exists, check if it reached its max args, if not then save arg
      // otherwise, treat this as an arg for the main node
      const node = this.child?.read() ? this.child : this.parent;
      // strict mode: throw error if arg is an option-like
      if (node.strict && isOption(arg)) {
        node.unrecognized(arg);
      }
      node.args.push(arg);
    }
  }

  private saveArg(raw: string) {
    const options = this.parent.parse(raw);
    if (!options) {
      // raw arg is alias
      const list = this.parent.resolve([raw]);
      return list && this.saveAlias(list);
    } else if (this.assigned == null || isAssignable(raw, options)) {
      // check if assignable
      this.save([{ raw, options }]);
      return true;
    }
  }

  private saveAlias(list: ResolvedAlias[], remainder?: string[]) {
    // e.g. -fb=value, cases:
    // -b is null -> error
    // -b is not assignable -> treat as value
    // -b is assignable -> continue split
    let arg: string | null = null;
    const options =
      this.assigned != null && list.length > 0
        ? this.parent.parse((arg = list[list.length - 1].args[0]))
        : null;
    // allow assign if no options or if assignable
    if (arg !== null && options && !isAssignable(arg, options)) {
      return;
    }
    // treat left over from split as argument
    this.parent.validateAlias(remainder);

    const items = list.map((item, index): NodeOptions => {
      const raw = item.args[0];
      return {
        raw,
        alias: item.alias,
        args: item.args.slice(1),
        // reuse last options when available
        options:
          index >= list.length - 1 && options
            ? options
            : this.parent.parse(raw, true)
      };
    });
    this.save(items);

    return true;
  }

  private save(items: NodeOptions[]) {
    // skipping does not mean saving failed
    if (items.length === 0) {
      return;
    }
    // validate existing child then make new child
    this.child?.done();

    let nextChild: Node | undefined;
    const children = items.map((item, index) => {
      // make new child and save values
      // probably don't need to validate now since it will be
      // validated when changing child node or at the end of parse
      const node = (this.child = new Node(item, this.parent.strict));
      // save assigned to last saved node
      if (this.assigned != null && index >= items.length - 1) {
        node.args.push(this.assigned);
      }
      this.parent.children.push(node);
      // if child has args, use this as next child
      if (node.hasArgs) {
        nextChild = node;
      }
      return node;
    });

    // validate all children except next or latest child
    for (const child of children) {
      if (child !== (nextChild || this.child)) {
        child.done();
      }
    }

    // if this child has args, switch it for next parse iteration
    if (nextChild) {
      // since we're removing reference to parent, validate it now
      this.parent.done();
      this.parent = nextChild;
      this.child = null;
    }
  }

  parse(args: readonly string[]): Node {
    // create copy of args to avoid modification
    for (const arg of args.slice()) {
      this.parseArg(arg);
    }
    // finally, make sure to validate the rest of the nodes
    this.child?.done();
    this.parent.done();
    return this.root;
  }
}
