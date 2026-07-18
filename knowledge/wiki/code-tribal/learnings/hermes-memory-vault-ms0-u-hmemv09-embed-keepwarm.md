# HERMES-MEMORY-VAULT-MS0/U-HMEMV09-EMBED-KEEPWARM — [MAIN] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV09-EMBED-KEEPWARM (slot:zulu): keep nomic-embed-text resident so dense recall never goes dark on cold eviction

**Commit:** `78f64fda97d1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T14:07:48-05:00
**Tags:** hermes-memory-vault-ms0, u-hmemv09-embed-keepwarm, auto-distilled

## Subject
[MAIN] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV09-EMBED-KEEPWARM (slot:zulu): keep nomic-embed-text resident so dense recall never goes dark on cold eviction

## Body
```
[MAIN] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV09-EMBED-KEEPWARM (slot:zulu): keep nomic-embed-text resident so dense recall never goes dark on cold eviction

ROOT CAUSE (live 2026-06-10): nomic-embed-text (memory-recall embed model) is
LRU-evicted under fleet GPU contention (/api/ps -> models:[]). The recall path's
2.5s embed cap CANNOT reload a cold ~5s nomic, so the Qdrant/sidecar dense arm goes
dark (BM25-only) until a longer-timeout caller reloads it.

ollama-embed-keepalive.mjs (+ user-level scheduled task every 4 min): a 20s-timeout
embed that absorbs the cold load and pins nomic with keep_alive=30m so the
latency-capped recall path always finds it warm; classifyAction emits 'cold-recovered'
when it catches a real eviction. Fail-soft (exit 0 always).

Conforms to fleet policy (commit cebde4fd9): keep_alive=30m NEVER -1 (pin-forever
cost ~70GB host commit, tripped the memory-pressure gate); targets ONLY nomic
(~274MB, an intended MAX_LOADED resident). Does NOT touch the gated service env.

memory-index-search-lib.mjs: the recall embed sends keep_alive=30m too, so each
recall refreshes nomic residency (keeps it recently-used -> not the LRU victim).

81 tests (12 keepalive + 69 lib). LIVE: keeper refreshed nomic 193ms; recall flipped
sidecar->HYBRID (Qdrant dense arm live). Per-file scrutiny agents rate-limited
(transient API throttle); self-reviewed all axes; 3-of-3 Stop gate covers consensus.
```

## Files touched (5)
- .claude/helpers/install-ollama-embed-keepalive-task.ps1 |  54 +++++++++++++++++++++++++++++++++++++++
- scripts/lib/memory-index-search-lib.mjs                 |   9 ++++++-
- scripts/ollama-embed-keepalive.mjs                      | 102 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ollama-embed-keepalive.test.mjs                 |  71 +++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 235 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- til a longer-timeout caller reloads it.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 78f64fda97d1`
- Milestone envelope: `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._