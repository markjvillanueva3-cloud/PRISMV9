# All-in-One Neural-Network Build Program (2026-06-29, slot:india)

> Operator: "do everything, bypass any domain blocks." Ultracode workflow `wf_9aeaf69f-55a` (8 agents)
> designed the reason-before-action lane + scoped every remaining gap. Full agent output:
> `C:/Users/wompu/AppData/Local/Temp/claude/H--prism/<sid>/tasks/w60l720w4.output`. This spec is the
> main-loop's execution program, with india's R12 corrections folded in.

## Stale-number corrections the workflow surfaced (R12)
- **Gap #4 "~170 unwired engines" is STALE -> actual count is 4** (`audit-unwired-engines.mjs`, 2026-06-29):
  `AuthEngineV7` (->prism_auth), `SFCInferenceGateWireEngine` (->prism_safety, oscar collision),
  `PreMOUKickoffChecklistEngine` (->prism_session?, manual), `BlueprintOCRAdapter` (->prism_cad, delta/xray collision).
  The ~170 predated the 2026-06-10 WIRED-VIA-ENGINE reclassification (`a6dbec1842`).
- **Gap #4 (india AI orphans) already DONE** (verified this session; queue doc corrected `368379d0a0`).
- **RBA already implements ~80% of "approach C"**: `classifyActionRisk` pre-gate (`ReasonBeforeActionEngine.ts:263`),
  `ollamaMaxTokens=RBA_VOTE_MAX_TOKENS=32` (`:86`), `rbaPinnedModels` (`:137`).

## KEYSTONE CORRECTION (india, R12) -- the proposed semaphore does NOT work cross-process
The synthesis chose an **in-process** promise-based priority semaphore at `MultiModelConsensusEngine.callOllama`
(`:1301`) to make the RBA vote jump ahead of fleet Ollama traffic. **This cannot work as a cross-fleet lane:**
- The RBA vote runs inside the **short-lived PreToolUse hook process** (`reason-before-action-gate.mjs` loads
  the engine in-process). Background Ollama traffic (MCP server :3100, embed/prewarm hooks, ask-ollama, vision
  OCR) runs in **separate OS processes**. An in-process JS semaphore only orders calls **within one process** --
  it cannot hold back another process's `/api/generate`.
- `MultiModelConsensusEngine` **already** serializes its two voices in-process (`:824-833`), so the semaphore is
  redundant for the only thing it could actually gate.
- A genuine cross-process priority lane needs a **file-lease** (RBA writes a high-pri lease; every Ollama caller
  checks+backs-off) or the rejected **broker** (113 fetch sites / 62 files / new SPOF). Both are larger projects.
- **Conclusion:** do NOT build the in-process semaphore (it would be a non-working keystone -- the "built but
  dead" trap). The honest RBA improvements are the cache + warm-pin (below); peak-load fail-open is a documented,
  monitored limitation, and the true cross-process lane is queued as a separate scoped project.

## EXECUTION ORDER (ROI x safety x readiness; each = full WIRE->TEST->VALIDATE per R15)

### P1 -- Gap #5: close the open-loop generation pipelines (FIRST -- concrete, safe, high-value, DATA-only)
Make 4 pipelines emit a DATA/provenance outcome record (fire-and-forget try/catch, NEVER NN inference, never on
the critical path -- R12). Feeds the OutcomeBus -> LoRA/GNN learning signal ("trains/learns").
1. **Prereq:** add `setup_sheet` `traveler` `doc_read` `fusion_bridge` to `OutcomeDomain` enum
   (`mcp-server/src/schemas/outcomeEventSchema.ts:108`).
2. `SetupSheetPipelineEngine.ts` `generate()` (~:178) -- sync, simplest.
3. `JobTravelerEngine.ts` `completeStep()` (~:548) + `createTraveler()` (~:397).
4. `AutodeskFusionMCPProxyEngine.ts` `callTool()` (:193) -- async, try/catch so Fusion errors stay non-fatal.
5. `blueprint-vision/documentExtractionRouter.ts` `routeDocumentToConsumers()` (:187).
Dedup confirmed: none of the 4 import `OutcomeTraceEngine` today (grep). Schemas per SCOPE-5 in the .output.

### P2 -- Gap #1: RBA safe deltas (the parts that actually work in the hook process)
- PROCEED-only, **full-payload-hashed**, short-TTL vote cache (`scripts/lib/rba-cache.mjs` or inline) -- cache
  PROCEED only, never BLOCK/REVISE; key on the normalized payload hash, never an "action signature" (collision =
  stale-PROCEED danger). Cuts repeat votes.
- Warm-pin (component A): prewarm issues `keep_alive` for the 2 pinned VL models so cold-load never fail-opens.
- Do NOT narrow the vote set (design panel: narrowing moves the safety boundary into a regex -> silent false-PROCEED).
- Wire RBA **advise-only** (`PRISM_RBA_GATE_ENABLE=1`, NOT `ENFORCE`); the pre-gate keeps the common path at
  zero model calls so fleet latency impact is bounded to genuinely HIGH-risk actions. Enforce stays operator-only.
- Document peak-load fail-open + the cross-process lease/broker as the future true-lane.

### P3 -- Gap #4: wire the 4 real unwired engines (DATA-safe only, R12)
`AuthEngineV7`->prism_auth + `PreMOUKickoffChecklistEngine` (low collision); coordinate oscar before
`SFCInferenceGateWireEngine`->prism_safety and delta/xray before `BlueprintOCRAdapter`->prism_cad.
Clone the INDIA_AI_ORPHAN wire pattern; NEVER insert a case-with-body into a bare fall-through chain
(`U-XPROC-FALLTHROUGH-RESTORE` lesson).

### P4 -- Gap #3: auto-storage CONTRACT (not a new abstraction)
SCOPE-3 verdict: do NOT build an `AutoStorageRouter` (the 5 pipelines have incompatible latency envelopes). Build
a frozen `scripts/lib/auto-storage-contract.mjs` `STORAGE_ROUTES` registry (dataType/schema/entryPoint/trigger/
consumers) + test + `prism_dev:storage_route_map` discoverability action. ~80 lines, no pipeline re-impl.

## Gap #2 (auto-synergize loop) -- DONE this session (`be1f61ec20`+`39646be02e`+`368379d0a0`).
