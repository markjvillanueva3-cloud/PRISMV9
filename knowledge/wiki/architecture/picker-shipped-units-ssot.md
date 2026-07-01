---
title: Picker shipped-units + slot-domain single sources of truth
type: architecture
status: current
created: 2026-05-17
by: claude-cdc4a2c4 (slot echo)
---

# Picker shipped-units + slot-domain SSOT

Two shared libs that the PRISM unit pickers (`scripts/slot-queue.mjs`,
`.claude/helpers/priority-queue.mjs`) MUST route through. Created 2026-05-17
after a P0 picker bug surfaced shipped units to autonomous /loop iterations.

## `scripts/lib/shipped-units-source-of-truth.mjs`

Canonical "which unit-ids should pickers SKIP". Unions two signals:

- **(a) git-inferred** — `MILESTONE_PROGRESS.json` `milestones[].units[].shipped===true` (the producer `build-milestone-progress.mjs` infers ship from commit-subject `[MS]/U-ID` match).
- **(b) envelope-status** — every `mcp-server/data/milestones/*.json`, recursive scan for `{id, status ∈ {complete,completed,shipped,superseded,done}}`, gated to `/^U-/i` (unit-ids only — never milestone-ids/findings).

**The bug it fixed:** `slot-queue.mjs` read `MILESTONE_PROGRESS.m.shipped` as an array, but that field is a **NUMBER** (the count). `Array.isArray()` was always false → shipped set empty fleet-wide → every unit looked unshipped. Separately `priority-queue.mjs` read per-unit `shipped` correctly but missed 675 envelope-complete-but-git-untagged units (commits bundled in setup commits / non-canonical tags). The union closes both.

API: `buildShippedIdsUnion()` (no arg → disk union, mtime-cached, ~11ms warm vs 111ms cold). `buildShippedIds(progress)` legacy in-memory mode for hermetic tests (honors the arg, R12 — never silently ignores it). `_resetShippedUnionCache()` / `_peekShippedUnionCache()` are `@internal` test-only.

Cache: in-process, keyed `(progressMtime, maxMtime(envelopesDir))`. Helps within-process repeated calls; does NOT help Stop-hook cross-process spawns (each spawns fresh node) — a disk-cache is a logged P2 follow-up.

## `scripts/lib/domain-classifier.mjs`

Single source of truth for slot↔domain (alpha=mill, bravo=lathe, charlie=wire,
delta=cad, echo=cam, foxtrot=tribal, golf=database, hotel=erp, india=post,
juliett=speedfeed, kilo=print2prog, lima=academy, mike=misc). Extracted from
the inline `DOMAIN_RULES` that previously lived only in
`scripts/allocate-domains-to-slots.mjs` (which now imports the lib —
behavior-identical, verified 3238→13 domains unchanged).

**Rule order is load-bearing:** wire before lathe (WEDM is wire-EDM), cam
before mill (HYPERMILL/MASTERCAM/SOLIDCAM all contain "MILL"). Frozen exports.

API: `classifyUnit(unit)` / `classifyText(s)` → `{domain, slot}`;
`slotDomain(slot)` → domain|null; `filterUnitsBySlot(units, slot)` (R12: unknown
slot or empty input → returns input unchanged, never silent-drops).

`priority-queue.mjs pickNextUnit({slot})` filters to the slot's domain;
R12 fallback flags `_crossDomain:true` + stderr/CLI marker when a slot's lane
has no eligible work (a chat always gets a task, never silent off-lane).

## Source (c): bridge-commit recovery

`U-BRIDGE-*` units live in `ROADMAP-CONSOLIDATED.bridge_units` — they have NO
milestone envelope, so sources (a)+(b) structurally cannot mark them shipped.
The picker re-served `U-BRIDGE-SFC-ESPRIT` infinitely after it shipped
(commit `76dc1b53cb`). `readShippedFromBridgeCommits()` recovers completion
from `git log --format=%s` (bounded 800 commits, sha-cached): any subject
containing a `U-BRIDGE-*` token marks that bridge shipped. Production-path
only (hermetic custom-path calls skip it — mirrors the mtime-cache boundary).

## Compound bridge close-out convention (RECOVERY-LOAD-BEARING)

When one commit closes multiple sibling bridges, the subject MUST use the
`+`-compound form so `expandBridgeToken` can recover both ids:

- ✅ `[CAM-EXHAUST-MS0]/U-BRIDGE-SFC-ESPRIT+SOLIDCAM: …`
  → recovers `U-BRIDGE-SFC-ESPRIT` AND `U-BRIDGE-SFC-SOLIDCAM`
  (the `+SUFFIX` reuses the lead's prefix-up-to-last-`-`-segment).
- ❌ `…U-BRIDGE-SFC-ESPRIT, U-BRIDGE-SFC-SOLIDCAM` (comma) — only the first
  token is reliably recovered; the second may be missed.
- ❌ Closing two bridges in two separate commits is fine (each recovered
  independently) — the `+` form is ONLY needed for one-commit-many-bridges.

A `git revert` whose subject echoes a `U-BRIDGE-*` token will FALSE-POSITIVE
mark that bridge shipped (keeps it out of pickup). Accepted tradeoff — re-open
via the envelope/roadmap, never by widening `BRIDGE_ID_RE`.

## Doctrine

- **Never re-read `MILESTONE_PROGRESS.m.shipped` directly** — it's a count. Import `buildShippedIdsUnion`.
- **Never hardcode `echo→cam`** anywhere — import `domain-classifier`.
- **Compound bridge close-outs MUST use the `U-BRIDGE-PREFIX-A+B` subject form** (see above) — comma-separated is unrecoverable.
- A "pure-core + injected-readers" picker MUST ship one real-data fail-on-revert test (a placebo `size>0` test passes a `picker→[]` regression).

## Consumed by

`scripts/slot-queue.mjs` (loadShippedSet), `.claude/helpers/priority-queue.mjs`
(buildShippedIds + slot filter), `scripts/allocate-domains-to-slots.mjs`
(classify). A peer extended `slot-queue.mjs` with `entryCompleted()` for
generator/enroller entries whose own id is in no envelope (complementary —
the union only sees ids that ARE units in an envelope).

Memory: [[reference_picker_shipped_union_slot_domain_2026_05_17]]
