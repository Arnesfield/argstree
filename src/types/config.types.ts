import { Spec as SpecClass } from '../parser/spec.class';
import { Options } from './options.types';
import { Fallback } from './spec.types';

// NOTE: internal

export interface Alias<T> {
  ic: InitializedConfig<T>;
  /** Either used as a single character key or an alias string. */
  key: string;
  cfg: Config<T>;
}

// don't use for Spec.arg() type
export type InitFunction<T> = (
  options?: Options<T>
) => SpecClass<T> | null | undefined;

export interface InitializedRefConfig<T> {
  id: string;
  ref: Config<T> | null;
  init?: InitFunction<T>;
}

export interface UninitializedRefConfig<T> {
  id: string;
  ref?: Config<T> | null;
  init: InitFunction<T>;
}

export type Config<T> = {
  id?: string;
  ref?: never;
  init?: never;
  options: Options<T>;
  fallback?: Fallback<T> | null;
} & ({ mapv: true; map: ConfigMap<T> } | { mapv?: false; map?: ConfigMap<T> }) &
  (
    | { aliasv: true; alias: ConfigMap<T> }
    | { aliasv?: false; alias?: ConfigMap<T> }
  );

export type InitializedConfig<T> = Config<T> | InitializedRefConfig<T>;
export type UninitializedConfig<T> = Config<T> | UninitializedRefConfig<T>;

export interface ConfigMap<T> {
  [arg: string]:
    | InitializedConfig<T>
    | UninitializedConfig<T>
    | null
    | undefined;
}
