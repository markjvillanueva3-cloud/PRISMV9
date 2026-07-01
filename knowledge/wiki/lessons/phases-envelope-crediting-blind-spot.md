---
title: Phases-envelope crediting blind spot
type: lesson
created: 2026-05-22
tags: [close-out, milestone-progress, drift, bug-fix]
related: [close-out-audit, silent-close-out-drift]
---

# Phases-envelope crediting blind spot

## Symptom
Milestones whose envelope is `phases[].units[]`-shaped showed `shipped=0` in
`MILESTONE_PROGRESS.json` even after a close-out flipped every unit to
`status:"complete"` with `commits[]` SHAs. The drift was invisible — the
envelope said complete, the progress file said pending.

## Root cause
`scripts/build-milestone-progress.mjs` `loadMilestones()` flattens three
envelope shapes. The **flat** (`ms.units[]`) and **object-map** (`ms.units{}`)
branches read each unit's own `status`/`commits`. The **phases branch** read
`envelopeStatus`/`envelopeCommits` *only* from the top-level `ms.units{}`
object-keyed overlay — which is `{}` for any envelope that has `phases` but no
top-level `ms.units{}` map (the common shape). A close-out that writes
`status`/`commits` directly onto `phases[].units[]` was therefore silently
discarded; the envelope-commit and envelope-status fallbacks in
`computeProgress` could never fire for phases-shaped envelopes.

## Fix (2026-05-22, slot:mike)
Phases branch now reads the unit's own `u.status`/`u.commits` first, overlay as
fallback — consistent with the other two branches. Added:
- `asStr()` string-coercion on all 4 `envelopeStatus` assignment sites (a
  malformed numeric/object status can no longer leak into the `=== "complete"`
  check).
- per-milestone `envelopeAssertedCount` + `totals.envelopeAsserted` — exposes
  how many credited units have NO git proof (`source === "envelope-status"`),
  so `/pick-unit` and audit chats can tell git-proven from envelope-claimed.

Impact: **+444 units credited fleetwide** (2107→2552 shipped); 1044 of 2552 now
flagged envelope-asserted. 2-of-2 per-file scrutiny PASS.

## Takeaway
When a config-loader has parallel branches for variant shapes, every branch
must read the same fields. A branch that delegates field-reads to a sibling
structure (here, the object-map overlay) silently drops data when that sibling
is absent. Cross-check branch parity whenever envelopes/configs have >1 shape.
