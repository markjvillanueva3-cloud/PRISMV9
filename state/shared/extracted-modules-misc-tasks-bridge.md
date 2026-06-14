# Bridge — extracted-modules wire-queue ↔ MISC-TASKS-INVENTORY

slot:papa /goal /loop iter13 (2026-05-26).

## What's the relationship

Two complementary inventories of "work that needs doing but isn't on an active roadmap":

| Surface | Source | Size | Provenance |
|---|---|---:|---|
| `state/shared/specs/MISC-TASKS-INVENTORY.json` | 10-agent scan of 912 transcripts + 504 handoffs + curated debt files (juliett 5/16) | **318 misc tasks** | informal work observed in PRISM chats but never made into a roadmap unit |
| `state/shared/extracted-modules-wire-queue.json` | Top-50 of 1259 WIRE_CANDIDATE rows in the classified manifest (papa 5/26) | **50 wire candidates** (3.3M-line absorption surface) | legacy v8.89 monolith modules without an existing PRISM engine equivalent |
| `state/shared/extracted-modules-classified.json` | Full 1788-row classified manifest (papa 5/26) | **1259 WIRE + 134 PARTIAL + 208 DATABASE + 111 DUP + 57 STUB + 19 META** | catalog of `H:/PRISM/extracted/` + `extracted_modules/` |

**They DON'T overlap by name** — misc-tasks captures chat-room debt + roadmap-prose gaps; extracted-modules captures legacy-monolith absorption candidates. But operators picking work should consult BOTH when looking for "what's next":

1. Roadmap units (`atomic-roadmap.json` → priority-queue picker)
2. Bridge units (26 wiring + 16 deep-integration per `ROADMAP-CONSOLIDATED.md`)
3. Misc-tasks inventory (318 chat-observed gaps)
4. **Extracted-modules wire-queue (50 monolith-absorption beasts)** ← new this loop
5. Close-out candidates (shipped-but-pending envelopes)

## Why bridge them in /system-viz

Both are surfaced as ghost-roosts in /system-viz:
- `ghost.misc_tasks` (juliett 5/16, 318 child nodes)
- `ghost.extracted` + `ghost.extracted_modules` (golf 5/24, 50 category nodes)
- `ghost.extracted.<category>.<file>` + `ghost.extracted_modules.<category>.<file>` (papa 5/26, 653 file-level L10 nodes)

Operators dropping into /system-viz see all three side-by-side, color-coded by status. Tier-3 pickers (autopilot loops) can navigate from misc-tasks edges into matching extracted-modules WIRE_CANDIDATEs (when name-similarity > 0.55).

## Open follow-up

`U-MISC-TASKS-EXTRACTED-XREF`: name-match the 318 misc-tasks against the 1259 WIRE_CANDIDATE names. When a misc-task says "find PRISM_SUBSCRIPTION_SYSTEM" and there's a 168K-line WIRE_CANDIDATE at `extracted_modules/GIANT/PRISM_SUBSCRIPTION_SYSTEM.js`, surface as a paired pickup. Tracked but not built this loop.

## Related

- [[roadmap-consolidation-2026-05-16]] — bridge layer (juliett)
- [[misc-tasks-extraction-2026-05-16]] — misc-tasks inventory (juliett)
- [[reference_extracted_modules_pipeline_2026_05_26]] — extracted-modules pipeline (papa)
- [[feedback_shared_tree_absorption_pattern]] — commit-attribution doctrine (papa)
