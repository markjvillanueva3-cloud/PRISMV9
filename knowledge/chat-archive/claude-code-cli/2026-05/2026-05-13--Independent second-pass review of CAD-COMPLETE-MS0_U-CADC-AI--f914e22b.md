---
type: "chat-session"
source: "claude-code-cli"
session_id: "f914e22b-1749-4c69-9319-e54bed30f320"
title: "Independent second-pass review of CAD-COMPLETE-MS0/U-CADC-AI03 CADCapabilityNego"
date: "2026-05-13"
first_ts: "2026-05-13T15:10:58.431Z"
last_ts: "2026-05-13T15:12:11.392Z"
cwd: "H:\\prism\\mcp-server"
messages: 21
user_msgs: 10
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/f914e22b-1749-4c69-9319-e54bed30f320/subagents/agent-ae02830c5c2ca356c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Independent second-pass review of CAD-COMPLETE-MS0/U-CADC-AI03 CADCapabilityNego

> **claude-code-cli** | 2026-05-13 | 21 msgs (10 user / 11 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/f914e22b-1749-4c69-9319-e54bed30f320/subagents/agent-ae02830c5c2ca356c.jsonl`

## Transcript

### User | 2026-05-13T15:10:58.431Z

Independent second-pass review of CAD-COMPLETE-MS0/U-CADC-AI03 CADCapabilityNegotiatorEngine. Focus on what a content-specialist reviewer is unlikely to catch — test integrity, mock pollution, edge-case coverage, naming/convention drift, inlined constants, dispatcher round-trip authenticity. Under 350 words.

FILES (read end-to-end):
1. H:/prism/mcp-server/src/engines/CADCapabilityNegotiatorEngine.ts (NEW, ~400 LOC) — negotiate/negotiateOrThrow/listGaps + UnsupportedCapabilityError + tryGetCapabilities defensive helper
2. H:/prism/mcp-server/src/__tests__/CADCapabilityNegotiatorEngine.test.ts (NEW, 28 it() cases across 9 describe blocks) — unit tests against real CADAdapterRegistry adapters
3. H:/prism/mcp-server/src/__tests__/CADCapabilityNegotiator.dispatcher.test.ts (NEW, 8 it() cases) — round-trip via captured handler from registerCadDispatcher(fakeServer)
4. H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts — 3 case handlers + z.enum entry + getEngine() registration

REVIEW DIMENSIONS:
1. **Test integrity**: any `.toBeUndefined()` / `.toBeDefined()` / `.toBeTruthy()` weak assertions (legitimacy-gate rejects these)? Use Object.keys().not.toContain() or positive checks.
2. **Mock pollution**: tests should use real CADAdapterRegistry adapters, not mocked. SUT must run actual code paths.
3. **Coverage of failure modes**: empty inputs, invalid policy, NaN/non-string opaque inputs, unknown CADSystemId, all-excluded scenario, broken adapter scenario.
4. **Variability**: spans all working CAD adapters from the registry (freecad/fusion360/inventor at least — mastercam is broken pre-existing).
5. **Naming conventions**: snake_case for action names ✓ — verify. PascalCase for engine ✓.
6. **Inlined constants**: any magic numbers? Specifically SCHEMA_VERSION usage and SIM_WEIGHT_* constants from CADAdapterRegistry — engine references those?
7. **Backward compatibility**: does adding the 3 new dispatcher cases break any existing actions? Both negotiator dispatcher t
... [+885 chars truncated]

### Assistant | 2026-05-13T15:11:11.648Z

I'll review the CADCapabilityNegotiatorEngine files independently, focusing on the dimensions specified.

### Assistant | 2026-05-13T15:11:11.982Z

[tool_use: Read]

### Assistant | 2026-05-13T15:11:12.332Z

[tool_use: Read]

### Assistant | 2026-05-13T15:11:12.828Z

[tool_use: Read]

### User | 2026-05-13T15:11:14.251Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CADCapabilityNegotiatorEngine.ts' was already read 2s ago in this session and is unchanged (mtime 1778682774821). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### User | 2026-05-13T15:11:18.753Z

[tool_result] 1	/**
2	 * CADCapabilityNegotiatorEngine — tests
3	 *
4	 * CAD-COMPLETE-MS0 / U-CADC-AI03
5	 *
6	 * Acceptance under test: "Intent referencing unsupported op either degrades
7	 * gracefully (configurable) or throws UnsupportedCapabilityError with named
8	 * op."
9	 *
10	 * Coverage:
11	 *   - Module surface (singleton + class export + policy enum + default policy).
12	 *   - Happy paths: preferred
... [+22042 chars truncated]

### User | 2026-05-13T15:11:18.760Z

[tool_result] 1	/**
2	 * CADCapabilityNegotiator — dispatcher round-trip test
3	 *
4	 * CAD-COMPLETE-MS0 / U-CADC-AI03
5	 *
6	 * Verifies that the prism_cad dispatcher actually routes the 3 new actions
7	 * (cad_capability_negotiate / cad_capability_negotiate_or_throw /
8	 * cad_capability_list_gaps) through to the negotiator engine — not just
9	 * that the singleton works in isolation. Per CLAUDE.md wiring rul
... [+8523 chars truncated]

### Assistant | 2026-05-13T15:11:28.025Z

[tool_use: Read]

### Assistant | 2026-05-13T15:11:28.774Z

[tool_use: Read]

### Assistant | 2026-05-13T15:11:29.777Z

[tool_use: Grep]

### User | 2026-05-13T15:11:30.040Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CADCapabilityNegotiatorEngine.ts' was already read 19s ago in this session and is unchanged (mtime 1778682774821). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_
... [+13 chars truncated]

### User | 2026-05-13T15:11:33.131Z

[tool_result] 70:    case "capNegotiator": return _capNegotiator ??= (await import("../../engines/CADCapabilityNegotiatorEngine.js")).cadCapabilityNegotiatorEngine;
124:  "cad_capability_negotiate", "cad_capability_negotiate_or_throw", "cad_capability_list_gaps",
697:          case "cad_capability_negotiate": {
708:          case "cad_capability_negotiate_or_throw": {
719:          case "cad_capability_list_gap
... [+5 chars truncated]

### User | 2026-05-13T15:11:33.138Z

[tool_result] 1	/**
2	 * prism_cad — CAD/Geometry Dispatcher
3	 *
4	 * 71 actions: geometry (3), mesh (3), feature (2), stock/wcs/dfm (5), grasshopper (4),
5	 *   sketch (5), part (7), part_library (2), assembly (6),
6	 *   cad_taxonomy (9), cadquery (5), f360_codegen (4), f360_live (14), blueprint (2)
7	 *
8	 * Engine dependencies: CADKernelEngine, GeometryEngine, MeshEngine,
9	 *   FeatureRecognitionEngine, S
... [+8622 chars truncated]

### Assistant | 2026-05-13T15:11:38.727Z

[tool_use: Read]

### Assistant | 2026-05-13T15:11:39.699Z

[tool_use: Read]

### Assistant | 2026-05-13T15:11:40.700Z

[tool_use: Grep]

### User | 2026-05-13T15:11:45.831Z

[tool_result] 690	          }
691	          case "cad_taxonomy_suggest": {
692	            const tx = await getEngine("cadTaxonomy");
693	            result = tx.suggestForUseCase(params.description ?? "");
694	            break;
695	          }
696	          // ── CAD Capability Negotiator — CAD-COMPLETE-MS0/U-CADC-AI03 ──
697	          case "cad_capability_negotiate": {
698	            const eng = await getEn
... [+2223 chars truncated]

### User | 2026-05-13T15:11:48.365Z

[tool_result] 115	  "part_template_bracket",
116	  "part_library_create", "part_library_list_types",
117	  "assembly_create", "assembly_add_component", "assembly_add_mate",
118	  "assembly_position", "assembly_bom", "assembly_to_cadquery",
119	  // CAD Operation Taxonomy
120	  "cad_taxonomy_lookup", "cad_taxonomy_list", "cad_taxonomy_generate",
121	  "cad_taxonomy_aerospace", "cad_taxonomy_search", "cad_taxonom
... [+1213 chars truncated]

### User | 2026-05-13T15:11:49.390Z

[tool_result] src\schemas\cadActionSchemas.ts-605-  wcs_setup: wcsSetupSchema,
src\schemas\cadActionSchemas.ts-606-  dfm_check: dfmCheckSchema,
H:\prism\mcp-server\src\schemas\cadActionSchemas.ts-607-  // CAD Capability Negotiator — CAD-COMPLETE-MS0/U-CADC-AI03
src\schemas\cadActionSchemas.ts:608:  cad_capability_negotiate: z.object({
src\schemas\cadActionSchemas.ts-609-    ops: z.array(z.string()).describe("Or
... [+1964 chars truncated]

### Assistant | 2026-05-13T15:12:11.392Z

I have enough context now. Full review:

```
VERDICT: PASS
P0 findings: none
P1 findings: none
P2 findings:
  - test L489 `expect(candidate.supportedOps.length).toBe(1)` assumes dedup collapses to exactly one entry — correct, but if a future op-kind dedup change reshapes the array this is brittle; consider `.toContain(universalOp)` + `.length === 1` paired.
  - dispatcher test invoke() helper L57-90 elegantly handles both response shapes, but the `__unparsed` fallback on JSON.parse failure (L70) silently swallows the parse error — a malformed JSON payload would yield `{ ok:true, payload:{__unparsed} }` and downstream assertions would fail with a confusing message rather than a parse-error message. Cosmetic.
  - engine test L388/396 uses regex `/UNKNOWN_CAD_SYSTEM|not registered/i` — broad but acceptable; tighter would be `.rejects.toBeInstanceOf(UnknownCADSystemError)` (the class is already imported).
  - test L526 confines variability assertion to `working.length >= 3` — fine given mastercam is known-broken, but consider an explicit comment naming which adapters are expected (freecad/fusion360/inventor) to make future registry shrinkage loud rather than silent.
Confidence: 0.92
```

**Test integrity:** All assertions are positive/semantic — no `.toBeUndefined()` / `.toBeDefined()` / `.toBeTruthy()` stubs. Error-class checks use `toBeInstanceOf` + concrete field equality. `toEqual([])` on missingOps + `?? []` fallback for slimResponse-stripped fields is correct.

**Mock pollution:** Zero. Both files exercise real `CADAdapterRegistry` via `getCADAdapter()` and dynamic `snapshotAllAdapters()` discovery. Dispatcher test uses real `registerCadDispatcher` against a thin fake server that only captures the handler — SUT code path is genuine.

**Failure-mode coverage:** Empty ops (L176/188), duplicate-collapse (L194), non-array ops (L405), bad policy (L413), null intent (L422), unknown preferred (L381), unknown excluded (L390), all-excluded (L364), strict-throw (L260/272), 
... [+1619 chars truncated]
