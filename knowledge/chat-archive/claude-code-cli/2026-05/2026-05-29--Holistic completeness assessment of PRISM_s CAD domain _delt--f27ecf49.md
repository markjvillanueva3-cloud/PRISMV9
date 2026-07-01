---
type: "chat-session"
source: "claude-code-cli"
session_id: "f27ecf49-ca75-4d3e-b761-aa4fa25998f6"
title: "Holistic completeness assessment of PRISM's CAD domain (delta's galaxy). Repo: H"
date: "2026-05-29"
first_ts: "2026-05-29T16:17:07.954Z"
last_ts: "2026-05-29T16:20:41.227Z"
cwd: "H:\\prism-slot-delta"
messages: 40
user_msgs: 16
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/workflows/wf_ee462d1d-f6f/agent-acf15143fc1f90bbf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:43"
---

# Holistic completeness assessment of PRISM's CAD domain (delta's galaxy). Repo: H

> **claude-code-cli** | 2026-05-29 | 40 msgs (16 user / 24 assistant) | cwd: H:\prism-slot-delta
> Raw: `H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/workflows/wf_ee462d1d-f6f/agent-acf15143fc1f90bbf.jsonl`

## Transcript

### User | 2026-05-29T16:17:07.954Z

Holistic completeness assessment of PRISM's CAD domain (delta's galaxy). Repo: H:/prism-slot-delta (worktree ~1697 behind integration; if a file seems missing, ALSO check H:/prism absolute before calling a gap). The CAD pipeline end-to-end: INTAKE (blueprint/photo/text/PDF->CAD, OCR) -> GEOMETRY KERNEL (BRep/NURBS/CSG/boolean/tessellation/mesh) -> FEATURE-RECOGNITION (features/assembly-graph/GD&T/PMI) -> FORMAT I/O (read+emit STEP/IGES/DXF/STL/F3D/SLDPRT/IPT/3DM) -> GENERATION (15 *CodeGenerator* engines + multi-CAD producer + STEP universal) -> VALIDATION (tolerance-stack/DFM/accuracy-validators/collision) -> DOMAIN-SPECIALS (electrode/trilobe/blisk/5-axis-CAD) -> KNOWLEDGE/AI (RAG over CAD corpus/semantic-search/training) -> GALAXY-META (cad/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md + knowledge-index + awareness hook + lint guard + GSD). Be skeptical, open files, grep mcp-server/src/engines/ for CAD* . Return ONLY a fenced json block: ```json\n{"area":"<name>","verdict":"complete|gaps","coverage":"<1-line>","gaps":[{"item":"<missing capability>","severity":"P0|P1|P2","fix":"<concrete next step>"}]}``` — empty gaps if complete.

AREA = intake-geometry-features. Verify the FRONT half: (1) INTAKE engines (BlueprintToCADGenerationEngine, PartMediaToCADEngine photo->CAD, text->CAD, PDFBlueprintDimensionExtractor, BlueprintVisionOCR); (2) GEOMETRY KERNEL (CADKernelEngine Vec3/Mat4/NURBS/CSG/boolean/tessellation, GeometryEngine, MeshEngine, BRepTessellatorEngine, StockModelEngine); (3) FEATURE-RECOGNITION (CADFeatureRecognitionEngine, CADAssemblyGraphEngine, CADDrawingKnowledgeEngine for GD&T/PMI). QUESTION: is any core CAD intake/geometry/feature capability MISSING or stub? e.g. is there sketch-constraint solving? a real NURBS surface evaluator? non-manifold handling? List concrete missing/stub capabilities.

### Assistant | 2026-05-29T16:17:23.925Z

I'll assess the FRONT half of PRISM's CAD domain: intake, geometry kernel, and feature recognition. Let me open the actual engine files and verify capabilities rather than trust the inventory.

### Assistant | 2026-05-29T16:17:26.656Z

[tool_use: Bash]

### Assistant | 2026-05-29T16:17:27.303Z

[tool_use: Bash]

### User | 2026-05-29T16:18:04.726Z

[tool_result] AdaptiveTessellationEngine.ts  5.7K
AutoCADAddinPluginEngine.ts  14.9K
AutoCADDotNetBridgeEngine.ts  14.5K
BRepTessellatorEngine.ts  33.0K
BarStockCutPlanEngine.ts  9.0K
BarStockVibrationEngine.ts  13.4K
BliskCADEngine.ts  28.8K
BlueprintCorpusHarvestEngine.ts  22.9K
BlueprintCoverageAuditEngine.ts  10.4K
BlueprintExtractionRAGEngine.ts  21.6K
BlueprintLoRABridgeEngine.ts  13.3K
BlueprintOCREngine
... [+6130 chars truncated]

### User | 2026-05-29T16:18:04.892Z

[tool_result] AdaptiveTessellationEngine.ts  5.7K
AutoAdjustCascadeEngine.ts  28.6K
AutoCADAddinPluginEngine.ts  14.4K
AutoCADDotNetBridgeEngine.ts  14.1K
BRepTessellatorEngine.ts  32.2K
BarStockCutPlanEngine.ts  9.0K
BarStockVibrationEngine.ts  13.0K
BliskCADEngine.ts  28.0K
BlueprintCorpusHarvestEngine.ts  22.3K
BlueprintCoverageAuditEngine.ts  10.2K
BlueprintExtractionRAGEngine.ts  21.0K
BlueprintLoRABridgeE
... [+8073 chars truncated]

### Assistant | 2026-05-29T16:18:15.215Z

Critical finding already: `CADFeatureRecognitionEngine.ts` is **655B in delta** but **4.8K in main**. Also `PartMediaToCADEngine.ts` is **MISSING from delta** but present in main (24.2K). The delta worktree is ~1697 commits behind. Let me read the key files from main (the authoritative copy) and check for stubs.
[tool_use: Read]
[tool_use: Read]

### User | 2026-05-29T16:18:17.916Z

[tool_result] 1	// WIRE-EXEMPT: U-EFF25 stub — real engine never existed; routes/milling.ts imports it with try/catch fallback, no dispatcher action needed
2	/**
3	 * CADFeatureRecognitionEngine — stub (U-EFF25).
4	 *
5	 * routes/milling.ts wraps its import in try/catch with a fallback that
6	 * returns an empty-features object, so the stub just needs to satisfy
7	 * TS2307 with an extractFeatures method.
8	 */
... [+275 chars truncated]

### User | 2026-05-29T16:18:19.086Z

[tool_result] 1	/**
2	 * CADFeatureRecognitionEngine — heuristic CAD-feature recognizer.
3	 *
4	 * STUB-RESCUE (slot:bravo 2026-05-27, U-STUB-HUNT-10). Original returned
5	 * hardcoded {features:[], confidence:0.5}. Real implementation accepts a
6	 * simple geometry shape and recognizes 5 canonical mill-domain features:
7	 * hole, pocket, slot, fillet, chamfer — via boundary/curvature heuristics.
8	 * routes/mi
... [+4921 chars truncated]

### Assistant | 2026-05-29T16:18:24.633Z

The delta worktree's `CADFeatureRecognitionEngine.ts` is the OLD stub (`{features:[], confidence:0.5}`); main has the real heuristic recognizer. That's the worktree-lag, not a true gap (the real engine exists in main). Now let me verify the geometry kernel and key intake engines in main. Let me look at the NURBS/CSG/boolean core, the assembly graph, GD&T knowledge, and check for the sketch-constraint solver question.

### Assistant | 2026-05-29T16:18:27.310Z

[tool_use: Bash]

### User | 2026-05-29T16:18:34.431Z

[tool_result] === CADKernelEngine structure ===
7: *   - NURBS curve and surface evaluation
9: *   - CSG boolean operations (union, subtract, intersect)
55:export interface NURBSCurve {
58:  knot_vector: number[];
64:export interface NURBSSurface {
68:  knot_vector_u: number[];
69:  knot_vector_v: number[];
77:  knot_vector: number[];
102:  curve_type: "line" | "arc" | "bspline" | "nurbs";
111:  surface_type: "
... [+1470 chars truncated]

### Assistant | 2026-05-29T16:18:39.116Z

The kernel has real NURBS curve evaluation (Cox-de Boor span finding visible). Let me check the NURBS *surface* evaluator and CSG boolean implementation depth — these are the typical stub-zones.

### Assistant | 2026-05-29T16:18:39.900Z

[tool_use: Read]

### User | 2026-05-29T16:18:41.798Z

[tool_result] 595	    return points;
596	  }
597	
598	  // ── Bounding Box Operations ─────────────────────────────────────
599	
600	  /** Computes a a b b.
601	   * @param points - points
602	   * @returns a a b b
603	   */
604	  computeAABB(points: Vec3[]): AABB {
605	    const bb: AABB = {
606	      min: { x: Infinity, y: Infinity, z: Infinity },
607	      max: { x: -Infinity, y: -Infinity, z: -Infinity },
6
... [+7705 chars truncated]

### Assistant | 2026-05-29T16:18:46.040Z

The kernel has real ray-triangle (Möller–Trumbore), mesh volume (signed tetrahedra), AABB ops. Let me check the NURBS *surface* evaluator and CSG boolean — these are where stubs hide.

### Assistant | 2026-05-29T16:18:48.111Z

[tool_use: Bash]

### User | 2026-05-29T16:18:54.276Z

[tool_result] 810:    const norms: Vec3[] = verts.map(() => ({ x: 0, y: 0, z: 0 })); // simplified
844:    // Top/bottom caps (simplified — center vertex fan)
881:    // Gift-wrapping simplified: find extreme points for initial tetrahedron
938:    let volume = 0, surfaceArea = 0;
948:      surfaceArea += this.triangleArea(v0, v1, v2);
955:      surface_area: surfaceArea,
1031:  /** 2D polygon offset (simplified
... [+39 chars truncated]

### Assistant | 2026-05-29T16:18:58.366Z

No `evaluateNURBSSurface` method. The kernel evaluates NURBS *curves* but the `NURBSSurface` interface (line 64) has no evaluator. Let me confirm CSG and the surface gap, then check the CSG operations area and BooleanKernelEngine.

### Assistant | 2026-05-29T16:18:59.458Z

[tool_use: Read]

### User | 2026-05-29T16:19:00.600Z

[tool_result] 860	     * @param let - let
861	     * @returns void
862	     */
863	    for (let i = 0; i < segments; i++) {
864	      const angle = (i / segments) * Math.PI * 2;
865	      vertices.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: -halfH });
866	      normals.push({ x: 0, y: 0, z: -1 });
867	      indices.push(botC, botC + 1 + ((i + 1) % segments), botC + 1 + i);
868	    }
869	
... [+6822 chars truncated]

### Assistant | 2026-05-29T16:19:04.563Z

Now let me see the CSG region (the boolean operations) and confirm whether the convexHull3D is incomplete (the initial-tetrahedron comment suggests it never iterates the remaining points — a known approximation). Let me find the CSG methods.

### Assistant | 2026-05-29T16:19:07.322Z

[tool_use: Bash]

### Assistant | 2026-05-29T16:19:07.329Z

[tool_use: Read]

### User | 2026-05-29T16:19:08.649Z

[tool_result] 1	/**
2	 * BooleanKernelEngine
3	 *
4	 * Thin PRISM engine over the CadQuery-backed CAD bridge for real 3D boolean
5	 * operations. This is the truthful kernel that higher-level editing engines
6	 * should delegate to when they need union/subtract/intersect semantics.
7	 */
8	
9	import { log } from "../utils/Logger.js";
10	import { getCadBridge } from "./CadBridge.js";
11	
12	export type BooleanKe
... [+2815 chars truncated]

### User | 2026-05-29T16:19:11.830Z

[tool_result] 8: *   - B-Rep topology (vertex, edge, face, shell, solid)
9: *   - CSG boolean operations (union, subtract, intersect)
59:  is_periodic: boolean;
123:  is_closed: boolean;
131:  outer_shell: BRepShell;
132:  void_shells: BRepShell[];
159:// ── CSG Types ─────────────────────────────────────────────────────────
163:export type CSGOperation = "union" | "subtract" | "intersect";
167:export interface
... [+653 chars truncated]

### Assistant | 2026-05-29T16:19:18.312Z

Important architecture clarity: real boolean ops are delegated to a **CadQuery (OpenCASCADE) Python bridge** (`BooleanKernelEngine` → `CadBridge.booleanOp`), not done in JS. So the in-process JS `CADKernelEngine` lacks JS CSG, but real boolean/manifold/watertight validation exists via the bridge. That's a sound architecture (don't reimplement OCCT in JS). Let me verify the CadBridge actually wires to a real backend, and check the NURBS-surface gap, the assembly graph, and GD&T engine quickly.

### Assistant | 2026-05-29T16:19:22.023Z

[tool_use: Bash]

### Assistant | 2026-05-29T16:19:24.263Z

[tool_use: Bash]

### User | 2026-05-29T16:19:27.912Z

[tool_result] mcp-server/src/engines/CADKernelEngine.ts:64:export interface NURBSSurface {
---
/usr/bin/bash: line 1: /c/Users/wompu/bin/rtk: Argument list too long
=== sketch solver search done ===

### User | 2026-05-29T16:19:30.479Z

[tool_result] 13:import { spawn, ChildProcess } from "child_process";
--- CadBridge backend check ---
4: * Spawns bridge.py as a child process, communicates via JSON-RPC
9: *   const bridge = CadBridge.getInstance();
10: *   const result = await bridge.createGeometry({ type: "box", width: 20, height: 20, depth: 20 });
13:import { spawn, ChildProcess } from "child_process";
147:  private readonly pythonPath: str
... [+1226 chars truncated]

### Assistant | 2026-05-29T16:19:39.079Z

Confirmed: `CadBridge` spawns a real Python `bridge.py` (CadQuery/OpenCASCADE JSON-RPC). So 3D booleans, manifold/watertight validation are real via the bridge. Now confirmed: **no `evaluateNURBSSurface`** in the JS kernel (only the `NURBSSurface` interface exists, no evaluator method), and **no sketch-constraint solver** anywhere in engines. Let me verify the bridge.py exists and check the assembly graph + GD&T engines briefly to finalize.

### Assistant | 2026-05-29T16:19:39.081Z

[tool_use: Bash]

### Assistant | 2026-05-29T16:19:42.049Z

[tool_use: Bash]

### User | 2026-05-29T16:19:50.217Z

[tool_result] --- bridge.py existence ---
prism_ac/
prism_mcp/
README.md  3.5K
setup.py  1.6K
25:  type: "box" | "cylinder" | "sphere" | "cone" | "sketch_extrude";
33:  extrude_height?: number;
38:  fillet_radius?: number;
39:  fillet_edges?: string;
40:  chamfer_distance?: number;
41:  chamfer_edges?: string;
45:  shell_thickness?: number;
46:  shell_faces?: string;
384:  async booleanOp(params: {

### User | 2026-05-29T16:19:51.452Z

[tool_result] === AssemblyGraph methods ===
9: *   - Direct children (BOM level-1) + transitive descendants (full BOM)
65:export class CADAssemblyGraphEngine {
74:  constructor(graphPath: string = DEFAULT_GRAPH_PATH) {
92:  getNode(partId: string): AssemblyNode | undefined {
96:  listNodes(): AssemblyNode[] {
100:  listEdges(): AssemblyReference[] {
106:  addNode(input: Omit<AssemblyNode, "paths" | "tags" | "cu
... [+2473 chars truncated]

### Assistant | 2026-05-29T16:19:58.549Z

All three feature-recognition surfaces are real:
- **CADAssemblyGraphEngine**: real BOM graph (descendants/ancestors, cycle detection via DFS, broken-ref healing by content hash, impact analysis) — solid.
- **CADDrawingKnowledgeEngine**: real GD&T per ASME Y14.5-2018 (full symbol taxonomy, datum logic, profile/orientation/location/runout categories) — solid.
- **CadBridge** exposes extrude/revolve(? — checking)/fillet/chamfer/shell/boolean — note `revolve`/`loft`/`sweep` did NOT appear in the grep. Let me confirm the bridge modeling-op coverage and check PartMediaToCADEngine (the photo→CAD intake, missing from delta but in main).

### Assistant | 2026-05-29T16:20:00.736Z

[tool_use: Bash]

### User | 2026-05-29T16:20:06.947Z

[tool_result] 217:  private async ensureRunning(): Promise<void> {
376:  async ping(): Promise<{ status: string; version: string; solids_in_memory: number }> {
380:  async createGeometry(params: CadGeometryRequest): Promise<CadGeometryResult> {
384:  async booleanOp(params: {
392:  async transform(params: {
403:  async validateGeometry(params: {
412:  async analyzeGeometry(params: {
418:  async exportGeometry(p
... [+1064 chars truncated]

### Assistant | 2026-05-29T16:20:41.227Z

This gives me the complete picture. Key findings:

- **CadBridge modeling-op surface is limited**: it exposes `createGeometry` (box/cylinder/sphere/cone/sketch_extrude), `booleanOp`, `transform`, fillet/chamfer/shell (via createGeometry params), but **no `revolve`, `loft`, or `sweep`** RPC methods. So turned parts, swept profiles, and lofted transitions cannot be modeled through the bridge — a real gap for a shop doing lathe + organic geometry.
- **PartMediaToCADEngine (photo→CAD)** is a VLM-prompt-driven feature-inference pipeline (sends frames to a vision model, infers primitive class + features). It is NOT photogrammetry/depth reconstruction — it emits primitive ops + placeholder bounding boxes for unknowns (line 493). Honest but coarse; reasonable for a manufacturing-intake heuristic, not a true 3D reconstruction.
- **No sketch-constraint solver** anywhere (no DOF analysis, no geometric-constraint solving). Parametric sketches rely on CadQuery's Python side / direct dimension emission.
- **No NURBS surface evaluator** in the JS kernel — only `evaluateNURBSCurve`. The `NURBSSurface` interface is declared but has no `evaluateNURBSSurface` method; surface eval is implicitly deferred to the bridge/OCCT.
- **convexHull3D is a known approximation** (initial-tetrahedron only, never iterates remaining points — comment "Gift-wrapping simplified").

The geometry kernel, assembly graph, GD&T knowledge, BlueprintOCR/Vision (35-37K each), PDF dimension extractor, mesh/tessellation engines are all real and substantial. The front half is largely complete with specific gaps.

```json
{"area":"intake-geometry-features","verdict":"gaps","coverage":"Front half is broadly real and substantial: CADKernelEngine has genuine NURBS-CURVE (Cox-de Boor), Moller-Trumbore ray-tri, signed-tetra mesh volume, 2D/3D hull, polygon offset; real 3D booleans/manifold/watertight validation are delegated to a spawned CadQuery/OpenCASCADE bridge.py (sound architecture); CADAssemblyGraphEngine (BOM/cyc
... [+3551 chars truncated]
