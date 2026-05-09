import { Arg } from './arg.types';
import { Options } from './options.types';
import { SchemaType } from './schema.types';
import { RequiredPick } from './util.types';

// NOTE: internal

export interface Alias<T> extends Readonly<Pick<Arg, 'key'>> {
  /** Alias name. */
  readonly alias: string;
  /** Alias arguments. */
  readonly args: string[];
  /** The schema config. */
  readonly cfg: Config<T>;
}

export interface Config<T> {
  readonly type: SchemaType;
  readonly options: Options<T>;
  readonly map?: { readonly [arg: string]: Config<T> | null | undefined };
  readonly alias?: { readonly [alias: string]: Alias<T> | null | undefined };
  readonly short?: { readonly [code: number]: Alias<T> | null | undefined };
}

export type SchemaConfig<T> = RequiredPick<
  Config<T>,
  'map' | 'alias' | 'short'
>;
