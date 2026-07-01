# Quote Deep Audit — Agent 8: Quote→Job→Invoice→GL Lifecycle

## Chain Stage Coverage (matrix)

| Stage | Endpoint | Engine | DB Table | Status |
|-------|----------|--------|----------|--------|
| **Quote Creation** | `quote_estimate` | QuoteEstimatorEngine | `quotes` | ✓ IMPLEMENTED |
| **Quote Revision** | `quote_revise` | QuoteRevisionEngine | `quote_revisions` | ✓ IMPLEMENTED |
| **Quote→Job** | `job_create` | JobLifecycleEngine | `jobs` | ✓ IMPLEMENTED |
| **Job Status Updates** | `job_update_status` | JobLifecycleEngine | `job_time_entries` | ✓ IMPLEMENTED |
| **Job Completion** | `job_update_status` → "complete" | JobLifecycleEngine | `jobs` | ✓ IMPLEMENTED |
| **Invoice Generation** | `invoice_from_job` | InvoicingEngine | `invoices` | ✓ IMPLEMENTED |
| **Invoice Line Items** | `invoice_create` | InvoicingEngine | `invoice_line_items` | ✓ IMPLEMENTED |
| **GL Journal Entry** | `gl_record_invoice` | GeneralLedgerEngine | `gl_journal_entries` | ✓ IMPLEMENTED |
| **GL Posting** | `gl_journal_entries` balance enforcement | GeneralLedgerEngine | `gl_journal_lines` | ✓ IMPLEMENTED |
| **A/R Aging Report** | `invoice_aging` | InvoicingEngine | computed from `invoices` | ✓ IMPLEMENTED |

## DB Tables Exist

✓ All tables present in migrations/001-erp-persistence.sql:
- `quotes` (with revisions via 003-quote-revisions.sql)
- `jobs` (via JobLifecycleEngine, persisted)
- `invoices`, `invoice_line_items`
- `gl_journal_entries`, `gl_journal_lines`, `gl_accounts`
- `work_orders`, `job_time_entries`, `customers`

**Note**: No `mill_*` prefixed tables. PRISM uses standard table names: `quotes`, `jobs`, `invoices`.

## Volatile vs Persistent

| Component | Storage | Persistence |
|-----------|---------|-------------|
| Quotes | PostgreSQL + PersistenceBridge | Durable (schema_migrations track versions) |
| Jobs | In-memory Map + atomic JSON checkpoint | Volatile (checkpoint per stage only) |
| Invoices | PostgreSQL | Durable |
| GL Entries | PostgreSQL (double-entry enforced) | Durable with CONSTRAINT chk_gl_balanced |
| Time Entries | PostgreSQL | Durable |

**Risk**: JobLifecycleEngine uses in-memory Map (lines 29, 91 in engine). Production recovery requires checkpoint load.

## Quote-to-Ship Pipeline Integration

✓ **26-stage pipeline exists** (`QuoteToShipOrchestratorEngine.ts`):
- Stage 5: QUOTE (QuoteEstimatorEngine)
- Stage 23: JOB_LIFECYCLE (JobLifecycleEngine)
- Stage 25: OMEGA_GATE (quality/release gate)
- Stage 26: SHIPPING (PackingSlipEngine)

**Gap**: No explicit "POST_TO_GL" stage between SHIPPING and pipeline end. GL posting is manual action via `gl_record_invoice` dispatcher action, not orchestrated as part of quote-to-ship.

## Score: 72/100

**Strengths** (+20):
- Full dispatcher wiring: `quote_estimate` → `job_create` → `invoice_from_job` → `gl_record_invoice`
- Database schema complete with GL double-entry enforcement
- Quote revisions + status history audit trail
- A/R aging report functional

**Gaps** (−28):
- **No automated GL posting** in pipeline (manual via dispatcher)
- **JobLifecycleEngine uses volatile Map** (no persistence layer)
- **No GL→AR integration test** (gl_journal_entries→AR aging, not verified)
- **No end-to-end test** covering quote→invoice→GL→aging (only unit tests)
- **No job-to-GL routing** documented (which GL account for which job type?)

**To Fix** (→90+):
1. Add `POST_TO_GL` stage to QuoteToShipOrchestratorEngine
2. Implement GeneralLedgerEngine.postJobCompletion() to auto-trigger on job completion
3. Migrate JobLifecycleEngine state to PostgreSQL (currently ephemeral)
4. Add integration test: `quote → job → job.complete() → GL entry created → invoice aging reflects it`
5. Document job-type→GL-account mapping (lathe→5100, mill→5000, EDM→5500, etc.)
