# wedm Galaxy — slot:mike
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = wedm-domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** wire-EDM — rough cuts, skim cuts, taper cuts, thread cuts, no-core cuts, micro-EDM (fine wire). Material removal is thermal-electric discharge, NOT mechanical chip formation.

**EXCLUDES:** sinker-EDM · fast-hole EDM · micro-hole EDM · anything chip-formation (→ mill/foxtrot, lathe/whiskey). "Northern Wire" in `JM DIE/CNC LATHE/NORTHERN WIRE/` is a lathe CUSTOMER, not wire-EDM programs — do not confuse.

**Slot:** mike · Worktree: `H:/prism-slot-mike` · Branch: `slot/mike`

**File geography:** 145 `WEDM*.ts` + 19 `EDM*.ts` = 164 engine files, all flat under `mcp-server/src/engines/`. The `wedm/` subdir is this sentinel only — flat-engine migration is optional future cleanup.

---

## §2 — Verified engines (cluster map)

Full cluster map in `mcp-server/src/engines/wedm/PATHS.md`. Key engines by function:

| Cluster | Engine file (all in `mcp-server/src/engines/`) |
|---------|------------------------------------------------|
| Core entry | `EDMEngine.ts` · `EDMParameterEngine.ts` |
| Feasibility / material | `EDMFeasibilityEngine.ts` · `EDMMaterialMachineWireEngine.ts` |
| Cutting param + flush | `EDMCuttingParamFlushEngine.ts` (71K) |
| Multi-pass strategy | `EDMMultiPassStrategyEngine.ts` · `WEDMAdaptivePassEngine.ts` |
| Surface integrity / HAZ | `EDMMonitorSurfaceIntegrityEngine.ts` · `EDMSurfaceIntegrityEngine.ts` |
| Quality orchestration | `EDMQualityOrchestratorEngine.ts` (102K) |
| G-code emission | `EDMPostProcessGCodeEngine.ts` (126K) · `EDMPostProcessorExtension.ts` |
| Post dialect router | `WEDMPostDialectRouterEngine.ts` → `WEDMPostMitsubishiEngine.ts` · `WEDMPostSodickEngine.ts` · `WEDMPostMakinoEngine.ts` · `WEDMPostAgieEngine.ts` · `WEDMPostFanucEngine.ts` |
| Taper / deflection | `WEDMTaperErrorBudgetEngine.ts` · `WEDMWireDeflectionEngine.ts` |
| Gap voltage control | `WEDMGapVoltageControlEngine.ts` |
| Bi-material | `EDMBiMaterialCompensationEngine.ts` |
| Start-hole setup | `EDMStartHoleSetupEngine.ts` (48K) |
| Drawing interpretation | `EDMDrawingInterpretationEngine.ts` |
| Cost + docs | `EDMCostDocumentationEngine.ts` |

**Before creating any new engine:** check `ENGINE_DIGEST.md` + `duplicationGuardEngine.mustCheckBeforeCreating()` — 164 engines already exist.

---

## §3 — Dispatcher quick-ref

**Dispatcher:** `mcp-server/src/tools/dispatchers/edmDispatcher.ts` (3,262 lines, 280 `wedm_` actions, double-quote `case "wedm_…"` syntax).

| Action | Use |
|--------|-----|
| `prism_edm:wedm_assess_feasibility` | Pre-flight gate — run BEFORE any NC emit |
| `prism_edm:wedm_check_conductivity` | Material conductivity validation before cut |
| `prism_edm:wedm_estimate_time` | Cut-time estimate |
| `prism_edm:wedm_assess_material` | Material + machine selection input |
| `prism_edm:wedm_select_wire` | Wire selection (brass / coated / moly) |
| `prism_edm:wedm_generate_toolpath` | Toolpath generation |
| `prism_edm:wedm_plan_passes` | Rough + skim pass schedule |
| `prism_edm:wedm_full_multipass` | Full multi-pass orchestration |
| `prism_edm:wedm_generate_gcode` | G-code emission |
| `prism_edm:wedm_generate_complete_program` | End-to-end program assembly |
| `prism_edm:wedm_assess_surface_integrity` | Surface finish / recast / HAZ gate |
| `prism_edm:wedm_predict_recast` | Recast layer depth prediction |
| `prism_edm:wedm_predict_wire_break` | Wire-break risk prediction |
| `prism_edm:wedm_dielectric_flush_calc` | Flushing pressure calculation |
| `prism_edm:wedm_knowledge_distill` | Tribal + wiki knowledge query |
| `prism_knowledge:tribal_capture slot=mike` | Write tribal learnings (NEVER direct markdown) |
| `prism_memory:semantic_search query="wedm"` | Master-brain pull |

**MCP-down fallback:** `node mcp-server/src/data/wedm-engine-registry.ts` (read) · `grep -o 'case "wedm_[^"]*"' mcp-server/src/tools/dispatchers/edmDispatcher.ts` for action discovery.

**Grep pattern for dispatcher actions:** `grep -o 'case "wedm_[^"]*"' edmDispatcher.ts` (not `case 'wedm_` — file uses double-quotes).

---

## §4 — Canonical constants + data paths

**HARD RULE: EDM is thermal-electric, NOT mechanical chip removal.**
- `Kienzle / Taylor / specific-cutting-energy (kc1.1) DO NOT APPLY` to any EDM engine.
- Never inline discharge-energy constants, E-code pass parameters, MRR values, spark-gap offsets, or recast-depth values.
- Source: `mcp-server/src/physics/constants.ts` (fleet-wide) AND `mcp-server/src/data/jm-die-wedm-tech-tables.ts` (JM Die FA-10S shop-specific).
- Physics constants from web / literature stay in `knowledge/wiki/wedm/_staging/` (UNVERIFIED) until mike validates against actual FA-10S tables.

| Need | Verified path |
|------|--------------|
| Tribal tips source-of-truth (122 entries) | `mcp-server/src/data/wedm-knowledge-tips.ts` |
| JM Die FA-10S tech tables (E12xx / E28xx per-pass) | `mcp-server/src/data/jm-die-wedm-tech-tables.ts` |
| JM Die ground-truth program patterns | `mcp-server/src/data/jm-die-wedm-program-patterns.ts` |
| EDM material DB | `mcp-server/src/data/edm-material-db.ts` |
| Wire spec sheets | `mcp-server/src/data/wire-spec-sheets.ts` |
| Engine registry | `mcp-server/src/data/wedm-engine-registry.ts` |
| Action schemas | `mcp-server/src/schemas/edmActionSchemas.ts` |
| Live digest (read, never hardcode counts) | `mcp-server/data/state/WEDM_DIGEST.json` |

**Large-file guards:** `EDMPostProcessGCodeEngine.ts` is 126K — Grep `case "wedm_…"` then Read offset+limit. `wedm-knowledge-tips.ts` is ~105K — Grep tip ID then Read offset limit:30. `edmDispatcher.ts` is 3,262 lines — never full-read.

---

## §5 — Domain gotchas / safety rails

1. **Kienzle/Taylor don't transfer** — cutting force, Taylor tool-life equation, `kc1.1` are chip-formation concepts. Mapping them to an EDM engine is a silent physics error.
2. **Pulse-on/off ratio governs finish vs MRR** — longer pulse-on = higher MRR but thicker recast layer; skim cuts require short pulse-on + high frequency. Source E-code families from `jm-die-wedm-tech-tables.ts`.
3. **Wire tension vs straightness vs break risk** — higher tension = straighter cut; excessive tension on thin/worn wire = break; titanium and carbide are high-break-risk. `WEDMTaperErrorBudgetEngine.ts` + `WEDMWireDeflectionEngine.ts` compute offset correction.
4. **Flushing pressure adequacy** — insufficient dielectric flow = chip buildup = arc damage = wire break. High-pressure for deep cuts; low-pressure for thin/delicate. Use `prism_edm:wedm_dielectric_flush_calc` before NC emit.
5. **Taper cut wire-deflection compensation** — at taper angles the wire bows; do NOT use the nominal taper angle as the programmed angle. Use `WEDMTaperErrorBudgetEngine.ts` to compute the corrected angle.
6. **No-core cut sequencing** — skim cuts must return to rough-cut entry/exit paths; out-of-sequence skims leave micro-tabs and damage wire by hitting unsupported slug.
7. **Gap voltage ≠ open-circuit voltage** — working gap voltage is lower by an amount dependent on dielectric condition and wire speed. `WEDMGapVoltageControlEngine.ts` models the correction; never use OC voltage as gap voltage.
8. **Recast layer depth is application-specific** — aerospace/medical tooling often requires post-EDM recast removal (acid etch or grinding); surface `prism_edm:wedm_predict_recast` when Ra < 0.4 µm or HAZ > spec. // OWNER-GATE: mike validates vs JM Die FA-10S observed data.

---

## §6 — What NOT to do (domain refuses)

- **NEVER** apply Kienzle, Taylor, or `kc1.1` specific-cutting-energy to any EDM engine
- **NEVER** inline discharge-energy constants, E-code pass parameters, or MRR values — import from `constants.ts` + `jm-die-wedm-tech-tables.ts`
- **NEVER** emit G-code without running `prism_edm:wedm_assess_feasibility` first
- **NEVER** write directly to `knowledge/tribal/wedm-*.md` — auto-generated from `wedm-knowledge-tips.ts`; use `prism_knowledge:tribal_capture slot=mike`
- **NEVER** Glob `JM DIE/WIRE EDM/` (4,058 files, 99 customers) — use dispatcher + `prismSelfAwarenessEngine.getJMDieCustomerPath()`
- **NEVER** confuse `JM DIE/CNC LATHE/NORTHERN WIRE/` with wire-EDM programs — it is a lathe customer named "Northern Wire"
- **NEVER** full-read `edmDispatcher.ts` (3,262 lines) — `grep -o 'case "wedm_…"'` then Read offset+limit
- **NEVER** full-read `wedm-knowledge-tips.ts` (~105K) — Grep tip ID then Read limit:30
- **NEVER** use `mcp-server/src/registries/edm-wires.ts` or `edm-dielectrics.ts` as paths — they are NOT verified to exist; use `edm-material-db.ts` + `wire-spec-sheets.ts` instead
- **NEVER** create a new EDM/WEDM engine without checking `ENGINE_DIGEST.md` + `duplicationGuardEngine` — 164 engines already exist

---

## §7 — Domain workflow / pipeline contract

Pre-flight → geometry → pass plan → NC emit → post → validate:

1. `wedm_assess_feasibility` — conductivity + geometry + tolerance check
2. `wedm_parse_geometry` / `wedm_interpret_drawing` — DXF/STEP to EDM feature map
3. `wedm_plan_passes` / `wedm_full_multipass` — rough + skim schedule (E-code family from `jm-die-wedm-tech-tables.ts`)
4. `wedm_dielectric_flush_calc` — flushing adequacy gate
5. `wedm_generate_gcode` / `wedm_generate_complete_program` — NC emit via `WEDMPostDialectRouterEngine`
6. `wedm_assess_surface_integrity` / `wedm_predict_recast` — post-cut surface + HAZ validation

**JM Die primary machine: Mitsubishi FA-10S (deionized water dielectric)**
- Primary post: `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/wire-edm/PRISM-Master-Mitsubishi-FA10S-WEDM.cps`
- 5 vendor dialects: Agie · Fanuc-ROBOCUT · Makino-U · Mitsubishi-FA10S · Sodick-AQ (all at same dir)
- E-code families (canonical in `jm-die-wedm-tech-tables.ts`): `E12XX_STANDARD_4PASS` (D2 steel) · `E12XX_HEAVY_5PASS` · `E28XX_TAPER_5PASS` (SS with UV taper guide)

---

## §8 — Tribal + corpus pointers

**Wiki entries (verified):**
- `knowledge/wiki/wedm/wedm-foundations.md`
- `knowledge/wiki/wedm/wedm-source-atlas.md`
- `knowledge/wiki/wedm/wedm-applied-practice.md`
- `knowledge/wiki/wedm/wedm-advanced-techniques.md`
- `knowledge/wiki/wedm/wedm-resource-atlas.md`
- `knowledge/wiki/wedm/_staging/deep-domain-research-2026-06-09.md` — UNVERIFIED numerics, owner-gate only

**JM Die tribal (verified):**
- `knowledge/wiki/code-tribal/tribal-wedm-jmd-001.md` through `tribal-wedm-jmd-005.md` (5 files)
- 89 tip files at `knowledge/tribal/wedm-knowledge-tips-*.md` (flat, NOT a `wedm/` subdirectory)
- JM Die archive: `JM DIE/WIRE EDM/` (4,058 files, 99 customers) — access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` ONLY, never Glob the tree

**Tribal query:** `prism_edm:wedm_knowledge_distill` or `prism_memory:semantic_search query="wedm recast"` — NOT Grep over 89 tip files.

**Algorithm primitives for discharge-signal telemetry** (via `prism_algorithm`):
- `signal_savgol` — smooth gap-voltage / spark-frequency traces without smearing discharge peaks
- `ml_dtw` — align discharge-signal time-series for wire-wear signature matching
- `ml_viterbi` / `ml_beam_search` — decode wire-break-risk sequences from gap telemetry
- `ml_gmm` / `ml_knn` — cluster discharge regimes for nearest-neighbour E-code recommendation
- `spatial_ransac_fit` — robust trend fit over gap telemetry rejecting transient short-circuit spikes

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Partner | Bridge |
|-----------|---------|--------|
| ← produces geometry | cad/delta · cam/kilo | `cam_strategy_recommend` (wedm-keyed) → wedm feeder |
| → G-code emission | post-processor/echo | `EDMPostProcessGCodeEngine` → `WEDMPostDialectRouterEngine` |
| ↔ discharge-param baselines | speed-feed/oscar | SFC declares wedm as consumer; `prism_calc` for power baselines |
| → surface-finish SPC feeds | quality (fleet) | `EDMMonitorSurfaceIntegrityEngine` → SPC; Ra gates are discharge-driven |
| ↔ live discharge status | shop-floor (fleet) | adaptive discharge param updates |
| → wire/tool-life ERP reorder | business/hotel | `EDMCostDocumentationEngine` → ERP |
| ↔ wedm LoRA per-domain models | ai-training/india | LoRA substrate via india's `CrossProcessNeuralLearningEngine` |
| ← S(x) gate on every output | compliance-safety (fleet) | every wedm emit validated by safety gate |

---

## §10 — Closed-loop integration (india)

Publish outcomes: `xproc_outcome_publish {slot: 'mike', domain: 'wedm'}` // UNVERIFIED action name — grep india dispatcher before calling.
Tribal capture: `prism_knowledge:tribal_capture slot=mike` for all learnings — NEVER direct markdown writes.
Spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
# All EDM-named engine tests
cd mcp-server && rtk npx vitest run -t "EDM"

# All WEDM-named engine tests
cd mcp-server && rtk npx vitest run -t "WEDM"

# Specific high-volume engine
cd mcp-server && rtk npx vitest run src/__tests__/EDMQualityOrchestratorEngine.test.ts
```

---

## §13 — AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs wedm "<question>"
```

Ollama routing: summarize E-code program / explain ACU pass family → `qwen2.5-coder:32b`; discharge-physics derivation → `gpt-oss:120b`; quick filter/synthesis → `gpt-oss:20b`. Deep domain reasoning stays on Claude (not Ollama).
