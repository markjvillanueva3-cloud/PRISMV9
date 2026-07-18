---
type: "chat-session"
source: "claude-code-cli"
session_id: "cd8e1622-d491-4561-9c61-0f3193d0c565"
title: "Review the NAV-WIRING change set end-to-end for correctness, P0/P1 bugs, and fai"
date: "2026-06-03"
first_ts: "2026-06-03T05:39:23.853Z"
last_ts: "2026-06-03T05:47:26.933Z"
cwd: "H:\\prism"
messages: 63
user_msgs: 25
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism/cd8e1622-d491-4561-9c61-0f3193d0c565/subagents/agent-a39c7781bcf17cda0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Review the NAV-WIRING change set end-to-end for correctness, P0/P1 bugs, and fai

> **claude-code-cli** | 2026-06-03 | 63 msgs (25 user / 38 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/cd8e1622-d491-4561-9c61-0f3193d0c565/subagents/agent-a39c7781bcf17cda0.jsonl`

## Transcript

### User | 2026-06-03T05:39:23.853Z

Review the NAV-WIRING change set end-to-end for correctness, P0/P1 bugs, and fail-soft discipline. Grade PASS/FAIL.

This wires sierra's node-path resolver into the token-saving navigation surface. Files (read each end-to-end):
1. H:/prism/scripts/lib/nav-savings-ledger.mjs (NEW) + H:/prism/scripts/lib/nav-savings-ledger.test.mjs — append-only JSONL ledger; recordNavHit() emits {kind:"hit", est_tokens} (the shape the PSN aggregator counts); readNavSavings() round-trips. Must NEVER throw into a hook (fail-soft → boolean).
2. H:/prism/.claude/hooks/master-index-precheck-inject.mjs — in the exactMatch branch (search ~line 200), it now calls resolveCodePath(label) → appends a `→ Read <path>` line to the banner + recordNavHit(). Verify: wrapped in try (never blocks the inject), null-resolve omits the line (never a guessed path), no double-emit.
3. H:/prism/.claude/hooks/pre-bash-graph-inject.mjs — extracted exactMatchHit(keys,hits) (shared predicate), renderInject now takes an optional resolve fn and emits the path line in the exact-match banner, main() lazy-imports the resolver+ledger and records a hit. Verify: the extracted exactMatchHit predicate is BEHAVIORALLY IDENTICAL to the original inline logic (exact ∧ concrete ∧ noDuplicateRank2); the lazy import is fail-open; renderInject stays pure when no resolver passed.
4. H:/prism/.claude/hooks/stop-psn-savings-aggregate.mjs — added "nav" to SOURCES.
5. H:/prism/.claude/commands/nav.md (NEW) — the /nav skill.

Check specifically:
- Does the exactMatchHit extraction in pre-bash change ANY behavior vs the original inline block? (original: `hits.length>=1 && keys.length` then exact/concrete/noDuplicateRank2). Confirm identical truth table.
- Could the path line EVER point at a wrong file? (resolver returns null on ambiguous/miss — confirm the hooks only emit when path truthy.)
- Telemetry: can recordNavHit double-count (both renderInject AND main recording for pre-bash)? Confirm only main() records (renderInject only render
... [+387 chars truncated]

### Assistant | 2026-06-03T05:39:39.371Z

I'll review the NAV-WIRING change set end-to-end. Let me read all the files in parallel first.

### Assistant | 2026-06-03T05:39:39.699Z

[tool_use: Read]

### Assistant | 2026-06-03T05:39:40.157Z

[tool_use: Read]

### Assistant | 2026-06-03T05:39:40.688Z

[tool_use: Read]

### Assistant | 2026-06-03T05:39:41.596Z

[tool_use: Read]

### Assistant | 2026-06-03T05:39:42.019Z

[tool_use: Read]

### Assistant | 2026-06-03T05:39:42.043Z

[tool_use: Read]

### User | 2026-06-03T05:39:53.192Z

[tool_result] 1	// nav-savings-ledger.mjs — append-only ledger of node→path NAV resolutions that
2	// turned a "the graph knows X" hint into a direct `Read: <path>` (a saved
3	// Grep/Glob+Read search). SYSTEM-VIZ / U-SV-NAV-SAVINGS (sierra).
4	//
5	// Producer: the exact-path inject hooks (master-index-precheck-inject,
6	//   pre-bash-graph-inject) call recordNavHit() when they resolve a graph node's
7	//   la
... [+3978 chars truncated]

### User | 2026-06-03T05:39:56.332Z

[tool_result] 1	// nav-savings-ledger.test.mjs — proves recordNavHit emits the exact line shape
2	// the PSN aggregator counts ({kind:"hit", est_tokens}), is fail-soft, and that
3	// readNavSavings round-trips it. Hermetic: every test points the ledger at a tmp
4	// file via PRISM_NAV_SAVINGS_LEDGER_PATH so no real dashboard is touched.
5	
6	import { test } from "node:test";
7	import assert from "node:assert/st
... [+4980 chars truncated]

### User | 2026-06-03T05:39:56.382Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+12812 chars truncated]

### User | 2026-06-03T05:40:00.295Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-bash-graph-inject.mjs — PreToolUse:Bash graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A4.
7	 *
8	 * Sibling of pre-read / pre-grep / pre-write graph-inject. Before a Bash
9	 * command runs, surface the master-index nodes the graph already knows —
10	 * but NARROW: bash is mostly `git` / `npm` / `node` / build commands that
11
... [+10901 chars truncated]

### User | 2026-06-03T05:40:01.089Z

[tool_result] 1	# /nav — node → exact source path (zero graph-parse navigation)
2	
3	Resolve a PRISM node's **name / class / DSL shortcode / graph-node-id** to its
4	**exact source file path** (+ asset type, + optional declaration line) so you can
5	`Read` it DIRECTLY instead of Grep/Glob-searching the ~200K-file tree. Backed by
6	the compact `CODE_SYSTEM_INDEX.json` — **never** parses the 548 MB system-graph.

... [+2638 chars truncated]

### User | 2026-06-03T05:40:02.345Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-psn-savings-aggregate.mjs — Stop hook
5	 *
6	 * PSN-SAVINGS-AGGREGATE/U-PSA01 (2026-05-24, slot:alpha)
7	 *
8	 * Reads the 6 token-savings telemetry sidecars and writes a unified daily
9	 * summary to state/shared/dashboards/psn-savings-aggregate.json. Master-index
10	 * nightly regen picks it up so future prompts see the cumulative figure.
11	 *
... [+3266 chars truncated]

### Assistant | 2026-06-03T05:40:06.050Z

I have all 5 files. Now let me verify the dependencies that this change set relies on — the `resolveCodePath` resolver contract and the PSN aggregator's line-counting shape — since correctness of the change hinges on them.

### Assistant | 2026-06-03T05:40:06.976Z

[tool_use: Read]

### Assistant | 2026-06-03T05:40:07.100Z

[tool_use: Read]

### User | 2026-06-03T05:40:19.701Z

[tool_result] 1	// scripts/lib/psn-savings-aggregate.mjs
2	// -------------------------------------
3	// PSN-SAVINGS-AGGREGATE/U-PSA01 (2026-05-24, slot:alpha)
4	//
5	// Unifies the 6 token-savings telemetry sidecars shipped this session into
6	// one PSN-friendly daily summary. Pure-function aggregator; the Stop hook
7	// calling this owns file I/O.
8	//
9	// Tracked ledgers:
10	//   1. rtk-savings-ledger.json
... [+4230 chars truncated]

### User | 2026-06-03T05:40:19.710Z

[tool_result] 1	// code-path-resolver.mjs — resolve a PRISM node's name / label / id-tail / DSL
2	// shortcode to its SOURCE FILE PATH (+ asset type, + optional declaration line)
3	// via the canonical CODE_SYSTEM_INDEX.json.
4	//
5	// SYSTEM-VIZ / U-SV-CODE-PATH-RESOLVER (sierra, node-direct-navigation).
6	// EXTENDED U-SV-NODE-PATH-TEMPLATE (sierra): +type (from index `category`),
7	//   +byCode (DSL shortcod
... [+11153 chars truncated]

### Assistant | 2026-06-03T05:40:23.640Z

Now I have full visibility into the contract. Let me verify the two critical correctness claims: (1) the `exactMatchHit` extraction truth-table equivalence, and (2) whether the original pre-bash inline block existed before this change (to confirm "behaviorally identical"). Let me check git history for the pre-bash hook.

### Assistant | 2026-06-03T05:40:25.542Z

[tool_use: Bash]

### Assistant | 2026-06-03T05:40:27.456Z

[tool_use: Bash]

### User | 2026-06-03T05:41:01.647Z

[tool_result] === status of changeset files ===
 M .claude/hooks/master-index-precheck-inject.mjs
 M .claude/hooks/pre-bash-graph-inject.mjs
?? .claude/hooks/stop-psn-savings-aggregate.mjs
?? scripts/lib/nav-savings-ledger.mjs
?? scripts/lib/nav-savings-ledger.test.mjs

### User | 2026-06-03T05:41:17.239Z

[tool_result] Exit code 255

### Assistant | 2026-06-03T05:41:21.000Z

Note: `nav.md` shows as neither modified nor untracked in that status — let me confirm it exists and check the original inline pre-bash block via git diff. The first command failed (exit 255), likely the `2>/dev/null` with the compound `;`. Let me retry cleanly.

### Assistant | 2026-06-03T05:41:21.963Z

[tool_use: Bash]

### Assistant | 2026-06-03T05:41:24.269Z

[tool_use: Bash]

### User | 2026-06-03T05:41:39.439Z

[tool_result] diff --git a/.claude/hooks/pre-bash-graph-inject.mjs b/.claude/hooks/pre-bash-graph-inject.mjs
index a59d194426..5966929341 100644
--- a/.claude/hooks/pre-bash-graph-inject.mjs
+++ b/.claude/hooks/pre-bash-graph-inject.mjs
@@ -49,30 +49,60 @@ function emit(obj) {
  * @param {Array} hits      master-index hits
  * @returns {string|null}
  */
-export function renderInject(keys, hits) {
+/**
+ * The 
... [+5920 chars truncated]

### User | 2026-06-03T05:41:58.927Z

[tool_result] exit=0

### Assistant | 2026-06-03T05:42:07.099Z

I now have the original inline block (from the diff) and the extracted `exactMatchHit`. Note `nav.md` shows no status output — it's already committed/tracked (clean). Let me verify the truth-table equivalence rigorously and run the test suite.

The original inline block:
```js
if (hits.length >= 1 && Array.isArray(keys) && keys.length) {
  const h0 = hits[0];
  const label0 = h0 && h0.label ? String(h0.label).toLowerCase() : "";
  const exact = label0 && keys.some((k) => String(k).toLowerCase() === label0);
  const concrete = h0 && h0.status && !String(h0.status).startsWith("ghost");
  const noDuplicateRank2 = !(hits[1] && hits[1].label && String(hits[1].label).toLowerCase() === label0);
  if (exact && concrete && noDuplicateRank2) { ... }
}
```

The extracted `exactMatchHit`:
```js
if (!Array.isArray(hits) || hits.length < 1 || !Array.isArray(keys) || keys.length === 0) return null;
const h0 = hits[0];
const label0 = h0 && h0.label ? String(h0.label).toLowerCase() : "";
if (!label0) return null;
const exact = keys.some((k) => String(k).toLowerCase() === label0);
const concrete = !!h0.status && !String(h0.status).startsWith("ghost");
const noDuplicateRank2 = !(hits[1] && hits[1].label && String(hits[1].label).toLowerCase() === label0);
return (exact && concrete && noDuplicateRank2) ? h0 : null;
```

Let me run the tests to confirm everything passes and check the `info`/`type` field handling in the banner.

### Assistant | 2026-06-03T05:42:08.533Z

[tool_use: Bash]

### Assistant | 2026-06-03T05:42:09.660Z

[tool_use: Bash]

### User | 2026-06-03T05:42:22.307Z

[tool_result]   ...
# Subtest: recordNavHit is fail-soft on an unwritable path (returns false, never throws)
ok 4 - recordNavHit is fail-soft on an unwritable path (returns false, never throws)
  ---
  duration_ms: 7.8745
  ...
# Subtest: malformed input is tolerated (non-string label/path → null fields, still a hit)
ok 5 - malformed input is tolerated (non-string label/path → null fields, still a hit)
  ---
  
... [+265 chars truncated]

### User | 2026-06-03T05:42:45.406Z

[tool_result] ---
.claude/hooks/__tests__/token-awareness-inject.test.mjs

### Assistant | 2026-06-03T05:42:50.234Z

All 6 nav-savings-ledger tests pass. There's no dedicated `renderInject`/`exactMatchHit` test file (the existing pre-bash tests don't reference it). Let me verify the truth-table equivalence empirically with the actual extracted predicate against the original inline logic, including the edge cases that matter (falsy-status, empty-string label, the `keys.length` vs `keys.length === 0` distinction).

### Assistant | 2026-06-03T05:43:03.073Z

[tool_use: Bash]

### User | 2026-06-03T05:43:08.405Z

[tool_result] Exit code 1
node:internal/modules/esm/load:217
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, schemes);
          ^

Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'h:'
    at throwIfUnsupportedURLScheme (node:internal/modules/esm/lo
... [+511 chars truncated]

### Assistant | 2026-06-03T05:43:10.857Z

Need a `file://` URL for the import on Windows. Let me fix the import path.

### Assistant | 2026-06-03T05:43:21.233Z

[tool_use: Bash]

### User | 2026-06-03T05:43:36.903Z

[tool_result] OK  [exact concrete] orig=true new=true
OK  [exact ghost] orig=false new=false
OK  [no status (undefined)] orig=false new=false
OK  [empty status string] orig=false new=false
OK  [status null] orig=false new=false
OK  [not exact] orig=false new=false
OK  [empty label] orig=false new=false
OK  [dup rank2] orig=false new=false
OK  [dup rank2 diff case key] orig=false new=false
OK  [rank2 diff label]
... [+437 chars truncated]

### Assistant | 2026-06-03T05:43:45.583Z

All 20 truth-table cases are equivalent, including the subtle ones (falsy status, empty-label, capital-G "Ghost" prefix non-match, numeric labels/keys, missing rank-2 label). The extraction is behaviorally identical.

One nuance worth noting: the original inline had `keys.length` (truthy check) and the extracted uses `keys.length === 0` (returning null). For an empty array both yield "no banner" — equivalent. And the original's `exact` was `label0 && keys.some(...)` (could be `""` falsy) vs the new `exactMatchHit` which early-returns null on empty `label0` before computing `exact` — same net result, confirmed by the "empty label" case.

Now let me verify the remaining concerns: the double-count question (does `renderInject` ever record?), the `info`/`type` field availability on master-index hits, and whether the master-index hook reads `np.path` safely. Let me check the master-index hits shape for `.info` and the `exactMatch.wiki`/`.memory` access.

### Assistant | 2026-06-03T05:43:46.591Z

[tool_use: Bash]

### Assistant | 2026-06-03T05:43:47.589Z

[tool_use: Bash]

### User | 2026-06-03T05:43:55.926Z

[tool_result] 6: *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
7: *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
54:  "node", "label", "info", "wiki", "memory", "prism",
141: * (`knowledge.{wikiEntries,memoryEntries}`) so they are used verbatim — only
311:      const wikiArr = Array.isArray(n.knowledge?.wikiEntries) ? n.knowledge.wikiEntries : [];
312: 
... [+1821 chars truncated]

### User | 2026-06-03T05:44:47.052Z

[tool_result] Exit code 255

### Assistant | 2026-06-03T05:44:50.885Z

The first grep failed (exit 255) — likely the multi-path arg. Let me retry the recordNavHit call-site search and also confirm the hit shape returns `wiki`/`memory` as arrays (so the master-index hook's `.wiki.length`/`.memory.length` access is safe) and that `status` defaults to `"?"` (not `undefined`).

### Assistant | 2026-06-03T05:44:51.719Z

[tool_use: Grep]

### User | 2026-06-03T05:45:20.229Z

[tool_result] .claude\hooks\master-index-precheck-inject.mjs:42:import { recordNavHit } from "../../scripts/lib/nav-savings-ledger.mjs";
.claude\hooks\master-index-precheck-inject.mjs:213:        recordNavHit({ label: exactMatch.label, path: np.path, source: "master-index" });
.claude\hooks\pre-bash-graph-inject.mjs:178:  let recordNavHit = null;
.claude\hooks\pre-bash-graph-inject.mjs:181:    ({ recordNavHit }
... [+146 chars truncated]

### Assistant | 2026-06-03T05:45:29.284Z

Confirmed: `recordNavHit` is called in exactly TWO places — line 213 of master-index (inside the `if (np && np.path)` guard) and line 194 of pre-bash (inside `main()`, NOT in `renderInject`). The pre-bash `renderInject` only renders the path line; it never records. So there is exactly **one hit per exact match** — no double-count.

I have everything needed. Let me consolidate the verification of the remaining specific concerns:

1. **Double-count** — confirmed impossible. `renderInject` takes a `resolve` fn but never imports or calls `recordNavHit`; only `main()` records, gated by `exactMatchHit(keys, hits)` returning the same h0 that produced the banner.

2. **Wrong-file path** — `resolveCodePath` returns `null` on miss OR ambiguous (the `AMBIGUOUS` sentinel → `return null`), never a guessed path. Both hooks emit the line only inside `if (np && np.path)`. Safe.

3. **Fail-soft / never-throw** — `recordNavHit` is fully try/catch-wrapped returning boolean; both call sites are additionally wrapped in try/catch (master-index line 209-215; pre-bash line 190-196). The lazy imports in pre-bash are fail-open (`catch { /* nav extras optional */ }`). Master-index uses a static import — let me confirm that can't break the hook at load time.

Let me verify the one residual risk: master-index uses a **static** `import { recordNavHit }` (line 42) and `import { resolveCodePath }` (line 41), not lazy. If either module fails to parse/load, the whole hook fails at import time. Let me check whether that's caught.

### Assistant | 2026-06-03T05:45:29.924Z

[tool_use: Read]

### User | 2026-06-03T05:45:40.610Z

[tool_result] 248	
249	// Run as a hook only when invoked directly (not when imported by a test).
250	const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
251	if (isDirectRun) {
252	  try { main(); }
253	  catch (err) {
254	    // Hooks must never block the prompt — log to stderr (which the harness
255	    // ignores for additionalContext) and exit 0.
256	    process
... [+112 chars truncated]

### Assistant | 2026-06-03T05:45:49.851Z

This confirms a real (but pre-existing and low-severity) consideration: the master-index hook's static `import { resolveCodePath }` / `import { recordNavHit }` are top-level ESM imports. If either module threw at module-evaluation time, the hook would fail to load entirely (the `try/main()` wrapper at line 252 cannot catch an import-time failure — module evaluation happens before any statement runs). However:

- `nav-savings-ledger.mjs` has zero top-level side effects (only `const` declarations and function defs) — it cannot throw at import.
- `code-path-resolver.mjs` likewise has only declarations at top level (`loadMaps` is lazy, called inside `resolveCodePath`) — no import-time throw.
- The master-index hook already statically imports 6 other libs the same way (`runMasterIndexSearch`, `edgeOrder`, `lexicalRerank`, `incrementFeature`, `cag-consume`), so this adds no new failure class beyond what already shipped.

The pre-bash hook is stricter (lazy + fail-open), appropriate for the hotter PreToolUse:Bash path. The asymmetry is defensible: master-index is UserPromptSubmit (less hot, and a broken import would already break it via the 6 existing static imports). Both modules are side-effect-free at load. So no new throw path is introduced.

Let me do a final check on the `est_tokens` honesty and the `appendFileSync` atomicity claim, then run the full pre-bash hook end-to-end to confirm it doesn't throw with the new wiring.

### Assistant | 2026-06-03T05:45:52.101Z

[tool_use: Bash]

### Assistant | 2026-06-03T05:45:53.159Z

[tool_use: Bash]

### User | 2026-06-03T05:46:11.859Z

[tool_result] {"continue":true,"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"## ⚡ Pre-Bash EXACT MATCH — graph already knows `cuttingforceengine`\n  • [L10/built] cuttingforceengine\n  → `Read src/engines/CuttingForceEngine.ts` (engine)\n_TOKEN-SAVE: skip the shell search — the graph node IS the answer. Disable: PRISM_PRE_BASH_GRAPH_INJECT=0._"}}
exit=0

### User | 2026-06-03T05:46:20.199Z

[tool_result] exit=0

### Assistant | 2026-06-03T05:46:30.489Z

The pre-bash hook fires end-to-end correctly: it produced the EXACT MATCH banner with the resolved `→ Read src/engines/CuttingForceEngine.ts (engine)` line, recorded a hit, and exited 0. The master-index hook exited 0 cleanly (no exact-match banner here because the prompt token "cuttingforceengine" doesn't exactly equal the label after the master-index search's token extraction — that's the multi-line render path, which is fine).

Let me verify the hit was actually recorded to the ledger (round-trip the telemetry) and confirm the est_tokens credit landed, then check that concurrent appends are safe in practice.

### Assistant | 2026-06-03T05:46:33.229Z

[tool_use: Bash]

### User | 2026-06-03T05:46:39.112Z

[tool_result] ledger: H:\prism\state\shared\dashboards\nav-savings-ledger.jsonl exists: true
summary: {"hits":2,"savedTokens":600}
last line: {"ts":1780465558637,"kind":"hit","est_tokens":300,"label":"cuttingforceengine","path":"src/engines/CuttingForceEngine.ts","source":"pre-bash"}

### Assistant | 2026-06-03T05:46:44.028Z

End-to-end telemetry confirmed: the live pre-bash fire wrote `{ts, kind:"hit", est_tokens:300, label, path, source:"pre-bash"}` — exactly the shape `summarizeJsonl` counts (`e.kind === "hit"` → `out.hits += 1` + `out.savedTokens += est_tokens`). The aggregator's `nav` source will roll this into `totals.hits`/`totals.savedTokens`. The round-trip `readNavSavings()` reports it correctly.

Let me clean up the test artifact I just wrote to the real ledger (2 test hits from my verification runs) so I don't leave telemetry pollution, then finalize.

### Assistant | 2026-06-03T05:46:47.056Z

[tool_use: Bash]

### User | 2026-06-03T05:46:53.084Z

[tool_result] removed 1 test hit(s); remaining 1

### Assistant | 2026-06-03T05:47:26.933Z

Cleaned up — removed my verification-run hit from the real ledger (1 remaining was a prior legitimate entry, not from my runs). The tmp truth-table file is gone.

I have everything for a final verdict. Here is the complete review.

---

## Code Quality Analysis Report — NAV-WIRING change set

### Summary
- Files reviewed end-to-end: 6 (2 new lib + test, 2 modified hooks, 1 modified Stop hook, 1 new skill)
- Dependencies verified: `code-path-resolver.mjs` (resolver contract), `psn-savings-aggregate.mjs` (counter shape)
- P0 issues: **0**
- P1 issues: **0**
- Tests: 6/6 pass (`nav-savings-ledger.test.mjs`); 20/20 truth-table equivalence cases pass; both hooks fire clean end-to-end (exit 0) with live telemetry round-trip confirmed

### Each specific check, answered

**1. Does `exactMatchHit` extraction change ANY behavior vs the original inline block?**
NO — proven identical. I reconstructed the original inline predicate from the git diff and ran 20 adversarial cases through both (`/tmp/truthtable.mjs`): **ALL EQUIVALENT**. The subtle cases all match:
- Original `keys.length` (truthy) vs new `keys.length === 0` (explicit) → both reject empty arrays.
- Original computed `exact = label0 && keys.some(...)` (where `label0===""` short-circuits falsy); new early-returns `null` on empty `label0` before computing `exact` → same net result (verified by "empty label" case).
- Original `concrete = h0 && h0.status && !startsWith("ghost")`; new `concrete = !!h0.status && !startsWith("ghost")` (h0 already non-null by that point) → identical.
- Falsy status (`undefined`/`""`/`null`), capital-G `"Ghost-"` (NOT stripped, fires banner — same in both), numeric labels/keys coerced via `String()`, rank-2 dup/diff/missing-label — all match.

**2. Could the path line EVER point at a wrong file?**
NO. `resolveCodePath` returns `null` on both miss AND ambiguity — the `AMBIGUOUS` sentinel (a key mapping to ≥2 distinct paths) triggers `return null` (resolver lines 195/198), and the resolver's st
... [+4268 chars truncated]
