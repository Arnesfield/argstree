// ensure non-negative number
export function number(n: number | undefined): number | null {
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : null;
}
