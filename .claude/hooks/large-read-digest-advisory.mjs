#!/usr/bin/env node
// tier: T3
// large-read-digest-advisory.mjs -- PreToolUse:Read advisory hook
//
// When Claude is about to Read a LARGE source file (>600 lines by default), inject an
// advisory pointing at scripts/ollama-file-digest.mjs -- the verified line-anchored
// digest (commit 1175a6f26b): a local-Ollama digest where every claim is checked
// against its cited source line, so Claude can get the gist + spot-check any claim
// without streaming the whole file into context.
//
// Honest scope (R12): this hook does NOT block the Read. It advises that a large
// source file COULD be digested. The token saving materializes only when the digest
// CLI is run on the next turn. Tracked under offload-stats
// `byHook.large-read-digest-advisory.suggested`, and (U-LARGE-READ-DECAY-WIRE,
// 2026-06-10) WIRED to the advisory-decay machinery (scripts/lib/advisory-decay.mjs):
// once this advisory is PROVEN noise (>= 50 injections at < 5% conversion) it is muted
// -- a 1-in-20 probe stays alive for self-revival. Before this wiring the hook fired
// 100% of the time despite a measured 0/122 (0%) conversion = pure context noise.
// Sibling of wiki-read-offload-advisory.mjs (wiki entries); this one covers code so the
// two together serve every large read.
//
// Knobs:
//   PRISM_LARGE_READ_DIGEST_DISABLE=1     -- off-switch (fail-safe: hook continues)
//   PRISM_LARGE_READ_DIGEST_MIN_LINES=N   -- line threshold (default 600, floor 200)
//   PRISM_LARGE_READ_DIGEST_VERBOSE=1     -- debug stderr
//   PRISM_LARGE_READ_DIGEST_STATS_PATH=p  -- override offload-stats path (test hermeticity)
//   PRISM_ADVISORY_DECAY_DISABLE=1        -- global: bypass the decay mute (always fire)
//
// Wiring: PreToolUse with matcher "Read" -- settings.json entry (after the wiki sibling).
import { readFileSync, existsSync, statSync, writeFileSync, renameSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

import { countLines } from "./wiki-read-offload-advisory.mjs"; // reuse the pure line-counter (R8)
import { decayDecision } from "../../scripts/lib/advisory-decay.mjs"; // U-LARGE-READ-DECAY-WIRE: mute proven-noise advisories (R15 clone of ollama-route-pretooluse)

export const DEFAULT_MIN_LINES = 600;
export const HOOK_KEY = "large-read-digest-advisory";
// env-overridable so the decay-gate integration is hermetically testable; bumpStats()
// AND the decay read both use this one path, so read-path == write-path.
export const STATS_PATH = process.env.PRISM_LARGE_READ_DIGEST_STATS_PATH || "H:/prism/mcp-server/data/state/ollama-offload-stats.json";
// above this size we ESTIMATE line count from bytes instead of loading the file into
// the hook (a 5MB source file is exactly where the digest helps most -- still advise,
// just don't readFileSync multi-MB on the hot Read path). ~40 bytes/line average.
const MAX_READ_BYTES = 2 * 1024 * 1024;
const AVG_BYTES_PER_LINE = 40;

/** estimate line count from byte size (used only above MAX_READ_BYTES to avoid a
 *  multi-MB read in the hook). Conservative: rounds to nearest whole line. */
export function estimateLineCount(byteSize) {
  return Math.max(0, Math.round((Number(byteSize) || 0) / AVG_BYTES_PER_LINE));
}

// source-code extensions worth digesting (code, not data/docs). JSON is excluded
// (line-anchored claims on data are low-value); wiki .md has its own sibling hook.
const SOURCE_EXT = /\.(mjs|cjs|js|ts|mts|cts|tsx|jsx|py)$/i;
const NOISE_DIR = /\/(node_modules|\.git|dist|build|coverage|\.next)\//;

// ---- pure: classify a path as a large-source candidate ----
export function classifySourcePath(filePath) {
  if (!filePath || typeof filePath !== "string") return null;
  const norm = filePath.replace(/\\/g, "/");
  if (!SOURCE_EXT.test(norm)) return null;
  if (/\/knowledge\/wiki\//.test(norm)) return null; // wiki sibling owns these
  if (NOISE_DIR.test(norm)) return null;             // generated/vendored noise
  const base = norm.split("/").pop();
  return { isSource: true, base, normPath: norm };
}

// ---- pure: decide whether to emit an advisory ----
// minLines honored with a floor of 200 (sub-200 source files are cheap to read in
// full; advising on them floods context and defeats the point).
export function decideAdvisory({ classification, lineCount, byteSize, minLines }) {
  if (!classification || !classification.isSource) {
    return { advise: false, reason: "not-a-source-file" };
  }
  const floor = Math.max(200, Number.isFinite(minLines) ? minLines : DEFAULT_MIN_LINES);
  if (!Number.isFinite(lineCount) || lineCount < floor) {
    return { advise: false, reason: `below-threshold (${lineCount}<${floor})` };
  }
  // ~3.5 chars/token; a digest is ~300 tokens (summary + ~10 line-anchored claims).
  const rawTokens = Math.ceil((byteSize || lineCount * 60) / 3.5);
  const digestTokens = 300;
  const tokensSavedIfTaken = Math.max(0, rawTokens - digestTokens);
  return {
    advise: true,
    reason: "large-source-file",
    rawTokens,
    digestTokens,
    tokensSavedIfTaken,
    suggestion: `🔎 ${classification.base} is ${lineCount} lines (~${rawTokens} tokens). For the gist, run \`node scripts/ollama-file-digest.mjs ${classification.normPath}\` -- a verified line-anchored digest (~${tokensSavedIfTaken} token saving); every claim is checkable against its cited source line. Read in full only if you need exact code.`,
  };
}

// ---- side-effect: bump offload-stats `byHook.<key>.suggested` (atomic, fail-safe) ----
function bumpStats() {
  try {
    if (!existsSync(STATS_PATH)) return;
    const raw = readFileSync(STATS_PATH, "utf8");
    let j;
    try { j = JSON.parse(raw); } catch { return; }
    if (!j || typeof j !== "object") return;
    j.byHook = j.byHook || {};
    j.byHook[HOOK_KEY] = j.byHook[HOOK_KEY] || { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0 };
    const h = j.byHook[HOOK_KEY];
    h.fired = (h.fired | 0) + 1;
    h.suggested = (h.suggested | 0) + 1;
    j.silentSuggestions = (j.silentSuggestions | 0) + 1; // potential, not banked
    j.lastUpdated = new Date().toISOString();
    const tmp = `${STATS_PATH}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(j, null, 2));
    renameSync(tmp, STATS_PATH);
  } catch { /* fail-safe */ }
}

// ---- impure shell ----
async function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    let done = false;
    const finish = (s) => { if (!done) { done = true; resolve(s); } };
    if (process.stdin.isTTY) return finish("");
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { buf += c; if (buf.length > 1024 * 64) finish(buf); });
    process.stdin.on("end", () => finish(buf));
    process.stdin.on("error", () => finish(buf));
    setTimeout(() => finish(buf), 750); // PreToolUse hooks must not stall dispatch
  });
}

function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

async function main() {
  if (process.env.PRISM_LARGE_READ_DIGEST_DISABLE === "1") { emit({ continue: true, suppressOutput: true }); return 0; }
  const verbose = process.env.PRISM_LARGE_READ_DIGEST_VERBOSE === "1";
  const minLines = parseInt(process.env.PRISM_LARGE_READ_DIGEST_MIN_LINES || `${DEFAULT_MIN_LINES}`, 10);

  const raw = await readStdin();
  let payload;
  try { payload = raw ? JSON.parse(raw) : {}; } catch { emit({ continue: true }); return 0; }
  if (payload.tool_name && payload.tool_name !== "Read") { emit({ continue: true }); return 0; }
  const filePath = payload.tool_input && payload.tool_input.file_path;
  if (!filePath || typeof filePath !== "string") { emit({ continue: true }); return 0; }

  const classification = classifySourcePath(filePath);
  if (!classification) { emit({ continue: true }); return 0; }

  let absPath = filePath;
  if (!isAbsolute(absPath)) absPath = join("H:/prism", absPath);
  if (!existsSync(absPath)) { emit({ continue: true }); return 0; }

  let st;
  try { st = statSync(absPath); } catch { emit({ continue: true }); return 0; }
  if (!st.isFile()) { emit({ continue: true }); return 0; }
  // 600 lines * ~30 chars avg ~= 18KB floor; 8KB is a generous skip margin.
  if (st.size < 8192) { emit({ continue: true }); return 0; }

  let lineCount;
  if (st.size > MAX_READ_BYTES) {
    lineCount = estimateLineCount(st.size); // huge file: estimate, never load it into the hook
  } else {
    let text;
    try { text = readFileSync(absPath, "utf8"); } catch { emit({ continue: true }); return 0; }
    lineCount = countLines(text);
  }

  const decision = decideAdvisory({ classification, lineCount, byteSize: st.size, minLines });
  if (!decision.advise) {
    if (verbose) process.stderr.write(`large-read-digest-advisory: skip ${classification.base} (${decision.reason})\n`);
    emit({ continue: true });
    return 0;
  }

  bumpStats();

  // advisory-decay gate (U-LARGE-READ-DECAY-WIRE, 2026-06-10): the header has
  // promised since ship that advisory-decay "can suppress it if it never converts"
  // -- but main() never consulted it, so a 0%-conversion advisory (live: 0/122)
  // flooded context forever. Wire it now (clone of the ollama-route-pretooluse
  // pattern): mute the nudge once this hook is proven noise (>= 50 injections at
  // < 5% conversion), keeping a 1-in-20 probe alive for self-revival. .suggested was
  // just bumped by bumpStats() so the probe counter advances even when muted; reads
  // the SAME STATS_PATH it writes; fails SAFE (fire:true) on unreadable/no-telemetry/
  // disabled. A conversion (offloaded++, recorded elsewhere when the digest CLI runs)
  // raises the take-rate and self-revives the advisory.
  const decay = decayDecision(HOOK_KEY, { statsPath: STATS_PATH });
  if (!decay.fire) {
    if (verbose) process.stderr.write(`large-read-digest-advisory: muted ${classification.base} (decay ${decay.status}, take=${decay.takeRate})\n`);
    emit({ continue: true });
    return 0;
  }
  if (verbose) process.stderr.write(`large-read-digest-advisory: advise on ${classification.base} (${lineCount} lines, ~${decision.tokensSavedIfTaken} potential saving${decay.probe ? ", decay-probe" : ""})\n`);

  emit({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: decision.suggestion } });
  return 0;
}

// CLI entry guard -- `import` of pure fns must NOT execute main().
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((c) => process.exit(c || 0)).catch((e) => {
    try { process.stderr.write(`large-read-digest-advisory fatal: ${e.message}\n`); } catch {}
    emit({ continue: true });
    process.exit(0);
  });
}
