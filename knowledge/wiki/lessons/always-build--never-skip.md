---
title: "Always build, never skip"
name: always-build--never-skip
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_always_build.md
promoted_at: 2026-06-06T04:55:44.258Z
source_refs: 22
---

# Always build, never skip

**Rule**: When analyzing roadmap gaps and identifying missing engines, always build every gap engine. Never recommend skipping an engine as "too thin" or "too narrow" or "domain-specific."

**Why**: The user explicitly wants exhaustive coverage. Skipping engines defeats the roadmap execution protocol and leaves gaps that block future milestones. "Thin" engines are still useful; "narrow" engines are still required. The Omega target is 1.0, not 0.8.

**How to apply**:
- After a gap analysis, build every identified engine — no triage, no skipping.
- If I catch myself proposing "skip X" or "build only the most important," reverse course and build all of them.
- Confirmed by stop-hook guard that will block completion if roadmap analysis identified gaps that weren't built.
- Batch commits are fine; skipping is not.

## Source

Promoted from memory [[feedback_always_build]] (referenced 22x across the vault). The memory remains the editable source of truth.
