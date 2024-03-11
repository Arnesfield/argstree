import { Validate } from '../helpers/validate';
import { isAlias, isOption, isOptionLike } from '../utils/arg.utils';
import { Node } from './node';

enum ParsedType {
  Alias,
  Option,
  Value
}

interface Parsed {
  value: string;
  type: ParsedType | null;
}

export class Parser {
  private parent: Node;
  private child: Node | null = null;
  private readonly args: (string | Parsed)[];

  constructor(
    args: string[],
    private readonly root: Node,
    private readonly validate: Validate
  ) {
    this.args = Array.from(args);
    this.parent = root;
  }

  private preparse(arg: string): Parsed[] {
    const parsed: Parsed[] = [];
    const type = isAlias(arg)
      ? ParsedType.Alias
      : isOption(arg)
      ? ParsedType.Option
      : null;
    if (type === null) {
      // maybe value or command, ignore equal sign
      parsed.push({ type: null, value: arg });
    }
    // for alias and options, check for equal sign
    else {
      const minIndex = type === ParsedType.Alias ? 1 : 2;
      const equalIndex = arg.indexOf('=');
      if (equalIndex > minIndex) {
        // if found, split arg and treat 2nd portion as value
        // allow empty string value
        const alias = arg.slice(0, equalIndex);
        const value = arg.slice(equalIndex + 1);
        // value may look like an option. if so, force it to be parsed as a value
        const valueType = isOptionLike(value) ? ParsedType.Value : null;
        parsed.push({ type, value: alias }, { type: valueType, value });
      } else {
        // treat as an arg without splitting `=` if ever it exists
        parsed.push({ type, value: arg });
      }
    }
    return parsed;
  }

  private save(parsed: Parsed): void {
    // option or command
    const arg = parsed.value;
    const isValue = parsed.type === ParsedType.Value;
    const options = isValue ? null : this.parent.parse(arg);

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
      return;
    }

    // not an option
    // if this arg is an alias, expand into multiple args
    const split = isValue ? null : this.parent.alias.split(arg);
    if (split && split.args.length > 0) {
      // treat left over from split as argument if it's not an alias like option
      if (split.arg != null) {
        // make sure to check if this can be accepted
        this.validate.unknown(split.arg);
        this.parent.push(split.arg);
        this.validate.range(this.parent);
      }
      // treat first as is (alias) while the rest as values
      const [value, ...values] = split.args;
      this.args.unshift(value);
      for (const value of values) {
        this.args.unshift({ value, type: ParsedType.Value });
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
  }

  parse(): Node {
    this.validate.options(this.parent);
    // let child: Node | undefined;
    while (this.args.length > 0) {
      const arg = this.args.shift();
      if (arg == null) {
        // continue instead of break to make sure the loop condition is satisfied
        continue;
      }
      const [parsed, ...extra] =
        typeof arg === 'string' ? this.preparse(arg) : [arg];
      // if there are more parsed item, save the rest to this.args before saving
      this.args.unshift(...extra);
      this.save(parsed);
    }

    // finally, make sure to validate the rest of the nodes
    if (this.child) {
      this.validate.range(this.child);
    }
    this.validate.range(this.parent);
    this.validate.range(this.root);
    return this.root;
  }
}
