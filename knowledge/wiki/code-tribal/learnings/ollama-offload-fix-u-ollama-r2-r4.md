# OLLAMA-OFFLOAD-FIX/U-OLLAMA-R2-R4 — [MAIN] [OLLAMA-OFFLOAD-FIX]/U-OLLAMA-R2-R4: lower inject threshold + rate-limit

**Commit:** `b459870a28eb` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T00:11:25-05:00
**Tags:** ollama-offload-fix, u-ollama-r2-r4, auto-distilled

## Subject
[MAIN] [OLLAMA-OFFLOAD-FIX]/U-OLLAMA-R2-R4: lower inject threshold + rate-limit

## Body
```
[MAIN] [OLLAMA-OFFLOAD-FIX]/U-OLLAMA-R2-R4: lower inject threshold + rate-limit

R2: INJECT_THRESHOLD 0.90 → 0.80 (matches CONFIDENCE_THRESHOLD, eliminates
dead-band where classifier was confident enough to route but not inject).

R4: RATE_LIMIT_MS 5min → 60s per category (5min caps offload ~12x/hour;
60s allows ~60x/hour). Per-category gate still prevents storming.

Bundled: both documented as pending in CLAUDE.md Recent regressions
F2 R2/R4 (2026-05-16 audit). R1 (slash-prefix skip) already shipped
this session in 66aa07afa4. R5 (auto-execute for safe categories)
deferred — bigger behavior change needs separate commit + scrutiny.

Risk: lower threshold + faster rate = more local-LLM activity. Hook
is suggestion-only injection — no execution path, fail-open on Ollama
unavailability. Worst case = slightly more advisory mentions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .claude/hooks/ollama-task-offloader.mjs | 12 ++++++++++--
- 1 file changed, 10 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till prevents storming.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b459870a28eb`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._