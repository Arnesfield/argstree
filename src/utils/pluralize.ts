export function pluralize(str: string, value: number, s = 's'): string {
  return str + (value === 1 ? '' : s);
}
