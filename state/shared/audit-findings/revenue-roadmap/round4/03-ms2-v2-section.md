# REVENUE-MS2 v2 — Node-combination invention (post-dedup, honest market-fit)

> **Round-4 revision** — collapses 42 → 24 units after applying round-3/04 dedup verdicts, round-3/05 v7.B physics gap reconciliation, and round-3/08 knowledge truth-table corrections. JM-Die-direct customer-fit drives KEEP list; legal/marketing risks corrected pre-ship.

## Revision summary

| Action | Count | Source |
|--------|-------|--------|
| DROP (removed entirely) | 7 | round3/04 §dedup |
| MERGE (collapsed into peer) | 5 | round3/04 §dedup |
| KEEP / RETITLE (re-spec only) | 12 | round3/04 §dedup |
| BUILD (net-new w/ gap engines) | 7 | round3/04 §build |
| **TOTAL MS2 v2 units** | **24** | (was 42) |

### DROPs (7)
- `U-INV-WEDM-02` — `/wedm-cost` already wired (WEDMCreditCostEngine + WEDMCostModel)
- `U-INV-WEDM-04` — 5 dialects already wired (Mitsubishi/Sodick/Makino/Agie/Fanuc post engines + DialectRouter)
- `U-INV-WEDM-05` — `/wedm-ai-advisor` skill exists; WEDM is over-built (62 engines)
- `U-INV-WEDM-06` — 6 MITCourse engines already wired; JM-Die operators do not buy CE credits
- `U-INV-CROSS-01` — 10 tribal engines wired to 9 dispatchers (RAG production-grade)
- `U-INV-SHOP-08` — 7 scheduling engines + 4 dispatchers + `/bid-to-win` `/capacity-plan` skills shipped
- `U-INV-KNOW-01` — merged into CROSS-01 (effective drop; tribal RAG already wired)

### MERGEs (5)
- `U-INV-MILL-06` ⇒ absorbs v7.B Row 17 (quote-from-STEP single owner)
- `U-INV-MILL-07` ⇒ folded into `U-INV-MILL-01` (shared SpindleTelemetry dependency)
- `U-INV-MILL-01` ⇒ retitled as "Mill Operator Advisor" (chip-load + violation alerts on shared telemetry)
- `U-INV-WEDM-03` ⇒ drop SafetyGate framing (already wired); keep WEDMPCDEngine + WEDMHooksEngine build only
- `U-INV-KNOW-01` ⇒ merged into CROSS-01 (single tribal product, not two)

### BUILDs — 7 net-new with gap engines
1. **U-INV-LATHE-02** — BUILD `ChipbreakerCatalogEngine` + `CSSWrapRiskEngine`
2. **U-INV-LATHE-04** — BUILD `MillTurnForwardKinematicsEngine` + `SweptVolumeCollisionEngine` + `SubSpindleSyncEngine` (sequenced behind these 3)
3. **U-INV-CROSS-06** — BUILD `MoldDFMEngine` only (drop plastic-mold quote SaaS framing)
4. **U-INV-SHOP-01** — BUILD `MTConnectIngestEngine` + `OPCUAIngestEngine` (shared with MILL-01 telemetry)
5. **U-INV-SHOP-02** — BUILD `AlarmBusEngine` (1 net-new engine; wire via MTConnect/OPC-UA bus)
6. **U-INV-KNOW-02** — BUILD `PDFKnowledgeExtractorEngine` + `VideoIngestEngine` + `WebScrapeIngestEngine`
7. **U-INV-KNOW-03** — BUILD `PIIRedactionEngine` + `ConflictResolutionEngine` (replaces vapor DoctrineEngine) + `DataResidencyEngine`

---

## SHIP-FIRST PRIORITY (round3/04 §highest_value_units_ranked)

| Rank | Unit | Why first |
|------|------|-----------|
| 1 | `U-INV-LATHE-05` | Cost-per-part calculator — engines wired (Boothroyd Eq. 5.30); viral free-tier funnel for fastener-industry quoting. Top of MS2-Lathe. |
| 2 | `U-INV-MILL-08` | Cycle Time Crush — 24,545-program JM Die training corpus; outcome-based pricing bypasses senior-programmer trust barrier. Use SA (simulated annealing) per F-r2-a8-F. |
| 3 | `U-INV-SHOP-02` | OEE alerts via new `AlarmBusEngine` — paid-tier shop-owner feature; OEECalculatorEngine math already wired, only delivery layer missing. |

---

## MILL track (5 units; was 8)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-MILL-01` (absorbs MILL-07) | RETITLE+MERGE | **Mill Operator Advisor** — predicted chip-load + violation alerts (offline CAM-time, NOT real-time until SpindleTelemetry built) | Kienzle live; SpindleTelemetryIngest deferred to MS3 |
| `U-INV-MILL-02` | KEEP | Tool-life co-optimizer with MRR (Taylor V·T^n × Kienzle) — Boothroyd Eq. 5.30 acceptance | AdaptiveFeedModulation E0004 + Taylor constants + MaterialDB E0323 |
| `U-INV-MILL-03` | RETITLE | Long-tool feed advisor with damped closed-loop (**offline scheduled, NOT mid-cut servo**) — ζ≥0.7, α≤0.3, dead-band ±5%, anti-windup, 300-sample limit-cycle FFT test | DeflectionOverlay E0127 + AdaptiveFeed E0004 + control-law spec |
| `U-INV-MILL-04` | RETITLE | Per-operation chatter-free RPM picker (**toolpath boundaries only, no mid-block S-words**) — \|Δn\|<15% per 60s thermal budget; roughing-only initial scope | SLDOverlay E0433 |
| `U-INV-MILL-05` | KEEP | Thermal-compensated first-part probe + offset — Renishaw OMP60 + Blum macros for Okuma OSP-P300 / Fanuc 30iB / Heidenhain | ThermalOverlay E0456 + `/probe-routine-guide` |
| `U-INV-MILL-06` (absorbs v7.B Row 17) | MERGE | Quote-from-STEP (DFM × ToleranceStack × CADExtract) — cost equation spec REQUIRED before unit starts | CADExtract + DFMCheck + ToleranceStack + `/quote` |
| `U-INV-MILL-08` | KEEP (**ship 2nd**) | Cycle Time Crush SaaS — SA (simulated annealing) per F-r2-a8-F, not steepest-descent; Vericut-class sim via `/program-simulate` | CycleTimeCrush + ProgramOptimize |

## LATHE track (6 units; was 7)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-LATHE-01` | RETITLE | Hard-turn parameter advisor — **NO residual-stress claim, NO grinding-replacement claim** (liability fix; ResidualStressFEM + WhiteLayerKinetics + CBNCeramicCatalog deferred to MS5+) | HardTurningCapstone E0175 + Kienzle |
| `U-INV-LATHE-02` | **BUILD** | Lights-out turning verdict (chipbreaker + CSS wrap-risk) — BUILD `ChipbreakerCatalogEngine` (Sandvik/Kennametal/ISCAR/Tungaloy/Mitsubishi × ~40 geometries) + `CSSWrapRiskEngine` (Nakayama-Arai 1962) | Skill-only today; 2 new engines |
| `U-INV-LATHE-03` | KEEP | Universal threading wizard — audit ThreadingEngine; Okuma/Mazak/Fanuc/Mori/Hardinge dialect post tests | `/hard-turn` + `/lathe-thread` |
| `U-INV-LATHE-04` | **BUILD** | Mill-turn collision-free post for Okuma B250IIW — BUILD `MillTurnForwardKinematicsEngine` (T_world ← T_base·T_b_axis(θ)·T_tool) + `SweptVolumeCollisionEngine` (octree/BVH) + `SubSpindleSyncEngine` (Z2+C2 phase-match FSM). **Sequenced behind 3-engine build (~8 weeks gating).** | Zero kinematic engines today (E0316 is Mastercam, wrong vendor) |
| `U-INV-LATHE-05` | KEEP (**ship 1st**) | Cost-per-part calculator (Gilbert min-cost / max-prod / max-profit) — free-tier (no auth, DOS protection); MS1 paywall plumbing coordination required | CostOptimizeLathe + Boothroyd & Knight Eq. 5.30 |
| `U-INV-LATHE-06` | RETITLE | Lathe Print-to-Program Pipeline (BlueprintVisionOCR + ToleranceExtract + LatheAdaptive) — BUILD `LathePrintToProgramOrchestratorEngine`; **defer to MS3** | Fragmented engines, no orchestrator |
| `U-INV-LATHE-07` | KEEP | Groove-job advisor — run `/dedup` to avoid duplicating E0174; **ship LAST in MS2-Lathe** | GrooveClassificationEngine E0174 + `/lathe-groove` |

## WEDM track (2 units; was 6)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-WEDM-01` | KEEP | WEDM 4-axis taper-die programming — acceptance: regenerate 5 JM Die taper-die programs from spec, diff vs archive | `/wedm-jm-die` + WEDMTaperEngine + 26 indexed programs |
| `U-INV-WEDM-03` | MERGE/BUILD | WEDM PCD-specific hooks (**drop SafetyGate framing — already wired**) — BUILD `WEDMPCDEngine` + `WEDMHooksEngine` for hardened die-steel | WEDMSafetyEnvelopeEngine wired; PCD + Hooks missing |

**WEDM redirect note (round3/04 §drop_count_with_redirect):** 3 freed unit budgets (WEDM-04/05/06) → redirect to sinker-EDM second-pillar buildout per Round-1 F308 (sinker has 7 engines, WEDM has 62 — balance pillars).

## CROSS track (5 units; was 6)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-CROSS-02` | KEEP | Setup-sheet auto-generator — emit PDF setup sheet for 5 JM Die archive jobs | `/setup-sheet-generate` + SetupSheetEngine (verify) |
| `U-INV-CROSS-03` | KEEP | Tolerance-stack web tool — **surface as free-tier** acquisition funnel | ToleranceStackEngine + `/tolerance-stack` + `/gdnt-check` |
| `U-INV-CROSS-04` | RETITLE | **Quote-to-Ship Milestone (multi-unit)** — decompose into MS2-CROSS-04a..-04e (CAD import + DFM gate + estimator + scheduler hook + ship-confirm). Single-unit framing rejected (6-month effort masked). | QuoteToShipOrchestratorEngine + component coordination |
| `U-INV-CROSS-05` | KEEP | Cross-domain process planner (mill + lathe + EDM same part) — route real JM Die die cavity through mill→WEDM stages | ProcessRouting + JobPlanning (verify) |
| `U-INV-CROSS-06` | **BUILD** | MoldDFM engine ONLY (gate clamping/parting-line/draft/wall-thickness/sink/weld-line) — **DROP plastic-mold quote SaaS framing** for JM-Die GTM | InjectionMoldingEngine + InjectionMoldQuoteEngine wired; MoldDFMEngine missing |

## SHOP track (6 units; was 8)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-SHOP-01` | **BUILD** | Shop-floor live dashboard — BUILD `MTConnectIngestEngine` + `OPCUAIngestEngine` (already planned in `/cowork-connectors`; do not duplicate). Shared bus with MILL-01. | `/shop-live-status` skill; ingest engines missing |
| `U-INV-SHOP-02` | **BUILD (ship 3rd)** | OEE alerts (real-time) — BUILD `AlarmBusEngine`; wire over MTConnect/OPC-UA from SHOP-01; emit Slack/Discord alert on JM Die machine OEE drop | OEECalculatorEngine wired; AlarmBus missing |
| `U-INV-SHOP-03` | KEEP | Tool-crib inventory + reorder — coordinate vendor with SHOP-06 (McMaster/MSC/Fastenal, **not Amazon**) | ToolCatalogAdaptive E0459 + `/tool-crib-guide` + `/tool-catalog` |
| `U-INV-SHOP-04` | KEEP | Magazine/turret optimizer — audit MagazineOptimizerEngine wiring | `/magazine-optimize` |
| `U-INV-SHOP-05` | KEEP | Shop-safety check (PPE / lockout-tagout / fume) | `/shop-safety-check` + SafetyHooks + `/ergo-check` |
| `U-INV-SHOP-06` | RETITLE | **Industrial-supply auto-reorder (McMaster + MSC + Grainger + Fastenal)** — **DROP Amazon Business**; fastener industry sources from industrial-distribution vendors; SP-API OAuth + regulatory-purchasing audit-trail risk for zero customer-pull | Zero vendor API engines today |
| `U-INV-SHOP-07` | KEEP | Job-traveler PDF/QR generator — QR drives `/shop-live-status` scan-in/out telemetry | `/traveler` + Traveler/QRGen (verify wiring) |

## KNOW track (3 units; was 4)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-KNOW-02` | **BUILD** | Ingest customer manuals (PDF/video/web) — BUILD `PDFKnowledgeExtractorEngine` (engine-back `/pdf-learn`) + `VideoIngestEngine` (engine-back `/video-learn` + `/youtube-transcript`) + `WebScrapeIngestEngine`; wire to `prism_memory:ingest_customer_corpus` | 7 PDF engines + 7 Video engines exist as substrate; orchestrator engines missing for productization |
| `U-INV-KNOW-03` | **BUILD** | Operator chat with conflict resolution + PII — BUILD `PIIRedactionEngine` (regex+ML hybrid; names/serials/PO numbers) + `ConflictResolutionEngine` (**replaces vapor DoctrineEngine** per round3/08) + `DataResidencyEngine` (GDPR EU vs US) | Zero PII/Doctrine/Residency engines today; KnowledgeUnification pattern reused for ConflictResolution |
| `U-INV-KNOW-04` | RETITLE | **Internal training tracker (Certificate of Completion, NO CE-credit claim)** — BUILD `LearnerTranscriptEngine`; defer real CE-credit product to MS5+ once NIMS/SME/ABET partnership signed (12-24 mo lead) | Zero accreditation engines |

## CAD track (2 units; was 3)

| Unit | Decision | Title (revised) | Backing |
|------|----------|-----------------|---------|
| `U-INV-CAD-01` | KEEP | Text-to-CAD generation — **frame as "CadQuery-backed" not "multi-kernel"** (Python sidecar over OCCT bindings); acceptance: generate 5 simple parts (bolt, bracket, plate, flange, shaft) | TextToCADGenerationEngine E0455 (CadQuery kernel real) |
| `U-INV-CAD-02` | RETITLE/DROP | **Topology-optimized geometry via TopOpt/ToPy sidecar (open-source)** — **DROP Fusion 360 Generative Design API claim** (no public API exists per round3/08; technically false). Optional commercial path: nTopology API. OR DROP entirely if no partnership in motion. | Zero generative engines; Fusion360CodeGen E0158 is code-gen not gen-design |
| `U-INV-CAD-03` | KEEP | Chat-with-the-part (CADRag + CADExtract + AGI-CAD) — wire to `prism_cad:chat_with_part`; conversation-memory loop on QdrantMemoryEngine; acceptance: answer 10 standard CAD queries against real JM Die STEP file | CADKnowledgeGraph E0050 + CADFeatureEmbedding E0042 + CADAIStateMachine E0030 + CADIntentDecomposer E0049 (substrate real) |

---

## Knowledge-headline corrections (round3/08 — pre-ship legal/marketing)

| Old claim (REJECTED) | Replacement (USE THIS) | Source |
|----------------------|------------------------|--------|
| "4,245 tribal tips for monetization" | **"243 canonical tips + 3,629 RAG-indexed entries (≈80 field-grounded)"** | round3/08 §evidence_snapshot |
| "Manufacturing CE credits" | **"Certificate of Completion"** (no accreditor needed; pursue NIMS/SME co-branding for v2) | round3/08 §KNOW-06 |
| "Fusion 360 Generative Design API integration" | **"TopOpt/ToPy sidecar (open-source) or nTopology commercial"** — Fusion gen-design has NO public API | round3/08 §CAD-02 |
| "Hard-turn replacement of grinding" | **"Hard-turn parameter advisor"** (no residual-stress claim; no grinding-replacement claim) — ResidualStressFEM does not exist | round3/04 §LATHE-01 |
| "Amazon Business auto-reorder" | **"McMaster-Carr + MSC + Grainger + Fastenal industrial-supply auto-reorder"** | round3/04 §SHOP-06 |
| "DoctrineEngine arbitrates knowledge conflicts" | **"ConflictResolutionEngine"** (reuse KnowledgeUnification pattern; 4–6 wk build) | round3/08 §KNOW-04 |
| "Qdrant production-tier retrieval" | **"Qdrant dev-grade; SLO (p99<200ms) + backups + HA + auth + multi-tenant gating required before paid SaaS"** | round3/08 §KNOW-02 |
| "Paywall $49/$199/$999 tiers" | **"BillingEngine + EntitlementsEngine + StripeBridgeEngine + RateLimitEngine 8–12wk build first (or Lemon Squeezy / Paddle MoR to skip tax compliance)"** | round3/08 §KNOW-05 |
| "Wiki has 722 entries" | **"770 entries (575 engines + 96 dispatchers + 99 memories) per 2026-05-08 bootstrap"** | round3/08 §evidence_snapshot |

---

## Acceptance gates (every unit must clear before ship)

1. **Round-trip dispatcher wiring** — engine wired to ALL natural-consumer dispatchers (per CLAUDE.md §ENGINE WIRING)
2. **PENDING_GAP_ENGINES.json registration** for every BUILD engine
3. **JM Die archive acceptance test** — regenerate / route real JM Die job through unit's pipeline
4. **Legal/marketing copy review** — claims match round3/08 truth-table
5. **`/dedup` clean before any new engine** — duplication-hard-block enforces

## Out-of-scope for MS2 v2 (deferred to MS3+)

- SpindleTelemetryIngestEngine + real-time variants of MILL-01/07 → MS3
- Lathe Print-to-Program Orchestrator → MS3 (per F-r2-a3-K — let MILL-08 cycle-crush ship first)
- True CE-credit product (NIMS/SME partnership) → MS5+
- ResidualStressFEM + WhiteLayerKinetics + HardTurnSurfaceIntegrity → MS5+
- Sinker-EDM second-pillar buildout → reabsorb WEDM-04/05/06 freed budgets, separate milestone
