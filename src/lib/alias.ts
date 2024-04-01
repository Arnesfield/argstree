import { Options } from '../core/core.types.js';
import { isAlias } from '../utils/arg.utils.js';
import { deproto } from '../utils/deproto.js';
import { isObject } from '../utils/is-object.js';
import { split } from '../utils/split.js';

export interface ResolvedAlias {
  alias: string;
  args: [string, ...string[]];
}

export class Alias {
  private readonly aliases: string[] = [];
  private readonly aliasMap: Required<Options>['alias'];

  constructor(alias: Options['alias']) {
    this.aliasMap = deproto(isObject(alias) ? alias : undefined);

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
    // get args per alias
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
  ): { list: ResolvedAlias[]; remainder: string[] } | undefined {
    // only accept aliases
    if (!isAlias(arg)) {
      return;
    }
    // remove first `-` for alias
    const { values, remainder } = split(arg.slice(1), this.aliases);
    // note that split.values do not have `-` prefix
    const list = values.length > 0 ? this.resolve(values, '-') : undefined;
    // considered as split only if alias args were found
    return list && { list, remainder };
  }
}
