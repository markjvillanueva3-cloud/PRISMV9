---
name: pdf-course-bridge-iter20-2026-05-24
description: Edge-only system-viz augmentation linking 893 PDF + 1401 college ghost-children to logical-connected engines. 2541 bridge-to-engine edges shipped in india iter20 (b382b4328c). Closes the "wire and bridge to logical connected nodes" leg of the compile-+-generate-+-bridge /goal.
type: reference
slot: india
source: prism-memory
synced: 2026-06-27T20:30:46.725Z
aliases: reference_pdf_course_bridge_iter20_2026_05_24
---


# PDF↔Course → Engine bridge — iter20 (2026-05-24)

## What shipped

`scripts/generate-pdf-course-bridge-features.mjs` + 15/15 tests. Pure-edge
system-viz augmentation that links every `pdf-extract.<slug>` and every
`college.course.<slug>` ghost-child to its logical-connected `engine.<className>`
nodes via kind-based mapping tables.

**Output: 2541 bridge-to-engine edges folded into system-graph.json.**

## Mapping tables (canonical kind→engine lookup)

### PDF_KIND_TO_ENGINES
| kind | targets |
|---|---|
| machining-handbook | KienzleForceModel, CuttingForce, UltimateSpeedFeed, AutoSpeedFeed |
| resource-catalog | ShopToolingRegistry, ToolCatalog |
| manual-pdf | PostProcessorPipeline, MachineController |
| blueprint-pdf | PdfBlueprintDimensionExtractor, CADGeometry |
| other-pdf | PdfGenericExtractor (catch-all) |

### COURSE_KIND_TO_ENGINES
| kind | targets |
|---|---|
| mit-ocw | MITCourseKnowledge, MitOcwResourceResolver |
| basic-training | ShopFloorTraining, OperatorOnboarding |
| knowledge-pack | KnowledgeConversion, FormulaExtractor |
| handbook-pdfs | PdfMachiningHandbookExtractor |
| prism-training | PrismTrainingModule |
| prism-personal | PersonalNotesExtractor |

## Why this matters

Without bridge edges, the ghost.resource_pdfs + ghost.college_courses roosts
were ISLAND nodes — discoverable but disconnected from PRISM's engine graph.
The bridge edges turn the roosts into the source-of-truth for "which engine
should consume which PDF/course" and make missing engines surface in
`/system-viz` wiring overlay (orange = unwired target).

Lima's per-source extraction (`/college-extract`, `/pdf-learn`) can now use
the bridge edges to determine WHICH engine to populate with extracted
formulas — instead of guessing.

## Apply

- When adding a new ghost-roost with kind-classified children → add a
  companion bridge generator following this edge-only pattern.
- Missing engine targets (where `engine.X` doesn't exist on disk yet) are
  intentional — they surface gaps in the wiring overlay.
- When extracting a PDF/course, look up `pdfCourseBridge.newEdges` for
  `source: "pdf-extract.<slug>"` to find logical target engines.
- Re-running the generator is idempotent (deterministic edge set per spec dir).

Related: [[reference_college_course_autogen_specs_2026_05_24]] · [[reference_git_fsmonitor_blocks_bulk_add_2026_05_24]] · [[feedback_psn_definition]]
