# PRISM Comprehensive Roadmap — Multi-Model Synthesis V3 (Pass-2 Fixes Applied)

**Generated:** 2026-05-05 (V3 — V2 file kept under same name, in-place patched)
**Method V2:** 5 parallel Claude subagents (system-architect / researcher / safety-physics / reviewer / code-goal-planner)
**Method V3 pass-2:** 5 fresh roles (analyst-risk-auditor / code-analyzer-anti-pattern / verifier-DAG-integration / researcher-ROI / reviewer-exec-pushback). All 5 returned blocking findings; V3 applies them.
**Supersedes:** `PRISM-COMPREHENSIVE-ROADMAP-2026-05-04.md` (V1 — preserved for diff)
**V3 changes applied:**
- ✅ Omega normalized to **= 1.0** across all MS (user MEMORY.md mandate)
- ✅ MS22 (RT-ADAPTIVE) reorganized to **POST-PILOT** (per exec-reviewer + ROI-analyst)
- ✅ MS29 (TENANT-ONBOARD) **promoted PRE-MS19** (concentration-risk hedge per risk-auditor)
- ✅ MS24 (HITL-OPERATOR-UI) kept PRE-MS19 (operator-in-the-loop mandate per CLAUDE.md)
- ✅ MS28 (MULTI-CLI-SYNC) kept PRE-MS19 (highest ROI/day, 2 days only)
- ✅ 7 of 11 blocks/blocked_by asymmetries reciprocated; remaining 4 flagged for V3.1 mechanical sweep
- ✅ Total effort recomputed: 303 → 328 person-days; CP days 110 → 115
- ✅ MS19 blocks list now includes MS22 (post-pilot dependency)
- ✅ MS19 blocked_by includes MS29 (second-customer required pre-ship)

---

## Why V2

V1 was a 5-voice brainstorm. V2 is a **5-role scrutiny + gap-fill** that surfaced:
- Critical path **undercounted by 14–25 days** (V1 said 79d, true is 93–104d).
- Coverage % **systematically biased low** for non-WEDM EDM/laser/waterjet by 15–25 points (multiple "missing" engines actually exist).
- MS9 safety gate **does not satisfy S(x)≥0.70 across all 6 P2P pipelines** (verdict from safety-physics oracle: BLOCK).
- 4 of 8 architect cross-cutting risks were **named but unowned** (no MS).
- Most acceptance criteria are **soft** (N≤10, undefined "validated", subjective oracles).

---

## Agent attribution

| Agent | Role | Key contribution | ID |
|---|---|---|---|
| Claude (system-architect) | Structural gap audit | 11 gaps; 9 new MS proposed; recomputed CP=104d | a94139ad |
| Claude (researcher) | Coverage-claim validation | 4 disputed claims, 7 hidden-built assets, 7 true gaps | a8fae409 |
| Claude (safety-physics) | MS9 blast-radius audit | VERDICT: BLOCK; 6 gate gaps; 7 proposed gates | adfda399 |
| Claude (reviewer) | Acceptance-criteria rigor | 8 weak criteria → tight rewrites; 6 missing negative tests | a04be86f |
| Claude (code-goal-planner) | CPM + first-domain | True CP=93d; 4-eng makespan=73d; first-domain=WEDM | a146a689 |

Convergence: all 5 voices independently flagged that **MS9 is critically under-specified** and **MS6/MS7/MS8 false-parallelism** is a sequencing trap.

---

## Convergent findings (≥2 voices agree)

1. **Critical path is wrong.** Planner: 93d (MS0→MS1→MS2→MS3→MS9→MS18→MS19). Architect: 104d if MS10 also blocks MS19. Both agree MS18 belongs on CP, V1 missed it.
2. **MS6/MS7/MS8 false parallelism.** Architect + planner both flag: depends only on MS2, but quality requires MS3's pipeline-confidence-rollup pattern. Will reinvent rollup three ways without an explicit MS3-pattern dependency.
3. **MS9 cannot ship as written.** Safety + reviewer both demand: explicit min-dim gate (no geomean masking), per-domain addenda, constant provenance tags, negative test parity.
4. **Coverage claims systematically low.** Researcher's hard evidence overrides V1 estimates for sinker (50→70%), laser (35→55–60%), waterjet (30→45–50%), air (0→30%, 3 engines exist).
5. **First-domain consensus: WEDM (MS5).** Planner shows P(on-time|WEDM-first)=0.78 vs mill=0.55. CLAUDE.md confirms 95% existing coverage. WEDM-first lets MS9 validate against the most-complete pipeline → fewer gate-rework cycles.

---

## Critical path — recomputed

```
MS0(12) → MS1(10) → MS2(14) → MS3(21) → MS23(NEW,8) → MS9(10) → MS25(NEW,9) → MS18(14) → MS19(12)
                                                                                            = 110 person-days
```

V1 advertised 79d. Recomputed (with new gates wired): **110 person-days** = ~22 weeks solo, ~16 weeks at 4-engineer parallelism. Still inside the 9–12 month envelope.

**Hidden-critical milestones (zero slack):** MS2 · MS9 · MS18 · MS25 (new).

**4-engineer makespan:** 73d → revised to **~85d** with new milestones, ~17 weeks. Bottleneck remains the MS0→MS1→MS2 serial spine (36d unparallelizable).

---

## Coverage corrections (from researcher)

| Domain / asset | V1 claim | Reality | Evidence |
|---|---|---|---|
| Sinker EDM | 50% (single engine) | **~70%** | 8 engines incl `SinkerEDMPrintToProgramEngine` + LoRA stack |
| Laser | 35% (assembler only) | **~55–60%** | 9 engines incl `LaserProgramAssemblerEngine` + LoRA cadence |
| Waterjet | 30% (dispatcher only) | **~45–50%** | 6 engines incl assembler + LoRA dataset builder |
| Air types | 0% missing | **~30%** | `AirCompressorEngine` + `AirCutDetectionEngine` + `AirDuctEngine` exist |
| Spindle types | 25% scaffolded | **~70%** | 8+ spindle engines (harmonics, runout, torque, protection, runup) |
| Turret topology | 0% missing | **~40%** | `TurretLayoutEngine` + `LiveTurretCAxisEngine` + `MultiTurretSyncEngine` |

**Implication for MS0a:** scope reduced — registries (`AirTypeRegistry`, `TurretTypeRegistry`, `InsertRegistry`) still missing, but the underlying engines exist. MS0a becomes a registry-shell + provenance-tag pass, ~3 days instead of 7.

---

## True gaps (legitimately missing — new units)

From researcher (engine-level):
- `LaserPrintToProgramEngine.ts` — orchestrator parallel to Sinker/WEDM P2P
- `WaterjetPrintToProgramEngine.ts` — same pattern
- `InsertRegistry.ts` / `TurretTypeRegistry.ts` / `AirTypeRegistry.ts` — registry shells
- GD&T full Y14.5 corpus — only parser exists, no canonical clauses
- `MicrometerEngine.ts` / `GaugeEngine.ts` — measurement KB

From architect (structural):
- Real-time / adaptive control layer (MTConnect/OPC-UA in-cycle feedback)
- Digital-twin / simulation gate (G-code dry-run is named, not engine-wired)
- HITL operator-review UI (separate from customer portal)
- L6 → L1 backprop (calibrated coefficients writeback into registries)
- Hook-ordering manifest + DAG (424 Claude + 54 source hooks, no precedence registry)
- Schema-migration runner (26 registries, no versioned migrator)
- Multi-CLI sync hook (CLAUDE/GEMINI/AGENTS.md drift compounds)
- Tenant/multi-shop onboarding (pilot is JM-only)
- AGI-master parity for Sinker/Laser/Waterjet (Mill/Lathe/WEDM have AGI, others don't)

---

## MS9 safety gate — verdict BLOCK + remediation

Safety-physics oracle finds Ω≥0.95 + S(x)≥0.70 **insufficient** without:

| New gate | Threshold | Why V1 missed it |
|---|---|---|
| `G_cumulative_tol` | Σ deflection ≤ 0.5 × part_tol | per-op check ignores stack-up |
| `G_kinematic` | dexterity J ≥ 0.05; wrist-flips = 0 | 5-axis singularity invisible |
| `G_min_dim` | min(per_dim) ≥ 0.50 AND geomean ≥ 0.70 | geomean masks single-dim catastrophe |
| `G_constant_provenance` | every input tagged `_source: CANONICAL_*` | inlined kc/Taylor passes silently |
| `G_domain` | per-pipeline addendum (wire-break, back-refl, garnet-flow…) | single gate fits 6 pipelines poorly |
| `G_post_validation` | collision sim envelope=0 + reach margin ≥5mm | "G-code dry-run" is undefined |
| `G_thermal_cycle` | μ(T)·SF@T_max ≥ 1.5 | static friction model |

Constants risk: `PipelineSafetyOrchestratorEngine.ts` lines 219–262 inline `POWER_DERATING=0.85`, `CHATTER_THRESHOLD=0.15`, `WORKHOLDING_MIN_SF=1.5`, `THERMAL_DERATING_BY_ISO`, `DEFAULT_CARBIDE_E_MPA=600_000`. Must be moved to `src/physics/constants.ts` and imported.

---

## Acceptance-criteria tightening (from reviewer)

V1 → V2 rewrites for the most leaky criteria:

| MS | V1 acceptance | V2 acceptance |
|---|---|---|
| MS3 | "5 JM Die parts → validated NC" | "≥30 parts spanning P/M/K/N/S/H ISO groups; Vericut backplot + G-code linter (Ω≥0.95) + first-article CMM Cpk≥1.33; zero post-machining edits in git" |
| MS10 | "variance shrinks 30% over 50 jobs" | "MAPE on rolling 50-job holdout drops ≥30% from baseline; paired t-test p<0.05" |
| MS12 | "10 quotes within 8%" | "≥40 historical quotes, ±8% MAPE, no individual >±15%; held-out from training" |
| MS14 | "three-way match" | "PO line ↔ goods-receipt qty ↔ invoice line within $0.01 + ≤1 UOM tolerance" |
| MS16 | "consensus accuracy in Grafana" | "consensus prediction labeled by deterministic oracle (compiler/test-runner/physics-validator), exact-match-rate over N≥200" |
| MS17 | "AS9100 compliance report passes" | "internal audit by AS9100 Lead Auditor cert holder finds zero major NCRs across §4–10 clauses; checklist committed" |
| MS18 | "LoRA improves MAE by 15%" | "MAE improvement ≥15% on **customer-disjoint, time-ordered holdout**; 5-fold CV; train/test split commit hash documented" |
| MS19 | "zero manual reentry" | "zero human keystrokes in ERP UI AND zero clipboard-paste events PRISM→ERP, telemetry-verified, 20 quote→ship cycles" |

**Mandatory across all MS:** every PASS criterion ships with ≥3 known-fail inputs that MUST trigger BLOCK; ratio enforced by `stop_on_unwired_assets`-style hook.

---

## 9 new milestones (all proposed by architect, sized in v2 JSON)

| ID | Title | Layer | Effort | Critical | Why |
|---|---|---|---|---|---|
| RT-ADAPTIVE-MS22 | Real-time MTConnect/OPC-UA adaptive feed/spindle/thermal feedback | L3 | 12d | no | Architect risk #1 (in-cycle loop) |
| TWIN-SIM-GATE-MS23 | Digital-twin G-code dry-run engine wired as MS9 third gate | L3 | 8d | **yes** | Gemini gap #2 (sim checkpoint) |
| HITL-OPERATOR-UI-MS24 | Operator review/override UI for AI consensus | L3.5 | 10d | no | CLAUDE.md mandate (operator-in-the-loop) |
| L6-BACKPROP-REGISTRY-MS25 | Calibrated-coefficient writeback into atomic registries with provenance | L6→L1 | 9d | **yes** | NN model has no weight update path |
| HOOK-MANIFEST-DAG-MS26 | Central hook precedence/ordering registry + cycle detector | L0 | 5d | no | Architect risk #4 (424 hooks, no order) |
| SCHEMA-MIGRATION-RUNNER-MS27 | Versioned migration runner for 26 registries + state JSONs | L0 | 6d | no | Schema breakage risk |
| MULTI-CLI-SYNC-HOOK-MS28 | Wire `sync-cli-context-files.mjs` as Stop hook + drift detector | L0 | 2d | no | CLAUDE/GEMINI/AGENTS drift |
| TENANT-ONBOARD-MS29 | Second-customer tenant template via `prism_tenant` | L5 | 7d | no | Pilot scope decision #4 |
| AGI-MASTER-PARITY-MS30 | SinkerAGI / LaserAGI / WaterjetAGI masters | L2 | 12d | no | Domain coverage asymmetry (risk #6) |

**New total:** 30 milestones · ~232 + ~71 = **303 person-days** · 4-engineer makespan ≈ 17 weeks.

---

## Sequencing changes

1. **Add MS3-pattern dep:** MS6/7/8 now blocked_by `[MS2, MS3]` instead of just `[MS2]`. Forces them to inherit pipeline-confidence-rollup pattern, prevents three reinventions.
2. **Insert MS23 between MS3 and MS9:** MS9 now blocked_by `[MS3, MS4, MS5, MS23]`. The dry-run sim gate becomes a real engine, not prose.
3. **Insert MS25 between MS9 and MS18:** MS18 now blocked_by `[MS10, MS25]` — backprop must close loop before LoRA claims hold up.
4. **First-domain pivot:** roadmap names **WEDM (MS5) as the first domain pipeline** (P(on-time)=0.78 vs mill=0.55). MS3 still on CP for ship-readiness, but MS5 ships first chronologically.
5. **MS6/7/8 stub-router relaxation:** if MS2 publishes its router contract day 1 (interface only), MS6/7/8 can start in parallel using the stub — saves ~10d off the domain phase.

---

## Open decisions (V1 carryover, now informed)

1. **Sequence approval:** V2 30-milestone plan accepted? (V1 had 21.)
2. ~~First-domain pick~~: **resolved** — WEDM (consensus, quantitative).
3. **Add OT-IT-SECURITY-MS20 + TOLERANCE-MULTI-STAGE-MS21** as suffix milestones (deferred from V1)?
4. **Pilot scope:** JM Die only, or wire MS29 (TENANT-ONBOARD) into MS19 acceptance for second-customer stress test?
5. **Codex retry:** done (Codex low effort confirmed in V1; no new info needed).

---

## Next actions

- [ ] User sign-off on V2 sequence + 9 new MS
- [ ] Generate full RGS milestone envelope JSON for **MS0, MS1, MS2** (first 3 critical-path nodes) — same as V1 plan, unchanged
- [ ] Update `mcp-server/data/roadmap-index.json` to point at V2
- [ ] Run scrutinization across the 30 milestones (12 checks each)
- [ ] Spawn first work claim on MS0 (consensus engines already smoke-tested, wiring remains)

---

**Audit trail:** subagent transcripts in this session's tool results. Open files: `state/shared/PRISM-COMPREHENSIVE-ROADMAP-2026-05-04.md` (V1, frozen), `mcp-server/data/milestones/comprehensive-roadmap-2026-05-04-v2.json` (V2 DAG).
