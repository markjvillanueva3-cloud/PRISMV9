/**
 * ZULU-AWARENESS-MS1 / U-AW02 — TypeScript-side awareness reader.
 *
 * Reads `state/shared/zulu-awareness-index.json` (built by
 * `scripts/zulu-awareness-run.mjs`) and exposes minimal lookups for TS engines
 * (AISystemRouterEngine, PRISMSelfAwarenessEngine). The full ranking pipeline
 * is `.mjs`-only — this reader does the read + a thin scoring projection so
 * consumers can answer "which slot best fits this task?" without booting
 * Node's ESM .mjs loader from inside the TS bundle.
 *
 * Design invariants:
 *   1. Fail-soft — never throws; missing/corrupt file → empty envelope.
 *   2. Single-load memo — index is read once per process; tests call
 *      invalidateAwarenessCache() between runs.
 *   3. Same scoring shape as `scoreSlotForTask` in zulu-awareness-pipeline.mjs
 *      so consumers see the same evidence keys (domain:*, tribal:*, viz:*, success:*).
 *   4. Refuse-list HARD VETO is preserved — refused slots score -100 and are
 *      filtered from `rankSlotsForTaskDescriptor`.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface AwarenessFingerprint {
  slot: string;
  ok: boolean;
  hermesRole: string;
  domains: string[];
  refuseList: string[];
  queueLength: number;
  recentCommitScopes: string[];
  skillUsageCount: number;
  tribalDomainScores: Record<string, number>;
  vizNodeCount: number;
  successRate: number;
  successSampleSize: number;
}

export interface AwarenessIndex {
  schemaVersion: string;
  generatedAt: string;
  slotCount: number;
  fingerprints: AwarenessFingerprint[];
}

export interface AwarenessEnvelope {
  ok: boolean;
  reason: string | null;
  fingerprints: AwarenessFingerprint[];
  source: string | null;
  generatedAt: string | null;
}

export interface SlotRecommendation {
  slot: string;
  hermesRole: string;
  primaryDomain: string | null;
  score: number;
  evidence: string[];
}

// Mirror of DEFAULT_WEIGHTS in zulu-awareness-pipeline.mjs (kept in sync; if
// the pipeline file changes its weights, update here too — there is only ONE
// numeric source of truth in `.mjs` and this is its TS reflection).
const DEFAULT_WEIGHTS = Object.freeze({
  domainMatch: 4.0,
  tribalAffinity: 2.5,
  vizNeighborhood: 2.0,
  successRate: 1.5,
  queueDepth: -0.5,
  refuseHit: -100.0,
});

const DEFAULT_INDEX_PATH = process.env.PRISM_ZULU_AWARENESS_INDEX
  || join(process.env.PRISM_ROOT || "H:/prism", "state/shared/zulu-awareness-index.json");

const EMPTY_ENVELOPE: AwarenessEnvelope = Object.freeze({
  ok: false,
  reason: "not-loaded",
  fingerprints: [] as AwarenessFingerprint[],
  source: null,
  generatedAt: null,
}) as AwarenessEnvelope;

let _cache: AwarenessEnvelope | null = null;

export function invalidateAwarenessCache(): void {
  _cache = null;
}

interface LoadOptions {
  indexPath?: string;
  reader?: (path: string) => unknown;
}

function defaultReader(path: string): unknown {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function loadAwareness(opts: LoadOptions = {}): AwarenessEnvelope {
  if (process.env.PRISM_ZULU_AWARENESS_DISABLE === "1") {
    return { ...EMPTY_ENVELOPE, reason: "disabled-env" };
  }
  if (_cache) return _cache;
  const reader = opts.reader || defaultReader;
  const path = opts.indexPath || DEFAULT_INDEX_PATH;
  const doc = reader(path) as AwarenessIndex | null;
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.fingerprints)) {
    _cache = { ...EMPTY_ENVELOPE, reason: "no-index", source: path };
    return _cache;
  }
  _cache = {
    ok: true,
    reason: null,
    fingerprints: doc.fingerprints,
    source: path,
    generatedAt: doc.generatedAt || null,
  };
  return _cache;
}

export function lookupFingerprint(slot: string, opts: LoadOptions = {}): AwarenessFingerprint | null {
  if (!slot || typeof slot !== "string") return null;
  const env = loadAwareness(opts);
  if (!env.ok) return null;
  return env.fingerprints.find(fp => fp && fp.slot === slot) || null;
}

interface TaskDescriptor {
  text?: string;
  domain?: string;
  kind?: string;
}

// Mirror of scoreSlotForTask in zulu-awareness-pipeline.mjs.
// Keep this projection in sync — any change here MUST be reflected in the .mjs
// twin OR a comment naming why the divergence is intentional.
function scoreFingerprint(fp: AwarenessFingerprint, task: TaskDescriptor): { score: number; evidence: string[] } {
  const evidence: string[] = [];
  let score = 0;
  const text = (task.text || "").toLowerCase();
  const domain = (task.domain || "").toLowerCase();

  // Refuse-list HARD veto
  for (const refused of fp.refuseList || []) {
    const tag = String(refused).toLowerCase();
    if (text.includes(tag) || (domain && tag.includes(domain))) {
      return { score: DEFAULT_WEIGHTS.refuseHit, evidence: [`REFUSE:${refused}`] };
    }
  }

  // Domain match
  let domainHit = false;
  for (const d of fp.domains || []) {
    if (domain === d || (domain && d.includes(domain)) || text.includes(d)) {
      score += DEFAULT_WEIGHTS.domainMatch;
      evidence.push(`domain:${d}`);
      domainHit = true;
      break;
    }
  }

  // Tribal affinity
  const tribalScore = domain ? (Number(fp.tribalDomainScores?.[domain]) || 0) : 0;
  if (tribalScore > 0) {
    const norm = Math.min(1, tribalScore / 10);
    score += norm * DEFAULT_WEIGHTS.tribalAffinity;
    evidence.push(`tribal:${domain}=${tribalScore}`);
  }

  // Viz neighborhood
  if (fp.vizNodeCount > 0) {
    const norm = Math.min(1, fp.vizNodeCount / 50);
    score += norm * DEFAULT_WEIGHTS.vizNeighborhood;
    evidence.push(`viz:${fp.vizNodeCount}-nodes`);
  }

  // Success history (narrow-sample tempered)
  if (fp.successSampleSize >= 3) {
    score += fp.successRate * DEFAULT_WEIGHTS.successRate;
    evidence.push(`success:${(fp.successRate * 100).toFixed(0)}%/${fp.successSampleSize}`);
  }

  // Queue depth penalty
  if (fp.queueLength > 0) {
    const norm = Math.min(1, Math.log10(1 + fp.queueLength) / 2);
    score += norm * DEFAULT_WEIGHTS.queueDepth;
    evidence.push(`queue:${fp.queueLength}`);
  }

  if (!domainHit && (fp.domains?.length || 0) > 0) {
    evidence.push("no-domain-match");
  }

  return { score, evidence };
}

export function rankSlotsForTaskDescriptor(
  task: TaskDescriptor,
  opts: LoadOptions & { maxResults?: number } = {},
): SlotRecommendation[] {
  const env = loadAwareness(opts);
  if (!env.ok || !task) return [];
  const VETO_FLOOR = DEFAULT_WEIGHTS.refuseHit + 1;
  const scored = env.fingerprints
    .filter(fp => fp.ok)
    .map(fp => {
      const { score, evidence } = scoreFingerprint(fp, task);
      return {
        slot: fp.slot,
        hermesRole: fp.hermesRole || "specialist",
        primaryDomain: fp.domains?.[0] || null,
        score,
        evidence,
      } as SlotRecommendation;
    })
    .filter(r => r.score > VETO_FLOOR);
  scored.sort((a, b) => b.score - a.score);
  const max = typeof opts.maxResults === "number" ? opts.maxResults : 5;
  return scored.slice(0, max);
}

// Convenience: best slot for a task. Returns null when no positive-score
// match — caller decides whether to use a default or skip slot routing.
export function bestSlotForTask(task: TaskDescriptor, opts: LoadOptions = {}): SlotRecommendation | null {
  const ranking = rankSlotsForTaskDescriptor(task, { ...opts, maxResults: 1 });
  if (ranking.length === 0) return null;
  if (ranking[0].score <= 0) return null;
  return ranking[0];
}

// ── ZULU-OBSIDIAN-LIVE-MS0 — optional LIVE-brain read ───────────────────────
// The functions above read the static file-based awareness envelope. This adds
// an OPTIONAL in-session read of a *running* Obsidian vault (the "live brain")
// via ObsidianRestBridgeEngine, for the Zulu orchestrator. It is strictly
// additive: nothing above changed, and when the live path is off or the vault
// is down it returns null so every caller keeps its existing file envelope.

export interface LiveBrainContext {
  ok: boolean;
  /** Content of the note the operator currently has open (engine-capped). */
  activeNote?: string;
  /** Surfaced reason when the active note couldn't be read. */
  activeNoteReason?: string;
  /** The vault URL that answered (loopback by default). */
  url?: string;
}

/**
 * OPTIONAL live-brain read for the Zulu orchestrator. Returns null — i.e. NO
 * behavior change, callers fall back to the file-based awareness envelope —
 * unless PRISM_OBSIDIAN_LIVE=1 AND a live, authenticated Obsidian vault is
 * reachable. Fail-soft: never throws; any failure (off, no key, down, non-loopback)
 * yields null. The engine is lazy-imported so the common (off) path pulls no
 * network deps.
 */
export async function liveBrainContext(): Promise<LiveBrainContext | null> {
  if (process.env.PRISM_OBSIDIAN_LIVE !== "1") return null;
  try {
    const { ObsidianRestBridgeEngine } = await import("../ObsidianRestBridgeEngine.js");
    if (!(await ObsidianRestBridgeEngine.isLive())) return null;
    const [active, status] = await Promise.all([
      ObsidianRestBridgeEngine.activeNote(),
      ObsidianRestBridgeEngine.status(),
    ]);
    return {
      ok: true,
      activeNote: active.ok ? active.data : undefined,
      activeNoteReason: active.ok ? undefined : active.reason,
      url: status.data?.url,
    };
  } catch {
    return null; // fail-soft — callers keep the file envelope
  }
}
