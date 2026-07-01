---
name: reference-silent-close-out-drift-2026-05-17
description: Silent close-out debt detector (envelope-complete + MILESTONE_PROGRESS-zero) — 51 ms / 329 hidden units; lib + audit wiring shipped by alpha /loop
aliases: reference_silent_close_out_drift_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.204Z
---


# Silent Close-Out Drift Detector (2026-05-17, alpha /loop)

**The blind spot:** milestone envelope `status:complete` + all `units[].status:complete`, but
`MILESTONE_PROGRESS.json` shows `shipped:0` — because `build-milestone-progress.mjs` credits
shipped only from git subjects matching `[SCOPE]/U-ID`, and pre-2026-05-12 ship commits used
other subjects. First measured: **51 milestones / 329 hidden-shipped units (~25-30% completion blind spot)**.

**Existing audits don't catch it:** `audit-close-out-candidates` checked envelope-pending+files-exist;
`audit-roadmap-drift` checks bucket-tier shift (these resolve complete on both sides). The drift is a
*different join*: envelope `units[].status` vs `MILESTONE_PROGRESS.shipped`.

**Shipped:**
- `scripts/lib/silent-close-out-drift.mjs` — pure: `findSilentCloseOutDrift`, `buildShippedByMsId`,
  `renderMarkdown`, `flattenEnvelopeUnits` (mirrors audit-close-out-candidates: flat `env.units[]`
  first, nested `env.phases[].units` fallback, fail-soft on non-array).
- Wired into `scripts/audit-close-out-candidates.mjs` as additive `silent_close_out_debt` key +
  `## Silent Close-Out Debt` MD section, schemaVersion 1.0.0→1.1.0, non-fatal-wrapped.
- 16 node:test cases (two fail-on-revert guards: non-array phases iter-3, flat-units iter-6).

**Key lessons (R12 / R7):**
1. Hermetic fixtures all used array `phases`; production envelopes had `phases` as object/string/null
   → live `(env.phases||[]).flatMap` TypeError in iter-3. Always add a non-array fail-on-revert test.
2. Two readers of the same data must read it the same way (R7): the lib originally read only nested
   `phases[].units` while the audit script's `flattenEnvelopeUnits` also read flat `env.units[]`.
   Legacy flat envelopes are exactly the pre-2026-05-12 class most prone to this debt — silently
   skipped. Fixed by mirroring `flattenEnvelopeUnits` into the lib (iter-6 scrutiny P2.1).

**Safety:** ADVISORY ONLY, never auto-flips MILESTONE_PROGRESS. Operator reconciles via
`scripts/close-out-milestone.mjs --milestone <ID>`. See [[feedback_roadmap_close_out]],
[[feedback_always_close_out]].

Spec: `state/shared/specs/SILENT-CLOSE-OUT-DEBT-AUDIT-2026-05-17.md`. Wiki:
`knowledge/wiki/architecture/silent-close-out-drift.md`. Surfaced from
`state/shared/specs/ALPHA-SLOT-CARRYOVER-BACKLOG-2026-05-17.md` (alpha-slot carryover drain).
