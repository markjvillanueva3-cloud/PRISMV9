# PRISM Comprehensive Roadmap — Multi-Model Synthesis

**Generated:** 2026-05-04
**Generation method:** 5-voice multi-model brainstorm (Codex was killed at 5min — xhigh effort hung; the other 5 voices were sufficient)
**Authoritative for:** 9-12 month integration timeline
**Supersedes:** prior single-author roadmap fragments. Linked from `roadmap-index.json`.

---

## Provenance — voices consulted

| Voice | Role | Time | Output |
|---|---|---|---|
| Claude subagent (system-architect) | 7-layer audit + cross-cutting risks | 62s | 7-row table, 8 cross-cutting risks |
| Claude subagent (code-goal-planner) | Milestone JSON with deps/effort/risk | 60s | 21 milestones, 232 person-days total |
| Claude subagent (researcher) | Coverage % by subsystem | 65s | 36-row audit, top-5 underbuilt |
| Gemini 2.5-flash (REST, free tier) | "Commonly missed" + weak links | 0.6s | 8 missed items, 3 weak links, 3 checkpoints |
| Ollama qwen2.5-coder:7b (local) | Independent ordering check | ~3s | Confirmed bottom-up sequence |
| Codex gpt-5.5 low (retry) | ~50s | ✓ 24-milestone JSON, broadly aligns with goal-planner; adds 2 scope items (production-hardening governance, closed-loop eval harness as distinct from calibration) | saved at H:/tmp/codex-low.txt |

**Audit trail saved:** `H:/tmp/gemini-gaps.txt`, `H:/tmp/ollama-roadmap.txt`. Subagent outputs in this session's transcript.

---

## Mental model — 7 layers as a neural network

```
L0 Dev infra            ─── substrate (skills/scripts/hooks/CLAUDE.md/MCP/595 skills)
L1 Atomic databases     ─── input neurons (26 registries, 29k entries)
L2 Domain layers        ─── hidden layers (mill / lathe / wedm / sinker / laser / waterjet)
L3 Per-job orchestration─── forward propagation (11-step print-to-program pipeline)
L4 Multi-model consensus─── activation function (Claude+Codex+Gemini+Ollama)
L5 Business             ─── output layer (ERP/HR/quote/accounting)
L6 Learning             ─── backprop (outcome capture → calibration → tribal updates)
```

**Diagnosis (from architect voice):** Atomic and database layers are dense. The unproven layer is **end-to-end runtime under live multi-model consensus.** "We have all the engines, not sure if our orchestrators can produce a proper program" is the real gap — and the architect agrees: L3 pipelines have independent confidence fields with no end-to-end rollup, late-stage failures force full restart, and consensus is opt-in at the wrong altitude.

---

## Reality — what exists per subsystem

### Atomic databases (L1)
| Item | Coverage | Status |
|---|---|---|
| Materials | ~75% | production (`MaterialRegistry.ts`) |
| Tooling | ~60% | production (`ToolRegistry.ts`) |
| Machines | ~70% | production (`MachineRegistry.ts`, 21 JM Die wired) |
| Coolants | ~60% | production (`CoolantRegistry.ts`) |
| Post processors | ~80% | production (`PostProcessorRegistry.ts`) |
| Toolpath strategies | ~85% | production (`ToolpathStrategyRegistry.ts`) |
| CAM systems | ~85% | production (`CAMSystemRegistry.ts`, 28+ CAMs) |
| Formulas | ~80% | production (`FormulaRegistry.ts`, 499 baseline) |
| Tribal knowledge | ~75% | production (5000+ tips) |
| Tool holders | ~40% | partial (engine only, no registry) |
| Inserts | ~30% | scaffolded (selection engines, no `InsertRegistry`) |
| Spindle types | ~25% | scaffolded (defaults only) |
| GD&T standards | ~55% | partial (parser yes, full Y14.5 corpus unknown) |
| **Air types** | **0%** | **missing** |
| **Turret types** | **0%** | **missing** |

### Domain pipelines (L2 → L3 runtime)
| Domain | Coverage | Status |
|---|---|---|
| Wire EDM | ~90% | production (62 engines, 26 JM Die programs indexed) |
| Lathe | ~85% | production (deepest stack: DL + KG + reasoning) |
| Milling | ~80% | production (real-blueprint test status: unknown) |
| Sinker EDM | ~50% | partial (single engine vs WEDM's 62) |
| Laser | ~35% | scaffolded (assembler only, no PrintToProgram) |
| Waterjet | ~30% | scaffolded (dispatcher actions only) |

### Business layer (L5)
ERP 75% / HR 60% / Sales 55% / Quoting 80% / Accounting 70% / Scheduling 70% / Capacity 75% / Customer portal 55% / Order tracking 65% / Invoicing 70% — engines wired, but **L3 actuals don't flow back to L5** (open feedback loop, surfaced by architect risk #7).

### Top-5 underbuilt areas (researcher consensus)
1. **Air types registry** (0%) — affects coolant strategy, MQL/dry/flood routing, pneumatics
2. **Turret types registry** (0%) — lathe/mill-turn programming infers topology ad-hoc
3. **Laser print-to-program** (~35%) — no end-to-end runner analogous to WEDM/Mill/Lathe
4. **Waterjet print-to-program** (~30%) — only dispatcher actions
5. **Insert registry** (~30%) — selection engines exist but no canonical registry backing

---

## Cross-cutting integration risks (architect)

1. **Outcome data starvation** — L6 collectors exist but L3 rarely emits structured completion events; MLP/LoRA train on biased samples
2. **Consensus invoked at wrong altitude** — L4 fires on demos, not at L3 decision points (machine select, strategy pick, post choice)
3. **Registry-to-physics gap** — L1 lacks foreign-key joins (insert→holder→spindle→machine); L2 silently falls back to defaults
4. **Hook gate proliferation without routing** — 422 Claude + 54 source hooks; no central manifest; ordering bugs and silent-skip already observed
5. **Multi-CLI context drift** — CLAUDE.md/GEMINI.md/AGENTS.md sync is manual; Ollama context floor caches 12h
6. **Domain coverage asymmetry** — Mill/Lathe/WEDM have AGI masters and LoRA; Sinker/Laser/Waterjet do not
7. **Business→learning loop open** — L5 quote actuals recorded but not piped back to L6 calibration → estimator drift compounds
8. **No end-to-end confidence rollup** — each L3 stage emits local `AtomicValue<T>` confidence; 0.6×0.6×0.6 chain ships as "high confidence" downstream

---

## Commonly missed in manufacturing-AI roadmaps (Gemini)

Items that aren't in the goal-planner's 21 milestones but should be added to existing scope or as new units:

- **Edge computing / real-time inference deployment** — relevant for adaptive control loops (currently dispatcher-side only)
- **Human-in-the-loop decision augmentation** — UI for review/intervention/validation of AI plans (CLAUDE.md mandates "operator-in-the-loop is unconditional" but no UI plan exists)
- **OT/IT cybersecurity for machine integration** — when machines are network-connected (MTConnect/OPC-UA already in dispatchers)
- **Tolerance stack-up propagation across multi-stage processes** — exists for single-part (`prism_calc:tolerance_stack`); not validated across mill→grind→inspect chains
- **Multi-channel data harmonization** — CAD/CAM/ERP/sensor sync has glue, not a contract

**Three weakest links in print-to-G-code (Gemini, agreed by architect):**
1. Feature recognition & semantic interpretation from CAD
2. Toolpath generation & collision avoidance in complex geometries
3. Post-processing & machine-specific G-code generation

**Three most-effective consensus checkpoints (Gemini):**
1. CAD feature extraction & manufacturability review
2. Simulated toolpath & collision analysis
3. G-code dry run & machine state validation

---

## The 21-milestone critical path

Effort total: **232 person-days** (~46 weeks at 1 senior engineer ≈ 11 months — fits 9-12 month goal). Critical path is 6 milestones: MS0 → MS1 → MS2 → MS3 → MS9 → MS19.

```
                                            ┌──> MS6 SinkerP2P (med val)
                                            ├──> MS7 LaserP2P
                                            ├──> MS8 WaterjetP2P
MS0 Consensus ──> MS1 Ledger ──> MS2 AGI ──┼──> MS3 MillP2P ──┐
Wire (12d)       (10d)          Router(14d)├──> MS4 LatheP2P ─┼─> MS9 Omega ──> MS19 Pilot
                                            └──> MS5 WedmP2P ──┘   Gate (10d)    Release(12d)
                                                                        │
                                            ┌── MS10 Calib ──────────────┤
                                            ├── MS11 MultiDomain ────────┤
MS0a Atomic Audit ──> (in parallel)         ├── MS12 BizQuote (10d) ─────┤
                                            ├── MS13 SchedCap ───────────┤
                                            ├── MS14 ErpSync (13d) ──────┤
                                            ├── MS15 Portal ─────────────┤
                                            ├── MS16 Observability ──────┤
                                            ├── MS17 Compliance ─────────┤
                                            └── MS18 XProcLearn ─────────┘
```

---

## Milestone catalog (full)

JSON list of all 21 milestones with `{id, title, layer, scope_units, effort_days, risk, value, critical_path, blocks[], blocked_by[], acceptance}` is in companion file:

`H:/prism/mcp-server/data/milestones/comprehensive-roadmap-2026-05-04.json`

Highlights:

### Critical path (must complete in order)
1. **INFRA-CONSENSUS-WIRE-MS0** (5u, 12d, med risk) — Wire 4-way consensus into dispatcher decision points. Acceptance: `prism_ai:consensus_decide` returns 3-of-4 vote with provenance. **Note:** restored engines this session already pass smoke test 3/3 unanimous; this milestone is wiring them into the actual dispatcher decision points (not just demos).
2. **INFRA-NEURAL-LEDGER-MS1** (4u, 10d, low risk) — Cross-process outcome ledger + neural feedback bus. Every print-to-program run writes structured outcome event.
3. **INFRA-AGI-ROUTER-MS2** (5u, 14d, med risk) — Unify MillingAGI / LatheAGI / WEDMAGI behind ProcessIntelligenceRouter.
4. **MILL-P2P-CONSENSUS-MS3** (7u, 21d, high risk) — Mill print-to-program with consensus-gated decisions. Acceptance: 5 JM Die parts → validated NC, consensus logged for tool/strategy/feed picks.
5. **SAFETY-OMEGA-GATE-MS9** (4u, 10d, med risk) — Ω + S(x) gates wired into all 6 P2P pipelines. Acceptance: every released program has Ω≥0.95, S(x)≥0.70 with audit trail.
6. **SHIP-RELEASE-MS19** (4u, 12d, high risk) — Pilot release: JM Die full quote-to-ship live. Acceptance: 3 JM Die jobs flow quote → P2P → ship → invoice with zero manual reentry.

### Off critical path (parallelizable)
- LATHE-P2P-CONSENSUS-MS4 (7u, 21d) — same pattern as MILL-MS3
- WEDM-P2P-CONSENSUS-MS5 (6u, 18d) — leverages existing 95% WEDM stack
- ATOM-REGISTRY-AUDIT-MS0a (4u, 7d) — fix the 5 underbuilt items (air, turret, insert registries, etc.)
- SINKER-P2P-MS6, LASER-P2P-MS7, WJET-P2P-MS8 — lower-priority domain pipelines
- FEEDBACK-CALIB-MS10, ORCH-MULTIDOMAIN-MS11 — Layer 3 enrichment
- BIZ-QUOTE-FEED-MS12, BIZ-SCHED-CAPACITY-MS13, BIZ-ERP-SYNC-MS14, BIZ-PORTAL-CUSTOMER-MS15 — Layer 5 wiring
- OBS-MONITOR-MS16, COMPLIANCE-AUDIT-MS17, LEARN-XPROC-TRANSFER-MS18 — supporting

### Items added during multi-model synthesis (not in original goal-planner output)
- Add to MS0a: explicit registries for **air types**, **turret types**, **inserts** (researcher's top-5 underbuilt)
- Add to MS3/MS4/MS5: **end-to-end confidence rollup** (architect risk #8) — pipeline-level uncertainty, not per-stage
- Add to MS9: **G-code dry-run validation** as third consensus checkpoint (Gemini)
- Add to MS15: **human-in-the-loop UI for AI plan review** (CLAUDE.md mandate, no plan existed)
- Consider new milestone: **OT/IT-SECURITY-MS20** — when machines actually go on-network (Gemini)
- Consider new milestone: **TOLERANCE-MULTI-STAGE-MS21** — propagation through mill→grind→inspect (Gemini)

---

## Decisions needed from you before generating envelopes

1. **Sequence approval** — accept 21-milestone plan or restructure?
2. **First-domain pick** — milling (MS3) or wire EDM (MS5)? Architect-researcher consensus says **mill is most flagship**, **wedm has highest existing coverage**. CLAUDE.md says **lathe is 98% production** — could be done first as cheapest win.
3. **Add Gemini's missed items** — incorporate as suffix milestones (MS20, MS21) or fold into scope of existing ones?
4. **Pilot release scope** — JM Die only (per spec), or extend to second customer for stress test?
5. **Codex retry** — should we retry Codex with `low` reasoning effort to get its perspective, or skip (5-voice already strong)?

---

## Next actions (after sign-off)

- Generate full RGS milestone envelope JSON for **MS0, MS1, MS2** (the first 3 critical-path nodes)
- Add comprehensive-roadmap entry to `mcp-server/data/roadmap-index.json`
- Run scrutinization across the 21 milestones (12 checks)
- Spawn first work claim on MS0 (already partially done this session — consensus engines restored + smoke-tested)

---

**Total context cost of this brainstorm:** 3 Opus subagents × ~180k tokens = ~550k tokens; 1 Gemini call ~1k; 1 Ollama call ~600 tokens. Wall time: ~65s for everything except Codex (killed). Audit trail at top of this doc.
