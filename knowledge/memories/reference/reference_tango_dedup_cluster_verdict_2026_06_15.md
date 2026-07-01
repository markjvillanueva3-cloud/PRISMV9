---
name: reference_tango_dedup_cluster_verdict_2026_06_15
description: tango verify-on-disk verdict on the assess scanner's Category-A "true dup" clusters — ALL both-consumed (owner-merge, NOT free tango quarantine). Fan-in already computed by generate-engine-import-edges; do not rebuild. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.218Z
aliases: reference_tango_dedup_cluster_verdict_2026_06_15
---


**TANGO DEDUP-CLUSTER VERDICT (slot tango, 2026-06-15)** — autonomous loop iteration under "pick next highest-ROI in-lane build." Outcome: NO new build (dedup-disciplined); the deliverable is a verified verdict + R12 correction of my own report.

**Verify-on-disk REFUTED the assess scanner's "Category A: true dups (consolidate)" framing.** The name-cluster heuristic (`assess-engine-algo-improvements.mjs` `dupCluster`) flags same-stem pairs but has NO consumer info, so it cannot tell a free dup from a both-used pair. Real-consumer-file counts (excl self/test/dispatcher/index):
- `BatchCAMStrategyEngines` 53KB/2 + `BatchCAMStrategyEngines2` 32KB/**1** — `2` is NOT a free leftover (CAM/kilo merge).
- `JMDieLatheProgramUpgraderEngine` 10KB/4 + `…V2Engine` 14KB/**2** — both used (lathe/whiskey merge).
- `HyperMillMetricCfgExtractor` 10KB/2 + `…Engine` 19KB/2 — both used (hyperMILL/kilo-echo merge).
- `ClusteringEngine` algorithms/ vs engines/ = TWO DIFFERENT IMPLS (K-means iface 0-import vs KMedoids/MeanShift 1-import) — NOT a dup (verified prior session).

**Verdict: NONE is a tango free-quarantine.** Each needs the OWNER to repoint consumers + merge logic. Surfaced to owners (report `TANGO-ENGINE-ALGO-ASSESSMENT-2026-06-15.md` §A, corrected). 5th over-eager action verify-on-disk blocked this session (after ClusteringEngine, "36 safety bugs", the Category-A consolidation, and the hub-rank dup).

**DEDUP NOTE (prevent future rebuild):** engine import fan-in is ALREADY computed by `scripts/generate-engine-import-edges.mjs` (`stats.perTargetTopRefs` + `engine-import-edges-augmentation.json`, sierra-owned viz artifact). Do NOT build a parallel fan-in extractor for the assess scanner's dupCluster annotation — reuse that artifact or do the per-pair grep verify on demand. **Lesson: the new-audit-tool space is SATURATED (30+ `audit-*` scripts + system-viz blast-radius + import-edges); a discovery specialist's value at this maturity is verify-on-disk + correct-overclaims + route-to-owners, NOT manufacturing more scanners.** Sister: [[reference_tango_engine_algo_assessment_2026_06_15]], [[reference_tango_inline_const_classify_2026_06_15]], [[reference_tango_test_quality_audit_2026_06_15]].
