import { Node as INode, NodeData, Options } from '../core/core.types.js';
import { ArgsTreeError } from '../core/error.js';
import { isAlias } from '../utils/arg.utils.js';
import { ensureNumber } from '../utils/ensure-number.js';
import { has, isObject } from '../utils/object.utils.js';
import { displayName, getType } from '../utils/options.utils.js';
import { split } from '../utils/split.js';
import { ResolvedAlias, getAliases, getArgs } from './alias.js';

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
  readonly options: Options;
  private _aliases: string[] | undefined;
  private readonly data: NodeData;
  private readonly range: {
    min: number | null;
    max: number | null;
    maxRead: number | null;
  };

  constructor(
    opts: NodeOptions,
    /** Overridable strict option. */
    readonly strict?: boolean
  ) {
    const { raw = null, alias = null, options } = opts;
    this.options = options;
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

    // set parent.strict to constructor param, but override using provided options.strict
    this.strict = options.strict ?? strict;
    this.range = { min, max, maxRead };
    this.hasArgs = typeof options.args === 'function' || isObject(options.args);
  }

  private name() {
    return displayName(this.data.raw, this.options);
  }

  private error(cause: string, message: string): never {
    throw new ArgsTreeError({ cause, message, ...this.data });
  }

  /**
   * Throw unrecognized error.
   * @param arg If an array is provided, it is treated as a list of aliases.
   */
  unrecognized(arg: string | string[]): never {
    const name = this.name();
    const isArg = typeof arg === 'string';
    this.error(
      ArgsTreeError[
        isArg ? 'UNRECOGNIZED_ARGUMENT_ERROR' : 'UNRECOGNIZED_ALIAS_ERROR'
      ],
      (name ? name + 'does not recognize the ' : 'Unrecognized ') +
        (isArg
          ? getType(arg).toLowerCase() + ': ' + arg
          : `alias${arg.length === 1 ? '' : 'es'}: ` +
            arg.map(alias => '-' + alias).join(', '))
    );
  }

  parse(arg: string, strict?: false): Options | null;
  parse(arg: string, strict: true): Options;
  parse(arg: string, strict?: boolean): Options | null {
    // make sure parse result is a valid object
    const { args } = this.options;
    const options =
      typeof args === 'function'
        ? args(arg, this.data)
        : isObject(args) && has(args, arg)
          ? args[arg]
          : null;
    const value = isObject(options) ? options : null;
    if (strict && !value) {
      this.unrecognized(arg);
    }
    return value;
  }

  /** Check if this node can read one more argument. */
  read(): boolean {
    return (
      this.range.maxRead === null || this.range.maxRead >= this.args.length + 1
    );
  }

  /**
   * Validate and finalize the node. This assumes that the node
   * stops receiving arguments and will no longer be used for parsing.
   */
  done(): void {
    // validate assumes the node has lost reference
    // so validate range here, too
    const { min, max } = this.range;
    const phrase: [string | number, number] | null =
      (min === null || this.args.length >= min) &&
      (max === null || this.args.length <= max)
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
      this.error(
        ArgsTreeError.INVALID_RANGE_ERROR,
        (name ? name + 'e' : 'E') +
          `xpected ${phrase[0]} argument${phrase[1] === 1 ? '' : 's'}, ` +
          `but got ${this.args.length}.`
      );
    }

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

  // aliases

  private aliases() {
    return (this._aliases ||= getAliases(this.options.alias || {}));
  }

  split(
    arg: string
  ): { list: ResolvedAlias[]; remainder: string[] } | null | undefined {
    // only accept aliases
    if (!isAlias(arg)) {
      return;
    }
    // remove first `-` for alias
    const { values, remainder } = split(arg.slice(1), this.aliases());
    // note that split.values do not have `-` prefix
    const list = values.length > 0 ? this.resolve(values, '-') : null;
    // considered as split only if alias args were found
    return list && { list, remainder };
  }

  resolve(aliases: string[], prefix = ''): ResolvedAlias[] | null {
    // get args per alias
    let hasArgs: boolean | undefined;
    const list: ResolvedAlias[] = [];
    for (let alias of aliases) {
      alias = prefix + alias;
      const argsList = getArgs(this.options.alias || {}, alias);
      if (argsList) {
        hasArgs = true;
        // assume args contains at least one element (thanks, getArgs!)
        for (const args of argsList) {
          list.push({ alias, args });
        }
      }
    }
    return hasArgs ? list : null;
  }
}
