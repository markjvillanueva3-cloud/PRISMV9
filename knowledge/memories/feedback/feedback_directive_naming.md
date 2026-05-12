---
name: directive-naming-confusion
description: User's domain shorthand for current work may not match milestone IDs in the roadmap; ask before pivoting on ambiguous names
type: feedback
originSessionId: b0b6f0bd-eab0-4bf3-b38f-1ce9d65168cf
---
When the user says "continue X roadmap" and X is not an exact milestone ID, do NOT silently match the closest-named milestone in `mcp-server/data/roadmap-index.json`. Confirm against the most recent commit/handoff context first.

Concrete incident (2026-04-30): user said "continue intel-ollama-obsidian roadmap". I located milestone `INTEL-OLLAMA-OBSIDIAN-MS0` and proposed starting P0-U01. User corrected: "youre on the wrong road map, we're on post processors". The "intel" they meant referred conceptually to the PPG sidecar bridge work (intelligence stack inside post processors), not the standalone INTEL-OLLAMA-OBSIDIAN milestone.

**Why:** PPG and INTEL-OLLAMA-OBSIDIAN both involve Ollama/embeddings/intelligence wiring. Same vocabulary, different milestones. The PPG context was "what we were just working on" — the most recent commit `0236ca452 PPG-WIRE-MS0/U-PPGW10` was the strongest signal.

**How to apply:** When a user directive mentions a roadmap/topic by informal name, weight current-session signals (last commit, active handoff RESUME, in-progress milestone in CURRENT_POSITION.md) ABOVE keyword match against roadmap-index. If the closest-named milestone differs from the in-progress milestone, ASK before pivoting — don't assume the explicit name overrides session state.
