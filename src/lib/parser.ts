import { Options } from '../core/core.types.js';
import { isAssignable } from '../utils/arg.utils.js';
import { Node } from './node.js';

interface SaveOptions {
  arg: string;
  options: Options;
  values: string[];
}

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
    if (!split || !this.saveAliasArgs(assigned, split.argsList, split.arg)) {
      // treat arg as value
      // if current node exists, check if it reached its max args, if not then save arg
      // otherwise, treat this as an arg for the main node
      if (this.child?.checkRange(1).maxRead) {
        this.child.push(arg);
      } else {
        this.parent.push(arg);
      }
    }
  }

  private saveArg(arg: string, assigned?: string) {
    const options = this.parent.parse(arg);
    if (options) {
      // check if assignable
      const save = assigned == null || isAssignable(arg, options);
      if (save) {
        this.saveOptions([
          { arg, options, values: assigned != null ? [assigned] : [] }
        ]);
      }
      return save;
    }
    const list = this.parent.alias.getArgs(arg);
    return list && this.saveAliasArgs(assigned, list);
  }

  private saveOptions(items: SaveOptions[]) {
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
      this.child = new Node(item.arg, item.options).push(...item.values);
      this.parent.save(this.child);
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
    list: [string, ...string[]][],
    splitArg?: string | null
  ) {
    // e.g. -fb=value, cases:
    // -b is null -> error
    // -b is not assignable -> treat as value
    // -b is assignable -> continue split
    let arg: string | null = null;
    const options =
      assigned != null && list.length > 0
        ? this.parent.parse((arg = list[list.length - 1][0]))
        : null;
    // allow assign if no options or if assignable
    if (arg != null && options && !isAssignable(arg, options)) {
      return;
    }
    // treat left over from split as argument
    if (splitArg != null) {
      // make sure to check if this can be accepted
      this.parent.validateAlias(splitArg).push(splitArg);
    }

    const items = list.map((aliasArgs, index): SaveOptions => {
      const arg = aliasArgs[0];
      const isLast = index === list.length - 1;
      const values = aliasArgs.slice(1);
      // set assigned to last item only
      if (isLast && assigned != null) {
        values.push(assigned);
      }
      // reuse last options when available
      return {
        arg,
        values,
        options: isLast && options ? options : this.parent.parse(arg, true)
      };
    });
    this.saveOptions(items);

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
