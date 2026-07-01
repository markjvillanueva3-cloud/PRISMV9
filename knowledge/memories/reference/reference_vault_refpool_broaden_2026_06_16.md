---
name: reference_vault_refpool_broaden_2026_06_16
description: Broadened vault-to-gnn-refpool extraction 10->16 confirmed wirings (the only non-refuted GNN pool-growth lever) + 2 false-label fixes; slot:india 2026-06-16
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.250Z
aliases: reference_vault_refpool_broaden_2026_06_16
---

**U-VAULT-REFPOOL-BROADEN** (slot:india, commit `07506609fa` on cad-fusion-live-ms0, 2026-06-16) — a CODE-SIDE ($0 GPU, $0 MCP) growth of the NN/GNN reference pool, the ONLY non-refuted lever for the india-owned PSN leg #10 (high-conf reference band collapsed 62->13). Sibling of [[reference_gnn_refpool_vault_grow_2026_06_10]] (tango's +8) and [[reference_post_ship_cad-closed-loop-ms0-u-ghost-outcome-refpool]] (the outcome-sourced twin).

**What:** `scripts/vault-to-gnn-refpool.mjs::extractConfirmedWirings` mines CONFIRMED engine->dispatcher wirings from the Obsidian vault (`knowledge/memories/{reference,feedback}`) into high-conf (0.85) `ghost.vault-wired.<Engine>` reference nodes. The old `<Engine>[^.\n]{0,40}?wired...prism_X`, `[A-Z]`-anchored regex caught only **10 of 51** vault confirmed-wiring assertions.

**Fix:** anchor on the wiring assertion (`wired/bound/registered` + `prism_X`) and walk back to the NEAREST preceding `...Engine` in the same sentence. Strictly safer than a blindly-wider gap — each assertion pairs with its OWN nearest subject, never a cross-pair. **Live result: 10 -> 16 (+6, +60%), 0 conflicts, all 16 manually validated correct.**

**Two false-label guards (R12 — a wrong label poisons the GNN worse than no label; per-file 2-arm scrutiny caught both, arm-A FAILed then both PASS):**
1. **Clause cross-pair** — bound the walk-back at `;` when the verb's clause has its own non-whitespace subject (`"ZooEngine shipped; the actions wired in prism_X"` no longer mis-labels ZooEngine); a whitespace-only `"; wired"` stays crossable.
2. **Parenthetical helper** — mask `(...)` spans UNLESS the content is a bare-engine appositive (`(`PayrollLiabilityFilingEngine`)` kept; `(which calls HelperEngine)` masked). Unconditional masking dropped the real PayrollLiability label — the appositive carve is the right trade-off. Nested bare-engine parens (depth>0) are masked too.

**KNOWN LIMITATION (R12):** a bare-engine appositive whose lead noun is itself an engine (`ActualEngine (AliasEngine) wired ...`) is genuinely ambiguous — backstopped by the conflict-record + manual-validation pass, not the heuristic.

**Tests:** 20 (was 9), all R9-meaningful (fail on revert). Zero blast-radius — consumers (`ghost-wire-outcomes-to-refpool.mjs`, `gnn-active-pool-select.mjs`) import only the pure heap helpers.

**FOLLOW-UP SHIPPED — U-VAULT-REFPOOL-IDEMPOTENT** (`e804997662`): the durability PREREQUISITE. `--apply` used to re-stamp `proposed_at` + always write the 542MB graph → a periodic/post-regen re-apply would churn the retrain drift fingerprint (spurious GPU retrains). Extracted pure `mergeVaultGhosts`/`nodeContentEqual` (proposed_at-insensitive); `--apply` SKIPS the write when `!changed`. Now any re-apply trigger is safe (no-op when current). 28 tests, 2-arm scrutiny PASS.

**DURABILITY SHIPPED — U-VAULT-REFPOOL-DURABLE** (`6d962b37d3`): added a **pre-fingerprint stage 1a to `nn-graph-retrain-lifecycle.mjs`** (the `PRISM Nn Graph Retrain` cron) that runs `vault-to-gnn-refpool --apply` every retrain. PRE-fingerprint placement is the correctness point: `graphFingerprint` is COUNT-based + `--apply` is idempotent → steady-state adds 0 nodes → fingerprint unchanged → NO spurious retrain (a POST-fingerprint placement would trip the next tick's ghost-delta gate). Fail-soft + opt-out `PRISM_NN_RETRAIN_VAULT_REFPOOL_DISABLE` + telemetry; 6 tests (incl. null-status/timeout R12 surfacing, a scrutiny P2 fix), full suite 73/73, 2-arm scrutiny PASS. **SCOPE (R12):** durable for the retrain/eval consumer (the deploy-gate consumer); other graph consumers in the post-regen/pre-tick window still see absent refs — graph-wide durability = a regen-viz-level re-apply (cross-lane sierra unit).

**The vault→GNN lever arc is now COMPLETE: broaden (+60%) → idempotent → durable.**

**NEXT:** R15-clone the idempotency to the sibling `ghost-wire-outcomes-to-refpool.mjs` (still always-replaces/always-writes) via a shared `scripts/lib/refpool-merge.mjs` (build-once, NOT a 2nd fork). Then MIT-OCW materialization, rsLoRA r=32 final. See [[feedback_psn_definition]] leg #10.
