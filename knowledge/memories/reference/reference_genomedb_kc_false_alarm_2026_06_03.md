---
name: reference_genomedb_kc_false_alarm_2026_06_03
description: "GenomeDB 8-material kc1_1 values are material-specific (NOT ISO-group drift) — scorecard \"304 2200 vs 2100\" is a false alarm; do NOT \"fix\""
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.127Z
aliases: reference_genomedb_kc_false_alarm_2026_06_03
---


GenomeDB (`data/databases/GenomeDB.json`) 8-material `machinability.kc1_1` values, verified 2026-06-03 (slot:juliett, DB-COVERAGE epic):

| genome | material | kc1_1 | note |
|---|---|---|---|
| GEN-001 | 4140 (steel) | 1800 | P-group default 1800 ✓ |
| GEN-002 | 304 Stainless | **2200** | M-specific (group default 2100) — defensible |
| (alu) | 7075/6061 | 700 / 600 | N-group default 700 ✓ |
| (Ti) | Ti-6Al-4V | **1700** | S-**specific** (group default 2800) — KNOWN low-kc Ti value |
| GEN-005 | Inconel 718 | 2800 | S-group 2800 ✓ |
| (CI) | FC250 cast iron | 1200 | K-specific (group default 1100) — defensible |
| (PH) | 17-4PH | 2500 | M/S-specific — defensible |

**Finding: this is the SAME false-alarm class as ProcessDataDB.** The db-coverage scorecard ranked "GenomeDB 304SS 2200 vs canonical 2100" as a drift gap. It is NOT — it is the category error of comparing a **material-specific** kc1.1 against the **ISO-group-default** kc1.1 in `constants.ts CANONICAL_KIENZLE` (P1800/M2100/K1100/N700/S2800/H3200). Material-specific kc legitimately differs from the group default; `constants.ts` itself carries material-specific overrides (e.g. line ~944 "1018"→1700).

**DO NOT "fix" GenomeDB kc to group defaults.** "Correcting" Ti64 1700→2800 would inject a ~65% cutting-force error. Same rule as [[reference_juliett_db_coverage_consolidation_insight_2026_06_03]] (the keystone: epic = CONSOLIDATION, not creation; verify every scorecard "gap" before acting — 5-for-5 false alarms so far).

GenomeDB's REAL gap is **coverage** (only 8 materials genome-encoded), not kc correctness. Expanding it = a careful cited-data build (material genome rows derived from constants.ts material table + published Kienzle), NOT a kc overwrite. **Why:** the scorecard is advisory; its kc "drift" column conflates two legitimately-different quantities. **How to apply:** when any DB scorecard flags a kc/physics "drift," first classify material-specific vs group-default before touching the value.
