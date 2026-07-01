---
type: "chat-session"
source: "claude-code-cli"
session_id: "16769ed0-dcdd-41c8-9cc5-58b633f8a1d5"
title: "Rigorous review of a focused, in-flight token-economy bugfix (slot:alpha, branch"
date: "2026-06-20"
first_ts: "2026-06-20T16:15:24.172Z"
last_ts: "2026-06-20T16:17:34.931Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 27
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-aabc86641e9841917.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Rigorous review of a focused, in-flight token-economy bugfix (slot:alpha, branch

> **claude-code-cli** | 2026-06-20 | 64 msgs (27 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-aabc86641e9841917.jsonl`

## Transcript

### User | 2026-06-20T16:15:24.172Z

Rigorous review of a focused, in-flight token-economy bugfix (slot:alpha, branch cad-fusion-live-ms0). Read each file END TO END and grade PASS or FAIL with P0/P1/P2 findings + file:line citations. Read-only.

## The bug being fixed
The shared injection-dedup cache `state/shared/dashboards/injection-dedup-cache.json` is read → pruned → written-back by ~10 UserPromptSubmit/PreToolUse hooks, each with its OWN TTL (5min .. 24h). The old `pruneExpired(cache, now, ttlMs)` is TAG-AGNOSTIC — it drops EVERY tag's entries older than the CALLER's ttlMs. So a 5min hook (e.g. audit-viz) pruning + writing back silently evicts a still-live 24h sibling's entries (e.g. pre-bash-graph-inject, psn-prompt-checklist) → those siblings re-emit their full block next prompt = a dedup MISS = wasted tokens. Self-healing, never corruption/safety.

## The fix
1. NEW pure fn `pruneTag(cache, hookTag, now, ttlMs)` added to `H:/prism/scripts/lib/injection-dedup.mjs` — prunes ONLY that one hookTag's bucket, leaving every other tag byte-identical. `pruneExpired` kept exported for back-compat (now carries a WARNING docstring).
2. Migrated all 10 shared-cache evictors from `pruneExpired(cache, now/dnow, ttl)` → `pruneTag(cache, hookTag, now/dnow, ttl)`.

## Files to review (all under H:/prism)
- `scripts/lib/injection-dedup.mjs` — the new `pruneTag` fn + `pruneExpired` docstring. VERIFY: pruneTag is pure; foreign tags preserved exactly; empty-bucket → tag removed (matches pruneExpired); null cache → {}; falsy hookTag → input returned unchanged (NO foreign eviction); shallow `{...cache}` never mutates foreign buckets; immutability of input.
- `scripts/lib/injection-dedup-prune.test.mjs` — NEW tests. VERIFY they are real reference-value/invariant tests (not stubs), and that the cross-hook contrast test genuinely proves pruneExpired WOULD evict the 24h sibling while pruneTag does NOT.
- The 10 migrated hooks — VERIFY each passes the CORRECT in-scope `hookTag` that was defined ABOVE the prune line, the T
... [+1284 chars truncated]

### Assistant | 2026-06-20T16:15:27.344Z

I'll review this token-economy bugfix systematically. Let me start by reading the core library file and its tests, then verify each migrated hook.

### Assistant | 2026-06-20T16:15:27.824Z

[tool_use: Read]

### Assistant | 2026-06-20T16:15:28.122Z

[tool_use: Read]

### User | 2026-06-20T16:15:28.901Z

[tool_result] 1	// scripts/lib/injection-dedup.mjs
2	// ---------------------------------
3	// TOKEN-SAVINGS-EXPAND/U-PSN-INJECTION-DEDUP-LIB (2026-05-23, slot:alpha)
4	//
5	// Generic per-session injection deduper. UserPromptSubmit hooks fire ~14-16
6	// context blocks per prompt; many are byte-identical to prior emissions in
7	// the same session (wiki precheck, master-index, memory vault, slot soul).
8	// A 
... [+6337 chars truncated]

### User | 2026-06-20T16:15:29.263Z

[tool_result] 1	// injection-dedup-prune.test.mjs
2	// -------------------------------
3	// Tests pruneTag(cache, hookTag, now, ttlMs) -- the SHARED-CACHE-SAFE prune that
4	// fixes the tag-agnostic pruneExpired fleet bug: the shared
5	// state/shared/dashboards/injection-dedup-cache.json is written back by ~10
6	// evictor hooks with TTLs 5min..24h, and the old pruneExpired (called with the
7	// CURRENT hook's
... [+6918 chars truncated]

### Assistant | 2026-06-20T16:15:36.763Z

The library and tests look strong. Now let me verify each of the 10 migrated hooks to confirm correct in-scope hookTag and TTL usage. Let me read them in parallel batches.

### Assistant | 2026-06-20T16:15:37.023Z

[tool_use: Read]

### Assistant | 2026-06-20T16:15:37.198Z

[tool_use: Read]

### User | 2026-06-20T16:15:38.966Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// audit-viz-first-inject.mjs — UserPromptSubmit T2 hook.
4	// When an audit/discovery intent is detected, auto-run
5	// `node scripts/system-viz-query.mjs find <noun>` and inject the top-K hits
6	// so the chat sees the answer BEFORE reaching for Grep/Glob.
7	//
8	// Knobs: PRISM_AUDIT_VIZ_FIRST_DISABLE=1 · PRISM_AUDIT_VIZ_FIRST_K=N (1..20, def 5)
9	//       
... [+12726 chars truncated]

### User | 2026-06-20T16:15:39.235Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// PER-SLOT-CLAUDEMD-MS0 / U-PSCM-LOADER (slot:alpha 2026-06-13) -- galaxy-claudemd-inject.
4	//
5	// UserPromptSubmit hook. Resolves THIS chat's slot -> its galaxy (single-source
6	// scripts/lib/slot-galaxy-map.mjs) and injects that galaxy's
7	// mcp-server/src/engines/<galaxy>/CLAUDE.md as the slot's PRIMARY domain doctrine, so a
8	// slot operates from its
... [+7153 chars truncated]

### Assistant | 2026-06-20T16:15:43.423Z

Both audit-viz-first and galaxy-claudemd look correct. Let me verify the remaining 8 hooks, focusing on in-scope hookTag and TTL var usage.

### Assistant | 2026-06-20T16:15:44.377Z

[tool_use: Read]

### Assistant | 2026-06-20T16:15:45.007Z

[tool_use: Read]

### User | 2026-06-20T16:15:45.878Z

[tool_result] 580	  if (gaugeMd) parts.push(gaugeMd);
581	  if (md) parts.push(md);
582	  if (parts.length === 0) process.exit(0);
583	  const fullBlock = parts.join("\n\n");
584	
585	  // HIGHVALUE-DISCOVERY #1: injection-dedup. The concerning-leg block is stable
586	  // across prompts within a session (leg health is slow-changing) — emit it on
587	  // first-emit / 5min-TTL / content-change, else a 1-line ma
... [+1527 chars truncated]

### User | 2026-06-20T16:15:46.163Z

[tool_result] 130	  const prompt = String(payload.prompt ?? "");
131	  if (!shouldInject(prompt)) process.exit(0);
132	
133	  // U-PSN-CHECKLIST-DEDUP — session-keyed dedup. Slot/session pins the cache
134	  // tag; content-hash + 24h TTL pins per-session uniqueness.
135	  const sid = String(payload.session_id || payload.sessionId || "").slice(0, 8);
136	  const fullBlock = buildChecklist(prompt);
137	  const d
... [+1026 chars truncated]

### Assistant | 2026-06-20T16:15:51.400Z

Both psn hooks correct. psn-leg-state uses `dnow` consistently (prune, shouldEmit, recordEmit all `dnow`). Let me verify the imports and TTL definitions are present in these two files, then read the remaining 6 hooks.

### Assistant | 2026-06-20T16:15:52.726Z

[tool_use: Grep]

### Assistant | 2026-06-20T16:15:54.115Z

[tool_use: Grep]

### User | 2026-06-20T16:15:54.275Z

[tool_result] 44:import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneTag } from "../../scripts/lib/injection-dedup.mjs";
69:const DEDUP_TTL_MS = 5 * 60_000;
598:    cache = pruneTag(cache, hookTag, dnow, DEDUP_TTL_MS); // shared-cache-safe: prune only this tag (5min TTL)

### Assistant | 2026-06-20T16:15:55.052Z

[tool_use: Read]

### Assistant | 2026-06-20T16:15:55.573Z

[tool_use: Read]

### User | 2026-06-20T16:15:55.596Z

[tool_result] 36:import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneTag } from "../../scripts/lib/injection-dedup.mjs";
47:const DEDUP_TTL_MS = 24 * 60 * 60_000;
144:    cache = pruneTag(cache, hookTag, now, DEDUP_TTL_MS); // shared-cache-safe: prune only this tag (24h TTL)

### User | 2026-06-20T16:15:56.277Z

[tool_result] 195	  // error, dedup-disabled, or missing session_id falls back to emitting the full block
196	  // (exactly the pre-dedup behavior -- zero regression).
197	  const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
198	  const sid8 = String(payload.session_id || "").slice(0, 8);
199	  let additionalContext = block;
200	  if (!dedupDisabled && sid8) {
201	    const sidecar = join(
... [+1137 chars truncated]

### User | 2026-06-20T16:15:56.804Z

[tool_result] 75	  const verbose = process.env.PRISM_SLOT_SOUL_INJECT_VERBOSE === "1";
76	  const header = `## 🎭 Slot soul — ${mySlot} (Hermes personality layer, U-HERMES02)\n\n`;
77	  const footer = verbose ? `\n_(soul file: ${soulPath})_` : "";
78	  const fullBlock = header + payload + footer;
79	
80	  // Injection-dedup adopter (U-PSN-INJECTION-DEDUP-LIB) — slot souls are stable
81	  // across prompts within
... [+1463 chars truncated]

### Assistant | 2026-06-20T16:15:59.574Z

All four so far correct: hookTag defined immediately above the prune line, TTL var consistent. Now the 4 pre-*-graph-inject hooks.

### Assistant | 2026-06-20T16:16:00.531Z

[tool_use: Read]

### Assistant | 2026-06-20T16:16:01.465Z

[tool_use: Read]

### User | 2026-06-20T16:16:01.607Z

[tool_result] 255	  // U-PBGI-DEDUP (2026-05-25, slot:alpha) — per-(session,content-hash) dedup.
256	  // For Bash, the natural cache discriminator is the rendered block itself
257	  // (same command base / keys → same hits → same block → dedup). Fail-soft.
258	  let additionalContext = block;
259	  let emittedBanner = true; // false when the dedup cache suppresses the banner
260	  try {
261	    const dedupDisa
... [+1590 chars truncated]

### Assistant | 2026-06-20T16:16:02.400Z

[tool_use: Read]

### Assistant | 2026-06-20T16:16:02.807Z

[tool_use: Read]

### User | 2026-06-20T16:16:03.077Z

[tool_result] 210	  let additionalContext = block;
211	  try {
212	    const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
213	    const sid = String(stdin?.session_id || stdin?.sessionId || "").slice(0, 8);
214	    if (!dedupDisabled && sid && filePath) {
215	      const lib = await import("../../scripts/lib/injection-dedup.mjs");
216	      const fs = await import("node:fs");
217	      con
... [+1124 chars truncated]

### User | 2026-06-20T16:16:03.851Z

[tool_result] 238	  let emittedBanner = true; // false when the dedup cache suppresses the banner
239	  try {
240	    const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
241	    const sid = String(stdin?.session_id || stdin?.sessionId || "").slice(0, 8);
242	    if (!dedupDisabled && sid) {
243	      const lib = await import("../../scripts/lib/injection-dedup.mjs");
244	      const fs = awa
... [+1225 chars truncated]

### User | 2026-06-20T16:16:04.122Z

[tool_result] 228	  let emittedBanner = true; // false when the dedup cache suppresses the banner
229	  try {
230	    const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
231	    const sid = String(stdin?.session_id || stdin?.sessionId || "").slice(0, 8);
232	    if (!dedupDisabled && sid && filePath) {
233	      const lib = await import("../../scripts/lib/injection-dedup.mjs");
234	      co
... [+1268 chars truncated]

### Assistant | 2026-06-20T16:16:11.463Z

All 10 hooks verified. Each has the correct in-scope hookTag defined immediately above the prune line, the TTL var matches the shouldEmit/recordEmit calls, and pre-read/pre-write include `filePath` in the tag (so prune targets the EXACT tag that shouldEmit reads — confirmed identical string in each). 

Note: in audit-viz-first the prune line at 230 inlines `` `audit-viz-first:${sid8}` `` rather than referencing a `hookTag` variable (correct, since the canonical hookTag is derived inside `decideAuditVizEmit` and not in main's scope) — and I verified it matches the tag `decideAuditVizEmit` derives at line 197.

Let me run the new test file to confirm it passes, and confirm there are no remaining `pruneExpired` calls against the shared sidecar that were missed in the migration.

### Assistant | 2026-06-20T16:16:12.443Z

[tool_use: Bash]

### Assistant | 2026-06-20T16:16:13.624Z

[tool_use: Grep]

### User | 2026-06-20T16:16:16.187Z

[tool_result]     # Subtest: does NOT mutate the input cache (immutability; input keeps its own pre-prune state)
    ok 1 - does NOT mutate the input cache (immutability; input keeps its own pre-prune state)
      ---
      duration_ms: 0.1711
      ...
    # Subtest: a prototype-named tag that is NOT an own key is treated as absent (no proto pollution / no crash)
    ok 2 - a prototype-named tag that is NOT an
... [+576 chars truncated]

### User | 2026-06-20T16:16:17.577Z

[tool_result] .claude\hooks\audit-viz-first-inject.mjs:227:    // pruneTag (NOT pruneExpired): prune ONLY this hook's tag in the SHARED
.claude\hooks\bash-result-cache.mjs:106:function pruneExpired(cache) {
.claude\hooks\bash-result-cache.mjs:181:  const cache = pruneExpired(await loadCache());
.claude\hooks\json-read-summarizer.mjs:75:function pruneExpired(cache) {
.claude\hooks\json-read-summarizer.mjs:189:  
... [+203 chars truncated]

### Assistant | 2026-06-20T16:16:21.357Z

12/12 tests pass. The remaining `pruneExpired` references are in 3 other hooks (`bash-result-cache.mjs`, `json-read-summarizer.mjs`, `state-write-watch.mjs) — each defines its OWN LOCAL `pruneExpired` function (not the lib import) and operates on a PRIVATE per-hook cache, not the shared `injection-dedup-cache.json`. Let me confirm those are NOT touching the shared sidecar (to rule out a missed migration).

### Assistant | 2026-06-20T16:16:22.295Z

[tool_use: Grep]

### User | 2026-06-20T16:16:23.687Z

[tool_result] No matches found

### Assistant | 2026-06-20T16:16:23.708Z

[tool_use: Grep]

### Assistant | 2026-06-20T16:16:24.664Z

[tool_use: Grep]

### User | 2026-06-20T16:16:25.308Z

[tool_result] No matches found

### Assistant | 2026-06-20T16:16:25.906Z

[tool_use: Grep]

### User | 2026-06-20T16:16:26.210Z

[tool_result] No matches found

### User | 2026-06-20T16:16:27.382Z

[tool_result] scripts\lib\injection-dedup-emit.mjs:52:    cache = pruneExpired(cache, now, ttlMs);
scripts\lib\injection-dedup-fs.mjs:67:  cache = pruneExpired(cache, now, ttlMs);
scripts\lib\injection-dedup.mjs:84:export function pruneExpired(cache, now = Date.now(), ttlMs = DEFAULT_TTL_MS) {
scripts\lib\injection-dedup-prune.test.mjs:63:    const old = pruneExpired(cache, now, FIVE_MIN); // audit-viz pruning 
... [+17 chars truncated]

### Assistant | 2026-06-20T16:16:31.681Z

The 3 hooks with local `pruneExpired` (bash-result-cache, json-read-summarizer, state-write-watch) have ZERO references to the shared injection-dedup cache — they are separate private-cache hooks, correctly out of scope for this migration.

There are 2 OTHER lib-internal `pruneExpired` callers I need to check: `injection-dedup-emit.mjs` and `injection-dedup-fs.mjs`. These are the lib's own convenience wrappers. I need to verify they don't write the SHARED sidecar (which would re-introduce the bug). Let me read both.

### Assistant | 2026-06-20T16:16:32.605Z

[tool_use: Read]

### Assistant | 2026-06-20T16:16:32.619Z

[tool_use: Read]

### User | 2026-06-20T16:16:33.710Z

[tool_result] 1	// scripts/lib/injection-dedup-emit.mjs
2	// -------------------------------------
3	// TOKEN-SAVINGS-EXPAND / HIGHVALUE-DISCOVERY #1 (2026-06-08, slot:alpha).
4	//
5	// One-call wrapper around injection-dedup.mjs so a per-prompt injector hook can
6	// adopt session-keyed block dedup in a single line instead of copy-pasting the
7	// ~15-line read→prune→shouldEmit→recordEmit→write gate (which had
... [+3014 chars truncated]

### User | 2026-06-20T16:16:33.820Z

[tool_result] 1	// scripts/lib/injection-dedup-fs.mjs
2	// -----------------------------------
3	// U-ALPHA-INJECT-DEDUP-FS (2026-06-11, slot:alpha) -- FS wrapper around the PURE injection-dedup
4	// lib so a UserPromptSubmit hook can adopt per-session dedup in ONE call instead of copy-pasting the
5	// 22-line sidecar dance (currently duplicated across 8 adopters). The pure lib stays FS-free + unit-
6	// testab
... [+4158 chars truncated]

### Assistant | 2026-06-20T16:16:40.337Z

This is the key finding. Both lib wrappers — `injection-dedup-emit.mjs:52` (`dedupedContext`) and `injection-dedup-fs.mjs:67` (`dedupeOrMarker`) — write to the SAME shared sidecar (`state/shared/dashboards/injection-dedup-cache.json`, confirmed at emit.mjs:24-27 and fs.mjs:29/63) and STILL call the tag-agnostic `pruneExpired(cache, now, ttlMs)`. These are the exact bug the migration set out to kill, just hidden behind shared wrappers rather than inlined in a hook.

The task framed the migration as "all 10 shared-cache evictors," but the comment in `injection-dedup-fs.mjs:5` says it consolidates "8 adopters," and `injection-dedup-emit.mjs:8` names 3 more. Let me confirm these wrappers are actually wired to live hooks (not dead code) before grading severity.

### Assistant | 2026-06-20T16:16:41.286Z

[tool_use: Grep]

### Assistant | 2026-06-20T16:16:41.961Z

[tool_use: Grep]

### User | 2026-06-20T16:16:42.833Z

[tool_result] Found 6 files
.claude\hooks\model-tier-advisor.mjs
.claude\hooks\model-tier-advisor.mjs.bak-effort-wire
.claude\hooks\task-start-substrate-inject.mjs
.claude\hooks\local-compute-intent.mjs
.claude\hooks\ai-synergy-awareness-inject.mjs
.claude\hooks\obsidian-vault-precheck-inject.mjs

### User | 2026-06-20T16:16:43.912Z

[tool_result] Found 9 files
.claude\hooks\slot-context-bundle-inject.mjs
.claude\hooks\prompt-context-inject.mjs
.claude\hooks\charlie-quoting-knowledge-inject.mjs
.claude\hooks\echo-post-domain-inject.mjs
.claude\hooks\charlie-quoting-awareness-inject.mjs
.claude\hooks\whiskey-lathe-context-inject.mjs
.claude\hooks\xray-blueprint-domain-inject.mjs
.claude\hooks\delta-cad-awareness-inject.mjs
.claude\hooks\foxt
... [+29 chars truncated]

### Assistant | 2026-06-20T16:16:54.279Z

This confirms the scope gap. The two shared-cache wrappers are wired into roughly 14 LIVE hooks (5 via `dedupeOrMarker`, 9 via `dedupedContext`), all of which write the shared sidecar and all of which still prune tag-agnostically via `pruneExpired`. So the fleet-wide bug the migration targets is only partially fixed: the 10 inlined evictors are migrated, but ~14 wrapper-based evictors on the SAME shared cache are not.

This is a real correctness gap relative to the stated goal ("the shared cache is written back by ~10 evictor hooks" undercounts — it's ~10 inlined + ~14 wrapper-routed = ~24). However, it is NOT a regression introduced by this diff (these wrappers were already calling `pruneExpired` before this change), and the bug class is self-healing (a dedup MISS = wasted tokens, never corruption). So it's a P1 incompleteness finding, not a P0.

Let me do a final correctness pass on the one non-obvious edge the task flagged: the `dnow` consistency in psn-leg-state (already confirmed: prune/shouldEmit/recordEmit all use `dnow`), and verify pre-read/pre-write use the identical `filePath`-bearing tag in both prune and shouldEmit (already confirmed by reading: both lines reference the same `hookTag` const). Let me confirm ASCII-only in the new lib/test code and that `recordEmit` after `pruneTag` preserves foreign tags through the write-back.

### Assistant | 2026-06-20T16:16:55.840Z

[tool_use: Bash]

### User | 2026-06-20T16:16:59.066Z

[tool_result] === scripts/lib/injection-dedup.mjs ===
grep: -P supports only unibyte and UTF-8 locales
=== scripts/lib/injection-dedup-prune.test.mjs ===
grep: -P supports only unibyte and UTF-8 locales

### Assistant | 2026-06-20T16:17:02.259Z

[tool_use: Bash]

### User | 2026-06-20T16:17:05.680Z

[tool_result] === scripts/lib/injection-dedup.mjs ===
9:// dedup — this block is unchanged since an earlier prompt this session").
16://   - hashBlock(text) → short stable hex digest
17://   - shouldEmit(cache, hookTag, contentHash, now, ttlMs) → { emit, reason, lastSeenAt }
18://   - recordEmit(cache, hookTag, contentHash, now) → new cache (immutable update)
19://   - formatDedupedMarker(hookTag) → 1-line `🔁 [
... [+549 chars truncated]

### Assistant | 2026-06-20T16:17:34.931Z

The non-ASCII characters in `injection-dedup.mjs` (em-dashes, arrows, `🔁`, `≥`) are all in PRE-EXISTING lines (1-69) — none in the NEW `pruneTag` function (lines 98-131, which I read and confirmed is ASCII-clean) nor its docstring. The `🔁` in `formatDedupedMarker` is the deliberate fleet-wide marker glyph, unchanged by this diff. The new test file is fully ASCII-clean. So the diff itself introduces no new non-ASCII content.

I have completed a full end-to-end review of all changed files plus the surrounding contracts. Here is my verdict.

---

VERDICT: FAIL

summary: The core `pruneTag` function (`scripts/lib/injection-dedup.mjs:118-131`) is correct, pure, and handles every flagged edge (null cache, falsy tag, absent tag, empty-bucket-removal, immutability) exactly as specified; its 12 new tests are real invariant tests (12/12 pass) and the cross-hook contrast test genuinely proves `pruneExpired` WOULD evict the 24h sibling while `pruneTag` does not. All 10 inlined hook migrations are correct — each passes the right in-scope hookTag with an unchanged TTL var, `psn-leg-state` consistently uses `dnow`, the `pre-read`/`pre-write` hooks prune the exact `filePath`-bearing tag that `shouldEmit` reads, and audit-viz-first correctly inlines the tag at line 230. BUT the migration is incomplete: two shared-cache wrappers route ~14 additional LIVE evictor hooks through the same sidecar and still call the buggy tag-agnostic `pruneExpired`, leaving the fleet bug only partially fixed.

findings:
- [P1] `scripts/lib/injection-dedup-fs.mjs:67` — `dedupeOrMarker` writes the SAME shared sidecar (`state/shared/dashboards/injection-dedup-cache.json`, line 29/63) but still prunes with tag-agnostic `pruneExpired(cache, now, ttlMs)`. It is wired into 5 live hooks (`local-compute-intent.mjs`, `ai-synergy-awareness-inject.mjs`, `obsidian-vault-precheck-inject.mjs`, `task-start-substrate-inject.mjs`, `model-tier-advisor.mjs`). Each of these, on emit, prunes EVERY other tag's entries older th
... [+3254 chars truncated]
