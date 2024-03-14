export interface NodeRange {
  min: number | null;
  max: number | null;
  satisfies: { min: boolean; max: boolean; exactMax: boolean };
}
