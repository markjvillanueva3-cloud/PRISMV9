# OBSIDIAN-VAULT-SYNERGY/U-LINT-ORPHAN-OOM — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-LINT-ORPHAN-OOM (slot:alpha): fix vault-orphan linter OOM -- gate the 643MB-graph block behind --graph

**Commit:** `5e990a3ac67b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T14:48:17-05:00
**Tags:** obsidian-vault-synergy, u-lint-orphan-oom, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-LINT-ORPHAN-OOM (slot:alpha): fix vault-orphan linter OOM -- gate the 643MB-graph block behind --graph

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-LINT-ORPHAN-OOM (slot:alpha): fix vault-orphan linter OOM -- gate the 643MB-graph block behind --graph

lint-wiki-orphans.mjs (THE vault-orphan detector) was OOM-aborting (~380MB heap)
on the current 39,497-file vault, so vault-health monitoring was silently broken
and orphan notes accumulated undetected. ROOT CAUSE: the PRIMARY orphan lint is
light + works (writes wiki-orphans.json + _orphans-rescue.md before the crash),
but the SECONDARY _disconnected-graph-nodes regen loads the 643MB system-graph.json
via readGraphStreaming -- which MATERIALIZES the graph (only dodges the V8 string-cap
during parse, not the in-memory result) -> OOM. A heap-OOM is a process ABORT the
try/catch CANNOT catch, so it killed the whole tool.

FIX: gate the graph block behind opt-in --graph (default OFF). The vault-orphan lint
-- the value-bearing primary -- now always completes; the disconnected-nodes page is
opt-in (caller supplies heap). Honest log message when skipped.

LIVE: default run was OOM-abort -> now exit 0 in 1432ms, scanned 39,497 wiki files,
13,055 orphans (33.1%) surfaced, wiki-orphans.json refreshed. Verified by live run
(previously-untested I/O script; the run IS the verification). The real fix -- a
non-materializing streaming degree pass in graph-io.mjs -- is routed to sierra (same
643MB graph OOM that also breaks system-viz-query).
```

## Files touched (2)
- scripts/lint-wiki-orphans.mjs | 22 +++++++++++++++++++---
- 1 file changed, 19 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5e990a3ac67b`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._