import { Node } from './node';

export class Parser {
  private readonly args: string[];

  constructor(args: string[]) {
    this.args = Array.from(args);
  }

  parse(parent: Node): Node {
    let child: Node | undefined;
    while (this.args.length > 0) {
      const arg = this.args.shift();
      if (arg == null) {
        // continue instead of break to make sure the loop condition is satisfied
        continue;
      }

      // if this arg is an alias, expand into multiple args
      const flags = parent.expandAlias(arg);
      if (flags.length > 0) {
        this.args.unshift(...flags);
        continue;
      }

      const option = parent.parse(arg);
      if (option != null) {
        // is an option
        // if parent has no child, create one
        // if parent has child but it doesn't match this option, validate it and create new child
        if (!child || child.id !== (option.id ?? arg)) {
          if (child) {
            // otherwise, validate it then change it
            child.validate();
          }
          // save new node
          parent.save((child = new Node(arg, option)));
        }

        // if this child has args, parse it
        if (child.hasChildren) {
          this.parse(child);
        }
      } else {
        // not an option
        // if current node exists, check if it reached its max args, if not then save arg
        // otherwise, treat this as an arg for the main node
        const valid = child?.validate({
          argsLength: child.args.length + 1,
          throwError: false
        }).max;
        if (child && valid) {
          child.push(arg);
        } else {
          parent.push(arg);
        }
      }
    }
    if (child) {
      child.validate();
    }
    return parent;
  }
}
