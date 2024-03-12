import { Validate } from '../helpers/validate';
import { isAlias, isOption } from '../utils/arg.utils';
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

  constructor(
    private readonly root: Node,
    private readonly validate: Validate
  ) {
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
        // if found, split arg and treat 2nd part as value
        // allow empty string value
        const alias = arg.slice(0, equalIndex);
        const value = arg.slice(equalIndex + 1);
        // for some reason, enclosing quotes are not included
        // with the value part, so there's no need to handle them
        parsed.push({ type, value: alias }, { type: ParsedType.Value, value });
      } else {
        // treat as an arg without splitting `=` if ever it exists
        parsed.push({ type, value: arg });
      }
    }
    return parsed;
  }

  private save(parsed: Parsed): Parsed[] {
    // option or command
    const arg = parsed.value;
    const isValue = parsed.type === ParsedType.Value;
    const options = isValue ? null : this.parent.parse(arg);
    const newParsed: Parsed[] = [];

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
      return newParsed;
    }

    // not an option
    // if this arg is an alias, expand into multiple args
    const split = isValue ? null : this.parent.alias.split(arg);
    if (split && split.total > 0) {
      // treat left over from split as argument if it's not an alias like option
      if (split.arg != null) {
        // make sure to check if this can be accepted
        this.validate.unknown(split.arg);
        this.parent.push(split.arg);
        this.validate.range(this.parent);
      }
      // treat first as is (alias) while the rest as values
      for (const aliasArgs of split.aliases) {
        aliasArgs.forEach((value, index) => {
          newParsed.push({
            type: index === 0 ? null : ParsedType.Value,
            value
          });
        });
      }
    }
    // for value, always save to child if it exists and validate
    // unlike the next condition which verifies max before saving
    else if (isValue && this.child) {
      this.child.push(arg);
      this.validate.range(this.child);
    }
    // if current node exists, check if it reached its max args, if not then save arg
    // otherwise, treat this as an arg for the main node
    else if (this.child?.range(1).satisfies.max) {
      this.child.push(arg);
    } else {
      this.parent.push(arg);
      this.validate.range(this.parent);
    }
    return newParsed;
  }

  private _parse(parsed: Parsed[]) {
    for (const item of parsed) {
      // if there are new parsed items, process them first before current parsed items
      this._parse(this.save(item));
    }
  }

  parse(args: string[]): Node {
    this.validate.options(this.parent);
    // create copy to avoid modification
    for (const arg of args.slice()) {
      // make sure args are strings
      if (typeof arg === 'string') {
        this._parse(this.preparse(arg));
      }
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
