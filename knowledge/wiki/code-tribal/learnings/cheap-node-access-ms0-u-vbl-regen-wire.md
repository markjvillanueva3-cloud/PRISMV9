# CHEAP-NODE-ACCESS-MS0/U-VBL-REGEN-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VBL-REGEN-WIRE (slot:sierra): auto-refresh the vault-backlink reverse index in the regen tail — close the silent-drift rot

**Commit:** `0e2724871a0e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T08:16:07-05:00
**Tags:** cheap-node-access-ms0, u-vbl-regen-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VBL-REGEN-WIRE (slot:sierra): auto-refresh the vault-backlink reverse index in the regen tail — close the silent-drift rot

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VBL-REGEN-WIRE (slot:sierra): auto-refresh the vault-backlink reverse index in the regen tail — close the silent-drift rot

The reverse index (vault-backlinks.json, U-VAULT-REVERSE-EDGE) was built ONLY by
manual invocation, so node-cards.jsonl regenerated every regen-viz run while the
reverse index went stale — proven live this session: the staleness flag fired
`⚠STALE (node-cards.jsonl is 631min newer)`. The flag (U-VAULT-REVERSE-EDGE-STALE)
made the drift LOUD; this closes it at the source.

FIX: insert build-vault-backlink-index.mjs as a fail-soft stage in regen-viz.mjs
immediately after the build-graph-index spawn (which writes node-cards.jsonl) and
before node-adjacency — the exact sibling idiom (spawnSync + NODE_ARGS, stdio
inherit, log-on-nonzero, does NOT increment `failed`). It runs inside the
already-held graph-write lock so it streams a consistent post-merge node-cards.jsonl,
and only READS node-cards.jsonl + WRITES vault-backlinks.json (never
system-graph.json) so it is NOT a second concurrent graph writer (one-writer-per-path
satisfied — sierra rule). Path agreement is automatic (CARDS_PATH defaults to the
same node-cards.jsonl).

VALIDATED: node --check clean; stage ordered si(391)→vb(413)→na(429); builder
validated live independently (rebuilt 29,628 keys ← 1,510,759 edges this session,
un-staled the live doc-nodes). NOT claiming a full 24GB regen ran — the next
automatic regen exercises the new stage; it's a faithful clone of 3 proven sibling
sidecar stages (build-graph-index/node-adjacency/find-cache), fail-soft so a backlink
failure never aborts the regen.

Blueprint: dynamic workflow wf_b5aa5735 (4-agent UNDERSTAND phase) mapped the exact
insertion site + idiom + lock semantics before this edit (R8 read-first).
```

## Files touched (2)
- scripts/regen-viz.mjs | 22 ++++++++++++++++++++++
- 1 file changed, 22 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0e2724871a0e`
- Milestone envelope: `mcp-server/data/milestones/CHEAP-NODE-ACCESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._