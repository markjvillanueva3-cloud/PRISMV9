/**
 * AssetSynergyDetectorEngine — Find asset combinations that work together
 *
 * Phase 0.24 U-WIRE8 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a stream
 * of observed co-invocations (assets A and B were used in the same session
 * for the same task), compute a pointwise mutual information (PMI)-style
 * score for each pair and surface the top synergies. Filters out pairs that
 * only co-occur because both are ubiquitous.
 *
 * The PMI formula:
 *   PMI(A, B) = log2( P(A,B) / (P(A) · P(B)) )
 *
 * A positive PMI indicates the pair co-occurs more often than chance would
 * predict. We use positive-PMI only (PPMI) so negative scores are clamped
 * to zero and don't leak into the ranking.
 *
 * @module engines/AssetSynergyDetectorEngine
 * @milestone PP-0.24-U-WIRE8
 */

export interface CoOccurrence {
  sessionId: string;
  assets: readonly string[];
}

export interface SynergyPair {
  assetA: string;
  assetB: string;
  coOccurrence: number;
  ppmi: number;
  lift: number;
}

export interface SynergyReport {
  totalSessions: number;
  totalPairs: number;
  top: SynergyPair[];
}

export class AssetSynergyDetectorEngine {
  private readonly pairCounts = new Map<string, number>();
  private readonly singleCounts = new Map<string, number>();
  private sessions = 0;
  private readonly seenSessions = new Set<string>();

  observe(entry: CoOccurrence): void {
    if (!entry.sessionId || entry.sessionId.trim() === "") throw new Error("sessionId required");
    if (!Array.isArray(entry.assets)) throw new Error("assets must be array");
    if (this.seenSessions.has(entry.sessionId)) return;
    this.seenSessions.add(entry.sessionId);
    this.sessions += 1;

    const unique = [...new Set(entry.assets.map((a) => a.trim()).filter(Boolean))].sort();
    for (const a of unique) {
      this.singleCounts.set(a, (this.singleCounts.get(a) ?? 0) + 1);
    }
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        const key = this.pairKey(unique[i], unique[j]);
        this.pairCounts.set(key, (this.pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  topSynergies(limit = 10, minCoOccurrence = 2): SynergyReport {
    if (!Number.isInteger(limit) || limit < 0) throw new Error("limit must be ≥ 0 integer");
    if (!Number.isInteger(minCoOccurrence) || minCoOccurrence < 1) {
      throw new Error("minCoOccurrence must be ≥ 1 integer");
    }
    if (this.sessions === 0) return { totalSessions: 0, totalPairs: 0, top: [] };

    const pairs: SynergyPair[] = [];
    for (const [key, count] of this.pairCounts) {
      if (count < minCoOccurrence) continue;
      const [a, b] = key.split("|");
      const pA = (this.singleCounts.get(a) ?? 0) / this.sessions;
      const pB = (this.singleCounts.get(b) ?? 0) / this.sessions;
      const pAB = count / this.sessions;
      if (pA === 0 || pB === 0) continue;
      const lift = pAB / (pA * pB);
      const ppmi = Math.max(0, Math.log2(lift));
      pairs.push({
        assetA: a,
        assetB: b,
        coOccurrence: count,
        ppmi: round4(ppmi),
        lift: round4(lift),
      });
    }

    pairs.sort((a, b) => {
      if (b.ppmi !== a.ppmi) return b.ppmi - a.ppmi;
      if (b.coOccurrence !== a.coOccurrence) return b.coOccurrence - a.coOccurrence;
      return a.assetA.localeCompare(b.assetA);
    });

    return {
      totalSessions: this.sessions,
      totalPairs: pairs.length,
      top: limit === 0 ? pairs : pairs.slice(0, limit),
    };
  }

  /** Synergies involving a specific asset, sorted by PPMI desc. */
  synergiesFor(asset: string, limit = 5, minCoOccurrence = 2): SynergyPair[] {
    const report = this.topSynergies(0, minCoOccurrence);
    const filtered = report.top.filter((p) => p.assetA === asset || p.assetB === asset);
    return limit === 0 ? filtered : filtered.slice(0, limit);
  }

  sessionCount(): number {
    return this.sessions;
  }

  clear(): void {
    this.pairCounts.clear();
    this.singleCounts.clear();
    this.seenSessions.clear();
    this.sessions = 0;
  }

  private pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const assetSynergyDetectorEngine = new AssetSynergyDetectorEngine();
