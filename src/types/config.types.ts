import { Spec as SpecClass } from '../parser/spec.class';
import { Options } from './options.types';
import { Fallback } from './spec.types';

// NOTE: internal

export interface Short<T> {
  /** Either used as a single character key or one short option. */
  key: string;
  ic: InitializedConfig<T>;
  cfg: Config<T>;
}

// don't use for Spec.arg() type
export type InitFunction<T> = (
  options?: Options<T>
) => SpecClass<T> | null | undefined;

export interface UninitializedRefConfig<T> {
  id: string;
  ref?: Config<T> | null;
  init: InitFunction<T>;
}

export type InitializedRefConfig<T> = Required<UninitializedRefConfig<T>>;

export type Config<T> = {
  id?: string;
  ref?: never;
  init?: never;
  options: Options<T>;
  fallback?: Fallback<T> | null;
} & ({ mapv: true; map: ConfigMap<T> } | { mapv?: false; map?: ConfigMap<T> }) &
  (
    | { shortv: true; short: ConfigMap<T> }
    | { shortv?: false; short?: ConfigMap<T> }
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
