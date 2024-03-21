import { Options } from '../core/core.types.js';
import { isAlias } from '../utils/arg.utils.js';
import { splitAlias } from './split-alias.js';

export class Alias {
  private readonly aliases: string[] = [];
  private readonly aliasMap: Exclude<Options['alias'], undefined> =
    Object.create(null);

  constructor(alias: Options['alias']) {
    if (typeof alias === 'object' && alias !== null) {
      Object.assign(this.aliasMap, alias);
    }

    // get aliases and sort by length desc
    for (const alias in this.aliasMap) {
      // skip command aliases since we don't need to split them
      const aliasArgs = this.aliasMap[alias];
      if (
        isAlias(alias) &&
        (typeof aliasArgs === 'string' || Array.isArray(aliasArgs))
      ) {
        // remove prefix only when saving
        this.aliases.push(alias.slice(1));
      }
    }
    this.aliases.sort((a, b) => b.length - a.length);
  }

  getArgs(alias: string): [string, ...string[]][] | null {
    const args = this.aliasMap[alias];
    const aliasArgs =
      typeof args === 'string' ? [args] : Array.isArray(args) ? args : null;
    if (!Array.isArray(aliasArgs)) {
      return null;
    }
    let strList: [string, ...string[]] | undefined;
    const list: [string, ...string[]][] = [];
    for (const arg of aliasArgs) {
      if (Array.isArray(arg)) {
        list.push(arg);
      } else if (typeof arg === 'string') {
        if (!strList) {
          strList = [arg];
          list.push(strList);
        } else {
          strList.push(arg);
        }
      }
    }
    return list;
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
      const list = this.getArgs('-' + alias);
      // accept regardless if no length
      for (const aliasArgs of list || []) {
        argsList.push(aliasArgs);
      }
    }
    // considered as split only if alias args were found
    return argsList.length > 0 ? { arg: value, argsList } : undefined;
  }
}
