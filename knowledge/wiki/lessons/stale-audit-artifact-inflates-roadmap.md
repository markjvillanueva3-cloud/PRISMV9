---
title: A stale audit artifact silently inflates every roadmap derived from it
type: lesson
slot: sierra
date: 2026-06-28
tags: [system-viz, discovery, unwired-engine-audit, stale-artifact, roadmap, false-positive, dont-wire-for-wiring-sake]
---

# A stale audit artifact silently inflates every roadmap derived from it

## The trap
The "unwired engine" count looked like a large open backlog (837 in `unwired-engine-audit.json`, 118 in `DEA-MS0.json`'s "wire unwired engine" units). Re-running the audit fresh (2026-06-28) showed the **true current count is 4 unwired** (of 3850 engines) — and on verification even those 4 are 2 audit false-positives + 2 cross-domain owner items, so the **sierra-solo wiring gap is ~0**.

The inflation never lived in the audit *code* — the consumer-detection fixes (engine->engine 2026-06-10, array-dispatch 2026-06-11, middleware 2026-06-21) all work. It lived in **un-regenerated artifacts**:
- `mcp-server/data/state/unwired-engine-audit.json` — a `generated_at:2026-04-18` FOSSIL (837), orphaned (the current script writes the dated `state/shared/UNWIRED-ENGINE-AUDIT-<date>.json` instead).
- `UNWIRED-ENGINE-AUDIT-2026-05-07.json` — the source for **DEA-MS0's 118 units** + `roadmap-index.json` + `MS-CRITWIRE` + `MS-WIRE-BACKEND`. With reality at ~0, ~114 of those 118 units are phantom — a chat picking them up wires already-wired engines (`feedback_dont_wire_for_wiring_sake`).

## The lesson (generalizable)
**A work-list derived from a generated audit is only as fresh as the audit snapshot it was frozen from.** Before treating an audit-derived backlog (unwired engines, orphans, gaps, coverage) as real open work:
1. **Regenerate the audit first** and compare the live count to the artifact's. A 2-month gap between the artifact and "now" means the backlog is fiction.
2. **Reconcile the derived roadmap** (milestone JSONs, ghost roosts, pick-unit queues) against the fresh audit — don't act on units frozen from a stale snapshot.
3. **Prefer dated, single-writer artifacts** (`NAME-<date>.json`) + a staleness sentinel (`stale-state-warn.mjs` reads `UNWIRED-ENGINE-AUDIT-*.json`) so the next reader sees the age, not just the number.
4. **Verify each "unwired" before wiring** — an `export interface` is TYPE-ONLY (not a runnable engine), and an engine consumed only via `import type {...}` from routes/middleware is already wired to a non-dispatcher layer. Blind-wiring these creates orphan dispatcher actions.

This is the audit-surface form of the broader rule: never trust an artifact's title/count/age without reading the live state behind it.

## See also
- memory `reference_sierra_unwired_audit_reconciled_2026_06_28`
- `reference_audit_wired_via_engine_2026_06_10`, `reference_stop_unwired_array_dispatch_fix_2026_06_11` (the consumer-detection fixes that already work)
- doctrine `feedback_dont_wire_for_wiring_sake_2026_05_16`
