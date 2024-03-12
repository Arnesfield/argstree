export function splitAlias(
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
        const split = splitAlias(part, matches, matchIndex + 1);
        values.push(split.value);
        aliases.push(...split.aliases);
      }
      if (partIndex < parts.length - 1) {
        aliases.push(match);
      }
    }
    value = values.join('');
  }
  return { value, aliases };
}
