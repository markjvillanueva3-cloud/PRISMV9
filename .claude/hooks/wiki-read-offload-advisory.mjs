#!/usr/bin/env node
// tier: T3
// wiki-read-offload-advisory.mjs — PreToolUse:Read advisory hook
//
// When Claude is about to Read a large wiki entry (>500 lines by default),
// inject an advisory pointing at /route-to-obsidian — a slash that delegates
// to scripts/ask-ollama.mjs summarize so the 5-50KB wiki body is processed in
// a local Ollama subprocess instead of streaming into Claude's context.
//
// Honest scope (R12): this hook does NOT block the Read. It advises that a
// large wiki entry COULD be summarized via /route-to-obsidian. The token
// saving materializes only when Claude / the operator chooses the slash on
// the next turn. Tracked under offload-stats `byHook.wiki-read-offload-advisory.suggested`
// so the high-roi-skill-rank.mjs measurement picks up the lift.
//
// Knobs:
//   PRISM_WIKI_OFFLOAD_ADVISORY_DISABLE=1   -- off-switch (fail-safe: hook continues)
//   PRISM_WIKI_OFFLOAD_MIN_LINES=N          -- line threshold (default 500, floor 50)
//   PRISM_WIKI_OFFLOAD_VERBOSE=1            -- debug stderr
//   PRISM_WIKI_OFFLOAD_STATS_PATH=p         -- override offload-stats path (test hermeticity)
//   PRISM_ADVISORY_DECAY_DISABLE=1          -- global: bypass the decay mute (always fire)
//
// U-WIKI-READ-DECAY-WIRE (2026-06-10): WIRED to advisory-decay (R15 apply-to-all,
// clone of large-read-digest 05906647ad). Once this advisory is proven noise
// (>= 50 injections at < 5% conversion) it mutes, keeping a 1-in-20 self-revival
// probe. Today it is insufficient-data so decay is a no-op (fire:true) -- this arms it.
//
// Wiring: PreToolUse with matcher "Read" -- settings.json entry needed.
// Not wired by default (operator gates via per-host settings).

import { readFileSync, existsSync, statSync, writeFileSync, renameSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { decayDecision } from "../../scripts/lib/advisory-decay.mjs"; // U-WIKI-READ-DECAY-WIRE

export const DEFAULT_MIN_LINES = 500;
export const HOOK_KEY = "wiki-read-offload-advisory";
// env-overridable so the decay-gate integration is hermetically testable; bumpStats()
// AND the decay read both use this one path, so read-path == write-path.
export const STATS_PATH = process.env.PRISM_WIKI_OFFLOAD_STATS_PATH || "H:/prism/mcp-server/data/state/ollama-offload-stats.json";

// ---- pure: classify a path as a wiki entry ----
// Wiki entries live under H:/prism/knowledge/wiki/**/*.md. We accept both
// Windows (\) and POSIX (/) separators and absolute or already-normalized
// inputs. Returns null when the path is not a candidate.
export function classifyWikiPath(filePath) {
  if (!filePath || typeof filePath !== "string") return null;
  const norm = filePath.replace(/\\/g, "/");
  // Match: /knowledge/wiki/.../<file>.md (case-sensitive — the dir is lowercase by convention)
  const m = norm.match(/\/knowledge\/wiki\/(.+\.md)$/);
  if (!m) return null;
  return { isWiki: true, isMd: true, relPath: m[1], normPath: norm };
}

// ---- pure: count lines in a string ----
// Counts content-bearing lines. Empty trailing newline ignored.
export function countLines(text) {
  if (!text) return 0;
  // Trailing newline shouldn't count as a line; matches `wc -l` semantics for
  // files that end with \n.
  const trimmedTail = text.endsWith("\n") ? text.slice(0, -1) : text;
  if (trimmedTail.length === 0) return 0;
  let n = 1;
  for (let i = 0; i < trimmedTail.length; i++) {
    if (trimmedTail.charCodeAt(i) === 10) n++;
  }
  return n;
}

// ---- pure: decide whether to emit an advisory ----
// minLines is honored with a floor of 50 (sub-50 thresholds advise on every
// wiki page, which floods context and defeats the point).
export function decideAdvisory({ classification, lineCount, byteSize, minLines }) {
  if (!classification || !classification.isWiki) {
    return { advise: false, reason: "not-a-wiki-md" };
  }
  const floor = Math.max(50, Number.isFinite(minLines) ? minLines : DEFAULT_MIN_LINES);
  if (!Number.isFinite(lineCount) || lineCount < floor) {
    return { advise: false, reason: `below-threshold (${lineCount}<${floor})` };
  }
  // Token estimate: ~3.5 chars/token average; summary ~500 tokens.
  // (Same heuristic as ask-ollama.mjs `estimateTokens`.)
  const rawTokens = Math.ceil((byteSize || lineCount * 60) / 3.5);
  const summaryTokens = 500;
  const tokensSavedIfTaken = Math.max(0, rawTokens - summaryTokens);
  return {
    advise: true,
    reason: "large-wiki-md",
    rawTokens,
    summaryTokens,
    tokensSavedIfTaken,
    suggestion: `📚 wiki entry "${classification.relPath}" is ${lineCount} lines (~${rawTokens} tokens). Consider /route-to-obsidian "${classification.relPath}" — routes to local Ollama summarize, ~${tokensSavedIfTaken} token saving.`,
  };
}

// ---- side-effect: bump offload-stats `byHook.<key>.suggested` ----
// Best-effort: any read/write failure is swallowed (fail-safe — the advisory
// already injected). Uses atomic temp+rename to avoid corrupting the stats
// file under concurrent fleet writes.
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
    // Advisory tokens are POTENTIAL — not banked. Mirror the silentSuggestions
    // counter at the top level; the actual offloaded counter only ticks when
    // /route-to-obsidian is invoked downstream.
    j.silentSuggestions = (j.silentSuggestions | 0) + 1;
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
    // 750ms timeout — PreToolUse hooks must not stall tool dispatch.
    setTimeout(() => finish(buf), 750);
  });
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

async function main() {
  if (process.env.PRISM_WIKI_OFFLOAD_ADVISORY_DISABLE === "1") {
    emit({ continue: true, suppressOutput: true });
    return 0;
  }
  const verbose = process.env.PRISM_WIKI_OFFLOAD_VERBOSE === "1";
  const minLines = parseInt(process.env.PRISM_WIKI_OFFLOAD_MIN_LINES || `${DEFAULT_MIN_LINES}`, 10);

  const raw = await readStdin();
  let payload;
  try { payload = raw ? JSON.parse(raw) : {}; } catch { emit({ continue: true }); return 0; }
  if (payload.tool_name && payload.tool_name !== "Read") { emit({ continue: true }); return 0; }
  const filePath = payload.tool_input && payload.tool_input.file_path;
  if (!filePath || typeof filePath !== "string") { emit({ continue: true }); return 0; }

  const classification = classifyWikiPath(filePath);
  if (!classification) { emit({ continue: true }); return 0; }

  // Resolve absolute path for stat — Claude passes absolute, but defensive.
  let absPath = filePath;
  if (!isAbsolute(absPath)) absPath = join("H:/prism", absPath);
  if (!existsSync(absPath)) { emit({ continue: true }); return 0; }

  let st;
  try { st = statSync(absPath); } catch { emit({ continue: true }); return 0; }
  if (!st.isFile()) { emit({ continue: true }); return 0; }

  // Quick byte-size pre-check — files <2KB never hit the line threshold and
  // we skip the read entirely. (500 lines * ~40 chars avg ~= 20KB floor; 2KB
  // is a generous safety margin.)
  if (st.size < 2048) { emit({ continue: true }); return 0; }

  let text;
  try { text = readFileSync(absPath, "utf8"); } catch { emit({ continue: true }); return 0; }
  const lineCount = countLines(text);

  const decision = decideAdvisory({ classification, lineCount, byteSize: st.size, minLines });
  if (!decision.advise) {
    if (verbose) process.stderr.write(`wiki-read-offload-advisory: skip ${classification.relPath} (${decision.reason})\n`);
    emit({ continue: true });
    return 0;
  }

  bumpStats();

  // advisory-decay gate (U-WIKI-READ-DECAY-WIRE, 2026-06-10): mute once proven noise
  // (>= 50 injections at < 5% conversion); bumpStats just advanced the probe counter
  // so the 1-in-20 self-revival probe still fires when muted. Reads the SAME STATS_PATH
  // it writes; fails SAFE (fire:true on unreadable/insufficient/disabled). Clone of
  // large-read-digest / ollama-route-pretooluse.
  const decay = decayDecision(HOOK_KEY, { statsPath: STATS_PATH });
  if (!decay.fire) {
    if (verbose) process.stderr.write(`wiki-read-offload-advisory: muted ${classification.relPath} (decay ${decay.status})\n`);
    emit({ continue: true });
    return 0;
  }
  if (verbose) process.stderr.write(`wiki-read-offload-advisory: advise on ${classification.relPath} (${lineCount} lines, ~${decision.tokensSavedIfTaken} potential saving)\n`);

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: decision.suggestion,
    },
  });
  return 0;
}

// CLI entry guard — `import` of pure fns must NOT execute main().
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((c) => process.exit(c || 0)).catch((e) => {
    try { process.stderr.write(`wiki-read-offload-advisory fatal: ${e.message}\n`); } catch {}
    emit({ continue: true });
    process.exit(0);
  });
}
