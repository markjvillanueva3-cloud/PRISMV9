---
name: quoting_synthesis
description: "[auto-synth · verify] Compounding synthesis of the quoting domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: quoting
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-26T02:43:33.198Z
  sourceHash: e6313e4b1d8a
  advisoryOnly: true
  mustHumanVerify: true
---

# quoting — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **End‑to‑end document pipeline**: All JM orders are run through a unified doc‑pipeline to produce settled‑price ground truth (6,718 actuals = $355 M) and to feed the quoting model.  
  - *[reference/reference_charlie_orders_closed_355m_2026_06_12]*, *[reference/reference_post_ship_quoting-synergy-ms0-u-qp-docustrata-run-all]*  

- **Closed‑loop training & validation**: The quoting GNN is repeatedly trained on the full real corpus (47 905 records) and validated against the $355 M actuals; observed outbound 194× ratio is treated as a cross‑granularity artifact, not a bug.  
  - *[reference/reference_charlie_closedloop_full_corpus_validated_2026_06_13]*  

- **Bootstrapping real defaults**: After iteration 45 the model adopts defaults derived from live data; historic scans are archived for reproducibility.  
  - *[reference/reference_post_ship_quoting-synergy-ms0-u-qp-bootstrap-real-defaults]*, *[reference/reference_post_ship_quoting-synergy-ms0-u-qp-bootstrap-scan-archive]*  

- **Telemetry & verification loop**: Outcome telemetry is collected, and closed‑loop tests are run to verify model behavior before production release.  
  - *[reference/reference_post_ship_quoting-synergy-ms0-u-qp-closed-loop-outcome-telemetry]*, *[reference/reference_post_ship_quoting-synergy-ms0-u-qp-closed-loop-test-verified]*  

- **Cost‑bridge wiring truth**: A GNN‑derived reference pool (123 confirmed wiring labels) supplies “truth” for cost‑bridge calculations, linking quoting outputs to actual manufacturing costs.  
  - *[reference/reference_gnn_refpool_123_groundtruth_ready_2026_06_13]*, *[reference/reference_post_ship_quoting-synergy-ms0-u-qp-cost-bridge-wiring-truth]*  

- **Bias detection & CoV gating**: A –36 % under‑quote bias was caught in the first live run; the coefficient‑of‑variation gate automatically rolls back unsafe factors.  
  - *[reference/reference_quoting_closed_loop_jm_corpus_first_live_2026_05_26]*  

- **Format validation & variance monitoring**: A dedicated validator enforces DocuStrata schema; separate “variance docs” track distribution shifts for proactive model updates.  
  - *[reference/reference_post_ship_quoting-synergy-ms0-u-qp-docustrata-format-validator]*, *[reference/reference_post_ship_quoting-synergy-ms0-u-qp-docustrata-variance-docs]*  

- **Scheduled retraining (cron)**: A cron job continuously ingests the latest real corpus to keep the model current.  
  - *[reference/reference_post_ship_quoting-synergy-ms0-u-qp-cron-real-corpus]*  

- **SFC page double‑count fix**: Prevents a 2× inflation of engagement metrics in the closed‑loop UI.  
  - *[reference/reference_post_ship_sfc-page-closed-loop-u-engagement-arc-doubling-fix]*  

- **Should‑cost DFMA anchor**: Material, machining cycle × rate, setup/NRE amortized, finishing/outsource, and margin form the baseline cost model for quoting.  
  - *[reference/reference_quoting_shouldcost_dfma_margin_2026_06_13]*  

## Key decisions & rules
1. **Run the full JM orders‑closed corpus through the doc‑pipeline** before any model iteration to guarantee a single source of truth for settled prices.  
2. **Treat the 194× outbound ratio as an artifact**, not a defect, unless future diagnostics prove otherwise.  
3. **Adopt real‑data defaults only after iteration 45**, ensuring sufficient live exposure; archive each bootstrap scan for auditability.  
4. **Require telemetry collection and closed‑loop test verification** before promoting any model change to production.  
5. **Integrate the GNN wiring reference pool (≥123 confirmed labels, confidence ≥0.85)** as the authoritative source for cost‑bridge truth.  
6. **Activate CoV gating** whenever a bias > 30 % is detected; automatically revert the offending factor(s).  
7. **Enforce DocuStrata format validation** on every ingest; reject non‑conforming documents.  
8. **Monitor variance docs continuously**; trigger model retraining if drift exceeds predefined thresholds.  
9. **Schedule nightly cron runs** to refresh training data from the real corpus.  
10. **Apply the SFC page double‑count fix** in all UI dashboards to maintain accurate engagement metrics.  
11. **Base quoting cost estimates on the should‑cost DFMA components**, using the defined material, cycle, setup/NRE amortization, finishing/outsource, and margin calculations.

## Open threads
- **Scaling wiring truth**: How to propagate the GNN‑derived wiring labels from the 123‑sample pool into the full quoting pipeline across all galaxies?  
- **Outbound ratio investigation**: Further analysis needed to confirm that the 194× outbound factor remains benign in other production contexts.  
- **Fleet‑wide readiness gaps**: The assessment shows over‑built generation in several producer galaxies; remediation plans are pending.  
- **Variance‑driven model updates**: Define concrete thresholds and automated actions for variance‑doc alerts.  
- **Cost‑bridge impact quantification**: Empirical study required to measure quoting accuracy gains after integrating the cost‑bridge wiring truth.  
- **Bias monitoring post‑CoV gate**: Ongoing validation needed to ensure the –36 % under‑quote bias does not re‑emerge after future model changes.
