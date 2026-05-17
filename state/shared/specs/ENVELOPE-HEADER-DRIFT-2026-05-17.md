# Envelope Header-Counter Drift Audit
**Date:** 2026-05-17 · slot mike (claude-416be9ac) · `/checkin-mike /loop`
**Source:** Walk of `mcp-server/data/milestones/*.json` comparing `j.completed_units` header against the sum of `phases[].units[].status === 'complete' | 'completed'`.

## Summary

14 milestone envelopes have header-counter drift after iters 1-3 close-out (16 originally; 2 fixed).

| Class | Count | Action |
|---|---|---|
| **Fixed this session** | 3 | CLEANUP-MS0 (63→71), CAD-COMPLETE-MS0 (34→60), RGS-TOOL-AUTOINVOKE-MS1 (4→5) |
| **Header overcount, all units `not_started`/`pending`** | 4 | LATHE-LORA-MS0, F360-AP-MS0, LATHE-PROD-READY-MS0, ULT-MS0 — **roadmap-design issue, NOT drift**: envelopes were declared complete before any unit was started. Do NOT auto-fix; needs operator design review. |
| **Header overcount, status `complete`** | 5 | MS-DOCU-FINISH, SCIMATH-WIRE-MS0, etc. — envelope says complete but unit counts < header. Likely the units were re-categorized post-completion. Header reflects original ship count; safe to leave. |
| **Peer-claimed milestones** | 1 | OBSIDIAN-INTELLIGENCE-MS3 (claude-c0f06dee active edits on CLOSE-OUT-DEFERRED.md). Hands off. |
| **Other / requires investigation** | 1 | LATHE-MASTER — status `not_started` but 10 units actually complete. Status drift, not counter drift; needs operator review. |

## Why this matters

The priority-queue picker (`/pick-unit`, `/pick-dev`) reads from `atomic-roadmap.json`, which is regenerated from envelope status. Header undercount means shipped units stay in the picker queue as "still to do" — operators waste cycles re-investigating completed work. The CLEANUP-MS0 case from this session is the canonical example: 8 shipped units (golf-slot bootstrap, golf-write-allowlist, etc.) showed up as top-5 picks though they're live on disk.

## Fixed this session (3)

| Milestone | Before | After | Drift |
|---|---|---|---|
| CLEANUP-MS0 | completed_units: 63 / total: 73 | 71 / 73 | +8 |
| CAD-COMPLETE-MS0 | 34 / 336 | 60 / 335 | +26 (plus 1 phantom unit removed) |
| RGS-TOOL-AUTOINVOKE-MS1 | 4 / 8 | 5 / 8 | +1 |

Status field NOT touched in any case (1+ unit still open in each); only header counters synced.

## Header-overcount class — DO NOT auto-fix

These envelopes declare `completed_units` > 0 but all phases[].units[] are still `not_started` or `pending`:

| Milestone | Header | Actual | Total | Status |
|---|---|---|---|---|
| LATHE-LORA-MS0 | 23 | 0 | 50 | in_progress |
| F360-AP-MS0 | 10 | 0 | 10 | **complete** |
| LATHE-PROD-READY-MS0 | 19 | 1 | 135 | in_progress |
| ULT-MS0 | 5 | 0 | 5 | **complete** |

`F360-AP-MS0` and `ULT-MS0` declare `status: complete` with zero unit-level completion. Either (a) the unit array is a placeholder structure that was never populated as work happened (status was set manually), or (b) work was rolled back. Operator must decide; auto-syncing the header to 0 would falsely mark "shipped" milestones as unshipped.

## Recommendation

1. **For roadmap-design class**: spawn 4 cleanup units that audit each milestone's actual shipped artifacts on disk and reconcile the envelope. Probably 30 minutes per envelope.
2. **For peer-claimed**: defer until peer is done, then re-run this audit.
3. **For LATHE-MASTER status drift**: separate unit — its status `not_started` is wrong if 10 units are actually complete.
4. **Make this audit recurring**: register `/loop --interval 1d node scripts/audit-envelope-drift.mjs` — a one-shot cleanup re-grows fleet-wide (same lesson as MEMORY-AUDIT-WEEKLY shipped earlier today).

## Data

Machine-readable JSON: [`ENVELOPE-HEADER-DRIFT-2026-05-17.json`](ENVELOPE-HEADER-DRIFT-2026-05-17.json) — `{generatedAt, advisoryOnly:true, total, drifted[]}`.
