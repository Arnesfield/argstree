export function ensureNumber(n: number | undefined): number | null {
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : null;
}
