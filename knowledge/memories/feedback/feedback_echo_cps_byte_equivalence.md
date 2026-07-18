---
name: feedback_echo_cps_byte_equivalence
description: Prove byte-equivalence vs the golden NC archive before shipping any post change (slot echo standing rule)
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.423Z
aliases: feedback_echo_cps_byte_equivalence
---


**Rule:** never ship a post-processor change without proving byte-equivalence (or an intentional, reviewed diff) against the golden NC archive — `MasterPostByteEquivalenceCI` (REVENUE-v7.6/U-PILOT-02).

**Why:** the copy-drift class — hand-copying a post block instead of re-emitting silently drifts from the proven golden output; a one-character dialect drift can crash a machine or scrap a part. F5 in the capability assessment names copy-drift as a top-5 finding. **How to apply:** re-emit through the engine, diff against the golden `.nc`, and treat any unexplained delta as a regression. For pure-doc commits that lint-staged may drop, use `--no-verify` ([[reference_lintstaged_noop_config_eats_commits]]). See [[feedback_echo_masterpost_pipeline_route]].
