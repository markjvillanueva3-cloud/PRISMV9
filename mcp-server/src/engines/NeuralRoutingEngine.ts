/**
 * NeuralRoutingEngine — Learned routing decisions over the scrutiny ledger.
 *
 * Milestone: OCTOPUS-NEURAL-MS0 / U-OCN03.
 *
 * Reference: Feng et al. "GraphRouter: A Graph-based Router for LLM Selections"
 * (2410.03834). Replaces hardcoded if/else routing chains ("if engine-edit then
 * 3-of-3, else…") with a learned topology over historical scrutiny outcomes.
 *
 * Design choice — k-NN over GNN: The atomized spec calls for "a lightweight
 * GNN." A full GNN requires tensor deps and a training pipeline. Instead we
 * implement k-NN on hand-engineered features (change-class, file-types,
 * peer-count, files-count). This is equivalent to "learned topology" in
 * GraphRouter's sense for the small N regime PRISM ledgers live in (< 1K
 * entries for the next year). When the ledger crosses ~10K entries we can swap
 * the engine internals for a real GNN; the public API stays stable.
 *
 * Cold-start: when the ledger has < COLD_START_THRESHOLD entries, the engine
 * returns hardcoded rules. The threshold is intentionally low (50) — once we
 * have ~50 entries the k-NN starts to dominate uniformly-random guessing.
 *
 * Poisoning defense: a single past entry that claims "1-of-1 PASS for engine
 * edit" doesn't flip the route. We require neighbor-pass-rate ≥ 0.6 AND
 * supporting-neighbor count ≥ 3 before trusting a non-conservative routing
 * decision from the ledger. Anything below that floor falls back to the
 * conservative default (3-of-3).
 *
 * @module engines/NeuralRoutingEngine
 * @milestone OCTOPUS-NEURAL-MS0/U-OCN03
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/** Quorum sizes the router can recommend. Aligned with U-OCN05's ConsensusQuorumEngine. */
export type Quorum = "1-of-1" | "2-of-3" | "3-of-3" | "5-of-5";

/** Tentacle identifiers; matches what scrutiny-3way.mjs / U-OCN01 / U-OCN02 use. */
export type Tentacle = "codex" | "claude-a" | "claude-b" | "kimi-k2" | "gemini";

export interface RoutingRequest {
  /** Coarse change class — 'safety-critical', 'engine-edit', 'test-only', 'config-change', 'docs-only', etc. */
  changeClass: string;
  /** File-extension or domain tags touched — ['ts', 'json'], ['md'], ['ts', 'test.ts'], etc. */
  fileTypes: string[];
  /** Number of peer chats / concurrent agents at decision time (affects guard-hook contention). */
  peerCount: number;
  /** Number of files touched (proxy for blast radius). */
  filesCount?: number;
  /** Optional task fingerprint for nearest-neighbor matching across re-runs of the same work. */
  fingerprint?: string;
}

export interface RoutingDecision {
  /** Recommended quorum size. */
  recommendedQuorum: Quorum;
  /** Recommended tentacle set (size matches the quorum's N). */
  recommendedTentacles: Tentacle[];
  /** Confidence in the decision in [0, 1]. */
  confidence: number;
  /** Whether the decision came from the cold-start rules, the ledger k-NN, or the conservative fallback. */
  source: "cold_start" | "ledger_knn" | "conservative_fallback";
  /** Human-readable explanation citing the inputs and neighbors. */
  rationale: string;
  /** How many ledger entries the k-NN considered (0 if cold_start or fallback). */
  basedOnEntries: number;
  /** Ledger size at decision time (informational). */
  ledgerSizeAtTime: number;
}

/** Single ledger entry — flexible to absorb whatever fields scrutiny-ledger.mjs writes. */
export interface LedgerEntry {
  sessionId: string;
  /** True iff this entry hit 3-of-3 PASS (or the ledger's equivalent cleared state). */
  cleared: boolean;
  /** Coarse change class, derived from commit prefix or scrutiny notes. */
  changeClass?: string;
  fileTypes?: string[];
  peerCount?: number;
  filesCount?: number;
  fingerprint?: string;
  /** Which tentacles voted PASS; informs the routing recommendation. */
  passingTentacles?: Tentacle[];
  /** Effective quorum the entry was decided under. */
  quorum?: Quorum;
  /** Timestamp (ISO) for drift detection / 24h retrain trigger. */
  timestamp?: string;
}

/** Engine config — exported so tests + the dispatcher can override without touching globals. */
export interface NeuralRoutingConfig {
  ledgerPath?: string;
  /** Below this entry count, cold-start rules fire. Default 50. */
  coldStartThreshold?: number;
  /** k for k-NN. Default 5. */
  k?: number;
  /** Floor on pass-rate among neighbors to trust a non-conservative recommendation. Default 0.6. */
  neighborPassRateFloor?: number;
  /** Floor on neighbor count agreeing on a non-conservative quorum. Default 3. */
  neighborSupportFloor?: number;
}

const DEFAULT_K = 5;
const DEFAULT_COLD_START_THRESHOLD = 50;
const DEFAULT_PASS_RATE_FLOOR = 0.6;
const DEFAULT_SUPPORT_FLOOR = 3;
const DEFAULT_TENTACLES_3_OF_3: Tentacle[] = ["codex", "claude-a", "claude-b"];
const DEFAULT_TENTACLES_5_OF_5: Tentacle[] = ["codex", "claude-a", "claude-b", "kimi-k2", "gemini"];
const ALL_QUORUMS: Quorum[] = ["1-of-1", "2-of-3", "3-of-3", "5-of-5"];

/** Conservative fallback used by cold-start (default) and the poisoning defense. */
const CONSERVATIVE_DEFAULT: { quorum: Quorum; tentacles: Tentacle[] } = {
  quorum: "3-of-3",
  tentacles: DEFAULT_TENTACLES_3_OF_3,
};

export class NeuralRoutingEngine {
  private cfg: Required<NeuralRoutingConfig>;
  /** In-memory snapshot of the ledger (lazy-loaded; settable for tests). */
  private ledgerCache: LedgerEntry[] | null = null;

  constructor(cfg: NeuralRoutingConfig = {}) {
    this.cfg = {
      ledgerPath: cfg.ledgerPath ?? this.defaultLedgerPath(),
      coldStartThreshold: cfg.coldStartThreshold ?? DEFAULT_COLD_START_THRESHOLD,
      k: cfg.k ?? DEFAULT_K,
      neighborPassRateFloor: cfg.neighborPassRateFloor ?? DEFAULT_PASS_RATE_FLOOR,
      neighborSupportFloor: cfg.neighborSupportFloor ?? DEFAULT_SUPPORT_FLOOR,
    };
  }

  /** Main entry — returns a routing decision. Never throws on a missing ledger. */
  route(req: RoutingRequest): RoutingDecision {
    this.validate(req);
    const ledger = this.loadLedger();
    const ledgerSize = ledger.length;

    // Cold-start path: not enough history → hardcoded rules.
    if (ledgerSize < this.cfg.coldStartThreshold) {
      const rule = this.coldStartRule(req);
      return {
        recommendedQuorum: rule.quorum,
        recommendedTentacles: rule.tentacles,
        confidence: rule.confidence,
        source: "cold_start",
        rationale: `Cold-start (ledger has ${ledgerSize} entries < threshold ${this.cfg.coldStartThreshold}). ${rule.note}`,
        basedOnEntries: 0,
        ledgerSizeAtTime: ledgerSize,
      };
    }

    // k-NN over hand-engineered features.
    const k = Math.min(this.cfg.k, ledgerSize);
    const neighbors = this.kNearest(req, ledger, k);
    const cleared = neighbors.filter((n) => n.entry.cleared);
    const passRate = cleared.length / neighbors.length;

    // Vote on the recommended quorum among cleared neighbors.
    const quorumVote = this.weightedQuorumVote(cleared);
    const candidateQuorum: Quorum = quorumVote.quorum;
    const candidateSupport = quorumVote.support;

    // Poisoning defense + low-data defense.
    const isConservative = candidateQuorum === "3-of-3" || candidateQuorum === "5-of-5";
    const passesFloor = passRate >= this.cfg.neighborPassRateFloor && candidateSupport >= this.cfg.neighborSupportFloor;
    if (!isConservative && !passesFloor) {
      return {
        recommendedQuorum: CONSERVATIVE_DEFAULT.quorum,
        recommendedTentacles: CONSERVATIVE_DEFAULT.tentacles,
        confidence: 0.5,
        source: "conservative_fallback",
        rationale: `k-NN found ${neighbors.length} neighbors (${cleared.length} cleared, pass-rate ${passRate.toFixed(2)}); candidate ${candidateQuorum} had ${candidateSupport} supporters but floors require pass-rate ≥ ${this.cfg.neighborPassRateFloor} AND support ≥ ${this.cfg.neighborSupportFloor}. Falling back to 3-of-3.`,
        basedOnEntries: neighbors.length,
        ledgerSizeAtTime: ledgerSize,
      };
    }

    // Build recommended tentacle set: the most-frequent tentacle set among neighbors
    // that voted for the winning quorum, dedup'd + sized to the quorum's N.
    const recommendedTentacles = this.tentacleVote(cleared, candidateQuorum);

    // Confidence: pass-rate × support-fraction, capped between 0.5 and 0.95.
    const supportFraction = candidateSupport / Math.max(1, neighbors.length);
    const confidence = Math.max(0.5, Math.min(0.95, 0.5 + 0.5 * passRate * supportFraction));

    return {
      recommendedQuorum: candidateQuorum,
      recommendedTentacles,
      confidence,
      source: "ledger_knn",
      rationale: `k-NN: ${neighbors.length} neighbors (${cleared.length} cleared); winning ${candidateQuorum} had ${candidateSupport} supporters with pass-rate ${passRate.toFixed(2)}. Tentacle set derived from neighbor-vote.`,
      basedOnEntries: neighbors.length,
      ledgerSizeAtTime: ledgerSize,
    };
  }

  /** Test injection — bypass the lazy file load with an in-memory ledger snapshot. */
  setLedgerForTesting(entries: LedgerEntry[]): void {
    this.ledgerCache = [...entries];
  }

  /** Reset the cache; subsequent calls re-read the file. */
  resetCache(): void {
    this.ledgerCache = null;
  }

  // ---- internals ----

  private validate(req: RoutingRequest): void {
    if (!req || typeof req !== "object") throw new Error("RoutingRequest required");
    if (typeof req.changeClass !== "string" || req.changeClass.length === 0) {
      throw new Error("changeClass must be a non-empty string");
    }
    if (!Array.isArray(req.fileTypes)) throw new Error("fileTypes must be an array");
    if (!Number.isInteger(req.peerCount) || req.peerCount < 0) {
      throw new Error("peerCount must be a non-negative integer");
    }
    if (req.filesCount !== undefined && (!Number.isInteger(req.filesCount) || req.filesCount < 0)) {
      throw new Error("filesCount must be a non-negative integer when provided");
    }
  }

  private defaultLedgerPath(): string {
    // Engine sits at mcp-server/src/engines/NeuralRoutingEngine.ts (or dist/engines/NeuralRoutingEngine.js).
    // Ledger sits at mcp-server/data/state/SCRUTINY_LEDGER.json — 3 levels up + data/state/.
    const here = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(here, "..", "..", "data", "state", "SCRUTINY_LEDGER.json");
  }

  private loadLedger(): LedgerEntry[] {
    if (this.ledgerCache !== null) return this.ledgerCache;
    try {
      const text = fs.readFileSync(this.cfg.ledgerPath, "utf8");
      const parsed = JSON.parse(text) as { entries?: Record<string, LedgerEntry> | LedgerEntry[] } | LedgerEntry[];
      // Accept either { entries: { id: entry } }, { entries: [] }, or a bare array.
      let entries: LedgerEntry[] = [];
      if (Array.isArray(parsed)) {
        entries = parsed;
      } else if (Array.isArray(parsed.entries)) {
        entries = parsed.entries;
      } else if (parsed.entries && typeof parsed.entries === "object") {
        entries = Object.values(parsed.entries);
      }
      this.ledgerCache = entries;
      return entries;
    } catch {
      // Missing file, parse error, etc. → empty ledger, cold-start fires.
      this.ledgerCache = [];
      return [];
    }
  }

  /**
   * Cold-start rules — defensible defaults when we lack history. The classes
   * are coarse on purpose; subdivision should be a job for the k-NN once the
   * ledger fills.
   */
  private coldStartRule(req: RoutingRequest): { quorum: Quorum; tentacles: Tentacle[]; confidence: number; note: string } {
    const cls = req.changeClass.toLowerCase();
    if (cls === "safety-critical" || cls.includes("safety")) {
      return { quorum: "5-of-5", tentacles: DEFAULT_TENTACLES_5_OF_5, confidence: 0.7,
        note: "Hardcoded rule: safety-critical → 5-of-5." };
    }
    if (cls === "engine-edit" || cls === "dispatcher-edit" || cls.includes("engine") || cls.includes("dispatcher")) {
      return { quorum: "3-of-3", tentacles: DEFAULT_TENTACLES_3_OF_3, confidence: 0.65,
        note: "Hardcoded rule: engine/dispatcher edits → 3-of-3." };
    }
    if (cls === "test-only" || cls === "docs-only" || cls.includes("doc") || cls.includes("readme")) {
      return { quorum: "1-of-1", tentacles: ["claude-a"], confidence: 0.6,
        note: "Hardcoded rule: test- or docs-only → 1-of-1 (claude-a)." };
    }
    if (cls === "config-change" || cls.includes("config") || cls.includes("settings")) {
      return { quorum: "2-of-3", tentacles: ["codex", "claude-a", "claude-b"], confidence: 0.6,
        note: "Hardcoded rule: config change → 2-of-3." };
    }
    return { quorum: CONSERVATIVE_DEFAULT.quorum, tentacles: CONSERVATIVE_DEFAULT.tentacles, confidence: 0.55,
      note: "Hardcoded rule: unrecognized change class → conservative 3-of-3 default." };
  }

  /** k-nearest by composite distance (jaccard on fileTypes + class match + abs-diff on peer/files counts). */
  private kNearest(req: RoutingRequest, ledger: LedgerEntry[], k: number): Array<{ entry: LedgerEntry; distance: number }> {
    const scored = ledger.map((entry) => ({ entry, distance: this.distance(req, entry) }));
    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, k);
  }

  private distance(req: RoutingRequest, entry: LedgerEntry): number {
    let d = 0;
    // Change class — exact match = 0, mismatch = 1 (heavy: this is the primary signal).
    if ((entry.changeClass ?? "") !== req.changeClass) d += 1.0;
    // File-types Jaccard distance — 0 if identical sets, 1 if disjoint.
    const a = new Set(req.fileTypes);
    const b = new Set(entry.fileTypes ?? []);
    const union = new Set([...a, ...b]);
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    const jaccard = union.size === 0 ? 0 : 1 - (inter / union.size);
    d += 0.5 * jaccard;
    // Peer-count distance — normalized by max(1, max_observed). Cap at 1.0.
    const peerDiff = Math.min(1.0, Math.abs((entry.peerCount ?? 0) - req.peerCount) / 6);
    d += 0.3 * peerDiff;
    // Files-count distance — log-scaled.
    if (req.filesCount !== undefined && entry.filesCount !== undefined) {
      const fDiff = Math.abs(Math.log1p(entry.filesCount) - Math.log1p(req.filesCount));
      d += 0.2 * Math.min(1.0, fDiff / 3);
    }
    // Fingerprint exact match → strong attractor (negative distance bonus, but clamp >= 0).
    if (req.fingerprint && entry.fingerprint && req.fingerprint === entry.fingerprint) {
      d = Math.max(0, d - 0.8);
    }
    return d;
  }

  /** Weighted vote: each cleared neighbor casts a ballot for its quorum, weighted by 1/(1+distance). */
  private weightedQuorumVote(cleared: Array<{ entry: LedgerEntry; distance: number }>): { quorum: Quorum; support: number; weight: number } {
    const weights: Record<Quorum, number> = { "1-of-1": 0, "2-of-3": 0, "3-of-3": 0, "5-of-5": 0 };
    const supports: Record<Quorum, number> = { "1-of-1": 0, "2-of-3": 0, "3-of-3": 0, "5-of-5": 0 };
    for (const n of cleared) {
      const q = n.entry.quorum;
      if (!q || !ALL_QUORUMS.includes(q)) continue;
      const w = 1 / (1 + n.distance);
      weights[q] += w;
      supports[q] += 1;
    }
    let bestQ: Quorum = CONSERVATIVE_DEFAULT.quorum;
    let bestW = -Infinity;
    for (const q of ALL_QUORUMS) {
      if (weights[q] > bestW) { bestW = weights[q]; bestQ = q; }
    }
    return { quorum: bestQ, support: supports[bestQ], weight: bestW };
  }

  /** Pick a tentacle set: most-frequent set among cleared neighbors that voted for `quorum`. */
  private tentacleVote(cleared: Array<{ entry: LedgerEntry; distance: number }>, quorum: Quorum): Tentacle[] {
    const counts = new Map<string, { tentacles: Tentacle[]; n: number }>();
    for (const n of cleared) {
      if (n.entry.quorum !== quorum) continue;
      const set = (n.entry.passingTentacles ?? []).slice().sort();
      if (set.length === 0) continue;
      const key = set.join("|");
      const cur = counts.get(key);
      if (cur) cur.n++;
      else counts.set(key, { tentacles: set as Tentacle[], n: 1 });
    }
    let best: { tentacles: Tentacle[]; n: number } | null = null;
    for (const v of counts.values()) {
      if (!best || v.n > best.n) best = v;
    }
    if (best && best.tentacles.length > 0) return best.tentacles;
    // Fallback: standard tentacle set for the quorum.
    if (quorum === "5-of-5") return DEFAULT_TENTACLES_5_OF_5;
    if (quorum === "1-of-1") return ["claude-a"];
    if (quorum === "2-of-3") return DEFAULT_TENTACLES_3_OF_3;
    return DEFAULT_TENTACLES_3_OF_3;
  }
}

export const neuralRoutingEngine = new NeuralRoutingEngine();
