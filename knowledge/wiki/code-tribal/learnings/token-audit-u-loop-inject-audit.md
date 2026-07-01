# TOKEN-AUDIT/U-LOOP-INJECT-AUDIT — [MAIN] [TOKEN-AUDIT]/U-LOOP-INJECT-AUDIT: empirical per-/loop-iteration hook-injection token cost

**Commit:** `f88cc9470502` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T21:37:23-05:00
**Tags:** token-audit, u-loop-inject-audit, auto-distilled

## Subject
[MAIN] [TOKEN-AUDIT]/U-LOOP-INJECT-AUDIT: empirical per-/loop-iteration hook-injection token cost

## Body
```
[MAIN] [TOKEN-AUDIT]/U-LOOP-INJECT-AUDIT: empirical per-/loop-iteration hook-injection token cost

High-ROI token-saving node-connection audit (foxtrot-work).

scripts/loop-inject-cost-audit.mjs measures the REAL per-/loop-iteration
token cost of the UserPromptSubmit hook injection chain by running each
inject-role hook twice with a representative loop-continuation stdin and
classifying output silent / stable-redundant / volatile. Supersedes the
flat-400-token heuristic in audit-hook-stack-cost.mjs (which over-counts
~7x: most inject hooks are keyword-gated and silent for a given prompt).

Finding: ~387-518 tokens/iteration of byte-identical stable-redundant
re-injection (prompt-context-inject, loop-iteration-inject,
goal-prereq-inject). Recommended node connection: a loop-context dedup
gate suppressing re-injection of hooks whose normalized output is
unchanged since the prior iteration.

- 53 node:test cases (pure helpers + 8 fixture-driven runHook E2E)
- side-effecting hooks denylisted, never run by the audit
- atomic writes; report routed to Obsidian wiki; baseline JSON
- per-file scrutiny: 2 reviewers x 2 rounds, PASS/PASS

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- .../wiki/architecture/loop-inject-token-budget.md  |  65 ++++
- scripts/loop-inject-cost-audit.mjs                 | 430 +++++++++++++++++++++
- scripts/loop-inject-cost-audit.test.mjs            | 336 ++++++++++++++++
- state/shared/LOOP-INJECT-COST-BASELINE.json        |  34 ++
- 4 files changed, 865 insertions(+)

## Lessons surfaced in commit body
- tile. Supersedes the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f88cc9470502`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._