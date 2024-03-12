import { Node } from '../core/node';
import { Validate } from '../helpers/validate';
import { Parsed } from './parser.types';
import { preparse } from './preparse';

export class Parser {
  private parent: Node;
  private child: Node | null = null;

  constructor(
    private readonly root: Node,
    private readonly validate: Validate
  ) {
    this.parent = root;
  }

  private save(item: Parsed): Parsed[] {
    // option or command
    // `raw` means `is arg a value`
    const { arg, raw } = item;
    const parsed: Parsed[] = [];
    const options = raw ? null : this.parent.parse(arg);
    // is an option
    if (options != null) {
      // validate existing child then make new child
      if (this.child) {
        this.validate.range(this.child);
      }
      // make new child
      this.child = new Node(arg, options);
      this.validate.options(this.child);
      this.parent.save(this.child);
      // if this child has args, switch it for next parse iteration
      if (this.child.isCommand) {
        this.parent = this.child;
        this.child = null;
      }
      return parsed;
    }

    // not an option
    // if this arg is an alias, expand into multiple args
    const split = raw ? null : this.parent.alias.split(arg);
    if (split && split.total > 0) {
      // treat left over from split as argument if it's not an alias like option
      if (split.arg != null) {
        // make sure to check if this can be accepted
        this.validate.unknown(split.arg);
        this.parent.push(split.arg);
        this.validate.range(this.parent);
      }
      // treat first as is (alias) while the rest as values
      for (const aliasArgs of split.args) {
        aliasArgs.forEach((arg, index) => {
          parsed.push({ arg, raw: index > 0 });
        });
      }
    }
    // for value, always save to child if it exists (most likely it exists)
    else if (raw && this.child) {
      this.child.push(arg);
      // validate only if it does not satisfy max
      if (!this.child.range().satisfies.max) {
        this.validate.range(this.child);
      }
    }
    // if current node exists, check if it reached its max args, if not then save arg
    // otherwise, treat this as an arg for the main node
    else if (this.child?.range(1).satisfies.max) {
      this.child.push(arg);
    } else {
      this.parent.push(arg);
      this.validate.range(this.parent);
    }
    return parsed;
  }

  parse(args: readonly string[]): Node {
    // when starting to parse, validate root node options first
    this.validate.options(this.root);

    const parse = (parsed: Parsed[]) => {
      for (const item of parsed) {
        // if there are new parsed items,
        // process them first before the next parsed items
        parse(this.save(item));
      }
    };
    // create copy of args to avoid modification
    for (const arg of args.slice()) {
      parse(preparse(arg));
    }

    // finally, make sure to validate the rest of the nodes
    if (this.child) {
      this.validate.range(this.child);
    }
    this.validate.range(this.parent);
    if (this.parent !== this.root) {
      this.validate.range(this.root);
    }
    return this.root;
  }
}
