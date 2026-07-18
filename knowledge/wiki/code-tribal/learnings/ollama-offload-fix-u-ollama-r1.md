# OLLAMA-OFFLOAD-FIX/U-OLLAMA-R1 — [MAIN] [OLLAMA-OFFLOAD-FIX]/U-OLLAMA-R1: revive auto-router for /-prefixed prompts

**Commit:** `66aa07afa4ca` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T22:09:34-05:00
**Tags:** ollama-offload-fix, u-ollama-r1, auto-distilled

## Subject
[MAIN] [OLLAMA-OFFLOAD-FIX]/U-OLLAMA-R1: revive auto-router for /-prefixed prompts

## Body
```
[MAIN] [OLLAMA-OFFLOAD-FIX]/U-OLLAMA-R1: revive auto-router for /-prefixed prompts

ollama-auto-router.mjs:166 early-exit gate `prompt.startsWith('/')`
made the auto-router dead code for the entire /checkin//loop//forge
prompt class fleet-wide. Telemetry showed 0 decisions recorded for
this hook despite it being wired, contributing to the 22.2% offload
rate (vs 30% healthy target).

The length<25 floor already filters trivial bare-commands (/help,
/clear, /compact). Long slash-command prompts (which carry the
actual actionable text) should reach the classifier.

Karpathy classify: dead-code condition delete.
Edge cases: bare /help (5 chars) still skipped by length<25; empty
prompts still skipped by !prompt; non-slash prompts unchanged.
Failure modes: router only injects advisories, no execution path,
so worst case = a few extra advisory mentions on long /commands.

Documented as pending in CLAUDE.md Recent regressions 2026-05-16
F2 R1 ([reference_audit_token_context_memory_2026_05_16]).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .claude/hooks/ollama-auto-router.mjs               |    7 +-
- state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json | 2942 ++++++++++++++++++++
- state/shared/specs/COURSE-DATA-ROUTING-LEDGER.md   |  145 +
- 3 files changed, 3092 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till skipped by length<25; empty
- till skipped by !prompt; non-slash prompts unchanged.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 66aa07afa4ca`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._