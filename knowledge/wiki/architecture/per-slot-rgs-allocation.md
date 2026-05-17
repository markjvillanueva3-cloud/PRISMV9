---
title: Per-Slot RGS Allocation
type: architecture
status: shipped
milestone: JULIETT-12CHAT-ALLOCATION-MS0
slot: juliett
created: 2026-05-17
tags: [rgs, allocation, fleet, priority-queue, juliett]
---

# Per-Slot RGS Allocation

Deterministic generator that turns the RGS master remaining-work pool into a
**per-slot work queue** for PRISM's 13-chat fleet — the answer to the work
order *"begin rgs pipeline for each chat slot"*.

## What it is

`scripts/allocate-rgs-per-slot.mjs` partitions the priority-ordered pool of
pending roadmap units across the fleet so each `/checkin-<slot> /loop` chat
opens onto a concrete, deconflicted queue instead of re-deriving a pick.

- **Picking is delegated** to `.claude/helpers/priority-queue.mjs` (run once as
  a subprocess, `--pick --top N --json`). The allocator never re-implements
  unit selection — it only partitions (R8 / dedup discipline).
- **12 work slots** (alpha..foxtrot, hotel..mike) get a round-robin slice of
  the priority-ordered pool, `--per-slot` units each (default 6). Round-robin
  over a priority-sorted list means every slot's rank-1 unit is comparably
  high-priority and the queues descend together — no slot starts on scraps.
- **golf** is the hygiene/integrator slot. It gets ONLY hygiene-milestone units
  (regex `CLEANUP|FLEET-REAPER|FLEET-MEMORY|OBSOLESCENCE|REAP|HYGIENE`), removed
  from the work pool first so no unit is double-assigned. Golf also carries a
  fixed standing-duties list (reaper ownership, drift reconciliation, branch
  integration, MEMORY.md watch, zombie sweep).

## Output

`state/shared/specs/JULIETT-PER-SLOT-RGS-ALLOCATION-<date>.{json,md}` — written
atomically (tmp + rename). The `.md` is the human spec (per-slot tables + launch
lines + deconfliction proof + consumption instructions); the `.json` is the
machine sidecar (`schemaVersion`, `advisoryOnly`, `mustHumanVerify`, per-slot
unit arrays). Re-run any time — the spec is script-generated, never hand-drifts.

## Safety properties

- **Advisory only** — never claims a unit, never mutates a roadmap or envelope.
- **Deterministic** — same priority-queue output → byte-identical allocation.
- **Fail-loud on collision** — any duplicate unit_id across slots → `exit 1`.
- **Fail-loud on schema drift** — if priority-queue returns rows but none carry
  a usable `unit_id`, or the first row is missing `_category`/`title`/
  `milestone` → `exit 2` (a renamed field can't silently empty the allocation).
- **Empty-pool safe** — priority-queue exits 1 with a valid `[]` when the queue
  is empty; the allocator recovers that stdout payload and emits a valid empty
  spec rather than crashing.

## Caveat (mustHumanVerify)

priority-queue's claim filter is **best-effort only** — a topic-string token
match, not a `slot-task-claim` lookup. A unit actively claimed by a peer, or one
whose deliverable shipped but whose envelope was never flipped (silent close-out
debt), can still appear in the allocation. Operators verify with
`slot-task-claim.mjs check` + `/close-out-audit` before claiming. This is most
likely for the golf CLEANUP-MS0 queue, several units of which look complete.

## Usage

```bash
node scripts/allocate-rgs-per-slot.mjs              # write the dated spec
node scripts/allocate-rgs-per-slot.mjs --per-slot 8 # deeper queues
node scripts/allocate-rgs-per-slot.mjs --json       # sidecar to stdout, no write
```

Exit codes: `0` ok · `1` validation error (bad args / duplicate assignment) ·
`2` runtime error (priority-queue subprocess / schema drift).

## Relationship to the hand-curated allocation

`JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md` is the prior **hand-curated ROI
swarm** allocation (5 waves, manual ROI ranking). This allocator is the
**deterministic RGS-pipeline** allocation — complementary, not a replacement:
the ROI spec captures judgment calls, this one captures the mechanical
priority-ordered partition that re-runs without drift.

## See also

- [[juliett-12chat-allocation-ms0]] — the parent milestone
- [[priority-queue]] — the delegated picker
- [[roadmap-consolidation]] — the RGS master remaining-work inventory
