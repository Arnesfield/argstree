export function isAlias(arg: string): boolean {
  return arg.length >= 2 && arg[0] === '-' && arg[1] !== '-';
}

export function isOption(arg: string): boolean {
  return arg.length >= 3 && arg.slice(0, 2) === '--';
}
