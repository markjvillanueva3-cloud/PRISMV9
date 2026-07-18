---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_always_build.md
source_filename: feedback_always_build.md
content_hash: 9005fa0e72e46794a95988e6f2103cd4bbb4e91bdbd080fb91e5b2a41f11cc7e
mirror_ts: 2026-05-05T13:00:09.413Z
mirror_engine: ObsidianMemorySyncEngine
---
**Rule**: When analyzing roadmap gaps and identifying missing engines, always build every gap engine. Never recommend skipping an engine as "too thin" or "too narrow" or "domain-specific."

**Why**: The user explicitly wants exhaustive coverage. Skipping engines defeats the roadmap execution protocol and leaves gaps that block future milestones. "Thin" engines are still useful; "narrow" engines are still required. The Omega target is 1.0, not 0.8.

**How to apply**:
- After a gap analysis, build every identified engine — no triage, no skipping.
- If I catch myself proposing "skip X" or "build only the most important," reverse course and build all of them.
- Confirmed by stop-hook guard that will block completion if roadmap analysis identified gaps that weren't built.
- Batch commits are fine; skipping is not.
