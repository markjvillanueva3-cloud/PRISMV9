---
name: feedback_sierra_graph_correctness_is_fleet_search
description: A sierra system-graph mistake is a fleet-wide search outage — the graph is the substrate every slot's master-index/awareness/pre-*-graph hooks query.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.444Z
aliases: feedback_sierra_graph_correctness_is_fleet_search
---


**Standing rule (sierra):** the system-graph is not just a visualization — it is the SEARCH SUBSTRATE the whole fleet reads. `master-index-precheck-inject`, `awareness-snapshot-inject`, `pre-bash/grep/read/write-graph-inject`, and `audit-viz-first` all query `system-graph.json`. So a corrupted/stale/clobbered graph silently degrades search + awareness for ALL 26 slots (often to BM25-only or empty), not just sierra.

**Why:** the blast radius of a sierra graph mistake is fleet-wide and silent — degraded search rarely errors, it just returns worse hits, so nobody notices for hours.

**How to apply:** treat every graph write as fleet-critical. After any regen, VERIFY schemaVersion + node count + fsCoverage (`.last-successful-regen.json` + a `system-viz-query` smoke test) before trusting downstream. Never run a generator standalone without confirming the merged graph is intact. R12 fail-loud on any regen anomaly. See [[reference_sierra_one_writer_per_path]] · [[reference_sierra_viz_first_search]] · [[feedback_system_viz_first_audit]].
