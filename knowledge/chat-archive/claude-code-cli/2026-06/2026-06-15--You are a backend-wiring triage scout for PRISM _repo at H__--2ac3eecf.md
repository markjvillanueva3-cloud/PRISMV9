---
type: "chat-session"
source: "claude-code-cli"
session_id: "2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde"
title: "You are a backend-wiring triage scout for PRISM (repo at H:/prism). Goal: for th"
date: "2026-06-15"
first_ts: "2026-06-15T01:39:49.216Z"
last_ts: "2026-06-15T01:41:46.254Z"
cwd: "H:\\prism-slot-papa"
messages: 92
user_msgs: 44
assistant_msgs: 48
raw_file: "H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-adcd184a50014b374.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:06"
---

# You are a backend-wiring triage scout for PRISM (repo at H:/prism). Goal: for th

> **claude-code-cli** | 2026-06-15 | 92 msgs (44 user / 48 assistant) | cwd: H:\prism-slot-papa
> Raw: `H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-adcd184a50014b374.jsonl`

## Transcript

### User | 2026-06-15T01:39:49.216Z

You are a backend-wiring triage scout for PRISM (repo at H:/prism). Goal: for the 25 unwired "backend-helper" engines, determine each one's correct MCP dispatcher target and whether it's a CLEAN wire (read-only/compute actions with simple JSON params) or DEFERRED (needs deep nested-schema pipeline inputs or JS-closure inputs that can't cross a JSON dispatcher boundary).

Steps (bounded, read-only):
1. Run: `node H:/prism/scripts/papa-pick-next-unwired.mjs` (outputs JSON) to get the 25 engine names.
2. For each engine `<Name>Engine`, read its file at `mcp-server/src/engines/<Name>Engine.ts` (use Read with limit ~120 lines — just the exports, public methods, and input types). Skip the body.
3. Classify the most likely dispatcher by domain:
   - prism_dev (build/test/infra/dev-tooling/metrics)
   - prism_safety (safety/compliance/guard/security)
   - prism_cam / prism_cad / prism_turning / prism_calc (manufacturing physics/toolpath)
   - prism_ai / prism_intelligence (reasoning/ML/learning)
   - prism_automation (GUI/seat automation)
   - UNKNOWN (no clear fit)
4. Mark CLEAN if the engine has ≥2 public methods that take plain-JSON params (strings/numbers/arrays of primitives) and return JSON — i.e. wireable with the proven add-actions+schema+round-trip-test pattern. Mark DEFERRED if methods need ExtractedAction[]/closures/deep nested domain objects.

Return a markdown table: | engine | likely dispatcher | CLEAN/DEFERRED | 1-line reason |, then a final line: "CLEAN count: N / 25". Be concrete from the actual file contents — do not guess from the name alone.

### Assistant | 2026-06-15T01:39:52.429Z

I'll systematically work through this triage task. Let me start by running the script to get the 25 engine names.

### Assistant | 2026-06-15T01:39:52.849Z

[tool_use: Bash]

### User | 2026-06-15T01:39:57.560Z

[tool_result] {
  "headline": {
    "built_engines": 3736,
    "built_with_wiki": 1293,
    "needs_wiring": 53,
    "needs_building_active_units": 3025,
    "needs_frontend_merge_count": 2,
    "pending_milestones_with_activity": 112,
    "drift_milestones": 192,
    "stale_milestones": 204,
    "domains_tracked": 1024
  },
  "sample_total": 25,
  "ready_to_wire": 25,
  "skipped": [],
  "candidates": [
    {
  
... [+5740 chars truncated]

### Assistant | 2026-06-15T01:40:01.225Z

Good, I have all 25 engine names. Now let me read all their files in parallel batches.

### Assistant | 2026-06-15T01:40:02.017Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:02.743Z

[tool_use: Read]

### User | 2026-06-15T01:40:03.599Z

[tool_result] 1	/**
2	 * PlaywrightAutomationEngine — GUI Automation Script Generation for Web-Based CAD
3	 * Generates Playwright automation scripts to control web-based CAD software
4	 * (OnShape, TinkerCAD, FreeCAD web) from extracted video action sequences.
5	 * Includes execution planning to decide between CadQuery and Playwright paths.
6	 */
7	import { log } from "../utils/Logger.js";
8	import type { Extr
... [+3106 chars truncated]

### Assistant | 2026-06-15T01:40:03.676Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:04.069Z

[tool_use: Read]

### User | 2026-06-15T01:40:04.415Z

[tool_result] 1	/**
2	 * MITCourseIntegrationEngine — PP-AGI Academic Course Integration
3	 * ================================================================
4	 * Wires 216+ unused MIT OpenCourseWare courses to PP-AGI domains.
5	 *
6	 * The MIT course archive contains 225 courses but only ~9 are currently
7	 * integrated into PRISM engines. This engine provides:
8	 *
9	 *   1. Load/parse MIT course content fro
... [+3326 chars truncated]

### Assistant | 2026-06-15T01:40:04.887Z

[tool_use: Read]

### User | 2026-06-15T01:40:04.921Z

[tool_result] 1	/**
2	 * EmbeddingGuardEngine — Tiered cosine-similarity gate with injectable embedder
3	 *
4	 * Phase 0.16 U-OP13 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Complements the
5	 * existing TF-IDF-based SemanticSimilarityGuardEngine by evaluating the
6	 * three-band rule (green/yellow/red) against real sentence embeddings
7	 * produced by LocalEmbeddingEngine (or any injected embedder).
8	 *
9	 *  
... [+3394 chars truncated]

### Assistant | 2026-06-15T01:40:05.149Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:05.430Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:06.193Z

[tool_use: Read]

### User | 2026-06-15T01:40:06.493Z

[tool_result] 1	/**
2	 * SemanticAssetIndexEngine — Qdrant-backed semantic index for PRISM assets
3	 *
4	 * Bridges LocalEmbeddingEngine (or Ollama server-side embeddings) and
5	 * QdrantVectorStoreEngine into a single "search PRISM by meaning" surface.
6	 * Hooks and skills call `indexAsset()` at asset-write time and `search()`
7	 * at UserPromptSubmit to surface relevant engines/formulas/tips.
8	 *
9	 * This 
... [+4008 chars truncated]

### Assistant | 2026-06-15T01:40:06.933Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:07.404Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:08.071Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:08.507Z

[tool_use: Read]

### User | 2026-06-15T01:40:08.797Z

[tool_result] 1	/**
2	 * MITCourseExpansionEngine — Additional MIT Courses for U-AWR33
3	 *
4	 * Expands MIT course coverage from 29 to 50+ courses with manufacturing focus.
5	 * Integrates with FormulaOrchestrator for formula registration.
6	 *
7	 * U-AWR33: MIT Deep Integration (9→50+ courses)
8	 *
9	 * @module engines/MITCourseExpansionEngine
10	 */
11	
12	import { log } from "../utils/Logger.js";
13	
14	// 
... [+5799 chars truncated]

### Assistant | 2026-06-15T01:40:09.215Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:09.605Z

[tool_use: Read]

### User | 2026-06-15T01:40:09.824Z

[tool_result] 1	/**
2	 * CounterfactualMillEngine — MILL-AGI-P0/U-P0.2
3	 *
4	 * Milling-specific counterfactual analysis engine that integrates with
5	 * Kienzle force model, Taylor tool life, and deflection physics.
6	 *
7	 * Generates "what if" scenarios for:
8	 *   - Speed/feed variations (±20%, ±50% from baseline)
9	 *   - Tool geometry changes (diameter, flutes, helix)
10	 *   - Engagement patterns (troch
... [+3837 chars truncated]

### User | 2026-06-15T01:40:09.988Z

[tool_result] 1	/**
2	 * ERPImportEngine — Work Order Import from ERP Systems
3	 * =====================================================
4	 *
5	 * Imports work orders, BOMs, and routing data from external
6	 * ERP systems (SAP, Oracle, JobBOSS, E2, etc.)
7	 *
8	 * L2-P4-MS1/P0-U02 — Batch 3: ERP Bridge Engines
9	 *
10	 * @version 1.0.0
11	 */
12	
13	import { z } from "zod";
14	
15	// ─── Schemas ───────────────
... [+3654 chars truncated]

### Assistant | 2026-06-15T01:40:10.360Z

[tool_use: Read]

### User | 2026-06-15T01:40:10.432Z

[tool_result] 1	/**
2	 * MCAT-MS0 P3-U05: Acquisition Recommendation Engine
3	 *
4	 * Generates ranked budget, standard, and premium acquisition recommendations
5	 * with purchase-popup reuse, cutting-data confidence, compatibility scoring,
6	 * ROI calculation, payback analysis, and distributor evidence.
7	 *
8	 * Features:
9	 * - Three-tier recommendations (budget/standard/premium)
10	 * - ROI and payback per
... [+3415 chars truncated]

### Assistant | 2026-06-15T01:40:10.742Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:11.513Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:11.889Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:12.267Z

[tool_use: Read]

### User | 2026-06-15T01:40:13.022Z

[tool_result] 1	/**
2	 * TransferLearningAdapterEngine — Domain Adaptation for Milling Transfer
3	 *
4	 * MILL-AGI Phase 0.4: Online Learning Layer — Unit 5
5	 *
6	 * Enables knowledge transfer between milling domains:
7	 *   - Material-to-material transfer (steel → titanium)
8	 *   - Machine-to-machine transfer (3-axis → 5-axis)
9	 *   - Tool-to-tool transfer (carbide → CBN)
10	 *   - Process-to-process transf
... [+3745 chars truncated]

### Assistant | 2026-06-15T01:40:13.023Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:13.422Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:13.803Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:14.168Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:14.569Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:14.978Z

[tool_use: Read]

### User | 2026-06-15T01:40:15.330Z

[tool_result] 1	/**
2	 * AttractorDetectionEngine — Dynamical Systems Stability Analysis
3	 *
4	 * USSH Phase 0.25: Scientific Foundations — Nonlinear Dynamics
5	 *
6	 * Detects attractors (stable states) in session/hook behavior:
7	 *   - Fixed point detection (equilibria)
8	 *   - Limit cycle detection (periodic orbits)
9	 *   - Basin of attraction estimation
10	 *   - Lyapunov exponent approximation
11	 *   
... [+3388 chars truncated]

### system

... [12 middle messages omitted -- see raw_file] ...

### User | 2026-06-15T01:40:27.357Z

[tool_result] 1	/**
2	 * PactContractTestEngine — U-LPR-CONTRACT
3	 *
4	 * Consumer-driven contract testing for the LATHE-PROD-READY pipeline.
5	 *
6	 * A Pact-style contract captures the exact shape + matchers that a CONSUMER
7	 * expects from a PROVIDER. Verification checks whether a real provider
8	 * output would have been accepted by the consumer at contract time. Breaking
9	 * changes (removed required fi
... [+3689 chars truncated]

### User | 2026-06-15T01:40:27.365Z

[tool_result] 1	/**
2	 * CATIACAAV5BridgeEngine — U-CAD-APP-04 (PHASE-48)
3	 *
4	 * Live bridge between PRISM and Dassault CATIA V5/V6 via the CAA (Component
5	 * Application Architecture) V5 automation surface plus EKL (Engineering
6	 * Knowledge Language) scripting. All transport is injected — `CatiaTransport`
7	 * is typically backed by a CAA-hosted TCP daemon in production or an
8	 * in-memory stub in tests
... [+3841 chars truncated]

### User | 2026-06-15T01:40:27.414Z

[tool_result] 1	/**
2	 * CATIAAddinPluginEngine — U-CAD-APP-05 (PHASE-48)
3	 *
4	 * Declarative spec + resolver for the Dassault CATIA V5/V6 PRISM add-in.
5	 * Unlike Creo's single PRISM ribbon tab, CATIA add-ins live *inside*
6	 * workbenches (Part Design, Assembly Design, Drafting, Sketcher, GSD, DMU,
7	 * Machining) and attach toolbars + commands per workbench. This engine:
8	 *
9	 *   - Holds a declarative 
... [+4148 chars truncated]

### Assistant | 2026-06-15T01:40:31.473Z

Now let me get the remaining public methods for a few engines I need more detail on. Let me check the ones where I need to see more method signatures.

### Assistant | 2026-06-15T01:40:32.255Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:33.011Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:33.826Z

[tool_use: Read]

### User | 2026-06-15T01:40:34.807Z

[tool_result] 120	      cancel_btn: '[data-test="cancel-btn"]',
121	      canvas: "#onshape-canvas",
122	      feature_list: '[data-test="feature-list"]',
123	      dimension_input: 'input[data-test="dimension"]',
124	      sketch_plane_top: '[data-test="plane-top"]',
125	      sketch_plane_front: '[data-test="plane-front"]',
126	      sketch_plane_right: '[data-test="plane-right"]',
127	    },
128	    workflow
... [+3570 chars truncated]

### Assistant | 2026-06-15T01:40:34.990Z

[tool_use: Read]

### User | 2026-06-15T01:40:35.354Z

[tool_result] 120	  citations: string[];
121	}
122	
123	/** Course recommendation result */
124	export interface CourseRecommendation {
125	  problem: string;
126	  recommendedCourses: Array<{
127	    course: MITCourse;
128	    relevanceScore: number;
129	    matchedTopics: string[];
130	    applicableAlgorithms: string[];
131	    rationale: string;
132	  }>;
133	  domainFocus: PPDomain[];
134	  totalMatches: n
... [+1664 chars truncated]

### Assistant | 2026-06-15T01:40:35.450Z

[tool_use: Read]

### User | 2026-06-15T01:40:35.870Z

[tool_result] 120	  name: string;
121	  website?: string;
122	  phone?: string;
123	  availability: "in_stock" | "ships_1_week" | "ships_2_weeks" | "backorder";
124	  price: number;
125	  lead_time_days: number;
126	  minimum_order?: number;
127	}
128	
129	export interface AcquisitionStats {
130	  total_recommendations: number;
131	  by_tier: Record<PriceTier, number>;
132	  average_roi: number;
133	  last_calc
... [+4939 chars truncated]

### Assistant | 2026-06-15T01:40:36.067Z

[tool_use: Read]

### User | 2026-06-15T01:40:36.379Z

[tool_result] 120	   */
121	  registerDomain(domain: DomainDescriptor): void {
122	    this.domains.set(domain.id, { ...domain });
123	  }
124	
125	  /**
126	   * Create a transfer learning task.
127	   */
128	  createTask(
129	    sourceId: string,
130	    targetId: string,
131	    taskType: TransferTask["task_type"],
132	    method?: TransferTask["adaptation_method"]
133	  ): TransferTask {
134	    const sour
... [+1471 chars truncated]

### Assistant | 2026-06-15T01:40:36.515Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:37.256Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:37.976Z

[tool_use: Read]

### User | 2026-06-15T01:40:38.077Z

[tool_result] 120	  constructor(config?: Partial<AttractorConfig>) {
121	    this.config = { ...DEFAULT_CONFIG, ...config };
122	    this.trajectory = [];
123	    this.detectedAttractors = [];
124	  }
125	
126	  /**
127	   * Add a state observation to the trajectory.
128	   */
129	  observe(state: StateVector): void {
130	    this.trajectory.push({
131	      ...state,
132	      timestamp: state.timestamp ?? Dat
... [+1543 chars truncated]

### Assistant | 2026-06-15T01:40:38.730Z

[tool_use: Read]

### Assistant | 2026-06-15T01:40:39.123Z

[tool_use: Read]

### User | 2026-06-15T01:40:39.160Z

[tool_result] 120	  private clearances: QuarantineClearance[] = [];
121	
122	  // ───────────────────────────────────────────────────────────────
123	  // Session lifecycle
124	  // ───────────────────────────────────────────────────────────────
125	
126	  /** Start a new wet-run session in the WET_PASS state (optimistic). */
127	  startSession(input: {
128	    session_id: string;
129	    tenant_id: string;
130
... [+1918 chars truncated]

### Assistant | 2026-06-15T01:40:39.849Z

[tool_use: Read]

### User | 2026-06-15T01:40:40.788Z

[tool_result] 120	}
121	
122	export interface CollisionZone {
123	  stationA: number;
124	  stationB: number;
125	  riskLevel: "none" | "low" | "medium" | "high";
126	  mitigation: string;
127	}
128	
129	export interface InterfaceSpec {
130	  interface: ToolHolderInterface;
131	  maxTorque_Nm: number;
132	  maxRpm: number;
133	  repeatability_mm: number;
134	  stiffness_NPerMm: number;
135	  coolantCapable: boo
... [+1201 chars truncated]

### User | 2026-06-15T01:40:41.409Z

[tool_result] 120	  artifact_id: string;
121	  set_by: string;
122	  approver: string;
123	  reason: string;
124	  set_at: number;
125	}
126	
127	export interface HoldReleaseInput {
128	  artifact_id: string;
129	  released_by: string;
130	  approver: string;
131	  reason: string;
132	  released_at: number;
133	}
134	
135	export interface PurgeCheck {
136	  allowed: boolean;
137	  reason: string;
138	}
139	
140
... [+1615 chars truncated]

### User | 2026-06-15T01:40:41.525Z

[tool_result] 120	}
121	
122	export interface VerificationResult {
123	  interactionId: string;
124	  passed: boolean;
125	  failures: ReadonlyArray<MatchFailure>;
126	  /** Number of matchers that ran, including optional-skipped. */
127	  matchersRun: number;
128	  /** Number of required-path existence checks that ran. */
129	  requiredChecked: number;
130	}
131	
132	export type BreakingChangeKind =
133	  | "r
... [+1802 chars truncated]

### User | 2026-06-15T01:40:41.901Z

[tool_result] 120	            patterns.wait.source !== patterns.signal.source ||
121	            line.indexOf("G127") >= 0 ||
122	            line.indexOf("POST") >= 0 ||
123	            line.indexOf("SIGNAL") >= 0;
124	          if (isDifferent) {
125	            syncPoints.push({
126	              channel: prog.channel,
127	              line_number: i + 1,
128	              code: signalMatch[0],
129	        
... [+949 chars truncated]

### User | 2026-06-15T01:40:42.888Z

[tool_result] 120	        warnings,
121	        errors,
122	        importedAt: new Date().toISOString(),
123	      };
124	    }
125	
126	    const workOrderId = `WO-${++importCounter}`;
127	    importedWorkOrders.set(existingKey, validated);
128	
129	    return {
130	      success: true,
131	      workOrderId,
132	      erpReference: validated.workOrderNumber,
133	      operationsCreated: validated.routing.len
... [+1399 chars truncated]

### User | 2026-06-15T01:40:43.384Z

[tool_result] 120	  }
121	
122	  /**
123	   * Generate measurement summary
124	   */
125	  static generateSummary(
126	    partNumber: string,
127	    workOrderNumber?: string,
128	    serialNumber?: string
129	  ): MeasurementSummary {
130	    const key = serialNumber ? `${partNumber}:${serialNumber}` : partNumber;
131	    const data = measurementData.get(key) || [];
132	
133	    const sources = new Set<Measur
... [+1654 chars truncated]

### Assistant | 2026-06-15T01:40:47.260Z

Now I need a few more method signatures for the remaining engines. Let me check PactContractTestEngine's class methods and TurretLayoutEngine's public methods:

### Assistant | 2026-06-15T01:40:48.796Z

[tool_use: Grep]

### Assistant | 2026-06-15T01:40:49.665Z

[tool_use: Grep]

### Assistant | 2026-06-15T01:40:50.816Z

[tool_use: Grep]

### Assistant | 2026-06-15T01:40:51.945Z

[tool_use: Grep]

### Assistant | 2026-06-15T01:40:52.518Z

[tool_use: Grep]

### User | 2026-06-15T01:40:55.077Z

[tool_result] 157:  if (path === "") return [];
159:    if (/^\d+$/.test(seg)) return Number.parseInt(seg, 10);
167:  for (const seg of segments) {
168:    if (cursor === null || cursor === undefined) return { found: false, value: undefined };
169:    if (typeof seg === "number") {
170:      if (!Array.isArray(cursor)) return { found: false, value: undefined };
171:      if (seg < 0 || seg >= cursor.length) ret
... [+1254 chars truncated]

### User | 2026-06-15T01:40:55.674Z

[tool_result] 235:  constructor(coursesRoot?: string) {
247:  async init(): Promise<void> {
248:    if (this.initialized) return;
267:    if (!this.initialized) {
286:  listCourses(domain?: PPDomain): MITCourse[] {
289:    if (domain) {
302:  getCourse(courseId: string): CourseDetails | null {
308:    if (!course) {
310:      for (const [id, c] of this.courses) {
311:        if (id.toLowerCase() === normalizedI
... [+1147 chars truncated]

### User | 2026-06-15T01:40:55.682Z

[tool_result] 367:  analyzeInterface(
373:    if (!spec) {
389:  compareInterfaces(
401:    if (!spec1 || !spec2) {
414:    if (application.includes("high-speed") || application.includes("precision")) {
415:      if (spec1.maxRpm > spec2.maxRpm) {
423:      if (spec1.repeatability_mm < spec2.repeatability_mm) {
432:    if (application.includes("heavy") || application.includes("power")) {
433:      if (spec1.max
... [+1078 chars truncated]

### User | 2026-06-15T01:40:57.087Z

[tool_result] 208:  getRecommendations(input: AcquisitionInput): TieredRecommendations | null {
210:    if (!binding.success || !binding.context) {
220:      if (item.item_type !== input.item_type && input.item_type !== "any") {
223:      if (!this.isCompatible(item, ctx)) {
226:      if (input.max_budget && item.price > input.max_budget) {
229:      if (input.exclude_owned?.includes(item.id)) {
276:  getBestRe
... [+1218 chars truncated]

### User | 2026-06-15T01:40:57.260Z

[tool_result] 334:  getProfile(software: string): GUIProfile {
342:  generateGUIScript(actions: ExtractedAction[], target: string): PlaywrightScript {
346:    if (actions.length === 0) {
360:    if (profile.url) {
370:    for (const action of actions) {
374:      if (workflow) {
376:        for (const templateStep of workflow) {
385:          if (pwAction.value) {
440:  planExecution(
449:    for (let i = 0; i 
... [+914 chars truncated]

### Assistant | 2026-06-15T01:41:46.254Z

I now have enough information from all 25 engines to produce the full triage table. Here is the complete analysis based directly on the file contents:

---

## Backend-Helper Engine Wiring Triage — 25 Engines

| # | Engine | Likely Dispatcher | CLEAN / DEFERRED | 1-line reason |
|---|--------|-------------------|------------------|---------------|
| 1 | **PlaywrightAutomationEngine** | `prism_automation` | DEFERRED | `generateGUIScript()` takes `ExtractedAction[]` (a JS closure-carrying domain type from VideoActionExtractorEngine); `planExecution()` also requires that type — cannot flatten to plain JSON across a dispatcher boundary |
| 2 | **MITCourseIntegrationEngine** | `prism_intelligence` | CLEAN | `listCourses(domain?)`, `searchCourses(query: string)`, `getCourse(courseId: string)`, `getAlgorithmsFromCourse(courseId)`, `applyToManufacturing(courseId, problem)` — all params are plain strings/enums, all returns are flat JSON |
| 3 | **EmbeddingGuardEngine** | `prism_safety` | DEFERRED | Constructor requires an injected `GuardEmbedder` (interface with async `embed()` method); the dispatcher cannot supply a live embedder instance across a JSON wire — the closure dependency is structural |
| 4 | **SemanticAssetIndexEngine** | `prism_intelligence` | DEFERRED | Constructor requires two injected objects: `QdrantVectorStoreEngine` instance + `IndexEmbedder` instance; both are live dependency-injected objects that cannot serialize to JSON |
| 5 | **MITCourseExpansionEngine** | `prism_intelligence` | CLEAN | Exposes `expandCourses()` returning `CourseExpansionResult` and `getFormulas(domain?)` returning `FormulaEntry[]`; all params are plain strings/enums and output is flat JSON |
| 6 | **CounterfactualMillEngine** | `prism_cam` | CLEAN | Single main method `analyze(baseline: MillingBaselineParams)` where `MillingBaselineParams` is a flat record of numbers/strings/enums; returns `CounterfactualAnalysisResult` (pure JSON) |
| 7 | **ERPImportEngine** | `prism_dev` | CLEAN |
... [+5947 chars truncated]
