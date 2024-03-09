export function pluralize(str: string, value: number): string {
  return str + (value === 1 ? '' : 's');
}
