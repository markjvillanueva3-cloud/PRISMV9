# TOKEN-SAVINGS/U-PRUNE-TAG-SHARED-CACHE — [MAIN-FORCE] [TOKEN-SAVINGS]/U-PRUNE-TAG-SHARED-CACHE (slot:alpha): pruneTag per-tag prune so a short-TTL injector cannot evict a live longer-TTL sibling in the shared dedup cache (12 evictors migrated)

**Commit:** `d3e0b7ebaff0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T18:58:27-05:00
**Tags:** token-savings, u-prune-tag-shared-cache, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS]/U-PRUNE-TAG-SHARED-CACHE (slot:alpha): pruneTag per-tag prune so a short-TTL injector cannot evict a live longer-TTL sibling in the shared dedup cache (12 evictors migrated)

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS]/U-PRUNE-TAG-SHARED-CACHE (slot:alpha): pruneTag per-tag prune so a short-TTL injector cannot evict a live longer-TTL sibling in the shared dedup cache (12 evictors migrated)

BUG: state/shared/dashboards/injection-dedup-cache.json is read+pruned+written-back by 12 evictors (10 hooks + 2 wrapper libs) each with its own TTL 5min..24h. The old tag-agnostic pruneExpired(cache,now,ttl) dropped EVERY tag older than the CALLER ttl, so a 5min hook evicted a still-live 24h sibling (pre-bash/read/grep/write-graph, psn-prompt-checklist) or 30min sibling (galaxy-claudemd) on write-back -> that sibling re-emitted its full block next prompt = a dedup MISS = wasted tokens.

FIX: new pure pruneTag(cache,hookTag,now,ttl) prunes ONLY the caller tag bucket; foreign tags preserved via {...cache} (never mutated), empty bucket -> tag removed, null cache -> {}, falsy tag -> unchanged. Migrated all 12 evictors (10 hooks + dedupedContext + dedupeOrMarker, the latter 2 fixing ~14 downstream domain-injector hooks at once). pruneExpired kept exported (back-compat + WARNING docstring). Added injectable opts.now to dedupedContext for deterministic tests. Also commits the previously-UNTRACKED core lib injection-dedup.mjs.

PROOF: 35/35 across 4 lib/wrapper test files incl lib cross-hook contrast + wrapper crosstag regression locks (proved load-bearing: revert -> 2 fail). grep: zero shared-sidecar pruneExpired callers remain (3 locals are private per-hook caches). 2-arm scrutiny PASS, 0 findings. 4 pre-existing psn-prompt-checklist shouldInject failures are unrelated.
```

## Files touched (16)
- .claude/hooks/audit-viz-first-inject.mjs              |   7 +++++--
- .claude/hooks/galaxy-claudemd-inject.mjs              |   4 ++--
- .claude/hooks/pre-bash-graph-inject.mjs               |   2 +-
- .claude/hooks/pre-grep-graph-inject.mjs               |   2 +-
- .claude/hooks/pre-read-graph-inject.mjs               |   2 +-
- .claude/hooks/pre-write-graph-inject.mjs              |   2 +-
- .claude/hooks/psn-leg-state-inject.mjs                |   4 ++--
- .claude/hooks/psn-prompt-checklist-inject.mjs         |   4 ++--
- .claude/hooks/slot-domain-awareness-inject.mjs        |   4 ++--
- .claude/hooks/slot-soul-inject.mjs                    |   4 ++--
_(+6 more)_

## Lessons surfaced in commit body
- till-live 24h sibling (pre-bash/read/grep/write-graph, psn-prompt-checklist) or 30min sibling (galaxy-claudemd) on write-back -> that sibling re-emitted its full block next prompt = a dedup MISS = wasted tokens.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d3e0b7ebaff0`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._