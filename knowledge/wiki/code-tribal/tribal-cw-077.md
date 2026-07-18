---
name: tribal-cw-077
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "wire-edm", "threading", "sequence", "multi-cavity"]
confidence: 88
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-077.md
promoted_at: 2026-06-09T22:31:16.004Z
---

# Wire Threading Strategy — Automatic Re-Threading for Multi-Opening Parts

For parts with multiple openings (die plates with 10+ cavities), optimize the wire threading sequence to minimize total wire threading events. CAMWorks can sequence openings to thread once per opening rather than re-threading between skim passes. Program rough cuts on all openings first, then skim all openings — the wire only threads N times (once per opening) instead of N × passes. This saves significant unattended run time on multi-cavity die plates.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[camworks-cam-tips-cw-066|Threading — Multiple Passes with Decreasing Depth for Clean Threads]]
- [[camworks-cam-tips-cw-073|2-Axis Wire EDM — Profile Cutting with Automatic Feature Detection]]
- [[camworks-cam-tips-cw-074|4-Axis Wire EDM Taper — Independent Upper and Lower Profiles]]
- [[camworks-cam-tips-cw-075|Skim Cuts — Multi-Pass Wire EDM for Surface Finish and Accuracy]]
