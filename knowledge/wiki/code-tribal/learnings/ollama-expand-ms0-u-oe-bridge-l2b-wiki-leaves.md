# OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2B-WIKI-LEAVES — [MAIN] [OLLAMA-EXPAND-MS0]/U-OE-BRIDGE-L2B-WIKI-LEAVES: 33x wiki recall via leaf-file scan

**Commit:** `94d4d0feacf3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T10:57:09-05:00
**Tags:** ollama-expand-ms0, u-oe-bridge-l2b-wiki-leaves, auto-distilled

## Subject
[MAIN] [OLLAMA-EXPAND-MS0]/U-OE-BRIDGE-L2B-WIKI-LEAVES: 33x wiki recall via leaf-file scan

## Body
```
[MAIN] [OLLAMA-EXPAND-MS0]/U-OE-BRIDGE-L2B-WIKI-LEAVES: 33x wiki recall via leaf-file scan

L2b pivoted: HTTP /mcp transport (POST :3100/mcp StreamableHTTPServerTransport)
times out on both initialize and tools/call probes — same blocker the L2 author
documented. Pivoted to a higher-leverage real gap: the bridge's wiki_lookup
tool read only knowledge/wiki/index.md (722 entries), missing the 1500+ leaf
.md files under knowledge/wiki/architecture/ that contain per-engine,
per-action, per-formula documentation. Live count on disk: 22,734 leaves
(31.5x the 722-entry index). Closing that gap multiplies Ollama's wiki recall
~33x without touching the MCP transport surface.

Implementation (additive, no behavior change to the index path):
- listWikiLeafFiles({root, leavesDirRel, maxDepth, readdirImpl, statImpl})
  — pure, dep-injected, fail-soft (returns [] on missing/unreadable dir),
  recursion-capped at WIKI_LEAVES_MAX_DEPTH=5, symlink-loop defense via
  seen Set, excludes _*.md (regen-wiki-from-viz.mjs convention).
- scoreLeafFilenames(leaves, tokens) — pure substring-match scoring on
  basename stem (case-insensitive, .md stripped). Stable descending sort.
- Per-process TTL cache (_leafCache, 5min). Keyed on root so multi-root
  tests don't cross-contaminate. Cold/warm verified: 229ms -> 14ms.
- wiki_lookup executor extended: returns INDEX body + LEAF body separated.
  Index-first ordering (curated > raw filename matches). 6-leaf cap so
  leaf hits never crowd out index entries.
- Tool spec description + system prompt updated so the model knows to
  read_excerpt() returned leaf paths.
- R12 fail-loud (arm-B P2): wiki_lookup appends "(note: wiki leaf
  directory not found — only index.md was searched)" when leaf dir is
  absent — distinguishes "scan broken" from "no match".

Tests (9 new, all PASS — 95/96 total, 1 LIVE-Ollama SKIP):
- listWikiLeafFiles hermetic: finds .md, excludes _*, depth cap, depth
  cap protects against runaway recursion.
- listWikiLeafFiles adversarial: missing dir, non-dir start, unreadable
  subdir (3 failure modes).
- scoreLeafFilenames: token matching, multi-token ranking, empty inputs.
- REAL-DATA E2E: listWikiLeafFiles returns >100 leaves on the live tree
  (actual: 22,734).
- REGRESSION-GUARD: wiki_lookup integration picks a real leaf basename
  token at runtime and asserts the "Leaf wiki files" section appears —
  fails loudly if the leaf-scan branch is ever removed from wiki_lookup.

Per-file scrutiny (2-arm parallel):
- Arm A (code-analyzer): PASS — algorithm correctness, cache safety,
  path safety, test integrity all verified live.
- Arm B (reviewer, independent): PASS with 5 P2 advisories. P2-3
  (fail-loud) addressed in this commit. P2-1/2/4/5 (drift-detection
  integration test, symlink-loop test, search-limitation docstring,
  4-surface doc reflection) logged in handoff — not correctness blockers.

Live verification: wiki_lookup({name:"kienzle force"}) now returns the
existing 7 index lines PLUS 6 leaf paths including
knowledge/wiki/architecture/engines/physics/kienzleforcemodelengine.md
and formulas/formula-constants-kienzleforce.md — net-new knowledge
surface the model can drill into via read_excerpt for ~0 Claude tokens.

Slot: charlie. Iter 3/4 of /loop continuation of OLLAMA-EXPAND-MS0.
```

## Files touched (3)
- scripts/__tests__/ollama-prism-bridge.test.mjs | 177 +++++++++++++++++++++++-
- scripts/ollama-prism-bridge.mjs                | 180 +++++++++++++++++++++++--
- 2 files changed, 347 insertions(+), 10 deletions(-)

## Lessons surfaced in commit body
- note: wiki leaf

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 94d4d0feacf3`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-EXPAND-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._