import { Node as INode, NodeData, Options } from '../core/core.types.js';
import { ArgsTreeError } from '../core/error.js';
import { ensureNumber } from '../utils/ensure-number.js';
import { displayName, getId } from '../utils/options.utils.js';
import { Alias } from './alias.js';

export interface NodeOptions {
  options: Options;
  raw?: string | null;
  alias?: string | null;
  args?: string[];
}

export class Node {
  private _alias: Alias | undefined;
  private readonly args: string[];
  private readonly data: NodeData;
  private readonly options: Options;
  private readonly children: Node[] = [];
  private readonly range: {
    min: number | null;
    max: number | null;
    maxRead: number | null;
  };
  private readonly _parse:
    | ((arg: string, data: NodeData) => Options | null | undefined)
    | null;

  constructor(opts: NodeOptions) {
    const { raw = null, alias = null, options } = opts;
    this.options = options;
    this.args = opts.args ? opts.args.slice() : [];
    this.data = { raw, alias, args: this.args, options };

    const min = ensureNumber(options.min);
    const max = ensureNumber(options.max);
    const maxRead = ensureNumber(options.maxRead) ?? max;
    this.range = { min, max, maxRead };

    // validate range
    if (min != null && max != null && min > max) {
      const name = this.displayName();
      throw this.error(
        ArgsTreeError.INVALID_OPTIONS_ERROR,
        (name ? name + 'has i' : 'I') +
          `nvalid min and max range: ${min}-${max}.`
      );
    } else if (max != null && maxRead != null && max < maxRead) {
      const name = this.displayName();
      throw this.error(
        ArgsTreeError.INVALID_OPTIONS_ERROR,
        (name ? name + 'has i' : 'I') +
          `nvalid max and maxRead range: ${max} < ${maxRead}.`
      );
    }

    const { args } = options;
    this._parse =
      typeof args === 'function'
        ? args
        : args && typeof args === 'object' && !Array.isArray(args)
          ? arg => args[arg]
          : null;
  }

  get hasArgs(): boolean {
    return typeof this._parse === 'function';
  }

  get alias(): Alias {
    // only create alias instance when needed
    return (this._alias ||= new Alias(this.options.alias));
  }

  private displayName() {
    return displayName(this.data.raw, this.options, this.hasArgs);
  }

  private error(cause: string, message: string) {
    return new ArgsTreeError({
      cause,
      message,
      raw: this.data.raw,
      alias: this.data.alias,
      args: this.args,
      options: this.options
    });
  }

  push(arg: string): void {
    this.args.push(arg);
  }

  save(node: Node): void {
    this.children.push(node);
  }

  parse(arg: string, strict?: false): Options | null;
  parse(arg: string, strict: true): Options;
  parse(arg: string, strict = false): Options | null {
    // make sure parse result is a valid object
    // and handle possibly common case for __proto__
    // NOTE: does not handle other cases for __proto__ / prototype
    const options =
      typeof this._parse === 'function' ? this._parse(arg, this.data) : null;
    const value =
      typeof options === 'object' &&
      options !== null &&
      options !== Object.prototype &&
      !Array.isArray(options)
        ? options
        : null;
    if (strict && !value) {
      const name = this.displayName();
      throw this.error(
        ArgsTreeError.UNRECOGNIZED_ARGUMENT_ERROR,
        (name ? name + 'does not recognize the' : 'Unrecognized') +
          ` option or command: ${arg}`
      );
    }
    return value;
  }

  checkRange(diff = 0): { min: boolean; max: boolean; maxRead: boolean } {
    const { min, max, maxRead } = this.range;
    const argsLength = this.args.length + diff;
    return {
      min: min === null || argsLength >= min,
      max: max === null || argsLength <= max,
      maxRead: maxRead === null || argsLength <= maxRead
    };
  }

  validate(): void {
    // validate assumes the node has lost reference
    // so validate range here, too
    this.validateRange();
    // NOTE: no need to create copy of args since validation is done
    // hence, allow mutation of args and options by consumer
    const { validate } = this.options;
    if (typeof validate === 'function' && !validate(this.data)) {
      const name = this.displayName();
      throw this.error(
        ArgsTreeError.VALIDATE_ERROR,
        name ? name + 'failed validation.' : 'Validation failed.'
      );
    }
  }

  private validateRange() {
    const { min, max } = this.range;
    const satisfies = this.checkRange();
    const phrase: [string | number, number] | null =
      satisfies.min && satisfies.max
        ? null
        : min != null && max != null
          ? min === max
            ? [min, min]
            : [`${min}-${max}`, 2]
          : min != null
            ? [`at least ${min}`, min]
            : max != null
              ? max <= 0
                ? ['no', max]
                : [`up to ${max}`, max]
              : null;
    if (phrase != null) {
      const name = this.displayName();
      const label = 'argument' + (phrase[1] === 1 ? '' : 's');
      throw this.error(
        ArgsTreeError.INVALID_RANGE_ERROR,
        (name ? name + 'e' : 'E') +
          `xpected ${phrase[0]} ${label}, but got ${this.args.length}.`
      );
    }
  }

  validateAlias(aliases: string[] | undefined): void {
    if (!aliases || aliases.length === 0) {
      return;
    }
    // assume that this is a valid alias
    const label = 'alias' + (aliases.length === 1 ? '' : 'es');
    const list = aliases.map(alias => '-' + alias).join(', ');
    const name = this.displayName();
    throw this.error(
      ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR,
      (name ? name + 'does not recognize the' : 'Unrecognized') +
        ` ${label}: ${list}`
    );
  }

  build(parent: INode | null = null, depth = 0): INode {
    const node: INode = {
      id: getId(this.data.raw, this.options.id),
      name: this.options.name ?? null,
      raw: this.data.raw,
      alias: this.data.alias,
      depth,
      args: this.args,
      parent,
      children: [],
      ancestors: [],
      descendants: []
    };

    // prepare ancestors before checking children and descendants
    if (parent) {
      node.ancestors.push(...parent.ancestors, parent);
    }

    for (const instance of this.children) {
      const child = instance.build(node, depth + 1);
      node.children.push(child);
      // also save descendants of child
      node.descendants.push(child, ...child.descendants);
    }
    return node;
  }
}
