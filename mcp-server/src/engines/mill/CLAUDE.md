# Mill Galaxy — slot:foxtrot
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = mill-domain doctrine ONLY; never re-inline universal prose.

---

## §1 Domain scope + slot identity

**Owns:** face milling, end milling (square/ball/bull-nose/tapered), pocket, contouring, helical interpolation, ramping, plunging, profiling, slotting, thread milling, chamfering, deburring, engraving, drilling-via-mill (helical drilling), 3-axis + indexed 4th/5th + simultaneous 5-axis.

**EXCLUDES:** turning → whiskey (`../lathe/`); wire-EDM → mike (`../wedm/`); G-code emission / post-processor → echo (`../post-processor/`); additive (no canonical galaxy).

**Slot:** foxtrot (primary). Worktree: `H:/prism-slot-foxtrot`, branch `slot/foxtrot`.
HyperMILL CAM bridge is a sub-galaxy at `mcp-server/src/engines/hypermill/` — foxtrot owns it.
Mill engine `.ts` files live flat in `mcp-server/src/engines/` (not yet migrated into `mill/` subdir).

---

## §2 Verified engines

All confirmed present via `ls` on disk this session.

| Role | Engine file (`mcp-server/src/engines/`) |
|------|-----------------------------------------|
| Chip-load monitor (adaptive) | `AdaptiveMillingChipLoadMonitorEngine.ts` |
| Strategy registry (HSM/troch/adaptive/peel) | `AdvancedMillingStrategiesEngine.ts` |
| Cutting force model | `MillingForceEngine.ts` |
| AGI top-level orchestrator | `MillingAGIMasterEngine.ts` |
| Cycle-time / feed optimizer | `MillProgramOptimizerEngine.ts` |
| Neural strategy recommendation | `MillStrategyNeuralEngine.ts` |
| Kinematics + collision | `MillKinematicsCollisionEngine.ts` |
| Trochoidal strategy + entry-angle validation | `TrochoidalMillingEngine.ts` |
| Mill-turn CAD/CAM I/O bridge | `Fusion360MillTurnBridgeEngine.ts` |
| Ball-end geometry + scallop | `BallEndMillEngine.ts` |
| Op-specific physics | `ChamferMillingEngine.ts` · `HelicalMillingEngine.ts` · `HighFeedMillingEngine.ts` |
| Hurco V11 post (mill) | `HurcoV11MillMasterPostEngine.ts` |
| HyperMILL orchestrator | `HyperMillAIOrchestrationEngine.ts` |
| HyperMILL cycle/param registry | `HyperMillCycleCatalogEngine.ts` // UNVERIFIED individual file |
| HyperMILL script emit | `HyperMillCodeGeneratorEngine.ts` // UNVERIFIED individual file |

Before creating any new mill engine: `duplicationGuardEngine.mustCheckBeforeCreating()` + check `ENGINE_DIGEST.md`.

---

## §3 Dispatcher quick-ref

**Primary:** `prism_mill` (49 actions). NEVER full-read `millDispatcher.ts` (217K) — grep the action name, read only that case block.

| Action | Use |
|--------|-----|
| `mill_print_to_program` | full print → G-code pipeline |
| `mill_strategy_select` | strategy selection (HSM / trochoidal / adaptive / peel) |
| `mill_strategy_recommend` | neural strategy recommendation |
| `mill_strategy_compare` | compare strategies for a feature |
| `mill_physics_force` | Kienzle cutting force + MRR |
| `mill_physics_tool_life` | Taylor tool-life prediction |
| `mill_collision_check` | toolpath collision + clearance |
| `mill_kinematics_verify` | 5-axis RTCP + singularity detection |
| `mill_agi_orchestrate` | AGI full orchestration |
| `mill_agi_quick_analyze` | fast AGI feature analysis |
| `mill_validate_program` | post-program validation gate |
| `mill_validate_safety` | S(x) safety gate (must pass ≥ 0.98) |
| `mill_hm_fixture_vises` | HyperMILL fixture DB — list vises |
| `mill_hm_fixture_auto_select` | auto-select fixture for part dims |
| `mill_hm_fixture_search` | search fixture by query |

**Supporting dispatchers:**
- `prism_calc:{kienzle_force, milling_forces, chip_thinning_*}` — physics primitives
- `prism_safety:validate_physics` — S(x) ≥ 0.98 gate before ANY cutting recommendation
- `prism_knowledge:tribal_search slot=foxtrot` — domain tribal query

**MCP-down fallback:** `node mcp-server/scripts/mill-offline-calc.mjs` (if port 3100 is down — verify path before use; `// UNVERIFIED exact script name`).

---

## §4 Canonical constants + data paths

**NEVER inline Kienzle / Taylor / material constants.** Import from `mcp-server/src/physics/constants.ts`. Enforced by `stop_on_inlined_constants.mjs` (Stop hook).

| Constant family | Symbol | Common mill use |
|-----------------|--------|-----------------|
| Kienzle kc1.1 per ISO group (P=1800 M=2100 K=1100 N=700 S=2800 H=3200) | `KIENZLE_KC` | Cutting force |
| Kienzle mc exponent | `KIENZLE_MC` | Chip-thickness scaling |
| Taylor C, n per (material, coating, geometry) | `TAYLOR_PARAMS` | Tool-life prediction |
| Material density / hardness / spec cutting energy | `mcp-server/src/registries/materials.ts` | MRR + thermal |
| Tool geometry defaults (helix, rake, clearance, edge radius) | `mcp-server/src/registries/tools.ts` | Chip-load + entry-angle |
| Per-machine spindle power curves (ISO 14955) | `mcp-server/src/data/jm-die-profile.ts` (VMC-01..05) | Power-budget gate |

Import pattern: `import { KIENZLE_KC } from "../physics/constants.js"` (`.js` suffix — NodeNext resolution).

NEVER full-read `ToolpathStrategyRegistry.ts` (197K) — grep the strategy name first.

---

## §5 Domain gotchas / safety rails

1. **Chip-thinning correction is NON-OPTIONAL for radial engagement < 50% cutter diameter.** Bare chip-load uses table value; effective chip-load requires chip-thinning factor. Use `AdvancedMillingStrategiesEngine` canonical formula — never re-derive.

2. **Tool deflection scales as L³ for cantilever overhang.** 4×D overhang ≈ 1.6 mm deflection at 1000 N radial force in 4140. Always check stickout × radial force × material modulus before recommending high-engagement strategies.

3. **Spindle power gate: S(x) ≥ 0.98 required (shop_floor tier).** Power = (Kienzle force × cutting velocity) / efficiency. Call `prism_safety:validate_physics` — rejects budgets exceeding installed-machine HP minus 20% headroom. Never skip.

4. **HyperMILL `<Coolant>` block 2-char vs 4-char format split.** 4-char format breaks Hurco WinMax (V11). Never assume the same coolant block transfers across posts — query the post-specific bridge. See `HurcoV11MillMasterPostEngine.ts`.

5. **Trochoidal entry angle <90° is the bug origin.** Safe default: flat (90°) profile. Validate via `TrochoidalMillingEngine.ts` — check its entry-angle validation path before allowing <90°. `TrochoidalEntryAngleValidator` does NOT exist (fabricated name — use `TrochoidalMillingEngine.ts`).

6. **5-axis singularity at A=0 + tool-axis-aligned-with-Z.** RTCP transform divides by zero. Call singularity detection from `Fusion360MillTurnBridgeEngine.ts` (`detectSingularity` // UNVERIFIED method name — grep before calling) BEFORE generating any A-axis move < 0.5° from zero.

---

## §6 What NOT to do (mill refuses)

- **NEVER** inline kc1.1 / mc / Taylor C,n constants — import from `physics/constants.ts`
- **NEVER** reference `TrochoidalEntryAngleValidator` — it does not exist; use `TrochoidalMillingEngine.ts`
- **NEVER** call `prism_mill` action without first passing `prism_safety:validate_physics` (S(x) ≥ 0.98)
- **NEVER** full-read `millDispatcher.ts` (217K) or `ToolpathStrategyRegistry.ts` (197K) — grep the case/strategy name first
- **NEVER** assume a coolant block format transfers across posts (HyperMILL 4-char breaks Hurco WinMax)
- **NEVER** generate A-axis move < 0.5° from zero without running singularity detection
- **NEVER** write tribal tips directly to `knowledge/tribal/mill-*.md` (auto-overwritten on regen) — use `prism_knowledge:tribal_capture slot=foxtrot`
- **NEVER** create a mill engine without `duplicationGuardEngine.mustCheckBeforeCreating()` — 222+ engines already exist
- **NEVER** Glob the full `JM DIE/` tree (24K+ files) — use `prismSelfAwarenessEngine.getJMDieCustomerPath()`

---

## §7 Domain workflow / pipeline contract

Standard mill job order (foxtrot daily cycle):

```
1. Feature recognition    →  CAD input (delta) via cad→cam edge
2. Strategy selection     →  mill_strategy_select / mill_strategy_recommend
3. Physics gate           →  mill_physics_force + prism_safety:validate_physics (S(x) ≥ 0.98)
4. Toolpath generation    →  mill_agi_orchestrate (wraps collision + kinematics)
5. Collision + singularity →  mill_collision_check · mill_kinematics_verify
6. Program optimization   →  MillProgramOptimizerEngine (cycle-time / feed)
7. Validation             →  mill_validate_program · mill_validate_safety
8. Post-processing        →  echo galaxy (MasterPostEngine — NGC for VMC-01..04, WinMax for VMC-05)
```

MachineLive* engines stream real spindle load + override% back into adaptive engines. Mill engines must tolerate disconnected `MachineLive` — degrade to predicted-power, never hard-fail.

---

## §8 Tribal + corpus pointers

**JM Die mill corpus (foxtrot ground truth — verified counts):**
- Mill programs: `JM DIE/CNC MILL HAAS/` — 59 customer folders, `.NC/.nc/.mcx-8` files
- Hurco programs: `JM DIE/HURCO CNC PROGRAMS/` — 25 folders, `.hnc` WinMax format
- Machine profiles: `mcp-server/src/data/jm-die-profile.ts` — VMC-01..05; grep `VMC-0` to read only the relevant machine block
- Tool data is embedded in program **headers** (not a central tool-list file) — never Glob for tool specs
- VMC-05 (Roku-Roku / Hurco): no registered post — verify before generating NC (known gap)

**Controllers on JM Die VMC fleet:**
- VMC-01..04: Haas NGC — use NGC post dialect
- VMC-05: Hurco WinMax — use `.hnc` format; NGC posts are NOT interchangeable

**Dominant work materials at JM Die:**
- P-group: 1018, 1045, 4140, 4340 steel (kc1.1 = 1800)
- K-group: 6061, 7075 aluminum (kc1.1 = 1100)
- S-group (specialty): Ti-6Al-4V, Inconel 718 (kc1.1 = 2800)

**Wiki cluster (16 grounded pages at `knowledge/wiki/mill/`):**
- Keystone: [[mill-data-contents-inventory]] (AUTHORED-vs-PLANNED status of every mill data file)
- Tool holders: [[mill-toolholder-connection-style-reference]] · [[mill-toolholder-selection]]
- Cutting tools: [[mill-cutting-tool-reference]] · [[mill-insert-grade-coating-selection]] · [[mill-tooling-corpus-index]]
- Machine stack: [[mill-machine-stack-reference]] · [[mill-5axis-kinematics]]
- Work holding: [[mill-workholding-reference]]
- Cutting physics: [[mill-cutting-forces]] · [[mill-chip-thinning]] · [[mill-thermal-heat-management]] · [[mill-surface-finish-tool-wear]]
- Process + safety: [[mill-print-to-operation-plan]] · [[mill-hard-materials-playbook]] · [[jm-machine-alarm-quick-reference]]

> RAG embedding of these pages is pending Ollama-healthy + golf-merge. `wiki-query` + `master-index` surface them now via keyword search.

**Tribal access:**
- `prism_knowledge:tribal_search slot=foxtrot` — primary query path
- `tribal-by-domain-inject.mjs` (UserPromptSubmit hook) — auto-injects top-3 mill tribal tips on mill-keyword prompts. Knob: `PRISM_TRIBAL_BY_DOMAIN_INJECT_DISABLE=1`
- `knowledge/memories/feedback/` — search `mill`, `chip-load`, `chatter`, `5-axis`, `coolant`

---

## §9 Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge / action |
|-----------|--------|-----------------|
| ← CONSUMES | speed-feed (oscar) | Every mill cutting engine queries `prism_calc:{chip_thinning_*, milling_forces}` |
| ← CONSUMES | cad (delta) | Feature-recognition → strategy-select; CAM output feeds mill |
| ← CONSUMES | cam (kilo) | Toolpath strategy definitions; mill galaxy consumes, does not redefine |
| → PRODUCES | post-processor (echo) | Every mill toolpath → `MasterPostEngine` (NGC or WinMax dialect) |
| ↔ SYMMETRIC | lathe (whiskey) | Mill-turn handoff via `Fusion360MillTurnBridgeEngine` |
| → PRODUCES | quality (fleet) | Mill engines emit predicted Cpk via `SurfaceFinishPredictionEngine`; `prism_quality:*` gates post-machining |
| ← CONSUMES | compliance-safety (fleet) | S(x) gate on every mill output via `prism_safety:validate_physics` |
| ↔ SYMMETRIC | shop-floor (fleet) | `MachineLive*` engines stream spindle load + override%; mill adapts or degrades |
| ↔ SYMMETRIC | ai-training (india) | Mill LoRA per-domain models; outcome publishing feeds india GNN tier-5 |

---

## §10 Closed-loop integration (india)

Publish outcomes: `xproc_outcome_publish {slot:'foxtrot', domain:'mill'}` // UNVERIFIED action name — grep `prism_session` dispatcher before calling.
Tribal capture: `prism_knowledge:tribal_capture slot=foxtrot` (NEVER direct markdown writes).
Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 Test commands

```bash
# All mill engine tests
cd mcp-server && rtk npx vitest run -t "Mill|mill|Trochoidal|Milling"

# Build first (fast path)
cd mcp-server && npm run build:fast

# After changing physics/constants.ts
cd mcp-server && rtk npx vitest run -t "Kienzle|Taylor|chip.thin"

# Specific engine
cd mcp-server && rtk npx vitest run src/__tests__/AdvancedMillingStrategiesEngine.test.ts
```

---

## §12 Known bugs / open threads

- **VMC-05 (Hurco Roku-Roku) has no registered post** — NC generation will silently produce NGC output (wrong dialect). Verify post assignment before generating. Tracked in PATHS.md §Known gaps.
- **HyperMILL wiki pages not yet RAG-embedded** — `nomic-embed-text` embedding pending; `wiki-query` surfaces by keyword only (no semantic recall). See [[reference_bravo_mill_knowledge_not_yet_embedded_2026_06_12]].
- **`HyperMillCycleCatalogEngine.ts` and `HyperMillCodeGeneratorEngine.ts`** — cited in §2 but individual filenames unverified this session (`// UNVERIFIED`); confirm with `ls mcp-server/src/engines/Hyper*` before using.

---

## §13 AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs mill "<question>"
```

Domain Ollama routing:
- Summarize/explain a Haas `.NC` or HyperMILL `.hmt` setup → `qwen2.5-coder:32b`
- Classify mill features from a feature list → `gpt-oss:20b`
- Deep Kienzle/Taylor reasoning, S(x) safety, strategy synthesis → Claude (never offload)

Algorithm primitives available via `prism_algorithm`: `SavitzkyGolayFilter` (spindle-load smoothing), `DynamicTimeWarping` (force-signature matching), `RANSAC` (on-machine probe fitting), `GMM`/`KNN` (regime retrieval). Route through `prism_algorithm` before re-deriving signal-processing from scratch.

## AI Synergy (PSN leg #10)

This galaxy is a first-class AI-substrate **participant** -- it OWNS 19 AI engine(s) (e.g. `MillComprehensiveNeuralEngine`, `MillDeepLearningEngine`, `MillLoRACadenceEngine`), wired to PSN leg #10 via `milling_lora_predict`, `milling_lora_train`, `milling_lora_optimize`.
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs mill "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/mill_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation (signals pulled from the audit) -- it is doctrine, not duplication._
