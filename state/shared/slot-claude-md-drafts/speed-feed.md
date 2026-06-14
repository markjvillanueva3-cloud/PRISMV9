# Speed-Feed (SFC) Galaxy — slot:oscar
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = speed-feed domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** Speed/Feed Calculator (SFC) — one of two saleable subscription products. 9-axis SFC,
auto-speed-feed, per-material/per-tool/per-machine S/F prediction, vendor parity (G-Wizard, HSMAdvisor),
chatter stability, tool-wear models, tri-compare, proven S/F aggregation, calibration persist loop.

**EXCLUDES:** turning toolpath generation → whiskey; EDM cutting conditions → mike; CAM strategy
selection → kilo; G-code emission → echo; business subscription billing → hotel; LoRA model training
→ india (oscar feeds data; india owns training).

**Slot:** oscar · Worktree: `H:/prism-slot-oscar` · Branch: `slot/oscar`

---

## §2 — Verified engines

Engines live at `mcp-server/src/engines/` (flat — NOT under `engines/speed-feed/`).

| Role | Engine file |
|------|-------------|
| Canonical physics orchestrator | `UltimateSpeedFeedEngine.ts` (31 models, 401-assert gauntlet) |
| Central hub orchestrator | `SpeedFeedOrchestratorEngine.ts` (2,851 LOC) |
| 9-axis composition + clamp | `SpeedFeedNineAxisOrchestratorEngine.ts` |
| Outcome feedback / bus capture | `SpeedFeedOutcomeFeedbackBridgeEngine.ts` (KNOWN BUG — see §5) |
| Bayesian hypothesis ranker | `SFCMultiHypothesisRankerEngine.ts` |
| Median+IQR correction | `SFCParameterRefinementEngine.ts` (clamp [0.25, 4.0]) |
| Bayesian PSN prior | `SpeedFeedPSNDecisionPriorEngine.ts` |
| Fan-out propagation | `SpeedFeedPropagationBridgeEngine.ts` |
| Downstream cache subscriber | `SpeedFeedDownstreamSubscriberEngine.ts` |
| G-Wizard adapter | `GWizardAdapterEngine.ts` · `GWizardComparatorBridgeEngine.ts` · `GWizardToolCribExportEngine.ts` |
| HSMAdvisor adapter | `HSMAdvisorAdapterEngine.ts` · `HSMAdvisorComparatorBridgeEngine.ts` · `HSMAdvisorSettingsExportEngine.ts` |
| CAM S/F vocab normalize | `CAMSpeedFeedBridgeEngine.ts` (6 CAM systems) |
| Chatter stability | `SpeedFeedChatterStabilityAdapterEngine.ts` · `ChatterStabilityLobeEngine.ts` |
| Tool catalog aggregator | `ToolCatalogEngine.ts` · `ToolCatalogAdaptiveEngine.ts` |
| Auto speed-feed | `AutoSpeedFeedEngine.ts` · `AutoSpeedFeedCalculatorEngine.ts` |
| SFC optimize | `SFCOptimizeEngine.ts` |
| SFC calculate | `SFCCalculateEngine.ts` |
| Kienzle force model | `KienzleForceModelEngine.ts` |
| Tool deflection | `ToolDeflectionPredictionEngine.ts` |
| Proven S/F aggregator | `ProvenSpeedFeedAggregatorEngine.ts` |
| Spindle power gate | `SpindlePowerCheckEngine.ts` · `SpindleTorqueGateEngine.ts` |

Algorithm engines (NEVER call directly — import only via physics constants + engine APIs):
`KienzleForceModelEngine.ts` (confirmed) · `JohnsonCookConstitutiveEngine.ts` (confirmed) ·
`GilbertEconomicSpeedEngine.ts` (confirmed) · `ToolWearRateEngine.ts` (confirmed) ·
`StochasticToolWearEngine.ts` (confirmed)

Note: `ExtendedTaylorModel.ts`, `MerchantShearForceModel.ts`, `PowerTorqueCalc.ts`,
`FRFStabilityLobe.ts`, `STFTChatter.ts`, `SpindleVibFFTModel.ts`, `BayesianWearModel.ts`,
`UsuiWearModel.ts` — named in prior docs but **// UNVERIFIED** (not found in flat engines dir this session).

**Data file (NOT an engine):** `mcp-server/src/data/machine-kinematics-enriched.ts` (430K) — grep-only.

---

## §3 — Dispatcher quick-ref (prism_calc — verified against calcDispatcher.ts)

Primary SFC actions (daily use):

| Action | Use |
|--------|-----|
| `ultimate_speed_feed` | Single-cell physics (line 5357) |
| `sfc_calculate` | Core S/F calc (line 9126) |
| `sfc_feed_for_target` | Inverse: target MRR → feed (line 9131) |
| `sfc_nine_axis_run` | **PRIMARY** — 9-axis composition + clamp (line 1192) |
| `sfc_optimize_run` | End-to-end optimization run (line 1190) |
| `sfc_shop_library_rank` | Rank from on-hand shop tool library (line 1194) |
| `sfc_rank_hypotheses` | Bayesian arbiter across physics/RAG/adapter (line 9530) |
| `sfc_ranker_stats` | Ranker metadata (line 9544) |
| `sfc_parameter_refinement_compute` | Median+IQR correction from actuals (line 9563) |
| `auto_speed_feed_calc` | Auto-SF prediction (line 9696) |
| `cam_speed_feed_bridge` | Normalize CAM S/F vocab ↔ orchestrator (line 9724) |
| `speed_feed_mine` | Mine JM Die programs for S/F data (line 9758) |
| `speed_feed_tri_compare` | PRISM × baseline × G-Wizard matrix (line 9801) |
| `speed_feed_exhaustive_sweep` | Physics-invariant bounded cartesian sweep (line 9815) |
| `speed_feed_calibration_persist` | Persist calibration actuals (line 9869) |
| `speed_feed_gpu_judge` | GPU-accelerated judging (line 9890) |
| `speed_feed_compare_to_baseline` | Diff vs vendor baseline DBs (line 9778) |
| `speed_feed_autopilot` | Autopilot S/F run (line 9919) |
| `sfc_pdf_corpus_bridge` | S/F extraction from PDF corpus (line 1200) |
| `gwizard_read_toolcrib` / `gwizard_export_toolcrib` | G-Wizard live toolcrib R/W (lines 1204/1206) |
| `hsmadvisor_read_current_state` / `hsmadvisor_compare` / `hsmadvisor_export_settings` | HSMAdvisor R/W (lines 1196–1202) |
| `proven_speed_feed_aggregate_mill` / `_aggregate_lathe` / `_query` / `_export` | Proven S/F DB ops (line 1156) |
| `speed_feed_resource_sfm` / `_chiploads` / `_hem` / `_facemill_strategy` / `_jmdie_material` / `_optimal` | Resource lookups (lines 1160–1161) |
| `joint_speed_feed_optimize` | Joint optimization (line 1265) |
| `stepover_calc` | Stepover calculation (line 825) |

Safety gates — ALWAYS run before surfacing aggressive RPM to user:
- `prism_safety:check_spindle_torque` — spindle clamp gate
- `prism_safety:validate_physics` — S(x) gate

**MCP-down fallback:** `node H:/prism/mcp-server/scripts/sfc-standalone.mjs` // UNVERIFIED path — check TOOLBELT.md

---

## §4 — Canonical constants + data paths

**NEVER inline cutting constants.** Import from `mcp-server/src/physics/constants.ts` only.
Canonical kc1.1 per ISO group: P=1800, M=2100, K=1100, N=700, S=2800, H=3200. Taylor C/n, Merchant
shear, all cutting physics live there — not in any engine body, not from any LLM output.
Hook: `oscar-sfc-constants-guard.mjs` // UNVERIFIED — verify before relying on it.

**Registries (mcp-server/src/registries/):**

| Registry | Entries |
|----------|---------|
| `CoatingRegistry.ts` | 100 coatings |
| `PhysicsMappingRegistry.ts` | 1,942 entries |
| `MaterialRegistry.ts` | material groups |
| `ToolRegistry.ts` | tool geometry |
| `MachineRegistry.ts` | machine profiles |
| `MachineSpindleDefaults.ts` | spindle defaults (note: NOT `MachineSpindleDefaultsRegistry.ts`) |
| `CoolantRegistry.ts` | coolant types |

**Large data files — NEVER full-read; grep + offset-read only:**

| File | Size | Access rule |
|------|------|-------------|
| `mcp-server/src/data/hypermill-speed-feed-catalog.ts` | 1.2MB | grep material/tool name, offset ±60 lines |
| `mcp-server/src/data/hypermill-materials-catalog.ts` | 1.2MB | grep material/tool name, offset ±60 lines |
| `mcp-server/src/data/machine-kinematics-enriched.ts` | 430K | grep only — DATA FILE, not engine |
| `mcp-server/src/tools/dispatchers/calcDispatcher.ts` | large | grep `sfc_\|speed_feed_` case labels, then offset |

**Vendor live data (NOT in repo — AppData):**
- HSMAdvisor: `C:/Users/wompu/AppData/Roaming/HSMAdvisor/`
- G-Wizard: `C:/Users/wompu/AppData/Roaming/GWizard.*/Local Store/toolcrib.csv` (backups exist before any export)

---

## §5 — Domain gotchas / safety rails

1. **NEVER inline Kienzle/Taylor/material constants** — import from `constants.ts`. The invariant is
   stronger here because `oscar-sfc-constants-guard.mjs` fires only in this galaxy — do not bypass.

2. **Spindle power = CLAMP, not a target.** Every S/F recommendation MUST pass
   `prism_safety:check_spindle_torque` before surfacing to the user. Exceeding spindle power = stall or
   tool pull-out.

3. **Round at DISPLAY, not inside the calculation.** `Math.round`/`Math.floor` inside an SFC engine
   body is a regression (fixed in AutoSpeedFeed `1b87f98f2` — do not reintroduce). Intermediate values
   carry full float precision.

4. **CSS/G50 lathe RPM cap is mandatory.** Every `LatheSpeedFeed*` path computing constant surface speed
   (G96) MUST carry a `G50 S<maxRPM>` clamp. Missing cap = runaway spindle.

5. **`SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture()` is hardwired `return true` (R12 OPEN).** The
   `speedfeed_outcome_stats` `bus_capture_success_rate_pct` metric is a fake constant 100%. Do NOT trust
   or report this number until the real bus is wired. Flagged by bravo's 2026-06-11 sweep.

6. **6 non-negotiable physics invariants** — detail in
   `knowledge/memories/feedback/feedback_oscar_sfc_physics_discipline.md`. Read before shipping any new
   S/F model or tuning change.

7. **WIRE-EXEMPT verification rule.** Before adding `// WIRE-EXEMPT` to any SFC engine, grep-confirm the
   named wrapper singleton actually imports it. Bravo found phantom exemptions in SFC engines (2026-06-11).

8. **Feed units are IPM for mill, IPR for lathe** — confusing them is a 25.4× chip-load error. The
   `LatheSpeedFeed*` engines use IPR; mill engines use IPM. Verify units at the interface boundary.

---

## §6 — What NOT to do

- **DO NOT full-read `hypermill-*-catalog.ts` or `machine-kinematics-enriched.ts`** — grep + offset only.
- **DO NOT full-read `calcDispatcher.ts`** — grep `sfc_\|speed_feed_` case labels, offset to case body.
- **DO NOT write tribal tips as raw markdown** to `knowledge/tribal/speed-feed-*.md` — auto-overwritten
  on regen. Use `prism_calc:tribal_capture` or `prism_knowledge:tribal_capture {slot:'oscar'}`.
- **DO NOT deploy a new S/F model** without AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15 on
  operator-verified data (india's LoRA gate).
- **DO NOT trust `speedfeed_outcome_stats` bus_capture_success_rate_pct** — hardwired 100% (R12 open bug).
- **DO NOT reference `MachineSpindleDefaultsRegistry.ts`** — actual filename is `MachineSpindleDefaults.ts`.
- **DO NOT re-glob `mcp-server/src/engines/`** every session — PATHS.md has the verified inventory.
- **DO NOT copy-paste MEMORY.md bullet blocks into this file** — MEMORY.md is the brain; CLAUDE.md
  carries verified doctrine only.

---

## §7 — Domain workflow / pipeline contract

Oscar's primary recurring task cycle (tri-vendor parity loop):

1. `sfc_nine_axis_run` — compute on a material × tool × machine cell.
2. `speed_feed_tri_compare` — PRISM × G-Wizard × HSMAdvisor matrix comparison.
3. If delta > tolerance → `sfc_rank_hypotheses` — identify which model disagrees.
4. `gwizard_export_toolcrib` → `C:/Users/wompu/AppData/Roaming/GWizard.*/Local Store/toolcrib.csv`
   (back up originals before overwrite).
5. `speed_feed_calibration_persist` — persist actuals.
6. `xproc_outcome_publish {slot:'oscar', domain:'speed-feed'}` — close the learning loop. // UNVERIFIED action name

---

## §8 — Tribal + corpus pointers

**Wiki entries:**
- `knowledge/wiki/code-tribal/math-speed-feed-the-full-physics.md` — full Kienzle/Taylor/Merchant physics
- `knowledge/wiki/code-tribal/math-cutting-mechanics-merchant-oxley.md` — Merchant/Oxley mechanics
- `knowledge/wiki/architecture/speed-feed-galaxy.md` — SFC architecture overview

**JM Die corpus:** `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NEVER Glob the 24K-file tree.
S/F data mined via `speed_feed_mine` action.

**Data corpora:**
- Vendor S/F tables: `mcp-server/src/data/*speed-feed-data.ts` (~6 files)
- Tool catalog JSON: `mcp-server/src/data/*-extracted.json` (~24 files, 41,192 deduped tools)
- Tribal cited tips: `mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts` (260KB —
  Kennametal/Sandvik/CNC-Cookbook; grep-only)
- JM on-hand shop tools: `mcp-server/src/data/shop-tools/shop-tools-{endmills,twist-drills,...}.csv`
  (218 tools)
- Vendor catalog extraction worklist: `state/shared/quoting/catalog-sfc-extraction-manifest.json`

**Synthesis brain:** `mcp-server/src/engines/speed-feed/MEMORY.md`

**Free corpus sources (for ingestion, not yet wired):** IIT Bombay machining notes, ACS cutting data,
ISCAR catalog pointers — tracked in oscar MEMORY.md.

**Tribal write rule:** `prism_knowledge:tribal_capture {slot:'oscar'}` — NEVER direct markdown writes.

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge |
|-----------|--------|--------|
| oscar → mill | mill (foxtrot) | S/F recommendations consumed per VMC tool call |
| oscar → lathe | lathe (whiskey) | `LatheSpeedFeed*` engines; IPR feed units |
| oscar → wedm | wedm (mike) | EDM cutting conditions (separate physics — Kienzle/Taylor DO NOT apply to EDM) |
| oscar → echo | post-processor (echo) | `cam_speed_feed_bridge` → `ToolpathBlock` → NC block injection |
| oscar ↔ india | ai-training | LoRA-trained SFC models per-material; oscar feeds outcome data, india owns training |
| oscar → hotel | business | Subscription billing signals; MRR→cycle_min bridge via `SpeedFeedToQuoteBridgeEngine.ts` |
| oscar → lima | academy | SFC training course content |
| oscar ← kilo | cam | CAM strategy requests S/F via `prism_calc:sfc_nine_axis_run` |
| oscar ← charlie | quoting | MRR→cycle_min cost data via `SpeedFeedPropagationBridgeEngine.ts` |

---

## §10 — Closed-loop integration (india)

Publish outcomes every session: `xproc_outcome_publish {slot:'oscar', domain:'speed-feed'}` // UNVERIFIED action name
Tribal capture: `prism_knowledge:tribal_capture {slot:'oscar'}` — NEVER direct markdown writes.
Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`

Note: `outcome-bus-auto-tap.mjs` was cited in prior docs — **verified absent** from hooks tree (R12).
Also: `xproc_calibration_monitor_record` and `xproc_kg_project_features` action names are **// UNVERIFIED**
until grep-confirmed in the dispatcher source.

---

## §11 — Test commands

```bash
# 401-assertion gauntlet — canonical SFC regression gate:
cd mcp-server && rtk npx vitest run src/__tests__/UltimateSpeedFeedEngine.test.ts --reporter=verbose

# All SFC tests:
cd mcp-server && rtk npx vitest run -t "SpeedFeed|SFC|speed.feed|sfc"

# Specific nine-axis test:
cd mcp-server && rtk npx vitest run src/__tests__/sfc-nine-axis-radial-engagement.test.ts
```

---

## §12 — Known bugs / open threads

- **`SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture()` hardwired `return true`** — `speedfeed_outcome_stats`
  bus_capture_success_rate_pct is fake 100%. Real bus wiring is an open R12 item (bravo sweep 2026-06-11).
- **WIRE-EXEMPT phantom markers** — bravo found SFC engines with `// WIRE-EXEMPT` where the named wrapper
  singleton does NOT import them. Audit before marking any new engine exempt.
- **`xproc_outcome_publish` / `xproc_calibration_monitor_record` / `xproc_kg_project_features`** —
  action names in prior docs are unverified; grep calcDispatcher.ts before relying on them.

Open thread ledger: `mcp-server/src/engines/speed-feed/MEMORY.md` (oscar soul notes)

---

## §13 — AI / reasoning surface

```bash
node H:/prism/scripts/lib/galaxy-reasoning-bridge.mjs speed-feed "<question>"
```

Domain Ollama routing:
- Explain Kienzle/Taylor/Merchant derivation → `gpt-oss:120b` (deep local reasoning)
- Lint SFC engine code / summarize dispatcher actions → `qwen2.5-coder:32b`
- Quick filter / synthesis / classify S/F data → `gpt-oss:20b`

Numeric constants: always from `constants.ts`, never from LLM output.
AI fleet state pointer: `knowledge/memories/patterns/ai-systems-fleet-state.md`
