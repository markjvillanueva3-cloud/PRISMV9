# POST-BRIDGE-SYNERGY-MS0 — Priority Envelope (135 units, 10 phases)

**Slot:** echo · **Date:** 2026-05-26 · **Triggered by:** operator directive "add novel ideas to other plan. develop envelope ordering in priority order"

## Envelope merge

| Source | Units | Status |
|--------|------:|--------|
| POST-BRIDGE-SYNERGY-COMPREHENSIVE-SCOPE (commit c302f33ade) | 63 | included |
| POST-ALL-ENGINES-SCOPE (commit e7b73f5d84) | +60 | included (123 total) |
| **NEW Phase 9 — Genuine Inventions** (Tier-A 5 + Tier-B 4 + Tier-C 3) | **+12** | new |
| **Grand total** | **135 units** | **10 phases** |

## Priority-ordered envelope (135 units)

Ordering principles:
1. **Operator-blocking first** — v11 is broken in production (holderFactor exception line 70)
2. **High ROI / low effort next** — measurable $ savings within weeks
3. **Architectural anchors before bulk** — bridge architecture + master-post orchestrator before wiring N engines
4. **Self-improving stack last** — closed-loop depends on bridge being live

| # | Phase | Unit | Effort | $-ROI/mo | Depends |
|--:|------:|------|-------:|---------:|---------|
| 1 | 0 | U-V11-HOLDERFACTOR-FIX | 1d | unblocker | — |
| 2 | 0 | U-V11-AUTO-POCKET-FROM-LIBRARY | 1d | $1.5K (operator time) | #1 |
| 3 | 0 | U-V11-MAGAZINE-INTEGRITY-GATE | 1d | $300/scrap-event prevented | #2 |
| 4 | 0 | U-V11-PROVE-OUT-FLAG-EXPLICIT | 0.5d | enables full-speed test | — |
| 5 | 0 | U-V11-WINMAX-COMMENT-RESTORE | 0.25d | v8.9 backcompat | — |
| 6 | 0 | U-V11-AGGRESSIVENESS-RENAME-SHIM | 0.25d | v8.9 backcompat | — |
| 7 | 9A | U-NOVEL-WEAR-MEMORY-MAGAZINE | 1w | **$9K/mo** | #2 |
| 8 | 9A | U-NOVEL-PER-SHOP-KC-IDENTITY | 2w | **$12K/mo** | — |
| 9 | 9A | U-NOVEL-PREDICTIVE-COOLANT-ORCH | 2w | **$3K/mo + tool life** | — |
| 10 | 9A | U-NOVEL-CYCLE-TIME-CONFORMAL | 2w | **$5K/mo (quoting accuracy)** | — |
| 11 | 9A | U-NOVEL-OPERATOR-STYLE-TWIN | 3w | $1.5K/mo + adoption | — |
| 12 | 1 | U-MASTERCAM-ADDIN-RESOURCES | 2w | bridge enabler | — |
| 13 | 1 | U-HYPERMILL-ADDIN-RESOURCES | 2w | bridge enabler | — |
| 14 | 1 | U-INVENTOR-ADDIN-RESOURCES | 2w | bridge enabler | — |
| 15 | 1 | U-BRIDGE-CONTRACT-VERIFY | 1w | parity guarantee | #12-14 |
| 16 | 2 | U-DB-NODE-BRIDGE | 1w | unifies 23 DB reads | — |
| 17 | 2 | U-WIZARD-NODE-BRIDGE | 1w | mill/lathe/wire wizard contract | — |
| 18 | 2 | U-SFC-NODE-BRIDGE | 1w | kills 5+ duplicate SF paths | — |
| 19 | 2 | U-POST-GEN-BRIDGE | 1w | postgen ↔ bridge unification | #12-15 |
| 20 | 2 | U-DB-NODE-ABSORB-21 | 2w | absorbs 21 of 23 DBs in one milestone | #16 |
| 21 | 7 | U-LATHE-MASTERPOST-CLONE-MILL (7 engines) | 3w | **biggest architectural gap** | — |
| 22 | 7 | U-WEDM-ROUGH-SKIM-CASCADE-TO-MILL | 1w | proven rough/finish staging | — |
| 23 | 7 | U-LATHE-CSS-OPTIMIZER-TO-BALL-END | 0.5w | variable RPM for ball-nose | — |
| 24 | 7 | U-LATHE-BLOCK-ENGAGEMENT-TIMING-TO-MILL | 0.5w | per-block accurate timing | — |
| 25 | 7 | U-OPTIMAL-CONTROL-PONTRYAGIN-FEED | 1w | time-optimal feed schedule | — |
| 26 | 7 | U-MDOF-RCSA-STABILITY-RPM-UPGRADE | 0.5w | upgrade existing SDOF rewrite | — |
| 27 | 7 | U-MAGAZINE-TSP-T-WORD-ORDER | 0.5w | T-word emission order | — |
| 28 | 7 | U-TIMOSHENKO-DEFLECTION-MILL-WIRE | 0.5w | proven in lathe boring | — |
| 29 | 7 | U-WEDM-WIRE-BREAK-TO-TOOL-BREAK | 1w | Weibull retrain | — |
| 30 | 7 | U-WEDM-NEURAL-FORMULA-FUSION-PATTERN | 1w | architectural transfer | — |
| 31 | 6 | U-EMIT-CONFORMAL-PI-BANDS | 2d | **R12 fail-loud win** | — |
| 32 | 6 | U-EMIT-MAHALANOBIS-OOD-GATE | 2d | refuse hallucinated emits | — |
| 33 | 6 | U-EMIT-HIERARCHICAL-BAYES-VC-FZ | 5d | per-shop/material/family pooling | #8 |
| 34 | 6 | U-EMIT-PARETO-FRONTIER-AT-EMIT | 3d | reuses MultiObjectiveParetoEngine | — |
| 35 | 6 | U-EMIT-CLOSED-FORM-TROCHOIDAL-ARC | 3d | 10× speedup on high-feed-mill emit | — |
| 36 | 6 | U-EMIT-SE3-SLERP-5AXIS-INTERP | 3d | **PRISM-only differentiator** | — |
| 37 | 6 | U-EMIT-PINN-CUTTING-COMPLETE | 7d | finishes 34-line stub | — |
| 38 | 6 | U-EMIT-LTL-MODAL-INVARIANTS | 4d | **PRISM-only differentiator** | — |
| 39 | 6 | U-EMIT-SPARSE-SYMBOLIC-REGRESSION | 5d | **PRISM-only differentiator** | — |
| 40 | 6 | U-EMIT-VAE-GCODE-ANOMALY-GATE | 5d | corpus-manifold OOD | — |
| 41 | 6 | U-EMIT-DRIFT-AWARE-BANDIT-FEED | 3d | reuses existing bandit + drift | — |
| 42 | 6 | U-EMIT-CMM-UNCERTAINTY-PROPAGATION | 3d | probe σ → WCS σ → tol σ_stack | — |
| 43 | 6 | U-EMIT-SAT-COLLISION-CERTIFICATE | 7d | **PRISM-only differentiator** | — |
| 44 | 6 | U-EMIT-NEURAL-ODE-TOOL-WEAR | 6d | improves UsuiWearModel | — |
| 45 | 6 | U-EMIT-MILL-TURN-CHANNEL-DAG | 6d | safe-parallel multi-channel | — |
| 46 | 9B | U-NOVEL-FAILURE-REPLAY-CAUSAL | 4w | $2K + systemic improvement | digital twin |
| 47 | 9B | U-NOVEL-POST-SELF-VERIFY-HARNESS | 5w | $3K/mo prevented first-piece scrap | stock-sim |
| 48 | 9B | U-NOVEL-CONSTRAINT-REPAIR-SMT | 6w | $600/programmer | Z3 binding |
| 49 | 9B | U-NOVEL-GCODE-SEQUENCE-SUGGESTER | 8w | reduces edits 40-70% | LoRA infra |
| 50 | 8 | U-TRIBAL-HOLDER-SAFETY-GATE | 2d | TIR + RPM hard gate | — |
| 51 | 8 | U-TRIBAL-HSM-ENTRY-GEOMETRY-VALIDATOR | 2d | helix 1-3°, ramp ≤2° | — |
| 52 | 8 | U-TRIBAL-TROCHOIDAL-MOAT-OPTIMIZER | 2d | 50-70% window guard | — |
| 53 | 8 | U-TRIBAL-COATING-HRC-COMPATIBILITY | 3d | delamination thresholds | — |
| 54 | 8 | U-TRIBAL-FLUTE-COUNT-BY-HRC | 1d | step function selector | — |
| 55 | 8 | U-TRIBAL-SLOT-FEED-DERATER | 1d | inverse chip-thinning | — |
| 56 | 8 | U-TRIBAL-VACUUM-FIXTURE-SIZING | 2d | F_hold + gasket window | — |
| 57 | 8 | U-TRIBAL-HAAS-TAP-OVERRIDE-GATE | 1d | refuse pre-G84 override | — |
| 58 | 8 | U-TRIBAL-ROUND-INSERT-CHIP-THINNING | 3d | arc<90° specialization | — |
| 59 | 8 | U-TRIBAL-INSERT-SCREW-CYCLE-SCHEDULER | 2d | 10-change cadence | — |
| 60 | 3 | U-EXTRACT-VERIFIED-POST-DB | 1w | 114K post-template table | #16 |
| 61 | 3 | U-EXTRACT-CONTROLLER-DB | 3d | G/M/macro per controller | #16 |
| 62 | 3 | U-EXTRACT-POST-GENERATOR | 1w | novel controller bring-up | #61 |
| 63 | 3 | U-EXTRACT-TAYLOR-COMPLETE | 5d | 91K Taylor C/n | — |
| 64 | 3 | U-EXTRACT-CUTTING-THERMAL | 1w | 101K Komanduri/Jaeger | — |
| 65 | 3 | U-EXTRACT-CHATTER-PREDICT | 3d | stability_rpm_rewrite | — |
| 66 | 3 | U-EXTRACT-KINEMATICS | 3d | 5-axis RTCP/G68.2/G43.4 | — |
| 67 | 3 | U-EXTRACT-TOOL-CATALOG-220K | 1w | ~220K cataloged tools | #16 |
| 68 | 3 | U-EXTRACT-HOLDER-INTERFACES | 2d | **resolves U-V11-HOLDERFACTOR-FIX** | — |
| 69 | 3 | U-EXTRACT-JOHNSON-COOK-DB | 3d | plasticity params | — |
| 70 | 3 | U-EXTRACT-HYBRID-TOOLPATH | 1w | cross-strategy fusion | — |
| 71 | 3 | U-EXTRACT-FIXTURE-DBs | 3d | 66K fixture catalog | #16 |
| 72 | 3 | U-EXTRACT-THERMAL-COMP | 2d | spindle/axis growth | #64 |
| 73 | 3 | U-EXTRACT-AIRCUT-ELIM | 3d | post_optimize_rapids | — |
| 74 | 3 | U-EXTRACT-CYCLE-TIME | 3d | accel/jerk timing | — |
| 75 | 3 | U-EXTRACT-COLLISION-MOTION | 5d | 5-axis collision | — |
| 76 | 3 | U-EXTRACT-EKF-DIGITAL-TWIN | 1w | 216K thermal+wear | — |
| 77 | 3 | U-EXTRACT-EXPANDED-POSTS | 3d | vendor variant coverage | #60 |
| 78 | 3 | U-EXTRACT-ALARMS-MASTER | 5d | 7 per-controller × 30-58K | — |
| 79 | 3 | U-EXTRACT-ROUGHING-LOGIC | 1w | 81K roughing logic | — |
| 80 | 3 | U-EXTRACT-SEMANTIC-MATCHER | 1w | replace lexical Jaccard | — |
| 81 | 3 | U-EXTRACT-NOT-FOUND-CHASE | 1w | chase 25 NOT_FOUND rows | — |
| 82 | 3 | U-EXTRACT-MATERIAL-AGGREGATORS | 3d | reroute 280K from ai_ml | — |
| 83 | 5 | U-OUTCOME-CAPTURE-ADDINS | 1w | real outcome flow | #12-14 |
| 84 | 5 | U-OUTCOME-TO-PREDLOG-PAIR | 3d | prediction ground truth | #83 |
| 85 | 5 | U-PER-CONTROLLER-LORA-AUTO-RETRAIN | 1w | compounding accuracy | #84 |
| 86 | 5 | U-AB-SHADOW-PROMOTE | 3d | safe rollout | #85 |
| 87 | 5 | U-DRIFT-DETECT-ALERT | 3d | quality maintenance | #85 |
| 88 | 4 | U-WIRE-CHATTER-SLD | 3d | wire to post | — |
| 89 | 4 | U-WIRE-ADAPTIVE-FEED-MOD | 3d | wire to post | — |
| 90 | 4 | U-WIRE-TOOL-DEFLECTION | 3d | wire to post | — |
| 91 | 4 | U-WIRE-COATING-KC11-MODIFIER | 3d | wire to post | — |
| 92 | 4 | U-WIRE-WEAR-PHYSICS | 3d | wire to post | — |
| 93 | 4 | U-WIRE-GILBERT-ECON | 2d | wire to post | — |
| 94 | 4 | U-WIRE-MACHINE-AWARE-SF | 3d | wire to post | — |
| 95 | 4 | U-WIRE-SFC-9AXIS-AS-ONLY-SF | 5d | replaces flat autoSF | — |
| 96 | 4 | U-WIRE-HEAT-TREAT-SF | 3d | wire to post | — |
| 97 | 4 | U-WIRE-ANISOTROPIC-MAT | 3d | wire to post | — |
| 98 | 4 | U-WIRE-MATERIAL-PHYSICS-BRIDGES | 3d | wire to post | — |
| 99 | 4 | U-WIRE-CHIP-THINNING-COMP | 3d | wire to post | — |
| 100 | 4 | U-WIRE-RTAC-ADAPTIVE-PHYSICS | 5d | wire to post | — |
| 101 | 4 | U-WIRE-DIGITAL-TWIN-EKF | 5d | wire to post | #76 |
| 102 | 4 | U-WIRE-INPROCESS-STOCK-VOXEL | 5d | wire to post | — |
| 103 | 4 | U-WIRE-COLLISION-CERTIFY | 5d | wire to post | — |
| 104 | 4 | U-WIRE-PER-CONTROLLER-LORA | 5d | wire to post | #85 |
| 105 | 4 | U-WIRE-CROSS-CAM-ONTOLOGY | 3d | wire to post | — |
| 106 | 4 | U-WIRE-KG-QUERY | 3d | wire to post | — |
| 107 | 4 | U-WIRE-OUTCOME-CLOSED-LOOP | 5d | wire to post | #83 |
| 108-137 | 4 | U-WIRE-ORPHAN-{Bayesian/Conformal/Geodesic/Pareto/etc} | varies | 30 additional orphans surfaced by grep | — |
| 138 | 9C | U-NOVEL-AUTO-BOOTSTRAP-POST-VARIANTS | 6w | $5-15K/new variant | outcome capture |
| 139 | 9C | U-NOVEL-DECISION-PROVENANCE-ANNOTATION | 3w | adoption / sales | — |
| 140 | 9C | U-NOVEL-MULTI-CUSTOMER-FED-KC | 10w | network effect | multi-tenancy |

(Phase-4 unit count corrects to 50 — the 30 additional orphans are bundled into U-WIRE-ORPHAN-* for the planning view.)

## Effort summary

| Tier | Units | Single-slot total | Parallel-12-slot |
|-----:|------:|------------------:|------------------:|
| Tier-1 (Phase 0 + 9A Tier-A) | 11 | ~3 weeks | ~1 week |
| Tier-2 (Phase 1+2+7+6+9B) | ~50 | ~20 weeks | ~5 weeks |
| Tier-3 (Phase 3+4+5+8+9C) | ~75 | ~30 weeks | ~8 weeks |
| **Total** | **135** | **~53 weeks** | **~13-14 weeks** |

## Operator-actionable next moves

**Iteration 22 starts here** (echo /loop):
- **Iter 22**: U-V11-HOLDERFACTOR-FIX (Phase 0 #1) — diagnose holderFactor undefined exception line 70 of v11 test.hnc, wire ToolAssemblyEngine + ToolHolderRegistryEngine
- **Iter 23**: U-V11-AUTO-POCKET-FROM-LIBRARY — read UserTool.magazine_position; eliminate manual pocket entry
- **Iter 24**: U-V11-MAGAZINE-INTEGRITY-GATE — pre-emit refuse on offset_drift / wrong_pocket / missing_tool
- **Iter 25**: U-V11-PROVE-OUT-FLAG-EXPLICIT — opt-in not default
- **Iter 26**: U-V11-WINMAX-COMMENT-RESTORE
- **Iter 27**: U-V11-AGGRESSIVENESS-RENAME-SHIM
- **Iter 28**: U-NOVEL-WEAR-MEMORY-MAGAZINE
- **Iter 29-30**: U-NOVEL-PER-SHOP-KC-IDENTITY

Cron `/loop [5m] /yolo-mode` fires `/yolo-mode` directive every 5 minutes. Stop hook stays armed against the milestone goal until Phase 0 closes. Operator can re-pivot at any tick.
