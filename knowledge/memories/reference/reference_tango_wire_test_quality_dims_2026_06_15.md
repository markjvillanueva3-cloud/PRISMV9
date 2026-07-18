---
name: reference_tango_wire_test_quality_dims_2026_06_15
description: tango Workflow discovery-sweep caught my OWN R15 violation — U-TEST-QUALITY-AUDIT's scanQuality had 0 production callers (dead); wired into the standing stub-sweep-full.mjs. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.221Z
aliases: reference_tango_wire_test_quality_dims_2026_06_15
---


**TANGO WIRE-TEST-QUALITY-DIMS (slot tango, 2026-06-15, commit U-WIRE-TEST-QUALITY-DIMS)** — autonomous cron iter, ULTRACODE Workflow escalation.

**THE WORKFLOW PAID OFF (the key lesson):** after several solo "lane harvested" lean-fires, I escalated to a `Workflow` multi-agent discovery-saturation sweep (5 angles on sonnet per R5: audit-drift / algo-wireability / orphan-files / adapter-retire / completeness-critic; adversarial verify-on-disk). It STALLED at 4/7 agents (the 409KB algo-wireability agent spiralled on ~120 file reads, host memory pressure -> 2 agents went stale 12min, no journal progress 10min -> TaskStop'd it). BUT the 4 completed agents surfaced a GENUINE finding my solo fires missed: **the completeness-critic + its verify agent found that `scanQuality`/`countSkips`/`countFocused`/`isAssertionFree` — the test-quality dims I BUILT this same session in U-TEST-QUALITY-AUDIT — had ZERO production callers.** They ran only via an on-demand `--quality` CLI flag, never in any standing pipeline = **dead code = an R15 violation I committed myself** (built+tested but not wired to a standing consumer).

**Verify-on-disk (current H:/prism tree, my discipline since agents ran in the ~1900-commit-stale worktree):** confirmed — `stub-sweep-full.mjs` (canonical full-codebase auditor) imported neither; `scanQuality` had 0 repo-wide consumers.

**FIX:** `stub-sweep-full.mjs` `run()` now calls `scanQuality(mcp-server/src)` + exposes additive `testQuality`/`testQualityCounts`; `renderReport` adds a Test-quality (R9/R12) section. ANTI-SPRAWL: extended the EXISTING canonical sweep + reused scanQuality wholesale (a sibling sweep agent flagged audit-script sprawl — 30+ audit-*.mjs); `realStubs`/`byPattern` UNCHANGED so the 24 existing tests + baseline-16 stayed green; +2 fixture tests, 26/26. Live: standing sweep now reports skipped=5 (lathe-orchestration=11).

**LESSONS:** (1) **A multi-agent completeness-critic catches what solo lean-fires miss** — even your OWN R15 gaps. Worth the Workflow escalation despite the stall. (2) **A long single-agent over a 120-file set spirals on a memory-pressured host** — for breadth-scan angles, cap the file count or split. (3) Always verify agent findings in the CURRENT tree (agents run in the stale slot worktree). **Secondary finding (audit-drift, surfaced to golf):** 3 hook-wiring audits measure the same "hooks-on-disk-not-in-settings" metric — `audit-hook-wiring.mjs` (canonical) supersedes `audit-stop-hooks.mjs` (Stop-only) + `audit-unwired-hooks-2026-05-27.mjs` (untracked, self-described deletable one-shot). Sister: [[reference_tango_test_quality_audit_2026_06_15]], [[reference_tango_forge_dedup_prefilter_2026_06_15]].
