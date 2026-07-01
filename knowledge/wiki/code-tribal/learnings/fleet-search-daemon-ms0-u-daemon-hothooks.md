# FLEET-SEARCH-DAEMON-MS0/U-DAEMON-HOTHOOKS — [MAIN-FORCE] [FLEET-SEARCH-DAEMON-MS0]/U-DAEMON-HOTHOOKS: wire 4 per-tool graph-inject hooks to warm daemon

**Commit:** `20d835024e5a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T11:51:35-05:00
**Tags:** fleet-search-daemon-ms0, u-daemon-hothooks, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-SEARCH-DAEMON-MS0]/U-DAEMON-HOTHOOKS: wire 4 per-tool graph-inject hooks to warm daemon

## Body
```
[MAIN-FORCE] [FLEET-SEARCH-DAEMON-MS0]/U-DAEMON-HOTHOOKS: wire 4 per-tool graph-inject hooks to warm daemon

pre-{read,write,grep,bash}-graph-inject query the warm search daemon FIRST via
the async searchViaDaemon seam (node http, ZERO extra spawn -- curl-sync would
add a process per tool call and worsen the fork-storm), falling back to the
in-process runMasterIndexSearch on any miss. main() in all four is already async
so awaiting is free; renderInject uses only fields /search returns (no downstream
decorate -- the trap that made precheck-inject net-negative).

Measured (pre-read, distinct sessions so dedup is bypassed): fresh in-process
search was multi-second + the 262MB sidecar is rejected at the 384MB hook heap
(partial 59MB fallback); warm-daemon path = 463ms avg, 5/5 reliable, 3 full-
coverage hits each. daemon-down stays fast (instant ECONNREFUSED -> in-process);
daemonTimeoutMs:400 gives a healthy daemon room to answer (it serves 82-150ms).
PRISM_INDEX_DAEMON_DISABLE=1 reverts all four to pure in-process fleet-wide.

Reproducible recipe: scripts/wire-graph-inject-hooks-to-daemon.mjs (idempotent,
count-verified edits + per-file node --check + auto-revert; --dry/--revert).
4 hook suites green (11+14+14+27=66).
```

## Files touched (6)
- .claude/hooks/pre-bash-graph-inject.mjs       |   9 +++++++--
- .claude/hooks/pre-grep-graph-inject.mjs       |   9 +++++++--
- .claude/hooks/pre-read-graph-inject.mjs       |   9 +++++++--
- .claude/hooks/pre-write-graph-inject.mjs      |   9 +++++++--
- scripts/wire-graph-inject-hooks-to-daemon.mjs | 111 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 5 files changed, 139 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 20d835024e5a`
- Milestone envelope: `mcp-server/data/milestones/FLEET-SEARCH-DAEMON-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._