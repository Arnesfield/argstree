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

export interface BaseConfig {
  id?: string;
}

export interface InitializedRefConfig<T> extends BaseConfig {
  ref: Config<T> | null;
}

export interface UninitializedRefConfig<T> extends BaseConfig {
  ref: Config<T> | InitFunction<T> | null;
}

export interface Config<T> extends BaseConfig {
  ref?: never;
  readonly type: ParserType;
  readonly options: Options<T>;
  readonly map?: ConfigMap<T>;
  readonly alias?: ConfigMap<T>;
  handler?: Handler<T> | null;
}

export type InitializedConfig<T> = Config<T> | InitializedRefConfig<T>;
export type UninitializedConfig<T> = Config<T> | UninitializedRefConfig<T>;

export interface ConfigMap<T> {
  readonly [arg: string]:
    | InitializedConfig<T>
    | UninitializedConfig<T>
    | null
    | undefined;
}

export type ParserConfig<T> = RequiredPick<Config<T>, 'map' | 'alias'>;
