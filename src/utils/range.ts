function parse(n: number | null | undefined) {
  return typeof n === 'number' && !isNaN(n) && n >= 0 ? n : null;
}

export function range(range: { min?: number | null; max?: number | null }): {
  min: number | null;
  max: number | null;
} {
  return { min: parse(range.min), max: parse(range.max) };
}
