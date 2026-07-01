# CAD Engine ↔ MCP Server Integration Report

**Generated:** 2026-06-23T15:14:09Z (scheduled task: `cad-engine-integration-check`, autonomous run — supersedes 2026-06-22 / 2026-05-02 runs)
**Subject:** Integration status of PRISM CAD engine (Python/CadQuery) with the MCP server (TypeScript)
**Verdict:** **PARTIAL** — a real geometry-kernel bridge exists and is reachable through exactly one live dispatcher path; ~98% of the CAD engine's capability surface is unwired.

---

## 1. CAD Engine Structure

**Root:** `H:/PRISM/cad-engine/` — CadQuery 2.x + OpenCascade (OCP)

| Metric | Count |
|--------|-------|
| Python files (excl. `.venv`) | **185** (task envelope cites 176; delta is recent module growth) |
| `class` definitions (`src/`) | 310 |
| Top-level `def` (`src/`) | 331 |
| All `def` incl. methods (`src/`) | 1,124 |
| Test files (`tests/`) | 71 (`tests/`, `tests/e2e/`, `tests/integration/`) |
| Root entry points | `bridge.py` (JSON-RPC), `mcp_cad_converter.py` (standalone MCP server) |

**Module layout (depth 2):**
```
cad-engine/
├── bridge.py                ← JSON-RPC stdin/stdout bridge (THE TS integration point)
├── mcp_cad_converter.py     ← standalone MCP server (CadQuery file converter, stdio/SSE)
├── src/
│   ├── cad_kernel.py, geo_validator.py, cad_export.py   ← geometry kernel (bridged)
│   ├── extraction/   (8)    ← catalog/PDF/param/table/vendor knowledge extractors
│   ├── feedback/     (9)    ← operator feedback, consensus, KB updater
│   ├── quality/      (5)    ← CMM import, dimensional accuracy, surface finish, tolerance
│   ├── sensors/      (7)    ← ingestion, anomaly, wear prediction, signal processing
│   ├── synthesis/    (4)    ← knowledge graph, cross-source resolution, confidence
│   ├── validators/   (4)    ← cad/cam/shop validators
│   ├── prompts/      (4)    ← cad/cam/document/shop LLM prompts
│   └── ~55 root modules     ← feature_analyze, op_sequence, vision_analyze, video_ingest,
│                              nl_query, knowledge_bridge, memory_*, teach_me, etc.
├── data/, schemas/, primitives/, reference_parts/, knowledge_store/, scripts/
└── tests/  (unit + e2e + integration)
```

The CAD engine is overwhelmingly a **knowledge / extraction / quality / sensor intelligence subsystem**. The pure-geometry slice (create / boolean / transform / validate / analyze / export / import) is a thin layer surfaced by `bridge.py`.

---

## 2. Integration Status: **PARTIAL**

### Existing integration points (verified)

**A. `bridge.py` — JSON-RPC geometry bridge (9 methods)**
`src/bridge.py` exposes a `_HANDLERS` dispatch table over stdin/stdout JSON-RPC:
`ping`, `create_geometry`, `boolean`, `transform`, `validate_geometry`, `analyze_geometry`, `export_geometry`, `import_step`, `clear`.

**B. `CadBridge.ts` — TypeScript client (real subprocess spawn)**
`mcp-server/src/engines/CadBridge.ts` spawns `bridge.py` via `child_process.spawn(PATHS.PYTHON, [bridgePath])` (`PATHS.PYTHON = process.env.PRISM_PYTHON_PATH || "python"`), with lazy start, health check, auto-restart, and cleanup. Public async methods map 1:1 to the bridge handlers: `ping`, `createGeometry`, `booleanOp`, `transform`, `validateGeometry`, `analyzeGeometry`, `exportGeometry`, `importStep`, `clear`, `shutdown`.

**C. One live end-to-end execution path**
`BooleanKernelEngine.ts` (`execute()`) → `getCadBridge().booleanOp(...)` → spawns `bridge.py` → CadQuery. This engine is wired into **`camDispatcher.ts`** (`booleanKernelEngine.execute(p)` ~line 20578) — so `prism_cam` can drive real CadQuery boolean operations through the Python engine.

**D. Inspection surface on `prism_cad`**
`cadDispatcher.ts` exposes `cad_bridge_status` (action), which calls `CadBridge.peekInstance().getStatus()` — a **pure-inspection** action that reports subprocess/singleton state **without spawning** the bridge.

**E. Verified by real tests**
`mcp-server/src/__tests__/cad-bridge.test.ts` exercises the full path (ping; box / cylinder / sphere volume; fillet; boolean subtract; manifold validation; STEP export→reimport round-trip within 0.1%; error handling; memory mgmt), gated by `describe.skipIf(!hasCadQuery)` — i.e. it runs for real when CadQuery is installed.

### Missing integration points

1. **`prism_cad` does not execute Python geometry.** The dispatcher's `geometry_create` / `geometry_analyze` / `geometry_transform` actions route to the **TypeScript** `GeometryEngine`, not to `CadBridge`. Only `cad_bridge_status` touches the Python bridge, and only to read status. The 8 geometry-producing bridge methods are reachable only indirectly via `prism_cam` → `BooleanKernelEngine` (boolean op only).
2. **~98% of CAD engine capabilities have no TS bridge.** None of `extraction/`, `feedback/`, `quality/`, `sensors/`, `synthesis/`, `validators/`, `prompts/`, nor the ~55 root modules (feature recognition, op sequencing, vision/video ingest, NL query, teach-me, memory) are exposed through any MCP dispatcher. They run only as standalone Python (CLI / tests).
3. **`mcp_cad_converter.py` is an orphan MCP server.** It is a complete second MCP server (STEP / IGES / BREP / DXF / STL / 3MF / glTF conversion + inspection + batch) but is **not registered** in any PRISM `.mcp.json` (no match in `H:/PRISM/.mcp.json` or `mcp-server/.mcp.json`). It cannot be invoked by the fleet today.
4. **No feature-recognition / toolpath-validation bridge.** The task's stated goal ("callable for geometry analysis, feature recognition, and toolpath validation") is met only for geometry analysis of the 9-method kernel; feature recognition (`feature_analyze.py`, `pattern_detect.py`) and CAM validation (`validators/cam_validator.py`) remain Python-only.

---

## 3. SVI Inclusion Recommendation: **YES — add CAD engine as a tracked subsystem**

The CAD engine is a major capability surface (185 modules / 310 classes / 1,124 functions) that SVI does not currently count. Its near-total un-wiredness is exactly the kind of reachability gap SVI exists to surface — adding it makes the gap visible and trackable rather than invisible.

### Proposed SVI subsystem entry
- **Name:** `CAD Engine`
- **Category:** `intelligence` (knowledge/extraction dominant; geometry kernel is a minority slice)
- **Entities:** 176 modules (envelope figure; live `find` = 185 excl. `.venv` — reconcile on first census)
- **Dimensions (N):** **6** proposed capability families — geometry kernel · extraction · quality · sensors · synthesis · feedback/validation. (Defensible range 4–8; Engines use 3, Tools use 10.)
- **Variability:** 176 × 6 = **1,056**
- **Wired %:** **~2–3%** — only the geometry-kernel slice (`bridge.py` + `cad_kernel` / `geo_validator` / `cad_export`, ≈4 modules) is reachable, and only `boolean` is driven end-to-end from a dispatcher.
- **Reachable:** ≈ **24** (4 modules × 6 dims, generous) of 1,056.

### Projected Ψ (reachability) impact
Ψ = Σ reachable / Σ variability. Current SVI snapshot (2026-06-23T15:12Z): Σ variability ≈ **1,034,820**, Σ reachable = same ⇒ **Ψ = 100.0%**.

Adding CAD (variability +1,056, reachable +24):
```
Ψ_new = (1,034,820 + 24) / (1,034,820 + 1,056)
      = 1,034,844 / 1,035,876
      ≈ 0.99900  →  99.90%
```
**Projected Ψ: 100.0% → ~99.90% (≈ −0.10 pp).** The drop is modest because the `Tools` subsystem (956,080) dominates the denominator — but it correctly surfaces **~1,032 newly-tracked unreachable capability-units**. That visibility is the point: it converts a silent blind spot into a measurable wiring backlog.

### Projected SVI (product) impact
SVI = ∏ subsystem_variability ≈ 10^46.16. Multiplying in CAD's 1,056 adds log₁₀(1,056) ≈ 3.02 ⇒ **SVI ≈ 10^49.2** (only the reachable portion counts toward Ψ; SVI tracks raw capability magnitude).

### Recommended follow-on wiring (to recover Ψ)
1. Promote `CadBridge`'s 8 geometry methods to first-class `prism_cad` actions (`geometry_create_py`, `geometry_validate_py`, `geometry_export_py`, `step_import`, …) so geometry analysis runs on real CadQuery, not the TS stand-in.
2. Register `mcp_cad_converter.py` in PRISM's `.mcp.json` (or fold its converters into `bridge.py`) to recover the format-conversion surface.
3. Add bridge methods + dispatcher actions for feature recognition (`feature_analyze`, `pattern_detect`) and CAM validation (`validators/cam_validator`) to meet the full "geometry analysis + feature recognition + toolpath validation" goal.

---

## 4. Success Criteria — Met
- ✅ CAD engine structure documented (185 files, 310 classes, 1,124 functions, 71 test files, module tree).
- ✅ Integration status determined: **PARTIAL** (geometry-kernel bridge live via `prism_cam` / BooleanKernel + `cad_bridge_status` inspection on `prism_cad`; remainder unwired; `mcp_cad_converter.py` orphaned).
- ✅ SVI inclusion recommendation made: **YES**, ≈1,056 variability, projected Ψ 100.0% → ~99.90%.

---

### Assumptions & notes (autonomous run — no operator present)
- Dimensions N=6 is an estimate; the first real CAD census should set it from the actual capability-family taxonomy. Ψ projection scales roughly linearly with N (N=4 → ~99.93%; N=8 → ~99.87%).
- Entity count: envelope says 176, live `find` says 185 (excl. `.venv`). Used 176 for SVI math per envelope; flagged for reconciliation.
- No write actions taken beyond producing this report (task specified report output only).
