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
      if (typeof arg === 'string') {
        if (strList) {
          strList.push(arg);
        } else {
          strList = [arg];
          list.push(strList);
        }
      } else if (Array.isArray(arg) && arg.length > 0) {
        // filter out empty list
        list.push(arg);
      }
    }
    return list;
  }

  split(
    arg: string
  ): { arg: string | null; argsList: [string, ...string[]][] } | undefined {
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
    let hasArgs = false;
    const argsList: [string, ...string[]][] = [];
    for (const alias of split.aliases) {
      // note that split.aliases does not have `-` prefix
      const list = this.getArgs('-' + alias);
      if (list) {
        hasArgs = true;
        argsList.push(...list);
      }
    }
    // considered as split only if alias args were found
    return hasArgs ? { arg: value, argsList } : undefined;
  }
}
