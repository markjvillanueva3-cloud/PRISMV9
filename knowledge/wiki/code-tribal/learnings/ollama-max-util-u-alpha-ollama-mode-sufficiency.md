# OLLAMA-MAX-UTIL/U-ALPHA-OLLAMA-MODE-SUFFICIENCY — [MAIN-FORCE] [OLLAMA-MAX-UTIL]/U-ALPHA-OLLAMA-MODE-SUFFICIENCY (slot:alpha): wire the judged ladder into ask-ollama -- summarize/explain now prefer a WARM 7b (measured non-inferior to 32b), ~4x less VRAM

**Commit:** `619e7af8d110` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T19:49:45-05:00
**Tags:** ollama-max-util, u-alpha-ollama-mode-sufficiency, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-MAX-UTIL]/U-ALPHA-OLLAMA-MODE-SUFFICIENCY (slot:alpha): wire the judged ladder into ask-ollama -- summarize/explain now prefer a WARM 7b (measured non-inferior to 32b), ~4x less VRAM

## Body
```
[MAIN-FORCE] [OLLAMA-MAX-UTIL]/U-ALPHA-OLLAMA-MODE-SUFFICIENCY (slot:alpha): wire the judged ladder into ask-ollama -- summarize/explain now prefer a WARM 7b (measured non-inferior to 32b), ~4x less VRAM

The architecture memory ([[reference_ollama_executor_selection_architecture_2026_06_25]]) named the
EXACT unblock condition for the cheapest-warm executor lever: "difficulty-STRATIFIED quality data
WITHIN each mode + a generative-QUALITY metric (LLM-judge)." That data now exists (the judged ladder,
commit 48f1d1266c). This wires it -- NARROWLY and measured-only.

NEW scripts/lib/ollama-mode-sufficiency.mjs (pure, 11/11 tests):
  loadedPreferenceForMode(mode, base) PREPENDS the measured cheap floor (qwen2.5-coder:7b) for the
  ONLY two judged modes (summarize, explain); every unmeasured mode (codegen/triage/viz/ask/rerank)
  returns the big-first base UNTOUCHED. 1.5b is excluded (67% on hard-explain, below the floor).

ask-ollama.mjs runRequest non-codegen branch: pickLoadedChatModel(warm, loadedPreferenceForMode(mode,
OFFLOAD_LOADED_PREFERENCE), {strict:true}). PURELY ADDITIVE -- strict semantics unchanged, so a COLD
7b is skipped and the big-first base wins (never forces a cold-load); the base constant is untouched
(test :181 stays green); codegen branch untouched (no quality data -- R13).

WHY 7b is safe (judged LLM-judge ladder, n=3 hard tier): for summarize+explain 7b is NON-INFERIOR to
32b at EVERY difficulty -- tie on easy/medium, tie on hard-summarize (both fail, 32b buys nothing),
WIN on hard-explain (7b 100% vs 32b 67%). So a warm 7b = equal quality, ~5GB vs ~20GB VRAM, faster.

LIVE VALIDATED: with 32b AND 7b BOTH warm, `ask-ollama summarize <file> --json` -> model=qwen2.5-coder:7b
(was 32b before this change). Resolves the memory's "32b always wins so the lever is dead" concern --
the prepend makes 7b win for the measured modes even alongside a warm 32b.

Tests: 11/11 sufficiency module + 61/61 ask-ollama (5 new integration: warm-7b-picked, cold-7b->32b,
1.5b-below-floor->resolver, triage-unmeasured-no-downshift, codegen-untouched). R12: codegen/triage/
viz/ask/rerank stay big-first -- they have NO judged quality data; extend the table only when measured.
```

## Files touched (5)
- scripts/ask-ollama.mjs                       | 10 +++++++++-
- scripts/ask-ollama.test.mjs                  | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ollama-mode-sufficiency.mjs      | 93 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ollama-mode-sufficiency.test.mjs | 99 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 272 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- TIL]/U-ALPHA-OLLAMA-MODE-SUFFICIENCY (slot:alpha): wire the judged ladder into ask-ollama -- summarize/explain now prefer a WARM 7b (measured non-inferior to 32b), ~4x less VRAM

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 619e7af8d110`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-MAX-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._