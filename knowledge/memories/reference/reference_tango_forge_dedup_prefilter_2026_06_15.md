---
name: reference_tango_forge_dedup_prefilter_2026_06_15
description: tango built a producer-side dedup pre-filter for the forge queue (extraction-forge-detect.mjs over-fired -- queued already-built concepts, 22/22 false positives). conceptAlreadyBuilt high-precision filename-bigram match. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.219Z
aliases: reference_tango_forge_dedup_prefilter_2026_06_15
---


**TANGO FORGE-QUEUE DEDUP PRE-FILTER (slot tango, 2026-06-15, commits `44c314c404` build + `44f411fa16`/`4ca9e2521a` drains)** — autonomous cron-loop iteration. The forge-queue hook surfaced "drain 3" candidates; dedup-checking them is tango's exact core competency.

**ROOT-CAUSE FINDING:** `scripts/extraction-forge-detect.mjs` (bravo's EXTRACTION-FORGE-MS0) scores youtube-extraction concepts for forge-worthiness but did ZERO check against what PRISM already has — it deferred ALL dedup to `/forge-triple`'s DuplicationGuard at DRAIN time. Result: the queue fills with already-built concepts. **Verify-on-disk: 22/22 pending candidates were dups or cross-lane** (Radial Chip Thinning -> ChipThinningCompensationEngine; SOLIDWORKS/NX/Fusion Topology Optimization -> FixtureTopologyOptimizerEngine SIMP; moment-of-inertia -> RigidBodyDynamics; G76/CSS/tool-wear/B-Rep/collision all built; SprutCAM/Haas/Mastercam/ESPRIT/Powermill = cross-lane CAM-vendor tutorials covered by the 6 tier-1 bridges).

**BUILT the missing guard AT THE SOURCE** (tango's mandate = the guard layer before any create): pure lib `scripts/lib/forge-dedup-prefilter.mjs` — `conceptAlreadyBuilt(conceptName, engineNames)` flags built ONLY when a significant stemmed-token BIGRAM is a substring of an engine/algorithm FILENAME (`stem` strips -ing/-tion/-ation/etc; `significantStems` drops STOPWORDS incl vendor names). **HIGH-PRECISION + CONSERVATIVE by design**: ambiguous concepts still queue (DuplicationGuard stays the real gate) so a genuine new capability is NEVER silently dropped (low false-negative). 10/10 node:test (the real 22-batch as fixtures + a novel-concept negative guard). Wired into the producer (filename-only engine list = stays "light by design"); every prefiltered concept LOGGED by name (R12). **Live --dry-run over 4388 entries: 41 already-built caught at source, all high-precision; novel concepts pass.** Drained the 25 existing queue entries via forge-queue-done.txt.

**LESSON (generalizable):** a worthiness classifier WITHOUT a dedup pre-filter fills its queue with already-built concepts — the dedup guard belongs at the PRODUCER (source), not only at the consumer/drain. This is the forge-queue instance of tango's standing role: surface what PRISM already has BEFORE anything gets created. Pairs with [[feedback_tango_dedup_audit_tooling]] (tango holds itself to the same dedup discipline). Sister: [[reference_tango_dedup_cluster_verdict_2026_06_15]], [[reference_extraction_forge_ms0_2026_06_12]].
