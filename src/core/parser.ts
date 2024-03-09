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

  private validateNode(node: Node, range = node.range()) {
    const { satisfies } = range;
    const text: string[] = [];
    if (!satisfies.min) {
      text.push(`at least ${range.min}`);
    }
    if (!satisfies.max) {
      text.push(`a max of ${range.max}`);
    }
    if (text.length > 0) {
      const total = (range.min ?? 0) + (range.max ?? 0);
      const message = text.join(' to ') + ' ' + pluralize('argument', total);
      this.error(`Option '${node.id}' requires ${message}.`);
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
        child = parent.save(new Node(arg, options));
        // if this child has args, parse it
        if (child.hasChildren) {
          this.parse(child);
        }
      } else {
        // not an option

        // if this arg is an alias, expand into multiple args
        const expanded = parent.expandAlias(arg);
        if (expanded.args.length > 0) {
          this.args.unshift(...expanded.args);
          // treat left over from split as argument if it's not an alias like option
          if (expanded.arg != null) {
            parent.push(arg);
            this.validateNode(parent);
          }
          continue;
        }

        // if current node exists, check if it reached its max args, if not then save arg
        // otherwise, treat this as an arg for the main node
        if (child && child.range(1).satisfies.max) {
          child.push(arg);
        } else {
          parent.push(arg);
          this.validateNode(parent);
        }
      }
    }
    if (child) {
      this.validateNode(child);
    }
    return parent;
  }
}
