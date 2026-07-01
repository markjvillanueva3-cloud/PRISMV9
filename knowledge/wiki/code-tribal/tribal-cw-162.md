---
name: tribal-cw-162
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "wire-edm", "auto-thread", "recovery", "unattended"]
confidence: 88
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-162.md
promoted_at: 2026-06-09T22:31:16.021Z
---

# Wire EDM Auto-Threading and Recovery — Unattended Operation

Modern Wire EDM machines support automatic wire threading after breaks. In CAMWorks, enable 'Auto-Thread Recovery' to program the machine to: (1) detect wire break, (2) retract wire, (3) re-thread through the start hole or the kerf, (4) back up along the toolpath to the break point, (5) overlap 2-3mm past the break point, and (6) resume cutting. This enables unattended overnight operation. Set recovery to use reduced power (50%) for the overlap zone to prevent witness marks at the restart point.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** wire_edm

## Related
- [[esprit-cam-tips-esp-159|Wire EDM Multi-Pass Threading for Broken Wire Recovery]]
- [[camworks-cam-tips-cw-073|2-Axis Wire EDM — Profile Cutting with Automatic Feature Detection]]
- [[camworks-cam-tips-cw-074|4-Axis Wire EDM Taper — Independent Upper and Lower Profiles]]
- [[camworks-cam-tips-cw-075|Skim Cuts — Multi-Pass Wire EDM for Surface Finish and Accuracy]]
- [[camworks-cam-tips-cw-076|No-Core Cutting — Eliminate Slug Drop for Small and Fragile Features]]
