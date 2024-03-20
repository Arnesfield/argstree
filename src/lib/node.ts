import { Node as INode, Options } from '../core/core.types';
import { ArgsTreeError } from '../core/error';
import { isAlias } from '../utils/arg.utils';
import { ensureNumber } from '../utils/ensure-number';
import { Alias } from './alias';

export class Node {
  readonly raw: string | null;
  readonly args: string[] = [];
  private _alias: Alias | undefined;
  private readonly children: Node[] = [];
  private readonly range: {
    min: number | null;
    max: number | null;
    maxRead: number | null;
  };
  private readonly _parse: ((arg: string) => Options | null | undefined) | null;

  constructor(raw: string | null, private readonly options: Options) {
    this.raw = raw;
    const min = ensureNumber(options.min);
    const max = ensureNumber(options.max);
    this.range = { min, max, maxRead: ensureNumber(options.maxRead) ?? max };

    // validate min and max
    if (min != null && max != null && min > max) {
      const name = this.displayName();
      throw this.error(
        ArgsTreeError.INVALID_OPTIONS_ERROR,
        (name ? name + 'has i' : 'I') +
          `nvalid min and max range: ${min}-${max}.`
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
    const name = this.options.name ?? this.raw ?? null;
    const type = this.hasArgs ? 'Command' : 'Option';
    return name === null ? '' : `${type} '${name}' `;
  }

  private error(cause: string, message: string) {
    return new ArgsTreeError({
      cause,
      message,
      raw: this.raw,
      args: this.args,
      options: this.options
    });
  }

  push(...args: string[]): this {
    this.args.push(...args);
    return this;
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
    const options = typeof this._parse === 'function' ? this._parse(arg) : null;
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

  validateRange(): this {
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
    return this;
  }

  validateAlias(arg: string): this {
    // only validate for left over alias split arg
    if (isAlias(arg)) {
      const aliases = Array.from(new Set(arg.slice(1).split('')));
      const label = 'alias' + (aliases.length === 1 ? '' : 'es');
      const list = aliases.map(alias => '-' + alias).join(', ');
      const name = this.displayName();
      throw this.error(
        ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR,
        (name ? name + 'does not recognize the' : 'Unrecognized') +
          ` ${label}: ${list}`
      );
    }
    return this;
  }

  build(parent: INode | null = null, depth = 0): INode {
    const node: INode = {
      id: this.options.id ?? this.raw ?? null,
      name: this.options.name ?? null,
      raw: this.raw,
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
