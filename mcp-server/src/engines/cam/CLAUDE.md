# cam Galaxy — slot:kilo
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = cam-domain doctrine ONLY; never re-inline universal prose.

---

## 1. Domain scope + slot identity

**Owns:** toolpath strategy selection, toolpath generation, toolpath validation, workholding + fixture
design, cross-vendor strategy mapping, HyperMILL CAM bridge sub-galaxy (`engines/hypermill/`), Fusion
360 bridge, vendor-specific CAM (Mastercam / Esprit / Inventor HSM / SolidWorks CAM / NX-CAM /
PowerMill / EdgeCAM / GibbsCAM / SprutCAM).

**EXCLUDES:** per-machine cutting physics → mill (foxtrot) / lathe (whiskey) / wedm (mike); G-code
emission → post-processor (echo); blueprint/OCR input → blueprint-vision (xray).

**Slot:** kilo · Worktree: `H:/prism-slot-kilo` · Branch: `slot/kilo`

---

## 2. Verified engines

No local `.ts` engines live in `engines/cam/` — the galaxy's code lives in `mcp-server/src/engines/`
(root engine tree) and `engines/hypermill/`. File-existence confirmed via Glob/ls 2026-06-13.

| Role | Engine file (in `mcp-server/src/engines/`) |
|---|---|
| Top-level CAM orchestration | `CAMAGIMasterOrchestratorEngine.ts` |
| NL intent → strategy pipeline (core) | `CAMKernelEngine.ts` |
| Dispatcher bridge | `CAMKernelDispatcherBridge.ts` |
| Cross-vendor strategy mapping | `CAMCrossSystemTranslatorEngine.ts` |
| India closed-loop tap | `CAMFeedbackLoopEngine.ts` |
| Toolpath generation | `ToolpathGenerationEngine.ts` |
| Adaptive toolpath routing | `AdaptiveToolpathRouterEngine.ts` |
| HyperMILL deflection/thermal | `engines/hypermill/HyperMillDeflectionThermalMappingEngine.ts` |
| HyperMILL speed/feed mapping | `engines/hypermill/HyperMillSpeedFeedMappingEngine.ts` |
| HyperMILL project parser | `engines/hypermill/HMCProjectParserEngine.ts` |
| HyperMILL Kienzle mapping | `engines/hypermill/HyperMillKienzleMappingEngine.ts` |
| Part similarity search | `engines/hypermill/PartSimilaritySearchEngine.ts` |

`engines/hypermill/` has 17 `.ts` files total (verified 2026-06-13); remaining files are artifact
generators and mapping engines — see `engines/hypermill/` dir for full list.

---

## 3. Dispatcher quick-ref

Three dispatchers serve this galaxy (all verified in source):

### `prism_cam` (primary — `camDispatcher.ts`)
| Action | Use |
|---|---|
| `cam_strategy_recommend` | Physics-aware strategy pick (feature + material + machine) |
| `cam_strategy_recommend_full` | Extended: includes `cam_param_optimize` + `cam_cross_translate` |
| `collision_check_full` | **MANDATORY gate** — returns clearance number, never bare boolean |
| `cam_safety_validate` | Ω/S(x) shop-floor gate — run before any toolpath commit |
| `cam_multiaxis_recommend` | 5-axis swarf/contour + singularity check |
| `cam_material_map` | ISO group → strategy basis — **call before any strategy action** |
| `toolpath_generate` | Path generation — never hand-roll |
| `mastercam_strategy_recommend` | Mastercam-specific strategy |
| `mastercam_safety_validate` | Mastercam S(x) gate |
| `ollama_cam_strategy_recommend` | Local Ollama CAM strategy route |

### `prism_toolpath` (`toolpathDispatcher.ts`)
| Action | Use |
|---|---|
| `strategy_select` | Strategy family decision tree |
| `simulate` | Kienzle force + Jaeger temp + Brammertz roughness along path |
| `cycle_time_estimate` | Accel/corner-aware timing |
| `surface_finish_predict` | Finish prediction |
| `stock_simulate` | Voxel stock simulation |

### `camFunctionDispatcher` (`camFunctionDispatcher.ts`)
Per-vendor operation catalog: `mastercam_*`, `fusion360_*`, `hypermill_*`, `solidcam_*`,
`edgecam_*`, `gibbscam_*`, `sprutcam_*`, `nxcam_*` — see `src/schemas/camFunctionActionSchemas.ts`.

**MCP-down fallback:** `cd mcp-server && node -e "require('./dist/tools/dispatchers/camDispatcher.js')"` — or query via `prism_data:database_search` for ToolDB/MaterialDB/ToolpathStrategyDB.

---

## 4. Canonical constants + data paths

**NEVER inline cutting constants.** Any `kc1_1`, `kc11_mpa`, `taylor`, raw SFM/IPR/chip-load literal
in a CAM engine is a hard R12 fail. Import from `mcp-server/src/physics/constants.ts` only.

**Verified data stores** (existence confirmed 2026-06-13):

| Store | Path | Size / Rule |
|---|---|---|
| Vendor registry | `mcp-server/data/state/CAM_VENDOR_REGISTRY.json` | 10K — USE THIS, not `cam-vendor-matrix.ts` (does not exist) |
| CAM tribal RAG index | `mcp-server/data/state/CAM_TRIBAL_RAG_INDEX.json` | 5.3M — **NEVER full-read; query via dispatcher** |
| CAM AI actions index | `mcp-server/data/state/CAM_AI_ACTIONS_INDEX.json` | 310K — jq a key; never full-read |
| ToolpathStrategyDB | query via `prism_data:database_search` | 586 entries |
| ToolDB | query via `prism_data:database_search` | 13,967 entries |
| MaterialDB | query via `prism_data:database_search` | 6,509 entries |
| CoatingRegistry | `mcp-server/src/registries/CoatingRegistry.ts` | 100 entries — import, never inline |
| PhysicsMappingRegistry | `mcp-server/src/registries/PhysicsMappingRegistry.ts` | 1,942 entries |

---

## 5. Domain gotchas / safety rails

1. **UNITS-FIRST (no exception).** JM Die convention = INCH (`G20`). Fusion 360 internal unit = cm
   (2.54 trap). hyperMILL project units must be verified per job. A units mismatch in a toolpath =
   25.4× scale error. Check `G20`/`G21` in NC, CAM project setup, and `"unit"` field in tool library
   BEFORE any strategy/toolpath work. Guard: `scripts/lib/units-guard.mjs`.

2. **`collision_check_full` is a hard gate.** Must return a clearance NUMBER before any toolpath is
   committed. Bare boolean or "looks safe" is a SOUL.md refuse (`emitting-toolpath-without-collision-check`).

3. **`cam_material_map` precedes every strategy call.** Material → ISO group is the foundation of every
   strategy recommendation. Calling `cam_strategy_recommend` without it produces invalid output.

4. **5-axis singularity.** `cam_multiaxis_recommend` handles singularity detection. Never hand-compute
   tilt/lean angles for simultaneous 5-axis — defer to the action.

5. **HyperMILL blade roughing ≠ generic 5-axis.** Proprietary tilt-angle optimization differs from
   generic swarf — never substitute `cam_multiaxis_recommend` output directly into a hyperMILL
   blade-roughing job without a strategy-KB lookup (`cam_hypermill_strategy_kb_for_geometry` action in
   `camFunctionDispatcher`).

6. **Cross-vendor transfer: strategy maps, holder geometry does NOT.** After a Mastercam→hyperMILL
   transfer via `CAMCrossSystemTranslatorEngine`, always re-validate holder/tool assembly for clearance.

7. **Fixture/WCS origin discipline.** WCS origin in the CAM program must be verified against the
   fixture setup sheet before posting. A 0.001″ origin error on a precision die cavity is a scrap part.

8. **Rest machining stock model.** The rest-machining pass MUST reference an updated in-process stock
   model, not raw stock. Fusion 360 rest-machining requires an explicit stock source selection
   (verified in `knowledge/wiki/cam/cam-foundations.md`).

---

## 6. What NOT to do (domain refuses)

- **DO NOT** reference `mcp-server/src/data/cam-vendor-matrix.ts` — it does not exist; use `CAM_VENDOR_REGISTRY.json`.
- **DO NOT** call `prism_cam` strategy actions without first calling `cam_material_map`.
- **DO NOT** full-read `CAM_TRIBAL_RAG_INDEX.json` (5.3M) or `CAM_AI_ACTIONS_INDEX.json` (310K).
- **DO NOT** re-extract Mastercam (45 already extracted) or hyperMILL (25 extracted) — check `mcp-server/data/state/extraction-log.json` first.
- **DO NOT** write directly to `knowledge/tribal/cam-*.md` — capture via `prism_knowledge:tribal_capture slot=kilo` only (auto-overwritten on regen).
- **DO NOT** commit from shared `H:/prism` — commits route to `H:/prism-slot-kilo` on `slot/kilo` branch.
- **DO NOT** inline cutting constants — any `kc1_1`, `taylor`, SFM/IPM literal in a CAM engine is a hard R12 fail.
- **DO NOT** skip `collision_check_full` before toolpath commit — non-negotiable gate.
- **DO NOT** use retired Ollama tags (`:3b/:7b/:14b/deepseek-r1:14b` retired 2026-06-04).
- **DO NOT** spawn a wide Grep/Agent for CAM inventory when `prism_cam`, `Glob CAM*.ts`, or the tribal RAG index answer it cheaper.
- **DO NOT** emit a toolpath from `engines/cam/` — there are no local `.ts` files here; code lives in the root engine tree.

---

## 7. Domain workflow / pipeline contract

Standard CAM job flow (each step is a dispatcher call):

```
1. cam_material_map           → ISO group + coolant recommendation
2. cam_strategy_recommend     → strategy family (or cam_strategy_recommend_full for extended)
3. toolpath_generate          → raw toolpath blocks
4. simulate / stock_simulate  → force/thermal/voxel verification
5. collision_check_full       → clearance number (HARD GATE — must pass before step 6)
6. cam_safety_validate        → Ω/S(x) gate
7. cycle_time_estimate        → timing for quoting/scheduling
8. → hand off to echo (post-processor) via NCI/APT
```

Cross-vendor transfer sub-flow: `cam_strategy_recommend` → `CAMCrossSystemTranslatorEngine` →
re-validate holder clearance → `collision_check_full` → vendor-specific `camFunctionDispatcher` action.

---

## 8. Tribal + corpus pointers

**Wiki entries (query before re-deriving):**
- `knowledge/wiki/cam/cam-foundations.md` — chip-thinning, scallop/cusp, trochoidal mechanism,
  climb/conventional, Fusion rest-machining (VERIFIED-PARTIAL; numeric constants are owner-gated)
- `knowledge/wiki/training/cam-corpus-index.md` — training corpus index

**CAM knowledge index:** `H:/prism/state/shared/CAM-KNOWLEDGE-INDEX.md` — `// UNVERIFIED` (not
found 2026-06-13); regen script: `node scripts/cam-knowledge-index.mjs` if it exists.

**JM Die corpus** (access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NEVER Glob the 24K-file tree):
- `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` — real-shop Fusion CAD+CAM (ELECTRODES / JM / MANNY / OKUMA / ROKU ROKU)
- `H:/PRISM/JM DIE/OKUMA/hyperCAD-S and hyperMILL Online Training/` — OPEN MIND training corpus

**Resource corpora:**
- `H:/PRISM/resources/OPEN MIND/` + `resources/HYPERMILL/` — hyperMILL corpus
- `H:/PRISM/resources/MasterCam/` — Mastercam X8 corpus
- `H:/PRISM/resources/FUSION 360 PROGRAMS/` + `resources/HSMWorks 2027/` — Fusion/HSM corpus

**Tribal write rule:** `prism_knowledge:tribal_capture slot=kilo` — never write `knowledge/tribal/cam-*.md` directly.

**Vendor catalog:** `mcp-server/data/vendor-catalog-db/manifest.json` (425 vendors).

---

## 9. Cross-galaxy edges (PSN)

| Direction | Galaxy / Slot | Bridge |
|---|---|---|
| CONSUMES ← | blueprint-vision (xray) | print → feature set → `cam_strategy_recommend` input |
| CONSUMES ← | cad / delta | `feature_recognize` → feature set → `cam_strategy_recommend` |
| PRODUCES → | post-processor (echo) | `toolpath_generate` → NCI/APT → post emit (strategy+tool-list+WCS lossless) |
| PRODUCES → | mill (foxtrot) | `cam_strategy_recommend` keyed by machine-domain |
| PRODUCES → | lathe (whiskey) | `cam_strategy_recommend` keyed by machine-domain |
| PRODUCES → | wedm (mike) | `cam_strategy_recommend` keyed by machine-domain |
| CONSUMES ← | speed-feed (oscar) | `cam_speedfeed_compute` → `ToolpathBlock` per toolpath |
| FEEDS → | ai-training (india) | strategy embeddings via `xproc_kg_project_features` (GNN tier-5) |
| ↔ | cad-fusion-live | Fusion bridges + long-session pattern |

---

## 10. Closed-loop integration (india)

Outcome publishing: `xproc_outcome_publish {slot:'kilo', domain:'cam'}` // UNVERIFIED action name — grep camDispatcher before relying.
Feature emission: `xproc_kg_project_features` for india's GNN classifier; tribal capture: `prism_knowledge:tribal_capture slot=kilo`; calibration: `xproc_calibration_monitor_record`.
Spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`. When in doubt about retrain triggers — defer to india; do not roll your own.

---

## 11. Test commands

```bash
cd mcp-server && rtk npx vitest run -t "CAM|Toolpath|Strategy"
```

Health checks (if present — verify before relying):
```bash
node scripts/cam-galaxy-verify.mjs          # 8 health checks // UNVERIFIED path
node scripts/cam-knowledge-index.mjs        # regen CAM-KNOWLEDGE-INDEX.md // UNVERIFIED path
node scripts/cam-awareness-snapshot.mjs     # regen AWARENESS.md // UNVERIFIED path
```

---

## 12. Known bugs / open threads

- `CAM-KNOWLEDGE-INDEX.md` (`state/shared/`) is MISSING as of 2026-06-13 — regen script may exist at `scripts/cam-knowledge-index.mjs`; verify before referencing in any downstream consumer.
- SOUL.md refuse `emitting-toolpath-without-collision-check` is the live gate for skipped collision checks — confirm it is wired in the Stop hook stack before marking any toolpath workflow complete.

---

## 13. AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs cam "<question>"   # $0 local reasoning
```

Ollama routing for CAM work:
- Summarize/classify a strategy or `.mcam` op tree → `qwen2.5-coder:32b`
- Deep domain reasoning (blade roughing physics, 5-axis singularity analysis) → `gpt-oss:120b`
- Quick filter/synthesis → `gpt-oss:20b`

AWARENESS.md (`engines/cam/AWARENESS.md`) carries the live AI-synergy surface (6 AI engines,
37 dispatcher actions, hybrid RAG active) — read it for the current posture before building new AI
wiring. Live fleet AI state: `knowledge/memories/patterns/ai-systems-fleet-state.md`.

## AI Synergy (PSN leg #10)

This galaxy is a first-class AI-substrate **participant** -- it OWNS 6 AI engine(s) (e.g. `CAMDeepLearningEngine`, `CAMDeepLearningOrchestratorEngine`, `CAMLoRAAdapterTrainerEngine`), wired to PSN leg #10 via `cam_ml_predict_baseline`, `cam_ml_train_lora`, `cam_ml_predict_lora`.
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs cam "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/cam_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation (signals pulled from the audit) -- it is doctrine, not duplication._
