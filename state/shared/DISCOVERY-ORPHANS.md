# PRISM Discovery — Orphan Capabilities

**Generated:** 2026-05-02 · §1.7 j-m proactive discovery
**Definition:** Capability that exists on disk (engine, JSDoc-declared action, JSON catalog) but is NOT consumed by any dispatcher action enum AND/OR has zero call sites elsewhere in `src/`.

---

## High-confidence orphans (top 5)

### 1. EspritCAMBridgeEngine — 9 actions declared, 0 wired
- **File:** `mcp-server/src/engines/EspritCAMBridgeEngine.ts`
- **Declared actions** (in JSDoc `@actions` line 26-28): `esprit_extract_project`, `esprit_parse_apt`, `esprit_parse_nc`, `esprit_get_tools`, `esprit_get_operations`, `esprit_push_params`, `esprit_connect`, `esprit_status`, `esprit_sync_tools`
- **Reality:** None of these strings appear in any dispatcher action enum.
- **Impact:** Esprit tier-1 promotion is blocked — bridge is unreachable from MCP. Add to `camDispatcher.ts` action enum + case statements. **Priority: HIGH** (blocks Esprit tier-1).

### 2. Esprit ProfitMilling / ProfitTurning physics
- **File:** `mcp-server/data/cam-functions/esprit/milling.json` + `turning.json` (operations declare `profitmilling_rough` and `profitturning`)
- **Reality:** Function-index returns dialog-tab metadata only. No physics engine computes Esprit's signature ProfitMilling chip-load adaptation, no fz/ae profile generation. Compare to Mastercam's `imachining_*` action family (full physics + g-code).
- **Recommended:** Build `EspritProfitMillingEngine` parallel to `MastercamIMachiningEngine`. **Priority: HIGH** (Esprit's flagship differentiator).

### 3. WEDMPostSodickEngine + WEDMPostAgieEngine — partial controller-quirks coverage
- **Files:** `mcp-server/src/engines/WEDMPostSodickEngine.ts`, `WEDMPostAgieEngine.ts` (both exist)
- **Reality:** Mitsubishi-FA10S has a known JM Die machine + post + dialect verifier; Sodick + AgieCharmilles dialects are referenced in dialect-router but lack JM-fleet test fixtures and tribal-knowledge integration (PRISM-INVENTORY says 5 controller dialects exist; only 1 maps to a JM Die machine).
- **Recommended:** Either acquire a Sodick/Agie test corpus or downgrade these dialects to "library only" status. **Priority: MEDIUM**.

### 4. Lathe LoRA inference / ollama deployer chain — built but consumer-thin
- **Files:** `LatheLoRADeployerEngine.ts`, `LatheLoRAOllamaDeployerEngine.ts`, `LatheLoRAInferenceGatewayEngine.ts`, `LatheLoRAHealthMonitorEngine.ts`, `LatheLoRAVerificationEngine.ts`, `LatheLoRAReasoningChainInferenceEngine.ts`, `LatheLoRADriftDetectorEngine.ts`, `LatheLoRACadenceOrchestratorEngine.ts` (8+ deployment engines)
- **Reality:** `lathe_lora_physics_*` actions wire only the validate/process/kienzle_coefs surface. Inference gateway, health monitor, drift detector, ollama deployer have no dispatcher case statements — they're dead code unless a CLI/cron path consumes them.
- **Recommended:** Wire under a `prism_ai:lathe_lora_*` namespace OR document as cron-driven. **Priority: MEDIUM**.

### 5. Haas master-post action absent despite 2 JM Die mills
- **Files:** Haas referenced in `mcp-server/src/data/jm-die-profile.ts:250-251` (VMC-03 Haas VF-2, VMC-04 Haas OM-2 PRE-NGC) AND in pp_capability registry
- **Reality:** No `master_post_haas_*` action in `camDispatcher.ts` (Hurco, Okuma B250, Okuma OSP, Mitsubishi MV1200R all have one — Haas does not). PPG telemetry shows Haas posts produced via generic Fanuc-dialect path with hand-tuned iMachining hash.
- **Recommended:** Add `master_post_haas_pre_ngc` and `master_post_haas_ngc` actions following the Hurco template at `camDispatcher.ts:5331`. **Priority: HIGH** (2/15 production controllers have no first-class post).

---

## Secondary orphans (lower priority, log only)

- **WEDMArchiveBackfillEngine** — backfill action not exposed; runs only via dev script if at all
- **WEDMNeighborQueryEngine** — graph-attention engine; dispatcher exposes `wedm_lattice_*` and `wedm_gnn_*` but neighbor-query is not a public action
- **Lathe `LatheJMDieKnowledgeEngine`** — JM Die-specific; consumed only by `prismSelfAwarenessEngine.searchTribalKnowledge`, not exposed as a dispatcher action
- **`LatheReplayFrameCompilerEngine`** + `LatheEnvelopeBreachReplayEngine` — replay-class engines without dispatcher actions; appear to feed only `LatheProgramBacktraceEngine`
- **EspritFunctionIndex `mill_turn` and `swiss` sections** — operations declared (4 ops each) but Esprit's mill-turn/Swiss strategies have no `esprit_mill_turn_*` or `esprit_swiss_*` action family (Mastercam, NX, Mastercam, PartMaker all have them)

---

## Methodology
1. Glob engine files matching domain prefix
2. Grep for class name / singleton export in dispatcher action enum
3. If declared in JSDoc `@actions` but absent from enum → orphan
4. Cross-check with consumer call sites under `src/` (excludes test files)
