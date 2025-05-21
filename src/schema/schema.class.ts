import { normalize, NormalizedOptions } from '../parser/normalize';
import { parse } from '../parser/parse';
import { resolve } from '../parser/resolve';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { obj } from '../utils/obj';
import {
  Schema as ISchema,
  ResolvedArg,
  ResolvedConfig,
  SchemaMap,
  SchemaType
} from './schema.types';

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
      this.map = obj<SchemaMap<T>>();
      // only call init once and only after setting args
      this.options.init?.(this);
    }
    return this.map;
  }

  resolve(arg: string): ResolvedArg<T> | undefined {
    const res = resolve(arg, (this.opts ||= normalize(this)));
    if (!res) {
      // do nothing
    } else if (res.items) {
      // prettier-ignore
      const configs = res.items.map((r): ResolvedConfig<T> => ({
        key: r.key,
        alias: r.alias,
        type: r.schema.type,
        options: { ...r.schema.options, args: r.args }
      }));
      return { configs };
    } else if (res.split) {
      return { split: res.split };
    }
  }

  parse(args: readonly string[]): Node<T> {
    // create copy of args to avoid external mutation
    return parse(args.slice(), this);
  }
}
