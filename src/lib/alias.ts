import { Options } from '../core/core.types';
import { isAlias } from '../utils/arg.utils';
import { splitAlias } from './split-alias';

export class Alias {
  private readonly aliases: string[] = [];
  private readonly aliasMap: {
    [name: string]: string | string[] | null | undefined;
  } = Object.create(null);

  constructor(alias: Options['alias']) {
    if (typeof alias === 'object' && alias !== null) {
      Object.assign(this.aliasMap, alias);
    }

    // get aliases and sort by length desc
    for (const alias in this.aliasMap) {
      // skip command aliases since we don't need to split them
      if (isAlias(alias) && this.getAliasArgs(alias)) {
        // remove prefix only when saving
        this.aliases.push(alias.slice(1));
      }
    }
    this.aliases.sort((a, b) => b.length - a.length);
  }

  getAliasArgs(alias: string): string[] | null {
    const args = this.aliasMap[alias];
    return Array.isArray(args)
      ? args
      : typeof args === 'string'
      ? [args]
      : null;
  }

  split(arg: string): { arg: string | null; argsList: string[][] } | undefined {
    // only accept aliases
    if (!isAlias(arg)) {
      return;
    }
    // remove first `-` for alias
    const split = splitAlias(arg.slice(1), this.aliases);
    // handle left over value from split
    const value = split.value ? '-' + split.value : null;
    // if value matches the same arg, it was never split
    if (value === arg) {
      return;
    }
    // get args per alias
    const argsList: string[][] = [];
    for (const alias of split.aliases) {
      // note that split.aliases does not have `-` prefix
      const aliasArgs = this.getAliasArgs('-' + alias);
      // accept regardless if no length
      if (aliasArgs) {
        argsList.push(aliasArgs);
      }
    }
    // considered as split only if alias args were found
    return argsList.length > 0 ? { arg: value, argsList } : undefined;
  }
}
