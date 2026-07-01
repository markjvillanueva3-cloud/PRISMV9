# OBSIDIAN-AI-SYNERGY/U-OLLAMA-TIMEOUT-SCALE — [MAIN] [OBSIDIAN-AI-SYNERGY]/U-OLLAMA-TIMEOUT-SCALE (slot:india): scale ask-ollama timeout with input size (FM-4)

**Commit:** `7521518fcf58` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T11:22:22-05:00
**Tags:** obsidian-ai-synergy, u-ollama-timeout-scale, auto-distilled

## Subject
[MAIN] [OBSIDIAN-AI-SYNERGY]/U-OLLAMA-TIMEOUT-SCALE (slot:india): scale ask-ollama timeout with input size (FM-4)

## Body
```
[MAIN] [OBSIDIAN-AI-SYNERGY]/U-OLLAMA-TIMEOUT-SCALE (slot:india): scale ask-ollama timeout with input size (FM-4)

OLLAMA-FLEET-AUDIT-2026-06-11 P1-5. The flat DEFAULT_TIMEOUT_MS=180000 fired before
completion on large FILE inputs -- a cold-loaded 32B model summarizing a 57KB+ file
does (cold) model-load + prompt-eval + generation that exceeds 180s, so the cap
killed it mid-answer (FM-4 'large inputs always fail').

Fix (scripts/ask-ollama.mjs):
- scaleTimeoutForBytes(bytes, base): cold-load headroom (60s) + prompt-eval
  (8ms/token ~125 tok/s) + output budget (60s), floored at base, capped at a 10min
  ceiling. Pure; all bad inputs (0/neg/NaN/null) -> floor.
- File modes (summarize/explain/triage) scale to file.content.length; free-text
  ask/viz/rerank keep the default (small input).
- An explicit --timeout always WINS (parseArgs tracks flags.timeoutExplicit) -- a
  pinned operator timeout is never silently scaled up.

57KB -> 234s (was 180s, now completes); 256KB -> 600s cap; small files unchanged.
Tests: ask-ollama 84/84 (3 new: scaler contract + size-scales + explicit-wins).
Self-reviewed (per-file agent gate degraded to self-review this sub-change due to
transient server rate-limiting; end-of-task 3-of-3 Stop gate is the backstop).
```

## Files touched (3)
- scripts/__tests__/ask-ollama.test.mjs | 36 ++++++++++++++++++++++++++++++++++++
- scripts/ask-ollama.mjs                | 29 ++++++++++++++++++++++++++++-
- 2 files changed, 64 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7521518fcf58`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._