---
name: feedback_hotel_financial_invariant_gate
description: Validate debits=credits + trial balance BEFORE any GL post; refuse on imbalance
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.429Z
aliases: feedback_hotel_financial_invariant_gate
---


Before ANY GeneralLedgerEngine post, validate sum(debits)==sum(credits) AND the trial balance stays balanced; refuse the write on imbalance and surface the delta.

**Why:** an imbalanced or clobbered GL corrupts the ledger silently — the #1 ERP correctness failure. Numbers must reconcile both ways (transaction->GL and GL->source). Hotel soul refuse #1.

**How to apply:** gate gl_trial_balance before gl_journal_entry; never edit a posted entry in place (reversing journal-entry trail only); report dollars to the cent. Links: [[feedback_hotel_per_category_cost_variance]] [[reference_hotel_dispatcher_bucket_map_2026_05_28]]
