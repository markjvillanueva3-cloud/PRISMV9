---
type: "chat-session"
source: "claude-code-cli"
session_id: "f40fff31-cb37-49ea-9b03-5d4d750b18f3"
title: "Independent review of dispatcher wiring for 4 new engines on the PRISM CNC platf"
date: "2026-05-22"
first_ts: "2026-05-22T17:36:20.821Z"
last_ts: "2026-05-22T17:40:09.540Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 16
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-af02d01fe44ecf533.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Independent review of dispatcher wiring for 4 new engines on the PRISM CNC platf

> **claude-code-cli** | 2026-05-22 | 37 msgs (16 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-af02d01fe44ecf533.jsonl`

## Transcript

### User | 2026-05-22T17:36:20.821Z

Independent review of dispatcher wiring for 4 new engines on the PRISM CNC platform (milestone CAD-COMPLETE-MS0). The last 4 commits on HEAD (subjects "[CAD-COMPLETE-MS0]/U-AI-*") added 16 new actions to the `prism_cad` dispatcher.

FILES:
1. H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts — the dispatcher. New actions (search "U-AI-" and "CAD-COMPLETE-MS0"): cad_uom_resolve, cad_uom_resolve_batch, cad_uom_convert, cad_risk_classify, cad_risk_classify_batch, cad_risk_classify_plan, cad_breaker_can_proceed, cad_breaker_record_success, cad_breaker_record_failure, cad_breaker_state, cad_breaker_snapshot, cad_breaker_configure, cad_fallback_route, cad_fallback_register, cad_fallback_list, cad_fallback_reset.
2. H:/prism/mcp-server/src/schemas/cadActionSchemas.ts — Zod schemas for all 16 actions (search "U-AI-").
3. The 4 engines they call, under H:/prism/mcp-server/src/engines/: UnitOfMeasureDisambiguationEngine.ts, RiskTierClassifierEngine.ts, CADAppCircuitBreakerEngine.ts, CADFallbackRoutingEngine.ts — verify the dispatcher calls their REAL exported method signatures.

The project `npx tsc --noEmit` reports 0 errors.

WHAT TO CHECK — flag P0 (wiring/contract break), P1 (real defect), P2/P3 (minor):
- Action enum ↔ case-statement parity: every one of the 16 action strings in the ACTIONS array has exactly one matching `case`, and no orphan cases. Note some actions share a fall-through case group (cad_breaker_*) — verify each grouped action is correctly handled inside.
- Each case calls the engine's actual method with correct argument shapes (the engines export singletons: unitOfMeasureDisambiguationEngine, riskTierClassifierEngine, cadAppCircuitBreakerEngine, cadFallbackRoutingEngine).
- Lazy import paths correct; return shape `{ success: true, data: ... }`; required-param validation present, missing/invalid params produce `dispatcherError(...)` not a crash.
- Every action has a corresponding Zod schema entry in cadActionSchemas.ts with `.describe()` on each 
... [+247 chars truncated]

### Assistant | 2026-05-22T17:36:38.319Z

I'll systematically read all relevant files before making any findings.

### Assistant | 2026-05-22T17:36:38.928Z

[tool_use: Read]

### Assistant | 2026-05-22T17:36:39.283Z

[tool_use: Read]

### User | 2026-05-22T17:37:00.434Z

[tool_result] File content (263.7KB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-05-22T17:37:10.350Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1050 of 1612 total (32598 tokens, cap 25000). Call Read with offset=1051 limit=1050 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * CAD Dispatcher Action Schemas
3	 *
4	 * Zod schemas for prism_cad dispatcher actions.
5	 * Pe
... [+51711 chars truncated]

### Assistant | 2026-05-22T17:37:14.058Z

Now let me read the dispatcher file in sections focused on the 16 new actions:

### Assistant | 2026-05-22T17:37:15.702Z

[tool_use: Grep]

### Assistant | 2026-05-22T17:37:16.647Z

[tool_use: Read]

### User | 2026-05-22T17:37:25.256Z

[tool_result] 439-  "cad_corpus_catalog_merge",      // fold two chunk catalogs into one
440-  "cad_corpus_catalog_stats",      // aggregate catalog-builder counters
441-  // CAD-COMPLETE-MS0/U-AI-03 — UnitOfMeasureDisambiguationEngine (mm/inch resolver)
442:  "cad_uom_resolve",               // resolve one dimensional value (explicit or implicit) → canonical mm
443:  "cad_uom_resolve_batch",         // resolve
... [+8408 chars truncated]

### User | 2026-05-22T17:37:29.713Z

[tool_result] 1051	  parts: z.array(z.object({
1052	    customerName: z.string().min(1),
1053	    partNumber: z.string().min(1),
1054	    features: z.unknown().optional(),
1055	    needsHumanReason: z.string().optional(),
1056	  })).describe("Explicit parts list — production callers feed from PartFolderOrganizerEngine + macroNeedsFill scan."),
1057	  borderlineThreshold: z.number().min(0.70).max(2.0).optional()
... [+30241 chars truncated]

### Assistant | 2026-05-22T17:37:33.371Z

Now let me read the specific dispatcher sections for the 16 new actions, plus the four engine files:

### Assistant | 2026-05-22T17:37:35.373Z

[tool_use: Grep]

### Assistant | 2026-05-22T17:37:35.751Z

[tool_use: Read]

### User | 2026-05-22T17:37:43.923Z

[tool_result] 442:  "cad_uom_resolve",               // resolve one dimensional value (explicit or implicit) → canonical mm
443:  "cad_uom_resolve_batch",         // resolve a batch; earlier values anchor the unit for later ones
444:  "cad_uom_convert",               // explicit numeric mm↔inch conversion
446:  "cad_risk_classify",             // classify one CAD operation → low/medium/high/critical
447:  "cad_
... [+2781 chars truncated]

### User | 2026-05-22T17:37:45.708Z

[tool_result] 1	/**
2	 * UnitOfMeasureDisambiguationEngine — CAD-COMPLETE-MS0 / U-AI-03
3	 * ===============================================================
4	 *
5	 * Resolves dimensional values — explicit ("0.5\"", "12.7 mm") OR implicit
6	 * (a bare number "0.5") — to a canonical unit (millimetres) for the CAD
7	 * agent. The agent receives free-text dimensions from voice, blueprints,
8	 * and chat; a wrong m
... [+13033 chars truncated]

### Assistant | 2026-05-22T17:37:50.244Z

[tool_use: Read]

### Assistant | 2026-05-22T17:37:50.507Z

[tool_use: Read]

### User | 2026-05-22T17:38:02.108Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CADAppCircuitBreakerEngine.ts' was already read 39s ago in this session and is unchanged (mtime 1779470503796). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### User | 2026-05-22T17:38:02.237Z

[tool_result] 1	/**
2	 * RiskTierClassifierEngine — CAD-COMPLETE-MS0 / U-AI-12
3	 * ======================================================
4	 *
5	 * Classifies a CAD operation into a risk tier — low / medium / high /
6	 * critical — so the CAD agent knows which operations may run unattended
7	 * and which require operator confirmation. An autonomous boolean-cut on
8	 * an already-machined feature is unrecoverab
... [+9691 chars truncated]

### Assistant | 2026-05-22T17:38:08.303Z

Let me read the circuit breaker engine and fallback routing engine:

### Assistant | 2026-05-22T17:38:10.004Z

[tool_use: Grep]

### Assistant | 2026-05-22T17:38:10.041Z

[tool_use: Read]

### User | 2026-05-22T17:38:12.612Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CADFallbackRoutingEngine.ts' was already read 51s ago in this session and is unchanged (mtime 1779470793462). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### User | 2026-05-22T17:38:14.490Z

[tool_result] 23:export type BreakerState = "closed" | "open" | "half_open";
26:export interface BreakerConfig {
37:export const DEFAULT_BREAKER_CONFIG: BreakerConfig = {
45:export interface AppBreakerSnapshot {
66:export interface ProceedDecision {
92:export class CADAppCircuitBreakerEngine {
297:export const cadAppCircuitBreakerEngine = new CADAppCircuitBreakerEngine();
300:export function createCADAppCircuit
... [+56 chars truncated]

### Assistant | 2026-05-22T17:38:17.473Z

[tool_use: Grep]

### Assistant | 2026-05-22T17:38:18.494Z

[tool_use: Grep]

### User | 2026-05-22T17:38:21.031Z

[tool_result] No matches found

### User | 2026-05-22T17:38:21.149Z

[tool_result] 19:export interface CADAppProfile {
30:export interface RouteRequest {
40:export interface RouteCandidate {
49:export interface RouteDecision {
59:export class CADFallbackRoutingEngine {
197:export const cadFallbackRoutingEngine = new CADFallbackRoutingEngine();

### Assistant | 2026-05-22T17:38:25.783Z

[tool_use: Grep]

### Assistant | 2026-05-22T17:38:26.619Z

[tool_use: Grep]

### User | 2026-05-22T17:38:30.534Z

[tool_result] 98:  configure(appId: string, config: Partial<BreakerConfig>): AppBreakerSnapshot {
115:  canProceed(appId: string): ProceedDecision {
159:  recordSuccess(appId: string): AppBreakerSnapshot {
180:  recordFailure(appId: string, error?: string): AppBreakerSnapshot {
202:  getState(appId: string): AppBreakerSnapshot {
207:  snapshot(): AppBreakerSnapshot[] {
212:  reset(appId?: string): void {

### User | 2026-05-22T17:38:30.537Z

[tool_result] 64:  register(profile: CADAppProfile): void {
86:  listApps(): CADAppProfile[] {
91:  reset(): void {
99:  route(request: RouteRequest, apps?: CADAppProfile[]): RouteDecision {

### Assistant | 2026-05-22T17:38:34.109Z

Now let me read the specific dispatcher lines for the breaker group's `cad_breaker_configure` branch and the uom/risk import lines:

### Assistant | 2026-05-22T17:38:34.798Z

[tool_use: Read]

### User | 2026-05-22T17:38:38.935Z

[tool_result] 4640	            const { cadReverseCorpusCatalogEngine } = await import("../../engines/CADReverseCorpusCatalogEngine.js");
4641	            result = { success: true, data: cadReverseCorpusCatalogEngine.mergeCatalogs(params.a, params.b) };
4642	            break;
4643	          }
4644	          case "cad_corpus_catalog_stats": {
4645	            const { cadReverseCorpusCatalogEngine } = await impor
... [+10197 chars truncated]

### Assistant | 2026-05-22T17:40:09.540Z

I now have all the data needed. Here is the complete wiring review.

---

## Dispatcher Wiring Review — CAD-COMPLETE-MS0 (16 new actions)

### Scope

4 engines, 16 actions added to `prism_cad` (`cadDispatcher.ts`).

---

### Engine 1: UnitOfMeasureDisambiguationEngine

**File:** `H:/prism/mcp-server/src/engines/UnitOfMeasureDisambiguationEngine.ts`
**Singleton export:** `unitOfMeasureDisambiguationEngine` — confirmed at line 311.
**Actions:** `cad_uom_resolve`, `cad_uom_resolve_batch`, `cad_uom_convert`

```json
{
  "engine": "UnitOfMeasureDisambiguationEngine",
  "file": "mcp-server/src/engines/UnitOfMeasureDisambiguationEngine.ts",
  "dispatcher": "cadDispatcher",
  "z_enum": true,
  "case_statement": true,
  "lazy_import": true,
  "schema": true,
  "action_unique": true,
  "exported": true,
  "issues": [
    {
      "severity": "P1",
      "rule": "Schema/dispatcher param mismatch — cad_uom_resolve",
      "detail": "The Zod schema in ACTION_CAD_SCHEMAS defines 'input' as required (z.union([z.string(), z.number()])). The dispatcher case at line 4651 reads 'params.input ?? params.value ?? params.raw' — the alias fallbacks 'params.value' and 'params.raw' are not declared in the schema. A caller who passes {value: '12.7 mm'} passes Zod validation (strict is NOT set on this schema — it uses a plain z.object(), so extra fields pass silently), hits the dispatcher alias, and works. This is benign at runtime but the schema falsely promises 'input' is the only accepted name. Conversely, if upstream code validates the schema before dispatching, a caller passing only 'raw' would be rejected at the schema level but succeed at the dispatcher. The mismatch is an undocumented API surface, not a crash, but it violates the 'schema is the contract' discipline."
    },
    {
      "severity": "P2",
      "rule": "cad_uom_resolve_batch schema missing .strict()",
      "detail": "All three UoM schemas use a plain z.object() without .strict(). All other CAD-COMPLETE-MS0 schemas in thi
... [+13263 chars truncated]
