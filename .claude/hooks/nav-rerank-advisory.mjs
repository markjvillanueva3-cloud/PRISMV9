#!/usr/bin/env node
// tier: T3
// nav-rerank-advisory.mjs -- PreToolUse:Bash advisory hook
//
// When Claude is about to run a `system-viz-query ... find <query>` (the codebase
// navigation search), inject an advisory pointing at scripts/ollama-nav-rerank.mjs
// (commit 127234e940) -- the VERIFIED ollama re-rank of the find candidates: a
// local model re-ranks the hits by query relevance and a pure verifier keeps an id
// ONLY if it is both in the candidate set AND resolvable via node-card-offset seek
// (hallucinated/dead ids dropped; trusted find-order fallback). So the operator's
// "enforce ollama for searches/navigation" lever auto-surfaces at the moment a find
// runs, at zero quality risk.
//
// Honest scope (R12): this hook does NOT block or replace the find. It advises that
// the find result COULD be re-ranked by a verified local model on the next turn. The
// token/quality benefit materializes only when the re-rank CLI is run. Tracked under
// offload-stats `byHook.nav-rerank-advisory.suggested` so the advisory-decay
// machinery (scripts/lib/advisory-decay.mjs) can measure conversion + suppress it if
// it never converts. Sibling of large-read-digest-advisory.mjs (reads) +
// wiki-read-offload-advisory.mjs (wiki) -- the verified-offload advisories together
// cover reads, wiki reads, and now SEARCH/navigation.
//
// Knobs:
//   PRISM_NAV_RERANK_ADVISORY_DISABLE=1  -- off-switch (fail-safe: hook continues)
//   PRISM_NAV_RERANK_ADVISORY_VERBOSE=1  -- debug stderr
//   PRISM_NAV_RERANK_STATS_PATH=p        -- override offload-stats path (test hermeticity)
//   PRISM_ADVISORY_DECAY_DISABLE=1       -- global: bypass the decay mute (always fire)
//
// U-NAV-RERANK-DECAY-WIRE (2026-06-10): WIRED to advisory-decay (R15 apply-to-all,
// clone of large-read-digest 05906647ad). Once proven noise (>= 50 injections at
// < 5% conversion) it mutes, keeping a 1-in-20 self-revival probe. Insufficient-data
// today so decay is a no-op (fire:true) -- this arms it for when it accumulates data.
//
// Wiring: PreToolUse with matcher "Bash" -- settings.json entry (near the Read siblings).
import { atomicOffloadStatsRMW, ensureOffloadBucket } from "../../scripts/lib/offload-stats-bump.mjs";
import { fileURLToPath } from "node:url";
import { decayDecision } from "../../scripts/lib/advisory-decay.mjs"; // U-NAV-RERANK-DECAY-WIRE

export const HOOK_KEY = "nav-rerank-advisory";
// env-overridable so the decay-gate integration is hermetically testable; bumpStats()
// AND the decay read both use this one path, so read-path == write-path.
export const STATS_PATH = process.env.PRISM_NAV_RERANK_STATS_PATH || "H:/prism/mcp-server/data/state/ollama-offload-stats.json";

// ---- pure: parse a Bash command for a `system-viz-query ... find <query>` call ----
// Returns { isFind:true, query:"<text>" } when the command is a system-viz find with
// a non-empty query, else { isFind:false, reason }. NEVER matches other subcommands
// (node-card / doc-nodes / cache-status) and NEVER matches the re-rank CLI itself
// (so the advisory cannot recursively suggest itself).
export function parseFindCommand(command) {
  if (!command || typeof command !== "string") return { isFind: false, reason: "no-command" };
  let cmd = command.trim();
  // never fire if the re-rank tool is already the thing being run (also covers the
  // pipe case `... find x | node ollama-nav-rerank ...` -- guard the FULL command).
  if (/ollama-nav-rerank/.test(cmd)) return { isFind: false, reason: "already-rerank" };
  // Consider ONLY the first command segment -- cut at the first shell control/redirect
  // operator (|| && | & ; < > >>). This is what stops a redirect target or a piped
  // downstream command from polluting the captured query (`find mill > out.txt` ->
  // query "mill", not "mill out.txt"). (2026-06-10 P2 hardening, 3-of-3 reviewer B.)
  cmd = cmd.split(/\s*(?:\|\||&&|>>|[|&;<>])\s*/)[0].trim();
  // strip a leading wrapper prefix (rtk / command) so the anchor sees the real invocation
  const stripped = cmd.replace(/^(?:rtk|command)\s+/, "");
  // ANCHORED so a mere MENTION of "system-viz find" (inside echo/grep/a quoted string)
  // never matches -- the prior un-anchored regex fired on `echo "...system-viz find x"`:
  //   Form A -- a real `system-viz-query[.mjs] find <q>` SCRIPT invocation (the
  //             "-query" script name + "find" subcommand is specific enough that a
  //             bare textual mention is implausible), matched anywhere in the segment; OR
  //   Form B -- the bare `system-viz find <q>` form ONLY at the segment START.
  let m = stripped.match(/system-viz-query(?:\.mjs)?\s+find\s+(.+)$/);
  if (!m) m = stripped.match(/^system-viz\s+find\s+(.+)$/);
  if (!m) return { isFind: false, reason: "not-a-find" };
  // strip flags and surrounding quotes from the captured remainder (operators already gone)
  const rest = m[1]
    .split(/\s+/)
    .filter((t) => t && !t.startsWith("--"))
    .map((t) => t.replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
  const query = rest.join(" ").trim();
  if (!query) return { isFind: false, reason: "empty-query" };
  return { isFind: true, query };
}

// ---- pure: decide whether to emit the advisory ----
export function decideNavAdvisory({ command }) {
  const parsed = parseFindCommand(command);
  if (!parsed.isFind) return { advise: false, reason: parsed.reason };
  const q = parsed.query;
  return {
    advise: true,
    reason: "system-viz-find",
    query: q,
    suggestion:
      `🔎 system-viz find "${q}": for a VERIFIED local-LLM re-rank of these candidates by relevance, run ` +
      `\`node scripts/ollama-nav-rerank.mjs "${q}" --top-k 10\` -- the model re-ranks and a pure verifier keeps an id ` +
      `ONLY if it is in the candidate set AND resolves via node-card seek (hallucinated/dead ids dropped; trusted find-order ` +
      `fallback). Zero quality risk (accuracy is the verifier's). Enforces the ollama-for-search lever.`,
  };
}

// ---- side-effect: bump offload-stats `byHook.<key>.suggested` (atomic, fail-safe) ----
function bumpStats() {
  atomicOffloadStatsRMW(STATS_PATH, (j) => {
    const h = ensureOffloadBucket(j, HOOK_KEY);
    h.fired = (h.fired | 0) + 1;
    h.suggested = (h.suggested | 0) + 1;
    j.silentSuggestions = (j.silentSuggestions | 0) + 1; // potential, not banked
  });
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
  if (process.env.PRISM_NAV_RERANK_ADVISORY_DISABLE === "1") { emit({ continue: true, suppressOutput: true }); return 0; }
  const verbose = process.env.PRISM_NAV_RERANK_ADVISORY_VERBOSE === "1";

  const raw = await readStdin();
  let payload;
  try { payload = raw ? JSON.parse(raw) : {}; } catch { emit({ continue: true }); return 0; }
  if (payload.tool_name && payload.tool_name !== "Bash") { emit({ continue: true }); return 0; }
  const command = payload.tool_input && payload.tool_input.command;
  if (!command || typeof command !== "string") { emit({ continue: true }); return 0; }

  const decision = decideNavAdvisory({ command });
  if (!decision.advise) {
    if (verbose) process.stderr.write(`nav-rerank-advisory: skip (${decision.reason})\n`);
    emit({ continue: true });
    return 0;
  }

  bumpStats();

  // advisory-decay gate (U-NAV-RERANK-DECAY-WIRE, 2026-06-10): mute once proven noise
  // (>= 50 injections at < 5% conversion); bumpStats just advanced the probe counter so
  // the 1-in-20 self-revival probe still fires when muted. Reads the SAME STATS_PATH it
  // writes; fails SAFE (fire:true on unreadable/insufficient/disabled). Clone of
  // large-read-digest / ollama-route-pretooluse.
  const decay = decayDecision(HOOK_KEY, { statsPath: STATS_PATH });
  if (!decay.fire) {
    if (verbose) process.stderr.write(`nav-rerank-advisory: muted find "${decision.query}" (decay ${decay.status})\n`);
    emit({ continue: true });
    return 0;
  }
  if (verbose) process.stderr.write(`nav-rerank-advisory: advise on find "${decision.query}"\n`);

  emit({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: decision.suggestion } });
  return 0;
}

// CLI entry guard -- `import` of pure fns must NOT execute main().
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((c) => process.exit(c || 0)).catch((e) => {
    try { process.stderr.write(`nav-rerank-advisory fatal: ${e.message}\n`); } catch {}
    emit({ continue: true });
    process.exit(0);
  });
}
