# speed-feed — slot:oscar

## Current state

**File:** `H:/prism/mcp-server/src/engines/speed-feed/CLAUDE.md`
**Size:** ~6.5KB / 94 lines
**Quality grade:** PARTIAL

The file was auto-populated 2026-06-09 by `scripts/fill-galaxy-claudemd-domain.mjs` (Ollama-distilled). It has a valid skeleton — scope, PSN edges, closed-loop integration, critic contract, AI-systems pointer — but the engine inventory section is critically thin (only 3 engine names listed, all 3 verified) and the domain-specific operating doctrine that oscar needs every turn is almost entirely absent. The high-ROI memories are duplicated verbatim from MEMORY.md (token waste). Several stale/inaccurate items:

- **Stale/imprecise:** `machine-kinematics-enriched.ts` listed as a key engine — it is a DATA file (`mcp-server/src/data/machine-kinematics-enriched.ts`, 430K), not an engine. // PATHS.md line 57 confirms this.
- **Incomplete engine surface:** The real orchestrator core is `UltimateSpeedFeedEngine.ts` + `SpeedFeedOrchestratorEngine.ts` + `SpeedFeedNineAxisOrchestratorEngine.ts` — none of these appear in the "Key engines" section.
- **No dispatcher action table:** The live SFC action surface on `calcDispatcher.ts` (~30+ `sfc_*`/`speed_feed_*` actions, confirmed at lines 825–1265) is entirely absent — the most critical daily reference for oscar.
- **No anti-pattern list:** The file has no "what NOT to do" doctrine. TOOLBELT.md has a solid anti-patterns section; the CLAUDE.md should carry the safety-relevant subset.
- **No domain-specific safety rules:** CSS/G97/G50 lathe RPM-cap requirement, spindle-power-as-clamp, Kienzle-never-inline are mentioned only as memory pointers — not as actionable rails.
- **MEMORY.md duplication:** The 5 bullet "High-ROI domain memories" block in CLAUDE.md is a byte-for-byte copy of the MEMORY.md block — pure token waste.
- **No SFC-specific test commands:** Only the generic `npx vitest run` is listed; oscar's domain-specific test entry points (`*SpeedFeed*.test.ts`, 401-assertion gauntlet) are absent.
- **No vendor-parity workflow:** The GWizard/HSMAdvisor parity loop (tri-vendor smoke, AppData live files) is not mentioned.

---

## KEEP

- `## Scope` — accurate, identifies SFC as a subscription product and names the 9-axis focus and recent oscar milestone commit. Keep verbatim.
- `## Cross-galaxy edges` — accurate symmetric edge declarations (mill/lathe/wedm/post-processor/NN/business/academy). Keep.
- `## Related galaxies (PSN edges — symmetric)` — accurate india/ai-training cross-ref. Keep.
- `## Closed-loop integration with india` — the outcome-bus, feature-emission, tribal-capture, calibration-monitor stanza is accurate and load-bearing. Keep verbatim.
- `## Critic + keep-working contract` — the pointer block (R12 honesty + R6 context-growth) is the correct universal-core pointer form. Keep.
- `## AI-systems fleet state` (pointer comment block) — correct pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md`. Keep.
- The free-source corpus block (IIT Bombay, ACS, ISCAR pointers) in MEMORY.md is load-bearing for oscar's catalog ingestion work — move or keep a pointer from CLAUDE.md.
- `## Cross-cutting methodology` — the Ollama-routing specifics for this domain (explain Kienzle derivation → `gpt-oss:120b`, lint SFC engine code → `qwen2.5-coder:32b`) are accurate and worth keeping in condensed form.

---

## DROP

- **`## High-ROI domain memories` block** (lines 26-31 in CLAUDE.md) — exact duplicate of MEMORY.md content. MEMORY.md is the brain; CLAUDE.md should pointer-link, not copy.
- **`## Tribal pointers`** single-line block — a single wiki link without context is lower ROI than the full knowledge-atlas already in PATHS.md. Drop from CLAUDE.md; point to PATHS.md `## Knowledge / Tribal / Memory atlas` instead.
- **`## Test commands`** generic block — `cd mcp-server && npx vitest run` is a universal command. Replace with oscar-specific test patterns (see ADD).
- **`## Cross-refs`** boilerplate footer linking to DOMAIN-GALAXY-DOCTRINE spec and sibling CLAUDE.md files — low token ROI; the `Cross-refs` block's content is already encoded in the standard galaxy file layout. Drop or trim to one line.
- **`machine-kinematics-enriched.ts` in Key engines** — misclassified (it's a data file). Drop from engine list; mention under data catalogs.
- The verbose `<!-- GALAXY-CLAUDEMD-FILL:BEGIN/END -->` XML comment framing — the auto-generation comment is a meta note for the script, not for the chat reading the file. It adds ~200 tokens of script-maintenance prose that oscar doesn't need every turn.

---

## ADD (domain-specific — the heart of this assessment)

### 1. Primary dispatcher action surface (verified from `calcDispatcher.ts` lines 825-1265)

Oscar reaches for these every turn; they must be in-file:

```
prism_calc dispatcher — SFC actions:
  ultimate_speed_feed           — single-cell physics (line 5357)
  sfc_calculate                 — core S/F calc (line 9126)
  sfc_feed_for_target           — inverse: target MRR → feed (line 9131)
  sfc_nine_axis_run             — 9-axis composition + clamp [PRIMARY] (line 9192)
  sfc_rank_hypotheses           — Bayesian arbiter across physics/RAG/adapter (line 9530)
  sfc_ranker_stats              — ranker metadata (line 9544)
  sfc_parameter_refinement_compute — median+IQR correction from actuals (line 9563)
  auto_speed_feed_calc          — auto-SF prediction (line 9696)
  cam_speed_feed_bridge         — normalize CAM S/F vocab ↔ orchestrator (line 9724)
  speed_feed_mine               — mine JM Die programs for S/F data (line 9758)
  speed_feed_compare_to_baseline — diff vs 5 vendor baseline DBs (line 9778)
  speed_feed_tri_compare        — PRISM × baseline × G-Wizard matrix (line 9801)
  speed_feed_exhaustive_sweep   — physics-invariant bounded cartesian sweep (line 9815)
  speed_feed_calibration_persist — persist calibration actuals (line 9869)
  speed_feed_gpu_judge          — GPU-accelerated judging (line 9890)
  sfc_optimize_run              — end-to-end optimization run (line 9190)
  sfc_shop_library_rank         — rank from on-hand shop-tool library (line 9194)
  sfc_pdf_corpus_bridge         — S/F extraction from PDF corpus (line 9200)
  joint_speed_feed_optimize     — joint optimization (line 1265)
  speedfeed_outcome_record_actuals / _stats / _recent — fold-back actuals loop (MEMORY bravo wiring)
  sfc_rank_hypotheses / sfc_ranker_stats              — Bayesian arbiter (bravo wiring)
  sfc_parameter_refinement_compute                    — IQR correction (bravo wiring)

prism_safety dispatcher — spindle gates (ALWAYS run before recommending aggressive RPM):
  check_spindle_torque          — clamp SFC enforces
  validate_physics              — S(x) gate

prism_calc supplementary:
  gwizard_library_export / hsmadvisor_library_export / hsmadvisor_machine_export
  stepover_calc / proven_speed_feed_aggregate_mill / proven_speed_feed_aggregate_lathe
  proven_speed_feed_query / proven_speed_feed_export
  speed_feed_resource_sfm / speed_feed_resource_chiploads / speed_feed_resource_hem
  speed_feed_resource_facemill_strategy / speed_feed_resource_jmdie_material / speed_feed_resource_optimal
```

### 2. Verified engine inventory (all existence-checked this session)

Orchestrator core:
- `UltimateSpeedFeedEngine.ts` — canonical physics, 31 models, 401 assertions
- `SpeedFeedOrchestratorEngine.ts` — central hub 2,851 LOC
- `SpeedFeedNineAxisOrchestratorEngine.ts` — 9-axis composition + 3 modes + clamp

Feedback / propagation:
- `SpeedFeedOutcomeFeedbackBridgeEngine.ts` — outcome→DL calibration (KNOWN BUG: `tryBusCapture()` hardwired `return true` → stats are fake constant 100%; R12 flag)
- `SFCMultiHypothesisRankerEngine.ts` — Bayesian arbiter
- `SFCParameterRefinementEngine.ts` — median+IQR multiplicative correction, clamped [0.25,4.0]
- `SpeedFeedPSNDecisionPriorEngine.ts` — Bayesian prior from PSN
- `SpeedFeedPropagationBridgeEngine.ts` — fan-out to post + mill/lathe/wedm + print_to_program + charlie quoting (MRR → cycle_min)
- `SpeedFeedDownstreamSubscriberEngine.ts` — sfcOutcomeWire → 5 caches

Vendor bridges:
- `GWizardAdapterEngine.ts` / `GWizardComparatorBridgeEngine.ts` / `GWizardToolCribExportEngine.ts`
- `HSMAdvisorAdapterEngine.ts` / `HSMAdvisorComparatorBridgeEngine.ts` / `HSMAdvisorSettingsExportEngine.ts`
- `CAMSpeedFeedBridgeEngine.ts` — 6 CAM-system S/F vocab normalize
- `SpeedFeedChatterStabilityAdapterEngine.ts` — Altintas SLD + RCSA-FRF
- `PRISMToolCatalogAggregatorEngine.ts` — 24 vendor catalogs → 41,192 deduped tools

Algorithms (never inline — import only):
- `KienzleForceModel.ts`, `ExtendedTaylorModel.ts`, `MerchantShearForceModel.ts`, `PowerTorqueCalc.ts`, `GilbertMRRModel.ts`
- `StabilityLobeDiagram.ts`, `FRFStabilityLobe.ts`, `STFTChatter.ts`, `SpindleVibFFTModel.ts`
- `ToolWearPrediction.ts`, `BayesianWearModel.ts`, `UsuiWearModel.ts`, `JohnsonCookModel.ts`, `ToolDeflectionModel.ts`

Constants (single source of truth):
- `mcp-server/src/physics/constants.ts` — canonical kc1.1 per ISO group (P=1800, M=2100, K=1100, N=700, S=2800, H=3200), Taylor C/n, all cutting constants

Registries:
- `mcp-server/src/registries/CoatingRegistry.ts` — 100 entries
- `mcp-server/src/registries/PhysicsMappingRegistry.ts` — 1,942 entries
- `MaterialRegistry.ts`, `ToolRegistry.ts`, `MachineRegistry.ts`, `MachineSpindleDefaultsRegistry.ts`, `CoolantRegistry.ts`

### 3. Domain-specific safety rails (currently absent)

These are SFC-specific and must live in this file, not just in MEMORY.md:

- **NEVER inline Kienzle/Taylor/material constants** — import from `mcp-server/src/physics/constants.ts`. Hook: `oscar-sfc-constants-guard.mjs`.
- **Spindle power is a CLAMP, not a target** — every recommendation must pass `prism_safety:check_spindle_torque` before surfacing to the user.
- **Round at DISPLAY, not in the calculation** — intermediate values carry full float precision; `Math.round`/`Math.floor` inside a SFC engine body is a bug (regression `1b87f98f2` — the AutoSpeedFeed fix).
- **CSS/G97/G50 lathe RPM cap** — every `LatheSpeedFeed*` path that computes constant surface speed (G96) MUST carry a `G50 S<maxRPM>` clamp. Missing cap = runaway spindle.
- **6 non-negotiable physics invariants** — detail in `feedback/feedback_oscar_sfc_physics_discipline.md`; the CLAUDE.md should list them inline, not just pointer-link.
- **SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture() is hardwired `return true`** — `speedfeed_outcome_stats` bus_capture_success_rate_pct is a FAKE constant 100%. Do NOT trust this metric until the real bus is wired (R12 open item from bravo's 2026-06-11 sweep).
- **False WIRE-EXEMPT markers** — before adding a `// WIRE-EXEMPT` comment, verify the named wrapper singleton actually imports the engine. Bravo found several phantom exemptions in SFC engines (2026-06-11).

### 4. Domain-specific test commands (currently absent)

```bash
# Run the 401-assertion gauntlet (canonical SFC regression gate):
cd mcp-server && npx vitest run --reporter=verbose src/__tests__/UltimateSpeedFeedEngine.test.ts

# Run all SFC tests:
cd mcp-server && npx vitest run src/__tests__/*SpeedFeed*.test.ts

# Tri-vendor parity smoke (oscar slot worktree):
node H:/prism-slot-oscar/scripts/sf-tri-vendor-smoke.mjs

# G-Wizard + HSMAdvisor export preview:
node H:/prism-slot-oscar/scripts/sf-parity-preview.mjs
```

### 5. Vendor-parity workflow pointer (currently absent)

Oscar's primary recurring task cycle:
1. Run `sfc_nine_axis_run` on a material×tool×machine cell.
2. Compare via `speed_feed_tri_compare` (PRISM × G-Wizard × HSMAdvisor).
3. If delta > tolerance → check `sfc_rank_hypotheses` for which model disagrees.
4. Export back to live vendor files: `gwizard_library_export` → `C:/Users/wompu/AppData/Roaming/GWizard.*/Local Store/toolcrib.csv` (bak originals exist).
5. Publish outcome: `xproc_outcome_publish {slot:'oscar', domain:'speed-feed'}`.

### 6. SFC-specific "what NOT to do" list (currently absent)

- Do NOT full-read `hypermill-materials-catalog.ts` or `hypermill-speed-feed-catalog.ts` — both are 1.2MB. Grep the material/tool name, then offset-read ±60 lines.
- Do NOT full-read `calcDispatcher.ts` — grep for `sfc_\|speed_feed_` case labels, then offset to the case body.
- Do NOT write tribal tips as raw markdown to `knowledge/tribal/speed-feed-*.md` — they are auto-overwritten on regen. Use `prism_knowledge:tribal_capture {slot:'oscar'}`.
- Do NOT deploy a new S/F model without AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15 on operator-verified data (india's LoRA gate).
- Do NOT trust `speedfeed_outcome_stats` bus_capture_success_rate_pct — it is currently hardwired 100% (R12 known bug).
- Do NOT re-globbing `mcp-server/src/engines/` every session — PATHS.md already has the verified inventory.

### 7. Canonical corpora for speed-feed (currently scattered across PATHS.md, absent in CLAUDE.md)

- Vendor S/F tables: `mcp-server/src/data/*speed-feed-data.ts` (~6 files)
- HyperMILL matrices: `mcp-server/src/data/hypermill-speed-feed-catalog.ts` (1.2MB, grep-only)
- HyperMILL materials: `mcp-server/src/data/hypermill-materials-catalog.ts` (1.2MB, grep-only)
- Tool catalog extracted JSON: `mcp-server/src/data/*-extracted.json` (~24 files, 41,192 tools)
- Tribal cited tips: `mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts` (260KB, Kennametal/Sandvik/CNC-Cookbook)
- JM on-hand shop tools: `mcp-server/src/data/shop-tools/shop-tools-{endmills,twist-drills,...}.csv` (218 tools)
- Vendor catalog extraction worklist: `state/shared/quoting/catalog-sfc-extraction-manifest.json`
- Physics wiki: `knowledge/wiki/code-tribal/math-speed-feed-the-full-physics.md`
- Merchant/Oxley mechanics: `knowledge/wiki/code-tribal/math-cutting-mechanics-merchant-oxley.md`
- SFC architecture wiki: `knowledge/wiki/architecture/speed-feed-galaxy.md`
- Operator live vendor data (AppData, NOT repo): `C:/Users/wompu/AppData/Roaming/HSMAdvisor/` + `GWizard.*/Local Store/toolcrib.csv`

---

## IDEAL SECTION OUTLINE

```
# Speed-Feed (SFC) Galaxy — CLAUDE.md (slot:oscar)

## Scope + soul
## Cross-galaxy edges (PSN symmetric)
## Domain-specific safety rails (HARD rules — inline, not pointer-only)
  - NEVER inline Kienzle/Taylor/material constants
  - Spindle power = CLAMP (prism_safety:check_spindle_torque gate)
  - Round at DISPLAY not in calculation
  - CSS/G50 lathe RPM-cap mandatory
  - 6 non-negotiable physics invariants (listed)
  - Known open R12 item: tryBusCapture() fake 100%
  - WIRE-EXEMPT verification rule
## Primary dispatcher action surface (prism_calc SFC actions, verified)
## Key engines (orchestrator core → feedback/propagation → vendor bridges → algorithms)
## Canonical constants + registries
## SFC test commands (401-gauntlet, all *SpeedFeed*.test.ts, tri-vendor smoke)
## Vendor-parity workflow (tri-compare → rank → export → publish)
## What NOT to do (anti-patterns, token traps, data hazards)
## Canonical corpora (S/F data files, HyperMILL catalogs, tribal tips, AppData live vendor)
## Closed-loop integration with india (outcome-bus, feature-emission, tribal-capture, calibration)
## Ollama routing for this domain
## AI-systems fleet state (pointer only)
## Critic + keep-working contract (pointer only)
```

---

## UNIVERSAL-CORE POINTER

The following universal rules are **not** duplicated in this galaxy file — they are read once from the main `H:/prism/CLAUDE.md` (loaded at session start). This galaxy file need only carry a one-line pointer:

> Universal doctrine: `H:/prism/CLAUDE.md` — R1–R15 (Karpathy + agent-era), scrutiny 3-of-3 gate, per-chat handoff (`per-agent-handoff.mjs`), commit format `[SCOPE]/U-ID`, slot-worktree lane discipline, duplication guard (`duplicationGuardEngine.mustCheckBeforeCreating`), no-stub enforcement, `PRISM-INVENTORY-LATEST.md` for live counts, fleet orchestration patterns, NN-GRAPH/GNN posture, GOLF slot, FLEET-REAPER.

Specific universal rules that oscar MUST NOT re-state (already enforced fleet-wide):
- R12 fail-loud (universal)
- R6 context-growth not a stop signal (universal)
- 3-of-3 scrutiny gate + `scrutinize-before-stop.mjs` (universal Stop hook)
- `duplicationGuardEngine` pre-build check (universal PreToolUse hook)
- `comprehensive-build-enforce` no-stub gate (universal)
- Per-chat handoff write/read pattern (universal)
- `rtk` bash prefix (universal)
- Schema versioning + migration pattern (universal)
- GOLF slot hygiene (not oscar's concern)
- Fleet-reaper + memory-monitor (golf's responsibility)
- NN-GRAPH GNN selective-deploy posture (pointer only — india owns)
- Multi-agent spawn patterns (`build-doctor`, `forge-team`, etc.) (universal)

What oscar DOES need inline (domain-overrides the universal defaults):
- SFC-specific constant-import rule (stronger than the generic "no inline physics" because the hook `oscar-sfc-constants-guard.mjs` fires only in this galaxy)
- CSS/G50 lathe clamp (domain-unique — not in the universal rails)
- Round-at-display-not-calc (domain-unique regression with a named fix commit)
- 6 physics invariants (domain-unique list)
- Fake tryBusCapture() bug notice (oscar-specific open R12 item)
