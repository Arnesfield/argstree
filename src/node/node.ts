import { Node as INode, Options } from '../types/core.types';
import { pluralize } from '../utils/pluralize';
import { range } from '../utils/range';
import { Alias } from './alias';
import { NodeRange } from './node.types';

export class Node {
  readonly id: string | null;
  readonly args: string[] = [];
  readonly alias: Alias;
  readonly isCommand: boolean = true;
  private readonly children: Node[] = [];
  private readonly options: Options;
  private readonly _parse: (arg: string) => Options | null | undefined;

  constructor(id: string | null, options: Options) {
    this.options = options;
    this.id = options.id ?? id ?? null;
    this.alias = new Alias(options.alias);

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

  displayName(): string | null {
    return this.options.name ?? this.id ?? null;
  }

  push(arg: string): this {
    this.args.push(arg);
    return this;
  }

  save(node: Node): void {
    this.children.push(node);
  }

  parse(arg: string): Options | null {
    // make sure parse result is a valid object
    const options = this._parse(arg);
    return typeof options === 'object' && !Array.isArray(options)
      ? options
      : null;
  }

  range(diff = 0): NodeRange {
    const { min, max } = range(this.options);
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

  validateOptions(): void {
    // validate min and max
    const { min, max } = range(this.options);
    if (min != null && max != null && min > max) {
      const name = this.displayName();
      throw new Error(
        (name === null ? 'Invalid' : `Option '${name}' has invalid`) +
          ` min and max range: ${min}-${max}.`
      );
    }
  }

  validateRange(diff = 0): void {
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
      throw new Error(
        (name === null ? 'E' : `Option '${name}' e`) +
          'xpected ' +
          phrase[0] +
          ' ' +
          pluralize('argument', phrase[1]) +
          `, but got ${argsLength}.`
      );
    }
  }

  build(parent: INode | null = null, depth = 0): INode {
    // use configured name instead of display name
    const node: INode = {
      id: this.id,
      name: this.options.name ?? null,
      class: this.options.class ?? null,
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
