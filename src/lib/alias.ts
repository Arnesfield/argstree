import { Options } from '../core/core.types.js';
import { isAlias } from '../utils/arg.utils.js';
import { splitAlias } from './split-alias.js';

export interface ResolvedAlias {
  alias: string;
  args: [string, ...string[]];
}

export class Alias {
  private readonly aliases: string[] = [];
  private readonly aliasMap: Required<Options>['alias'] = Object.create(null);

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

  resolve(aliases: string[], prefix = ''): ResolvedAlias[] | undefined {
    let hasArgs = false;
    const list: ResolvedAlias[] = [];
    for (let alias of aliases) {
      alias = prefix + alias;
      const argsList = this.getArgs(alias);
      if (argsList) {
        hasArgs = true;
        // assume args contains at least one element (thanks, getArgs!)
        for (const args of argsList) {
          list.push({ alias, args });
        }
      }
    }
    return hasArgs ? list : undefined;
  }

  split(
    arg: string
  ): { arg: string | null; list: ResolvedAlias[] } | undefined {
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
    // note that split.aliases does not have `-` prefix
    const list = this.resolve(split.aliases, '-');
    // considered as split only if alias args were found
    return list && { arg: value, list };
  }
}
