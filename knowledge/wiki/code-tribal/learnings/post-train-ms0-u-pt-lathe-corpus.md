# POST-TRAIN-MS0/U-PT-LATHE-CORPUS — [MAIN] [POST-TRAIN-MS0]/U-PT-LATHE-CORPUS: lathe turning-job set + kind-routed jobsFor(); +okuma-b250 baseline; saturation finding

**Commit:** `d9ad4e2a060c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T08:09:14-05:00
**Tags:** post-train-ms0, u-pt-lathe-corpus, auto-distilled

## Subject
[MAIN] [POST-TRAIN-MS0]/U-PT-LATHE-CORPUS: lathe turning-job set + kind-routed jobsFor(); +okuma-b250 baseline; saturation finding

## Body
```
[MAIN] [POST-TRAIN-MS0]/U-PT-LATHE-CORPUS: lathe turning-job set + kind-routed jobsFor(); +okuma-b250 baseline; saturation finding

Adds the turning-op job set (latheJobs: face+OD turn / OD thread G76 / groove+part-off, full master_post_okuma_b250 schema — tool_orientation, insert_radius_mm, feed_mm_rev, G96 CSS + G50 clamp) so lathe + mill-turn posts can train (mill jobs do not satisfy the lathe schema).

jobsFor(post,corpus): pure kind-router — lathe/millturn posts get latheJobs, mill posts get jobs, falls back to mill jobs for a mill-only corpus. Wired into main() trainPost call. +okuma-b250-lathe post (canonical known-good lathe baseline, analogous to hurco-v11-standalone for mill).

Live: jobsFor routing VALIDATED end-to-end (lathe-* jobs reached master_post_okuma_b250, not mill jobs). FINDING 4 added: MCP server subscription pool saturates at 500 (recurring infra blocker for sustained training; restart clears it) — blocked the b250 score this pass.

Tests: +4 jobsFor cases (mill/lathe/millturn routing + mill-only fallback). node --check clean; corpus JSON valid (8 posts, 3 mill + 3 lathe jobs). vitest worker-pool still reaped under MCP-daemon memory pressure — jobsFor is pure + inspection-verified.
```

## Files touched (5)
- scripts/post-training-harness.mjs                    | 12 +++++++++++-
- scripts/post-training-harness.test.mjs               | 17 ++++++++++++++++-
- state/shared/post-training/POST-TRAINING-FINDINGS.md |  7 +++++++
- state/shared/post-training/post-training-corpus.json | 43 ++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 77 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till reaped under MCP-daemon memory pressure — jobsFor is pure + inspection-verified.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d9ad4e2a060c`
- Milestone envelope: `mcp-server/data/milestones/POST-TRAIN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._