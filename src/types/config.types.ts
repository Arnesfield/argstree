import { Spec as SpecClass } from '../parser/spec.class';
import { Options } from './options.types';
import { Fallback } from './spec.types';

// NOTE: internal

export interface Alias<T> {
  /** Config ID. */
  id: string | undefined;
  /** Either used as a single character key or an alias string. */
  key: string;
  cfg: Config<T>;
}

// don't use for Spec.arg() type
export type InitFunction<T> = () => SpecClass<T> | null | undefined;

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
  options: Options<T>;
  map?: ConfigMap<T>;
  alias?: ConfigMap<T>;
  fallback?: Fallback<T> | null;
}

export type InitializedConfig<T> = Config<T> | InitializedRefConfig<T>;
export type UninitializedConfig<T> = Config<T> | UninitializedRefConfig<T>;

export interface ConfigMap<T> {
  [arg: string]:
    | InitializedConfig<T>
    | UninitializedConfig<T>
    | null
    | undefined;
}
