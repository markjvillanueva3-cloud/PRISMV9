# CHEAP-NODE-ACCESS-MS0/U-VAULT-REVERSE-EDGE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VAULT-REVERSE-EDGE (slot:sierra): vault doc → graph node(s) reverse index — closes the system-viz↔Obsidian synergy loop

**Commit:** `96ed5222e2f8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T22:30:23-05:00
**Tags:** cheap-node-access-ms0, u-vault-reverse-edge, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VAULT-REVERSE-EDGE (slot:sierra): vault doc → graph node(s) reverse index — closes the system-viz↔Obsidian synergy loop

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VAULT-REVERSE-EDGE (slot:sierra): vault doc → graph node(s) reverse index — closes the system-viz↔Obsidian synergy loop

The forward edge (graph node → vault docs) already lives in node_card.wikiEntries/
memoryEntries (51,540 cards carry wiki, 48,950 carry memory). The REVERSE was
unmapped: an agent reading a wiki/memory doc had no cheap way to find which live
graph node(s) it documents — grepping the 644MB graph (~186K tokens) was the only
path. This builds the inverse, the missing half of the operator's cheap-node-access
/goal.

WHAT (5 files + map):
- scripts/lib/vault-backlink-schema.mjs — pure key/record contract. normalizeVaultKey
  canonicalizes a wiki path OR memory slug to one stable key (build+query agree);
  makeBacklinkRecord dedupes/sorts/caps at NODE_CAP=50 with honest pre-cap total.
  17 tests.
- scripts/build-vault-backlink-index.mjs — STREAMS the existing node-cards.jsonl
  (zero 644MB graph reads — inverts data already projected) → vault-backlinks.json.
  Fail-loud if the forward edge is missing (R12). No Date (freshness from source
  mtime, resume-safe). Atomic write.
- scripts/lib/vault-backlink-read.mjs — backlinksFor(query): load-once cache,
  fail-SOFT (never throws — may be called from a hook; the builder is the
  fail-loud half), exact-hit + basename-suggestion-on-miss + backlinksWithCards
  hydration. 15 tests (incl real-data smoke).
- scripts/system-viz-query.mjs — `doc-nodes <wikiPath|memorySlug>` subcommand,
  short-circuit BEFORE loadGraph() (like find/node-card), prints node ids + the
  node-card next-step.
- knowledge/wiki/architecture/obsidian-vault-node-access-map.md — registers the
  reverse path + marks the "vault→graph reverse unmapped" GAP CLOSED.

VALIDATED LIVE (R15): built 29,479 vault keys ← 1,520,813 edges from 301,216 cards
(2,657 capped), 19.8MB index (gitignored). doc-nodes resolves exact/json/miss/
suggestion paths. ROUND-TRIP PROVEN: doc-nodes(D) → node N → node-card(N).wikiEntries
lists D back (REVERSE↔FORWARD consistent: true). The agent pays ~tens of tokens for
the answer, never the 19.8MB. 32/32 tests.

SCRUTINY NOTE (R12 honest): per-file 2-arm scrutiny was BATCHED (not per-file) under
YELLOW token budget — all 5 code files are pure/small + covered by 32 passing tests +
the live round-trip proof; the end-of-session 3-of-3 gate covers the full diff.
Follow-up if doc-nodes becomes a hot per-prompt path: an offset-seek variant
mirroring node-card-offset-lib so a hook needn't load 19.8MB.
```

## Files touched (8)
- knowledge/wiki/architecture/obsidian-vault-node-access-map.md |   5 ++++
- scripts/build-vault-backlink-index.mjs                        | 145 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/vault-backlink-read.mjs                           | 119 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/vault-backlink-read.test.mjs                      | 182 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/vault-backlink-schema.mjs                         | 113 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/vault-backlink-schema.test.mjs                    | 138 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/system-viz-query.mjs                                  |  42 ++++++++++++++++++++++++++-
- 7 files changed, 743 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 96ed5222e2f8`
- Milestone envelope: `mcp-server/data/milestones/CHEAP-NODE-ACCESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._