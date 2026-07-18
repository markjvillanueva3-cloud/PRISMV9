# TEST-INTEGRITY/U-RIGOR-JUDGE-CLI-R9 — [MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-JUDGE-CLI-R9 (slot:alpha): R9 coverage for the AI judge fallback ladder -- make callJudge callers-injectable (backward-compatible, default=real ollama/hermes) + 8 hermetic tests pinning ollama->hermes order, first-non-empty-wins, ollama-throw-falls-through, both-fail-throws (R12 never fabricate), hermesFirst, default-model, and the hermes-model-routing fix 02641a95ca (opts.model->ollama only, never hermes). Core 18/18 regression clean.

**Commit:** `1a0177736a73` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T10:22:03-05:00
**Tags:** test-integrity, u-rigor-judge-cli-r9, auto-distilled

## Subject
[MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-JUDGE-CLI-R9 (slot:alpha): R9 coverage for the AI judge fallback ladder -- make callJudge callers-injectable (backward-compatible, default=real ollama/hermes) + 8 hermetic tests pinning ollama->hermes order, first-non-empty-wins, ollama-throw-falls-through, both-fail-throws (R12 never fabricate), hermesFirst, default-model, and the hermes-model-routing fix 02641a95ca (opts.model->ollama only, never hermes). Core 18/18 regression clean.

## Body
```
[MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-JUDGE-CLI-R9 (slot:alpha): R9 coverage for the AI judge fallback ladder -- make callJudge callers-injectable (backward-compatible, default=real ollama/hermes) + 8 hermetic tests pinning ollama->hermes order, first-non-empty-wins, ollama-throw-falls-through, both-fail-throws (R12 never fabricate), hermesFirst, default-model, and the hermes-model-routing fix 02641a95ca (opts.model->ollama only, never hermes). Core 18/18 regression clean.
```

## Files touched (3)
- scripts/test-rigor-judge-cli.test.mjs | 85 +++++++++++++++++++++++++++++++++++
- scripts/test-rigor-judge.mjs          |  8 ++--
- 2 files changed, 90 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1a0177736a73`
- Milestone envelope: `mcp-server/data/milestones/TEST-INTEGRITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._