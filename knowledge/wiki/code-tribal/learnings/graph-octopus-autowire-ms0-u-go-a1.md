# GRAPH-OCTOPUS-AUTOWIRE-MS0/U-GO-A1 — [MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-A1 (slot:echo): shared high-ROI graph-key-derive lib

**Commit:** `73a8ae208f37` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T16:00:31-05:00
**Tags:** graph-octopus-autowire-ms0, u-go-a1, auto-distilled

## Subject
[MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-A1 (slot:echo): shared high-ROI graph-key-derive lib

## Body
```
[MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-A1 (slot:echo): shared high-ROI graph-key-derive lib

scripts/lib/graph-key-derive.mjs — the shared key-derivation core for the
4 PreToolUse graph-injection hooks (A2-A5). deriveGraphKeys({input,tool})
with per-tool strategies:
- read/write → basename stem, dash/underscore split, tokenize
- grep → tokenize the pattern (tokenize already strips all regex metachars
  + drops STOPWORDS + dedups + caps — no manual stripping needed)
- bash → NARROW: only file-search verbs (grep/rg/find/cat/head/tail/ls);
  walks past env-var prefixes + the rtk wrapper; git/npm/node yield []

Reuses tokenize from master-index-search-lib.mjs so the STOPWORDS set +
MIN_TOKEN_LEN + length caps are a single source of truth — the "high-ROI
filter" the plan called for (STOPWORDS already drops generic noise like
'system'/'engine'/'the').

27 tests — every tool branch + edge cases (empty/null/NaN maxKeys,
all-metachar, all-stopword, oversize DoS, multi-command bash, find -name).
27/27 green. 2-of-2 scrutiny PASS, 0 P0/P1.

Unblocks A2 (pre-grep) / A3 (pre-write) / A4 (pre-bash) / A5 (refactor
pre-read to the shared lib).
```

## Files touched (4)
- .../milestones/GRAPH-OCTOPUS-AUTOWIRE-MS0.json     |  11 +-
- scripts/lib/graph-key-derive.mjs                   | 124 +++++++++++
- scripts/lib/graph-key-derive.test.mjs              | 226 +++++++++++++++++++++
- 3 files changed, 358 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 73a8ae208f37`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-OCTOPUS-AUTOWIRE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._