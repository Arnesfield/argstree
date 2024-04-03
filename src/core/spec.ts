import { displayName, getType } from '../utils/options.utils.js';
import { Alias, ArgsFunction, ArgsObject } from '../utils/type.utils.js';
import { argstree } from './argstree.js';
import { Options } from './core.types.js';
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

// normalize should just remove omitted alias and args
// so we don't have to maintain a list of props
function normalize(options: SpecOptions | undefined) {
  options = { ...options };
  delete (options as Options).alias;
  delete (options as Options).args;
  return options;
}

interface SpecItem {
  arg: string;
  options: Options;
  spec?: ISpec | undefined;
}

class Spec implements ISpec {
  readonly #args: ArgsObject = Object.create(null);
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

  #error(message: string): never {
    const name = displayName(this.id, this.#options);
    throw new ArgsTreeError({
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
      this.#error(
        `Requires \`option()\` or \`command()\` call before \`${context}\`.`
      );
    }
    return this.#list[this.#list.length - 1];
  }

  #assignArg(arg: string, options: Options) {
    if (arg in this.#args) {
      this.#error(`${getType(arg)} '${arg}' already exists.`);
    }
    return (this.#args[arg] = options);
  }

  #assignAlias(alias: string, args: Alias[string]) {
    if (alias in (this.#options.alias ||= Object.create(null) as Alias)) {
      this.#error(`Alias '${alias}' already exists.`);
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

  aliases(alias: Alias) {
    for (const [key, value] of Object.entries(alias)) {
      this.#assignAlias(key, value);
    }
    return this;
  }

  args(handler?: ArgsFunction) {
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
    return this.#parent ? [...this.#parent.ancestors(), this.#parent] : [];
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
