---
name: picker-shipped-union-slot-domain-2026-05-17
description: Echo /loop picker-fix arc — shipped-detection union + U-ID gate + mtime cache + slot-domain SSOT + Esprit/SolidCAM CAM bridges
aliases: reference_picker_shipped_union_slot_domain_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.727Z
---


# Picker-fix → bridge arc (2026-05-17, slot echo, /loop cdc4a2c4)

Four committed iterations off `/checkin-echo /loop build in priority order /goal`. The prior echo handoff (claude-098ac2aa) flagged `slot-queue.mjs --pick` returning already-shipped units as a P0 blocker; this arc fixed the root cause then used the now-correct picker to ship real bridge work.

## What shipped

- **`c84a0c7cbc` U-PICKER-SHIPPED-UNION** — NEW `scripts/lib/shipped-units-source-of-truth.mjs`. Two real picker bugs: (1) `slot-queue.mjs` read `MILESTONE_PROGRESS.m.shipped` as an array but it's a NUMBER (count) → shipped set always empty fleet-wide; (2) `priority-queue.mjs` read `m.units[].shipped` but missed envelope-complete-but-git-untagged units (675 envelope-only drift; 6 in CLEANUP-MS0). Fix unions git-inferred + envelope-status-complete. Both pickers route through it.
- **`9cdc2db2e1` U-PICKER-HARDEN** — `/^U-/i` gate (milestone-id collision; union 1611→1274) + mtime in-process cache (cold 111ms→warm 11ms, 9.3×) + `_peekShippedUnionCache` test-export. Fixed a placebo test (was `size>0` only) into a sentinel-envelope fail-on-revert oracle.
- **`a9f1df5807` U-PICKER-SLOT-DOMAIN** — NEW `scripts/lib/domain-classifier.mjs` SSOT (extracted inline DOMAIN_RULES from `allocate-domains-to-slots.mjs`; frozen). `pickNextUnit({slot})` domain-filters (echo→cam); R12 fallback flags `_crossDomain` + stderr/CLI marker. Allocator refactored to import lib (behavior-identical, 3238→13 domains unchanged).
- **`76dc1b53cb` U-BRIDGE-SFC-ESPRIT+SOLIDCAM** — extended `CAMSpeedFeedBridgeEngine` 4→6 tier-1 CAM systems (was missing Esprit + SolidCAM). ESPRIT SurfaceSpeed=SFM routes through existing 0.3048 ft→m. 48/48 tests. Closes `U-BRIDGE-SFC-ESPRIT` + `U-BRIDGE-SFC-SOLIDCAM`.

## Reusable for future chats

- **Shipped-detection is now ONE helper** — `buildShippedIdsUnion()` (no arg = disk union incl. envelopes; `buildShippedIds(progress)` legacy in-memory for hermetic tests). Any new picker MUST route through it, never re-read `MILESTONE_PROGRESS.m.shipped` (it's a count, not a list).
- **slot↔domain is now ONE SSOT** — `scripts/lib/domain-classifier.mjs` `classifyUnit`/`slotDomain`/`filterUnitsBySlot`. Do NOT hardcode `echo→cam` anywhere else; import the lib. Rule order is load-bearing (cam before mill — HYPERMILL contains MILL).

## Lessons

- A "pure-core + injected readers" picker MUST have a real-data fail-on-revert test — the placebo `size>0` test would have passed a `picker→[]` regression. See [[feedback_verify_actual_contract_not_proxy]].
- R12 caught a host-OOM-dropped engine edit (`targetToCamSystem` silently didn't land) because the new tests used concrete `cam_system==='ESPRIT'` assertions, not presence-only.
- Host memory pressure made Stop/PreToolUse hooks intermittently OOM (`xmalloc: cannot allocate 8192 bytes`) but Edit/commit succeeded — work committed each iter so nothing lost.

## Deferred (logged, not done)

- mtime disk-cache for Stop-hook cross-process spawns (in-process cache only helps within-process).
- slot-queue.mjs vs priority-queue.mjs are two slot-scoping sources of truth; domain SSOT governs only the priority-queue fallback path. Document precedence (curated `slot-task-queues.json` wins).
- 4 already-built SFC bridges (hyperMILL/Fusion/InventorHSM/Mastercam) are silent close-out debt → envelope reconciliation.

Related: [[reference_priority_queue_ms0_2026_05_16]] · [[reference_juliett_12chat_allocation_2026_05_17]] · [[feedback_always_close_out]]
