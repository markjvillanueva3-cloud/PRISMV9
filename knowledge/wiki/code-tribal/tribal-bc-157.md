---
name: tribal-bc-157
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "tabs", "bridges", "slug-retention", "clean-up"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-157.md
promoted_at: 2026-06-09T22:31:15.970Z
---

# BobCAD Wire EDM Tab and Bridge Cutting for Slug Retention

BobCAD's tab/bridge feature inserts uncut sections along the wire path to retain the slug after cutting. Define tab locations manually or use auto-placement at equal spacing. Tab width of 0.3-0.5mm holds most slugs securely while being easy to remove. For heavy slugs (>1kg), use 3-4 tabs at equal angular spacing. After the main profile is cut, return to each tab for a clean-up pass that removes the tab material. Program the tab removal pass at the final skim offset for a flush surface. BobCAD generates separate NC programs for the main cut and tab removal.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:bobcad-docs
**Operations:** wire_edm

## Related
- [[surfcam-cam-tips-sc2-061|Slug Management with Tab and Bridge Strategies]]
- [[surfcam-cam-tips-sc2-165|SURFCAM Wire EDM Slug Retention with Micro-Joint Tabs]]
- [[camworks-cam-tips-cw-159|Wire EDM No-Core Cutting — Prevent Core Drop Damage]]
- [[esprit-cam-tips-esp-057|Wire EDM Slug Management for Safe Unattended Operation]]
- [[esprit-cam-tips-esp-157|Wire EDM Glue Stop Strategy for Slug Retention]]
