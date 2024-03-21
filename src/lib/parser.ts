import { Options } from '../core/core.types.js';
import { isAlias, isOption } from '../utils/arg.utils.js';
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
    // 3 - if it's not an option like with no match, treat as value
    // 4 - if it's an option like with no match, split by equal sign. if no equal sign, treat as value
    // 5 - after splitting equal sign, perform #1 and #2 for first part
    // 6 - if match, use second part value as an arg for child
    // 7 - if no match, split alias for first part
    // 8 - if has alias args, use second part value as an arg for child (last option)
    // 9 - otherwise, use original arg and treat as value

    if (this.saveArg(arg)) {
      return;
    }

    // don't treat `--` as an option like
    // min equal index determines if arg is an option like or not
    const minIndex = isAlias(arg) ? 1 : isOption(arg) ? 2 : null;
    if (minIndex === null) {
      return this.saveValue(arg);
    }

    const equalIndex = arg.indexOf('=');
    const [match, values] =
      equalIndex > minIndex
        ? [arg.slice(0, equalIndex), [arg.slice(equalIndex + 1)]]
        : [arg, []];

    if (this.saveArg(match, values)) {
      return;
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
    } else {
      // treat arg as value
      this.saveValue(arg);
    }
  }

  private saveArg(arg: string, values: string[] = []) {
    let options;
    if ((options = this.parent.parse(arg))) {
      this.saveOptions([{ arg, options, values }]);
    } else if ((options = this.parent.alias.getArgs(arg))) {
      this.saveAliasArgs(options, values);
    } else {
      return false;
    }
    return true;
  }

  private saveOptions(options: SaveOptions[]) {
    let nextChild: Node | undefined;
    for (const opts of options) {
      // validate existing child then make new child
      this.child?.validateRange();
      // make new child and save values
      // probably don't need to validate now since it will be
      // validated when changing child node or at the end of parse
      this.child = new Node(opts.arg, opts.options).push(...opts.values);
      this.parent.save(this.child);
      // if child has args, use this as next child
      if (this.child.hasArgs) {
        nextChild = this.child;
      }
    }
    // if this child has args, switch it for next parse iteration
    if (nextChild) {
      // since we're removing reference to parent, validate it now
      this.parent.validateRange();
      this.parent = nextChild;
      this.child = null;
    }
  }

  private saveAliasArgs(list: string[][], values: string[] = []) {
    // get valid items from list first
    const options: SaveOptions[] = [];
    for (const aliasArgs of list) {
      if (aliasArgs.length > 0) {
        const arg = aliasArgs[0];
        options.push({
          arg,
          options: this.parent.parse(arg, true),
          values: aliasArgs.slice(1)
        });
      }
    }
    // save values for last item only
    if (options.length > 0) {
      options[options.length - 1].values.push(...values);
    }
    // finally, save options
    this.saveOptions(options);
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
    return this.root;
  }
}
