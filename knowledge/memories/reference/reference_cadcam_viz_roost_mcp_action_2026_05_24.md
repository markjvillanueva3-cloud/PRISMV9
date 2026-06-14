---
name: reference-cadcam-viz-roost-mcp-action-2026_05_24
description: india iter25+iter26 — /system-viz roost + prism_ai:ai_cadcam_corpus_pointers MCP action closing the System Viz + PRISM AI + Claude orchestration PSN legs of the cad+cam handoff chain.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.037Z
aliases: reference_cadcam_viz_roost_mcp_action_2026_05_24
---


iter25 + iter26 (slot:india, 2026-05-24) close the System Viz + Claude-orchestration legs of the cad+cam consolidation goal.

**Chain context** (4-layer handoff total):
- iter23 (`1bdcbff625`) — routing layer (consolidator JSON + MD index). See [[reference_college_course_autogen_specs_2026_05_24]].
- iter24 (`2256216327`) — tribal+wiki layer. See [[reference_cadcam_tribal_wiki_extract_2026_05_24]].
- iter25 (`13362c6e7f` peer-absorbed infra + `54bd1e47b7` recovery) — system-viz roost layer (this memo).
- iter26 (`e96fae3caa`) — MCP action layer (this memo).

## iter25 — /system-viz roost generator

`scripts/generate-cadcam-training-corpus-features.mjs` (15/15 tests PASS) emits:

- `ghost.cadcam_training_corpus` (L8 roost, parent `ghost.planned_features`)
- `ghost.cadcam_training_corpus.cad` (L9 pivot, label "CAD corpus → delta (21)")
- `ghost.cadcam_training_corpus.cam` (L9 pivot, label "CAM corpus → kilo (598)")
- `training-source.{cad|cam}.<slug>` (L10 leaf per entry — info encodes `[kind · source_type · →audience]`)

Total: **622 new nodes** (1 + 2 + 619). Registered in `scripts/regen-viz.mjs` FAST[] and `scripts/merge-augmentations.mjs` (loadOptional + version metadata + splice block, all copied verbatim from `miscTasks`/`pdfCourseBridge` pattern). Output: `state/shared/system-viz/cadcam-training-corpus-augmentation.json`.

Idempotent (merge dedupes by id), byte-stable on repeat runs, null-safe on malformed input.

**Peer-absorption incident**: my first iter25 commit attempt landed but had the infra files absorbed into charlie's `13362c6e7f` (third absorption this session per [[feedback_commit_to_slot_worktree]]). Recovery commit `54bd1e47b7` re-attached the orphaned generator + test source. Slot-worktree migration via `/checkin-india §2c` remains the canonical fix.

## iter26 — `prism_ai:ai_cadcam_corpus_pointers` MCP action

Mirrors iter21's `ai_college_corpus_pointers` pattern. New `getCadCamCorpus()` method on `AIResourceLearningEngine` returns a single struct that resolves the entire 3-layer handoff in one MCP call:

```ts
prism_ai({ action: "ai_cadcam_corpus_pointers" })
// → {
//     consolidatedJson, consolidatedMdIndex,
//     cadCount: 21, camCount: 598, dualClassified: 5,
//     cadTribalJsonl, camTribalJsonl,
//     cadWikiIndex, camWikiIndex,
//     vizRoostId: "ghost.cadcam_training_corpus",
//     vizCadPivotId, vizCamPivotId, vizAugmentationFile,
//     audienceMap: { cad: "delta", cam: "kilo" },
//     youtubeChannelCount: { cad: 8, cam: 7 }, bookCount: 11,
//     regenScripts: { consolidate, tribalWiki, vizRoost },
//     sourceCommits: { consolidate, tribalWiki, vizRoost, vizRoostScript },
//   }
```

4 files touched:
- `mcp-server/src/engines/AIResourceLearningEngine.ts` — new pure `getCadCamCorpus()` method
- `mcp-server/src/schemas/aiCapabilityActionSchemas.ts` — declaration + enum entry + schemas-map
- `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` — case wiring (lazy import)
- `mcp-server/src/__tests__/AIResourceLearningEngine.getCadCamCorpus.test.ts` — 22/22 PASS

Test coverage: happy path (7) + invariants (5) + schema contract (4) + adversarial/spanning (6) incl. JSON round-trip, 100x mutation immutability, NATO slot-name validation.

## PSN-leg traceability

| Leg | Closed by |
|---|---|
| #1 Obsidian brain | iter24 + iter25 + iter26 memo refs (this file + sister files) |
| #2 PRISM OS | iter26 (`prism_ai` dispatcher) |
| #3 Wiki | iter24 (`knowledge/wiki/training/cad-corpus-index.md` + cam) |
| #4 Memories | iter24/25/26 memory files |
| #5 Tribal | iter24 (`cad-tribal-corpus.jsonl` + `cam-tribal-corpus.jsonl`) |
| #6 System Viz | iter25 (`ghost.cadcam_training_corpus.*` roost) |
| #7 Engines | iter23 bridge_engines refs + iter26 `AIResourceLearningEngine.getCadCamCorpus()` |
| #8 Algorithms | not applicable to this corpus (data pointers, not algorithms) |
| #9 Formulas | not applicable (pointer struct, not formula) |
| #10 NN/GNN | downstream — delta/kilo training pipelines consume via `audienceMap` |
| #11 PRISM AI | iter26 MCP action |

## Consumer protocol

Single-call resolution:
```ts
const ptr = await prism_ai({ action: "ai_cadcam_corpus_pointers" });
// Delta path:
const cadIndex = readFile(ptr.cadWikiIndex);
const cadStream = streamLines(ptr.cadTribalJsonl);  // 21 entries
// Kilo path:
const camIndex = readFile(ptr.camWikiIndex);
const camStream = streamLines(ptr.camTribalJsonl);  // 598 entries
// Graph path:
const cadNodes = graph.nodes.filter(n => n.parent === ptr.vizCadPivotId);
```

## Related memories

- [[reference_cadcam_tribal_wiki_extract_2026_05_24]] — iter24 tribal+wiki layer
- [[reference_college_course_autogen_specs_2026_05_24]] — iter15-20 parent corpus (input to iter23)
- [[reference_pdf_course_bridge_iter20_2026_05_24]] — iter22 bridge map this depends on
- [[feedback_commit_to_slot_worktree]] — explains the iter25 peer-absorption
- [[reference_git_fsmonitor_blocks_bulk_add_2026_05_24]] — bulk-add bypass used in all 4 commits

**Closes goal_clear**: "extract all data and handoff to delta to use to train cad and Kilo for training cam" — across 4 commits, 4 layers, 11 PSN legs, 69 tests.
