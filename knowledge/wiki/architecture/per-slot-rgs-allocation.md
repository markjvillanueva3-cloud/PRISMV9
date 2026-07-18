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

## Injecting into live slot queues

The allocation spec is advisory; `scripts/topup-slot-queues.mjs` is the
companion that makes it *live*. The runtime per-slot task queue is
`state/shared/slot-task-queues.json`, read by `scripts/slot-queue.mjs` which
`/checkin-<slot> /loop` uses as its preferred pickup source.

`topup-slot-queues.mjs` is **non-destructive**: it never removes or reorders
existing queue entries. For each slot whose *eligible* count (measured via
`slot-queue.mjs --status`) is below `--min-depth` (default 6), it appends units
toward that depth — first from the slot's curated RGS allocation, then from a
`priority-queue.mjs` deep-tail fallback when the allocation is exhausted by
dedup. Properties:

- **Global dedup** — a unit already in ANY slot's queue is skipped (the
  cross-slot "no unit in two queues" invariant), keyed case-insensitively.
- **golf exempt from the fallback** — the priority-queue tail is feature units;
  golf only ever receives its curated RGS hygiene allocation.
- **Shipped / peer-claimed units skipped**; atomic write; `--dry-run`,
  `--no-fallback`, `--allocation <path>`, `--json`. Re-runnable as slots drain.
- **`depends_on: []` on every topped-up entry** — the RGS/priority-queue
  consolidated inventory carries no dependency data (0/3197 units); this is
  recorded honestly in the file's `lastTopup.note` provenance, not implied.

First run (2026-05-17): topped up 9 starved slots (charlie/delta/echo/golf/
india/juliett/kilo/lima/mike) with 33 units — every slot reached eligible ≥ 6.

```bash
node scripts/topup-slot-queues.mjs --dry-run   # preview
node scripts/topup-slot-queues.mjs             # apply
node scripts/slot-queue.mjs --status --json    # verify
```

## Domain-specialized allocation (2026-05-17)

A later work order — *"break up prism related tasks into the 12 chats, each chat
owns one PRISM system domain"* — superseded the priority round-robin with a
**domain partition**. `scripts/allocate-domains-to-slots.mjs` re-keys
`slot-task-queues.json` so each slot owns one domain:

```
alpha=mill  bravo=lathe  charlie=wire  delta=cad  echo=cam
foxtrot=machining-knowhow+tribal  hotel=erp/business+hr
india=post-processor+master-post  juliett=speed-feed  kilo=print-to-program
lima=prism-academy+learning  mike=misc  golf=database+maintenance(+hygiene)
```

It classifies every ROADMAP-CONSOLIDATED unit (pending_units + unconsolidated_prose)
into a domain by an ordered first-match keyword ruleset (cam BEFORE mill —
"HYPERMILL" contains "MILL"), and merges `FEATURE-GAP-UNITS-2026-05-17.json` —
64 audit-discovered features that lead each slot's queue (`wave: "GAP"`).
First run: **3235 units across 13 domain-keyed slots**. Re-runnable, advisory,
atomic write, preserves all non-`queues` top-level keys.

This was driven by a `/forge-audit-v2` run (6-agent scan of specs, handoffs,
unwired engines, the v8.89 `extracted/` monolith, `Resources/`, `JM DIE/`) —
see [[feature-gap-audit-2026-05-17]] for the gap inventory: 674 unwired engines
(~595 absent from any roadmap), the monolith's digest=0 features, and the
Resources/JM-DIE corpora.

## See also

- [[juliett-12chat-allocation-ms0]] — the parent milestone
- [[priority-queue]] — the delegated picker
- [[roadmap-consolidation]] — the RGS master remaining-work inventory
- [[feature-gap-audit-2026-05-17]] — the forge-audit-v2 gap inventory
