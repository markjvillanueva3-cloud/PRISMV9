# SIERRA-VAULT-OPS/U-SYNERGY-ASK-GRAPH-COMBINE-NODECARD — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-SYNERGY-ASK-GRAPH-COMBINE-NODECARD (slot:sierra): synergy-ask was grounding VAULT-ONLY in practice; reserve graph slots + enrich graph hits with node-cards

**Commit:** `7fd4d41a4c15` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T13:55:58-05:00
**Tags:** sierra-vault-ops, u-synergy-ask-graph-combine-nodecard, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-SYNERGY-ASK-GRAPH-COMBINE-NODECARD (slot:sierra): synergy-ask was grounding VAULT-ONLY in practice; reserve graph slots + enrich graph hits with node-cards

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-SYNERGY-ASK-GRAPH-COMBINE-NODECARD (slot:sierra): synergy-ask was grounding VAULT-ONLY in practice; reserve graph slots + enrich graph hits with node-cards

Two coupled fixes that make the "combiner" actually combine (R16 gap found by
live validation -- pure-fn tests were green while the integration grounded
vault-only):

1. ROOT CAUSE: mergeHits is vault-first then cap-k. The vault holds a node per
   commit, so EVERY documented query returns >k vault hits and ALL graph hits
   are evicted -- live: "ghost roost generator regen" -> 12 vault / 0 graph.
   The graph+vault JOIN was grounding vault-only. FIX: reserve up to
   min(DEFAULT_MIN_GRAPH=4, graphCount, floor(k/3)) slots for structural graph
   hits (vault still leads -> obsidian emphasis preserved; never >1/3 of budget).
   Same query after: 11 vault / 1 graph (only 1 non-vault node matched; up to 4
   when more exist).

2. node-card x synergy-ask: graph hits used to contribute only "id :: label".
   resolveCards now seeks each top graph hit's node-card (cheap offset-index
   seek via lib/node-card-read.seekCard -- never loads the 878MB graph, never
   throws) -> prompt gets "meta: <layer>/<kind>/<status> -- <info> [N docs]".
   Vault hits keep their .md snippets (skipped here). +grounded `cards` count.

TEST: 15/15 (4 new R9 -- graph-hit card meta line; buildGroundedPrompt cards
param; vault-hits-not-seeked; mergeHits reservation keeps graph present under a
vault-heavy result; existing vault-first + cap tests still pass). VALIDATE
(live): documented query 0->1 graph hit + 1 enriched card; nonsense token still
short-circuits. All ASCII, fail-soft, additive.
```

## Files touched (3)
- scripts/synergy-ask.mjs      | 79 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------------
- scripts/synergy-ask.test.mjs | 57 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 124 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- till leads -> obsidian emphasis preserved; never >1/3 of budget).
- till pass). VALIDATE
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7fd4d41a4c15`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._