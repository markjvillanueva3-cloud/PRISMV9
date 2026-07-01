# Business/ERP Galaxy — slot:hotel
> Universal rails (R1-R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · no-stub ·
> no-inline-constants · duplication guard · RTK · Ollama->Sonnet->Opus ladder · wiki protocol):
> -> `H:/prism/CLAUDE.md`. THIS file = business-domain doctrine ONLY; never re-inline universal prose.

---

## 1. Domain scope + slot identity

**Owns:** HR (payroll, PTO, benefits, performance, role-academy, shift-swap, task-handoff,
time-clock, shop-floor mobile), CRM (customer management, portfolio mining, complaint intake,
portal, knowledge, material map), ERP (work-order, cost-feedback, quality, tool-inventory,
import, JM Die ERP sim), Accounting (GL, billing, hardening, doc extraction, BI), DocuStrata AP.

**EXCLUDES:** machine physics -> mill/lathe/wedm; CAM strategy -> cam/kilo; quoting pipeline ->
quoting/charlie (business consumes accepted quotes via ERP work-order); SPC computation ->
quality galaxy.

**Slot:** hotel. Worktree: `H:/prism-slot-hotel`, branch: `slot/hotel`.
**Engine geography:** flat at `mcp-server/src/engines/` (Business*/Customer*/Employee*/ERP*/
Billing*/Accounting*/GL*/Docustra* prefixes). `business/` subdir = sentinel + docs only.

---

## 2. Verified engines by sub-domain

All names confirmed via `ls mcp-server/src/engines/` 2026-06-13.

| Sub-domain | Engine files (verified on disk) |
|---|---|
| HR core | `EmployeeEngine.ts`, `EmployeeMultiJobConcurrencyEngine.ts`, `EmployeeShiftSwapEngine.ts`, `EmployeeTaskHandoffEngine.ts`, `EmployeeTimeClockEngine.ts`, `EmployeeShiftScheduleEngine.ts`, `EmployeeShopFloorMobileEngine.ts`, `EmployeeWizardBridgeEngine.ts` |
| HR payroll/PTO/benefits | `EmployeePayrollGrossPayEngine.ts`, `EmployeePTOAccrualEngine.ts`, `EmployeeBenefitsEnrollmentEngine.ts`, `EmployeeExpenseReimbursementEngine.ts` |
| HR perf/academy/tracking | `EmployeePerformanceFeedbackEngine.ts`, `EmployeeRoleAcademyInjectionEngine.ts`, `EmployeeMachineDomainAcademyEngine.ts`, `EmployeeDailyDigestEngine.ts`, `EmployeePerOpPartTrackerEngine.ts`, `EmployeePerMachineSFAdaptiveEngine.ts`, `EmployeeInsertSideTrackerEngine.ts` |
| CRM | `CustomerManagementEngine.ts`, `CustomerKnowledgeEngine.ts`, `CustomerPortfolioMinerEngine.ts`, `CustomerMaterialMapEngine.ts`, `CustomerPortalEngine.ts`, `CustomerComplaintIntakeEngine.ts`, `CustomerStatementEngine.ts` |
| ERP | `ERPIntegrationEngine.ts`, `ERPWorkOrderEngine.ts`, `ERPCostFeedbackEngine.ts`, `ERPQualityEngine.ts`, `ERPToolInventoryEngine.ts`, `ERPImportEngine.ts`, `JMDieErpSimulationEngine.ts` |
| Accounting/Finance/DocuStrata | `GeneralLedgerEngine.ts`, `AccountingHardeningEngine.ts`, `BillingEngine.ts`, `BusinessIntelligenceEngine.ts`, `BusinessDocumentExtractorEngine.ts`, `BusinessSyncEngine.ts`, `DocustrataAccountingBridgeEngine.ts`, `DocustrataCustomerIndexEngine.ts` |

Before creating new engines: `duplicationGuardEngine.mustCheckBeforeCreating()` + `ENGINE_DIGEST.md`.
Full dispatcher: `mcp-server/src/tools/dispatchers/businessDispatcher.ts` (7,770 lines -- grep before Read).

---

## 3. Dispatcher quick-ref (verified -- line numbers from businessDispatcher.ts 2026-06-13)

| Action | Line | Use |
|---|---|---|
| `gl_trial_balance` | 2847 | Run BEFORE `gl_journal_entry` -- invariant gate |
| `gl_journal_entry` | 2794 | Post journal entry; debits MUST equal credits |
| `actual_cost_variance` | 2478 | Per-category variance (5 categories, never a total) |
| `quote_to_ship_run` | 4115 | End-to-end orchestrator -- never hand-chain steps |
| `customer_credit_check` | 3582 | Gate quotes against credit limit + AR aging |
| `payroll_compute_gross` | 6670 | FLSA-correct gross pay -- do NOT reimplement |
| `pto_compute_balance` | 6612 | PTO balance (accrual-policy-driven) |
| `business_sync_stats` | 5863 | Sync aggregate (worst-status-wins + newest-wins lastSync) |

Full action list: `grep -n "case \"" mcp-server/src/tools/dispatchers/businessDispatcher.ts`
MCP-down fallback: engines are importable directly from their `.ts` source files.

---

## 4. Canonical constants + data paths

**NEVER inline** payroll tax rates, PTO rules, Cpk floors, customer terms, or GL chart-of-accounts.
These are jurisdiction/shop-specific and extraction-first flagged:
- Payroll tax tables: `mcp-server/src/data/payroll-tax-tables.ts` (verify before use)
- PTO accrual policy: `mcp-server/src/data/pto-policies.ts` (verify)
- Cpk floors per role: operator=1.0 / setup=1.33 / programmer=1.67 -- import from
  `EmployeeMachineDomainAcademyEngine.ts`; never inline in sibling engines
- GL chart of accounts: `mcp-server/src/data/chart-of-accounts.ts` (verify)
- ERP vendor adapters: `mcp-server/src/data/erp-vendor-adapters/<vendor>.ts` (verify; 7 vendors)

**Large-file guard:** `businessDispatcher.ts` is 7,770 lines -- NEVER read from the top.
Grep the action case first, then `Read offset=N limit=40`.

**DocuStrata (ALREADY ingested -- do NOT re-OCR):** query `H:/PRISM/Docustrata/manifest.json` +
`.index/`; ingested: `mcp-server/data/state/jm-die-vendor-registry.json` (174 vendors),
`mcp-server/data/state/jm-die-purchases-summary.json` (20,550 bill-lines).

---

## 5. Domain gotchas / safety rails

All 8 grounded in commit archaeology (SHA in parentheses):

1. **Status-severity ordering for sync aggregation** (`1378d854aa`). `getStats()` uses
   worst-status-wins: `not_configured < idle < ok < syncing < degraded < failed`. 18 `ok` +
   1 `failed` = aggregate `failed`. Anti-pattern: alphabetical or first-wins ordering hides failures.

2. **Newest-wins lastSync, alphabetical byTarget** (same commit). `lastSync` = `max(timestamps)`;
   `byTarget` sorted alphabetically for deterministic diff across snapshot runs.

3. **EmployeeMachineDomainAcademyEngine Cpk-floor-gated promotion** (`c96228f5ed`).
   operator Cpk>=1.0, setup>=1.33, programmer>=1.67. Single-source unlock: passing one
   machine-domain course auto-propagates to ShiftSwap + TaskHandoff for all mapped serials
   in that domain. JM Die honing + carbide_polishing = 10 total machine domains.

4. **ERP multi-vendor 7-system coverage** (`e7a34ec022`). JobBOSS / Epicor / ProShop /
   Global Shop / SAP / Oracle / Generic. Adding a new vendor requires 4 artifacts:
   schema-mapper + cost-category-translator + cycle-time-decoder + round-trip test.
   An enum entry alone is WRONG.

5. **Cost feedback is 5-category, never a single delta** (same commit). Categories:
   material / labor / machine-hour / overhead / freight. A 5% total overrun may hide a
   30% material spike; single-delta reporting loses the actionable signal.

6. **Tool inventory sync triggers reorder alerts** (same commit). `ERPToolInventoryEngine`
   compares on-hand vs per-tool reorder-point. Tool-life predictions from mill/lathe/wedm
   engines feed reorder-point -- bad predictions create false reorder pressure.

7. **JM Die finishing domain layering** (`c96228f5ed`). New domains must layer on existing
   corpora (`training/honing-*`, `training/carbide-polishing-*`), not create silos.
   Siloed corpora fragment tribal knowledge.

8. **Per-role academy curriculum has 5 tiers** (same commit).
   trainee -> operator -> setup -> programmer -> lead. Each tier has per-machine-domain
   deliverables. Cross-galaxy bridge: `EmployeeMachineDomainAcademyEngine` <-> academy/lima.

---

## 6. What NOT to do

- `hotel_tribal_*` via `prism_business` -- UNWIRED (0 dispatcher refs); call engine directly.
- Glob `H:/prism/mcp-server/src/engines/*.ts` -- 2,700+ files, arg-list overflow; use `ls | grep`.
- Glob/Grep `H:/PRISM/JM DIE/` -- use `prismSelfAwarenessEngine.getJMDieCustomerPath()`.
- Re-OCR `H:/PRISM/Docustrata/` -- already ingested; query manifest + state JSONs (§4).
- Inline payroll tax rates, PTO rules, Cpk floors, or GL chart-of-accounts.
- Treat ERP cost-feedback as a single delta -- always 5-category (§5 #5).
- Post a GL journal entry without `gl_trial_balance` first.
- Add a new ERP vendor as enum-only -- 4-artifact adapter required (§5 #4).
- Write to `knowledge/tribal/business-*.md` directly -- use `prism_knowledge:tribal_capture slot=hotel`.
- Read `businessDispatcher.ts` from the top -- grep the case first (7,770 lines).

---

## 7. JM Die back-office reality

No accounting/HR subtree in `JM DIE/`. Back-office data: PRISM state JSONs + engine stores +
`JM DIE/Automated Program_Corrected 5-25.xlsm` (VBA shop "ERP"). DocuStrata = AP ground truth
(ingested paths in §4). ~$4.91M procurement spend; tool purchases ~$211K (die stock majority).
QB parity active: `business/QUICKBOOKS-PARITY-PLAN.md` + `knowledge/wiki/ux-design/qb-parity-erp-ux-design-spec.md`.
`AccountingHardeningEngine.ts` owns bank-reconcile + WIP valuation + QB sync.

---

## 8. Tribal + corpus pointers

- Wiki: `knowledge/wiki/code-tribal/business/` (search `business`, `erp`, `payroll`, `employee`)
- Memories: `knowledge/memories/feedback/` -- search `business`, `erp`, `payroll`, `customer`,
  `employee`, `vendor`, `sync`, `cost-feedback`, `tool-inventory`
- Reference memories: `knowledge/memories/reference/` -- search hotel commit prefixes
  (`MACHINE-DOMAIN-ACADEMY`, `EMPLOYEE-TASK-HANDOFF`, `EMPLOYEE-SHIFT-SWAP`)
- JM Die tribal tips: `knowledge/tribal/jm-die/` -- includes `[[tip-jm-die-012]]`
  (tungsten-carbide WEDM workflow, referenced by carbide_polishing curriculum)
- JM Die customer data: `prismSelfAwarenessEngine.getJMDieCustomerPath()` -- NEVER Glob
- STUB-HUNT-MS0 pattern: engine file <500 bytes = exFAT-corruption stub candidate
  (BusinessSyncEngine was the canonical case; restored via `1378d854aa`)

---

## 9. Cross-galaxy edges (PSN)

- **business <-> quoting (charlie):** accepted quotes -> ERP work-order (`ERPWorkOrderEngine`);
  quote-vs-actual back-flow (`ERPCostFeedbackEngine`).
- **business <-> mill / lathe / wedm:** `ERPToolInventoryEngine` consumes per-machine tool-life
  data; cost-feedback closes the loop into domain adaptive engines.
- **business <-> quality:** `ERPQualityEngine` ingests SPC outputs into customer/job records.
- **business <-> academy (lima):** `EmployeeMachineDomainAcademyEngine` bridges per-role
  machine-domain curriculum assignments.
- **business <-> shop-floor:** real-time machine status drives ERP work-order updates +
  per-machine adaptive engines.
- **business <-> speed-feed (oscar):** SFC subscription billing consumed by business.
- **business <-> frontend-app (quebec):** customer portal + dispatcher consumers
  (quoting/scheduling/ERP).

---

## 10. Closed-loop integration (india)

Outcome publishing: `xproc_outcome_publish {slot:'hotel', domain:'business'}` // UNVERIFIED action name
Tribal capture: `prism_knowledge:tribal_capture slot=hotel` -- never direct markdown writes.
Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## 11. Test commands

```bash
cd mcp-server && rtk npx vitest run -t "Business|ERP|Customer|Employee|Billing|Accounting|Payroll|GL"
cd mcp-server && rtk npx vitest run src/__tests__/ERPIntegrationEngine.test.ts
```

---

## 12. AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs business "<question>"
```

Ollama routing: classify vendor invoice / extract PO line items -> `gpt-oss:20b`;
summarize RFQ or AP ledger -> `gpt-oss:20b`; lint engine or test code -> `qwen2.5-coder:32b`;
deep financial-invariant or ERP adapter reasoning -> `gpt-oss:120b`.
PII discipline: redact customer PII before any Ollama/external call (no hook verified on disk
for this -- enforce manually in every export/log path).
