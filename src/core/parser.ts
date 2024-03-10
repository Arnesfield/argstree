import { isAlias } from '../utils/arg.utils';
import { pluralize } from '../utils/pluralize';
import { Node } from './node';

export class Parser {
  private readonly args: string[];

  constructor(args: string[]) {
    this.args = Array.from(args);
  }

  error(message: string): void {
    // TODO: error handling
    throw new Error(message);
  }

  private validateNode(node: Node) {
    const message = node.validate();
    if (message != null) {
      this.error(message);
    }
  }

  private validateUnknown(arg: string) {
    // NOTE: only use validateUnknown for left over alias split arg
    if (isAlias(arg)) {
      const aliases = Array.from(new Set(arg.trim().slice(1).split('')));
      const label = pluralize('alias', aliases.length, 'es');
      const list = aliases.map(alias => '-' + alias).join(', ');
      this.error(`Unknown ${label}: ${list}.`);
    }
  }

  parse(parent: Node): Node {
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
          this.validateNode(child);
        }
        // make new child
        parent.save((child = new Node(arg, options)));
        // if this child has args, parse it
        // TODO: update condition
        if (child.hasChildren) {
          this.parse(child);
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
          this.validateUnknown(split.arg);
          parent.push(split.arg);
          this.validateNode(parent);
        }
      }

      // if current node exists, check if it reached its max args, if not then save arg
      // otherwise, treat this as an arg for the main node
      else if (child && child.range(1).satisfies.max) {
        child.push(arg);
      } else {
        parent.push(arg);
        this.validateNode(parent);
      }
    }
    // finally, make sure to validate the rest of the nodes
    if (child) {
      this.validateNode(child);
    }
    this.validateNode(parent);
    return parent;
  }
}
