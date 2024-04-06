import { isAlias } from '../utils/arg.utils.js';
import { has } from '../utils/object.utils.js';
import { Alias } from '../utils/type.utils.js';

export function getArgs(
  alias: Alias,
  key: string
): [string, ...string[]][] | undefined {
  const args = has(alias, key) ? alias[key] : null;
  if (typeof args === 'string') {
    return [[args]];
  } else if (!Array.isArray(args)) {
    return;
  }
  let strList: [string, ...string[]] | undefined;
  const list: [string, ...string[]][] = [];
  for (const arg of args) {
    if (typeof arg === 'string') {
      if (!strList?.push(arg)) {
        list.push((strList = [arg]));
      }
    } else if (Array.isArray(arg) && arg.length > 0) {
      // filter out empty list
      list.push(arg);
    }
  }
  return list;
}

export function getAliases(alias: Alias): string[] {
  const aliases: string[] = [];
  // get aliases and sort by length desc
  for (const [key, value] of Object.entries(alias)) {
    // skip command aliases since we don't need to split them
    if (isAlias(key) && (typeof value === 'string' || Array.isArray(value))) {
      // remove prefix only when saving
      aliases.push(key.slice(1));
    }
  }
  return aliases.sort((a, b) => b.length - a.length);
}
