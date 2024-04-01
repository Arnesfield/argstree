import { deproto } from '../utils/deproto.js';
import { displayName, getType } from '../utils/options.utils.js';
import { argstree } from './argstree.js';
import { NodeData, Options } from './core.types.js';
import { ArgsTreeError } from './error.js';
import { Spec as ISpec, SpecOptions } from './spec.types.js';

/**
 * Build the parse spec {@linkcode Options options} for {@linkcode argstree}.
 * @param options The spec options.
 * @returns The spec object.
 */
export function spec(options?: SpecOptions): ISpec {
  return new Spec(normalize(options));
}

// NOTE: taken from https://stackoverflow.com/a/59775771/7013346
// this is not included in build. type check to ensure props array is always updated
type Equal<S, T> = [S, T] extends [T, S] ? S : never;
function __check__<T>(): <A extends T[]>(arr: Equal<A, T[]>) => void {
  return () => {};
}
// NOTE: apply changes to props array!
__check__<keyof SpecOptions>()([
  'id',
  'name',
  'min',
  'max',
  'maxRead',
  'strict',
  'assign',
  'initial',
  'validate'
]);

function normalize(options: SpecOptions | undefined) {
  // clean since we are accessing properties of options
  const target: Options = deproto();
  if (!options) {
    return target;
  }
  // clean since properties of unsafe options is accessed and set to real options
  const source = deproto(options);
  // NOTE: make sure to add to props for new Options properties
  const props: (keyof SpecOptions)[] = [
    'id',
    'name',
    'min',
    'max',
    'maxRead',
    'strict',
    'assign',
    'initial',
    'validate'
  ];
  for (const prop of props) {
    if (typeof source[prop] !== 'undefined') {
      // force assignment
      target[prop] = source[prop] as any;
    }
  }
  return target;
}

interface SpecItem {
  arg: string;
  options: Options;
  spec?: ISpec | undefined;
}

class Spec implements ISpec {
  readonly #args: { [arg: string]: Options | null | undefined } = deproto();
  readonly #list: SpecItem[] = [];
  readonly #options: Options;
  readonly #parent: ISpec | null;
  readonly depth: number;

  // NOTE: always keep reference to options
  // direct mutation should be safe since this is internal
  constructor(
    options: Options,
    readonly id: string | null = null,
    parent: ISpec | null = null
  ) {
    this.depth = parent ? parent.depth + 1 : 0;
    this.#options = options;
    this.#parent = parent;
  }

  #error(message: string) {
    const name = displayName(this.id, this.#options.name);
    return new ArgsTreeError({
      cause: ArgsTreeError.INVALID_SPEC_ERROR,
      message: (name && name + 'spec error: ') + message,
      raw: this.id,
      alias: null,
      args: [],
      options: this.#options
    });
  }

  #current(context: string) {
    if (this.#list.length === 0) {
      throw this.#error(
        `Requires \`option()\` or \`command()\` call before \`${context}\`.`
      );
    }
    return this.#list[this.#list.length - 1];
  }

  #assignArg(arg: string, options: Options) {
    if (arg in this.#args) {
      throw this.#error(`${getType(arg)} '${arg}' already exists.`);
    }
    return (this.#args[arg] = options);
  }

  #assignAlias(alias: string, args: Required<Options>['alias']['args']) {
    if (alias in (this.#options.alias ||= deproto())) {
      throw this.#error(`Alias '${alias}' already exists.`);
    }
    this.#options.alias[alias] = args;
  }

  #spec(item: SpecItem): ISpec {
    // mutate object directly
    // cache spec to item to reuse for multiple spec calls
    return (item.spec ||= new Spec(item.options, item.arg, this));
  }

  option(arg: string, options?: SpecOptions) {
    // if called, assume args is always set (even empty)
    this.#options.args ||= this.#args;
    // create copy of options here since we need to keep its reference later
    this.#list.push({ arg, options: this.#assignArg(arg, normalize(options)) });
    return this;
  }

  command(arg: string, options?: SpecOptions) {
    return this.option(arg, options).spec(spec => spec.args());
  }

  alias(alias: string | string[], args?: string | string[]) {
    const { arg } = this.#current('alias()');
    const aliasArgs =
      typeof args === 'string' || Array.isArray(args)
        ? ([arg].concat(args) as [string, ...string[]])
        : arg;
    const aliases =
      typeof alias === 'string' ? [alias] : Array.isArray(alias) ? alias : [];
    for (const alias of aliases) {
      this.#assignAlias(alias, aliasArgs);
    }
    return this;
  }

  spec(setup: (spec: ISpec) => void) {
    setup(this.#spec(this.#current('spec()')));
    return this;
  }

  aliases(alias: Required<Options>['alias']) {
    for (const [key, value] of Object.entries(alias)) {
      this.#assignAlias(key, value);
    }
    return this;
  }

  args(handler?: (arg: string, data: NodeData) => Options | null | undefined) {
    // if called, assume args is always set (even empty)
    this.#options.args ||= this.#args;
    if (typeof handler === 'function') {
      // when a callback is set, use that instead
      this.#options.args = (arg, data) => this.#args[arg] || handler(arg, data);
    }
    return this;
  }

  options() {
    return this.#options;
  }

  parse(args: readonly string[]) {
    return argstree(args, this.#options);
  }

  parent() {
    return this.#parent;
  }

  children() {
    return this.#list.map(item => this.#spec(item));
  }

  ancestors() {
    const specs: ISpec[] = [];
    if (this.#parent) {
      specs.push(...this.#parent.ancestors(), this.#parent);
    }
    return specs;
  }

  descendants() {
    const specs: ISpec[] = [];
    for (const item of this.#list) {
      const child = this.#spec(item);
      specs.push(child, ...child.descendants());
    }
    return specs;
  }
}
