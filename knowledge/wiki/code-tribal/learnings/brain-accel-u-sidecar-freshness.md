# BRAIN-ACCEL/U-SIDECAR-FRESHNESS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BRAIN-ACCEL]/U-SIDECAR-FRESHNESS (slot:papa): opportunistic no-elevation sidecar refresh at Stop (I2)

**Commit:** `82167492609f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T14:43:29-05:00
**Tags:** brain-accel, u-sidecar-freshness, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BRAIN-ACCEL]/U-SIDECAR-FRESHNESS (slot:papa): opportunistic no-elevation sidecar refresh at Stop (I2)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BRAIN-ACCEL]/U-SIDECAR-FRESHNESS (slot:papa): opportunistic no-elevation sidecar refresh at Stop (I2)

No-elevation complement to the unregistered PRISM Brain Refresh task: recall sidecars (master-index system-graph-index.json, memory dense-embeddings sidecar) rot between manual runs -> search degrades to arch-graph fallback + dense recall misses recent memories (~20x warnings/session). This refreshes them opportunistically at Stop.

scripts/lib/sidecar-freshness.mjs (new): mtime-compares 2 targets; shared O_EXCL decision lock + 20-min cooldown stamp stop the 26-chat fleet thundering herd; detach-spawns existing rebuild scripts (build-graph-index.mjs; build-memory-embeddings-sidecar.mjs --resume gated on a 1.5s Ollama probe). Pure/injectable; fail-safe (stat error => no spawn); stamp written only when something spawns.
session-consolidate-graph.mjs: calls runSidecarFreshness after the consolidate block; detachedSpawn (process.execPath detached+unref -> survives hook exit, 5s Stop budget safe) + ollamaUp probe; wrapped so it never blocks session end.

Per I2 spec: extends the hook (not a new hook), no synchronous brain-refresh.orchestrate(). 13/13 tests; LIVE-validated (a real Stop refreshed the stale master-index sidecar 16:05->19:40, now debounces, exit 0).
```

## Files touched (4)
- .claude/hooks/session-consolidate-graph.mjs |  53 ++++++++++++++++++++++++-
- scripts/lib/sidecar-freshness.mjs           | 170 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/sidecar-freshness.test.mjs      | 183 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 404 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 82167492609f`
- Milestone envelope: `mcp-server/data/milestones/BRAIN-ACCEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._