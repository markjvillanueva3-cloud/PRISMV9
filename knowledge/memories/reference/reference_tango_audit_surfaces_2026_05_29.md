---
name: reference-tango-audit-surfaces-2026-05-29
description: the 4 standing pipeline-coverage audit scripts tango runs and what each detects
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.966Z
aliases: reference_tango_audit_surfaces_2026_05_29
---


Tango's standing coverage-audit surfaces (slot:tango, 2026-05-29). Run each, diff against the last run, surface deltas — don't just report absolutes.

- `scripts/audit-unwired-engines.mjs` — engines on disk with NO dispatcher reference (built-but-unwired). Feeds romeo's wiring queue.
- `scripts/audit-roadmap-drift.mjs` — milestone-envelope `status` vs git-log reality (envelope says not_started but units shipped, or vice-versa).
- `scripts/audit-close-out-candidates.mjs` — deliverables exist on disk but unit still `pending` (silent close-out debt). Advisory + mustHumanVerify; NEVER auto-flips.
- `/orphan-inventory` (+ `prism_dev:impact_find_orphans`) — built+documented+unwired, grouped by suggested dispatcher + layer → ORPHAN-INVENTORY.md.

Meta-tooling: `scripts/dev-tool-conflict-detector.mjs` finds multiple writers of one state file / duplicate audit tools (the discovery domain's own self-check). Refresh `scripts/build-state-snapshot.mjs` before any coverage CLAIM. Related: [[feedback-tango-dedup-audit-tooling]].
