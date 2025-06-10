import { normalize, NormalizedOptions } from '../parser/normalize';
import { parse } from '../parser/parse';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import {
  Schema as ISchema,
  ResolvedArg,
  SchemaMap,
  SchemaType
} from '../types/schema.types';
import { resolve } from './resolve';

// NOTE: internal

export class Schema<T> implements ISchema<T> {
  private map: SchemaMap<T> | undefined;
  private opts: NormalizedOptions<T> | null | undefined;

  constructor(
    readonly type: SchemaType,
    readonly options: Options<T> = {}
  ) {}

  private add(arg: string, schema: Schema<T>) {
    this.schemas()[arg] = schema;
    // clear cached options to re-evaluate it when needed
    this.opts = null;
    return this;
  }

  option(arg: string, options?: Options<T>): this {
    return this.add(arg, new Schema('option', options));
  }

  command(arg: string, options?: Options<T>): this {
    return this.add(arg, new Schema('command', options));
  }

  schemas(): SchemaMap<T> {
    // consider as initialized if 'map' is already provided
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

    return resolve((this.opts ||= normalize(this)), key, value);
  }

  parse(args: readonly string[]): Node<T> {
    // create copy of args to avoid external mutation
    return parse(args.slice(), this);
  }
}
