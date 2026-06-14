---
name: reference_post_ship_psn-extraction-u-extract-kmedoids
description: Auto-distilled learnings from shipping PSN-EXTRACTION/U-EXTRACT-KMEDOIDS (commit 640d6e2f9). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.686Z
aliases: reference_post_ship_psn-extraction-u-extract-kmedoids
---


# PSN-EXTRACTION/U-EXTRACT-KMEDOIDS

[MAIN] [PSN-EXTRACTION]/U-EXTRACT-KMEDOIDS (slot:golf iter18): Partitioning Around Medoids (PAM) clustering extracted from PRISM_CLUSTERING_ENHANCED.js. Sibling to U-EXTRACT-DBSCAN; completes the clustering family (DBSCAN density-based + K-Medoids partition-based). More outlier-robust than k-means (medoids are real points). 14/14 vitest PASS: well-separated clusters, k=1 reduces to best-medoid, k=n→cost=0, outlier-robustness, 3-D support, seeded-RNG determinism, all 6 fail-loud branches. Reference: Kaufman & Rousseeuw 1990.

**Shipped:** 2026-05-24T15:02:50-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[psn-extraction-u-extract-kmedoids]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._