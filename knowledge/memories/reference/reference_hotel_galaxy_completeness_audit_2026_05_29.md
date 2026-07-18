---
name: reference_hotel_galaxy_completeness_audit_2026_05_29
description: Hotel business/ERP galaxy completeness audit (workflow w2ng2j400, 4 agents) — verdict ~88% complete; coverage table 14/19 full + 1 true gap (tax); the prioritized capability backlog + the audit-fixes applied
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.611Z
aliases: reference_hotel_galaxy_completeness_audit_2026_05_29
---


Hotel (galaxy:business) DOMAIN-COMPLETENESS audit, slot:hotel session d7f7d3ce, 2026-05-29. Operator: "use workflow and codex to assess the galaxy build to ensure we included everything for the domain." Workflow `w2ng2j400` (4 agents: brain / coverage / artifact-backlog / synthesis). **Codex timed out at 600s (host load) — workflow delivered the verdict.**

**VERDICT: ~88% complete.** Core ERP surface is broad + genuinely deep — 879 wired `prism_business` actions, ~261 business engines, 25/27 wired. NOT a façade. The gaps are thin-spots + one true pillar (tax) + doc/honesty drift, not missing pillars.

**Capability coverage (14/19 full · 3 thin · 1 missing):** ✅ GL, AP (PO/3-way-match), payroll, HR (deepest), CRM, inventory/EOQ, work-order/traveler, quoting (deepest), costing, purchasing, scheduling/capacity, quality/compliance (ISO/OSHA/CAPA/NCR/SPC), BI, time-and-billing. 🟡 thin: AR (aging present, NO collections/dunning workflow); fixed-assets (straight-line only, no MACRS/disposal); banking/cash (no bank-feed/treasury/cash-application). 🔴 **TAX genuinely missing** — only a `integration_export_payroll_tax` shim; no sales/use-tax, no 1099-NEC/W2, no income-tax provision. **The #1 build target.**

**Audit-fixes APPLIED this session (commit U-PSGB-HOTEL-AUDITFIX):** the `hotel_tribal` false-"wired" claim is now corrected in ALL 6 homes (engine header + MEMORY.md + CLAUDE.md §8.5 + PATHS.md L61 + TOOLBELT L13/L39 — the audit caught the 5th+6th un-swept surfaces); `business_sync_stats` line drift 5032→5088 (CLAUDE.md + PATHS.md); AISystemRouter `return "unknown"` L108→L115 (MEMORY.md); PATHS.md worktree-vs-main caveat added for the galaxy-built artifacts (jm-die JSONs, 3 scripts, 2 hooks, HotelERPTribal — all worktree-only-pending-golf-merge). GSD.md graded COMPLETE; the other 4 brain files were PARTIAL (now corrected). No fabricated engine/path/action found — every cited engine + dispatcher action exists.

**PRIORITIZED CAPABILITY BACKLOG (operator to prioritize building — NOT done):**
1. **Tax engine** (sales/use-tax on shipments + year-end 1099-NEC for subcontractors) — the one true pillar gap; highest-value new build.
2. **Frontend-leg ownership** — 22 business pages exist (`BusinessSuitePage`, `QuoteBuilderPage` 117K, `GeneralLedgerPage`, `CustomerPortalPage`, `PayrollPage`, etc. under `mcp-server/web/src/pages/`) + 4 API clients, with ZERO references in the galaxy brain. Add a PATHS.md frontend section + CLAUDE.md hotel-vs-quebec ownership note.
3. **Idle DocuStrata vendor data → consumer** — `jm-die-vendor-registry.json` (174 vendors) + `purchases-summary.json` are ingested but nothing reads them. Wire to a reorder-point / vendor-scorecard engine + a `/vendor-*` skill.
4. AR collections/dunning workflow · 5. Accelerated depreciation (MACRS/declining-balance/disposal) · 6. Banking/cash (bank-feed OFX/BAI2, treasury, cash-application) · 7. `quote_to_ship_run` rollback/atomicity test (R9 — load-bearing "never partial-update" claim is untested) · 8. Expand the 3 stub wiki entries (<1KB each) · 9. HR/compliance skill (`/payroll-run`, `/hr-compliance`) + a compliance refuse-on-violation hook (OSHA-log/CAPA/LOTO) · 10. domain cron (period-close / AR-aging / reorder-point / PTO-accrual are time-driven, no scheduled owner) · 11. wire `ERPImportEngine` (genuine unwired business engine) · 12. brain test-inventory + schema/migration sections.

Plus the 4 standing env/cross-tree-deferred: 6 constants modules, 2 advisory-hook settings.json wiring, AISystemRouter business_ops branch, HotelERPTribal dispatcher wiring. Links: [[reference_hotel_psn_audit_2026_05_29]] · [[reference_hotel_domain_maximize_2026_05_29]] · [[reference_hotel_jm_die_vendor_data_ingest_2026_05_29]].
