---
type: "chat-session"
source: "claude-code-cli"
session_id: "16769ed0-dcdd-41c8-9cc5-58b633f8a1d5"
title: "Independent regression re-review of the COMPLETED `pruneTag` fix (slot:alpha, ca"
date: "2026-06-20"
first_ts: "2026-06-20T16:25:42.573Z"
last_ts: "2026-06-20T23:53:54.162Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 24
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-a402c1cb53d49041f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Independent regression re-review of the COMPLETED `pruneTag` fix (slot:alpha, ca

> **claude-code-cli** | 2026-06-20 | 64 msgs (24 user / 40 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-a402c1cb53d49041f.jsonl`

## Transcript

### User | 2026-06-20T16:25:42.573Z

Independent regression re-review of the COMPLETED `pruneTag` fix (slot:alpha, cad-fusion-live-ms0). A prior pass FAILED it for an incomplete migration (2 wrapper libs still tag-agnostic). Those are now migrated. Hunt for any NEW silent breakage introduced by the wrapper edits + the injectable-now change. Read files END TO END. Grade PASS/FAIL with P0/P1/P2 + file:line. Read-only.

## Context
12 shared-sidecar evictors (10 hooks + 2 wrapper libs `injection-dedup-emit.mjs`/`injection-dedup-fs.mjs`) migrated `pruneExpired(cache, now, ttl)` -> `pruneTag(cache, <tag>, now, ttl)` so a short-TTL caller no longer evicts a live longer-TTL sibling in the shared cache.

## Specifically hunt (under H:/prism)
1. `scripts/lib/injection-dedup-emit.mjs`: the new `const now = Number.isFinite(opts.now) ? opts.now : Date.now();` — verify it cannot regress the 9 production callers (who pass no `now`): Number.isFinite(undefined)===false -> Date.now() path, identical to before. Confirm `pruneTag(cache, tag, ...)` then `recordEmit(cache, tag, ...)` then writeFileSync of the WHOLE object still preserves foreign tags through the full cycle (the fix must hold end-to-end, not just at prune).
2. `scripts/lib/injection-dedup-fs.mjs`: `dedupeOrMarker` `pruneTag(cache, hookTag, ...)` — same end-to-end check; confirm hookTag is the exact tag used by shouldEmit + recordEmit downstream, and the surrogate-strip + fail-soft paths are untouched.
3. New test `injection-dedup-wrapper-crosstag.test.mjs`: confirm its local `memFs` matches the real fs contract and the deterministic `now` injection actually exercises the TTL-difference (a test that passes regardless of pruneTag-vs-pruneExpired would be worthless — verify it genuinely fails on the old code path).
4. Any caller of `dedupedContext`/`dedupeOrMarker` that relied on the OLD tag-agnostic pruning as a SIDE EFFECT (e.g. expecting the shared cache to be globally trimmed)? Grep usages; confirm none depend on cross-tag eviction (they shouldn't — it was 
... [+373 chars truncated]

### Assistant | 2026-06-20T16:25:46.115Z

I'll investigate this regression re-review systematically. Let me start by reading the core files end to end.

### Assistant | 2026-06-20T16:25:46.829Z

[tool_use: Read]

### Assistant | 2026-06-20T16:25:46.834Z

[tool_use: Read]

### User | 2026-06-20T16:25:47.563Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\injection-dedup-emit.mjs' was already read 12s ago in this session and is unchanged (mtime 1781972616587). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-20T16:25:47.642Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\injection-dedup-fs.mjs' was already read 11s ago in this session and is unchanged (mtime 1781972475483). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-20T16:25:50.650Z

The read-once guard says these were read recently, but I don't have that content in my visible context (this is a fresh review). Let me bypass the cache to read them fresh.

### Assistant | 2026-06-20T16:25:51.604Z

[tool_use: Bash]

### Assistant | 2026-06-20T16:25:52.329Z

[tool_use: Bash]

### User | 2026-06-20T16:25:55.679Z

[tool_result] // scripts/lib/injection-dedup-emit.mjs
// -------------------------------------
// TOKEN-SAVINGS-EXPAND / HIGHVALUE-DISCOVERY #1 (2026-06-08, slot:alpha).
//
// One-call wrapper around injection-dedup.mjs so a per-prompt injector hook can
// adopt session-keyed block dedup in a single line instead of copy-pasting the
// ~15-line read→prune→shouldEmit→recordEmit→write gate (which had drifted into 
... [+3190 chars truncated]

### User | 2026-06-20T16:25:56.851Z

[tool_result] // scripts/lib/injection-dedup-fs.mjs
// -----------------------------------
// U-ALPHA-INJECT-DEDUP-FS (2026-06-11, slot:alpha) -- FS wrapper around the PURE injection-dedup
// lib so a UserPromptSubmit hook can adopt per-session dedup in ONE call instead of copy-pasting the
// 22-line sidecar dance (currently duplicated across 8 adopters). The pure lib stays FS-free + unit-
// testable; this wra
... [+4165 chars truncated]

### Assistant | 2026-06-20T16:26:02.752Z

Now let me read the pure lib that defines `pruneTag`, `pruneExpired`, `shouldEmit`, `recordEmit` to verify the contract, and the new test.

### Assistant | 2026-06-20T16:26:03.746Z

[tool_use: Read]

### Assistant | 2026-06-20T16:26:03.913Z

[tool_use: Read]

### User | 2026-06-20T16:26:04.450Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\injection-dedup.mjs' was already read 11m ago in this session and is unchanged (mtime 1781971505204). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-20T16:26:04.565Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\injection-dedup-wrapper-crosstag.test.mjs' was already read 27s ago in this session and is unchanged (mtime 1781972651992). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-06-20T16:26:07.390Z

The read-once guard keeps blocking but the content is not in my visible context (fresh session). Let me disable the cache for these reads.

### Assistant | 2026-06-20T16:26:08.336Z

[tool_use: Bash]

### Assistant | 2026-06-20T16:26:09.095Z

[tool_use: Bash]

### User | 2026-06-20T16:26:11.726Z

[tool_result] // scripts/lib/injection-dedup.mjs
// ---------------------------------
// TOKEN-SAVINGS-EXPAND/U-PSN-INJECTION-DEDUP-LIB (2026-05-23, slot:alpha)
//
// Generic per-session injection deduper. UserPromptSubmit hooks fire ~14-16
// context blocks per prompt; many are byte-identical to prior emissions in
// the same session (wiki precheck, master-index, memory vault, slot soul).
// A single goal-prer
... [+5916 chars truncated]

### User | 2026-06-20T16:26:15.496Z

[tool_result] // injection-dedup-wrapper-crosstag.test.mjs
// -----------------------------------------
// Regression lock for the pruneTag fix at the WRAPPER level (slot:alpha, 2026-06-20).
// Both shared-cache wrappers -- dedupeOrMarker (injection-dedup-fs.mjs, ~5 hooks) and
// dedupedContext (injection-dedup-emit.mjs, ~9 hooks) -- read+prune+write-back the SAME
// shared sidecar (state/shared/dashboards/inje
... [+4867 chars truncated]

### Assistant | 2026-06-20T16:26:21.252Z

I have all four core files. Now let me verify the critical claims. First, the test claims each cross-tag test **FAILS on old pruneExpired** — that's load-bearing per R9. Let me verify the test genuinely fails on the old code path by tracing the logic, and also check the 9+5 production callers to confirm the migration is complete and no caller depends on cross-tag eviction.

Let me trace the test's first dedupeOrMarker test against BOTH old and new behavior to confirm it's a genuine R9 test. But first, the test imports use a relative path `./injection-dedup-fs.mjs`. The test claims `memFs` mirrors the real fs contract. Let me check the real fs test harness and grep all callers.

### Assistant | 2026-06-20T16:26:22.654Z

[tool_use: Grep]

### Assistant | 2026-06-20T16:26:23.170Z

[tool_use: Grep]

### User | 2026-06-20T16:26:25.146Z

[tool_result] scripts\lib\injection-dedup-emit.mjs:22:import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneTag } from "./injection-dedup.mjs";
scripts\lib\injection-dedup-emit.mjs:52:    // pruneTag (NOT pruneExpired): prune ONLY this tag in the SHARED sidecar so a
scripts\lib\injection-dedup-emit.mjs:55:    cache = pruneTag(cache, tag, now, ttlMs);
scripts\lib\injection-dedup-fs.mjs:25:import 
... [+5439 chars truncated]

### User | 2026-06-20T16:26:28.441Z

[tool_result] Found 58 files
scripts\lib\injection-dedup-wrapper-crosstag.test.mjs
scripts\lib\injection-dedup-emit.mjs
scripts\lib\injection-dedup-fs.mjs
knowledge\memories\reference\reference_slotbundle_dedup_2026_06_09.md
knowledge\memories\reference\reference_lone_surrogate_api400_2026_06_10.md
knowledge\memories\reference\reference_injection_dedup_fs_2026_06_11.md
knowledge\memories\reference\reference_hig
... [+3062 chars truncated]

### Assistant | 2026-06-20T16:26:32.434Z

The grep confirms both wrappers now use `pruneTag` exclusively (no `pruneExpired` left in them). Let me now verify the hook callers of both wrappers to confirm: (a) the migration is complete (no hook still calls pruneExpired on the shared cache directly), and (b) no production caller passes `now` or relies on cross-tag eviction. Let me look at the actual hook usages and the real fs test harness.

### Assistant | 2026-06-20T16:26:33.897Z

[tool_use: Grep]

### Assistant | 2026-06-20T16:26:34.514Z

[tool_use: Grep]

### User | 2026-06-20T16:26:35.332Z

[tool_result] .claude\hooks\ai-synergy-awareness-inject.mjs-31-import { spawn } from "node:child_process";
.claude\hooks\ai-synergy-awareness-inject.mjs:32:import { dedupeOrMarker } from "../../scripts/lib/injection-dedup-fs.mjs";
H:\prism\.claude\hooks\ai-synergy-awareness-inject.mjs-33-
--
H:\prism\.claude\hooks\ai-synergy-awareness-inject.mjs-175-  // marker. Saves ~467B/turn fleet-wide.
.claude\hooks\ai-syn
... [+10556 chars truncated]

### User | 2026-06-20T16:26:36.009Z

[tool_result] .claude\hooks\audit-viz-first-inject.mjs:56:const DEDUP_SIDECAR_REL = "state/shared/dashboards/injection-dedup-cache.json";
.claude\hooks\audit-viz-first-inject.mjs:227:    // pruneTag (NOT pruneExpired): prune ONLY this hook's tag in the SHARED
.claude\hooks\bash-result-cache.mjs:106:function pruneExpired(cache) {
.claude\hooks\bash-result-cache.mjs:181:  const cache = pruneExpired(await loadCach
... [+2069 chars truncated]

### Assistant | 2026-06-20T16:26:54.893Z

Key findings so far. The two wrappers (`injection-dedup-emit.mjs`, `injection-dedup-fs.mjs`) are migrated to `pruneTag`. The 3 local `pruneExpired` functions in `bash-result-cache.mjs`, `json-read-summarizer.mjs`, `state-write-watch.mjs` operate on their OWN private caches (loadCache), not the shared sidecar — confirming the context note #5.

But the grep reveals other hooks that touch the SHARED sidecar `injection-dedup-cache.json` directly and were part of the "12 evictors" claim: `audit-viz-first-inject.mjs`, `slot-soul-inject.mjs`, `slot-domain-awareness-inject.mjs`, `psn-leg-state-inject.mjs`, `galaxy-claudemd-inject.mjs`, `psn-prompt-checklist-inject.mjs`, and the 4 `pre-*-graph-inject.mjs`. The task scope says "10 hooks + 2 wrapper libs" were migrated. Let me verify NONE of those direct-sidecar hooks still call the tag-agnostic `pruneExpired` on the shared cache — that's the silent-breakage vector. Let me check each.

### Assistant | 2026-06-20T16:26:58.275Z

[tool_use: Bash]

### User | 2026-06-20T16:27:01.639Z

[tool_result] === audit-viz-first-inject ===
30:import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneTag } from "../../scripts/lib/injection-dedup.mjs";
227:    // pruneTag (NOT pruneExpired): prune ONLY this hook's tag in the SHARED
230:    cache = pruneTag(cache, `audit-viz-first:${sid8}`, now, DEDUP_TTL_MS);
=== slot-soul-inject ===
17:import { hashBlock, shouldEmit, recordEmit, formatDedupe
... [+1877 chars truncated]

### Assistant | 2026-06-20T16:27:07.359Z

All shared-sidecar evictor hooks now use `pruneTag` exclusively. No `pruneExpired` remains on the shared cache anywhere. The migration is complete and consistent across all evictors (10 direct hooks + 2 wrapper libs back the rest).

Now the critical R9 verification: does the new test genuinely fail on the old `pruneExpired` code path? Let me empirically prove this by running the new test against a monkeypatched/reverted version. I'll create a temp copy of the lib with `pruneTag` aliased to `pruneExpired` and run the test against it to confirm it would have failed. But first, let me just run the actual test suite as-is to confirm 35/35 passes, then prove the R9 property.

### Assistant | 2026-06-20T16:27:08.044Z

[tool_use: Bash]

### User | 2026-06-20T16:27:11.448Z

[tool_result]     # Subtest: injectable now is backward-compatible: omitting it still dedups same-tag within TTL
    ok 2 - injectable now is backward-compatible: omitting it still dedups same-tag within TTL
      ---
      duration_ms: 0.8054
      ...
    1..2
ok 2 - dedupedContext (emit wrapper) -- cross-tag preservation
  ---
  duration_ms: 2.8155
  type: 'suite'
  ...
1..2
# tests 4
# suites 2
# pass 4
# f
... [+61 chars truncated]

### Assistant | 2026-06-20T16:27:16.974Z

The new test passes (4/4). Now the R9 proof: I must confirm the test genuinely fails on the OLD `pruneExpired` path. Let me create a reverted copy of the lib (pruneTag aliased to tag-agnostic behavior) and the wrappers pointing to it, then run the cross-tag tests against that to prove they would have caught the bug.

### Assistant | 2026-06-20T16:27:24.296Z

[tool_use: Bash]

### User | 2026-06-20T16:27:27.790Z

[tool_result] node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'C:\tmp\dedup-r9\injection-dedup.mjs'
    at Object.readFileSync (node:fs:441:20)
    at [eval]:3:10
    at runScriptInThisContext (node:internal/vm:209:10)
    at node:internal/process/execution:118:14
    at [eval]-wrapper:6:24
    at runS
... [+496 chars truncated]

### Assistant | 2026-06-20T16:27:31.337Z

The `cd /tmp` resolved to `C:\tmp` (Git Bash on Windows), so the node `-e` patch wrote to the wrong path. The test ran against the UNPATCHED copy. Let me use a Windows-friendly temp path and verify the patch actually landed before running.

### Assistant | 2026-06-20T16:27:39.692Z

[tool_use: Bash]

### User | 2026-06-20T23:51:55.642Z

[tool_result] PATCH-OK: pruneTag now delegates to tag-agnostic pruneExpired
--- verify patch landed ---
export function pruneTag(cache, hookTag, now = Date.now(), ttlMs = DEFAULT_TTL_MS) {
  return pruneExpired(cache, now, ttlMs);
}
=== Run cross-tag test against REVERTED pruneTag (expect FAILURES) ===
not ok 1 - dedupeOrMarker (fs wrapper) -- cross-tag preservation
not ok 2 - dedupedContext (emit wrapper) -- c
... [+49 chars truncated]

### Assistant | 2026-06-20T23:52:05.060Z

R9 verification PASSED empirically. Reverting `pruneTag` to the old tag-agnostic `pruneExpired` makes exactly the 2 cross-tag tests FAIL (`not ok 1`, `not ok 2` = the 24h-sibling-eviction tests), while the 2 control tests (same-tag dedup + backward-compat `now`) still pass. This proves the new test is a genuine regression lock that fails on the old code path — not a worthless test.

Now let me verify the remaining items: (1) the `memFs` matches the real fs contract used by the production wrapper, (2) the backward-compat `now` for the 9 emit callers (none pass `now`), and (3) the real fs test harness to confirm `memFs` parity. Let me check the real fs test harness and confirm no production caller passes `now` to either wrapper.

### Assistant | 2026-06-20T23:52:07.446Z

[tool_use: Bash]

### User | 2026-06-20T23:52:10.839Z

[tool_result] === Does ANY production hook pass now/fsImpl to the wrappers? ===
(none pass now/fsImpl -> production uses Date.now() + node:fs)

=== Real fs test harness in injection-dedup-fs.test.mjs (memFs def) ===
2:// Real-behavior tests for the FS dedup wrapper using an in-memory fsImpl (no disk).
3-import { test } from "node:test";
4-import assert from "node:assert/strict";
5-import { dedupeOrMarker, CANON
... [+1972 chars truncated]

### Assistant | 2026-06-20T23:52:17.061Z

Confirmed. The new test's `memFs` (in `injection-dedup-wrapper-crosstag.test.mjs`) is byte-for-byte identical to the canonical harness in `injection-dedup-fs.test.mjs` — same `readFileSync` (ENOENT-throwing), `writeFileSync`, `mkdirSync` contract. And the production wrapper uses exactly these three fs methods (`{ readFileSync, writeFileSync, mkdirSync }` default), so the memFs faithfully mirrors the real fs surface. No production hook passes `now` or `fsImpl` — they use the `Date.now()` + `node:fs` defaults, confirming the `Number.isFinite(opts.now)` guard cannot regress them.

Let me trace the `dedupedContext` (emit wrapper) `now` guard end-to-end once more and verify the full read→prune→record→write cycle preserves foreign tags. Let me write a quick end-to-end assertion confirming foreign tags survive a write-back cycle through the production `dedupedContext`.

### Assistant | 2026-06-20T23:52:25.384Z

[tool_use: Bash]

### User | 2026-06-20T23:52:35.045Z

[tool_result] tags on disk after short-hook write-back: sib-24h:abcd1234, short-5m:abcd1234
E2E PASS: foreign-tag survival + Date.now back-compat both hold

### Assistant | 2026-06-20T23:52:39.948Z

End-to-end confirmed at the production-code level: the foreign 24h tag survives the short hook's full-object `writeFileSync`, and the `Date.now()` back-compat path (no `now`) still dedups correctly.

Now let me address hunt items #4 (any caller relying on cross-tag eviction as a side effect) and run the full 4-file suite to confirm 35/35. Let me also verify the `prompt-context-inject.mjs` caller (which uses a 30-min TTL and a special suppress-on-repeat path) isn't broken by the prune change, and the `audit-viz-first` input-keyed caller.

### Assistant | 2026-06-20T23:52:42.212Z

[tool_use: Bash]

### Assistant | 2026-06-20T23:52:42.772Z

[tool_use: Read]

### User | 2026-06-20T23:52:46.465Z

[tool_result] === Full 4-file suite (lib + 2 wrappers + crosstag) ===
--- injection-dedup-prune.test.mjs ---
# tests 12
# pass 12
# fail 0
--- injection-dedup-fs.test.mjs ---
# tests 12
# pass 12
# fail 0
--- injection-dedup-emit.test.mjs ---
# tests 7
# pass 7
# fail 0
--- injection-dedup-wrapper-crosstag.test.mjs ---
# tests 4
# pass 4
# fail 0

### User | 2026-06-20T23:52:48.587Z

[tool_result] 210	  const matched = detectAuditIntent(prompt);
211	  if (!matched) return;
212	
213	  const nounResult = extractNoun(prompt, matched);
214	  if (!shouldFire(matched, nounResult, STRICT_FILTER)) return;
215	  const noun = nounResult.noun;
216	
217	  // Injection-dedup adopter: read the shared sidecar, decide emit/marker/bypass.
218	  // Fail-soft at every step (sidecar read/write error, dedup-dis
... [+1837 chars truncated]

### Assistant | 2026-06-20T23:52:54.991Z

Full suite confirmed: 12 + 12 + 7 + 4 = **35/35 pass** across the 4 lib/wrapper test files, matching the claim exactly. The `audit-viz-first-inject.mjs` caller correctly uses `pruneTag(cache, \`audit-viz-first:${sid8}\`, ...)` with a tag matching what `decideAuditVizEmit` derives, and records `recordEmit` only after a successful query.

Now hunt item #4 — does any caller rely on the OLD tag-agnostic eviction as a side effect? The `prompt-context-inject.mjs` suppress-on-repeat path is interesting (it compares `out !== notice`). Let me verify that path and the bash-result/json-read/state-write local `pruneExpired` functions are truly on separate private caches (not the shared sidecar).

### Assistant | 2026-06-20T23:52:59.501Z

[tool_use: Bash]

### User | 2026-06-20T23:53:04.017Z

[tool_result] === bash-result-cache loadCache path (separate cache?) ===
49:const CACHE_FILE = `${CACHE_DIR}/bash-result-cache.json`;
50:const TELEMETRY_FILE = `${CACHE_DIR}/hook-telemetry.jsonl`;
87:async function loadCache() {
89:    const raw = await fs.readFile(CACHE_FILE, "utf8");
100:    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");

=== json-read-summarizer cache path ===
33:con
... [+769 chars truncated]

### Assistant | 2026-06-20T23:53:09.904Z

Confirmed: the 3 local `pruneExpired` functions operate on entirely separate private caches (`bash-result-cache.json`, `json-summarizer-seen.json`, `state-write-watch.json`) — each a single-owner cache where tag-agnostic pruning is correct and harmless. They never touch the shared `injection-dedup-cache.json`. Context note #5 holds.

Hunt item #4 final check: no caller relies on cross-tag eviction. The only consumers of `dedupedContext`/`dedupeOrMarker` check the return value against the input string (emit vs marker) — none read the shared cache to expect it to be globally trimmed. The `prompt-context-inject.mjs` path (`out !== notice`) only compares its OWN tag's emit-vs-marker decision. Cross-tag eviction was a pure bug; removing it changes no consumer's expected behavior.

Let me do a final confirmation that `pruneExpired` is byte-unchanged (back-compat) and confirm git diff scope shows only the expected files changed.

### Assistant | 2026-06-20T23:53:12.128Z

[tool_use: Bash]

### User | 2026-06-20T23:53:16.114Z

[tool_result]  scripts/lib/injection-dedup-emit.mjs | 11 +++++++----
 scripts/lib/injection-dedup-fs.mjs   |  7 +++++--
 2 files changed, 12 insertions(+), 6 deletions(-)
=== does the diff touch pruneExpired body? ===

### Assistant | 2026-06-20T23:53:22.081Z

The git diff confirms only the two wrapper libs (`injection-dedup-emit.mjs`, `injection-dedup-fs.mjs`) changed against HEAD — `injection-dedup.mjs` (which holds `pruneExpired` and `pruneTag`) is unchanged at HEAD, meaning `pruneTag` and the byte-unchanged `pruneExpired` were committed in the prior pass. The wrapper edits are surgical (+12/-6). This matches the migration scope exactly.

Let me do one last edge-case trace on the `dedupedContext` emit wrapper: the `Number.isFinite(opts.now)` guard. I want to confirm a caller passing `now: 0` (epoch) isn't mishandled — `Number.isFinite(0) === true`, so `now=0` would be honored, which is correct deterministic behavior. And confirm the `opts.now` guard mirrors the `ttlMs` guard precedent. Let me verify both guards behave identically and confirm `prompt-context-inject` (the only emit caller passing a non-default ttlMs of 30min) works.

### Assistant | 2026-06-20T23:53:30.177Z

[tool_use: Bash]

### User | 2026-06-20T23:53:34.429Z

[tool_result] EDGE PASS: now:0 honored, NaN->Date.now, 30min-TTL caller deduped

### Assistant | 2026-06-20T23:53:54.162Z

All edge cases pass. The `Number.isFinite(opts.now)` guard correctly honors `now:0` (epoch, finite) for determinism, falls back to `Date.now()` on `NaN`/`undefined`, and the 30-min TTL caller (`prompt-context-inject`) dedups correctly.

My investigation is complete. Here is my verdict.

---

VERDICT: PASS

summary: The completed `pruneTag` migration is silently-break-free. All shared-sidecar evictors — the 2 wrapper libs (`injection-dedup-emit.mjs`, `injection-dedup-fs.mjs`) plus the 10 direct hooks — now call tag-scoped `pruneTag` exclusively; zero `pruneExpired` remains on the shared cache. I empirically proved the new regression test is genuine (it fails 2/2 cross-tag cases when `pruneTag` is reverted to tag-agnostic behavior), proved foreign tags survive a full read→prune→record→write cycle through the production wrapper, and confirmed the `Number.isFinite(opts.now)` guard cannot regress the production callers (none pass `now`/`fsImpl`).

findings: none

Consumers / edge-paths traced (auditable PASS):
- Both wrapper libs `H:/prism/scripts/lib/injection-dedup-emit.mjs:55` and `injection-dedup-fs.mjs:70` — `pruneTag(cache, tag, now, ttlMs)` only; `pruneExpired` fully removed (grep-verified across `scripts/` + `.claude/hooks/`).
- All 10 direct shared-sidecar evictor hooks (`audit-viz-first-inject.mjs:230`, `slot-soul-inject.mjs:88`, `slot-domain-awareness-inject.mjs:207`, `psn-leg-state-inject.mjs:598`, `galaxy-claudemd-inject.mjs:112`, `psn-prompt-checklist-inject.mjs:144`, `pre-{bash,grep,read,write}-graph-inject.mjs`) — all on `pruneTag`, tags matching their `recordEmit`/`shouldEmit` tags.
- R9 proof: reverted `pruneTag`→`pruneExpired` in an isolated copy → cross-tag tests went `not ok 1`/`not ok 2` (2 fail) while the 2 control tests still passed. The test is load-bearing.
- Production callers traced for `now`/`fsImpl`: none pass either — all use `Date.now()` + `node:fs` defaults; `Number.isFinite(undefined/NaN)===false`→`Date.now()` path is identical to pre-fi
... [+1415 chars truncated]
