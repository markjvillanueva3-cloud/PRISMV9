# CHEAP-NODE-ACCESS-MS0/U-VBL-DISPATCHER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VBL-DISPATCHER (slot:sierra): prism_session:doc_nodes — MCP-invokable reverse vault→node lookup (the high-leverage tool-savings move)

**Commit:** `14aba14e3a7b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T08:46:08-05:00
**Tags:** cheap-node-access-ms0, u-vbl-dispatcher, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VBL-DISPATCHER (slot:sierra): prism_session:doc_nodes — MCP-invokable reverse vault→node lookup (the high-leverage tool-savings move)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VBL-DISPATCHER (slot:sierra): prism_session:doc_nodes — MCP-invokable reverse vault→node lookup (the high-leverage tool-savings move)

Completes the forward/reverse symmetry on the MCP surface: node_card (forward,
shipped U-NODECARD-DISPATCHER) answers "graph node → its vault docs"; doc_nodes
(reverse) answers "vault doc → the graph node(s) that document it". A blueprint
workflow's ROI assessment picked this over a per-prompt prefetch hook (deferred:
low firing rate on raw prompts + high false-positive risk on bareword/snake_case
keys) — agents reach capabilities through dispatchers, not CLI subprocesses, and
this fires on-demand with zero per-prompt tax.

FILES: sessionDocNodesAction.ts (dep-injected action body, clone of
sessionNodeCardAction; resolveDocKey resolves doc + aliases query/q/key/path/slug;
fail-soft — a miss is success:true+suggestions, only index-unavailable/throw/
non-JSON are errors) + sessionDocNodesAction.test.ts (14 vitest: happy + capped +
stale + miss + 3 failure + 3 adversarial) + sessionDispatcher.ts (enum + case
delegating to the CLI `system-viz-query.mjs doc-nodes <key> --json` via the same
execFileSync runner pattern as node_card — no shell, no 644MB graph).

VALIDATED: 14/14 action tests; tsc (16GB-heap) clean on my files (657 pre-existing
project errors unrelated — both flagged lines 2782/4200 are peer code outside my
hunks). LATENT until next MCP daemon restart (migration freeze) — same as
maxConnections; the live CLI already serves the capability today.

SCHEMA: doc_nodes works via the unmapped-action passthrough fallback (node_card
precedent — it also ships with no explicit schema). An explicit schema entry is a
tracked follow-up (the working-tree edit didn't cleanly isolate from romeo's
interleaved slot_session_history_read on the shared file).

SHARED-TREE NOTE (R12): sessionDispatcher.ts + sessionActionSchemas.ts carry
romeo's uncommitted U-WIRE-SLOT-SESSION-HISTORY hunks; I surgically staged ONLY my
doc_nodes hunks via a marker-filtered git-apply --cached (verified 0
slot_session_history lines staged) so romeo's work is NOT absorbed.
```

## Files touched (3)
- .../dispatchers/sessionDocNodesAction.test.ts      | 118 +++++++++++++++++++++
- .../src/tools/dispatchers/sessionDocNodesAction.ts | 116 ++++++++++++++++++++
- 2 files changed, 234 insertions(+)

## Lessons surfaced in commit body
- til next MCP daemon restart (migration freeze) — same as

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 14aba14e3a7b`
- Milestone envelope: `mcp-server/data/milestones/CHEAP-NODE-ACCESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._