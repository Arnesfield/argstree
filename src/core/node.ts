import { Node as INode, Options } from '../types/core.types';
import { NodeRange } from '../types/node.types';
import { pluralize } from '../utils/pluralize';
import { range } from '../utils/range';
import { Alias } from './alias';

export class Node {
  readonly id: string | null;
  readonly args: string[] = [];
  readonly alias: Alias;
  readonly hasChildren: boolean = true;
  readonly parse: (arg: string) => Options | null | undefined;
  private readonly children: Node[] = [];
  private readonly options: Options;

  constructor(id: string | null, options: Options) {
    this.options = options;
    this.id = options.id ?? id ?? null;
    this.alias = new Alias(options.alias);

    const { args } = options;
    let _opts: { [name: string]: Options | null | undefined };
    this.parse =
      typeof args === 'function'
        ? args
        : typeof args === 'object' && args !== null
        ? ((_opts = Object.assign(Object.create(null), args)),
          (arg: string) => _opts[arg] ?? null)
        : ((this.hasChildren = false), () => null);
  }

  push(arg: string): this {
    this.args.push(arg);
    return this;
  }

  save(node: Node): void {
    this.children.push(node);
  }

  range(argsLength = this.args.length): NodeRange {
    const { min, max } = range(this.options);
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

  validate(argsLength = this.args.length): string | null {
    const { min, max, satisfies } = this.range(argsLength);
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
    if (phrase === null) {
      return null;
    }
    return (
      (this.id === null ? 'E' : `Option '${this.id}' e`) +
      'xpected ' +
      phrase[0] +
      ' ' +
      pluralize('argument', phrase[1]) +
      `, but got ${argsLength}.`
    );
  }

  build(parent: INode | null = null, depth = 0): INode {
    const node: INode = {
      id: this.id,
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
