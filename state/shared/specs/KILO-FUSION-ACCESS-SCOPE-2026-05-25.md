# KILO-FUSION-ACCESS-SCOPE — 2026-05-25

> /goal directive: "scope the most efficient way for you to access cad/cam data from my fusion account. can you extract data quicker than the previous method we had with the add in fusion, it took forever to do anything"

## Existing extraction throughput (root cause analysis)

| Path | Engine | Wire path | Where the latency lives |
|---|---|---|---|
| **Add-in (current)** | `Fusion360PluginAdapterEngine` | Python add-in `prism_addin.py` → JSON-RPC over WebSocket `localhost:18360` → `adsk.cam.CAMManager.traverse(Setup→Operation→Toolpath)` | Serial COM-style traversal inside the Fusion process. Each Setup.children iteration locks the Fusion main UI thread; even ~50 ops takes 30s+. RAM doesn't help — bottleneck is the Fusion API single-thread + WS round-trip overhead per node. |
| `prism_api_client.py` (in-Fusion) → HTTP POST to PRISM `/upload` per file | `prism_bridge.py` | mostly upload latency, not extraction | upload bandwidth bound, NOT the Fusion API |

**Why more RAM won't fix add-in slowness:** the Fusion `adsk.cam` API is single-threaded inside `Fusion.exe`. RAM helps Fusion hold more geometry in memory (avoid swap), but the COM traversal walks the tree node-by-node serially regardless. The fix is to STOP traversing through Fusion's API and use a faster substrate.

## 3 faster extraction modes (priority order)

### Mode 1 — Autodesk Platform Services (APS, formerly Forge) REST API
**Throughput target**: ~100-500 ms per file metadata, ~1-5 s per file with full BREP via Model Derivative API.
**Auth**: 3-legged OAuth2 (`APS_CLIENT_ID` + `APS_CLIENT_SECRET` already present in `mcp-server/.env`); Fusion 360 account hub access via Data Management API.
**APIs needed**:
- `aps:data:read` — hub/project/folder enumeration
- `aps:data:read aps:data:write` — file download URLs
- `aps:model-derivative` — STEP/IGES/STL/JT export from `.f3d`/`.iam`
- `aps:design-data:read` — CAM setup metadata (Setup/Operation/Tool tree as JSON, NOT COM traversal)

**Engines that already cover this surface (audit)**:
- `Fusion360LiveBridgeEngine` (Data Management list — already wired)
- `FusionCloudConnectorEngine` (auth + retry layer)
- `ForgeQuintEngine` (5 service orchestrator)
- `AutoForgeEngine` (3-leg OAuth flow)
- `FusionCAMExtractorEngine` (CAM tree → JSON)
- `FusionProjectCrawlerEngine` (project tree walker)

**Gap**: no benchmark script to measure actual REST throughput against the same set of .f3d files the add-in was slow on. **Iter 2 deliverable**.

### Mode 2 — File-system parse of cached/exported .f3d / .ipt / .iam
**Throughput target**: ~10-50 ms per file (pure file read + ZIP/parse, no API at all).
**Substrate**: `.f3d` is a ZIP container with embedded JSON. `.ipt` and `.iam` are Inventor binary but Autodesk's APS Model Derivative converts them to JSON. The `H:/PRISM/JM DIE/_PART LIBRARY/` corpus already has **4,837 .ipt + 581 .iam + 52 .idw** files on disk — no API call needed.
**Approach**: `.f3d` → unzip → `Document.json` carries the design tree + CAM setup. `.ipt`/`.iam` → APS Model Derivative job → STEP/JT/SVF2 → reusable parsers.
**Engines that already cover**: `FusionCPSParserEngine` (CPS = CAM PostScript — Fusion's text-based post format).
**Gap**: no streaming `.f3d`/.ipt unpacker engine yet. **Iter 3 deliverable**.

### Mode 3 — Hybrid: add-in for live ops + REST/file for bulk extract
**Throughput target**: combines Mode-1 (200ms/file metadata) + Mode-2 (50ms/file cached) + add-in only for "operator hits a button live in Fusion" — never for bulk corpus extract.
**Why hybrid**: the add-in is the RIGHT path for "Speed&Feed via PRISM" / "Auto-program via PRISM" buttons (operator-driven, single file at a time, latency tolerable). The add-in is the WRONG path for "extract 4,837 .ipt files" (use Mode 2 file-parse, ~4 min total vs ~12 hours via add-in).

## Add-in status check

The add-in directory `H:/prism/scripts/fusion360-prism-addin/` ships:
- `INSTALL_PRISM.bat` — installs to Fusion's `addins/` folder
- `prism_addin.py` (24KB) — UI panel + commands
- `prism_api_client.py` (16KB) — HTTP client → PRISM `/upload`
- `prism_bridge.py` (16KB) — JSON-RPC server-side
- `panel.html` (19KB) — UI panel content
- `PRISM.cps` (12KB) — Custom post-processor
- `auto_cam.py` (13KB) — Auto-CAM generator
- `prism_cam_optimizer.manifest` — Fusion-side manifest

**To re-verify add-in works**:
1. Open Fusion 360, Tools → Add-Ins → "Scripts and Add-Ins" panel
2. Check if "PRISM" appears in the Add-Ins list — if yes, "Run" toggles it on
3. If not: `cmd /c INSTALL_PRISM.bat` in PowerShell from the addin dir (operator runs)
4. Once running, hits `localhost:18360` (FusionCloudConnectorEngine default port)
5. PRISM-side: `node H:/prism/mcp-server/dist/index.js` then `cam_fusion_live_connect` action

**Verification owner**: operator (Claude can't open Fusion 360 itself). Once add-in confirms working, kilo iter 4 can benchmark Mode-1 REST vs add-in WS on the same 50-file test set.

## Phase plan (8-iter campaign)

| iter | Deliverable |
|---|---|
| 1 (this) | This scope memo — 3-mode comparison, add-in status |
| 2 | KiloApsBenchmarkScriptEngine — measures REST API list+download throughput against the JM-Die corpus |
| 3 | KiloFusionFileParserEngine — `.f3d` ZIP unpack + Document.json reader (offline, no Fusion needed) |
| 4 | Side-by-side bench results (add-in vs REST vs file-parse) — written to a results doc |
| 5 | KiloCamProgramTrainingDatasetEngine — emits training tuples from existing `.mcx-8` (Mastercam) + `.min` (Okuma) + `.f3d` (Fusion) corpus |
| 6 | KiloInventorIptIamParserEngine — Inventor file walker (uses APS Model Derivative job for .ipt → STEP) |
| 7 | Per-system training-data dump (Mastercam dataset from 8,592 .mcx; Okuma dataset from 17,342 .min; Inventor dataset from 4,837 .ipt) |
| 8 | Close-out memo + handoff |

## Decisions to lock

1. **Mode 1 (APS REST) is the primary path** for Fusion data going forward. Mode 2 (file-parse) is the secondary path for any cached/exported file already on disk. Mode 3 (add-in) is reserved for the operator's live in-Fusion UI buttons — NOT bulk corpus extraction.
2. **More RAM does NOT fix the add-in slowness** — the bottleneck is Fusion's single-threaded COM traversal, not memory pressure. The user's previous "maybe more ram will help now" intuition is reasonable but doesn't apply to this bottleneck.
3. **The add-in must be re-verified by the operator** — Claude can't launch Fusion 360; needs the install + visual confirmation step.

## Cross-refs

- `mcp-server/src/engines/Fusion360PluginAdapterEngine.ts` — current add-in bridge (the slow path)
- `mcp-server/src/engines/FusionCloudConnectorEngine.ts` — auth + retry layer (reusable for Mode 1)
- `mcp-server/src/engines/Fusion360LiveBridgeEngine.ts` — Data Management API caller (Mode 1)
- `scripts/fusion360-prism-addin/` — the add-in install scaffold
- `mcp-server/.env` — APS_CLIENT_ID + APS_CLIENT_SECRET present
- `state/shared/jm-die-partlib-manifest.json` — 473 parts / 147,717 files / 58.5 GB inventory (kilo loop1 iter13)
