import { Node as INode, Options } from '../core/core.types';
import { ArgsTreeError } from '../core/error';
import { isAlias } from '../utils/arg.utils';
import { pluralize } from '../utils/pluralize';
import { Range, range } from '../utils/range';
import { Alias } from './alias';
import { NodeRange } from './node.types';

export class Node {
  readonly raw: string | null;
  readonly args: string[] = [];
  readonly isCommand: boolean = true;
  private _alias: Alias | undefined;
  private readonly children: Node[] = [];
  private readonly options: Options;
  private readonly _range: Range;
  private readonly _parse: (arg: string) => Options | null | undefined;

  constructor(raw: string | null, options: Options) {
    // this.id = options.id ?? id ?? null;
    this.raw = raw;
    this.options = options;
    const { min, max } = (this._range = range(this.options));

    // validate min and max
    if (min != null && max != null && min > max) {
      const name = this.displayName();
      throw new ArgsTreeError({
        cause: ArgsTreeError.INVALID_OPTIONS_ERROR,
        options: this.options,
        message:
          (name === null ? 'Invalid' : `Option '${name}' has invalid`) +
          ` min and max range: ${min}-${max}.`
      });
    }

    const { args } = options;
    let _opts: { [name: string]: Options | null | undefined };
    this._parse =
      typeof args === 'function'
        ? args
        : typeof args === 'object' && args !== null
        ? ((_opts = Object.assign(Object.create(null), args)),
          (arg: string) => _opts[arg] ?? null)
        : ((this.isCommand = false), () => null);
  }

  get alias(): Alias {
    // only create alias instance when needed
    return (this._alias ||= new Alias(this.options.alias));
  }

  displayName(): string | null {
    return this.options.name ?? this.raw ?? null;
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
    const options = this._parse(arg);
    const value =
      typeof options === 'object' && !Array.isArray(options) ? options : null;
    if (strict && !value) {
      throw new ArgsTreeError({
        cause: ArgsTreeError.UNRECOGNIZED_ARGUMENT_ERROR,
        options: this.options,
        message: `Unrecognized option or command: ${arg}`
      });
    }
    return value;
  }

  range(diff = 0): NodeRange {
    const { min, max } = this._range;
    const argsLength = this.args.length + diff;
    return {
      min,
      max,
      satisfies: {
        min: min === null || argsLength >= min,
        max: max === null || argsLength <= max,
        exactMax: max === argsLength
      }
    };
  }

  validateRange(diff = 0): this {
    const { min, max, satisfies } = this.range(diff);
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
      const argsLength = this.args.length + diff;
      throw new ArgsTreeError({
        cause: ArgsTreeError.INVALID_RANGE_ERROR,
        options: this.options,
        message:
          (name === null ? 'E' : `Option '${name}' e`) +
          'xpected ' +
          phrase[0] +
          ' ' +
          pluralize('argument', phrase[1]) +
          `, but got ${argsLength}.`
      });
    }
    return this;
  }

  validateAlias(arg: string): this {
    // only validate for left over alias split arg
    if (isAlias(arg)) {
      const aliases = Array.from(new Set(arg.slice(1).split('')));
      const label = pluralize('alias', aliases.length, 'es');
      const list = aliases.map(alias => '-' + alias).join(', ');
      throw new ArgsTreeError({
        cause: ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR,
        options: this.options,
        message: `Unrecognized ${label}: ${list}`
      });
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
