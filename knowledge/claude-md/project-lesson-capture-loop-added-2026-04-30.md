---
source: project
section: LESSON CAPTURE LOOP (added 2026-04-30)
slug: lesson-capture-loop-added-2026-04-30
indexed_at: 2026-04-30T16:35:28.565Z
---

## LESSON CAPTURE LOOP (added 2026-04-30)

Hooks auto-draft lesson stubs on repeated errors:
- `error-pattern-promote.mjs` (Stop) — scans `ERROR_LEARN_LEDGER.jsonl` 7-day window; when same fingerprint hits ≥3, drafts `knowledge/wiki/lessons/auto-{fingerprint}.md`. Concurrent-safe via exclusive-create.
- When you see `error-pattern-promote: drafted N lesson stub(s)` in systemMessage, run `/generalize` (lift to wiki/patterns) or `/remember` (decision log) BEFORE `/handoff`. Stubs left undecided rot the loop.
- Capture order on success: `core:decision-log` for non-trivial choice → `/outcome` to log working pattern → `/generalize` only when concrete tip generalizes to a wider rule.
- Telemetry: `mcp-server/data/state/hook-fire-counts.jsonl` — verify both new hooks have non-zero fire rate.
