---
name: Always build, never skip
description: For roadmap engine work, always build every identified gap engine — never recommend skipping even thin/narrow gaps
type: feedback
originSessionId: 69e7fe09-05c1-438b-adcb-d347bc62277b
---
**Rule**: When analyzing roadmap gaps and identifying missing engines, always build every gap engine. Never recommend skipping an engine as "too thin" or "too narrow" or "domain-specific."

**Why**: The user explicitly wants exhaustive coverage. Skipping engines defeats the roadmap execution protocol and leaves gaps that block future milestones. "Thin" engines are still useful; "narrow" engines are still required. The Omega target is 1.0, not 0.8.

**How to apply**:
- After a gap analysis, build every identified engine — no triage, no skipping.
- If I catch myself proposing "skip X" or "build only the most important," reverse course and build all of them.
- Confirmed by stop-hook guard that will block completion if roadmap analysis identified gaps that weren't built.
- Batch commits are fine; skipping is not.
