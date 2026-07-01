---
artifact: domain-buildout-plan
slot: hotel
galaxy: business
galaxy_dir: mcp-server/src/engines/business/
kienzle_pages:
  - Kienzle ERP.dc.html
  - Kienzle Employee Portal.dc.html
  - Kienzle Payroll Labor.dc.html
  - Kienzle Scheduling.dc.html
  - Kienzle Inventory.dc.html
backend_dispatchers:
  - prism_business
frontend_owner: quebec
status: draft
generated_by: hotel-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — hotel (business)

> Finalized plan to take the business galaxy to **PhD-master depth**, then **test → simulate →
> validate → fine-tune**, then **build/flesh out the frontend** from the Kienzle Claude-Design build.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants ·
> canonical physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

---

## §1 — Domain identity & scope

- **Owns:** HR (payroll/FLSA, PTO accrual, benefits enrollment, expense reimbursement, performance
  feedback, role-academy, shift swap, task handoff, time-clock, shop-floor mobile, per-machine
  adaptive, per-op part tracker, insert-side tracker, daily digest, machine-domain academy,
  employee wizard bridge); CRM (customer management, portfolio miner, material map, customer
  portal, complaint intake, statement); ERP (work-order, cost-feedback 5-category, quality gate,
  tool-inventory, import, JM Die ERP sim, multi-vendor 7-system); Accounting/Finance (GL
  double-entry, billing, accounting hardening / WIP valuation / bank-reconcile, BI, document
  extractor, sync, DocuStrata AP bridge, DocuStrata customer index).
- **Excludes:** Machine physics → mill/lathe/wedm; CAM strategy → cam/kilo; quoting pipeline
  computation → quoting/charlie (business consumes accepted quotes via `ERPWorkOrderEngine`);
  SPC computation → quality galaxy; shop-floor live-status → shop-floor galaxy.
- **Slot worktree:** `H:/prism-slot-hotel` · branch `slot/hotel`
- **Galaxy brain:** `mcp-server/src/engines/business/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`

---

## §2 — Current state (verified — R12)

- **Scaffolding:** PARTIAL — CLAUDE.md + MEMORY.md + PATHS.md + TOOLBELT.md + SOUL.md + AWARENESS.md
  all present on disk (confirmed 2026-06-26). AI-synergy audit composite score = 4/4 dimensions
  (discoverability / ownsOrWiresAi / vaultSynergy / crossSubstrate). Business synthesis brain at
  `knowledge/memories/patterns/business_synthesis.md` confirmed present.
- **Engines:** 42+ confirmed on disk (verified via `ls mcp-server/src/engines/` 2026-06-13 in
  CLAUDE.md §2 — see engine table there). Sub-domains: HR-core (8), HR-payroll/PTO/benefits (4),
  HR-perf/academy/tracking (7), CRM (7), ERP (7), Accounting/Finance/DocuStrata (8).
  `businessDispatcher.ts` = 7,770 lines; grep case first, never read from top.
- **Dispatcher surface:** `prism_business` — verified actions include `gl_trial_balance`,
  `gl_journal_entry`, `actual_cost_variance` (5-category), `quote_to_ship_run`,
  `customer_credit_check`, `payroll_compute_gross`, `pto_compute_balance`, `business_sync_stats`.
  Full action list: `grep -n "case \"" mcp-server/src/tools/dispatchers/businessDispatcher.ts`.
- **PSN legs:** Healthy: #1 Obsidian brain (synthesis present) · #3 Wiki (256 entries matching
  business keyword heuristic) · #6 system-viz (cross-substrate edges: owned-by-slot +
  documented-by). Thin: #4 Tribal (23 tips — target 60+) · #5 Memories (12 curated; 641 flat
  memories still un-migrated from U-GALAXY-MS1-C1) · #7 Algorithms (no dedicated business
  algorithms beyond dispatcher routing) · #9 LoRA (dataset seeded via synthesis brain but not
  validated). #10 NN/GNN uses generic reasoning bridge — 0 dedicated AI engines.
- **Known landmines (R12):**
  1. `BusinessSyncEngine.ts` was 320 bytes (exFAT stub) — restored in `1378d854aa` but verify
     current byte count before trusting it.
  2. `hotel-portal.ts` had ZERO auth on all 31 routes until `U-HOTEL-PORTAL-AUTH (18f8da8ed9)`
     — auth now applied; IDOR gap (self-service routes accept arbitrary `employee_id`) remains
     OPEN pending auth-data-model decision (AuthUser has no `employee_id` field).
  3. ERP cost-feedback is 5-category (material/labor/machine-hour/overhead/freight); any caller
     that reads only a total delta silently loses the actionable signal.
  4. `hotel_tribal_*` via `prism_business` is UNWIRED (0 dispatcher refs); call engine directly.
  5. `ERPToolInventoryEngine` reorder alerts are downstream of mill/lathe/wedm tool-life
     predictions — bad physics predictions create false reorder pressure (cross-galaxy landmine).
  6. GL: `gl_trial_balance` MUST precede `gl_journal_entry`; no hook enforces the ordering at
     the dispatcher level — test coverage is the only guard.

---

## §3 — Deepening roadmap → PhD master

**Tribal tips (current → target):** 23 → 60 tips.
- Sources: JM Die VBA ERP (`JM DIE/Automated Program_Corrected 5-25.xlsm`), DocuStrata AP
  corpus (174 vendors / 20,550 bill-lines already ingested — do NOT re-OCR, query
  `H:/PRISM/Docustrata/manifest.json`), BLS ECEC employer-cost tables (verified T1 source),
  NIST MEP manufacturing-economics, QB parity plan (`business/QUICKBOOKS-PARITY-PLAN.md`).
- Capture via: `prism_knowledge:tribal_capture slot=hotel` — never direct markdown writes.
- Priority topics: FLSA rounding gotchas, PTO carryover-cap policy, 7-vendor ERP adapter
  behaviour differences, GL debit-credit invariant enforcement, DocuStrata AP matching, JM Die
  machine-domain academy tier progression, customer credit-limit gate interaction with AR aging.

**Wiki entries to write (missing leaves):**
- `knowledge/wiki/architecture/business-erp-cost-feedback-5-category.md`
- `knowledge/wiki/architecture/business-gl-double-entry-invariant.md`
- `knowledge/wiki/lessons/business-idor-employee-id-gap.md`
- `knowledge/wiki/architecture/business-erp-7-vendor-adapter-contract.md`
- `knowledge/wiki/lessons/business-sync-worst-status-wins-ordering.md`

**Memories to write:**
- `feedback/feedback_hotel_gl_trial_balance_precondition.md` — GL invariant precondition rule
- `reference/reference_hotel_erp_cost_feedback_5cat_2026_06_26.md` — live category breakdown
- `feedback/feedback_hotel_erp_tool_inventory_physics_dependency.md` — cross-galaxy landmine
- `reference/reference_hotel_docustrata_corpus_already_ingested.md` — prevent re-OCR waste

**RAG corpus:** `H:/PRISM/Docustrata/` (already indexed; `.index/` for search) + QB parity
docs + `mcp-server/data/state/jm-die-purchases-summary.json` (20,550 bill-lines). Embed target:
60+ tribal tips embedded into tribal-embed-index within 2 deepening cycles.

**CAG cold-anchor:** cache `mcp-server/src/engines/business/CLAUDE.md` §3 dispatcher quick-ref
+ §5 domain gotchas via `scripts/lib/cag-router.mjs` — the 8 gotchas + action line-numbers are
read-heavy and change rarely; cold-anchoring saves 3-4 Read calls per hotel session.

**NN/GNN features:** Submit `ERPIntegrationEngine`, `EmployeeMachineDomainAcademyEngine`,
`GeneralLedgerEngine` as labeled wired-engine nodes to the NN/GNN refpool (owner: india) via
`vault-to-gnn-refpool.mjs`. These three are the highest-confidence wired anchors for
cost/HR/finance classification in the business ghost-roost.

**LoRA dataset:** `business_lora_train.jsonl` / `business_lora_test.jsonl` at
`mcp-server/data/ai-training/lora/business/`. Instruction-tune split from: (a) docustrata AP
classification tasks (vendor invoice → GL category), (b) ERP cost-feedback 5-category
decomposition examples, (c) employee academy tier-gate pass/fail decisions. India trains.

**Engineered loop + cron:**
- Nightly (`03:17 * * * *`): `mine-galaxy-transcripts.mjs --galaxy business` → Ollama
  `gpt-oss:20b` summarize → append tribal tips + wiki synthesis → `prism_knowledge:tribal_capture`.
- Weekly (`09:23 * * * 1`): rebuild `business_synthesis.md` from updated memories; re-embed
  corpus; emit LoRA delta pairs from new validated examples.
- Acceptance signal: tribal tip count ≥ 60; wiki leaf count ≥ 10 for business domain; LoRA
  dataset ≥ 200 instruction pairs.

**Ollama offload:** vendor invoice classify / GL category extract / AP ledger summarize →
`gpt-oss:20b`; LoRA pair generation / tribal tip lint → `qwen2.5-coder:32b`; deep
financial-invariant or ERP adapter reasoning → `gpt-oss:120b`.

---

## §4 — Test plan (real assertions — R9)

**Unit tests (reference-value / algebraic-invariant):**
- `ERPCostFeedbackEngine.test.ts` — assert 5 categories always sum to total; assert a 30%
  material spike is not masked by flat total; assert category names are the canonical 5.
- `GeneralLedgerEngine.test.ts` — invariant: debits === credits on every posted entry (to the
  cent, integer-arithmetic); assert `gl_trial_balance` returns imbalanced flag before posting.
- `EmployeePayrollGrossPayEngine.test.ts` — FLSA weekly-OT threshold (40h boundary); bi-weekly
  period sum; reference: BLS ECEC 2025 Q04 employer cost structure ratios.
- `EmployeePTOAccrualEngine.test.ts` — accrual policy algebra: hours-worked × rate = balance
  within ±0.01h; carryover-cap enforcement; zero-balance floor.
- `BusinessSyncEngine.test.ts` — worst-status-wins: 18 ok + 1 failed → aggregate failed;
  newest-wins `lastSync`; alphabetical `byTarget` sort is deterministic across N runs.

**Integration (through dispatcher — not singleton):**
- `businessDispatcher.integration.test.ts`:
  - `gl_trial_balance` → `gl_journal_entry` round-trip through `prism_business` dispatcher;
    Zod schema validation on request and response; lazy import exercised.
  - `quote_to_ship_run` action: full orchestration path, stub only the QuoteEstimator I/O;
    assert response shape and that 5 cost categories appear.
  - `customer_credit_check` with AR aging > 90d → assert credit-hold flag.

**E2E (JM Die live data):**
- DocuStrata AP: feed a real bill-line from `jm-die-purchases-summary.json` → `ERPImportEngine`
  → assert vendor matched + GL category assigned + 5-category cost record emitted.
- Payroll: feed a real operator (from `EmployeeEngine` fixture) with 44h week →
  `payroll_compute_gross` → assert OT premium for 4h at 1.5×; assert gross matches
  FLSA algorithm to the cent.

**Coverage floor:**
- Happy path + ≥3 failure modes: (a) GL debit ≠ credit → reject; (b) negative PTO request
  exceeding balance → reject; (c) ERP vendor enum without 4-artifact adapter → throw descriptive
  error; (d) `business_sync_stats` with all-failed targets → aggregate failed.
- ≥2 adversarial: (a) NaN wages input → structured error, not throw; (b) empty employee list
  → `payroll_compute_gross` returns empty array with summary 0, not crash.
- ≥3 spanning configs: (a) JobBOSS adapter; (b) Epicor adapter; (c) Generic adapter — each
  round-trip through `ERPIntegrationEngine.test.ts`.

**Target test files to add/extend:**
`src/__tests__/ERPCostFeedbackEngine.test.ts` · `src/__tests__/GeneralLedgerEngine.test.ts` ·
`src/__tests__/EmployeePayrollGrossPayEngine.test.ts` · `src/__tests__/EmployeePTOAccrualEngine.test.ts` ·
`src/__tests__/BusinessSyncEngine.test.ts` · `src/__tests__/businessDispatcher.integration.test.ts`

**Runner:** `cd mcp-server && rtk npx vitest run -t "Business|ERP|Employee|Payroll|GL|Billing"`

---

## §5 — Simulation plan

**What to simulate:** ERP work-order lifecycle (quote accepted → work-order created → operations
dispatched → cost-feedback closed loop); payroll period dry-run; GL reconciliation simulation.

**Tools:** `JMDieErpSimulationEngine` (existing) + `ERPWorkOrderEngine` + `ERPCostFeedbackEngine`
+ `prism_business:quote_to_ship_run`.

**Scenarios:**
1. JM Die standard job: Alcoa progressive die, 3-operation (mill + lathe + wedm) → work-order
   created → actual cost captured in 5 categories → variance against estimated → assert
   variance per-category within ±25% of DocuStrata actuals for same customer class.
2. Payroll period simulation: 12 operators, 2-week period, mixed regular/OT, 1 PTO day each →
   `payroll_compute_gross` for all → assert shop total within ±2% of JM Die VBA ERP output
   for same period (use `JM DIE/Automated Program_Corrected 5-25.xlsm` as ground truth).
3. GL reconciliation: 20 DocuStrata bill-lines from `jm-die-purchases-summary.json` → import →
   trial balance → assert balanced within ±$0.01.
4. Edge: ERP cost-feedback with freight = $0 (common for local vendors) → assert category
   appears in response with value 0, not omitted.
5. Adversarial: concurrent work-order creates on the same job number → assert
   `DistributedLockManager.withLock` prevents race, last-writer-wins is rejected.

**Pass criteria:** scenario 1: per-category variance ≤ 25%; scenario 2: payroll MAPE ≤ 2%;
scenario 3: GL balance error ≤ $0.01; scenario 4: all 5 categories present; scenario 5: 0
duplicate work-orders emitted.

---

## §6 — Validation plan (live data + numbers — R12/R15)

**Live-data validation:**
- Run `ERPImportEngine` against the full 20,550 DocuStrata bill-lines in
  `mcp-server/data/state/jm-die-purchases-summary.json`; report: rows imported / GL categories
  assigned / vendor-match rate / unmatched count.
- Run `payroll_compute_gross` against JM Die VBA ERP for the most recent closed pay period;
  report gross-pay delta per operator in absolute $ (target: ≤ $0.50 deviation from VBA output).
- Run `customer_credit_check` against top-10 JM Die customers by open-order value; report:
  credit-hold triggers / AR aging buckets / any mismatches vs manual ledger.

**Acceptance gates:**
- DocuStrata import: vendor-match rate ≥ 90%; unmatched ≤ 10% (flagged for manual review, not
  silently dropped).
- Payroll: per-operator gross-pay delta ≤ $0.50; total payroll MAPE ≤ 0.5%.
- GL: trial-balance error on any imported batch ≤ $0.01; no silent rounding loss.
- ERP cost-feedback parity: page output vs backend core — all 5 category values agree to ±$0.01
  (parity probe, not "looks fine").

**Safety gate:** `prism_safety:validate_physics` is not directly applicable to a finance domain.
However: `gl_trial_balance` MUST precede `gl_journal_entry` — treat this as the domain's
equivalent safety gate (financial integrity gate, not shop-floor S(x)). Enforce via a pre-action
hook or test assertion — fail loud if precondition is skipped.

**Parity probe:** `ErpDashboard.tsx` → `businessDispatcher:actual_cost_variance` → backend
`ERPCostFeedbackEngine` — assert all 5 category values match between page render and raw engine
output. `PayrollPage.tsx` → `businessDispatcher:payroll_compute_gross` — assert per-operator
gross matches engine output to the cent.

---

## §7 — Fine-tune loop (results → retrain)

**Outcome capture:** write results from §5/§6 validation runs to
`mcp-server/data/state/business-closed-loop-outcomes.jsonl` (schemaVersion required; atomic
append via `atomicWrite`); include: scenario_id, pass/fail, per-category values, delta,
timestamp, JM-Die job reference.

**LoRA:** failing or edge cases (high-variance cost categories, FLSA edge hours, GL rounding
mismatches) → append instruction-answer pairs to `business_lora_train.jsonl` with
`source: "validation_failure"` tag → india retrains on combined dataset. Promote IFF
accuracy on held-out business-domain QA set ≥ 85% (measured by india's LoRA eval).

**RAG/CAG:** newly validated GL rules and payroll FLSA facts → re-embed into tribal corpus
(`prism_knowledge:tribal_capture`); refresh CAG cold-anchor for CLAUDE.md §3/§5 content
whenever action line-numbers change (businessDispatcher.ts is 7,770 lines — grep-verified).

**NN/GNN:** after each validation cycle, submit newly confirmed wired-engine labels to
`vault-to-gnn-refpool.mjs`; india retrains GraphSAGE; promote IFF AUROC ≥ 0.78 /
macro-F1 ≥ 0.55 / Brier ≤ 0.15 (standard fleet gate).

**Trigger + cadence:** outcome ledger reaches ≥ 50 new rows → auto-trigger LoRA re-emit
(knob `PRISM_BUSINESS_LORA_TRIGGER_N=50`); weekly cron (Monday 09:23) re-runs the full
validation suite and appends outcomes; NN/GNN retrain on threshold, not calendar.

---

## §8 — Frontend build (Kienzle Claude-Design rollout)

**Assigned Kienzle pages (5):**

| Kienzle design | Target React page | Action |
|---|---|---|
| `Kienzle ERP.dc.html` | `mcp-server/web/src/pages/ErpDashboard.tsx` | EXTEND (exists) |
| `Kienzle Employee Portal.dc.html` | `mcp-server/web/src/pages/HotelPortalPage.tsx` | EXTEND (exists, auth wired) |
| `Kienzle Payroll Labor.dc.html` | `mcp-server/web/src/pages/PayrollPage.tsx` | EXTEND (exists) |
| `Kienzle Scheduling.dc.html` | `mcp-server/web/src/pages/CapacityPlanningPage.tsx` | EXTEND (exists, rename tab) |
| `Kienzle Inventory.dc.html` | `mcp-server/web/src/pages/InventoryPage.tsx` | EXTEND (exists) |

All 5 pages exist — Codex Page Protection: EXTEND, do NOT create new files.

**Per-page backend wiring:**

- **ErpDashboard.tsx** (ERP command view): KPI cards (cashRisk, openValue, OEE, shipToday) →
  `prism_business:quote_to_ship_run` + `actual_cost_variance` + `business_sync_stats`.
  Machine floor live-grid → `prism_shop_floor:machine_live_status` (cross-galaxy).
  Alerts panel → `prism_business:erp_alerts` (verify action exists before wiring).
  API client: `web/src/api/business.ts`. Route: `GET /api/v1/business/erp-dashboard` on `:3100`.

- **HotelPortalPage.tsx** (Employee portal — shift/job clock, active job, op stepper):
  Shift timer / clock-in-out → `prism_business:employee_timeclock_event` (verify action name).
  Active job + op sequence → `prism_business:erp_work_order_get` / job assignment.
  Break toggle → timeclock event with type=break.
  API client: `web/src/api/hotel-portal.ts`. Route: `/api/v1/hotel-portal/*` (auth-gated,
  `verifyToken` + `requireRole` already wired per `U-HOTEL-PORTAL-AUTH`).

- **PayrollPage.tsx** (Payroll & Labor — people list, period selector, labor cost drill):
  Employee rows with hrs/efficiency → `prism_business:payroll_compute_gross` (period param).
  Dept filter chips → client-side filter over fetched roster.
  "Run payroll" CTA → `prism_business:payroll_run_period` (verify action exists, gate with
  `requireRole: hr_manager`).
  API client: `web/src/api/business.ts`. Route: `POST /api/v1/business/payroll/compute`.

- **CapacityPlanningPage.tsx** (Scheduling & Capacity — Gantt grid, dispatch-rule toggle,
  OTD badge, job detail panel):
  Machine schedule rows → `prism_business:capacity_plan_query` or `erp_schedule_get`.
  Dispatch rules (EDD/SPT/FIFO) → `prism_business:erp_schedule_set_rule` (verify action).
  OTD badge → `prism_business:erp_otd_stats`.
  API client: `web/src/api/business.ts`. Route: `GET /api/v1/business/schedule`.

- **InventoryPage.tsx** (Inventory & Purchasing — stock table with ABC/EOQ/status, PO list,
  receiving tab, reorder badge, "Raise all POs" CTA):
  Stock rows → `prism_business:erp_tool_inventory_query` (ERPToolInventoryEngine).
  PO rows → `prism_business:erp_po_list`.
  Receiving tab → `prism_business:erp_po_receive`.
  "Raise all POs" → `prism_business:erp_po_create_batch` (gate: lead+).
  API client: `web/src/api/business.ts`. Route: `/api/v1/business/inventory/*`.

**Design language:** iOS fleet language (`web/DESIGN.md` tokens; `var(--bg-surface)`,
`var(--border)`, `var(--fg-dim)` — never inline hex). Kienzle designs use `#0A0B0D` base,
`#FF5A2B` accent, `JetBrains Mono` for numerics, `Space Grotesk` for headings, `Archivo` for
body — these map directly to existing PRISM dark-theme tokens. Status dots: emerald=running,
amber=setup, red=down, `--fg-dim`=idle. 44pt tap targets on all CTAs; `<MobileSafeArea>` wrapper;
bottom-center CTAs ("Run payroll →", "Raise all POs") for thumb-zone compliance.

**Build/verify loop:** edit → `rtk npm run build:fast` → Playwright screenshot at desktop
(1440×900) + iPhone 14 (390×844) + Pixel 7 (412×915) → compare to `.dc.html` intent → iterate.
All 5 pages must render with live data from `:3100` before frontend acceptance.

**Acceptance:** all 5 pages render with live dispatcher data; parity probe page↔backend passes
(§6); 3-viewport screenshots match Kienzle design intent; auth gates confirmed (`verifyToken`
on all hotel-portal routes, `requireRole` on payroll-run and PO-create).

---

## §9 — Dependencies & sequencing

- **Blocked by:** india for LoRA retrain + NN/GNN retrain (india owns AI substrate); quebec for
  shared UI shell + frontend implementation (hotel owns backend the page consumes, quebec owns
  `.tsx`); charlie (quoting) for `quote_to_ship_run` upstream data; shop-floor galaxy for
  machine-live-status cross-galaxy feed into `ErpDashboard.tsx`; auth-data-model decision
  (india or operator) for IDOR self-scoping fix.
- **Blocks:** quoting/charlie `ERPWorkOrderEngine` downstream (cost-feedback loop); quality
  galaxy `ERPQualityEngine` consumer; academy/lima `EmployeeMachineDomainAcademyEngine` bridge.
- **Logical order (R13):**
  1. Fix `BusinessSyncEngine.ts` byte-count anomaly (verify not stub).
  2. Write/extend test files (§4) — CI gate green.
  3. Run simulations (§5) + live-data validation (§6) — get numbers.
  4. Deepen tribal/wiki/memory (§3) using validation findings.
  5. Emit LoRA dataset; india retrains (§7).
  6. Frontend build (§8) — only after backend validation passes parity probe.

---

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] WIRE: every new dispatcher action / API route wired in same commit (no orphan); hotel-portal
      auth guard on all 31 routes confirmed; IDOR fix committed once auth-data-model resolved.
- [ ] TEST: real reference/invariant tests for all 6 target test files; happy + ≥3 failure +
      ≥2 adversarial + ≥3 spanning ERP vendor configs; through `prism_business` dispatcher; CI green.
- [ ] VALIDATE: DocuStrata import ≥ 90% vendor-match; payroll MAPE ≤ 0.5%; GL balance ≤ $0.01;
      cost-feedback parity ≤ $0.01 per category; numbers reported, not "looks fine" (R12).
- [ ] APPLY: deepening loop (nightly mine + weekly synthesis) cron registered and running; all 5
      Kienzle pages rendering live data at `:3100`; 3-viewport screenshots captured and matching;
      LoRA dataset ≥ 200 pairs; tribal tip count ≥ 60; wiki leaves ≥ 10.
- [ ] Per-file 2-arm scrutiny on every new/modified code file; 3-of-3 Stop gate on the session.
