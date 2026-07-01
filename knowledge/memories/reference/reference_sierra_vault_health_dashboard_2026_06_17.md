---
name: reference_sierra_vault_health_dashboard_2026_06_17
description: "Sierra built the unified vault-health dashboard (commit 1ee416f4b7, 2026-06-17, branch cad-fusion-live-ms0) -- the CAPSTONE of the 5-unit SIERRA-VAULT-OPS arc. scripts/vault-health.mjs aggregates the 4 advisory detector reports (vault-rot, supersession, contradiction, ambiguous-links) into ONE operator rollup: overall OK/STALE/WARN + per-source headline/severity/freshness + regen commands. Pure aggregateHealth() core, READ-ONLY (writes only state/shared/vault-health.json), reuses persisted reports (R8, never re-runs a detector). 14 mutation-proof tests. KEY LESSON: a health AGGREGATOR is also a META-DETECTOR -- on first live run it CAUGHT 2 real R12 false-state bugs in its own SOURCES: (1) supersession --mark never rewrote its report -> stale pre-apply count read as false WARN (fixed: --mark now re-scans+rewrites post-apply); (2) vault-link-doctor --ambiguous wrote generatedAt as the dash-mangled filename stamp -> Date.parse NaN -> 'age ?' (fixed: raw ISO). Scrutiny reviewer FAIL was REAL (not hallucinated): a no-NLI-model/0-pairs-checked contradiction report read OK(green) though NOTHING was scanned -> added needsScan state (unscanned never ok -> overall STALE). 5 units shipped this session."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.201Z
aliases: reference_sierra_vault_health_dashboard_2026_06_17
---


# Sierra: unified vault-health dashboard (capstone, 2026-06-17)

Operator: "keep pushing." The CAPSTONE of the 5-unit SIERRA-VAULT-OPS arc -- a 2nd-brain
needs ONE health surface, not five scattered detector reports.

## Built: scripts/vault-health.mjs (commit 1ee416f4b7)
Aggregates the 4 vault advisory detector reports into one rollup: per-source headline
(value+severity+freshness) + overall OK/STALE/WARN + regen commands for anything actionable.
Pure `aggregateHealth(reportsByKey, {nowMs, staleDays})` core (injected -> hermetic, 14 tests).
READ-ONLY: reuses each detector's persisted JSON (R8 -- never re-runs a detector, no Ollama/scan),
writes only state/shared/vault-health.json. SOURCES = rot/supersession/contradiction/ambiguous,
each with a headline extractor cross-checked against the producing detector's report-write code.
In-domain: sierra owns dashboards/utilization.

## KEY LESSON: a health aggregator is a META-DETECTOR (who watches the watchers)
On the FIRST live run the dashboard CAUGHT 2 real R12 false-state bugs IN ITS OWN SOURCES --
the act of aggregating exposed staleness the individual tools couldn't see themselves:
1. `vault-supersession-detector --mark` returned WITHOUT rewriting its report -> after an apply,
   the persisted report kept the PRE-apply candidate count (e.g. 128) while the vault was actually
   converged (0). The dashboard showed a fresh-looking FALSE WARN. age-staleness can't catch
   CONTENT-staleness. FIX (root): --mark now re-scans + rewrites the report post-apply.
2. `vault-link-doctor --ambiguous` stored `generatedAt: <dash-mangled filename stamp>`
   (2026-..T20-30-..) -> Date.parse=NaN -> dashboard 'age ?'. FIX: store raw ISO.
=> doctrine: when you build an aggregator over N reports, it will surface report-freshness +
   schema bugs in the N producers. Treat those as first-class findings (R16 close them).

## Scrutiny: reviewer FAIL was REAL (verify before discarding)
Unlike 2 earlier Arm-B hallucinations this session, THIS reviewer FAIL was correct + verified:
a no-NLI-model run (Ollama down) or aborted run leaves contradictions:0 over 0 checked pairs;
my headline mapped 0->ok(green) -> the dashboard would show OK when NOTHING was scanned (the
worst health-dashboard failure: a green that "didn't look"). FIX: `needsScan` state -- model==null
OR (pairsTotal>0 && pairsChecked==0) -> severity info + needsScan -> overall STALE, never ok.
+3 tests. Also clamped --stale-days both CLI+env; regen/confirm surfaces on WARN rows too.
LESSON: a reviewer FAIL must be VERIFIED against the code, then honored if real (R12) -- do not
reflexively discard (the prior hallucinations don't license dismissing a true finding).

## Session arc: 5 units (operator "1 by 1 by highest roi" -> "keep pushing")
#1 SUPERSEDE-DETECT b397e08da3 -> #2 SUPERSEDE-MARK bf3a7c3c58 (128+ recall-excluded) ->
#3 CONTRADICT-MEMORY 6358abaad4 -> #4 AMBIGUOUS-REVIEW f5b6399112 -> #5 VAULT-HEALTH 1ee416f4b7.
Dropped a dedup-reconciler on a false premise (alias-collisions != file-dups). Siblings:
[[reference_sierra_vault_supersession_detector_2026_06_17]] [[reference_sierra_memory_contradiction_lint_2026_06_17]] [[reference_sierra_vault_link_heal_2026_06_17]].
