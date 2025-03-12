import { NodeData, Options } from '../core/core.types.js';
import { Config } from '../schema/schema.types.js';
import { isAlias } from '../utils/arg.utils.js';
import { ensureNumber } from '../utils/ensure-number.js';

// NOTE: internal

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
  readonly args: Config['args'];
  /** Safe aliases object. */
  readonly aliases: Config['aliases'];
  /** A sorted list of splittable alias names without the `-` prefix. */
  readonly names: string[];
}

export function normalize(config: Config): NormalizedOptions {
  const src = config.options;

  // get and validate range only after setting the fields above
  type R = NormalizedOptions['range'];
  const range: R = { min: ensureNumber(src.min), max: ensureNumber(src.max) };
  range.maxRead = ensureNumber(src.maxRead) ?? range.max;

  const args = { __proto__: null, ...config.args };
  const aliases = { __proto__: null, ...config.aliases };
  const names = Object.keys(aliases);
  const fertile =
    !!src.handler || names.length > 0 || Object.keys(args).length > 0;

  // sort by length desc for splitting later on
  return {
    type: config.type,
    leaf: !fertile && (src.leaf ?? config.type === 'option'),
    fertile,
    range,
    src,
    args,
    aliases,
    names: names
      .reduce((keys: string[], key) => {
        // skip command aliases since we don't need to split them
        // and remove `-` prefix
        if (isAlias(key)) keys.push(key.slice(1));
        return keys;
      }, [])
      .sort((a, b) => b.length - a.length)
  };
}
