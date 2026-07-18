/**
 * bridge-evidence-detector.mjs — scan repo for "is this bridge actually
 * shipped?" evidence so generate-bridge-synergy-features.mjs can flip
 * status `ghost → built` automatically.
 *
 * Why this exists (R8 lesson, U-BRIDGE-STATUS-RECONCILE 2026-05-19):
 *
 * The bridge-synergy roost lists 42 curated bridges that connect built PRISM
 * subsystems into one organism. Until this unit, all 42 were hardcoded with
 * `status: ghost` in the generator — but several of them (the AI-tier
 * bridges) were live-verified shipped via the XPROC-NEURAL system on
 * 2026-05-19, and earlier (e.g. Ollama L2b on 2026-05-18). The doctrine
 * carried the obsolete "ghost" label simply because no code re-scanned for
 * post-ship evidence; future Claude sessions then mistook already-built
 * surfaces for missing builds (R8 violation: "Read before you write").
 *
 * Design:
 *   - EVIDENCE_TABLE — explicit list of `{ bridgeId, detect }` entries. Each
 *     detector is a PURE function over an injected fs reader; returns the
 *     bridge's current status with the file evidence that led to the verdict.
 *   - The table starts with the two AI-tier bridges (Tier-1 → Tier-2 and
 *     Tier-2 → Tier-3) because those are the bridges already provably shipped
 *     this session. Adding a new detector is one table entry — extensible
 *     pattern, not a rewrite.
 *   - Any detector failure (missing source file, read error, exception in the
 *     detect fn) graceful-degrades to `status: 'ghost'` with the cause
 *     captured in `evidence[]`. This preserves the prior generator's
 *     invariant — a bridge can only flip TO built when there is positive
 *     evidence, never silently the other way.
 *
 * Status values:
 *   - 'built'   — full evidence found; the bridge's surface is reachable
 *   - 'partial' — some-but-not-all of the expected evidence found; the
 *                 bridge is half-shipped (e.g. one of two required actions
 *                 is wired); operators should know this is in-progress
 *   - 'ghost'   — no evidence; bridge is unshipped (the status quo)
 *
 * Errors are NOT thrown — every code path returns a verdict object. R12 is
 * preserved through the `evidence[]` array which carries a string-level
 * description of what was scanned and what was found/missing/errored.
 *
 * Sister to U-KIP03 (KIP-LoRA rotation, 2026-05-19) and U-VIZ-SPLIT-OUT-FILE
 * (graph race fix). All three patch CLAUDE.md doctrine drift via code, not
 * by editing CLAUDE.md.
 */

import fs from "node:fs";
import path from "node:path";

/** @typedef {'built' | 'partial' | 'ghost'} BridgeStatus */

/** @typedef {Object} BridgeVerdict
 *  @property {BridgeStatus} status
 *  @property {string[]} evidence    one-line descriptions of what the detector saw
 */

/** @typedef {Object} FsReader
 *  @property {(p: string) => boolean} existsSync
 *  @property {(p: string, enc?: string) => string} readFileSync
 */

const DEFAULT_FS = { existsSync: fs.existsSync, readFileSync: fs.readFileSync };

/**
 * Cap source-file reads — a runaway 50 MB minified bundle would otherwise
 * choke the regen-viz pipeline. Per CLAUDE.md U-VIZ-SPLIT-OUT-FILE doctrine,
 * generators in the regen-viz chain must complete in seconds.
 */
export const MAX_SOURCE_BYTES = 5 * 1024 * 1024; // 5 MB

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Escape regex metacharacters in a string. */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strip line + block comments from JS/TS source. Naive (no string-literal
 * awareness) — but for the identifier-presence check we run, over-stripping
 * is R12-safe: it can only produce false-negatives (ghost when really built),
 * never the forbidden false-positive (built when really ghost or removed).
 *
 * Per-file scrutiny P1 fix (Arm B, 2026-05-19): a deprecation note inside
 * a `//` comment used to satisfy substring matches and flip a removed
 * bridge to 'built'. Stripping comments closes that hole.
 *
 * @param {string} src
 * @returns {string}
 */
export function stripComments(src) {
  if (typeof src !== "string") return "";
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ");
}

/**
 * Test whether `pattern` appears in `src` as a STANDALONE token. For
 * identifier-shaped patterns (`xproc_route_query`, `CrossProcessTierRouterEngine`),
 * this rejects `legacy_xproc_route_query` and `xproc_route_query_v2` —
 * preventing token-boundary leaks per the per-file scrutiny P1 fix
 * (Arm B, 2026-05-19). Non-identifier patterns (paths, JSON snippets) fall
 * back to plain substring search.
 *
 * @param {string} src
 * @param {string} pattern
 * @returns {boolean}
 */
export function tokenMatch(src, pattern) {
  if (typeof src !== "string" || typeof pattern !== "string" || pattern.length === 0) return false;
  if (IDENT_RE.test(pattern)) {
    const re = new RegExp(`(?:^|[^A-Za-z0-9_])${escapeRe(pattern)}(?:[^A-Za-z0-9_]|$)`);
    return re.test(src);
  }
  return src.indexOf(pattern) !== -1;
}

/**
 * Look for one or more standalone-token patterns inside `relPath`, returning
 * the count of patterns found. Comment-stripped scan: pattern occurrences
 * inside line or block comments are ignored, preventing false-positive
 * `built` verdicts driven by deprecation notes.
 *
 * Used by detectors to assemble all-of-N evidence.
 *
 * @param {string} relPath repo-relative path (e.g. "mcp-server/src/...ts")
 * @param {readonly string[]} patterns standalone-token patterns to find
 * @param {string} repoRoot
 * @param {FsReader} fsImpl
 * @returns {{ found: string[], missing: string[], errored: string | null }}
 */
export function scanFileForPatterns(relPath, patterns, repoRoot, fsImpl = DEFAULT_FS) {
  if (!Array.isArray(patterns) || patterns.length === 0) {
    return { found: [], missing: [], errored: "scanFileForPatterns: patterns must be a non-empty array" };
  }
  const abs = path.resolve(repoRoot, relPath);
  let src;
  try {
    if (!fsImpl.existsSync(abs)) {
      return { found: [], missing: patterns.slice(), errored: `source missing: ${relPath}` };
    }
    src = fsImpl.readFileSync(abs, "utf8");
    if (typeof src !== "string") {
      return { found: [], missing: patterns.slice(), errored: `source returned non-string: ${relPath}` };
    }
    if (src.length > MAX_SOURCE_BYTES) {
      // Bounded-latency truncate. Head-scan only — R12-safe direction
      // (a missed tail-only pattern produces a false-negative ghost, not
      // the forbidden false-positive built).
      src = src.slice(0, MAX_SOURCE_BYTES);
    }
  } catch (e) {
    return { found: [], missing: patterns.slice(), errored: `read error: ${(e && e.message) || String(e)}` };
  }
  const stripped = stripComments(src);
  /** @type {string[]} */ const found = [];
  /** @type {string[]} */ const missing = [];
  for (const p of patterns) {
    if (tokenMatch(stripped, p)) found.push(p);
    else missing.push(p);
  }
  return { found, missing, errored: null };
}

/**
 * Decide a status verdict from a scan result. Rule: all-of-N found → 'built',
 * some-of-N → 'partial', zero-of-N or errored → 'ghost'.
 *
 * @param {{ found: string[], missing: string[], errored: string | null }} scan
 * @param {string} relPath  for evidence narration
 * @returns {BridgeVerdict}
 */
export function verdictFromScan(scan, relPath) {
  if (scan.errored) {
    return { status: "ghost", evidence: [`${relPath}: ${scan.errored}`] };
  }
  const totalRequired = scan.found.length + scan.missing.length;
  if (totalRequired === 0) {
    return { status: "ghost", evidence: [`${relPath}: no patterns to match`] };
  }
  if (scan.found.length === totalRequired) {
    return {
      status: "built",
      evidence: [`${relPath}: all ${totalRequired} required patterns present (${scan.found.join(", ")})`],
    };
  }
  if (scan.found.length === 0) {
    return {
      status: "ghost",
      evidence: [`${relPath}: 0/${totalRequired} patterns found (missing: ${scan.missing.join(", ")})`],
    };
  }
  return {
    status: "partial",
    evidence: [
      `${relPath}: ${scan.found.length}/${totalRequired} patterns present (found: ${scan.found.join(", ")}; missing: ${scan.missing.join(", ")})`,
    ],
  };
}

// ─── EVIDENCE TABLE ────────────────────────────────────────────────────
// Adding a new detector: append one entry. Each `detect(repoRoot, fsImpl)`
// must return a BridgeVerdict and must NOT throw — wrap risky reads in
// scanFileForPatterns which catches IO errors and graceful-degrades.

/** @type {ReadonlyArray<{ bridgeId: string, detect: (repoRoot: string, fsImpl?: FsReader) => BridgeVerdict }>} */
export const EVIDENCE_TABLE = Object.freeze([
  Object.freeze({
    // Verified shipped via XPROC-NEURAL Tier-12 (CrossProcessTierRouterEngine
    // + CrossProcessHierarchicalNeuralOrchestratorEngine) — see commit
    // dbca990b87 (2026-05-19) and reference_3tier_ai_xproc_actual_2026_05_19.
    bridgeId: "U-BRIDGE-AI-TIER1-TIER2",
    detect: (repoRoot, fsImpl = DEFAULT_FS) => {
      const rel = "mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts";
      // Tier-1 (Claude) → Tier-2 (CrossProcessTierRouter) requires the router
      // to be reachable as a dispatcher action AND have its lazy import wired.
      const patterns = [
        "xproc_route_query",
        "CrossProcessTierRouterEngine",
      ];
      return verdictFromScan(scanFileForPatterns(rel, patterns, repoRoot, fsImpl), rel);
    },
  }),
  Object.freeze({
    bridgeId: "U-BRIDGE-AI-TIER2-TIER3",
    detect: (repoRoot, fsImpl = DEFAULT_FS) => {
      const rel = "mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts";
      // Tier-2 (orchestrator) → Tier-3 (per-tier engines) requires the
      // orchestrator's full-run action AND its hierarchical engine import.
      const patterns = [
        "xproc_orchestrate_full",
        "CrossProcessHierarchicalNeuralOrchestratorEngine",
      ];
      return verdictFromScan(scanFileForPatterns(rel, patterns, repoRoot, fsImpl), rel);
    },
  }),
]);

/**
 * Look up a detector by bridge id. Returns null when the bridge has no
 * registered detector — the generator interprets `null` as "stay ghost"
 * (back-compat for the 40 bridges with no entry yet).
 *
 * @param {string} bridgeId
 */
export function detectorFor(bridgeId) {
  if (typeof bridgeId !== "string" || bridgeId.length === 0) return null;
  for (const entry of EVIDENCE_TABLE) {
    if (entry.bridgeId === bridgeId) return entry.detect;
  }
  return null;
}

/**
 * Resolve a single bridge's status. Defensive: any exception inside the
 * detector is caught and degraded to a ghost verdict — a buggy detector
 * must NEVER turn a built bridge ghost AND must NEVER silently flip a
 * ghost to built. Returning a verdict with status='ghost' + evidence
 * naming the exception is the R12-compliant failure mode.
 *
 * @param {string} bridgeId
 * @param {string} repoRoot
 * @param {{ fsImpl?: FsReader }} [opts]
 * @returns {BridgeVerdict | null}
 */
export function detectBridgeStatus(bridgeId, repoRoot, opts = {}) {
  const detect = detectorFor(bridgeId);
  if (!detect) return null;
  if (typeof repoRoot !== "string" || repoRoot.length === 0) {
    return { status: "ghost", evidence: ["repoRoot must be a non-empty string"] };
  }
  const fsImpl = (opts && opts.fsImpl) ? opts.fsImpl : DEFAULT_FS;
  try {
    const v = detect(repoRoot, fsImpl);
    // Defensive: a misbehaving detector that returns nothing or a bad shape
    // falls through to ghost.
    if (!v || typeof v !== "object" || typeof v.status !== "string") {
      return { status: "ghost", evidence: [`detector for ${bridgeId} returned malformed verdict`] };
    }
    if (v.status !== "built" && v.status !== "partial" && v.status !== "ghost") {
      return { status: "ghost", evidence: [`detector for ${bridgeId} returned unknown status: ${v.status}`] };
    }
    return {
      status: v.status,
      evidence: Array.isArray(v.evidence) ? v.evidence : [`detector for ${bridgeId} returned non-array evidence`],
    };
  } catch (e) {
    return { status: "ghost", evidence: [`detector for ${bridgeId} threw: ${(e && e.message) || String(e)}`] };
  }
}

/**
 * Run every detector in the table. Returns a Map keyed by bridgeId. Useful
 * for the generator's bulk status pass and for one-shot CLI audits.
 *
 * @param {string} repoRoot
 * @param {{ fsImpl?: FsReader }} [opts]
 * @returns {Map<string, BridgeVerdict>}
 */
export function detectAllBridgeStatuses(repoRoot, opts = {}) {
  /** @type {Map<string, BridgeVerdict>} */
  const out = new Map();
  for (const entry of EVIDENCE_TABLE) {
    const v = detectBridgeStatus(entry.bridgeId, repoRoot, opts);
    if (v) out.set(entry.bridgeId, v);
  }
  return out;
}
