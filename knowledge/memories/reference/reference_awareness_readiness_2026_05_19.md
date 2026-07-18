---
name: reference-awareness-readiness-2026-05-19
description: "AWARENESS-READINESS — PRISM Awareness now surfaces what's READY TO USE (built ∩ wired), not just built"
aliases: reference_awareness_readiness_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.475Z
---


AWARENESS-READINESS (2026-05-19, slot delta, commit after `33f1229ead`). User directive: "upgrade prism-awareness relative to whats built and currently wired and ready to use".

**Problem:** `scripts/awareness-snapshot.mjs` → `AWARENESS-SNAPSHOT.md` (auto-injected every SessionStart by `awareness-snapshot-inject.mjs`) reported "engines built" but never what is actually INVOKABLE. A built engine with no dispatcher reference is on disk but DARK. Also the snapshot was stale (only regenerated if >24h old, so it lagged BUILD_STATE refreshes).

**Fix (3 files + regenerated snapshot):**
- `awareness-snapshot.mjs` — new exported pure `computeReadiness(buildState)`: sums wired/unwired/total from `BUILD_STATE.COVERAGE_BY_DOMAIN.rows`, returns `{readyToUse, builtButUnwired, totalBuilt, coveragePct, topUnwiredDomains[]}` (cap 8, excludes fully-wired, fail-soft → null when COVERAGE absent). New `## Ready to use (built AND wired — invokable now)` section. `__isMain` guard (fail-open) so it's testable without running the ~370MB-graph `buildSnapshot()`.
- `awareness-snapshot-inject.mjs` — `compact()` surfaces the Ready-to-use block in the SessionStart digest; `isStale()` also regenerates when BUILD_STATE.json is newer than the snapshot; **regen is now DETACHED + debounced (5min stamp)** — the old `spawnSync(timeout 8s)` SIGTERM-killed the ~13s cold regen on SessionStart (P1 caught by reviewer).
- `awareness-snapshot.test.mjs` — NEW, 18 cases.

**Live result:** 2621 engines wired & ready to use · 667 built-but-unwired · 80% dispatcher coverage; per-domain unwired backlog (Other 126, Lathe 67, Machine 13, …).

**Known data-model nuance (R12):** `BUILD_STATE.headline.built_engines` (2617, narrow scan) ≠ sum of `COVERAGE_BY_DOMAIN.rows.total` (3288, all engine files by domain) — two different denominators, each correct in its frame; the snapshot now carries a one-line note explaining it rather than hiding the gap. 2-reviewer scrutiny PASS (P1 fixed, P3 note added). Wiki: [[awareness-readiness]]. Related: [[reference_awareness_stack]] · [[reference_slot_reclaim_2026_05_19]].
