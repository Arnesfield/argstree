import { isAlias } from '../utils/arg.utils';

function unwrap(
  value: string,
  matches: string[],
  matchIndex = 0
): { value: string; aliases: string[] } {
  const aliases: string[] = [];
  if (matchIndex < matches.length) {
    const match = matches[matchIndex];
    const parts = value.split(match);
    // get left over values (or parts) from recursive calls
    const values: string[] = [];
    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      const part = parts[partIndex];
      if (part) {
        const unwrapped = unwrap(part, matches, matchIndex + 1);
        values.push(unwrapped.value);
        aliases.push(...unwrapped.aliases);
      }
      if (partIndex < parts.length - 1) {
        // newParts.push(match)
        aliases.push(match);
      }
    }
    value = values.join('');
  }
  return { value, aliases };
}

export function splitAlias(
  arg: string,
  aliases: string[]
): { value: string; aliases: string[] } {
  // remove first `-` for alias
  return isAlias(arg)
    ? unwrap(arg.slice(1), aliases)
    : { value: '', aliases: [] };
}
