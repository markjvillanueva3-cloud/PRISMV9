---
name: reference_papa_tsc_completion_guard_2026_06_11
description: tsc-baseline-regression-gate OOM false-green fix — classifyTscRun completion guard; live cache was poisoned to 0
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.723Z
aliases: reference_papa_tsc_completion_guard_2026_06_11
---


**BUILD-QUALITY-PAPA/U-TSC-GUARD-COMPLETION** (slot:papa, 2026-06-11, commit `845f7f8e19`, cad-fusion-live-ms0).

**Live regression found (not theoretical).** The wired T0 PreToolUse commit gate
`.claude/hooks/tsc-baseline-regression-gate.mjs` `countTscErrors()` ran `npx tsc --noEmit`
at the DEFAULT ~4GB V8 heap and, on an OOM/timeout kill with partial output, **counted the
truncated stream** → false-LOW count. Found on disk: `state/shared/TSC_BASELINE_CACHE.json`
`error_count:0` across 9814 files (real = **648**) → `0 < baseline(1601)` read as
"improvement" → **the tsc regression gate was silently passing EVERY commit** (a T0 safety
gate dead in production). Same false-green class as the regen-viz-merge-guard fix.

**Fix.** New pure `classifyTscRun({status,signal,timedOut,stdout,error})` in
`.claude/hooks/lib/autonomous-foolproof-logic.mjs` (next to `decideTscRegressionGate`). A run
is COMPLETE only on a clean exit code (0, or 1/2 with ≥1 parsed `): error TS` line); any kill
**signal** / ETIMEDOUT / ENOBUFS / V8-OOM marker (`JavaScript heap out of memory` /
`Reached heap limit Allocation failed` / `<--- Last few GCs --->`) / exit-1-2-with-zero-error-lines
/ other exit → INCOMPLETE. `countTscErrors` retrofit: `spawnSync` (exposes `.signal`, unlike
`execSync`) + 8GB heap (`PRISM_TSC_GUARD_HEAP_MB`, default 8192; `NODE_OPTIONS` on the npx
fallback) → returns the EXISTING safe `null` sentinel on `!completed` (decideTscRegressionGate
maps null → "tsc-unavailable": no cache write, no baseline init, no block). Complete-run
line-grep is **byte-identical** → baseline continuity preserved.

**Key live fact (dogfooded twice, 16GB+8GB heap, both 648, ~12s):** `tsc --noEmit` WITH type
errors exits **1** (DiagnosticsPresent_OutputsSkipped), NOT 2, and this repo prints **NO
"Found N errors" footer** — so completion must key on the clean exit code, never a footer. My
first cut used a footer contract and the live VALIDATE caught it (would have misclassified
every real run as incomplete). R15 VALIDATE-with-live-data earned its keep.

**State repaired (local untracked gate state, NOT git-tracked):** baseline 1601 (stale
2026-04-28) → 648; cache 0 (poison) → 648. These 2 JSONs live on disk untracked; the hook
owns them. Repair is local + effective; committing them would add fleet churn, so left
untracked.

**Tests:** `mcp-server/src/__tests__/tscBaselineRegressionGate.test.ts` `classifyTscRun`
describe block, 35/35 vitest (OOM/timeout/ENOBUFS/fatal-marker/exit-3/zero-line +
end-to-end no-poison both directions). Per-file 2-reviewer scrutiny PASS/PASS (0 P0/P1, 2 P3
folded in).

**Verify:** `node -e "import('file:///H:/prism/.claude/hooks/lib/autonomous-foolproof-logic.mjs').then(m=>console.log(m.classifyTscRun({status:1,signal:null,stdout:'x.ts(1,1): error TS1: a\n'})))"`
→ `{completed:true, reason:'errors-found', errorCount:1}`;
`cd mcp-server && npx vitest run src/__tests__/tscBaselineRegressionGate.test.ts` → 35/35.

Provenance: this was the genuine net-new build from [[reference_papa_uwire_feedback_2026_06_11]]'s
`PAPA-SCRIPT-AUDIT-ROI-2026-06-11.md` §6 (the #1 net-new papa combo), deferred to fresh context
per R6 then built post-compact. Sibling of regen-viz-merge-guard (same OOM-truncation
false-green class). See [[feedback_papa_no_gates_full_pathways]] for papa's authority to edit
the harness-exec hook.
