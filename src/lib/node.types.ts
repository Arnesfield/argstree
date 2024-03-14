export interface NodeRange {
  min: number | null;
  max: number | null;
  maxRead: number | null;
  satisfies: { min: boolean; max: boolean; maxRead: boolean };
}
