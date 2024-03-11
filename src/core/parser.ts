import { Validate } from '../helpers/validate';
import { Node } from './node';

export class Parser {
  private readonly args: string[];
  private readonly validate = new Validate();

  constructor(args: string[]) {
    this.args = Array.from(args);
  }

  parse(parent: Node): Node {
    this.validate.options(parent);
    let child: Node | undefined;
    while (this.args.length > 0) {
      const arg = this.args.shift();
      if (arg == null) {
        // continue instead of break to make sure the loop condition is satisfied
        continue;
      }

      const options = parent.parse(arg);
      if (options != null) {
        // is an option
        // validate existing child then make new child
        if (child) {
          this.validate.range(child);
        }
        // make new child
        parent.save((child = new Node(arg, options)));
        // if this child has args, parse it
        // TODO: update condition
        if (child.isCommand) {
          this.parse(child);
        } else {
          // avoid duplicate validation
          this.validate.options(child);
        }
        continue;
      }
      // not an option

      // if this arg is an alias, expand into multiple args
      const split = parent.alias.split(arg);
      if (split.args.length > 0) {
        this.args.unshift(...split.args);
        // treat left over from split as argument if it's not an alias like option
        if (split.arg != null) {
          // make sure to check if this can be accepted
          this.validate.unknown(split.arg);
          parent.push(split.arg);
          this.validate.range(parent);
        }
      }

      // if current node exists, check if it reached its max args, if not then save arg
      // otherwise, treat this as an arg for the main node
      else if (child && child.range(1).satisfies.max) {
        child.push(arg);
      } else {
        parent.push(arg);
        this.validate.range(parent);
      }
    }
    // finally, make sure to validate the rest of the nodes
    if (child) {
      this.validate.range(child);
    }
    this.validate.range(parent);
    return parent;
  }
}
