# SYSTEM-VIZ/U-VIZ-NEAR-DISPATCHER — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR-DISPATCHER (slot:sierra): wire prism_session:node_near MCP action (parity with node_card)

**Commit:** `44e313be74f7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T22:27:08-05:00
**Tags:** system-viz, u-viz-near-dispatcher, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR-DISPATCHER (slot:sierra): wire prism_session:node_near MCP action (parity with node_card)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR-DISPATCHER (slot:sierra): wire prism_session:node_near MCP action (parity with node_card)

Completes R15 for U-VIZ-NEAR: the semantic-search CLI now has an MCP-UP surface too
(node_card had both CLI + dispatcher; near was CLI-only). New action 'node_near' in the
z.enum + a handler case that delegates to runNodeNearAction (sessionNodeNearAction.ts,
dep-injected pure runner, fail-soft) calling the single-source CLI 'system-viz-query.mjs
near <id> --k <k> --json' via execFileSync (argv array, no shell) -- never the 884MB graph,
never a fork of the search logic. params.id (req, aliases node/nodeId) + params.k (opt,
default 10, cap 100). 8 runner tests (param-normalize + happy + 4 fail-soft branches);
R15 round-trip validated against the real CLI (total=60218, ENOEMBED fail-soft, no-id reject).
Type-clean. Mirrors sessionNodeCardAction exactly.
```

## Files touched (4)
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts          | 20 ++++++++++++++++++++
- mcp-server/src/tools/dispatchers/sessionNodeNearAction.test.ts | 83 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/sessionNodeNearAction.ts      | 86 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 189 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 44e313be74f7`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._