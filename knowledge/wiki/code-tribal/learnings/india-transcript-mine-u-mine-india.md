# INDIA-TRANSCRIPT-MINE/U-MINE-INDIA — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [INDIA-TRANSCRIPT-MINE]/U-MINE-INDIA (slot:india): Ollama-powered india/PRISM-AI-systems transcript miner, maxed -- concurrent + 2-tier + cross-session synthesis -> Obsidian vault

**Commit:** `ba834f8a6821` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T11:46:24-05:00
**Tags:** india-transcript-mine, u-mine-india, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [INDIA-TRANSCRIPT-MINE]/U-MINE-INDIA (slot:india): Ollama-powered india/PRISM-AI-systems transcript miner, maxed -- concurrent + 2-tier + cross-session synthesis -> Obsidian vault

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [INDIA-TRANSCRIPT-MINE]/U-MINE-INDIA (slot:india): Ollama-powered india/PRISM-AI-systems transcript miner, maxed -- concurrent + 2-tier + cross-session synthesis -> Obsidian vault

Follows hotel's footsteps (scripts/mine-hotel-transcripts.mjs) -- clone of its
reviewer-hardened pattern, GENERALIZED + maxed for india per operator directive
('use ollama to read all india/AI-systems transcripts, synergize with Obsidian,
max out its potential'). Routes the heavy read+summarize to LOCAL Ollama ($0 Claude
tokens) on the Blackwell.

DELTAS vs hotel + the max-out improvements:
- DISCOVERY spans india-slot UNION any AI-systems topic (nn/gnn/graphsage/lora/rag/
  psn/system-viz/...), so AI work under any slot's handoff is captured.
- CONCURRENCY: makeLimiter caps all Ollama calls to OLLAMA_NUM_PARALLEL (=4); concurrent
  per-slice MAP cut a 5-slice transcript 124s->68s live.
- 2-TIER: gpt-oss:20b map / gpt-oss:120b cross-session SYNTHESIS (fits 96GB GPU).
- SYNTHESIS: merges all per-session digests into ONE deduplicated AI-systems knowledge
  digest (## Shipped/Decisions/Directives/Open-threads/Findings/Metrics+gate), not concat.
- OBSIDIAN SYNERGY: writes the synthesis to knowledge/memories/reference/ (tribal-embeddable
  + semantic-recallable -- the directive's core ask), frontmatter'd.

R12 HONESTY (reviewer-B P1s, fixed): mineable count computed BEFORE --limit so outputs
report '<mined> of <mineable>' (live: 84 mineable, 128 discovered, 44 no-transcript) --
a partial run never presents as complete; documented the handoff-filename discovery
ceiling. VAULT SHRINK-GUARD: coverage_sessions frontmatter + refuse to clobber a
larger-coverage synthesis with a smaller one unless --force-vault (the 2026-06-08
tribal-brain clobber class).

Tests 12/12 (discovery union + anchored-noise + limiter cap/serialize/reject/sync-throw +
buildVaultDoc frontmatter + parseCoverage). Per-file 2-reviewer PASS (0 P0; A fuzz-verified
limiter correctness 8.5/10; B's 2 P1s fixed + re-validated live). LIVE: concurrent slices,
gpt-oss:120b synthesis, vault file (8.7KB) all proven.

MCP-routing (directive 'route through MCP'): no prism_ai:local_llm action exists today
(verified) -- direct Ollama is the current canonical local route; the MCP action is a queued
follow-up (NOT fabricated, R12). Remaining directive parts (MCP action, AI-fn-in-Obsidian,
sandbox) tracked separately.
```

## Files touched (3)
- scripts/mine-india-transcripts.mjs      | 361 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/mine-india-transcripts.test.mjs | 110 ++++++++++++++++++++++++++++
- 2 files changed, 471 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ba834f8a6821`
- Milestone envelope: `mcp-server/data/milestones/INDIA-TRANSCRIPT-MINE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._