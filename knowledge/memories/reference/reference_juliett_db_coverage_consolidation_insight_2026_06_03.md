---
name: reference_juliett_db_coverage_consolidation_insight_2026_06_03
description: "PRISM's 30 databases need CONSOLIDATION/wiring of existing scattered data, not new-data creation — scorecard \"gaps\" were 4-for-4 already-existing-elsewhere or false alarms"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.630Z
aliases: reference_juliett_db_coverage_consolidation_insight_2026_06_03
---


The JULIETT-DB-COVERAGE epic (work order: "all 30 databases 100% comprehensive math/sci coverage + wired to all galaxies") is overwhelmingly a **consolidation / synergy / de-dup problem, NOT a data-creation problem.** Verified 2026-06-03 (slot:juliett, session dbccace0) across 4 coverage-scorecard-flagged "gaps" — all 4 were existing-elsewhere or false alarms:

1. **Orphan-shadow pattern** — file-backed DB JSONs (`data/databases/*.json`) are unread snapshots; the domain engine carries the AUTHORITATIVE data INLINE. CoolantDB.json↔CoolantValidationEngine, WorkholdingDB.json↔FRICTION_COEFFICIENTS, ToleranceDB.json↔IT_TABLE, ProcessDataDB.json (0 importers) — all loaded ONLY by `DatabaseRegistry` for `prism_data:database_search` discovery, NEVER by the calc path. Expanding the JSON alone reaches no consumer.
2. **False-alarm "constant divergence"** — the scorecard (workflow wkqszfznv, 31 agents) ranked ProcessDataDB #1: "Ti64 kc1.1 1700 vs canonical 2800 = silently-wrong physics, highest hazard." FALSE: `constants.ts` `CANONICAL_KIENZLE` is per-ISO-GROUP (S=2800, the *Inconel* archetype); Ti-6Al-4V's MATERIAL-SPECIFIC kc1.1 is genuinely ~1400-1800. constants.ts itself carries material-specific kc that diverges from group defaults (1018=1700 vs P=1800). NEVER "fix" a material-specific value to match a group default — would inject a ~65% force error.
3. **Capability-exists-elsewhere** — "WorkholdingDB lacks centrifugal grip-decay F(RPM)" → `LatheChuckJawSetupEngine` ALREADY computes it (ISO 16156 + NIST SP 960-18, wired to mill+turning dispatchers). "ToleranceDB lacks ISO 2768" → `AmbiguityResolutionEngine` ALREADY has `ISO_2768_LINEAR`. Both un-cross-referenced from the canonical DB layer.

**Why:** PRISM has ~3657 engines; manufacturing-science data is SCATTERED + DUPLICATED + drift-prone across them, not missing. Naive "add rows to the DB" duplicates (juliett refuse: "a parallel store when the answer is a migration of the existing one"), and the scorecard's loudest claims don't survive per-value verification (it's advisory — always re-verify before acting).

**How to apply:** Per DB the fix recipe is: (1) grep ALL engines for where the authoritative data already lives — NOT just the named DB; (2) designate ONE canonical source; (3) wire the DB layer to reference it, de-dup the copies; (4) add ONLY the layers that genuinely exist nowhere (cited to a standard); (5) ship a drift-guard test. ALWAYS R8 grep-for-existing + dedup-check before adding any table. Backlog with per-DB cov/priority/wiring: `state/shared/dashboards/db-coverage-scorecard.json` (re-verify each entry before acting). Links: [[feedback_psn_definition]] · [[reference_juliett_jm_die_database_2026_05_29]] · [[feedback_always_capture_lessons]]
