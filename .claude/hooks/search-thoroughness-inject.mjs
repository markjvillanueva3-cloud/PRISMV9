#!/usr/bin/env node
// tier: T2
/**
 * search-thoroughness-inject.mjs — UserPromptSubmit advisory hook.
 *
 * Fires on search / inventory / "check the X folder" intent and injects the
 * full-recursive + parallel-agent search discipline BEFORE the search happens.
 * Codifies [[feedback_full_recursive_parallel_search]] (operator directive
 * 2026-05-29) after two shallow-discovery misses (tool-holder undercount +
 * fixturing false-GAP) where a loose top-level glob produced a wrong inventory.
 *
 * Advisory only — NEVER blocks. A hard "was the search thorough" gate is
 * infeasible (no signal a hook can inspect), so this is a fail-soft nudge.
 * High-precision trigger: requires a search-VERB + a scope-NOUN, or a strong
 * standalone intent phrase — so it does NOT fire on every prompt (the
 * over-broad-keyword lesson from foxtrot-mill-awareness-inject).
 *
 * Env knobs:
 *   PRISM_SEARCH_THOROUGHNESS_DISABLE=1  → skip entirely
 *
 * Contract (UserPromptSubmit): read {prompt} on stdin → emit
 *   { continue:true, hookSpecificOutput:{ hookEventName, additionalContext } }
 */

import * as fs from "node:fs";

// ── Trigger patterns (high-precision; ANY match fires) ──────────────────────
// Group 1: search/sweep VERB within 40 chars of a scope NOUN.
const VERB_SCOPE_RX =
  /\b(check|search|sweep|scan|comb|crawl|inventory|enumerate|audit|go through|look through|dig through|sift through)\b[\s\S]{0,40}\b(folder|dir|directory|drive|tree|repo|repository|codebase|catalog|catalogue|database|corpus|archive|monolith|everything|all (?:the )?files|every file)\b/i;
// Group 2: scope NOUN within 40 chars of a search VERB (reverse order).
const SCOPE_VERB_RX =
  /\b(folder|directory|drive|tree|repo|codebase|catalog|database|corpus|archive|monolith)\b[\s\S]{0,40}\b(check|search|sweep|scan|comb|crawl|audit|enumerate|inventory|completeness)\b/i;
// Group 3: strong standalone intent phrases. Each carries its own \b boundary
// (a single trailing \b mis-handles alternatives that don't end on a word char).
// "how many" alone is a count signal; "do we have" (with the leading "do") is the
// discriminator vs the statement "we have a rule …" which must NOT fire.
const STANDALONE_RX =
  /\bhow many\b|\bcount (?:all|the|how many)\b|\bdo we have\b|\bfind all\b|\blist all\b|\bare we missing\b|\bwhat(?:'s| is| are) (?:in|inside|under)\b|\bdatabase completeness\b|\bfully account\b|\baccount for (?:all|every|everything)\b/i;

export function shouldFire(prompt) {
  if (typeof prompt !== "string" || prompt.length === 0) return false;
  // Cap scan length (ReDoS-safe — bounded input to the regexes).
  const p = prompt.slice(0, 4096);
  return VERB_SCOPE_RX.test(p) || SCOPE_VERB_RX.test(p) || STANDALONE_RX.test(p);
}

export function buildContext() {
  return [
    "─── 🔍 search thoroughness (feedback_full_recursive_parallel_search) ───",
    "This reads as a search / inventory request. Before you conclude a count or a gap:",
    "1. QUERY FIRST — prism_session:master_index_query  ·  node scripts/system-viz-query.mjs find <noun>.",
    "   Instant for indexed code/data nodes; but the graph does NOT index raw corpus dirs (e.g. resources/) and can be stale — use it to seed, not to conclude.",
    "2. SWEEP THE WHOLE TREE — recursively, file-by-file, to the leaves. Never stop at the top level; never sample-and-extrapolate. Verify the CANONICAL copy first (a slot worktree may hold a stub; the real corpus is often on main tree H:/prism).",
    "3. FAN OUT PARALLEL AGENTS — one Explore agent per sub-tree / vendor / format / dimension; each returns a structured count, not file dumps.",
    "Shallow top-level globs cause undercounts + false-GAP claims (the tool-holder lesson, 2026-05-29). Disable: PRISM_SEARCH_THOROUGHNESS_DISABLE=1",
    "────────────────────────────────────────────────",
  ].join("\n");
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function main() {
  if (String(process.env.PRISM_SEARCH_THOROUGHNESS_DISABLE ?? "") === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const stdin = readStdin();
  const prompt = stdin?.prompt ?? stdin?.user_prompt ?? "";
  if (!shouldFire(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: buildContext() },
  }));
}

// Run main() only when invoked directly as a script (so tests can import the
// pure functions without triggering stdin read / stdout write). Filename-suffix
// match is Windows-robust — pathToFileURL(argv[1]) vs import.meta.url diverges on
// drive-letter casing / slash style under Git Bash, which silently skipped main().
const invokedDirectly =
  !!process.argv[1] && /[\\/]search-thoroughness-inject\.mjs$/i.test(process.argv[1].replace(/\\/g, "/"));
if (invokedDirectly) {
  try { main(); }
  catch { process.stdout.write(JSON.stringify({ continue: true })); }
}
