import { splitAlias } from '../helpers/split-alias';
import { Options } from '../types/core.types';
import { isAlias, isOption } from '../utils/arg.utils';

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

  split(arg: string): { arg: string | null; args: string[] } {
    const isAnAlias = isAlias(arg);
    // remove first `-` for alias
    const split = isAnAlias
      ? splitAlias(arg.slice(1), this.aliases)
      : { value: arg, aliases: [arg] };

    const args: string[] = [];
    for (let alias of split.aliases) {
      // note that split.aliases does not have `-` prefix
      // get arg from alias map and use first arg if any
      alias = (isAnAlias ? '-' : '') + alias;
      const aliasArgs = this.getAliasArgs(alias);
      if (aliasArgs.length > 0) {
        args.push(aliasArgs[0]);
      }
    }
    // handle left over value from split
    const value = !split.value
      ? null
      : isAnAlias
      ? '-' + split.value
      : args.length === 0
      ? split.value
      : null;
    return { args, arg: value };
  }
}
