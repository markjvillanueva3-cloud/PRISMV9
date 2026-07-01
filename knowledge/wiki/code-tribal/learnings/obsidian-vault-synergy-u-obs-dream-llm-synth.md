# OBSIDIAN-VAULT-SYNERGY/U-OBS-DREAM-LLM-SYNTH — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-DREAM-LLM-SYNTH (slot:alpha): local-LLM 'why these connect' rationale for the dream-cycle (Q9)

**Commit:** `c3dc47ed23c8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T03:40:44-05:00
**Tags:** obsidian-vault-synergy, u-obs-dream-llm-synth, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-DREAM-LLM-SYNTH (slot:alpha): local-LLM 'why these connect' rationale for the dream-cycle (Q9)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-DREAM-LLM-SYNTH (slot:alpha): local-LLM 'why these connect' rationale for the dream-cycle (Q9)

The Hermes dream-cycle (hermes-dream-cycle-synth.mjs, nightly cron → Obsidian
graph) surfaces cross-memo connections by keyword Jaccard but only ever says
THAT two notes share vocabulary, never WHY. Q9 adds an optional local-LLM
one-sentence latent-insight rationale per top edge — $0 Claude tokens on the
resident Blackwell (qwen2.5-coder:32b). Context EXPANSION: explained connections,
not just denser edges. On-goal (local LLM + vault value).

Ship:
- scripts/lib/dream-llm-annotate.mjs (NEW) — readableName/buildConnectionPrompt/
  cleanRationale (pure) + annotateConnections (async, top-N by Jaccard, fail-open
  per edge). Vault-safe cleaner: drops NONE/empty/over-30-word/rambling replies.
- hermes-dream-cycle-synth.mjs — synthesizeDreamMarkdown renders '↳ _rationale_'
  ONLY when present (default path BYTE-IDENTICAL); footer honestly notes LLM vs
  '(no LLM)'; new async runWithSynth() + CLI --llm-synth / PRISM_DREAM_LLM_SYNTH=1.
- Uses the CODER model directly (NOT the host-aware resolver, which prefers a
  reasoning model gpt-oss:120b that returns EMPTY at low num_predict → 0
  rationales — the bug I hit and fixed); 30s timeout for the cold 32b load.

Default-OFF, fail-open (model down/timeout/NONE → bare edge). LIVE: --llm-synth
on a 2-memo corpus → llm_annotated:1, edge gets a real rationale
('...both relate to cutting forces affecting chip formation and tool wear...'),
footer flips. Default run → 0 rationale, '(no LLM)'. 43/43 tests (31 existing
backward-compat + 12 new). Knobs: PRISM_DREAM_LLM_{SYNTH,MODEL,TOP_N,MAX_WORDS,TIMEOUT_MS}.
```

## Files touched (4)
- scripts/hermes-dream-cycle-synth.mjs    |  68 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- scripts/lib/dream-llm-annotate.mjs      |  97 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/dream-llm-annotate.test.mjs | 102 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 265 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c3dc47ed23c8`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._