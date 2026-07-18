#!/usr/bin/env node
// tier: T3
/**
 * stop-playbook-corpus-drift-advisory.mjs — PLAYBOOK-CAPABILITY follow-up
 *
 * Stop-time advisory: if MachiningPlaybookEngine.ts was modified more recently
 * than the last successful playbook validation, surface the corpus-drift
 * candidates as a chat-bus / systemMessage advisory. Strictly NON-BLOCKING —
 * advisory exit only, never returns decision:"block".
 *
 * Approach: static-parse the engine source for the two cheapest, never-fail
 * checks that catch ~80% of corpus-drift modes operators introduce by hand:
 *   1. Duplicate `id:` strings across the PLAYBOOK_RULES array (copy-paste).
 *   2. Broken `related_rules` references — a related_rules id that no rule
 *      actually defines (deletion of a referenced rule).
 *
 * The deeper semantic conflict scan (`detectConflicts`) and structural audit
 * (`auditIntegrity`) stay on-demand via `prism_shop_practice:playbook_audit`,
 * `playbook_conflicts`, `playbook_validate_corpus` — this hook only nudges
 * the operator to run them when the engine source itself drifted.
 *
 * Throttle: stamp file at state/shared/.playbook-drift-stamp.json prevents
 * firing more than once per THROTTLE_MS (60min default) per chat session.
 *
 * Knobs:
 *   PRISM_PLAYBOOK_DRIFT_DISABLE=1        — off entirely
 *   PRISM_PLAYBOOK_DRIFT_THROTTLE_MIN=N   — per-session throttle (default 60)
 *   PRISM_PLAYBOOK_DRIFT_MAX_LIST=N       — max ids in advisory output (default 5)
 *
 * Hook contract: emits { continue: true, suppressOutput: false, systemMessage }
 * when drift detected; otherwise { continue: true, suppressOutput: true }.
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = "H:/prism";
const ENGINE_PATH = path.join(REPO_ROOT, "mcp-server/src/engines/MachiningPlaybookEngine.ts");
const STAMP_PATH = path.join(REPO_ROOT, "state/shared/.playbook-drift-stamp.json");
const DEFAULT_THROTTLE_MS = 60 * 60 * 1000;
const DEFAULT_MAX_LIST = 5;

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
  process.stdout.write("\n");
  process.exit(0);
}
function silent() { emit({ continue: true, suppressOutput: true }); }

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function loadStamp() {
  const s = readJsonSafe(STAMP_PATH);
  return s && typeof s === "object"
    ? s
    : { lastFiredAt: 0, lastEngineMtimeMs: 0 };
}

function saveStamp(stamp) {
  try {
    fs.mkdirSync(path.dirname(STAMP_PATH), { recursive: true });
    const tmp = STAMP_PATH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(stamp));
    fs.renameSync(tmp, STAMP_PATH);
  } catch { /* never block on stamp write */ }
}

function clamped(envVal, fallback) {
  const n = Number(envVal);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function readSessionIdFromStdin(rawInput) {
  if (!rawInput) return null;
  try {
    const parsed = JSON.parse(rawInput);
    return parsed?.session_id ?? parsed?.sessionId ?? null;
  } catch { return null; }
}

/**
 * Static-parse the engine source for playbook-rule drift candidates.
 * Pure, deterministic, no engine instantiation. Exported for testing.
 *
 * @param {string} source - the MachiningPlaybookEngine.ts text content
 * @returns {{duplicateIds: string[], unresolvedRefs: Array<{fromId:string,missingId:string}>, totalIds: number}}
 */
export function scanPlaybookSource(source) {
  // Slice to the PLAYBOOK_RULES array region so unrelated `id:` mentions
  // elsewhere in the file (types, comments, docstrings) don't trigger
  // false positives. The array declaration is on a stable line.
  const start = source.indexOf("PLAYBOOK_RULES");
  const region = start >= 0 ? source.slice(start) : source;

  // Match `id: "..."` and `id: '...'` per rule entry. The PlaybookRule
  // schema names this field `id` (lowercased, colon-prefixed).
  const idMatches = [...region.matchAll(/\bid:\s*["']([^"']+)["']/g)].map((m) => m[1]);

  // Count first-occurrence-wins to surface dup ids deterministically.
  const seen = new Set();
  const dupSet = new Set();
  for (const id of idMatches) {
    if (seen.has(id)) dupSet.add(id);
    seen.add(id);
  }
  const duplicateIds = [...dupSet].sort();

  // Extract every `related_rules: [...]` block and check each referenced id
  // resolves against `seen` (the defined-id set). A self-ref is allowed at
  // this static-scan tier; the engine's auditIntegrity flags it semantically.
  const unresolvedRefs = [];
  const relBlocks = region.matchAll(/related_rules:\s*\[([^\]]*)\]/g);
  // We need the id of the rule each related_rules block belongs to. Walk
  // backwards from the related_rules match to the most recent `id:` line.
  for (const blk of relBlocks) {
    const blockStart = blk.index;
    const upTo = region.slice(0, blockStart);
    const lastId = [...upTo.matchAll(/\bid:\s*["']([^"']+)["']/g)].pop();
    const fromId = lastId ? lastId[1] : "<unknown>";
    const refsRaw = blk[1];
    const refIds = [...refsRaw.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
    for (const ref of refIds) {
      if (!seen.has(ref)) unresolvedRefs.push({ fromId, missingId: ref });
    }
  }

  return { duplicateIds, unresolvedRefs, totalIds: idMatches.length };
}

function main() {
  if (process.env.PRISM_PLAYBOOK_DRIFT_DISABLE === "1") silent();

  const throttleMs = clamped(process.env.PRISM_PLAYBOOK_DRIFT_THROTTLE_MIN, DEFAULT_THROTTLE_MS / 60_000) * 60_000;
  const maxList = clamped(process.env.PRISM_PLAYBOOK_DRIFT_MAX_LIST, DEFAULT_MAX_LIST);

  let stdin = "";
  try { if (!process.stdin.isTTY) stdin = fs.readFileSync(0, "utf8"); } catch { /* tolerate */ }
  const sessionId = readSessionIdFromStdin(stdin) || "unknown";

  let engineStat;
  try { engineStat = fs.statSync(ENGINE_PATH); } catch { silent(); }
  if (!engineStat) silent();

  const now = Date.now();
  const stamp = loadStamp();
  const sinceLastMs = now - (Number(stamp.lastFiredAt) || 0);
  if (sinceLastMs < throttleMs) silent();

  // Only run if engine mtime changed since last stamp (engine actually edited).
  const lastSeenMtimeMs = Number(stamp.lastEngineMtimeMs) || 0;
  if (engineStat.mtimeMs <= lastSeenMtimeMs) silent();

  let source = "";
  try { source = fs.readFileSync(ENGINE_PATH, "utf8"); } catch { silent(); }

  const { duplicateIds, unresolvedRefs, totalIds } = scanPlaybookSource(source);

  if (duplicateIds.length === 0 && unresolvedRefs.length === 0) {
    // Clean — record stamp so we don't re-run until next edit, exit silent.
    saveStamp({ lastFiredAt: now, lastEngineMtimeMs: engineStat.mtimeMs, lastSessionId: sessionId, lastFindingCount: 0 });
    silent();
  }

  const parts = [];
  if (duplicateIds.length > 0) {
    const list = duplicateIds.slice(0, maxList).join(", ");
    const more = duplicateIds.length > maxList ? ` (+${duplicateIds.length - maxList} more)` : "";
    parts.push(`${duplicateIds.length} duplicate id(s): ${list}${more}`);
  }
  if (unresolvedRefs.length > 0) {
    const list = unresolvedRefs.slice(0, maxList).map((r) => `${r.fromId}→${r.missingId}`).join(", ");
    const more = unresolvedRefs.length > maxList ? ` (+${unresolvedRefs.length - maxList} more)` : "";
    parts.push(`${unresolvedRefs.length} unresolved related_rules ref(s): ${list}${more}`);
  }

  const msg = `playbook corpus drift advisory (${totalIds} rules scanned): ${parts.join(" · ")} → run \`prism_shop_practice:playbook_validate_corpus\` for full audit`;
  saveStamp({ lastFiredAt: now, lastEngineMtimeMs: engineStat.mtimeMs, lastSessionId: sessionId, lastFindingCount: duplicateIds.length + unresolvedRefs.length });
  emit({ continue: true, suppressOutput: false, systemMessage: msg });
}

// Direct CLI invocation only. Imports for testing get scanPlaybookSource without
// triggering the Stop-hook lifecycle.
const isDirectInvoke = process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`;
if (isDirectInvoke) {
  try { main(); } catch (err) {
    process.stderr.write(`stop-playbook-corpus-drift-advisory: ${err?.message || err}\n`);
    silent();
  }
}
