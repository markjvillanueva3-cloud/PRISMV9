# lathe Galaxy — slot:whiskey
> Universal rails (R1-R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = lathe-domain doctrine ONLY; never re-inline universal prose.

---

## 1. Domain scope + slot identity

**Owns:** OD turning, ID boring, facing, threading (single-point + tap), parting/grooving, drilling on-axis,
knurling, taper turning, contour turning, mill-turn hybrid ops (live tooling + sub-spindle + bar feeder +
Swiss guide bushing).

**EXCLUDES:** pure milling → foxtrot/mill; wire-EDM → mike/wedm; sinker-EDM; additive.

**Slot:** whiskey (operator-codified lathe-specialist 2026-05-27; `reference_whiskey_lathe_soul_designation_2026_05_27.md`; SOUL.md `slot: whiskey`).

**Worktree/branch:** `H:/prism-slot-whiskey` · `slot/whiskey`.

**File geography:** `Lathe*` engines are flat under `mcp-server/src/engines/` (not inside `lathe/` subdir).
`MillTurn*` bridge engines (e.g. `Fusion360MillTurnBridgeEngine`) are cross-galaxy infrastructure — neither
galaxy owns them exclusively. Tests: `mcp-server/src/__tests__/Lathe*.test.ts`.

---

## 2. Verified engines

All existence-confirmed via Glob/grep this session.

| Sub-domain | Engine file |
|---|---|
| Advanced ops physics | `LatheAdvancedOperationsEngine.ts` (32K) |
| Hard-turning gate | `HardTurningCapstoneEngine.ts` + `HardTurningDecisionEngine.ts` |
| CSS/chip-load coordinator | `CSSChipLoadInvariantCoordinatorEngine.ts` |
| Boring bar deflection | `BoringBarDeflectionEngine.ts` |
| Workholding — chuck | `ChuckJawForceEngine.ts` |
| Workholding — soft jaw | `SoftJawProfileEngine.ts` + `SoftJawBoringGCodeEngine.ts` |
| Workholding — steady rest | `SteadyRestPlacementEngine.ts` |
| Workholding — tailstock | `TailstockForceEngine.ts` |
| Bar feeder / remnant | `BarFeedPitchOptimizerEngine.ts` |
| Swiss guide bushing | `SwissGuideBushingPhysicsEngine.ts` |
| Parting chip clearance | `LathePartingChipClearanceEngine.ts` |
| Okuma OSP dialect | `OkumaDialectKnowledgeEngine.ts` |
| Mill-turn bridge | `Fusion360MillTurnBridgeEngine.ts` · `HyperMillMillTurnBridge.ts` |
| Post delta registry | `FusionLathePostDeltaRegistryEngine.ts` |
| HyperMILL turning | `HyperMillTurningConfigIngesterEngine.ts` |
| JM Die upgrader | `JMDieLatheProgramUpgraderEngine.ts` + `JMDieLatheProgramUpgraderV2Engine.ts` |
| Print-to-quote | `LatheAutoQuoteFromPrintEngine.ts` (19K) |
| Cost reconciliation | `LatheActualCostReconciliationEngine.ts` (19K) |
| AI orchestrator | `LatheAIOrchestrationEngine.ts` (77K) |
| AI active learning | `LatheActiveLearningEngine.ts` (76K) |
| AI attention router | `LatheAttentionMechanismEngine.ts` (88K) |
| Bayesian opt | `LatheBayesianOptimizationEngine.ts` (64K) |

Before creating any new lathe engine: `duplicationGuardEngine.checkBeforeCreating()` — 194+ `Lathe*.ts`
engines already exist; duplication is near-certain without the check.

---

## 3. Dispatcher quick-ref

**Primary dispatcher:** `turningDispatcher.ts` (373 actions) — the daily-use surface for all lathe work.
**Sub-dispatchers (verified):** `turningProgramDispatcher.ts` (14 actions) · `threadDispatcher.ts` (17 actions) ·
`threadingPipelineDispatcher.ts` (multi-pass G76 orchestration) — **VERIFIED EXISTS** at
`mcp-server/src/tools/dispatchers/threadingPipelineDispatcher.ts` (backed by `ThreadingPipelineEngine.ts`,
wired in `index.ts`, tested in `lathe-validation-suite.test.ts`). Corrected 2026-06-26 (whiskey verification —
the prior "// UNVERIFIED not found" note was a wrong-path miss).

**MCP-down lint:** `.claude/hooks/lathe-gcode-lint-guard.mjs` — **VERIFIED EXISTS** (PostToolUse guard on `.nc` writes).
A standalone `scripts/lib/lathe-gcode-lint.mjs` CLI is still UNCONFIRMED; use the guard hook + `prism_turning` quality actions.

### Pre-emit safety gate sequence (run in this EXACT order — every program emit)

```
1. prism_turning:lathe_safety_predicate_evaluate   — master predicate gate (ALWAYS first)
2. prism_turning:lathe_partoff_safety_gate         — parting/cutoff check
3. prism_turning:lathe_workholding_select_jaw      — chuck/jaw selection before DOC/feed planning
4. prism_safety:check_spindle_torque               — spindle envelope (via safetyDispatcher)
   prism_safety:check_spindle_power                — power envelope
5. prism_calc:turning_force                        — Kienzle tangential force
   prism_calc:merchant_analysis                    — shear-plane force decomposition
```

NOTE: `lathe_spindle_*` actions do NOT exist in turningDispatcher — a common error. Use `prism_safety:check_spindle_*` instead.

### Common action quick-ref

| Action | Use |
|---|---|
| `prism_turning:lathe_safety_predicate_evaluate` | master gate — call first |
| `prism_turning:lathe_partoff_safety_gate` | before any cutoff/parting op |
| `prism_turning:lathe_workholding_select_jaw` | before DOC/feed planning |
| `prism_turning:lathe_thread_schedule` | multi-pass G76 plan |
| `prism_safety:check_spindle_torque` | spindle envelope check |
| `prism_safety:check_spindle_power` | power envelope check |
| `prism_calc:turning_force` | Kienzle tangential force |
| `prism_calc:merchant_analysis` | shear-plane force decomp |
| `prism_knowledge:tribal_search {slot:"whiskey"}` | lathe tribal recall |
| `prism_knowledge:tribal_capture {slot:"whiskey"}` | write tribal learning |

---

## 4. Canonical constants + data paths

**NEVER inline** Kienzle, Taylor, SFM/IPR constants — import from `mcp-server/src/physics/constants.ts`.
Enforced by `stop_on_inlined_constants.mjs`. NodeNext import pattern: `import { TAYLOR_PARAMS } from "../physics/constants.js"` (`.js` suffix always).

| Constant family | Source | Lathe use |
|---|---|---|
| Kienzle `kc1.1` (P=1800, M=2100, K=1100, N=700, S=2800, H=3200) | `constants.ts` `KIENZLE_KC` | Tangential force Fc |
| Kienzle `mc` exponent | `constants.ts` `KIENZLE_MC` | Feed/DOC chip-thickness scaling |
| Taylor C, n per (material, coating, geometry) | `constants.ts` `TAYLOR_PARAMS` | Insert-life prediction |
| Material density / hardness / thermal | `mcp-server/src/registries/materials.ts` | Surface-finish + thermal calcs |
| Insert nose-radius / approach-angle defaults | `mcp-server/src/registries/tools.ts` | Surface finish + edge contact |

**Workholding registry note:** `mcp-server/src/registries/workholding.ts` does NOT exist — workholding is engine-level (`ChuckJawForceEngine`, `SoftJawProfileEngine`, etc.).

**Large files — NEVER full-read:**
- `data/okuma-dialect-knowledge.ts` (41K) — query via `OkumaDialectKnowledgeEngine`
- `tribal-embed-index.json` (382MB) — query via `prism_knowledge:tribal_search {slot:"whiskey"}`
- `JM DIE/CNC LATHE/` (24K files) — access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` only

---

## 5. Domain gotchas / safety rails

1. **CSS (G96) must have G50 RPM cap** — constant surface speed runs RPM up at small diameters past the
   machine limit. ALWAYS pair `G96 S<sfm>` with `G50 S<max-rpm>`. Hard-block in
   `LatheAdvancedOperationsEngine.validateCSSCap()`.
2. **Boring-bar deflection scales L^3/D^4** (cantilever δ=FL³/3EI, I∝D⁴) — at equal diameter δ∝(L/D)³, so a 5:1 L/D steel bar deflects ~16× a 2:1 ratio.
   `BoringBarDeflectionEngine` enforces L/D ≤ 4 (steel) / ≤ 6 (carbide).
3. **Nose-radius and feed are coupled** — Ra ≈ f² / (8 × Rnose). Halving feed quarters Ra; doubling Rnose
   halves Ra. These are a DESIGN PAIR — never optimize one without the other.
4. **Threading requires position-lock at entry** — single-point threading REQUIRES G92/G76 cycle for
   position-lock; a feed-mode entry cuts a non-helical first revolution. Hard-error in
   `LatheAdvancedOperationsEngine.validateThreadEntry()`.
5. **Parting chip evacuation** — grooving tools at depth > 3× tool width trap chips and break. Peck-grooving
   (G75 Q parameter) is mandatory at depth ratio > 3. `LathePartingChipClearanceEngine` enforces.
6. **Sub-spindle handoff must align within 0.5° of spindle phase** — bypassing crashes parts.
   `Fusion360MillTurnBridgeEngine` enforces.
7. **Y-axis vs C-axis interpolation** — off-center milling uses Cartesian (Y); polar interpolation requires
   `G7.1`/`G12.1` mode. Wrong mode = wrong coordinates.
8. **G76 infeed angle must match insert geometry** — 29° for Acme, 30° for metric, 60° for UN. Wrong angle
   = torn crests. `threadDispatcher:lathe_thread_schedule` enforces.
9. **Chuck jaw centrifugal grip loss** — at 3000 RPM a standard 3-jaw 6" chuck loses ~30% grip.
   `ChuckJawForceEngine` enforces centrifugal reduction; call `lathe_workholding_select_jaw` BEFORE
   computing feed/DOC.
10. **Bar remnant ejection** — `BarFeedPitchOptimizerEngine` computes minimum remnant length; if the program
    allows a part to cut with insufficient bar remaining, the collet feeds air and crashes the turret.

**Lathe-specific Ollama carve-out:** CSS/chuck-jaw SAFETY stays on Claude — do NOT route to Ollama.

---

## 6. What NOT to do (domain refuses)

- **DO NOT** use Fanuc G76/G78/G74 syntax for Okuma OSP programs — OSP threading and canned cycles differ
  (`G78` single-pass, `G176` multi-pass; OSP `G74` = peck-drill ≠ Fanuc `G74` face-grooving = collision risk).
- **DO NOT** write feed rates in IPM for lathe turning — always IPR (inches/rev) or mm/rev.
  Confusing IPR ↔ IPM is a 25.4× chip-load surge error.
- **DO NOT** assume G96 (Fanuc CSS) runs on Okuma OSP — translate via `OkumaDialectKnowledgeEngine`.
  OSP uses `VCSS` macro variable, not G96/G97.
- **DO NOT** call `lathe_spindle_*` dispatcher actions — they do not exist; use `prism_safety:check_spindle_torque/power`.
- **DO NOT** inline Kienzle kc1.1, Taylor C/n, or SFM/IPR constants — import from `constants.ts` (hook enforced).
- **DO NOT** write directly to `knowledge/tribal/lathe-*.md` — auto-overwritten on regen; use `prism_knowledge:tribal_capture slot=whiskey`.
- **DO NOT** Glob the JM Die tree (`JM DIE/CNC LATHE/`) — 24K files; use `getJMDieCustomerPath()`.
- **DO NOT** load `tribal-embed-index.json` directly — 382MB; ~25GB leaked `.tmp` orphans alongside it (flag for golf, do not use).
- **DO NOT** skip `lathe_safety_predicate_evaluate` before any program emit — it is the master gate.
- **DO NOT** reference `workholding.ts` as a registry — it does not exist.
- **DO NOT** create a new lathe engine without `duplicationGuardEngine.checkBeforeCreating()` — 194+ `Lathe*.ts` engines exist.

---

## 7. JM Die machine fleet + Okuma OSP dialect

All 7 JM Die lathes are Okuma OSP. Wrong post = scrap or crash.

| Machine | Model | OSP dialect |
|---|---|---|
| LTH-01 | Okuma GENOS L300-M | OSP-P300L (live tooling) |
| LTH-02 | Okuma GENOS L200E-M | OSP-P300L (live tooling) |
| LTH-03 | Okuma GENOS L400II-E | OSP-P300L |
| LTH-04 | Okuma LNC8 | OSP-P200L |
| LTH-05 | Okuma Crown L1060 | OSP-P100L (older dialect) |
| LTH-06 | Okuma LB 3000EX | OSP-P200L |
| LTH-07 | Okuma Multus B250II | OSP-P300S (mill-turn — also foxtrot scope) |

**OSP dialect differences vs Fanuc (safety-critical):**
- CSS: `VCSS` macro variable (not G96/G97)
- Threading: `G78` (single-pass) + `G176` (multi-pass) — do NOT use G76 for Okuma OSP
- Canned cycles: OSP `G74` = peck-drill ≠ Fanuc `G74` (face-grooving) — collision risk
- Sub-spindle sync: `VWAIT` + `VSYNCH` macros (not M-code pairing)
- CSS clear: `G1100` clears CSS mode — missing leaves machine speed-limited
- Dispatch ALL OSP translation through `OkumaDialectKnowledgeEngine`

**Unit mode:** Okuma OSP unit (inch/metric) set in machine parameter, NOT G-code. Check machine profile
before any geometry work. JM Die convention is INCH (G20) — still verify per part.

---

## 8. Tribal + corpus pointers

- **JM Die A/B corpus:** `JM DIE/CNC LATHE/` (118 customers, ~14K programs) — ground-truth training set;
  access via `prismSelfAwarenessEngine.getJMDieCustomerPath()`, NEVER Glob the 24K-file tree.
- **Okuma OSP corpus:** `JM DIE/OKUMA/JM Die Company/` (31 customers) — OSP-native dialect programs.
- **Vendor turning catalogs:** `data/turning-vendor-catalog-loader.ts` (Sandvik ~5MB, Tungaloy ~3MB, Kennametal, ISCAR, Mitsubishi, Widia, Korloy).
- **Okuma knowledge:** `data/okuma-dialect-knowledge.ts` (41K) + `okuma-osp-advanced-knowledge.ts` — query via `OkumaDialectKnowledgeEngine`.
- **Lathe wiki:** `knowledge/wiki/code-tribal/lathe/` + `knowledge/wiki/architecture/engines/lathe/` (122 entries).
- **Lathe memory brain:** `H:/prism/knowledge/memories/galaxies/lathe/` (~65 files — canonical; has files NOT in C: auto-memory).
- **Tribal vector index:** `prism_knowledge:tribal_search {slot:"whiskey"}` — do NOT load `tribal-embed-index.json` (382MB + ~25GB leaked `.tmp` files).
- **Write rule:** all tribal learnings via `prism_knowledge:tribal_capture slot=whiskey` only.
- **Top-3 tribal auto-inject:** fires on lathe-keyword prompts via `tribal-by-domain-inject.mjs`.

---

## 9. Cross-galaxy edges (PSN)

| Edge | Bridge | Note |
|---|---|---|
| lathe ↔ mill (mill-turn) | `Fusion360MillTurnBridgeEngine` · `HyperMillMillTurnBridge` | Cross-galaxy infra, neither owns exclusively |
| lathe → quoting (charlie) | `LatheAutoQuoteFromPrintEngine` | feeds print-to-quote pipeline |
| lathe ↔ business/ERP (hotel) | `LatheActualCostReconciliationEngine` → `ERPCostFeedbackEngine` | quoted-vs-actual cost feedback |
| lathe ↔ cam/cad | Fusion + HyperMILL bridges | feature-recognition → strategy-select |
| lathe → post-processor (echo) | every lathe toolpath → post | check `MasterPostProcessorUnifiedAGIEngine` first |
| lathe ← speed-feed (oscar) | every lathe cutting engine queries SFC (CSS/IPR) | symmetric ✓ |
| lathe ↔ quality/SPC | `prism_quality:*` Cpk gates after turning | surface-finish Cpk emitted pre-cut |
| lathe ↔ shop-floor | live machine status → adaptive engines | symmetric ✓ |
| lathe ↔ ai-training (india) | lathe LoRA per-domain models | symmetric ✓ |
| lathe ← compliance-safety | S(x) gate on every lathe output | symmetric ✓ |

---

## 10. Closed-loop integration (india)

Outcome publish: `xproc_outcome_publish {slot:'whiskey', domain:'lathe'}` // UNVERIFIED action name — grep turningDispatcher before calling.
Tribal capture: `prism_knowledge:tribal_capture slot=whiskey` (NEVER direct markdown writes).
Feature emission: `xproc_kg_project_features` // UNVERIFIED.
Calibration: `xproc_calibration_monitor_record` // UNVERIFIED.
Spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`. When in doubt about retrain triggers — defer to india.

---

## 11. Test commands

```bash
cd mcp-server && rtk npx vitest run -t "Lathe"
cd mcp-server && rtk npx vitest run -t "HardTurning"
cd mcp-server && rtk npx vitest run -t "Okuma"
cd mcp-server && rtk npx vitest run -t "Swiss"
cd mcp-server && rtk npx vitest run src/__tests__/LatheAIOrchestrationEngine.test.ts
cd mcp-server && npm run build:fast
```

Scrutiny: `node .claude/scripts/scrutiny-3way.mjs --session-id <id>` (3-of-3 PASS required at Stop).
Per-file 2-arm gate required on multi-file builds.

---

## 12. Known bugs / open threads

- `threadingPipelineDispatcher.ts` — **VERIFIED EXISTS** (corrected 2026-06-26): `mcp-server/src/tools/dispatchers/threadingPipelineDispatcher.ts` + `ThreadingPipelineEngine.ts`, wired in `index.ts`. Prior "not found" was a wrong-path miss.
- `scripts/lib/lathe-gcode-lint.mjs` — standalone CLI lib still UNCONFIRMED; the wired lint surface is the hook `.claude/hooks/lathe-gcode-lint-guard.mjs`. Build the CLI lib only if a manual MCP-down lint is needed.
- `LatheSurfaceFinishEngine` — cited in original CLAUDE.md gotcha #3; NOT confirmed to exist. Gotcha reframed without it in §5 above.
- `~25GB leaked .tmp` orphans alongside `tribal-embed-index.json` — flag for golf/juliett cleanup.
- Open-thread queue: check `state/shared/handoffs/HANDOFF-*-lathe*.md` for whiskey session debt.

---

## 13. AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs lathe "<question>"
```

Domain Ollama routing:
- Summarize turning program / explain G96-G97 CSS logic → `qwen2.5-coder:32b`
- Classify chuck-jaw setup / filter tribal candidates → `gpt-oss:20b`
- Deep domain reasoning (insert grade selection, OSP macro design) → `gpt-oss:120b`
- **CSS/chuck-jaw SAFETY: stays on Claude — do NOT route to Ollama**

## AI Synergy (PSN leg #10)

This galaxy is a first-class AI-substrate **participant** -- it OWNS 60 AI engine(s) (e.g. `LatheAIReasoningEngine`, `LatheDeepLearningEngine`, `LatheDeepLearningIntelligenceEngine`), wired to PSN leg #10 via `lathe_agi_reason`, `lathe_agi_history`, `lathe_agi_confidence`.
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs lathe "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/lathe_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation (signals pulled from the audit) -- it is doctrine, not duplication._
