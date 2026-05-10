import { Options } from './options.types';
import { ParserType } from './parser.types';

// NOTE: internal

export interface Alias<T> {
  /** Either used as a single character key or an alias string. */
  key: string;
  cfg: Config<T>;
}

export interface Config<T> {
  readonly type: ParserType;
  readonly options: Options<T>;
  readonly map?: { readonly [arg: string]: Config<T> | null | undefined };
  readonly alias?: { readonly [char: string]: Config<T> | null | undefined };
}

export type ParserConfig<T> = Required<Config<T>>;
