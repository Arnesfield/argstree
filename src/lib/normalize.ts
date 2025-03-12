import { Aliases, NodeData, Options } from '../core/core.types.js';
import { ArgConfig, Config } from '../schema/schema.types.js';
import { isAlias } from '../utils/arg.utils.js';
import { ensureNumber } from '../utils/ensure-number.js';

// NOTE: internal

export type NormalizedAlias = [
  [string, ...string[]],
  ...[string, ...string[]][]
];

export interface NormalizedOptions {
  readonly type: NodeData['type'];
  /** Determines if the Node is a leaf node and cannot have descendants. */
  readonly leaf: boolean;
  /** Determines if the Node can actually have children. */
  readonly fertile: boolean;
  readonly range: {
    min?: number | null;
    max?: number | null;
    maxRead?: number | null;
  };
  readonly src: Options;
  /** Safe args object. */
  readonly args: { [arg: string]: ArgConfig | null | undefined };
  /** Same as `args` but resolved configs. */
  readonly schemas: { [arg: string]: Config | null | undefined };
  /** Safe aliases object. */
  readonly aliases: { [alias: string]: NormalizedAlias | null | undefined };
  /** A sorted list of splittable alias names without the `-` prefix. */
  readonly names: string[];
}

export function getArgs(alias: Aliases[string]): [string, ...string[]][] {
  /** List of strings in `args`. */
  let strs: [string, ...string[]] | undefined;
  const list: [string, ...string[]][] = [];
  const args =
    typeof alias === 'string' ? [alias] : Array.isArray(alias) ? alias : [];

  for (const arg of args) {
    if (typeof arg === 'string') {
      strs ? strs.push(arg) : list.push((strs = [arg]));
    } else if (Array.isArray(arg) && arg.length > 0) {
      // filter out empty array
      list.push(arg as [string, ...string[]]);
    }
  }

  return list;
}

type PartialPick<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// create empty node data for errors
export function ndata(cfg: PartialPick<ArgConfig, 'arg'>): NodeData {
  const key = cfg.arg ?? null;
  const { type, options } = cfg;
  return { raw: key, key, alias: null, type, args: [], options };
}

export function normalize(config: Config): NormalizedOptions {
  const src = config.options;

  // get and validate range only after setting the fields above
  type R = NormalizedOptions['range'];
  const range: R = { min: ensureNumber(src.min), max: ensureNumber(src.max) };
  range.maxRead = ensureNumber(src.maxRead) ?? range.max;

  const args = { __proto__: null, ...config.args };
  const aliases = { __proto__: null, ...config.aliases };
  const aliasKeys = Object.keys(aliases);
  const fertile =
    !!src.handler || aliasKeys.length > 0 || Object.keys(args).length > 0;

  // sort by length desc for splitting later on
  return {
    type: config.type,
    leaf: !fertile && (src.leaf ?? config.type === 'option'),
    fertile,
    range,
    src,
    args,
    schemas: { __proto__: null },
    aliases,
    names: aliasKeys
      .reduce((keys: string[], key) => {
        // skip command aliases since we don't need to split them
        // and remove `-` prefix
        if (isAlias(key)) keys.push(key.slice(1));
        return keys;
      }, [])
      .sort((a, b) => b.length - a.length)
  };
}
