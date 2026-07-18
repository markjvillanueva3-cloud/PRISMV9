---
title: Silent Close-Out Drift Detection
type: architecture
status: shipped
owner: alpha
created: 2026-05-17
unit: U-CLOSE-OUT-AUDIT-V2-DRIFT-DETECTOR
---

# Silent Close-Out Drift Detection

## Problem

A milestone envelope can carry `status: complete` with every `units[].status: complete`,
while `state/shared/MILESTONE_PROGRESS.json` reports `shipped: 0`. `build-milestone-progress.mjs`
derives `shipped` from git commit subjects matching `[SCOPE]/U-ID`; pre-2026-05-12 ship commits
used different subjects, so that work vanishes from MILESTONE_PROGRESS even though it is on disk.

Net: a fleet-wide ~25-30% blind spot on completed work. First measured 2026-05-17 (alpha /loop):
**51 milestones / 329 hidden-shipped units**.

## Why existing audits miss it

- `audit-close-out-candidates.mjs` (pre-this-unit) flagged only **envelope-pending + files-exist**.
- `audit-roadmap-drift.mjs` flags only `current_status ≠ proposed_status` (bucket-tier shift) —
  these 51 all resolve complete on both sides, so no tier drift.
- The drift lives in a different join: envelope `units[].status` vs `MILESTONE_PROGRESS.shipped`.

## Design

`scripts/lib/silent-close-out-drift.mjs` — PURE helper, readers injected.

- `findSilentCloseOutDrift({envelopes, shippedByMsId, options})` → `{cases, summary}`.
  Skips non-complete envelopes and zero-completed-unit envelopes; `drift = completedUnits − progressShipped`;
  `minDrift` default 1; sorts cases by drift desc; `confidence` = `envelope-fully-complete` vs
  `envelope-partially-complete`.
- `flattenEnvelopeUnits(env)` — mirrors the canonical helper in
  `audit-close-out-candidates.mjs`: prefers legacy flat `env.units[]` (the pre-2026-05-12 class
  most prone to this debt), falls back to nested `env.phases[].units`. Fail-soft: phases/units as
  object/string/null/missing coerce to `[]` (never throws — caught a live `TypeError` in /loop iter-3
  where production envelopes had `phases` as a non-array).
- `buildShippedByMsId(json)` — tolerant of `{milestones:[]}`, direct-array, and missing `shipped`.
- `renderMarkdown(cases, topN)` — table rows + truncation footnote.

Wired into `scripts/audit-close-out-candidates.mjs`: additive `silent_close_out_debt` key in the
output JSON (separate concern from the existing `candidates` array), `## Silent Close-Out Debt`
markdown section, schemaVersion 1.0.0→1.1.0. The drift scan is wrapped non-fatal so a failure can
never take down the pre-existing candidate detection.

## Safety

**ADVISORY ONLY — never auto-flips MILESTONE_PROGRESS.** File presence ≠ spec correctness; some
envelopes (esp. the 8-member CAMX series, identical schema + drift pattern) may have been
bulk-flipped without verification. Operators reconcile via
`node scripts/close-out-milestone.mjs --milestone <ID>` per [[feedback_roadmap_close_out]].
`advisoryOnly:true` + `mustHumanVerify:true` preserved in output.

## Tests

`scripts/lib/silent-close-out-drift.test.mjs` — 16 node:test cases incl. the iter-3 non-array
`phases` fail-on-revert guard, the iter-6 flat-`env.units[]` fail-on-revert guard, and a real-world
fixture pinning the 2026-05-17 top-4 (CAMX-MS22 +20, CALC-HARDEN-MS0 +18, CAMX-MS19/PIPELINE-VAR-MS0 +15).

## Provenance

- Spec: `state/shared/specs/SILENT-CLOSE-OUT-DEBT-AUDIT-2026-05-17.md`
- Backlog that surfaced it: `state/shared/specs/ALPHA-SLOT-CARRYOVER-BACKLOG-2026-05-17.md`
- Per-file scrutiny: 2 reviewers PASS/PASS (iter-6); P2.1 (flat-units divergence) fixed in-session.
- Memory: [[reference_silent_close_out_drift_2026_05_17]]
