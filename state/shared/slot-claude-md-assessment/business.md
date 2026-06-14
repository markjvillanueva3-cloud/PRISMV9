# business — slot:hotel

## Current state

**Size:** 19,149 bytes / 187 lines  
**Quality grade:** GOOD

The current file is the strongest of any galaxy CLAUDE.md assessed so far — it was written by alpha after real commit archaeology (not scaffolded). It has 8 well-structured sections covering domain scope, gotchas, tribal pointers, cross-galaxy edges, and closed-loop india integration. The companion PATHS.md and TOOLBELT.md are mature and unusually detailed.

**Stale / inaccurate content found:**

1. **Section 3 `BusinessSyncEngine.ts (⚠ 320 BYTES — verify if real or stub)`** — This warning is STALE. The engine is 5,231 bytes (verified via `wc -c`). The CLAUDE.md itself records the fix in the authorship note (commit `1378d854aa`) but then contradicts itself in §3 by keeping the warning. Drop the warning from §3; the repair prose in §1 is already the record.

2. **Dispatcher action count mismatch** — CLAUDE.md §3 does not cite a dispatcher action count. PATHS.md says "879 action cases"; the live grep count is 1,053 `case "` lines in a 7,770-line file. The PATHS.md number is stale. The file grew substantially post-buildout. Do not hardcode this count; reference the live file instead.

3. **Constants paths are all `(verify)` unverified** — §2 lists 6 canonical constant files (`payroll-tax-tables.ts`, `pto-policies.ts`, etc.) with `(verify)` flags. None have been confirmed to exist. These are extraction-first backlog items, not verified constants locations. Honest but clutters the domain CLAUDE.md; move the verification task to MEMORY.md pickup tasks and replace §2 with a rule + the real path if found.

4. **`HotelERPTribalKnowledgeEngine` orphan** — The CLAUDE.md §6 references this engine and `hotel_tribal_*` tribal capture but the engine has 0 dispatcher refs (confirmed: grep returned empty). PATHS.md correctly calls it an "UNWIRED ORPHAN". The galaxy CLAUDE.md §6 needs to carry the same explicit warning so a hotel session doesn't call it as `prism_business:hotel_tribal_*`.

5. **Closed-loop india integration section is generic boilerplate** — The `xproc_outcome_publish`, `xproc_kg_project_features`, and `xproc_calibration_monitor_record` action names appear in ALL 34 galaxy files identically (auto-injected). This is universal infrastructure, not business-specific doctrine. It belongs as a pointer to the universal core, not inline here.

6. **`## Cross-cutting methodology` section** — 30+ lines of AI/Ollama/CAG/RAG methodology that is fleet-wide auto-injected boilerplate (same across all galaxies). Pure token waste in the domain file.

7. **`<!-- AI-SYSTEMS-STATE -->` block** — 7-line pointer block that is auto-maintained. No domain-specific content; it is a pointer to a shared file. Should be a one-liner at most.

---

## KEEP

- **§1 Domain scope** — Clear, accurate coverage of ~10 sub-domains (HR/payroll/PTO/benefits/CRM/ERP/accounting/vendor/BI/doc-extraction). The "excludes" list is load-bearing.
- **§4 Test commands** — The vitest filter string is concrete and correct.
- **§5 Business-specific gotchas** (all 8) — These are the highest-value content in the file. All are commit-archaeology-grounded with actual SHAs. Every point is domain-specific and not derivable from the universal core. KEEP verbatim:
  - Status-severity ordering for sync aggregation (worst-wins)
  - Newest-wins lastSync + alphabetical byTarget
  - EmployeeMachineDomainAcademyEngine Cpk-floor-gated promotion (1.0/1.33/1.67)
  - ERP multi-vendor 7-system coverage + adapter requirement
  - Cost feedback = per-category variance, not single delta
  - Tool inventory sync → reorder alerts (cross-galaxy with mill/lathe/wedm tool-life)
  - JM Die finishing domain layering pattern (corpora-not-silos)
  - Per-role academy curriculum 5 tiers
- **§7 Cross-galaxy edges** — Precise, non-duplicated, load-bearing for hotel to avoid stepping on charlie/oscar/quality/shop-floor.
- **§6 Tribal pointers** — The `STUB-HUNT-MS0` pattern (320-byte = exFAT-corruption stub), Cpk floors import rule, and ERP adapter schema pointer are business-specific and valuable. The `knowledge/wiki/code-tribal/business/` and `knowledge/memories/feedback/` search terms are accurate.
- **Authorship note** — The cross-galaxy authorship and per-subdomain breadth notice is valuable context for hotel.
- **`## Closed-loop integration with india` header** — KEEP the header + a 2-line pointer to `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`. DROP the 15 lines of inline detail (fleet-wide boilerplate).

---

## DROP

- **§2 Canonical constants reference** — All 6 paths are `(verify)` unverified. The table wastes space; replace with: "Before inlining any tax/PTO/benefit/terms value, grep for the canonical file — extraction-first flag if absent. Verification task in MEMORY.md §Hotel pickup tasks."
- **§3 stub warning on BusinessSyncEngine** — The `⚠ 320 BYTES` annotation is resolved. Drop the warning; keep the engine name in the engine list without annotation.
- **`## Cross-cutting methodology` section** (~30 lines) — Fleet-wide auto-injected Ollama/loop/vault/LoRA/CAG/RAG boilerplate. Pointer-only: "Operational methodology: `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md`."
- **`<!-- AI-SYSTEMS-STATE:BEGIN -->` block** — Auto-maintained 7-line pointer; collapse to 1 line or let the MEMORY.md carry it.
- **`<!-- CRITIC-KEEPWORKING-STANZA -->` section** — Universal doctrine (R6 + R12 pointers). Belongs in the universal-core pointer, not inlined here.
- **india closed-loop inline detail** — The 15 lines of `xproc_*` action calls are fleet-wide boilerplate auto-injected; the 3 action names `xproc_outcome_publish / xproc_kg_project_features / xproc_calibration_monitor_record` should appear ONCE as a pointer to the PER-SLOT-CLOSED-LOOP spec.
- **`## Related galaxies (PSN edges — symmetric)` note** — The symmetric-flag notation is an artifact of galaxy buildout review. Keep the actual edges in §7; drop the `(symmetric ✓)` badges.

---

## ADD (domain-specific — the heart of this assessment)

### 1. Verified dispatcher action quick-reference (CRITICAL GAP)

The TOOLBELT.md has the right content but the CLAUDE.md has no live dispatcher action cheatsheet. Add a compact table of the 12 most-used `prism_business` actions with their verified line numbers:

| Action | Dispatcher line | Use |
|--------|----------------|-----|
| `gl_trial_balance` | 2847 | Always run before `gl_journal_entry` (invariant gate) |
| `gl_journal_entry` | 2794 | Post a journal entry — debits MUST equal credits |
| `actual_cost_variance` | 2478 | Per-category variance (material/labor/machine-hr/overhead/freight) |
| `quote_to_ship_run` | 4115 | Canonical end-to-end orchestrator — never hand-chain |
| `customer_credit_check` | 3582 | Gate quotes against credit limit + AR aging |
| `payroll_compute_gross` | 6670 | FLSA-correct gross pay — do NOT reimplement |
| `pto_compute_balance` | 6612 | PTO balance (accrual-policy-driven) |
| `business_sync_stats` | 5863 | Sync target aggregate (worst-status + newest-wins lastSync) |
| `erp_work_order_create` | UNVERIFIED | ERP WO generation post accepted-quote |
| `erp_cost_feedback` | UNVERIFIED | Write estimated-vs-actual per category back to ERP |

> NOTE: Two actions above are UNVERIFIED (line not confirmed); hotel must confirm via grep before citing them.

### 2. Financial invariants — explicit rule block (MISSING)

Business is the only galaxy with genuine financial invariants (debits=credits, AR aging gates, payroll period closure). These are not in the CLAUDE.md as a named block. Add:

```
FINANCIAL INVARIANTS (always enforced):
- GL: debits MUST equal credits on every journal entry (GeneralLedgerEngine invariant gate)
- AR: customer_credit_check BEFORE quote acceptance (not after)
- Payroll: period closure is idempotent-safe; never double-post a period
- ERP cost-feedback: per-category (5 categories), never a single total delta
- PII: customer-consents.json MUST be read before ANY customer data export
```

Hook reference: `hotel-financial-invariant-guard.mjs` (PreToolUse, PATHS.md confirmed).

### 3. PII / data handling rules (MISSING from CLAUDE.md, only implied)

The SOUL.md refuses include `exposing-customer-pii-in-logs` and `dropping-pii-redaction-on-export`. The CLAUDE.md has NO explicit PII section. Add:

- `data/state/customer-consents.json` must be read before customer export
- PII gate: `hotel-pii-redaction-guard.mjs` (PreToolUse hook — PATHS.md line 96)
- Polish + Spanish language awareness: JM Die operators are Polish/Spanish-primary (not English-first); business comms + portal UI must support both
- Payroll data is PII-class; never log gross-pay values or SSN fragments

### 4. JM Die back-office reality (MISSING — most important domain-specific context)

The CLAUDE.md mentions JM Die in passing. A hotel session needs to know upfront:

- **No accounting/HR subtree in JM DIE/**: back-office data is in PRISM state JSONs + engine-internal stores + `JM DIE/Automated Program_Corrected 5-25.xlsm` (the actual shop "ERP" — VBA automation spreadsheet)
- **DocuStrata is the AP ground truth**: `H:/PRISM/Docustrata/Report_from_J.M._Tool__Die_LLC.pdf` (880pp, 12yr QuickBooks Purchases-by-Vendor-Detail). ALREADY ingested → `data/state/jm-die-vendor-registry.json` (174 vendors) + `jm-die-purchases-summary.json` (20,550 bill-lines). Do NOT re-OCR; query via `prism_data:database_search` → `JMDieDocuStrataDB` (111,745 entries) or `JMVendorAPLedgerDB` (20,736 entries).
- **Total procurement spend context**: ~$4.91M from DocuStrata corpus; tool purchases ~$211K (JM is primarily a die shop, carbide-blank die stock is the majority spend).
- **JM Die sold orders**: `JMSoldOrdersDB` (500 entries) + `JMToolPurchasesDB` (49 entries) via `prism_data:database_search`.

### 5. "What NOT to do" list (MISSING)

```
NEVER in business galaxy:
- Call hotel_tribal_* via prism_business — HotelERPTribalKnowledgeEngine is UNWIRED (0 dispatcher refs); call the engine directly
- Glob H:/prism/mcp-server/src/engines/*.ts — 2700+ files, arg-list overflow; use dir-list grep instead
- Glob/Grep H:/prism/JM DIE/ for customer files (~24,545); access via prismSelfAwarenessEngine.getJMDieCustomerPath()
- Re-OCR H:/PRISM/Docustrata — ALREADY indexed; query manifest.json + .index/ + JMDieDocuStrataDB
- Inline payroll tax rates, PTO rules, or Cpk floors — import from canonical files (extraction-first flag if absent)
- Treat ERP cost-feedback as a single delta — it is 5-category (material/labor/machine-hr/overhead/freight)
- Add a new ERP vendor as an enum entry only — requires schema-mapper + cost-category-translator + cycle-time-decoder
- Post a GL journal entry without running gl_trial_balance first
- Write directly to knowledge/tribal/business-*.md — auto-regen overwrites; use prism_knowledge:tribal_capture slot=hotel
- Read businessDispatcher.ts from the top — it is 7,770 lines; Grep for the action case first, then Read offset
```

### 6. Key sub-domain engine bucket summary (COMPACT, for quick orientation)

The CLAUDE.md §3 lists engines but lacks the bucket counts. Add a compact header:
- ~355 business engines total (PATHS.md count, approximate)
- `prism_business` dispatcher: 7,770 lines, 1,053+ action cases, 16 buckets
- HR: 22 engines (`Employee*.ts`) | ERP: 6 engines (`ERP*.ts` + `JMDieErpSimulationEngine`) | CRM: 7 engines | Accounting: ~10 engines | Job/Scheduling: ~7 engines | Compliance/Audit: ~10 engines

### 7. ERP vendor adapter pattern (expand from gotcha #4)

Add the concrete adapter requirement as a named pattern so hotel doesn't repeat the mistake:
- 7 supported ERP vendors: JobBOSS, Epicor, ProShop, Global Shop, SAP, Oracle, Generic
- New vendor = 4 artifacts: schema-mapper + cost-category-translator + cycle-time-decoder + round-trip test
- Adapter schema path: `mcp-server/src/data/erp-vendor-adapters/<vendor>.ts` (extraction-first flag — verify before trusting)

### 8. QuickBooks parity context (referenced in QUICKBOOKS-PARITY-PLAN.md but absent from CLAUDE.md)

A QUICKBOOKS-PARITY-PLAN.md exists in this galaxy dir. Add a pointer:
- QB parity is an active workstream: `business/QUICKBOOKS-PARITY-PLAN.md` (UX design spec at `knowledge/wiki/ux-design/qb-parity-erp-ux-design-spec.md`)
- `AccountingHardeningEngine` owns bank-reconcile + WIP valuation + QB sync

---

## IDEAL SECTION OUTLINE

```
# Business/ERP Galaxy — CLAUDE.md (slot:hotel)

## 0. Universal-core pointer  [4 lines]
## 1. Domain scope + boundaries  [~15 lines]
## 2. Financial invariants (hard rules)  [~10 lines]  ← ADD
## 3. PII + data handling rules  [~8 lines]  ← ADD
## 4. JM Die back-office reality  [~15 lines]  ← ADD
## 5. Key engines by sub-domain  [~25 lines, compact table]
## 6. Dispatcher action cheatsheet  [~15 lines verified]  ← ADD
## 7. Business-specific gotchas (8 entries)  [~50 lines — KEEP verbatim]
## 8. "What NOT to do"  [~12 lines]  ← ADD
## 9. Tribal + knowledge pointers  [~10 lines]
## 10. Cross-galaxy edges  [~10 lines — KEEP]
## 11. Constants + extraction-first flags  [~8 lines, simplified]
## 12. ERP vendor adapter pattern  [~6 lines]
## 13. Test commands  [4 lines — KEEP]
## 14. Closed-loop india integration  [3-line pointer]
```

Target: ~190 lines / ~7KB (vs current 187 lines / 19KB — the current file has a LOT of
whitespace + boilerplate that bloats bytes without adding domain value).

---

## UNIVERSAL-CORE POINTER

The following rules must remain AVAILABLE to hotel but should NOT be duplicated in this file —
a single pointer section suffices:

```markdown
## 0. Universal-core pointer
Root CLAUDE.md: `H:/prism/CLAUDE.md` — governs:
- R1-R15 (Karpathy discipline + agent-era rules)
- SCRUTINY GATE (3-of-3 PASS required before Stop)
- Per-chat handoff: `per-agent-handoff.mjs write/read`
- Commit format: `[SCOPE]/U-ID: title`
- No-stub rule + comprehensive-build-enforce hook
- Units-first safety rail (N/A for business domain — no machining physics)
- Token economy: RTK prefix, Ollama offload ladder
- Multi-chat lane discipline + slot-worktree commit routing
- NEVER inline constants (business: payroll-tax/PTO/Cpk-floors → import from canonical files)
```

**Domain-specific rules that must live HERE (not in universal core):**
- Financial invariants (debits=credits, AR aging, payroll period idempotency)
- PII gates (customer-consents.json, hotel-pii-redaction-guard.mjs)
- ERP vendor adapter pattern (7-vendor, 4-artifact requirement)
- JM Die back-office geography (VBA spreadsheet + DocuStrata as ground truth)
- HotelERPTribalKnowledgeEngine UNWIRED warning
- Cpk-floor role gates (1.0/1.33/1.67 — never inline these in sibling engines)
- Business-specific gotchas §5 (all 8 — commit-archaeology-grounded)
