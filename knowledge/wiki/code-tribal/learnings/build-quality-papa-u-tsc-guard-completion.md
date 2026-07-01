# BUILD-QUALITY-PAPA/U-TSC-GUARD-COMPLETION — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BUILD-QUALITY-PAPA]/U-TSC-GUARD-COMPLETION (slot:papa): tsc-regression-gate completion guard -- kill the OOM false-green

**Commit:** `845f7f8e194a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T21:18:06-05:00
**Tags:** build-quality-papa, u-tsc-guard-completion, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BUILD-QUALITY-PAPA]/U-TSC-GUARD-COMPLETION (slot:papa): tsc-regression-gate completion guard -- kill the OOM false-green

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BUILD-QUALITY-PAPA]/U-TSC-GUARD-COMPLETION (slot:papa): tsc-regression-gate completion guard -- kill the OOM false-green

Root cause (LIVE, not theoretical): the T0 PreToolUse commit gate countTscErrors()
ran `npx tsc --noEmit` at the default ~4GB V8 heap and, on an OOM/timeout kill with
partial output, COUNTED the truncated stream -> false-LOW error count. Found on disk:
TSC_BASELINE_CACHE.json error_count=0 across 9814 files (real=648) -> 0<baseline(1601)
read as "improvement" -> the regression gate was silently passing EVERY commit.

Fix:
- New pure classifyTscRun({status,signal,timedOut,stdout,error}) in
  autonomous-foolproof-logic.mjs: a run is COMPLETE only on a clean exit code
  (0, or 1/2 with >=1 parsed error line); any kill signal / ETIMEDOUT / ENOBUFS /
  V8 OOM marker / exit-1-2-with-zero-error-lines / other exit => INCOMPLETE.
- countTscErrors retrofit: spawnSync (exposes .signal) + 8GB heap
  (PRISM_TSC_GUARD_HEAP_MB, +NODE_OPTIONS on the npx fallback) + returns the
  EXISTING safe null sentinel on !completed (decideTscRegressionGate maps null to
  "tsc-unavailable": no cache write, no baseline init, no block). NEVER counts a
  truncated stream again. Complete-run line-grep is byte-identical -> baseline
  semantics preserved.

Verified live: `tsc --noEmit` with errors exits 1 (DiagnosticsPresent_OutputsSkipped),
NOT 2, and this repo prints NO "Found N errors" footer -- so completion is keyed on
the clean exit code, dogfooded twice (16GB+8GB heap, both 648 errors, ~12s, complete).

Repaired local untracked gate state to the verified count: baseline 1601 (stale
2026-04-28) -> 648; cache 0 (poison) -> 648.

35/35 vitest (new classifyTscRun cases incl. OOM/timeout/ENOBUFS/fatal-marker +
end-to-end no-poison). Per-file 2-reviewer scrutiny PASS/PASS, 0 P0/P1; 2 P3
hardening folded in (V8-exclusive OOM markers + npx-fallback heap).
```

## Files touched (4)
- .claude/hooks/lib/autonomous-foolproof-logic.mjs           |  87 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/tsc-baseline-regression-gate.mjs             |  51 ++++++++++++++++++++++++++++++-------------
- mcp-server/src/__tests__/tscBaselineRegressionGate.test.ts | 144 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 267 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 845f7f8e194a`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._