# NODE-CAPABILITY-INJECT-MS0/U-NCI-CORE — [MAIN] [NODE-CAPABILITY-INJECT-MS0]/U-NCI-CORE (slot:whiskey): deterministic 100%-coverage node-pointer injection

**Commit:** `50f2eeca9ef3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T22:41:19-05:00
**Tags:** node-capability-inject-ms0, u-nci-core, auto-distilled

## Subject
[MAIN] [NODE-CAPABILITY-INJECT-MS0]/U-NCI-CORE (slot:whiskey): deterministic 100%-coverage node-pointer injection

## Body
```
[MAIN] [NODE-CAPABILITY-INJECT-MS0]/U-NCI-CORE (slot:whiskey): deterministic 100%-coverage node-pointer injection

Closes PSN coverage gap surfaced in the work order: the existing
master-index / wiki / memory injectors return BM25 top-K. If a prompt
explicitly names 10 graph nodes, K=5 silently cuts 5 of them.

This adds a deterministic explicit-mention router that complements (does
NOT replace) the BM25 injectors:

  • scripts/lib/node-capability-injector.mjs (186 LOC, pure library)
    - extractNodeMentions(text): 4 mention regexes (CamelCase engines,
      kebab/underscore-kind-prefixed ids, dispatcher:action, source paths
      → basename). Linear-time, no catastrophic backtracking.
    - resolveMentions(mentions, index): direct lookup + suffix-strip +
      kebab-prefix-strip + dispatcher-action-half fallback.
    - planInjection({resolved, budget}): budget-capped, deterministic
      (mention-order preserved); HARD_BUDGET_CAP=50.
    - renderInjection(plan): compact markdown block ≤ ~3KB at default
      budget.
    - 27/27 hermetic tests via node:test.

  • scripts/build-node-capability-index.mjs (176 LOC)
    - Walks knowledge/memories/reference/node_*.md, parses frontmatter
      without js-yaml dep, emits
      state/shared/system-viz/node-capability-index.json:
        { pointers: {nodeId → {kind, slug, displayName, wikiPath, ptr}},
          displayNameToId: {name → nodeId} (3 keys/pointer: display,
          slug, prefix-stripped slug) }
    - Atomic write (tmp + rename) survives concurrent Stop-hook fires.
    - 6/6 hermetic tests via node:test.

  • .claude/hooks/node-capability-inject.mjs (T2, UserPromptSubmit)
    - Disable: PRISM_NODE_CAPABILITY_INJECT=0
    - Budget : PRISM_NODE_CAPABILITY_BUDGET=N (default 12)
    - Verbose: PRISM_NODE_CAPABILITY_VERBOSE=1
    - mtime-cached index load, SILENCE on missing index / empty
      mentions / 0 resolved.
    - 7/7 spawn-based smoke tests via node:test.

Coverage guarantee: for every explicitly-named node within the budget
(default 12, hard cap 50), the node's wiki path + pointer path is
present in the injected block. BM25 fallback for ambiguous queries is
preserved by the existing master-index / wiki / memory injectors.

Wiring (in follow-up commit, after this lands on cad-fusion-live-ms0
via cherry-pick): add a UserPromptSubmit entry in
C:/Users/wompu/.claude/settings.json calling the hook with timeout
2000ms, after master-index-precheck-inject, before memory-relevance-inject.

Refs:
  - Work order: "devise a system to synergize with PSN so that those
    nodes you generated are strategically used with 100% coverage
    capability injection relative to task"
  - U-NMP-CORE (8c96ebb8b4): the 7351 node pointers this consumes
  - U-NMP-GITIGNORE (4ae4dcb76f / ddd8944d14): treats them as artifacts

40/40 tests green. Ready for cherry-pick to cad-fusion-live-ms0 +
settings.json wiring + wiki/memory companion files.
```

## Files touched (7)
- .claude/hooks/node-capability-inject.mjs      | 123 ++++++++++++
- .claude/hooks/node-capability-inject.test.mjs | 134 +++++++++++++
- scripts/build-node-capability-index.mjs       | 176 +++++++++++++++++
- scripts/build-node-capability-index.test.mjs  | 106 ++++++++++
- scripts/lib/node-capability-injector.mjs      | 186 ++++++++++++++++++
- scripts/lib/node-capability-injector.test.mjs | 270 ++++++++++++++++++++++++++
- 6 files changed, 995 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 50f2eeca9ef3`
- Milestone envelope: `mcp-server/data/milestones/NODE-CAPABILITY-INJECT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._