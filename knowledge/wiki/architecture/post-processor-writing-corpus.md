---
name: post-processor-writing-corpus
description: PRISM's post-processor writing reference corpus — 2 PDFs extracted, 217 sections indexed, 35 cited tribal tips across 14 controller dialects, bridged to 18 post engines via system-viz augmentation. Echo's domain entry for the same multi-chat PDF-corpus pattern foxtrot/kilo/lima/mike are running.
type: architecture
slot: echo
milestone: POST-PDF-NODE-MS0
units: U-POST-PDF-CORPUS-NODE, U-POST-PDF-TRIBAL-TIPS
date: 2026-05-26
status: built
related:
  - "[[cad-cam-resources-pdf-index]]"
  - "[[milling-pdf-corpus]]"
  - "[[KnowledgeCurriculumBridgeEngine]]"
  - "[[MasterPostProcessorUnifiedAGIEngine]]"
---

# Post-Processor Writing Corpus

PRISM's canonical extraction + indexing of the two post-processor-writing PDFs in `resources/RESOURCE PDFS/`. Closes the graph gap where the system-viz had ghost-only L10 nodes for these PDFs but no extracted content + no bridges to PRISM's 18 post-processor engines.

## Source PDFs

| Corpus ID | Title | Vendor | Size | Chapters | Sections |
|---|---|---|---|---|---|
| `PDF-POST-TRAINING-AUTODESK` | Post Processor Training Guide (Autodesk Fusion/Inventor CAM/HSMWorks) | Autodesk | 8.2MB | 12 | 193 |
| `PDF-POST-POSTABILITY-UPK-2021` | Postability Post Processor Documentation (UPK, 2021-02-04) | Postability | 1.8MB | 1 (24 named sections) | 24 |

**Total: 217 sections extracted + indexed.**

## Autodesk Training Guide TOC (chapter → coverage)

1. **Introduction** — what a post is, finding/installing/running/testing posts, benchmark parts
2. **Editor** — Autodesk Post Processor Editor (auto-complete, syntax check, debugging)
3. **JavaScript** — the post DSL (variables, expressions, conditionals, loops, functions, Vector/Matrix objects, deferred variables, real-value comparison)
4. **Post Processor Settings** — coolant, smoothing, retract, parametric feeds, unwind, machine angles, workPlaneMethod, subprograms, comments, probing, tool list, optional
5. **Entry Functions** — onOpen, onSection, onSectionEnd, onClose, onTerminate, onCommand, onComment, onDwell, onParameter, onPassThrough, onSpindleSpeed, onOrientateSpindle, onRadiusCompensation, onMovement, onFeedMode, onRapid (+5D), onLinear (+5D), onCircular, onCycle/onCyclePoint, onCycleEnd, writeBlock, force---, writeRetract
6. **Manual NC Commands** — onManualNC, expandManualNC, delayed-processing patterns
7. **Debugging** — dump.cps, debugMode, setWriteInvocations, setWriteStack, debug/log/writeDebug
8. **Multi-Axis** — rotary axes formats, machine config, hardcoded multi-axis config, singularity handling, rotary rewinding, multi-axis feedrates, polar interpolation
9. **Machine Simulation** — placing the part, attach points, simulating connection moves
10. **Probing** — WCS probing, geometry probing, inspect surface
11. **Additive** — finding a machine, additive setup, machineConfiguration/extruder/commands/settings objects, onBedTemp/onExtruderTemp/onExtruderChange/onLayer
12. **Deposition** — deposition sample post, deposition-specific functions

## Postability UPK Documentation outline

- Application & General Terminology (5-Axis Mill/Router, Mill-Turn)
- Unified Post Kernel (UPK) General Settings — rotary switches, machine orientation, advanced control options, home motion, misc control, 5-axis switches, mill-turn switches
- Miscellaneous Values — milling (integers/reals), lathe (integers/reals)
- Work Offset / WCS / Tool Plane / Construction Plane (distinguished mechanisms)
- Rotary Axis — 3+2 machining, milling rotary control, mill-turn rotary control, multi-axis, transitions between cuts
- Machine Setup — machine and control definition, rotary axis, general machine parameters, axis combinations, arcs

## System-Viz augmentation

Generator: [`scripts/generate-post-pdf-corpus-features.mjs`](../../../scripts/generate-post-pdf-corpus-features.mjs)
Parser: [`scripts/lib/post-pdf-corpus-parser.mjs`](../../../scripts/lib/post-pdf-corpus-parser.mjs)
Output: `state/shared/system-viz/post-pdf-corpus-augmentation.json` (regen-derived, gitignored)

**Nodes emitted (16 total):**
- `ghost.post_writing_corpus` (L8 roost)
- `ghost.post_writing_corpus.autodesk-post-training-guide` (L9 book pivot)
- `ghost.post_writing_corpus.postability-upk-documentation-2021` (L9 book pivot)
- 13 chapter pivots (L10) — one per Autodesk chapter + one per Postability "Document"

**Bridge edges emitted (32 total):**
- 18 to PRISM post-processor engines from the Autodesk Training Guide pivot
- 8 to a narrower subset from the Postability UPK pivot (mill-turn + rotary specialists)
- 6 cross-domain coordination edges (3 per book pivot):
  - `subset-of` → `cad-cam-resources-pdf-index` (kilo's 1008-PDF manifest)
  - `follows-citation-pattern` → `milling-pdf-corpus` (foxtrot's tribal corpus)
  - `uses-bridge-pattern` → `KnowledgeCurriculumBridgeEngine` (foxtrot's bridge engine)

**Plus 217 L10 tribal-tip nodes** — auto-emitted by `generate-extracted-pdf-tips-features.mjs` from the JSONL records in `mcp-server/data/ingestion_cache/extracted-pdfs/*.jsonl`.

## Cited Tribal Tips

35-tip seed corpus at [`mcp-server/src/data/tribal-tips/post-pdf-cited-tips.ts`](../../../mcp-server/src/data/tribal-tips/post-pdf-cited-tips.ts), mirroring foxtrot's `milling-pdf-cited-tips.ts` schema (`CitedPostTip`).

Coverage axes:
- Every Autodesk chapter cited at least once
- Every Postability section cited at least once
- Per-dialect specialization for Heidenhain (M120 + TCPM), Mitsubishi (G05.1 leading-zero), Haas (G187), Siemens (CYCLE832, TRAORI), Okuma (G08 P1), Fanuc (G5.1, G43.4)
- Doctrine-level catch-all tips for safe-start, comments, work-offset, retract, float-comparison

Lookup helpers exported:
- `tipsForController(dialect)` — returns dialect-applicable tips (empty `controllerScope` = matches all)
- `tipsForTopic(topic)` — returns tips by topic enum

**Foxtrot-soul refuse-list compliance** (enforced by `post-pdf-cited-tips.test.ts`):
- `sourceId` set to one of the 2 known PDF corpus IDs
- `sourceTitle` non-empty
- `vendor` in `{Autodesk, Postability}` allowed set
- `citation` non-empty (Ch.§ reference)
- IDs unique, confidence/status values from documented enum

## Auto-Injection

The 217 L10 tribal-tip nodes are auto-emitted by the existing
[`generate-extracted-pdf-tips-features.mjs`](../../../scripts/generate-extracted-pdf-tips-features.mjs)
consumer because the per-section JSONL records ship in
`mcp-server/data/ingestion_cache/extracted-pdfs/` — the consumer's canonical
read path.

For prompt-time injection, `tribal-by-domain-inject.mjs` surfaces these tips
when the slot domain matches `cam | post-processor`. Echo's slot soul already
filters on `cam|toolpath|fusion|mastercam|hypermill|esprit|nx-cam|catia|powermill|solidcam|adaptive|trochoidal`,
so post-related prompts naturally receive these tips when the inject fires.

## Coordination with peer chats (operator directive 2026-05-26)

Per the directive *"whiskey, lima, mike and foxtrot are all doing the same
thing for their domain so coordinate with them. you should be able to use
their data and their extractions for your domain"*:

| Peer | Domain | Substrate | Echo's coordination |
|---|---|---|---|
| **kilo** | resources index | `cad-cam-resources-pdf-index` (1008-PDF manifest, commit `67178f76d6`) | Our 2 PDFs are entries in kilo's `domain:"training"`, software:"misc" bucket. System-viz augmentation emits `subset-of` bridge. |
| **foxtrot** | milling tribal | `milling-pdf-corpus` + `milling-pdf-cited-tips.ts` (commit `057136e9a6`, `4c1358495a`) | Mirrors foxtrot's `CitedMillingTip` schema as `CitedPostTip`. Foxtrot-soul attribution rules enforced. System-viz augmentation emits `follows-citation-pattern` bridge. |
| **lima** | academy | foxtrot-lima crossover for milling (commit `057136e9a6 U-FOXTROT-LIMA-CROSSOVER`) | Post-domain tips can feed into lima academy lessons via the same KnowledgeCurriculumBridgeEngine pattern. |
| **mike** | misc | misc-tasks inventory | Out-of-scope cross-references can be picked up by mike's misc-tasks roost. |
| **whiskey** | lathe | JM-DIE-LATHE-UPGRADE-MS0 (lathe AI tier wiring) | Lathe post-processor tips (subset of `controllerScope`) feed into whiskey's lathe-engine knowledge. |
| **bravo** | speed-feed bridge | `SpeedFeedPDFCorpusBridgeEngine` (peer-staged 2026-05-26) | Future bridge — post-processor tips could enrich the speed-feed-PDF-corpus bridge with controller-aware feed formats (parametric vs absolute, dialect macros). |

## Excluded engines

`PostProcessorUnificationEngine` is intentionally NOT in the bridge target list per `HANDOFF-claude-3350c663-india-post-wire.md` finding: it ships a `Math.random()` stub and cannot be reliably documented until the stub is replaced.

## Regen path

```bash
# Re-extract from source PDFs:
pdftotext -layout "resources/RESOURCE PDFS/Post Processor Training Guide.pdf" state/shared/pdf-extracts/post-writing/post-training-guide.txt
pdftotext -layout "resources/RESOURCE PDFS/Post+Processor+Documentation+-+2021-02-04.pdf" state/shared/pdf-extracts/post-writing/post-documentation-2021.txt

# Re-emit the system-viz augmentation + JSONL records:
node scripts/generate-post-pdf-corpus-features.mjs

# Full system-viz regen (picks up the new nodes via FAST[]):
node scripts/regen-viz.mjs
```

## Follow-ups

- **U-MASTERPOST-DIALECT-HEIDENHAIN-COMMENT-FP** (P2) — Heidenhain `safe_start` regex matches `END PGM` inside comments → anchor with `^\s*END\s+PGM` (line-start, multiline flag).
- **U-MASTERPOST-DL-COMMENT-REGEX-CONSISTENCY** (P3) — unify `runDeepLearningAnalysis` and `quickQualityScore` comment regex.
- **U-POST-PDF-CORPUS-DEEP-EXTRACTION** (P2) — promote tip `body` content via `/pdf-learn` to attach per-tip body text (currently `body` is unfilled).
- **U-POST-STUDIO-WIZARD-WIRE** (P2) — surface `POST_PDF_CITED_TIPS` in a `/post-studio` wizard the same way `/mill-studio` surfaces `MILLING_PDF_CITED_TIPS` via foxtrot's `KnowledgeCurriculumBridgeEngine`.
