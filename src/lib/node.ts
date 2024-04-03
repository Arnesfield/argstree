import { Node as INode, NodeData, Options } from '../core/core.types.js';
import { ArgsTreeError } from '../core/error.js';
import { ensureNumber } from '../utils/ensure-number.js';
import { has, isObject } from '../utils/object.utils.js';
import { displayName, getType } from '../utils/options.utils.js';
import { ArgsFunction } from '../utils/type.utils.js';
import { Alias } from './alias.js';

export interface NodeOptions {
  options: Options;
  raw?: string | null;
  alias?: string | null;
  args?: string[];
}

export class Node {
  readonly args: string[];
  readonly children: Node[] = [];
  readonly hasArgs: boolean;
  private _alias: Alias | undefined;
  private readonly data: NodeData;
  private readonly options: Options;
  private readonly range: {
    min: number | null;
    max: number | null;
    maxRead: number | null;
  };
  private readonly _parse: ArgsFunction | null;

  constructor(
    opts: NodeOptions,
    /** Overridable strict option. */
    readonly strict?: boolean
  ) {
    const { raw = null, alias = null, options } = opts;
    this.options = options;
    // set parent.strict to constructor param, but override using provided options.strict
    this.strict = options.strict ?? strict;
    // make sure to change reference
    this.args = (Array.isArray(options.initial) ? options.initial : []).concat(
      opts.args || []
    );
    this.data = { raw, alias, args: this.args, options };

    // get and validate range only after setting the fields above
    const min = ensureNumber(options.min);
    const max = ensureNumber(options.max);
    const maxRead = ensureNumber(options.maxRead) ?? max;
    if (max === null) {
      // skip all checks since they all require max to be provided
    } else if (min !== null && min > max) {
      const name = this.name();
      this.error(
        ArgsTreeError.INVALID_OPTIONS_ERROR,
        (name ? name + 'has i' : 'I') +
          `nvalid min and max range: ${min}-${max}.`
      );
    } else if (maxRead !== null && max < maxRead) {
      const name = this.name();
      this.error(
        ArgsTreeError.INVALID_OPTIONS_ERROR,
        (name ? name + 'has i' : 'I') +
          `nvalid max and maxRead range: ${max} < ${maxRead}.`
      );
    }

    this.range = { min, max, maxRead };

    // set _parse and hasArgs
    const { args } = options;
    this.hasArgs = !!(this._parse =
      typeof args === 'function'
        ? args
        : isObject(args)
          ? arg => (has(args, arg) ? args[arg] : null)
          : null);
  }

  get alias(): Alias {
    // only create alias instance when needed
    return (this._alias ||= new Alias(this.options.alias || {}));
  }

  private name() {
    return displayName(this.data.raw, this.options);
  }

  private error(cause: string, message: string): never {
    throw new ArgsTreeError({ cause, message, ...this.data });
  }

  /** Throw unrecognized error. */
  unrecognized(arg: string): never {
    const name = this.name();
    this.error(
      ArgsTreeError.UNRECOGNIZED_ARGUMENT_ERROR,
      (name ? name + 'does not recognize the' : 'Unrecognized') +
        ` ${getType(arg).toLowerCase()}: ${arg}`
    );
  }

  parse(arg: string, strict?: false): Options | null;
  parse(arg: string, strict: true): Options;
  parse(arg: string, strict?: boolean): Options | null {
    // make sure parse result is a valid object
    const options =
      typeof this._parse === 'function' ? this._parse(arg, this.data) : null;
    const value = isObject(options) ? options : null;
    if (strict && !value) {
      this.unrecognized(arg);
    }
    return value;
  }

  checkRange(diff = 0): { min: boolean; max: boolean; maxRead: boolean } {
    const { min, max, maxRead } = this.range;
    const length = this.args.length + diff;
    return {
      min: min === null || length >= min,
      max: max === null || length <= max,
      maxRead: maxRead === null || length <= maxRead
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
      const name = this.name();
      this.error(
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
        : min !== null && max !== null
          ? min === max
            ? [min, min]
            : [`${min}-${max}`, 2]
          : min !== null
            ? [`at least ${min}`, min]
            : max !== null
              ? max <= 0
                ? ['no', max]
                : [`up to ${max}`, max]
              : null;
    if (phrase) {
      const name = this.name();
      const label = 'argument' + (phrase[1] === 1 ? '' : 's');
      this.error(
        ArgsTreeError.INVALID_RANGE_ERROR,
        (name ? name + 'e' : 'E') +
          `xpected ${phrase[0]} ${label}, but got ${this.args.length}.`
      );
    }
  }

  validateAlias(aliases: string[] | undefined): void {
    if (aliases && aliases.length > 0) {
      // assume that this is a valid alias
      const name = this.name();
      this.error(
        ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR,
        (name ? name + 'does not recognize the' : 'Unrecognized') +
          ` alias${aliases.length === 1 ? '' : 'es'}: ` +
          aliases.map(alias => '-' + alias).join(', ')
      );
    }
  }

  build(parent: INode | null = null, depth = 0): INode {
    const { id } = this.options;
    const { raw, alias } = this.data;
    const node: INode = {
      id: (typeof id === 'function' ? id(raw, this.data) : id) ?? raw ?? null,
      name: this.options.name ?? null,
      raw,
      alias,
      depth,
      args: this.args,
      parent,
      children: [],
      // prepare ancestors before checking children and descendants
      ancestors: parent ? [...parent.ancestors, parent] : [],
      descendants: []
    };
    for (const instance of this.children) {
      const child = instance.build(node, depth + 1);
      node.children.push(child);
      // also save descendants of child
      node.descendants.push(child, ...child.descendants);
    }
    return node;
  }
}
