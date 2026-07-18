# OLLAMA-VERIFIED-OFFLOAD/U-SEARCH-RERANK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-VERIFIED-OFFLOAD]/U-SEARCH-RERANK (slot:alpha): verified ollama re-rank of search candidates (keystone consumer #6) -- enforces ollama for search/navigation ranking

**Commit:** `61a6288d0e4e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T14:50:35-05:00
**Tags:** ollama-verified-offload, u-search-rerank, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-VERIFIED-OFFLOAD]/U-SEARCH-RERANK (slot:alpha): verified ollama re-rank of search candidates (keystone consumer #6) -- enforces ollama for search/navigation ranking

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-VERIFIED-OFFLOAD]/U-SEARCH-RERANK (slot:alpha): verified ollama re-rank of search candidates (keystone consumer #6) -- enforces ollama for search/navigation ranking

New scripts/lib/ollama-search-rerank.mjs: ollama proposes a better ordering of lexical search hits; verifyRerank (PURE) accepts ONLY ids that are real candidate members (anti-hallucination), reorders by the model sequence, appends omitted candidates in original order (nothing dropped); fail-safe to lexical on any model failure/empty/hallucination/resolve-reject. Built on the verifiedOffload keystone (model proposes, code verifies, REQUIRED fallback). Pure + dep-injected (run/resolves injected -- never imports the ollama client).

WIRED: ask-ollama.mjs new `rerank <query>` mode (TEXT_MODES + runRequest branch + USAGE + header). R12: membership-in-hit-set IS the resolvability guarantee for graph-sourced candidates; node-card-offset existence is an injectable `resolves` extension for a future find-cache wire (defaulting it would false-fallback since graph nodes are not all in the 301K card index).

TEST: lib 19/19 (happy + 4 failure + 3 adversarial: prose+ghost-id, <2 candidates no-call, topK) + ask-ollama 80/80 incl 3 rerank runRequest round-trips (VERIFIED reorder, model-down->lexical fallback exit 0, graph-fail exit 3). VALIDATE (live): rerank "cutting force model kienzle" -> source:ollama verified:true, scanned 61485 nodes, top3 = kienzle force-model/algorithm/engine (most-relevant promoted). FLEET-WIDE via ask-ollama (every slot's ollama-offload CLI).
```

## Files touched (5)
- scripts/__tests__/ask-ollama.test.mjs     |  41 ++++++++++++++++++++++++
- scripts/ask-ollama.mjs                    |  37 +++++++++++++++++++++-
- scripts/lib/ollama-search-rerank.mjs      | 149 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ollama-search-rerank.test.mjs | 133 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 359 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 61a6288d0e4e`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-VERIFIED-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._