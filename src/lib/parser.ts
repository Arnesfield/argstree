import { Options } from '../core/core.types';
import { isAlias, isOption } from '../utils/arg.utils';
import { Node } from './node';

export class Parser {
  private parent: Node;
  private child: Node | null = null;

  constructor(private readonly root: Node) {
    this.parent = root;
  }

  private parseArg(arg: string) {
    // 1 - check if arg matches any arguments. if valid, use options
    // 2 - check if arg matches any alias. if valid, use alias args
    // 3 - if it's not an option like with no match, treat as value
    // 4 - if it's an option like with no match, split by equal sign. if no equal sign, treat as value
    // 5 - after splitting equal sign, perform #1 and #2 for first part
    // 6 - if match, use second part value as an arg for child
    // 7 - if no match, split alias for first part
    // 8 - if has alias args, use second part value as an arg for child (last option)
    // 9 - otherwise, use original arg and treat as value

    let options = this.parent.parse(arg);
    if (options != null) {
      return this.saveOption(arg, options);
    }
    let aliasArgs = this.parent.alias.getArgs(arg);
    if (aliasArgs) {
      return this.saveAliasArgs(aliasArgs);
    }

    // don't treat `--` as an option like
    // min index determines if arg is an option like or not
    const minEqualIndex = isAlias(arg) ? 1 : isOption(arg) ? 2 : null;
    if (minEqualIndex === null) {
      return this.saveValue(arg);
    }

    const equalIndex = arg.indexOf('=');
    const hasEqual = equalIndex > minEqualIndex;
    const match = hasEqual ? arg.slice(0, equalIndex) : arg;
    const values = hasEqual ? [arg.slice(equalIndex + 1)] : [];

    options = this.parent.parse(match);
    if (options != null) {
      return this.saveOption(match, options, values);
    }
    aliasArgs = this.parent.alias.getArgs(match);
    if (aliasArgs) {
      return this.saveAliasArgs(aliasArgs, values);
    }

    const split = this.parent.alias.split(match);
    if (split) {
      // treat left over from split as argument
      if (split.arg != null) {
        // make sure to check if this can be accepted
        this.parent.validateAlias(split.arg).push(split.arg);
      }
      // treat first as is (alias) while the rest as values
      this.saveAliasArgs(split.argsList, values);
      return;
    }

    // treat arg as value
    this.saveValue(arg);
  }

  private saveOption(arg: string, options: Options, values: string[] = []) {
    // validate existing child then make new child
    this.child?.validateRange();
    // make new child and save values
    // probably don't need to validate now since it will be
    // validated when changing child node or at the end of parse
    this.child = new Node(arg, options).push(...values);
    this.parent.save(this.child);
    // if this child has args, switch it for next parse iteration
    if (this.child.hasArgs) {
      // since we're removing reference to parent, validate it now
      this.parent.validateRange();
      this.parent = this.child;
      this.child = null;
    }
  }

  private saveAliasArgs(list: string[][], values: string[] = []) {
    // save values for last of list only
    list.forEach((aliasArgs, index, array) => {
      // save value for last arg
      if (aliasArgs.length > 0) {
        const arg = aliasArgs[0];
        const options = this.parent.parse(arg, true);
        const extras = aliasArgs
          .slice(1)
          .concat(index >= array.length - 1 ? values : []);
        this.saveOption(arg, options, extras);
      }
    });
  }

  private saveValue(arg: string) {
    // if current node exists, check if it reached its max args, if not then save arg
    // otherwise, treat this as an arg for the main node
    if (this.child?.checkRange(1).maxRead) {
      this.child.push(arg);
    } else {
      this.parent.push(arg);
    }
  }

  parse(args: readonly string[]): Node {
    // create copy of args to avoid modification
    for (const arg of args.slice()) {
      this.parseArg(arg);
    }
    // finally, make sure to validate the rest of the nodes
    this.child?.validateRange();
    this.parent.validateRange();
    if (this.parent !== this.root) {
      this.root.validateRange();
    }
    return this.root;
  }
}
