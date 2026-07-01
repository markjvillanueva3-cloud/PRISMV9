# PRODUCT-FEATURES-TO-SURFACE — what Mark forgot to advertise

**Generated:** 2026-05-02 from audit data in `DISCOVERY-PRODUCT-FEATURES.md` + `DISCOVERY-CAPABILITIES.md`  
**Audit finding:** 31 saleable features discovered, **only 20% surfaced in any vision document**. 80% under-advertised.

This file is the candidate list for marketing/sales materials, pricing tier definitions, and feature-flag toggles. Each feature is annotated with competitor parity to help with positioning.

---

## Tier 1 — Differentiators Mark should lead with

Six features that no competitor combines under one roof.

### 1. Print-to-Program pipelines (mill / lathe / multiaxis / threading / hole-pattern / secondary-ops)
- **What it does:** ingest a print (PDF, DXF, blueprint photo) → recognize features → plan setups → generate full G-code with safety / collision / dialect awareness
- **Competitive bar:** Mastercam Dynamic + iMachining + ESPRIT TNG combined
- **PRISM coverage:** 6 dispatchers wired (`prism_mill`, `prism_turning_program`, `prism_multiaxis_program`, `prism_threading_pipeline`, `prism_hole_pattern`, `prism_secondary_ops`)
- **Status:** beta — production-grade for the common cases, edge cases exist
- **Marketing pitch:** "From print to program in minutes, with proof-carrying safety"

### 2. Master Post per-controller (74+ controllers)
- **What it does:** output dialect-correct G-code per machine + controller, with capability matrix + post comparison + regression matrix
- **Competitive bar:** ICAM CAM-POST + CAMPLETE TruePath
- **PRISM coverage:** 35-or-38-stage post pipeline (number conflict — see gap #6 in audit), per-block adaptive S/F, kinematic-aware rapids, sub-spindle sync
- **Status:** beta — claim density needs E2E test backing
- **Subscription model:** per-controller pricing wired in `prism_business:billing_*`

### 3. Speed/Feed Calculator (SFC) — physics + ML + tribal
- **What it does:** material-aware Kienzle/Taylor with hardness derating, holder runout reflected in achievable RPM, insert geometry → chip-load / Vc, machine kinematics class → feed/accel ceilings, stochastic chatter-safe RPM (Monte Carlo on stability lobes), tribal tip injection, surface-finish target → backsolve, P50/P75/P95 cycle time, tool life with cost-per-part, energy/carbon per move, confidence scoring, closed-loop calibration from actuals
- **Competitive bar:** Kennametal NOVO / Sandvik CoroPlus stand-alone — but PRISM bundles physics + tribal + closed-loop
- **PRISM coverage:** the only Tier-3 AI with a fully-wired feedback loop (`PPGSFCClosedLoop` + `SFCOutcomeCapture`)
- **Status:** production
- **Subscription model:** primary saleable product, billing infrastructure ready

### 4. Customer Portal token system + Stripe-style billing
- **What it does:** customer-facing portal to view quotes, request revisions, track orders, upload prints. Token-based access. Stripe-class billing for SFC + Master Post subscriptions
- **Competitive bar:** Paperless Parts
- **PRISM coverage:** full lifecycle wired (`prism_business:portal_*` create/revoke/validate, quote view/respond, order status, quality docs upload, message bus)
- **Status:** production-grade infrastructure
- **Marketing pitch:** "White-label customer portal you can ship under your shop's brand"

### 5. Generative Process Planning + Sustainability/ESG
- **What it does:** auto-generate process plans from features. Sustainability suite — energy / carbon / exergy / lifecycle assessment / coolant lifecycle / total-cost-of-ownership
- **Competitive bar:** Siemens Teamcenter + Plex
- **PRISM coverage:** 25+ actions across `prism_diagnosis:genplan_*`, `sustain_*`, `prism_calc:sus_*`
- **Status:** beta
- **Marketing pitch:** "ESG reporting your customers ask for, computed from real shop-floor data, not estimates"

### 6. Proof-Carrying G-code Emit + Λ formal-logic proof BLOCKING hook
- **What it does:** every emitted lathe G-code program carries a formal-logic proof of safety + reproducibility. BLOCKING hook (`INTEL-PROOF-ENFORCE-001`) refuses emission when proof can't be verified
- **Competitive bar:** **none** — this is unique
- **PRISM coverage:** `lathe_proof_carrying_emit`, `lathe_proof_carrying_reproduce` — wired for lathe; mill TBD
- **Status:** beta (lathe only)
- **Marketing pitch:** aerospace + medical differentiator. "You can audit every line of G-code we emit, mathematically."

---

## Tier 2 — Strong support features

13 features that complete the platform but aren't headline differentiators.

| Feature | Competitive bar | Status |
|---------|-----------------|--------|
| Stochastic route + Monte Carlo tolerance + robust optimization | MathCAD + custom shop spreadsheets | beta |
| Digital Twin (`twin_create`, `twin_predict`, `twin_simulate`, `digital_twin_query`) | Siemens Plant Simulation | beta |
| Bayesian inference suite (`bayesian_predict_force`, `bayesian_optimize`, `bayesian_inference_calc`, `bayesopt_optimize`) | scikit-learn + custom | beta |
| Kalman fusion (WEDM-specific) | none in CNC space | production for WEDM |
| AGI knowledge graph (lathe + WEDM + CAM) | none commercial | beta |
| Strategy evolution (`strategy_evolve`, `ml_strategy_history`) | no commercial parallel | beta |
| Hard turning decision suite | manual operator judgment + handbook | production |
| Secondary ops pipeline (deburr / probe / engrave / wash / dot peen) | none integrated | beta |
| Probing routines (WCS, FAI, in-process, tool measure, auto-comp) | Renishaw GoProbe | production |
| DFM analysis (mill + lathe + sheet + casting + injection mold) | aPriori + Geometric DFMPro | production |
| NLP CAM parsing | none commercial | beta |
| Blueprint-to-3D-model + blueprint-to-quote | xometry instant quote (closed loop) | beta |
| Multi-channel coordination + bar feeder + Swiss support | Citizen Cincom AlphaCAM | beta |

---

## Tier 3 — Infrastructure (not directly saleable)

6 features that enable the above but aren't pitched directly.

- ATCS (Autonomous Task Completion System)
- GSD orchestration
- AutoPilot v2 (full development cycle automation)
- Swarm parallel agent dispatch
- Ralph loop (4-phase validation with real Claude API calls)
- Omega computation (system quality scoring)

---

## Hidden orphans — capabilities that need wiring before they're saleable

4 features the audit found scaffolded but unconsumed. Each needs ~half-day of wiring to become saleable.

1. **Esprit ProfitMilling/ProfitTurning physics engine** — declared in JSDoc, not implemented. Blocks Esprit tier-1 status.
2. **CAD LoRA action surface** — every other domain has `*_lora_*` actions; CAD doesn't. Pattern-duplication from CAM LoRA gets it wired.
3. **WEDM Sodick + AgieCharmilles dialect engines without JM-fleet test corpus** — engines exist, no tests, no operator validation.
4. **Lathe LoRA inference / deployer / health-monitor chain** — 8+ engines exist, only `validate` / `process` / `kienzle_coefs` are wired. The rest are silent.

---

## Recommended marketing positioning

**Primary product:** "PRISM SFC — the only physics-grade speed/feed calculator that learns from your floor."  
**Secondary product:** "PRISM Master Post — per-controller post-processor with formal-proof safety. Ships under your shop's brand."  
**Tertiary product:** "PRISM Studio — AI-driven CAM that consumes SFC + Master Post and produces audit-ready G-code from a print."

**Free tier:** SFC quick lookup, basic post validation, 5 quotes/month via portal.  
**Pro tier:** SFC closed-loop calibration, full Master Post, unlimited quotes.  
**Enterprise tier:** White-label portal, multi-tenant, on-premise, ATCS autonomous mode.

---

**Status:** ready for Mark's review + pricing decisions. None of the items below Tier 1 are blocked by code — only by marketing-language clarity.
