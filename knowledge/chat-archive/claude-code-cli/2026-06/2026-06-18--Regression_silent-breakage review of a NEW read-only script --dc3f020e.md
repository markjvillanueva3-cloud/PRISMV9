---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Regression/silent-breakage review of a NEW read-only script H:/prism/scripts/vau"
date: "2026-06-18"
first_ts: "2026-06-18T02:28:47.807Z"
last_ts: "2026-06-18T02:31:40.130Z"
cwd: "H:\\prism-slot-sierra"
messages: 37
user_msgs: 13
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-ac65b33a48c2354dc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Regression/silent-breakage review of a NEW read-only script H:/prism/scripts/vau

> **claude-code-cli** | 2026-06-18 | 37 msgs (13 user / 24 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-ac65b33a48c2354dc.jsonl`

## Transcript

### User | 2026-06-18T02:28:47.807Z

Regression/silent-breakage review of a NEW read-only script H:/prism/scripts/vault-health.mjs (read end-to-end) + tests H:/prism/scripts/vault-health.test.mjs.

WHAT IT IS: a unified vault-health dashboard that AGGREGATES 4 existing advisory detector reports (state/shared/{vault-rot-report,memory-supersession-report,memory-contradictions,vault-ambiguous-links-report}.json) into one rollup. Pure core `aggregateHealth(reportsByKey, {nowMs, staleDays})` returns {overall, counts, rows}. READ-ONLY apart from writing its own rollup state/shared/vault-health.json. It does NOT run the detectors. Live-validated: correctly surfaced overall=WARN (supersession 20, contradiction 1, vault-rot STALE 11.9d, ambiguous 169 info).

VERIFY:
1. The headline extractors in SOURCES match each report's ACTUAL shape: rot.rottingCount, supersession.candidateCount (fallback .unmarked), contradiction.totals.contradictions (+pairsChecked/pairsTotal/coverage), ambiguous.ambiguousTotal. Confirm against the real report keys: vault-rot-report{staleDays,scanned,stale,orphaned,rotting,rottingCount}, memory-supersession-report{scanned,dated,stems,supersessionStems,alreadyMarked,unmarked,candidateCount}, memory-contradictions{totals:{pages,pairsConsidered,pairsTotal,contradictions,coverage},model}, vault-ambiguous-links-report{ambiguousTotal,captured,truncated}. Any field-name drift = silent 0/undefined.
2. Severity + overall logic: warn dominates; missing/stale -> STALE; ok/info -> OK. info must NOT degrade overall. Confirm the `overall` precedence is correct and a `?? 0` fallback never turns a real value into a false 0.
3. Freshness: ageDays from Date.parse(generatedAt); undated -> null -> not stale (cannot judge). Confirm a report with an UNPARSEABLE generatedAt (e.g. the dash-mangled "2026-...T20-30-...") yields null/age-? rather than a wrong age or NaN comparison.
4. Fail-soft: corrupt/missing report file -> treated as missing (loadReports try/catch + existsImpl); headline throw -> caught -> severi
... [+335 chars truncated]

### Assistant | 2026-06-18T02:28:49.926Z

I'll review the new script and its tests end-to-end, then verify against the actual report shapes.

### Assistant | 2026-06-18T02:28:50.847Z

[tool_use: Read]

### Assistant | 2026-06-18T02:28:50.863Z

[tool_use: Read]

### User | 2026-06-18T02:28:53.133Z

[tool_result] 1	// Tests for vault-health.mjs (SIERRA-VAULT-OPS/U-VAULT-HEALTH).
2	// node --test scripts/vault-health.test.mjs
3	//
4	// Pure aggregateHealth() unit tests: injected report objects + fixed nowMs, so the
5	// rollup (per-source headline, severity, freshness, overall) is deterministic.
6	
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	import { aggregateHealth, SOU
... [+5149 chars truncated]

### User | 2026-06-18T02:28:53.235Z

[tool_result] 1	#!/usr/bin/env node
2	// SIERRA-VAULT-OPS/U-VAULT-HEALTH (slot:sierra, 2026-06-17) -- unified vault-health dashboard.
3	//
4	// A 2nd-brain needs ONE health surface, not five scattered advisory reports. This
5	// AGGREGATES the four vault advisory detectors built across the SIERRA-VAULT-OPS
6	// arc into a single operator-facing rollup (per-detector headline + freshness +
7	// an overall status)
... [+8401 chars truncated]

### Assistant | 2026-06-18T02:28:57.141Z

Now let me verify the script's extractors against the ACTUAL report shapes on disk. The task gave me canonical key lists, but R12/the "never assume data file contents" doctrine means I must read the real reports.

### Assistant | 2026-06-18T02:28:59.525Z

[tool_use: Bash]

### User | 2026-06-18T02:29:04.594Z

[tool_result] ===== vault-rot-report.json =====
TOP KEYS: ["staleDays","includeWiki","generatedAt","scanned","stale","orphaned","rotting","rottingCount","elapsedMs"]
generatedAt: "2026-06-06T05:05:23.979Z"
===== memory-supersession-report.json =====
TOP KEYS: ["generatedAt","memoryRoot","scanned","dated","readErrors","stems","supersessionStems","alreadyMarked","unmarked","candidates","candidateCount","elapsedMs
... [+690 chars truncated]

### Assistant | 2026-06-18T02:29:07.064Z

All four source reports exist on disk and I can confirm the real shapes. Let me verify each extractor against the actual keys, and run the test suite plus a live CLI exercise.

### Assistant | 2026-06-18T02:29:11.094Z

[tool_use: Bash]

### User | 2026-06-18T02:29:11.914Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 53172 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 37s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-m
... [+520 chars truncated]

### Assistant | 2026-06-18T02:29:14.003Z

That's an unrelated MCP advisory (I'm not using MCP tools). Let me re-run the field verification.

### Assistant | 2026-06-18T02:29:17.494Z

[tool_use: Bash]

### User | 2026-06-18T02:29:21.697Z

[tool_result] ROT: rottingCount= 0 scanned= 11751 orphaned= 10583
SUP: candidateCount= 20 unmarked= 20 alreadyMarked= 128 supersessionStems= 45
CON: contradictions= 1 pairsChecked= 8 pairsTotal= 1105 coverage= 0.007 model= gpt-oss:20b
AMB: ambiguousTotal= 169 captured= 169 truncated= false

### Assistant | 2026-06-18T02:29:26.848Z

Every headline field reads a real, non-undefined value from the actual reports. Now let me run the test suite and a live CLI exercise (with `--no-write` to stay read-only and confirm no mutation), plus probe the edge cases the task flagged.

### Assistant | 2026-06-18T02:29:29.881Z

[tool_use: Bash]

### User | 2026-06-18T02:29:34.475Z

[tool_result] === TESTS ===
  ...
# Subtest: undated report -> ageDays null, not stale (cannot judge freshness without generatedAt)
ok 10 - undated report -> ageDays null, not stale (cannot judge freshness without generatedAt)
  ---
  duration_ms: 0.2405
  ...
# Subtest: empty input -> all 4 missing -> overall STALE, no crash
ok 11 - empty input -> all 4 missing -> overall STALE, no crash
  ---
  duration_ms: 0
... [+471 chars truncated]

### Assistant | 2026-06-18T02:29:38.715Z

11/11 pass. Live run: overall=WARN (supersession 20 + contradiction 1 = 2 warns, ambiguous 169 info, rot STALE 11.9d). This matches the task's described live validation. Note the live rot report is now 11.9d old (regenerated since the task description's snapshot), correctly flagged STALE.

Now let me probe the specific edge cases the task asked me to verify: the unparseable `generatedAt` (dash-mangled timestamp), the `?? 0` fallback false-zero risk, and corrupt-file fail-soft.

### Assistant | 2026-06-18T02:29:50.994Z

[tool_use: Bash]

### User | 2026-06-18T02:29:54.906Z

[tool_result] EDGE1 dash-mangled generatedAt -> ageDays= null stale= false
EDGE2 Date.parse(mangled)= NaN isFinite= false
EDGE3 candidateCount=0 present, unmarked=99 -> value= 0 (should be 0: candidateCount wins via ??)
EDGE4 candidateCount=null,unmarked=7 -> value= 7
EDGE5 headline throw -> severity= warn detail= unreadable report shape value= null
EDGE5 overall with thrown headline = WARN (warn severity shoul
... [+122 chars truncated]

### Assistant | 2026-06-18T02:30:01.711Z

All edge cases behave correctly except one notable detail in EDGE6. Let me analyze:

- **EDGE1/2**: dash-mangled `generatedAt` → `Date.parse` returns NaN → `Number.isFinite` false → `ageDays=null`, `stale=false`. Correct — never NaN-compares, never a wrong age.
- **EDGE3**: `candidateCount: 0` present, `unmarked: 99` → value=0. The `??` correctly prefers the present-but-zero `candidateCount` over `unmarked` (nullish coalescing, not `||`). No false fallback.
- **EDGE4**: `candidateCount: null` → falls to `unmarked: 7`. Correct.
- **EDGE5**: headline throw → caught → severity `warn`, value `null`, drives overall WARN. Fail-loud, no uncaught path.
- **EDGE6**: A JS array `[1,2]` passes the `!r || typeof r !== "object"` guard (arrays are objects) → treated as `present`. Let me check whether that creates a silent-failure path through `headline`.

### Assistant | 2026-06-18T02:30:06.831Z

[tool_use: Bash]

### User | 2026-06-18T02:30:11.028Z

[tool_result] array-as-report supersession row: {"key":"supersession","title":"supersession (stale-as-current)","state":"present","value":0,"severity":"ok","detail":"0 marked, 0 stems","ageDays":null,"stale":false,"regen":"node scripts/vault-supersession-detector.mjs --write"}

### Assistant | 2026-06-18T02:30:15.475Z

That confirms the array path is benign (value=0, severity=ok, no crash). It's a purely theoretical concern — none of the four detectors write a top-level array, and a corrupt file is dropped by `loadReports`'s try/catch before reaching `aggregateHealth`. Not a finding.

Now let me verify the two items the task flagged as UNTESTED: `loadReports` file IO and the write-is-the-only-mutation claim. Let me confirm the write path targets only `vault-health.json` and check the `--stale-days` arg parsing path (which is untested and uses `parseInt` without clamp).

### Assistant | 2026-06-18T02:30:21.401Z

[tool_use: Bash]

### User | 2026-06-18T02:30:27.607Z

[tool_result] === confirm OUT_PATH only target; check git status before/after a write run ===
 M state/shared/.hook-latency-digest-snapshot.json
 M state/shared/.wiki-tribal-coverage-by-domain.json
 M state/shared/.wiki-tribal-cross-ref-audit.json
 M state/shared/AGENT_CHAT.jsonl
 M state/shared/AWARENESS-SNAPSHOT.md
--- run WITH write (default) ---
git status after write run (should show ONLY vault-health.json
... [+976 chars truncated]

### Assistant | 2026-06-18T02:30:31.567Z

The `vault-health.json` write doesn't even show as modified in git (the rollup is byte-stable or matches what's there — actually it's untracked/already present). The grep showed only unrelated pre-existing vault-named files. Let me confirm precisely whether `vault-health.json` is tracked and that the run only touched that one file.

### Assistant | 2026-06-18T02:30:35.337Z

[tool_use: Bash]

### User | 2026-06-18T02:30:38.892Z

[tool_result] === is vault-health.json tracked? ===
exit=0
=== explicit status of the rollup file ===
?? state/shared/vault-health.json
=== --stale-days abc analysis: parseInt('abc',10)=NaN -> Number.isFinite(NaN)=false -> falls to env clampInt ===
parseInt(abc)= NaN isFinite= false
=== trailing --stale-days: argv[++i]=undefined -> parseInt(undefined)=NaN -> isFinite false -> env clamp default 7 ===
parseInt(un
... [+111 chars truncated]

### Assistant | 2026-06-18T02:30:45.802Z

`vault-health.json` is untracked (`??`) — its own rollup output, correctly the only mutation. The arg-parse fallback is robust: non-numeric and trailing `--stale-days` both yield `NaN` → `Number.isFinite(args.staleDays)` false → falls to the env-clamped default 7. The `--stale-days abc` case is gracefully handled (no crash, sensible default), so the untested arg path is actually safe by construction.

Now let me check one more silent-coupling concern: the `existsImpl`/`loadReports` interaction with the dash-mangled filename concern, and confirm there's no other writer of `vault-health.json` that this could race with (concurrency lens). Let me also verify the `--stale-days` value flows correctly when it IS numeric (the `args.staleDays` from `parseArgs` is `null` default, but `main` re-parses — checking for a double-parse drift).

### Assistant | 2026-06-18T02:30:50.967Z

[tool_use: Bash]

### User | 2026-06-18T02:30:58.109Z

[tool_result] === other writers of vault-health.json? (concurrency / lost-update check) ===
scripts/vault-health.mjs:33:const OUT_PATH = resolve(STATE_DIR, "vault-health.json");
=== numeric --stale-days path ===
--stale-days 30 -> rot(11.9d) stale= false (should be false, 11.9<30) overall= WARN
=== double-parse check: parseArgs does parseInt, main checks Number.isFinite(args.staleDays) ===
Number.isFinite(null)
... [+33 chars truncated]

### Assistant | 2026-06-18T02:31:04.638Z

All confirmed:
- **Sole writer**: `vault-health.mjs` is the only place that writes `vault-health.json` — no competing writer, no lost-update race. (It's a single-shot CLI, not a long-running daemon; no concurrent-self-invocation concern beyond the inherent last-writer-wins of a full-file rewrite, which is acceptable for an advisory rollup.)
- **`--stale-days 30`**: numeric path works, rot at 11.9d correctly not stale under 30-day threshold.
- **Double-parse**: `parseArgs` default `null` → `Number.isFinite(null)` false → env-clamp path; an explicit numeric flag → `Number.isFinite(30)` true → used directly. No drift.

Let me clean up the temp review file I noticed was created (`_review_vault_check.mjs` appeared in git status — but that's not mine; I created no files). Let me verify I left nothing behind and do a final check on the write being atomic vs torn-write risk.

### Assistant | 2026-06-18T02:31:12.877Z

[tool_use: Bash]

### User | 2026-06-18T02:31:16.969Z

[tool_result] === did the task author or a prior reviewer leave _review_vault_check.mjs? (not mine) ===
-rw-r--r-- 1 wompu 197611 1859 Jun  9 09:34 state/shared/_review_vault_check.mjs
(pre-existing, not created by this review)
=== write is a plain writeFileSync (non-atomic) — assess torn-write risk for the rollup ===
26:import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
143:    if (!
... [+432 chars truncated]

### Assistant | 2026-06-18T02:31:40.130Z

`_review_vault_check.mjs` (Jun 9) is pre-existing, not from this session. No review artifacts of mine landed in the repo (my probes used inline `node -e` and `/tmp`). The write is a plain `writeFileSync` — non-atomic, but this is a single-writer advisory rollup with no concurrent reader-during-write contract, so a torn write is at worst a one-shot transient that the next run overwrites. Not a defect for this surface.

I have completed my full read-end-to-end review of both files, verified all four extractors against the live on-disk reports, run the 11/11 test suite, exercised the live CLI in both write and read-only modes, and probed every edge case the task named plus several it did not (array-shaped report, double-parse drift, competing writers, non-numeric/trailing args).

---

VERDICT: PASS

summary: `aggregateHealth` is a clean pure core whose four headline extractors each match the ACTUAL on-disk report shapes (verified live: rot.rottingCount, supersession.candidateCount→unmarked, contradiction.totals.contradictions, ambiguous.ambiguousTotal all read real values, not 0/undefined). Severity precedence (warn > stale/missing > ok, info never degrades overall), freshness (NaN/undated → null → not-stale, never a wrong age), and fail-soft (missing/corrupt → missing, headline-throw → warn "unreadable") are all correct and load-bearing. The sole mutation is the `vault-health.json` rollup it owns exclusively — no competing writer, no detector report touched.

findings:
- none

Consumers / edge-paths traced (audit trail for the PASS):
- **Field-name drift (P0 lens)** — read all 4 reports on disk at `H:/prism/state/shared/{vault-rot-report,memory-supersession-report,memory-contradictions,vault-ambiguous-links-report}.json`; every key the headlines read (`vault-health.mjs:44,52,60-62,69`) resolves to a real value (rottingCount=0, candidateCount=20/unmarked=20, totals.contradictions=1/pairsChecked=8/pairsTotal=1105/coverage=0.007/model, ambiguousTotal=169). No silent 0/un
... [+1828 chars truncated]
