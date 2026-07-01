# HERMES-PARITY/U-HERMES-OLLAMA-PARITY-L1B — [MAIN-FORCE] [HERMES-PARITY]/U-HERMES-OLLAMA-PARITY-L1B (slot:alpha): ask-hermes viz+rerank graph-mode parity

**Commit:** `fc69b05b6d81` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T14:04:05-05:00
**Tags:** hermes-parity, u-hermes-ollama-parity-l1b, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-PARITY]/U-HERMES-OLLAMA-PARITY-L1B (slot:alpha): ask-hermes viz+rerank graph-mode parity

## Body
```
[MAIN-FORCE] [HERMES-PARITY]/U-HERMES-OLLAMA-PARITY-L1B (slot:alpha): ask-hermes viz+rerank graph-mode parity

Close the last CAPABILITY gap: ask-hermes lacked the viz+rerank system-viz graph modes
that ask-ollama has. Now ask-hermes supports the full ask-ollama mode set (viz/ask/rerank/
summarize/explain/triage) plus classify -- a superset.

- DRY (R8): import ask-ollama's exported loadGraph/searchGraph/renderHits/buildVizPrompt +
  the shared lib/ollama-search-rerank (buildRerankPrompt/rerankCandidates) -- same helpers
  ask-ollama uses, NO fork.
- viz: $0 LOCAL graph search; --synth adds a Hermes answer, degrading to the local hits on
  proxy failure (never worse than the search). viz-no-synth provably touches NO model ($0).
- rerank: verified Hermes re-rank with the shared anti-hallucination id-filter; degrades to
  lexical order on any model failure.
- R12: JSON 'source' reports the honest backend (hermes/lexical), never the lib's generic 'ollama'.
- New exported runGraphMode (callModel + loadGraphImpl injectable) -> every branch unit-tested.
- resolveInput bugfix: !FILE_MODES.has(mode) routes ALL non-file modes (incl new viz/rerank) to
  literal text (was falling through the file path + emitting a spurious advisory).

LIVE-VALIDATED (R15): 'viz cutting force kienzle' scanned 64,808 real graph nodes -> top hits
alg-kienzleforcemodel + cutting-force calc (score 4), $0, no proxy.
Tests: 57/57 (+12 graph-mode incl maxHits-cap, zero-hit, <2-candidate fallback, verified rerank).
Per-file 2-arm scrutiny PASS (code-analyzer + reviewer, 0 P0/P1).

Deferred (noted): ask-ollama lacks classify (the reverse-symmetry direction; ~ a constrained ask).
```

## Files touched (3)
- scripts/ask-hermes.mjs      |  95 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-------
- scripts/ask-hermes.test.mjs | 127 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 214 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fc69b05b6d81`
- Milestone envelope: `mcp-server/data/milestones/HERMES-PARITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._