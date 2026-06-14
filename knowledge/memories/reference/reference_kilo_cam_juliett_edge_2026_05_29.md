---
name: reference_kilo_cam_juliett_edge_2026_05_29
description: CAM (kilo) ↔ juliett (database-expansion) PSN edge — CAM owns the data + schema, juliett owns persistence/indexing/expansion/migration/search
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.181Z
aliases: reference_kilo_cam_juliett_edge_2026_05_29
---


CAM galaxy (slot:kilo) wired a PSN edge to the **juliett galaxy** (`mcp-server/src/engines/database-expansion/`) for the CAM databases. Operator directive: *"wire to juliett galaxy for the databases."* Committed `f0204ef15b` (`U-CAM-JULIETT-EDGE`), 2026-05-29. No edge existed before (0 matches).

**Contract (division of labor):**
- **CAM owns the DATA + schema authorship** — the CAM stores: `CAM_VENDOR_REGISTRY.json`, `CAM_TRIBAL_RAG_INDEX.json` (5.5M), `CAM_AI_ACTIONS_INDEX.json` (318K), `state/shared/corpus/cam-tribal-tips.jsonl` (928 tips), `cad-cam-resources-pdf-index.json` (1M), 25 `mcp-server/data/cam-functions/<vendor>/` catalog dirs.
- **juliett owns the PERSISTENCE + SEARCH layer** — indexing / expansion / migration / semantic search (Qdrant / AgentDB / SQLite-WAL / JSONL), with atomic-write + schema-version + migration discipline.
- **Routing rule:** CAM persistence / search / migration questions route to juliett; CAM keeps schema ownership.

**Symmetric edge:** juliett's galaxy should add the CAM back-edge on golf merge (documented in the edge text itself).

**Where it lives (both galaxy brain files):**
- `mcp-server/src/engines/cam/MEMORY.md` → "Cross-galaxy bridges (PSN edges OUT)".
- `mcp-server/src/engines/cam/CLAUDE.md` → "Related galaxies" table.

Verified post-wire: `node scripts/cam-galaxy-verify.mjs` → exit 0 (9/9 PASS). See [[reference_kilo_cam_galaxy_buildout_2026_05_28]] · [[reference_kilo_cam_wiring_campaign_2026_05_29]].
