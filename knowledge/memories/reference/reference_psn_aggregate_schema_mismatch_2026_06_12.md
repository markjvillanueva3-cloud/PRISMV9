---
name: reference_psn_aggregate_schema_mismatch_2026_06_12
description: 2026-06-12 slot:alpha CONFIRMED root cause of HIGH-ROI backlog #11 (PSN-savings-aggregate credit-artifact) but DEFERRED the fix -- it is a per-producer savings-semantics judgment (NOT a mechanical field-rename) and crediting the wrong field would CREATE an R12 over-credit. Live hook+lib differ from the slot/alpha worktree (U-PSA02 expanded to 7 sources); fix must target live copies.
type: reference
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:47.124Z
aliases: reference_psn_aggregate_schema_mismatch_2026_06_12
---


# PSN-savings-aggregate schema-mismatch -- confirmed, fix deferred (2026-06-12, slot:alpha)

**Finding #11** (HIGH-ROI-INEFFICIENCY-HUNT-2026-06-02): the PSN savings headline (injected fleet-wide every SessionStart from `state/shared/dashboards/psn-savings-aggregate.json`) under-reports because several substrates show `savedTokens:0` despite real activity, masking ~10k+ savings.

**Root cause CONFIRMED.** `scripts/lib/psn-savings-aggregate.mjs::summarizeJsonl` only credits `savedTokens` for entries shaped `{kind:"hit", est_tokens:N}`. Live aggregate JSON (verified 2026-06-12):
- `rtk-savings-ledger`: 934h / 806m / **467000 saved** OK (emits kind:"hit"+est_tokens)
- `read-auto-limit`: 24h / 1175m / **0 saved** -- entries are `{kind:"already-bounded", limit, offset}` (no est_tokens)
- `pre-tool-savings-multi`: **49 nudges / 0 saved** -- `{tool, nudge:bool, reason}` (nudge-only, no value field)
- `rtk-adoption-measure`: 2872 lines / **0 saved** -- `{kind:"measured", est_tokens:700, observed_tokens:500, classification:"overestimate"}`

**Why DEFERRED (not a mechanical fix -- R12 trap).** The "saving" per substrate is a JUDGMENT, and crediting the wrong field would inflate the metric -- the exact lie #11 complains about, in reverse:
- `rtk-adoption-measure` carries `est_tokens` (700) AND `observed_tokens` (500) with `classification:"overestimate"`. The TRUE saving is `est - observed` (~200), NOT the gross `est_tokens` (700). Crediting est_tokens would over-report ~3.5x.
- `read-auto-limit` `"already-bounded"` = the Read was ALREADY bounded by the caller -> ZERO saving (must NOT credit). Only entries where the hook actually CAUSED bounding are a real save.
- `pre-tool-savings-multi` nudges value parallel-tool round-trip reduction -- hard to express in tokens; may legitimately stay nudge-only.

**Cross-tree caveat (iter-1 lesson repeated).** The slot/alpha worktree copies of BOTH `.claude/hooks/stop-psn-savings-aggregate.mjs` (4 sources) and `scripts/lib/psn-savings-aggregate.mjs` are STALE -- the LIVE copies (H:/prism + C:) were expanded by U-PSA02 to 7 sources (added rtk-adoption-measure, nav). **Read the LIVE copies before fixing**; a fix to the worktree copy would patch dead code + be overwritten on the next U-PSA02 merge. Apply via raw-FS patcher + `[MAIN-FORCE]` (same pattern as [[reference_route_decay_splice_wired_2026_06_12]]), OR coordinate with whoever owns U-PSA02.

**Correct fix shape (for the next pass).** Per-producer adapters in `summarizeJsonl` (or a `byLedger` adapter map): for each substrate, read its REAL producer to learn the true-saving field/formula, then credit deliberately:
- rtk-adoption-measure -> credit `max(0, est_tokens - observed_tokens)` for `classification!=="overestimate"`? (verify producer intent first).
- read-auto-limit -> credit only the hook-caused-bounding kind (NOT "already-bounded"); find the est-saving field.
- pre-tool-savings-multi -> decide nudge-only vs a per-nudge token estimate.
Then add a real test with a fixture line per substrate asserting the exact credited number, and validate against the live ledgers (show before/after savedTokens). **Never inflate -- under-credit beats over-credit for a trust metric.**

Backlog: this is item #11 (MED, alpha, S). Sibling iter-1 shipped #2 -> [[reference_route_decay_splice_wired_2026_06_12]]. Loop: alpha /loop /goal, iter-2 investigation; deferred per loop-drift-discipline (a trust-metric fix must be correct, not fast). [[feedback_autonomous_loop_drift_discipline]] · [[feedback_psn_definition]].
