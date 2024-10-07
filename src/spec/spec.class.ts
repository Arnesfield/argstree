import { Alias, Options } from '../core/core.types.js';
import { has } from '../utils/object.utils.js';
import { Type } from '../utils/type.utils.js';
import { SpecError } from './spec.error.js';
import { Aliases, Spec as ISpec } from './spec.types.js';

export const typeLabel = { command: 'Command', option: 'Option' } as const;

// TODO: move
export function displayName(
  id: string | null,
  type: Type,
  options: Options | undefined
): string {
  const name = options?.name ?? id ?? null;
  return name === null ? '' : `${typeLabel[type]} '${name}' `;
}

interface Args {
  [arg: string]: Spec | null | undefined;
}

// NOTE: internal
export class Spec implements ISpec {
  #args?: Args;
  #aliases?: Aliases;
  readonly #list: Spec[] = [];
  readonly #options: Options | undefined;
  readonly #parent: Spec | null;
  readonly id: string | null;
  readonly type: Type;
  readonly depth: number;

  constructor(
    type: Type,
    options: Options | undefined,
    id: string | null = null,
    parent: Spec | null = null
  ) {
    this.id = id;
    this.type = type;
    this.depth = parent ? parent.depth + 1 : 0;
    this.#parent = parent;
    this.#options = options;
  }

  #error(message: string): never {
    const name = displayName(this.id, this.type, this.#options);
    throw new SpecError(
      this.id,
      this.#options,
      (name && name + 'spec error: ') + message
    );
  }

  // TODO: rename?
  #setAlias(key: string, value: Alias) {
    const aliases = (this.#aliases ||= { __proto__: null });
    if (has(aliases, key)) {
      this.#error(`Alias '${key}' already exists.`);
    }
    aliases[key] = value;
  }

  // TODO: rename?
  #specAlias(arg: string, alias: Alias) {
    // use `alias[0]` as alias and `arg` as arg
    const aliases =
      typeof alias === 'string' ? [alias] : Array.isArray(alias) ? alias : [];
    for (const item of aliases) {
      // each item is an alias
      // if array, item[0] is an alias
      const items =
        typeof item === 'string'
          ? ([item] as [string, ...string[]])
          : Array.isArray(item) && item.length > 0
            ? item
            : undefined;
      if (items) {
        this.#setAlias(
          items[0],
          items.length > 1
            ? ([arg].concat(items.slice(1)) as [string, ...string[]])
            : arg
        );
      }
    }
  }

  #add(type: Type, arg: string, options?: Options) {
    // if called, assume args is always set (even empty)
    const args = (this.#args ||= { __proto__: null });
    const opts = args[arg];
    if (opts) {
      this.#error(`${typeLabel[opts.type]} '${arg}' already exists.`);
    }
    // create instance
    const item = (args[arg] = new Spec(type, options, arg, this));
    this.#list.push(item);
    // add aliases
    this.#specAlias(arg, options?.alias);
    // run spec
    if (typeof options?.spec === 'function') {
      options.spec(item);
    }
    return item;
  }

  aliases(aliases: Aliases): this {
    for (const [key, value] of Object.entries(aliases)) {
      this.#setAlias(key, value);
    }
    return this;
  }

  option(arg: string, options?: Options): this {
    this.#add('option', arg, options);
    return this;
  }

  command(arg: string, options?: Options): this {
    const item = this.#add('command', arg, options);
    // set args for commands
    item.#args ||= { __proto__: null };
    return this;
  }

  parse(args: readonly string[]) {
    // TODO:
    // return argstree(args, this.#options);
    console.log('options', this.#options, this.#args, this.#aliases);
  }

  parent(): Spec | null {
    return this.#parent;
  }

  children(): Spec[] {
    return this.#list;
  }

  ancestors(): Spec[] {
    return this.#parent ? this.#parent.ancestors().concat(this.#parent) : [];
  }

  descendants(): Spec[] {
    const specs: Spec[] = [];
    for (const item of this.#list) {
      specs.push(item, ...item.descendants());
    }
    return specs;
  }
}
