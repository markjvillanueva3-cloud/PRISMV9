# Mill domain — PSN coverage audit

_Generated: 2026-05-23T16:17:29.378Z · scripts/audit-mill-psn-coverage.mjs_

Audits all **58** mill-domain engines (`Mill*` / `Milling*` prefix) against the 11 PSN legs.

## Totals

- Engines audited: **58**
- Avg PSN coverage: **28.7%**
- Fully synergized (all 11 legs lit): **0**
- Fully dark (only engines-file leg lit): **0**
- Unwired (no dispatcher import): **1**

## Per-leg coverage

| PSN leg | Lit | Dark | Coverage |
|---|---:|---:|---:|
| `obsidian-brain` | 0 | 58 | 0.0% |
| `prism-os` | 0 | 58 | 0.0% |
| `wiki` | 7 | 51 | 12.1% |
| `memories` | 0 | 58 | 0.0% |
| `tribal` | 54 | 4 | 93.1% |
| `system-viz` | 58 | 0 | 100.0% |
| `engines` | 58 | 0 | 100.0% |
| `algorithms` | 0 | 58 | 0.0% |
| `formulas` | 6 | 52 | 10.3% |
| `nn-gnn` | 0 | 58 | 0.0% |
| `prism-ai` | 0 | 58 | 0.0% |

## Engines with darkest PSN coverage (top 15)

| Engine | Lit legs | Dispatchers | Dark legs |
|---|---:|---|---|
| `MillKinematicsCollisionEngine` | 2/11 | millDispatcher | obsidian-brain, prism-os, wiki, memories, tribal, algorithms, formulas, nn-gnn, prism-ai |
| `MillPatternMinerEngine` | 2/11 | dataDispatcher, millDispatcher | obsidian-brain, prism-os, wiki, memories, tribal, algorithms, formulas, nn-gnn, prism-ai |
| `MillingAIUltraIntelligenceEngine` | 2/11 | millDispatcher | obsidian-brain, prism-os, wiki, memories, tribal, algorithms, formulas, nn-gnn, prism-ai |
| `MillingMachineIntelligenceEngine` | 2/11 | millDispatcher | obsidian-brain, prism-os, wiki, memories, tribal, algorithms, formulas, nn-gnn, prism-ai |
| `MillDeepLearningEngine` | 3/11 | camDispatcher, millDispatcher | obsidian-brain, prism-os, wiki, memories, algorithms, formulas, nn-gnn, prism-ai |
| `MillNeuralNetworkEngine` | 3/11 | millDispatcher | obsidian-brain, prism-os, wiki, memories, algorithms, formulas, nn-gnn, prism-ai |
| `MillPartClassifierEngine` | 3/11 | millDispatcher | obsidian-brain, prism-os, wiki, memories, algorithms, formulas, nn-gnn, prism-ai |
| `MillPartFamilyMatcherEngine` | 3/11 | camDispatcher | obsidian-brain, prism-os, wiki, memories, algorithms, formulas, nn-gnn, prism-ai |
| `MillPartFamilyTemplateExtractorEngine` | 3/11 | camDispatcher | obsidian-brain, prism-os, wiki, memories, algorithms, formulas, nn-gnn, prism-ai |
| `MillPrintToProgramEngine` | 3/11 | millDispatcher | obsidian-brain, prism-os, wiki, memories, algorithms, formulas, nn-gnn, prism-ai |
| `MillProgramAnalyzerEngine` | 3/11 | millDispatcher | obsidian-brain, prism-os, wiki, memories, algorithms, formulas, nn-gnn, prism-ai |
| `MillProgramLearningEngine` | 3/11 | millDispatcher | obsidian-brain, prism-os, wiki, memories, algorithms, formulas, nn-gnn, prism-ai |
| `MillProgramOptimizerEngine` | 3/11 | millDispatcher | obsidian-brain, prism-os, wiki, memories, algorithms, formulas, nn-gnn, prism-ai |
| `MillResourceAwarenessEngine` | 3/11 | millDispatcher | obsidian-brain, prism-os, wiki, memories, algorithms, formulas, nn-gnn, prism-ai |
| `MillScientificPipelineEngine` | 3/11 | millDispatcher | obsidian-brain, prism-os, wiki, memories, algorithms, formulas, nn-gnn, prism-ai |

## Fully-synergized engines (all 11 legs lit)

_None — no mill engine connects to all 11 PSN legs._

## How to use this report

1. **Find a high-leverage engine with low PSN coverage** (top of darkest table) — these are built but unsynergized; the biggest ROI is here.
2. **Identify 1-2 dark legs that would multiply value** — wiki + memory entries are cheapest to add; dispatcher wiring is highest leverage if missing.
3. **Promote citations through the canonical indexes** — this audit reads pre-built indexes, NOT leaf-md files. Adding a leaf wiki page without updating `wiki/index.md` won't move the needle here; that's an indexing gap separate from the engine.
4. **Re-run this audit after each promotion** to confirm the engine moved from dark→lit on its target legs.

**Advisory only.** Index-based audit: detects engine names cited in canonical PSN-source indexes only. Citations buried in non-indexed leaf .md files are NOT detected. Spot-check the top-15 darkest engines before bulk-promoting — a citation might already exist in a leaf that simply hasn't been catalog-promoted.