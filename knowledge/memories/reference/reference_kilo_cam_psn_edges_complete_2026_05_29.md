---
name: reference_kilo_cam_psn_edges_complete_2026_05_29
description: Complete CAM (kilo) galaxy PSN edge inventory — 11 cross-galaxy edges in both galaxy brain files (cam/MEMORY.md + cam/CLAUDE.md)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.183Z
aliases: reference_kilo_cam_psn_edges_complete_2026_05_29
---


The CAM galaxy (slot:kilo) is PSN-wired to its full manufacturing-domain neighborhood. Both galaxy brain files (`mcp-server/src/engines/cam/MEMORY.md` "Cross-galaxy bridges (PSN edges OUT)" + `cam/CLAUDE.md` "Related galaxies" table) carry the same edge set. Symmetric — each peer galaxy owner adds the CAM back-edge on golf merge.

**Complete edge inventory (11):**
- **delta (CAD)** → CAM — recognized features (FeatureNode[]) → `CAMFeatureExtractorEngine`. Input.
- **xray (blueprint-vision)** → CAM — OCR/blueprint/native-CAD extraction lifts geometry + PMI/GD&T off prints/PDFs/CAD files → feeds delta → CAM; PMI tolerance tags drive strategy. Upstream-of-delta input (pipeline xray→delta→CAM for raw prints).
- **oscar (SFC)** → CAM — speed/feed numerics per op → strategy parameters. Input.
- **tango (algorithms)** → CAM — NURBS/geodesic/BVH toolpath+geometry algorithms. Input.
- **foxtrot (mill) / whiskey (lathe) / mike (wedm)** ↔ CAM — CAM emits per-domain strategy; wizards own cut physics (force/wear/thermal). Bidirectional.
- **juliett (database-expansion)** ↔ CAM — CAM owns the data + schema; juliett owns persistence/indexing/expansion/migration/search (Qdrant/AgentDB/SQLite-WAL).
- **echo (post-processor)** ← CAM — validated strategy + toolpath → vendor G-code dialect. Output.
- **charlie (quoting)** ← CAM — strategy → cycle-time + tooling + op-count → quote cost (charlie owns pricing/margin; quote-vs-actual variance feeds CAM estimate accuracy back). Output.
- **hotel (business/ERP)** ← CAM — manufacturing plan + cycle-time/tooling actuals → ERP scheduling + job-costing + shop-floor routing (`prism_business`). Output.
- **india (training)** ← CAM — `xproc_outcome_publish` + `xproc_kg_project_features` → GNN tier-5 + retrain candidacy. Output.
- **NN/GNN** ↔ CAM — transfer-domain similarity = cosine over strategy embeddings.

**Commits:** juliett edge `f0204ef15b` (U-CAM-JULIETT-EDGE); xray+charlie+hotel `U-CAM-PSN-EDGES` (2026-05-29). Verified each time via `node scripts/cam-galaxy-verify.mjs` → exit 0.

The CAM galaxy now sits at the center of the print→part flow: **xray/delta** (geometry in) + **oscar/tango** (numerics/algorithms in) → **CAM** (strategy) → **echo** (G-code) + **charlie/hotel** (quote/ERP) + **india** (learning), with **foxtrot/whiskey/mike** as the per-machine cut-physics peers and **juliett** as the data layer. See [[reference_kilo_cam_juliett_edge_2026_05_29]] · [[reference_kilo_cam_galaxy_buildout_2026_05_28]].
