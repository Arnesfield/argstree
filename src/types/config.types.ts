import { Parser as ParserClass } from '../parser/parser';
import { Options } from './options.types';
import { Handler, ParserType } from './parser.types';
import { RequiredPick } from './util.types';

// NOTE: internal

export interface Alias<T> {
  /** Config ID. */
  id: string | undefined;
  /** Either used as a single character key or an alias string. */
  key: string;
  cfg: Config<T>;
}

// don't use for Parser.arg() type
export type InitFunction<T> = () => ParserClass<T> | null;

export interface ConfigMap<T> {
  readonly [arg: string]: RawConfig<T> | null | undefined;
}

export interface BaseConfig<T> {
  id?: string;
  ref?: Config<T> | null;
  init?: InitFunction<T> | null;
}

export interface Config<T> extends BaseConfig<T> {
  readonly type: ParserType;
  readonly options: Options<T>;
  readonly map?: ConfigMap<T>;
  readonly alias?: ConfigMap<T>;
  handler?: Handler<T> | null;
}

export type RawConfig<T> = Config<T> | BaseConfig<T>;

export type ParserConfig<T> = RequiredPick<Config<T>, 'map' | 'alias'>;
