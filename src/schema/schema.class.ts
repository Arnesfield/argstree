import { normalize, NormalizedOptions } from '../parser/normalize';
import { parse } from '../parser/parse';
import { resolve } from '../parser/resolve';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import {
  Schema as ISchema,
  ResolvedArg,
  ResolvedItem,
  ResolvedOptions,
  SchemaMap,
  SchemaType
} from '../types/schema.types';

// NOTE: internal

export class Schema<T> implements ISchema<T> {
  private map: SchemaMap<T> | undefined;
  private opts: NormalizedOptions<T> | null | undefined;

  constructor(
    readonly type: SchemaType,
    readonly options: Options<T> = {}
  ) {}

  private add(arg: string, type: SchemaType, options?: Options<T>) {
    this.schemas()[arg] = new Schema(type, options);
    // clear cached options to re-evaluate it when needed
    this.opts = null;
    return this;
  }

  option(arg: string, options?: Options<T>): this {
    return this.add(arg, 'option', options);
  }

  command(arg: string, options?: Options<T>): this {
    return this.add(arg, 'command', options);
  }

  schemas(): SchemaMap<T> {
    // consider as initialized if 'args' is already provided
    if (!this.map) {
      this.map = { __proto__: null! };
      // only call init once and only after setting args
      this.options.init?.(this);
    }
    return this.map;
  }

  resolve(key: string, value?: string | null): ResolvedArg<T> | undefined {
    // NOTE: normalize() can get called twice if resolve() is called to initialize
    // the schema and inside options.init() has resolve() calls as well
    // this would mean this.opts is not yet set for the 2nd resolve() call.
    // to prevent this, make sure to initialize the schema first before normalize()
    this.schemas();

    const arg = resolve((this.opts ||= normalize(this)), key, value);
    if (!arg) {
      // do nothing
    } else if (arg.items) {
      type A = ResolvedArg<T>;
      type O = ResolvedOptions<T>;

      // reuse arg object
      (arg as unknown as A).items = arg.items.map((r): ResolvedItem<T> => {
        const { id = r.key, name = r.key } = r.schema.options;
        const options: O = { ...r.schema.options, id, name, args: r.args };
        // prettier-ignore
        return { key: r.key, alias: r.alias ?? null, type: r.schema.type, options };
      });

      return arg as unknown as A;
    } else if (arg.split) return arg;
  }

  parse(args: readonly string[]): Node<T> {
    // create copy of args to avoid external mutation
    return parse(args.slice(), this);
  }
}
