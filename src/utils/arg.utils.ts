export function isAlias(arg: string): boolean {
  return arg.length >= 2 && arg[0] === '-' && arg[1] !== '-';
}
