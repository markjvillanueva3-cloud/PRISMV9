# PRISM MASTER ROADMAP v1.0
## Synthesized from 9 Flagship Deep Audits

**Date:** 2026-05-08
**Method:** 90 parallel Explore agents across 9 flagships, consolidated to 9 deep-audit reports, intersected against BUILD_STATE / MILESTONE_PROGRESS / honest-build scans to filter shipped work from genuine gaps.
**Purpose:** Single authoritative roadmap that supersedes flagship-specific drafts; designed for **per-section parallel chat execution** — each phase below is independently claimable.

---

## EXECUTIVE VERDICT

| Flagship | Score | Top Issue | Time-to-Ship |
|---|---:|---|---:|
| WEDM | 82 | Auth gap | 16h |
| Lathe | 75 | Reasoning ledger empty | 12h |
| Mill | 68 | Router unregistered | **0.5h** |
| Quote | 65 | Multi-tenant + approval dead code | 80h |
| PPG | 62 | 2D-only / dual orphan pipelines | 32h |
| CAD/CAM | 56 | **Operator-in-loop NOT enforced** ★ | 32h |
| Shop+HR+Payroll | 56 | DB tables missing, 0 payroll tests | 96h |
| ERP | 56 | Multi-tenant 12 / tax 12 | 96h |
| SFC | 53 | Paywall not wired | 22h |

**Composite system grade: 64/100** — beta-ready code, SaaS-blocked, autonomous-unsafe.

---

## CROSS-CUTTING PATTERNS (Discovered, Not Per-Flagship)

These themes recur across 3+ flagships and should be addressed **once** at the system layer, not patched per-flagship:

### Pattern 1 — Multi-tenant data leakage (3 flagships affected)
- Quote: 15/100 — `shop_id` ignored end-to-end
- Shop+HR+Payroll: 32/100 — 0 tables have `shop_id` FK, PII unencrypted
- ERP: 12/100 — 0 of 9 ERP tables scoped, single shared chart of accounts

**Root cause:** ShopConfigurationEngine + MultiTenantEngine were built but never wired into ERP-touching paths. Auth extracts `userId` only; `shop_id` dropped at route boundary.
**Single fix:** schema migration + auth middleware + TenantIsolationEngine query layer (40h, unblocks 3 flagships).

### Pattern 2 — Reasoning ledger empty / capture-only (3 flagships)
- Lathe: 0 entries (Mill has 7,986–8,228)
- SFC: 0 SFC-specific entries
- CAD/CAM: 0 CAD/CAM-specific entries

**Root cause:** Telemetry engines exist; nothing fires the writes. Closed-loop ML structurally complete but starved of input.
**Single fix:** ReasoningLedgerWriterEngine + 6 production-path hooks (16h, unblocks ML loops on 3 flagships).

### Pattern 3 — Saleable products billing-blocked (2 flagships)
- SFC: 53/100 — Stripe 40% built, 0% connected
- Quote (subscription portal): paywall absent

**Root cause:** Stripe webhook signature stubbed (billing.ts:98-99); no `subscription_plan` / `stripe_customer_id` columns; tier middleware exists as dead code.
**Single fix:** webhook verification + DB migration + tier middleware wiring (22h).

### Pattern 4 — Backend-built, documentation-abandoned (4 flagships)
- Quote: 95% built, wiki 0 entries, ENGINE_DIGEST stale
- ERP: 92% honest-scan, financial dashboards missing despite engines wired
- Lathe: 188 ML engines, ledger empty
- CAD/CAM: 49 engines + 544 actions wired, roadmap claims 0 shipped

**Root cause:** Documentation/awareness layer abandoned post-ship. User confirmed: "those road maps you're auditing never get updated for some reason."
**Single fix:** Wiki/INVENTORY/ENGINE_DIGEST batch reconciliation pass (24h).

---

## SAFETY-FIRST PHASE (BLOCKING — DO BEFORE ANY OTHER WORK)

The single highest-severity finding across all 9 audits is in CAD/CAM Autonomous: **operator-in-the-loop is declared "unconditional" in CLAUDE-BRIEF but NOT enforced in code**. AI can autonomously generate G-code, route to a real machine, with no human sign-off and sub-five-sigma safety. This is regulatory and physical-safety exposure.

### S0 — Autonomous Safety Closure · 32h · BLOCKER
1. `prism_safety:safety_gate_open` requiring `operator_acknowledge=true` before NC write (4h)
2. Five-sigma export lock: deny NC export if Ω<0.95 OR S(x)<0.98 (4h)
3. Confidence-threshold routing: model uncertainty > 0.95 → human review path (8h)
4. Wire RAPS conformal prediction into CAD/CAM autonomous gate (16h)

**Owner suggestion:** chat dedicated to safety only · pair with physics-reviewer agent · do NOT batch with feature work.

---

## PHASE 1 — IMMEDIATE LEVERAGE (8.5h total · ROI: enormous)

Highest-impact work that unblocks features the codebase already has:

### P1.1 — Mill router 3-line fix · 0.5h
File: `H:/PRISM/mcp-server/src/routes/index.ts`
- L43: `import { createMillingRouter } from "./milling.js";`
- L133: `app.use("/api/v1/milling", createMillingRouter(callTool));`

Unblocks: 12 mill endpoints, MillingUploadPage, MillingWizardPage, MillingResultsPage, MillingSpeedFeedPage, MillingAIPage (all currently 404).

### P1.2 — Auth on `/api/v1/lathe`, `/api/v1/milling`, `/api/v1/wedm` · 4h
Apply `optionalToken` middleware (matches existing `/api/v1/edm` pattern). Closes WEDM, Lathe, and (post-1.1) Mill open-endpoint findings simultaneously.

### P1.3 — Lathe `lathe_p2p_*` orphan decision · 4h
12 actions in `prism_cam:lathe_p2p_*` parallel to canonical `prism_turning_program`. Investigate; either wire the orphan or delete it. Same orphan flagged in Lathe + PPG audits.

---

## PHASE 2 — REVENUE UNLOCK (44h · ROI: first-dollar)

### P2.1 — SFC monetization (22h)
1. Stripe webhook signature verification (4h, billing.ts:98-99)
2. Users-table migration: `subscription_plan`, `stripe_customer_id`, `subscription_status`, `current_period_end` (2h)
3. Webhook→DB persistence handler (4h)
4. Wire `verifyToken` + `requireTier()` to all 17 SFC endpoints (4h)
5. Tier-gate E2E test: free → checkout → paid → calc allowed (4h)
6. Usage-tracking table + per-tier rate limits (4h)

### P2.2 — Sales tax (22h)
1. SalesTaxCalculationEngine + Avalara API (16h)
2. NexusDeterminationEngine (Wayfair 2018 rules) (6h)

**Why this phase:** SFC becomes the first revenue-positive PRISM product. Tax engines unblock multi-state SaaS (otherwise Wayfair violation immediately upon ship).

---

## PHASE 3 — MULTI-TENANT UNLOCK (40h · System-wide)

Single fix unblocks Quote, Shop+HR+Payroll, and ERP simultaneously.

### P3.1 — shop_id schema migration (16h)
Add `shop_id UUID NOT NULL REFERENCES shops(id)` to all ERP, HR, payroll, and quote tables. Backfill JM Die as default shop_id.

### P3.2 — Auth → tenant_id injection (8h)
Extract `shop_id` from JWT in middleware; inject into request context.

### P3.3 — TenantIsolationEngine query layer (16h)
Apply `WHERE shop_id = $tenantId` to all multi-tenant queries via centralized engine.

**Closes:** Quote 15→75, Shop+HR DB 32→65, ERP multi-tenant 12→80.

---

## PHASE 4 — STOP THE BLEEDING (Shop+HR+Payroll regulatory) · 56h

Per Shop audit: this is the only flagship with **material code gaps**, not just integration. Regulatory liability if shipped today.

### P4.1 — DB + PII (16h)
1. DDL migration: create payroll tables (payroll_periods, paystubs, garnishments, w2_forms, benefits_enrollments)
2. Column-level encryption on SSN, bank accounts
3. Type fix: VARCHAR employee_id → UUID

### P4.2 — Payroll test suite vs IRS/DOL tables (24h)
- FLSA OT (40hr + CA 8-hour double-time)
- FICA cap $168,600
- Federal brackets
- Garnishment 25% disposable income cap
- ACA 50-FTE threshold

### P4.3 — Tax filing engines (16h)
- W-2 / W-3 generators
- 1099-NEC + 1099-MISC generators
- FUTA / SUTA employer tax engines
- (EFTPS scheduler deferred to M2)

---

## PHASE 5 — CLOSED-LOOP TELEMETRY (16h · 3 flagships)

### P5.1 — ReasoningLedgerWriterEngine (8h)
Generic ledger writer that all production paths can fire into.

### P5.2 — Wire 6 production hooks (8h)
- LATHE_REASONING_TRACE_LEDGER write on each turning_print_to_program completion
- SFC_REASONING_TRACE_LEDGER on each speed_feed_calc with override capture
- CAD_REASONING_TRACE_LEDGER + CAM_REASONING_TRACE_LEDGER on each autonomous output
- (PPG and Quote follow Mill pattern as references)

**Closes:** Lathe ML 78→90, SFC ML 58→78, CAD/CAM ML 61→80.

---

## PHASE 6 — INTEGRATION GAPS (32h)

### P6.1 — Quote→GL + Job-completion→COGS GL auto-trigger (8h)
Wire `gl_record_invoice` into JobLifecycleEngine.complete() hook.

### P6.2 — Approval workflow callers (4h)
`if (quote.total > $2,500) await approval_workflow_submit` in instant_quote and quote_estimate handlers. Engine + dispatcher + audit trail all built; needs caller.

### P6.3 — Certification → machine permission gate (4h)
**Safety-critical**: prevents uncertified operator from running 5-axis Multus. Cross-cuts Shop audit Path 2.

### P6.4 — Termination → access revocation (8h)

### P6.5 — OSHA injury → workers comp basic flow (8h)

---

## PHASE 7 — JM DIE GROUND-TRUTH HARNESS (40h · Production trust)

509 proven Haas mill programs sit on disk. Zero autonomous-vs-proven G-code diff validation today.

### P7.1 — JM Die corpus validation harness (40h)
- Compare PRISM autonomous output to proven program for each customer/part/operation
- ±10% tolerance on cycle time, exact tool/feed/speed match
- Per-machine baselines: Haas VF-2 (26 programs), Okuma M460V-5AX (5 programs once added)

**Closes:** CAD/CAM JM Die 42→75, Quote calibration 42→75.

---

## PHASE 8 — FRONTEND POLISH (96h)

### P8.1 — Financial dashboards (40h)
- P&L page
- Balance Sheet page
- AR/AP aging UI
- Sales pipeline dashboard
- Excel/PDF/CSV/scheduled email exports

### P8.2 — Safety UI rollout (Lathe + CAD/CAM) (32h)
- S(x) badge component
- Chuck-grip warning panel (Lathe)
- Tailstock-collision 3D overlay (Lathe)
- SLD chatter chart (Lathe + Mill)
- Operator-acknowledge UI gate (CAD/CAM)

### P8.3 — Codex frontend merge resolution (24h)
- cqask/ui (Next.js 13 + Ant Design): port natural-language CAD prompt UI
- mcp-cadquery/frontend (React 19 + Three.js): React 18→19 alignment decision

---

## PHASE 9 — SUPPLY CHAIN + COMPLIANCE (152h)

### P9.1 — MRP / BOM / RFQ (80h)
- MRP demand-driven planning engine
- Multi-level BOM explosion
- Vendor RFQ engine
- Blanket POs + release-against-blanket
- AVL (Approved Vendor List)

### P9.2 — Vendor/payment infrastructure (32h)
- VendorEngine, PaymentEngine, ACHEngine, CheckPrintingEngine

### P9.3 — Multi-currency (24h)

### P9.4 — Dunning + late fee + cash discount (16h)

---

## PHASE 10 — DEPTH (Per-flagship four-sigma · 800h+)

These are the long-tail items from individual flagship audits. **Do not start before phases 1–9.**

### P10.1 — STEP / native CAD parsing (40h)
PPG 2D-only blocker. Open CASCADE bindings.

### P10.2 — 3 missing CAM bridges to hyperMILL parity (160h)
Inventor HSM (60h), Esprit (60h), SolidWorks (40h).

### P10.3 — 6 missing per-machine lathe engines (48h)
Split B250 master-post into 7 thin per-machine engines.

### P10.4 — Hurco VM30i engine fix (8h)
Currently targets VMX24. Cross-finding Mill + CAD/CAM audits.

### P10.5 — Multus B250II mill-turn B-axis strategy (40h)
Lathe-only wiring on a mill-turn machine.

### P10.6 — WorkOrder / Kanban / Andon / Rework engines (24h)

### P10.7 — Test depth: 80h GD&T tests, 24h chuck-force adversarial, 80h CAD test coverage

### P10.8 — Documentation reconciliation (24h)
Update ENGINE_DIGEST, wiki, INVENTORY to reflect built reality. Pattern 4 closure.

---

## SECTIONABLE EXECUTION PLAN (per-chat claims)

Each phase below can be claimed by an independent chat without overlap:

| Phase | Hours | Lane | Worktree | Dependencies |
|---|---:|---|---|---|
| **S0 — Safety** | 32 | safety-first | `prism-safety-ms0` | none — START HERE |
| **P1 — Leverage** | 8.5 | infra/routes | `prism-router-ms0` | none |
| **P2 — Revenue** | 44 | billing/tax | `prism-billing-ms0` | none |
| **P3 — Multi-tenant** | 40 | erp/auth | `prism-tenant-ms0` | none |
| **P4 — Payroll** | 56 | shop/hr | `prism-payroll-ms0` | P3 done first |
| **P5 — Telemetry** | 16 | ml/loops | `prism-ledger-ms0` | none |
| **P6 — Integration** | 32 | erp/safety | `prism-integration-ms0` | P3 done first |
| **P7 — JM Die** | 40 | validation | `prism-jmdie-corpus-ms0` | none |
| **P8 — Frontend** | 96 | ui | `prism-frontend-ms0` | P3 done first |
| **P9 — Supply Chain** | 152 | erp | `prism-supply-ms0` | P3 done first |
| **P10 — Depth** | 800+ | per-domain | per-flagship worktrees | all earlier phases |

**Critical path to "won't get sued + can charge customers":** S0 + P1 + P2 + P3 + P4 = **180.5 hours** = ~4.5 weeks at 1 FTE or ~1.5 weeks at 3 parallel chats.

**Critical path to "first revenue dollar":** S0 + P1.2 + P2.1 = **30.5 hours**.

**Critical path to "production-grade SaaS":** Phases 1–9 = **712.5 hours**.

**Critical path to "four-sigma all flagships":** Phases 1–10 = **~1,500–2,000 hours**.

---

## MERGE WITH EXISTING ROADMAPS

This master roadmap **supersedes** flagship-specific drafts that are stale or partially-shipped. Below is the merge map:

| Existing Roadmap | Status | Merge Action |
|---|---|---|
| `LATHE-MASTER-UNIFIED-ROADMAP.md` v2.0.0 | 7/15 P4 units complete; cleanest of any flagship | **Keep as authoritative for Lathe-specific units** in P10 |
| `PPG-ROADMAP-INDEX.md` (258 units / 39 milestones) | 0.4% claimed; codebase ahead | **Audit + retire** — units already shipped should flip to "shipped" via envelope-sync |
| `SPEED_FEED_CALCULATOR_ENHANCEMENT_PLAN.md` v1.0 (31 units) | 0% executed, blocked on phases 1–5 | **Defer** — gated by P2.1 monetization unlock |
| `PRISM-UNIFIED-ROADMAP-v2.md` v2.1 | Master index | **Add Phase 0 reference** to this master roadmap |
| `CAD-COMPLETE-MS0` envelope | Claims 0 shipped / 335 pending | **Reconcile** — honest scan shows 13% shipped |
| `MF-MS1`, `MF-MS2` envelopes | Claim "completed", git shows "not_started_real" | **Drift fix** via envelope-sync |
| `XPROC-NEURAL-OPTIMIZE-MS0` | Claims "not_started", git shows "in_progress_real" | **Drift fix** via envelope-sync |

Per `state/shared/MILESTONE_PROGRESS.json`, run `scripts/build-milestone-progress.mjs` weekly to keep envelopes aligned with git reality. Drift cases above should be batch-resolved before Phase 1 starts.

---

## SCORING DELTA AFTER EACH PHASE

| Phase | Before | After | Delta |
|---|---:|---:|---:|
| S0 (Safety) | 64 | 67 | +3 (CAD/CAM 56→64) |
| P1 (Leverage) | 67 | 71 | +4 (Mill 68→78, Lathe 75→78, WEDM 82→86) |
| P2 (Revenue) | 71 | 75 | +4 (SFC 53→72) |
| P3 (Multi-tenant) | 75 | 79 | +4 (Quote 65→80, ERP 56→72, Shop 56→62) |
| P4 (Payroll) | 79 | 81 | +2 (Shop 62→78) |
| P5 (Telemetry) | 81 | 83 | +2 (Lathe 78→85, SFC 72→78, CAD/CAM 64→70) |
| P6 (Integration) | 83 | 84 | +1 |
| P7 (JM Die) | 84 | 86 | +2 |
| P8 (Frontend) | 86 | 88 | +2 |
| P9 (Supply chain) | 88 | 91 | +3 |
| P10 (Depth) | 91 | 96 | +5 |

**System grade endgame: 96/100 four-sigma across all 9 flagships.**

---

## DECISION POINTS FOR USER

Before chats begin claiming phases, the user should decide:

1. **Safety-first lock**: S0 must precede everything. Confirm? (Recommended: YES)
2. **Frontend codex merge**: Port cqask/ui + mcp-cadquery into mcp-server/web, OR keep as sandbox? (P8.3 — see `frontend-merge-plan` skill)
3. **MRP: build vs buy**: 80h to build a custom MRP engine (P9.1) vs integrate NetSuite/Fishbowl/Odoo. PRISM has 1 customer (JM Die); buy probably wins until multi-tenant.
4. **Tax: build vs buy**: Avalara API integration (24h) vs custom multi-state nexus engine (80h+). Buy strongly preferred.
5. **Roadmap drift batch**: Run `envelope-sync` skill across MF-MS1, MF-MS2, XPROC-NEURAL-OPTIMIZE-MS0, CAD-COMPLETE-MS0 before Phase 1 starts? (Recommended: YES, 4h)

---

## SUMMARY

Nine flagship deep audits across PRISM revealed **a system in a more complete state than its roadmaps acknowledge**, with **integration gaps disproportionate to construction gaps**. The codebase is ahead of documentation. The patterns are repeatable, not random:

- **Multi-tenant** affects 3 subsystems with one root cause (40h fix)
- **Telemetry** affects 3 subsystems with one root cause (16h fix)
- **Billing** affects 2 subsystems with one root cause (22h fix)
- **Documentation drift** affects 4 subsystems with one root cause (24h fix)

The **single highest-severity finding** (CAD/CAM operator-in-loop NOT enforced) is also the **smallest committed work** (32h S0 phase) — close that before any other engineering.

The **second-largest opportunity** is the Mill router 3-line fix (0.5h) which unblocks 12 endpoints and 5 frontend pages instantly.

After 180.5 hours of disciplined cross-cutting work (phases S0+P1+P2+P3+P4), PRISM moves from "beta-ready, SaaS-blocked" to "production-grade single-tenant + first-dollar SaaS-capable." After 712.5 hours (phases 1–9), production-grade SaaS across all flagships. After ~2,000 hours (phase 10), four-sigma for every flagship.

**This master roadmap is canonical**. Per-flagship roadmaps merge into Phase 10 only. Each phase is sectionable for parallel chat execution.
