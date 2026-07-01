# TOKEN-EFFICIENCY-INJECT/U-REWRITER-SAME-PROMPT-THROTTLE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-REWRITER-SAME-PROMPT-THROTTLE (slot:alpha): quality-preserving same-prompt throttle on the Ollama prompt-rewriter

**Commit:** `52d3ae14e708` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T14:39:42-05:00
**Tags:** token-efficiency-inject, u-rewriter-same-prompt-throttle, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-REWRITER-SAME-PROMPT-THROTTLE (slot:alpha): quality-preserving same-prompt throttle on the Ollama prompt-rewriter

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-REWRITER-SAME-PROMPT-THROTTLE (slot:alpha): quality-preserving same-prompt throttle on the Ollama prompt-rewriter

A /loop re-submits the IDENTICAL prompt every tick; the rewriter re-ran a ~5s
Ollama inference + re-injected a byte-identical restatement each tick. The model
already holds the earlier tick's injection, so suppress the 2nd+ identical
prompt+session within the TTL. This is NOT a disable -- the rewriter is an
actively-maintained QUALITY tool ($0 GPU); we keep its value and only cut the
/loop re-inference waste.

- prompt-rewriter-ollama.mjs: insert shouldThrottleInject({sessionId,prompt,ttlMs})
  BEFORE the inference, after the short-circuit guards. Mirrors the proven
  tribal-by-domain / master-index-precheck integration (shared
  scripts/lib/inject-throttle.mjs, per-(session,prompt-hash), fail-open, the lib
  is internally fail-safe so the insertion cannot throw the hook). Guards the
  "unknown" sid fallback against cross-session collision.
- Knob PRISM_PROMPT_REWRITE_THROTTLE_MS (default 60s; 0=off); set 300000 fleet-wide
  in settings.json env to match the 4 injector throttles raised this session.
- NEW prompt-rewriter-throttle.test.mjs: 4-case node:test subprocess oracle
  (suppress-identical / not-different-prompt / knob-off-disables / unknown-guard).

Completes the per-turn injection-soak reduction begun this session
(U-LIFECYCLE-STATE-GATE compaction fix + the 4-throttle/2-disable settings batch).
```

## Files touched (3)
- .claude/hooks/__tests__/prompt-rewriter-throttle.test.mjs | 77 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/prompt-rewriter-ollama.mjs                  | 21 ++++++++++++++++++++
- 2 files changed, 98 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 52d3ae14e708`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY-INJECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._