---
title: Extracted-modules conversion pipeline
type: architecture
created: 2026-05-26
slot: papa
status: shipped
---

# Extracted-modules conversion pipeline

Closes the operator directive (slot:papa /goal /loop 2026-05-26): "convert extracted data to individual nodes, bridge and wire to existing databases, nodes that can utilize them H:\PRISM\extracted H:\PRISM\extracted_modules. synergize all data to PSN + /system-viz + prism app".

## What was missing

The golf 5/24 generator (`generate-extracted-modules-features.mjs`, U-PSN-EXTRACTED-DIRS-NODE-MAP) gave us category-level visibility into `H:/PRISM/extracted/` + `H:/PRISM/extracted_modules/` — 50 ghost-roost nodes total. But:

- Operators couldn't tell WHICH extracted files were the biggest wins
- No bridge edges to existing PRISM engines (so DUP detection wasn't visible in /system-viz)
- No classification: WIRE vs DUP vs DB vs STUB all looked alike
- No dispatcher recommendation per file

## Architecture (4 stages)

```
1. WALK   →  build-extracted-modules-manifest.mjs
                ↓
            state/shared/extracted-modules-manifest.json
                (1788 modules · SHA-256 + lines + size + type per file)
                ↓
2. CLASSIFY → classify-extracted-modules.mjs
                ↓ (fuzzy-match vs 3678 mcp-server/src/engines/*.ts)
            state/shared/extracted-modules-classified.json
                (dup_status + matched_engine + recommended_dispatcher)
                ↓
3. GENERATE → generate-extracted-modules-detail-features.mjs
                ↓ (top-200 WIRE + 208 DB + 111 DUP + 134 PARTIAL)
            state/shared/system-viz/extracted-modules-detail-augmentation.json
                (653 file-level L10 nodes + 786 bridge/wire edges)
                ↓
4. SPLICE  → merge-augmentations.mjs (new block after extractedModules splice)
                ↓
            state/shared/system-viz/system-graph.json
                (G.nodes + G.edges + G.meta.extractedModulesDetail)
```

## Classification breakdown

| dup_status | count | meaning | action |
|---|---|---|---|
| WIRE_CANDIDATE | 1259 | No existing equivalent in mcp-server/src/engines/ | wire-new-engine |
| PARTIAL_OVERLAP | 134 | Fuzzy 0.55-0.85 to existing engine | extract-novel-features |
| DUP_KEEP_EXISTING | 111 | Exact name OR Jaccard ≥0.85 | skip-dup |
| DATABASE | 208 | Pure registry data | wire-as-registry |
| STUB | 57 | <30 lines, no real content | skip-too-small |
| META | 19 | `.json`/`.md` index/summary file | index-only |

## Recommended dispatcher distribution

| dispatcher | count | example matches |
|---|---|---|
| prism_dev | 1028 | catch-all engines lacking a domain-specific dispatcher |
| prism_data | 273 | DATABASE / material / tool / machine carriers |
| prism_ai | 125 | ai_ml-typed modules |
| prism_calc | 111 | physics + algorithm-typed |
| prism_cad | 48 | geometry-typed |
| prism_session | 38 | system modules |
| prism_cam | 36 | cam/toolpath/post-processor |

## Node + edge schema

**Node** (`extracted.<stockpile>.<safeId(path)>`):
```json
{
  "id": "extracted.extracted_modules.giant-prism-pso-optimizer-js",
  "label": "PRISM_PSO_OPTIMIZER",
  "layer": "L10",
  "ghost": true,
  "kind": "extracted-module-wire_candidate",
  "parent": "ghost.extracted_modules.giant",
  "color": "amber",
  "info": "[WIRE_CANDIDATE] 214580L 7800KB · algorithm → prism_calc",
  "meta": { "path": "GIANT/PRISM_PSO_OPTIMIZER.js", "stockpile": "extracted_modules",
            "type": "algorithm", "lines": 214580, "dup_status": "WIRE_CANDIDATE",
            "matched_engine": null, "match_confidence": 0.12,
            "recommended_dispatcher": "prism_calc",
            "recommended_action": "wire-new-engine" }
}
```

**Edges** — two types:
- `bridge_to_existing` (245): from DUP/PARTIAL file-node → matched PRISM engine id
- `wire_target` (541): from WIRE/PARTIAL file-node → recommended dispatcher id

The splice silently drops edges whose `to` doesn't resolve to a node in system-graph (no orphan targets), which means PascalCase engine matches missing from the graph are visible only via the node's `meta.matched_engine` until the engine-graph naming bridges close.

## How to use it (operator)

**Regen the layer:**
```bash
node scripts/build-extracted-modules-manifest.mjs
node scripts/classify-extracted-modules.mjs
node scripts/generate-extracted-modules-detail-features.mjs
# then either:
#   node scripts/regen-viz.mjs --fast   (re-runs merge-augmentations)
# or trust the next scheduled /system-viz regen
```

**Pick top WIRE_CANDIDATEs as roadmap units:**
```bash
node -e "const j=require('./state/shared/extracted-modules-classified.json'); j.summary.top_20_wire_candidates.forEach(c => console.log(c.lines+'L '+c.dispatcher+' '+c.path))"
```

## Karpathy compliance

- **R5 (model-for-judgment)** — fuzzy-match is deterministic Jaccard, not LLM
- **R7 (surface conflicts)** — DUP_KEEP_EXISTING explicitly names the conflict
- **R8 (read before write)** — golf 5/24 roost generator preserved; detail layer is purely additive
- **R10 (checkpoint)** — manifest + classified JSON are the persistent state
- **R12 (fail-loud)** — every status counts surfaced in JSON output; no silent drops on the data side (the only silent path is edge-target-not-in-graph, tracked as a P2 follow-up)

## Related

- [[reference_extracted_modules_pipeline_2026_05_26]] — Obsidian-side memory
- `scripts/generate-extracted-modules-features.mjs` — golf 5/24 category roost (predecessor)
- `feedback_psn_definition.md` — 11-leg PSN taxonomy (Leg 6 is /system-viz)
- `state/shared/specs/MISC-TASKS-INVENTORY.md` — sister inventory of unfinished extra-roadmap work
