export interface TruthRecord {
  id: string;
  domain: string;
  inputs: Record<string, unknown>;
  expected: Record<string, unknown>;
  tolerance_pct?: number;
  source?: string;
}

export const calculationTruthManifest: TruthRecord[] = [];

export function registerTruth(record: TruthRecord): void {
  calculationTruthManifest.push(record);
}

export function getTruthByDomain(domain: string): TruthRecord[] {
  return calculationTruthManifest.filter((r) => r.domain === domain);
}

export function getTruthById(id: string): TruthRecord | undefined {
  return calculationTruthManifest.find((r) => r.id === id);
}
