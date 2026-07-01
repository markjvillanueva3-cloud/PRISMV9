---
name: reference_viz_dual_registration_audit_2026_06_22
description: "Sierra 2026-06-22: built the system-viz FAST[]+merge-splice dual-registration auditor (scripts/lib/viz-dual-registration-audit.mjs + CLI + 12 tests + regen-viz preflight). It FOUND 3 echo POST-PDF roosts (cited-tips/tribal-wiki/post-pdf) that were in regen-viz FAST[] since 2026-05-26 but NEVER spliced into merge-augmentations.mjs -- emitting fresh JSON every regen yet folding into NOTHING (117 corpus nodes silently dropped). FIXED via a merge-time class-name->node-id resolver (foldRoostAug): +117 nodes, 185/210 bridge edges recovered (25 un-graphed engines correctly dropped, 0 danglers injected). silentDiscards 3->0."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.252Z
aliases: reference_viz_dual_registration_audit_2026_06_22
---


# system-viz dual-registration auditor + the 3 dropped echo roosts it found (2026-06-22, slot:sierra)

## The tool (durable, the primary deliverable)
`scripts/lib/viz-dual-registration-audit.mjs` -- PURE static analysis (never loads the 370-575 MB
graph). Enforces the galaxy "both-or-neither" invariant (CLAUDE.md s3/s5/s7): every ghost-roost
generator must be in BOTH `regen-viz.mjs FAST[]` AND have a `merge-augmentations.mjs loadOptional(...)`.
Classifies: **crashRisks (P0)** = FAST entry whose generator file is missing (-> regen MODULE_NOT_FOUND,
the slot-queue class that broke regen ~2wks); **silentDiscards (P1)** = in FAST, emits an
augmentation, no merge loadOptional (-> ghost data dropped); **orphanGenerators (P2)** = emits a fold
output, not in FAST (-> never runs); **danglingConsumers** = loadOptional with no producer; **unverifiable**
(R12) = registered producer whose output filename can't be statically pinned (never asserted as a discard).
- CLI: `node scripts/audit-viz-dual-registration.mjs [--json] [--strict]` (exit 2 on crash-risk under --strict).
- WIRED: `regen-viz.mjs` preflight runs it before every regen (advisory; `PRISM_VIZ_DUALREG_STRICT=1`
  aborts on crash-risk; `PRISM_VIZ_DUALREG_PREFLIGHT=0` disables).
- Tests: `scripts/lib/viz-dual-registration-audit.test.mjs` 12/12 (happy + crash + discard + orphan +
  dangling + unverifiable + the atomicWriteText adversarial case + 4 unit tests). Run direct: `node <file>`.

## The bug it FOUND (live, with numbers -- R15 VALIDATE)
3 echo POST-PDF-NODE-MS0 roosts were added to `regen-viz.mjs FAST[]` on 2026-05-26 but NEVER spliced
into `merge-augmentations.mjs`. They emitted fresh JSON every regen (on disk, dated Jun 21 16:33) yet
folded into NOTHING -- silently dropped from the fleet search graph for ~4 weeks:
- `jm-die-cited-tips-augmentation.json` -- 13 nodes, 11 edges
- `jm-die-tribal-wiki-augmentation.json` -- 88 nodes, 167 edges (75 KB, JM Die TRIBAL+WIKI corpus)
- `post-pdf-corpus-augmentation.json` -- 16 nodes, 32 edges
Total 117 corpus nodes + 210 edges. (Cross-substrate showed as a v1 false-positive because it writes
its primary via `atomicWriteText(OUT)` not `writeFileSync` -- fixed the extractor: balanced first-arg
scan + convention fallback + recognize atomic/json/graph writers; re-verified consumed.)

## The fix (corruption-proof, not a blind splice -- heeded the prior diagnosis)
[[reference_orphan_augmentation_dangling_diagnosis_2026_06_10]] had already diagnosed cited-tips: its
bridge edges target bare engine CLASS NAMES (`to:"MasterPostProcessorEngine"`) NOT live node-ids, so a
BLIND splice would inject ~210 danglers = fleet-search corruption (sierra's #1 refuse). Added a
**merge-time class-name->node-id resolver** in a shared `foldRoostAug(aug, metaKey)`: resolves a bare
class name via a memoized last-id-segment index (prefer `eng.*`), folds resolved edges, drops the rest
(never folds a dangler). Measured on the live oracle (351,148 ids): **+117 nodes; 185/210 edges
recovered** (cited-tips 11/11, tribal-wiki 142/167, post-pdf 32/32); the 25 drops are genuinely
un-graphed engines (CamToolpathEngine, CADValidationEngine, WireEDMPostProcessorEngine...). Nodes/edges
land on the next `regen-viz`. Auditor confirms silentDiscards 3 -> 0.

## Remaining advisory (R16 -- logged, NOT chased this unit)
- **3 orphan generators (UPDATED 2026-06-22 iter2+iter4):**
  - `generate-core-inventory.mjs` -> FAST-added (U-VIZ-ORPHAN-WIRE, commit 6d8fbd50f9; 674 stale core.*
    nodes now refresh every regen). Resolved.
  - `generate-fs-inventory.mjs` -> NOT a heap-only fix (iter4 diagnosis): with `--max-old-space-size=8192`
    it no longer OOMs but runs >120s and times out without writing -> it is a SLOW/HANGING FS-walk
    (traverses H:/ incl. the ~555MB embedding + node-card trees -- the "never recurse H:/" trap). Real
    fix = huge-dir exclusion (PRISM-NOISE-PATHS) + walk cap, THEN FAST-add (338 stale fs.box.* nodes).
    Follow-up U-VIZ-FS-INVENTORY-WALK-FIX (supersedes the heap-only framing).
  - `generate-vault-atomic.mjs` -> RESOLVED REDUNDANT (iter4): its 4477/5099 vault_* ids are already the
    canonical output of the obsidian-bridge (`system-viz-obsidian-bridge-v2.mjs` -> obsidian-augmentation.json,
    489 MB, folded at merge line 141). vault-atomic is a superseded sibling -- correctly inert
    (loadOptional=0); do NOT activate (would duplicate the obsidian backlink layer). Retire candidate, not a gap.
- **1 dangling consumer**: `slot-queue-augmentation.json` -- the documented U-VIZ-SLOTQUEUE-ORPHAN
  harmless-null (generator was never built). Auditor correctly surfaces exactly this 1 known case.
- **Follow-up U-VIZ-ROOST-BRIDGE-RESOLVE**: move the class-name resolver to the 3 GENERATORS (cleaner
  layer than merge-time) + graph the 25 un-graphed engines so their bridge edges recover too.

Files: `scripts/lib/viz-dual-registration-audit{,.test}.mjs` · `scripts/audit-viz-dual-registration.mjs`
· `scripts/merge-augmentations.mjs` (foldRoostAug + 3 loadOptional) · `scripts/regen-viz.mjs` (preflight).
Related: [[reference_sierra_regen_fast_registration_gap_2026_05_29]] · [[reference_sierra_fast_splice_dual_registration]]
· [[feedback_sierra_graph_correctness_is_fleet_search]] · [[reference_xsub_embeds_docby_oracle_2026_06_10]].
