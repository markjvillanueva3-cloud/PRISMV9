---
type: "chat-session"
source: "claude-code-cli"
session_id: "16769ed0-dcdd-41c8-9cc5-58b633f8a1d5"
title: "Independent regression/silent-breakage review of a token-economy bugfix (slot:al"
date: "2026-06-20"
first_ts: "2026-06-20T16:15:39.769Z"
last_ts: "2026-06-20T16:19:06.417Z"
cwd: "H:\\prism"
messages: 57
user_msgs: 20
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-a91ffd9a05d53f2b9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Independent regression/silent-breakage review of a token-economy bugfix (slot:al

> **claude-code-cli** | 2026-06-20 | 57 msgs (20 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-a91ffd9a05d53f2b9.jsonl`

## Transcript

### User | 2026-06-20T16:15:39.769Z

Independent regression/silent-breakage review of a token-economy bugfix (slot:alpha, branch cad-fusion-live-ms0). Do NOT assume another reviewer caught everything. Weighted toward silent breakage, regression risk, integration coupling, and error-budget completeness. Read each file END TO END. Grade PASS or FAIL with P0/P1/P2 + file:line. Read-only.

## Context
The shared sidecar `state/shared/dashboards/injection-dedup-cache.json` is read+pruned+written-back by 10 hooks with TTLs 5min..24h. Old `pruneExpired(cache, now, ttl)` is tag-agnostic → a short-TTL hook's write-back evicts live longer-TTL sibling entries (dedup miss). Fix adds pure `pruneTag(cache, hookTag, now, ttl)` (prune only one tag) and migrates all 10 evictors to it. `pruneExpired` retained for back-compat.

## Files (under H:/prism)
- `scripts/lib/injection-dedup.mjs` (new pruneTag + pruneExpired docstring)
- `scripts/lib/injection-dedup-prune.test.mjs` (new tests)
- 10 hooks: audit-viz-first / galaxy-claudemd / psn-leg-state / psn-prompt-checklist / slot-domain-awareness / slot-soul / pre-{bash,read,grep,write}-graph -inject.mjs (each swaps pruneExpired→pruneTag at one call site; the 6 named-import ones also swap the import symbol)

## Specifically hunt for
1. **recordEmit interaction**: after pruneTag, each hook later calls `shouldEmit` then `recordEmit(cache, hookTag, ...)` and writes the cache to disk. Confirm pruneTag's shallow-copy output still lets recordEmit add the entry correctly and the WHOLE object (incl foreign tags) is what gets serialized — i.e. the fix actually PRESERVES foreign tags through the full read→prune→record→write cycle, not just at the prune step. If a hook prunes with pruneTag but then writes back a DIFFERENT/narrower object, the fix is defeated — flag it.
2. **Wrong-tag / out-of-scope hookTag**: any hook passing a hookTag that differs from the tag it uses in shouldEmit/recordEmit (would prune a bucket it doesn't own, or fail to prune its own). Especially audit-viz-first (i
... [+1106 chars truncated]

### Assistant | 2026-06-20T16:15:43.518Z

I'll investigate this token-economy bugfix systematically. Let me start by reading the core library and tests, then trace through all 10 hooks.

### Assistant | 2026-06-20T16:15:44.002Z

[tool_use: Read]

### Assistant | 2026-06-20T16:15:44.341Z

[tool_use: Read]

### User | 2026-06-20T16:15:44.683Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\injection-dedup.mjs' was already read 16s ago in this session and is unchanged (mtime 1781971505204). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-20T16:15:45.097Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\injection-dedup-prune.test.mjs' was already read 16s ago in this session and is unchanged (mtime 1781971590588). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-20T16:15:47.652Z

The read-once-guard says these were already read but I don't have them in context. Let me bypass the cache.

### Assistant | 2026-06-20T16:15:48.120Z

[tool_use: Bash]

### Assistant | 2026-06-20T16:15:49.097Z

[tool_use: Bash]

### User | 2026-06-20T16:15:51.900Z

[tool_result] // scripts/lib/injection-dedup.mjs
// ---------------------------------
// TOKEN-SAVINGS-EXPAND/U-PSN-INJECTION-DEDUP-LIB (2026-05-23, slot:alpha)
//
// Generic per-session injection deduper. UserPromptSubmit hooks fire ~14-16
// context blocks per prompt; many are byte-identical to prior emissions in
// the same session (wiki precheck, master-index, memory vault, slot soul).
// A single goal-prer
... [+5916 chars truncated]

### User | 2026-06-20T16:15:53.030Z

[tool_result] // injection-dedup-prune.test.mjs
// -------------------------------
// Tests pruneTag(cache, hookTag, now, ttlMs) -- the SHARED-CACHE-SAFE prune that
// fixes the tag-agnostic pruneExpired fleet bug: the shared
// state/shared/dashboards/injection-dedup-cache.json is written back by ~10
// evictor hooks with TTLs 5min..24h, and the old pruneExpired (called with the
// CURRENT hook's TTL) silently
... [+6469 chars truncated]

### Assistant | 2026-06-20T16:15:55.721Z

The library and tests are solid. Now let me read all 10 hooks end-to-end to verify the call sites. Let me find them first.

### Assistant | 2026-06-20T16:15:58.066Z

[tool_use: Bash]

### User | 2026-06-20T16:16:03.448Z

[tool_result]  .claude/hooks/audit-viz-first-inject.mjs           |      7 +-
 .claude/hooks/galaxy-claudemd-inject.mjs           |      4 +-
 .claude/hooks/loop-iteration-inject.mjs            |     10 +-
 .claude/hooks/pre-bash-graph-inject.mjs            |      2 +-
 .claude/hooks/pre-grep-graph-inject.mjs            |      2 +-
 .claude/hooks/pre-read-graph-inject.mjs            |      2 +-
 .claude/hooks/p
... [+6612 chars truncated]

### Assistant | 2026-06-20T16:16:07.386Z

I notice `loop-iteration-inject.mjs` also has a diff (10 lines) and isn't in the list of 10 files the context mentioned. Let me check the actual git diff for all the inject hooks to see precisely what changed. Let me look at the diff for each relevant hook.

### Assistant | 2026-06-20T16:16:09.857Z

[tool_use: Bash]

### User | 2026-06-20T16:16:14.364Z

[tool_result] diff --git a/.claude/hooks/audit-viz-first-inject.mjs b/.claude/hooks/audit-viz-first-inject.mjs
index 8244c19425..bb1c66e12b 100644
--- a/.claude/hooks/audit-viz-first-inject.mjs
+++ b/.claude/hooks/audit-viz-first-inject.mjs
@@ -27,7 +27,7 @@ import { execFileSync } from "node:child_process";
 import path from "node:path";
 import fs from "node:fs";
 import { pathToFileURL } from "node:url";
-im
... [+12698 chars truncated]

### Assistant | 2026-06-20T16:16:23.117Z

The diff confirms the swaps. Note that `loop-iteration-inject.mjs` is an unrelated comment-only change (no pruneTag involvement) - I'll set it aside. Now I need to verify the critical concerns. Let me check:

1. That each hook's `hookTag` variable matches the tag used in `shouldEmit`/`recordEmit`
2. That foreign tags are preserved through the full write cycle (what object gets serialized)
3. That dropped `pruneExpired` imports aren't referenced elsewhere
4. The audit-viz inlined literal matches `decideAuditVizEmit`'s tag

Let me trace each hook fully. Start with audit-viz-first (the trickiest - inlined literal vs derived tag) and the write-back cycle.

### Assistant | 2026-06-20T16:16:23.569Z

[tool_use: Read]

### User | 2026-06-20T16:16:24.504Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\audit-viz-first-inject.mjs' was already read 47s ago in this session and is unchanged (mtime 1781971776715). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-20T16:16:27.078Z

The read-once guard keeps blocking but the content isn't actually in my context. Let me disable the cache.

### Assistant | 2026-06-20T16:16:27.937Z

[tool_use: Bash]

### User | 2026-06-20T16:16:31.247Z

[tool_result]     "Knobs: `PRISM_AUDIT_VIZ_FIRST_DISABLE=1` | `PRISM_AUDIT_VIZ_FIRST_K=N` | `PRISM_AUDIT_VIZ_FIRST_TIMEOUT_MS=N` | `PRISM_AUDIT_VIZ_FIRST_STRICT_FILTER=0`.",
  ].join("\n");
}

// Pure dedup decision (TOKEN-SAVINGS-EXPAND/U-PSN-INJECTION-DEDUP-LIB). Unlike
// slot-domain-awareness (which hashes its CHEAP static block), this hook fires on most
// prompts -- audit verbs ("audit"/"ghost"/"unwired")
... [+3904 chars truncated]

### Assistant | 2026-06-20T16:16:36.846Z

The audit-viz-first hook is correct. The inlined literal `audit-viz-first:${sid8}` for pruneTag exactly matches `decideAuditVizEmit`'s derived `hookTag = audit-viz-first:${sid8}`. The write-back cycle is sound: `pruneTag` returns a full cache object (with foreign tags preserved via `{...cache}`), `recordEmit` spreads that whole object (`{...base, [hookTag]: tagBucket}`), and the entire `newCache` is serialized. Foreign tags survive end-to-end.

One subtlety: `recordEmit` operates on `cache` (the pruned object), not `newCache` from decideAuditVizEmit — but `cache` IS the pruned full object, so foreign tags are preserved. Good.

Now let me verify the `hookTag` derivation in the other hooks matches between pruneTag, shouldEmit, and recordEmit. Let me check where `hookTag` is defined in each, and confirm dropped imports aren't referenced.

### Assistant | 2026-06-20T16:16:39.788Z

[tool_use: Bash]

### User | 2026-06-20T16:16:43.746Z

[tool_result] === galaxy-claudemd-inject ===
108:  const hookTag = `galaxy-claudemd-inject:${sid.slice(0, 8)}`;
115:    : shouldEmit(cache, hookTag, contentHash, now, DEDUP_TTL_MS);
123:      const newCache = recordEmit(cache, hookTag, contentHash, now);
=== psn-leg-state-inject ===
593:    const hookTag = `psn-leg-state:${sid8}`;
599:    const decision = shouldEmit(cache, hookTag, contentHash, dnow, DEDUP_TTL_
... [+823 chars truncated]

### Assistant | 2026-06-20T16:16:49.278Z

All 5 named-import hooks use a single `hookTag` variable consistently across pruneTag (the swapped call), `shouldEmit`, and `recordEmit`. No `pruneExpired` references remain in any of them (grep found zero), so the dropped import is safe — no ReferenceError. The `hookTag` is defined BEFORE the pruneTag call in each (pruneTag is at lines 112/598/144/207/88 per the diff, all after the hookTag definitions shown).

Let me verify the ordering — that `hookTag` is in scope at the pruneTag call site in each — and confirm the write-back serializes the right object. Let me check the full dedup block for these 5 hooks.

### Assistant | 2026-06-20T16:16:51.155Z

[tool_use: Bash]

### User | 2026-06-20T16:16:54.462Z

[tool_result] === galaxy-claudemd (105-130) ===
  // Injection-dedup (U-PSN-INJECTION-DEDUP-LIB) -- emit the full doctrine on first-emit or
  // after TTL/content-change; otherwise the 1-line marker. Shared sidecar, distinct hookTag.
  const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
  const hookTag = `galaxy-claudemd-inject:${sid.slice(0, 8)}`;
  const contentHash = hashBlock(fullBlock)
... [+2528 chars truncated]

### Assistant | 2026-06-20T16:17:03.192Z

Both galaxy-claudemd and slot-soul are correct: `hookTag` defined before pruneTag, pruneTag returns the full cache (foreign tags preserved), `recordEmit(cache, ...)` builds `newCache` from the pruned full object, and the whole `newCache` is serialized. The full read→prune→record→write cycle preserves foreign tags. 

Now the comment on galaxy-claudemd says "30min TTL". Let me verify the actual `DEDUP_TTL_MS` values match the comments (a wrong-TTL comment is cosmetic, but I want to confirm the actual TTL isn't a problem). More importantly, let me check the 4 graph hooks — they use `lib.pruneTag` namespace and the hookTag includes `:${filePath}`. Let me trace those.

### Assistant | 2026-06-20T16:17:05.762Z

[tool_use: Bash]

### User | 2026-06-20T16:17:09.223Z

[tool_result] === pre-bash-graph-inject ===
169:  // Lazy-import both libs so an import failure (mid-refactor) never blocks Bash.
269:      const hookTag = `pre-bash-graph-inject:${sid}`;
273:      cache = lib.pruneTag(cache, hookTag, now, ttl); // shared-cache-safe: prune only this tag (24h TTL)
274:      const decision = lib.shouldEmit(cache, hookTag, contentHash, now, ttl);
280:          const newCache = lib
... [+1713 chars truncated]

### Assistant | 2026-06-20T16:17:13.469Z

All 4 graph hooks are consistent: the SAME `hookTag` variable (including the `:${filePath}` suffix for read/write) is used across `lib.pruneTag`, `lib.shouldEmit`, and `lib.recordEmit`. The write-back serializes `newCache` from `recordEmit(cache, ...)`, where `cache` is the pruned full object. Foreign tags preserved.

Now let me confirm `lib` is the namespace import and that `lib.pruneTag` actually resolves (the lib exports `pruneTag` — confirmed in the source). Let me check the import mechanism and verify there's no leftover `lib.pruneExpired` reference anywhere.

### Assistant | 2026-06-20T16:17:18.034Z

[tool_use: Bash]

### User | 2026-06-20T16:17:21.429Z

[tool_result] === import sites ===
174:    ({ deriveGraphKeys } = await import("../../scripts/lib/graph-key-derive.mjs"));
175:    ({ runMasterIndexSearch, searchViaDaemon } = await import("../../scripts/lib/master-index-search-lib.mjs"));
215:    ({ resolveCodePath } = await import("../../scripts/lib/code-path-resolver.mjs"));
216:    ({ creditNavOnEmit } = await import("../../scripts/lib/nav-savings-ledger.mj
... [+381 chars truncated]

### Assistant | 2026-06-20T16:17:25.622Z

Confirmed:
- The 4 graph hooks use `const lib = await import("../../scripts/lib/injection-dedup.mjs")` — a namespace import. `lib.pruneTag` resolves because `pruneTag` is an exported function. Good.
- The only remaining `pruneExpired` reference in the 10 hooks is a comment in audit-viz-first ("pruneTag (NOT pruneExpired)") — not a code reference. No ReferenceError risk anywhere.

Now let me run the test suite to confirm pruneTag behaves and verify back-compat of pruneExpired. Let me also confirm the 3 locally-defined `pruneExpired` functions in other files are indeed separate (different sidecars).

### Assistant | 2026-06-20T16:17:26.547Z

[tool_use: Bash]

### User | 2026-06-20T16:17:29.876Z

[tool_result] === run pruneTag tests ===
    # Subtest: a prototype-named tag that is NOT an own key is treated as absent (no proto pollution / no crash)
    ok 2 - a prototype-named tag that is NOT an own key is treated as absent (no proto pollution / no crash)
      ---
      duration_ms: 0.0487
      ...
    # Subtest: ttlMs=0 prunes nothing for the tag is NOT assumed -- 0 means 'age >= 0' so all entries dro
... [+364 chars truncated]

### Assistant | 2026-06-20T16:17:33.251Z

All 12 pruneTag tests pass. Now let me verify the back-compat of `pruneExpired` (still has existing callers using it intentionally) and confirm the 3 locally-defined pruneExpired functions are on different sidecars/unaffected. Let me also check that the existing `injection-dedup` test suite (the original lib tests) still passes — `pruneExpired` behavior must be byte-unchanged.

### Assistant | 2026-06-20T16:17:35.883Z

[tool_use: Bash]

### User | 2026-06-20T16:17:39.905Z

[tool_result] === remaining pruneExpired importers (back-compat consumers) ===
.claude/hooks/audit-viz-first-inject.mjs
.claude/hooks/bash-result-cache.mjs
.claude/hooks/json-read-summarizer.mjs
.claude/hooks/state-write-watch.mjs
scripts/lib/injection-dedup-emit.mjs
scripts/lib/injection-dedup-fs.mjs
=== locally-defined pruneExpired (separate funcs) ===
.claude/hooks/bash-result-cache.mjs
.claude/hooks/json-re
... [+242 chars truncated]

### Assistant | 2026-06-20T16:17:44.059Z

Important finding to verify: `scripts/lib/injection-dedup-emit.mjs` and `scripts/lib/injection-dedup-fs.mjs` reference `pruneExpired` from the SAME lib and operate on the SAME shared sidecar potentially. These are NOT in the 10-file migration set. If any hook uses `injection-dedup-fs.mjs` to write back to the shared cache using the old tag-agnostic `pruneExpired`, the fix would be partially defeated. Let me investigate these two helper libs.

### Assistant | 2026-06-20T16:17:46.161Z

[tool_use: Bash]

### User | 2026-06-20T16:17:49.513Z

[tool_result] === injection-dedup-fs.mjs pruneExpired usage ===
5:// 22-line sidecar dance (currently duplicated across 8 adopters). The pure lib stays FS-free + unit-
6:// testable; this wrapper owns the sidecar I/O exactly as the canonical adopter (slot-domain-awareness-
7:// inject) does -- same sidecar path, same 5-min TTL, same fail-soft contract.
19://     - PRISM_INJECTION_DEDUP_DISABLE=1 -> always retur
... [+2437 chars truncated]

### Assistant | 2026-06-20T16:17:55.038Z

This is the critical silent-breakage finding. Both `injection-dedup-fs.mjs` (line 67) and `injection-dedup-emit.mjs` (line 52) operate on the **exact same shared sidecar** (`state/shared/dashboards/injection-dedup-cache.json`) and still call the **tag-agnostic `pruneExpired`**. They are wrapper libs that consolidate the same "sidecar dance," and any hook routing through them will re-introduce the exact bug the fix targets — evicting foreign tags (including the 24h graph siblings) on every write-back.

The fix migrated the 10 hooks that inline the dance, but left these two shared wrapper helpers un-migrated. The question that determines severity: are these wrappers actually CONSUMED by live hooks? If yes, the bug is still live fleet-wide through a different code path. Let me check consumers.

### Assistant | 2026-06-20T16:17:58.802Z

[tool_use: Bash]

### User | 2026-06-20T16:18:02.610Z

[tool_result] === consumers of injection-dedup-fs.mjs ===
.claude/hooks/ai-synergy-awareness-inject.mjs
.claude/hooks/local-compute-intent.mjs
.claude/hooks/model-tier-advisor.mjs
.claude/hooks/model-tier-advisor.mjs.bak-effort-wire
.claude/hooks/obsidian-vault-precheck-inject.mjs
.claude/hooks/task-start-substrate-inject.mjs
--- (test files) ---
scripts/lib/injection-dedup-fs.test.mjs

=== consumers of injecti
... [+454 chars truncated]

### Assistant | 2026-06-20T16:18:13.096Z

This confirms the finding. There are **15 additional live UserPromptSubmit hooks** that write back to the **same shared sidecar** through these two wrapper libs, and both wrappers still use the tag-agnostic `pruneExpired`:

- 6 hooks via `injection-dedup-fs.mjs` (ai-synergy, local-compute-intent, model-tier-advisor, obsidian-vault-precheck, task-start-substrate, + the .bak)
- 9 hooks via `injection-dedup-emit.mjs` → `dedupedContext` (charlie x2, delta, echo, foxtrot, prompt-context, slot-context-bundle, whiskey, xray)

Each of these, on every emit, reads the shared cache, calls `pruneExpired(cache, now, ttlMs)` with ITS OWN short TTL (the fs wrapper defaults to 5-min), then writes the whole pruned object back. That write-back **evicts every foreign tag whose entry is older than this hook's TTL** — including the 24h `pre-*-graph-inject` siblings that the fix was specifically protecting. 

So the fix is **partially defeated**: the 10 inlined hooks no longer evict siblings, but these 15 wrapper-routed hooks still do. Since they all share one sidecar, a single `dedupedContext` call from (say) `foxtrot-mill-awareness` with a 5-min TTL will still wipe the 24h graph entries on its next write. The dedup-miss the fix targets still happens fleet-wide.

Let me confirm the TTLs these wrappers use to quantify the blast radius, and verify they genuinely write back (not read-only).

### Assistant | 2026-06-20T16:18:14.928Z

[tool_use: Bash]

### User | 2026-06-20T16:18:18.138Z

[tool_result] === fs wrapper TTL + write confirm (full dance) ===
  block = stripLoneSurrogates(block);
  if (env.PRISM_INJECTION_DEDUP_DISABLE === "1") return block;
  const sid8 = String(sessionId || "").slice(0, 8);
  if (!sid8 || !hookName) return block;            // no key -> emit (pre-dedup behavior)

  const contentHash = hashBlock(block);
  if (!contentHash) return block;
  const hookTag = `${hookName}
... [+1908 chars truncated]

### Assistant | 2026-06-20T16:18:22.725Z

Both wrappers confirmed: they read the shared sidecar, `pruneExpired` it with the caller's TTL, then write the whole pruned object back. The `injection-dedup-fs.mjs` defaults to `DEFAULT_TTL_MS` (60s) unless a TTL is passed; `injection-dedup-emit.mjs` defaults to `DEFAULT_DEDUP_TTL_MS`. Let me get that default value and confirm the DEFAULT_TTL_MS used by the fs wrapper consumers to fully quantify.

### Assistant | 2026-06-20T16:18:25.978Z

[tool_use: Bash]

### User | 2026-06-20T16:18:29.498Z

[tool_result] === emit wrapper DEFAULT_DEDUP_TTL_MS ===
28:export const DEFAULT_DEDUP_TTL_MS = 5 * 60_000; // 5 min — most per-prompt blocks are stable across a /loop iter
43:  const ttlMs = Number.isFinite(opts.ttlMs) ? opts.ttlMs : DEFAULT_DEDUP_TTL_MS;
=== sample emit consumer TTLs (foxtrot, charlie, slot-context-bundle) ===
.claude/hooks/foxtrot-mill-awareness-inject.mjs:36:import { dedupedContext } from ".
... [+1102 chars truncated]

### Assistant | 2026-06-20T16:18:35.982Z

This fully confirms the blast radius. `foxtrot-mill-awareness` calls `dedupedContext("foxtrot-mill-awareness", ..., sid)` with **no ttlMs → defaults to 5-min**. On every emit it runs `pruneExpired(cache, now, 300_000)` over the shared sidecar and writes the result back — evicting any tag's entry older than 5 minutes, including the 24h `pre-bash-graph-inject`/`pre-read-graph-inject` siblings. The exact bug the fix targets is still live through this path.

Now I have a complete picture. Let me do a final verification: confirm there's no concern in the migrated 10 about the `now` variable being captured before pruneTag vs after (timing), and verify the original lib tests still pass (pruneExpired byte-unchanged behavior). Let me run the fs/emit test suites to confirm those wrappers' tests pass (they will — they test the OLD behavior, which is the problem).

### Assistant | 2026-06-20T16:18:37.623Z

[tool_use: Bash]

### User | 2026-06-20T16:18:41.088Z

[tool_result] === fs wrapper test ===
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 9.4785
=== emit wrapper test ===
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 15.9518

### Assistant | 2026-06-20T16:19:06.417Z

The wrapper tests pass (they encode the old tag-agnostic behavior, so they're green while the shared-cache bug persists through them — a textbook "tests verify the wrong thing remains" situation). 

I have everything I need. Let me do one final check on the audit-viz subtle point flagged in the prompt — confirm `recordEmit` in audit-viz operates on the pruned `cache` (not a stale pre-prune one), since audit-viz has a slightly different structure (decision comes from `decideAuditVizEmit` which received `cache`).

In audit-viz: `cache` is pruned at line 230, then passed to `decideAuditVizEmit({ cache, ... })`, and `recordEmit(cache, d.hookTag, ...)` uses the same pruned `cache`. The pruned `cache` retains all foreign tags. Correct.

Let me verify the migrated 10 don't have a stale-`cache`-after-disabled-dedup edge: in audit-viz, when `dedupDisabled || !sid8`, `cache` stays `{}` and pruneTag isn't called, decideAuditVizEmit returns `bypass`, and recordEmit is skipped (`d.action === "emit"` false). No write happens — so no clobber on the bypass path. Good.

I have a complete, verified picture. Final assessment.

---

VERDICT: FAIL

summary: The 10-hook migration itself is correct and complete — every migrated hook uses a single consistent `hookTag` across `pruneTag`/`shouldEmit`/`recordEmit`, foreign tags survive the full read→prune→record→write cycle, the audit-viz inlined literal exactly matches `decideAuditVizEmit`'s derived tag, no dropped `pruneExpired` import is still referenced, `lib.pruneTag` resolves, and `pruneExpired` back-compat is byte-unchanged (12/12 new tests pass). BUT the fix is **partially defeated**: two shared wrapper libs (`injection-dedup-fs.mjs`, `injection-dedup-emit.mjs`) that write to the SAME shared sidecar still call the tag-agnostic `pruneExpired`, and 15 live UserPromptSubmit hooks route through them — so the foreign-tag eviction (the exact bug, including wiping the protected 24h graph siblings) is still live fleet-wide through a parallel 
... [+2769 chars truncated]
