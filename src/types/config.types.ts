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
  /** Determines if there are options and commands in {@linkcode map}. */
  readonly mapc?: boolean;
  /** Determines if short options can be split. */
  readonly split?: boolean;
  readonly map?: { readonly [arg: string]: Config<T> };
  readonly alias?: { readonly [alias: string]: Alias<T> };
  readonly short?: { readonly [code: number]: Alias<T> };
}

export type SchemaConfig<T> = RequiredPick<
  Config<T>,
  'map' | 'alias' | 'short'
>;
