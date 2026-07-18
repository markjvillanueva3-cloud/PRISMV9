# Charlie Task Compilation — past-month sessions + current backlog (2026-06-12)

> Operator /goal (slot charlie): *"use ollama to read and summarize all charlie sessions from the past month, compile a list of tasks and combine with current tasks ... complete all tasks associated with charlie and quoting systems and training to improve the system using our ai systems and closed loop learning systems and all jm die documents."*
>
> Method: enumerated **ALL 161 charlie handoff files** from the past 31 days (449 KB; ~68 distinct sessions + mirror/archive copies) per the [[feedback_all_means_all]] rule shipped this session. Extracted 496 unique actionable lines → Ollama-digested (gpt-oss:120b, ~35K tok offloaded locally) → deterministic unit-ID extraction → cross-referenced against **296 charlie/quoting commits** in git (last 30d) to subtract shipped work. Combined with the live ROI-ranked backlog `mcp-server/src/engines/quoting/OPEN-THREADS.md` (last full re-mine 2026-06-11).

## Past-month shipped (high level)
296 charlie/quoting commits in 30 days. Dominant arcs:
- **AI-SYNERGY (U-AISYN-*)** — galaxy AI-reasoning bridge, GNN node-features/retrain-heap fixes, LoRA emit, RAG, soul-enrich (≈30 units).
- **QUOTING-SYNERGY-MS0 (U-QP-*)** — closed-loop OODA telemetry/digest, outbound floor-spike guard, actual-outcome loader + provenance gate, cost-basis normalize/wire ($/in3 per grade from $10M AP ledger), adaptive Bayesian shop-rate persistence (G5, the last commit `ba9631271f`).
- **COST-CASCADE / CAD-INFRA / cron-pipeline** — cost alarm+dashboard, cascade calibrate, regression report gen, Stage0 corpus rewire.
- This session: **U-AMA01** — `all-means-all` totality rule (hook + 4-surface doctrine).

## Closed-loop training status (operator's "training + jm documents" leg)
Per OPEN-THREADS §CLOSED-LOOP TEST (verified live 2026-06-12): the whole loop ran on **every present JM source** — pipeline-verify 434/434 PASS, train-cycle on 47,905-record real corpus, OODA on 10 real DocuStrata pairs → correctly ROLLED_BACK (CoV-unsafe, calibration refused). **FUNCTIONALLY COMPLETE + conservative.** Real-world accuracy is **data-ceiling-bound**: real (quoted,actual) pairs capped at 10 curated DocuStrata rows. The scale lever is **xray-OCR extraction of JM sold-orders** (a blueprint-vision/xray galaxy dependency, not a charlie code gap).

## Combined actionable backlog (ROI order, R12-corrected — UNBLOCKED first)
| # | Unit | Size | Status / note |
|---|------|------|---------------|
| 1 | **U-QP-COST-BASIS-CONSUME-FMV** | M | On-goal lever: feed `material_cost = $/in3 * part_volume_in3` into FMV. Needs per-part VOLUME (CAD/geometry). Build additive + validate on known volumes; READY when geometry flows. |
| 2 | **T9** per-query telemetry counter | S | Unblocked, low-risk. |
| 3 | **T13** cross-galaxy orphans + TSC drift | M | LatheActualCostReconciliation + QuoteToOrderBridge open edges. |
| 4 | **T7** absorb 5 dormant quoting features | M | U-QP-COST-DB-INGEST + 4 siblings (iter 0/5). |
| 5 | **U-QP-OUTCOME-DIGEST UI panel** | S | Render the closed-loop digest in `QuotingCalibrationHealthPage` (charlie owns frontend). |
| 6 | **T8** provenance_check P2 scrutiny | XS | SAFETY-GATE touch — do on fresh context, never soften the gate. |
| 7 | **D7** QuotingBaselineFallbackEngine consumer wire | S | 0 confirmed downstream consumers. |
| 8 | **T10/T11** registry-bridge / deep-wire-algo impl | L | spec-only today (`5bea59a19c` / `5d3b507833`). |

## BLOCKED — operator credentials (cannot complete autonomously)
- **T12 / T17 = U-QP-ACCOUNTING-WIRE** — `AccountingHardeningEngine`/ERP + `E2ShopConnectorEngine` live QuickBooks/E2 creds. **Code shape is clear and the loader shell + provenance action are SHIPPED**; only live credential activation remains. Resolve T12+T17 together (same blocker). → operator action required.
- **S3 = U-QP-CRON-REAL-CORPUS** — needs operator to re-run the elevated Windows scheduled-task installer (`scripts/install-quoting-pipeline-cron.ps1`).

## Source of truth
The live, auto-maintained backlog is `mcp-server/src/engines/quoting/OPEN-THREADS.md` (Bibryam-cascade auto-loaded when editing `engines/quoting/`). This compilation is a point-in-time snapshot; OPEN-THREADS wins on conflict.
