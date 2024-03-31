import { isAssignable, isOption } from '../utils/arg.utils.js';
import { ResolvedAlias } from './alias.js';
import { Node, NodeOptions } from './node.js';

export class Parser {
  private parent: Node;
  private child: Node | null = null;

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

    if (this.saveArg(arg)) {
      return;
    }

    // no need to check for min index, always split equal sign
    // first part (last option if alias) is checked if assignable
    const equalIndex = arg.indexOf('=');
    const [match, assigned] =
      equalIndex > -1
        ? [arg.slice(0, equalIndex), arg.slice(equalIndex + 1)]
        : [arg];
    // skip the same saveArg call (assigned value not set)
    if (assigned != null && this.saveArg(match, assigned)) {
      return;
    }

    // treat first as is (alias) while the rest as values
    // if not successful, save arg as value
    // only check assignable if assigned value exists
    const split = this.parent.alias.split(match);
    if (!split || !this.saveAliasArgs(assigned, split.list, split.remainder)) {
      // treat arg as value
      // if current node exists, check if it reached its max args, if not then save arg
      // otherwise, treat this as an arg for the main node
      const node = this.child?.checkRange(1).maxRead ? this.child : this.parent;
      // strict mode: throw error if arg is an option-like
      if (node.strict && isOption(arg)) {
        throw node.unrecognized(arg);
      }
      node.args.push(arg);
    }
  }

  private saveArg(raw: string, assigned?: string) {
    const options = this.parent.parse(raw);
    if (options) {
      // check if assignable
      const save = assigned == null || isAssignable(raw, options);
      if (save) {
        this.save([{ raw, options, args: assigned != null ? [assigned] : [] }]);
      }
      return save;
    }
    // raw arg is alias
    const resolved = this.parent.alias.resolve([raw]);
    return resolved && this.saveAliasArgs(assigned, resolved);
  }

  private save(items: NodeOptions[]) {
    // skipping does not mean saving failed
    if (items.length === 0) {
      return;
    }
    // validate existing child then make new child
    this.child?.validate();

    let nextChild: Node | undefined;
    const children = items.map(item => {
      // make new child and save values
      // probably don't need to validate now since it will be
      // validated when changing child node or at the end of parse
      this.parent.children.push(
        (this.child = new Node(item, this.parent.strict))
      );
      // if child has args, use this as next child
      if (this.child.hasArgs) {
        nextChild = this.child;
      }
      return this.child;
    });

    // validate all children except next or latest child
    const ignoreChild = nextChild || this.child;
    for (const child of children) {
      if (child !== ignoreChild) {
        child.validate();
      }
    }

    // if this child has args, switch it for next parse iteration
    if (nextChild) {
      // since we're removing reference to parent, validate it now
      this.parent.validate();
      this.parent = nextChild;
      this.child = null;
    }
  }

  private saveAliasArgs(
    assigned: string | undefined,
    list: ResolvedAlias[],
    remainder?: string[]
  ) {
    // e.g. -fb=value, cases:
    // -b is null -> error
    // -b is not assignable -> treat as value
    // -b is assignable -> continue split
    let arg: string | null = null;
    const options =
      assigned != null && list.length > 0
        ? this.parent.parse((arg = list[list.length - 1].args[0]))
        : null;
    // allow assign if no options or if assignable
    if (arg != null && options && !isAssignable(arg, options)) {
      return;
    }
    // treat left over from split as argument
    this.parent.validateAlias(remainder);

    const items = list.map((item, index): NodeOptions => {
      const raw = item.args[0];
      const isLast = index === list.length - 1;
      const args = item.args.slice(1);
      // set assigned to last item only
      if (isLast && assigned != null) {
        args.push(assigned);
      }
      // reuse last options when available
      return {
        raw,
        alias: item.alias,
        args,
        options: isLast && options ? options : this.parent.parse(raw, true)
      };
    });
    this.save(items);

    return true;
  }

  parse(args: readonly string[]): Node {
    // create copy of args to avoid modification
    for (const arg of args.slice()) {
      this.parseArg(arg);
    }
    // finally, make sure to validate the rest of the nodes
    this.child?.validate();
    this.parent.validate();
    return this.root;
  }
}
