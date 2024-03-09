function parse(n: number | null | undefined) {
  return typeof n === 'number' && !isNaN(n) && n >= 0 ? n : null;
}

export interface Range {
  min: number | null;
  max: number | null;
}

export function range(range: Partial<Range>): Range {
  return { min: parse(range.min), max: parse(range.max) };
}
