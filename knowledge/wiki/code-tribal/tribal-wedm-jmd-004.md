---
name: tribal-wedm-jmd-004
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "m01", "glue-stop", "slug", "closed-contour", "workholding", "die-insert"]
confidence: 94
source: "jm_die_programs"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-jmd-004.md
promoted_at: 2026-05-26T16:07:21.233Z
---

# Glue stop M01 between closed contours: JM Die slug control practice

When a program contains multiple closed contour cutouts (e.g., a die insert with two punch holes), JM Die inserts an M01 (Optional Stop / Glue Stop) block after the rough pass of each contour closes but BEFORE the skim passes begin. The typical sequence is: rough contour 1 → G40 lead-out → M01 (Glue Stop) → M78 M78 → skims for contour 1. The M01 gives the operator a pause to apply a dab of cyanoacrylate adhesive to hold the slug, then press cycle start to continue with skim passes. Without this stop, heavy slugs can drop mid-skim and jam the lower guide or shift the work. The comment '(Glue Stop)' is the standard JM Die in-program annotation — use it consistently so operators recognize it.

**Category:** machining
**Confidence:** 94
**Source:** jm_die_programs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-kb-026|Tab/slug management for closed contour cuts]]
- [[bobcad-cam-tips-bc-064|No-Core Wire EDM for Non-Droppable Slugs]]
- [[bobcad-cam-tips-bc-066|Wire Threading and Glue Stop Programming]]
- [[camworks-cam-tips-cw-076|No-Core Cutting — Eliminate Slug Drop for Small and Fragile Features]]
- [[camworks-cam-tips-cw-159|Wire EDM No-Core Cutting — Prevent Core Drop Damage]]
