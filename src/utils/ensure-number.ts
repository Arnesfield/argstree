export function ensureNumber(n: number | null | undefined): number | null {
  return typeof n === 'number' && !isNaN(n) && n >= 0 ? n : null;
}
