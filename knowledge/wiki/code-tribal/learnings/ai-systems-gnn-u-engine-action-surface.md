# AI-SYSTEMS-GNN/U-ENGINE-ACTION-SURFACE — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-ENGINE-ACTION-SURFACE (slot:india): per-engine dispatcher action-surface extractor (GNN dense-feature core)

**Commit:** `fd49523511ce` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T17:34:57-05:00
**Tags:** ai-systems-gnn, u-engine-action-surface, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-ENGINE-ACTION-SURFACE (slot:india): per-engine dispatcher action-surface extractor (GNN dense-feature core)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-ENGINE-ACTION-SURFACE (slot:india): per-engine dispatcher action-surface extractor (GNN dense-feature core)

New pure lib scripts/lib/engine-action-surface.mjs extracts each engine's ACTION SURFACE -- the dispatcher action NAMES it backs -- as an embeddable TEXT feature for the GNN tier-5. GAP#1 verifiable core (R13 logical order): the evidence-backed dense leak-free node feature to lift the GNN 1/7-class separability (engine description prose is near-non-discriminative for dispatcher class; action names carry direct class signal). Follow-up wires it into build-node-embeddings sourceSignal + measures separability vs the 1/7 baseline BEFORE any GPU retrain.

LEAK DISCIPLINE (india soul): built from dispatcher case bodies (engine <- action), never the node own label. An unwired ghost backs no action -> empty surface BY DESIGN (training signal on WIRED refs, generalized via GraphSAGE message-passing).

PARSING: inverts the case-body parse of generate-action-engine-edges.mjs into a reusable engine->action-names map. 3 patterns: lowerCamel method-access, new XEngine construction, PascalCase static method-call. PRECISION (R12): method-access required so helper call getEngine(name) is not mis-attributed (was falsely top engine, 2849 actions); PascalCase requires .lowerIdent( so type/constant positions excluded.

LIVE: 2155 engines back >=1 action (6667 links), getengine noise excluded, unwired surface empty. 13/13 real tests (happy + 4 failure + 4 adversarial incl. getEngine precision + PascalCase recall + type/constant exclusion + CASE_BODY_CAP bound + live-data invariant). Per-file 2-arm scrutiny PASS; validity-affecting recall P2 fixed in-commit; remaining P2s deferred (bounded noise / no live impact). Distinct from generate-action-engine-edges (viz edges) + wired-engine-mapper (engine->dispatcher-ns).
```

## Files touched (3)
- scripts/lib/engine-action-surface.mjs      | 154 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/engine-action-surface.test.mjs | 176 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 330 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fd49523511ce`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._