import { Options } from '../types/core.types';
import { isAlias, isOption } from '../utils/arg.utils';
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
    for (let alias in this.aliasMap) {
      alias = alias.trim();
      const args = alias && isAlias(alias) ? this.getAliasArgs(alias) : [];
      // skip command aliases since we don't need to split them
      if (args.length > 0 && isOption(args[0])) {
        // remove prefix only when saving
        this.aliases.push(alias.slice(1));
      }
    }
    this.aliases.sort((a, b) => b.length - a.length);
  }

  getAliasArgs(alias: string): string[] {
    const args = this.aliasMap[alias];
    return Array.isArray(args) ? args : typeof args === 'string' ? [args] : [];
  }

  split(arg: string): { arg: string | null; args: string[][]; total: number } {
    const isAnAlias = isAlias(arg);
    // remove first `-` for alias
    const split = isAnAlias
      ? splitAlias(arg.slice(1), this.aliases)
      : { value: arg, aliases: [arg] };

    let total = 0;
    const args: string[][] = [];
    for (const alias of split.aliases) {
      // note that split.aliases does not have `-` prefix
      // get arg from alias map to save
      const prefix = isAnAlias ? '-' : '';
      const aliasArgs = this.getAliasArgs(prefix + alias);
      args.push(aliasArgs);
      total += aliasArgs.length;
    }
    // handle left over value from split
    const value = !split.value
      ? null
      : isAnAlias
      ? '-' + split.value
      : total === 0
      ? split.value
      : null;
    return { arg: value, args, total };
  }
}
