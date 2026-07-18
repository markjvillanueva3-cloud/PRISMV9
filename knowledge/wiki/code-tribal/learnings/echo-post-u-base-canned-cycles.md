# ECHO-POST/U-BASE-CANNED-CYCLES — [MAIN] [ECHO-POST]/U-BASE-CANNED-CYCLES: real G81/G82/G83/G73/G84/G85 drilling cycles + arc-prev fix in Tier-1 Hurco post

**Commit:** `bfd0fd431555` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T10:26:28-05:00
**Tags:** echo-post, u-base-canned-cycles, auto-distilled

## Subject
[MAIN] [ECHO-POST]/U-BASE-CANNED-CYCLES: real G81/G82/G83/G73/G84/G85 drilling cycles + arc-prev fix in Tier-1 Hurco post

## Body
```
[MAIN] [ECHO-POST]/U-BASE-CANNED-CYCLES: real G81/G82/G83/G73/G84/G85 drilling cycles + arc-prev fix in Tier-1 Hurco post

Operator caught that drilling shouldnt be plunge moves - WinMax fully supports Fanuc-style canned cycles. Added onCyclePoint/onCycleEnd: first hole emits G98 G8x X Y Z R (Q peck / P dwell) F, repeats emit X/Y only, G80 cancels. Also fixed a latent correctness bug: onLinear/onRapid now setPrev so an arc after a linear move computes I/J from its true start (was a stale center = gouge risk). Re-bundled + redeployed to Fusion library. Rich 4-op sample on desktop (136 lines, lints clean) exercises per-op adaptive feeds. +2 tests (10 pass).
```

## Files touched (7)
- mcp-server/data/posts/prism-base/PRISM-Base-Hurco-3Axis-Bundled.cps |  44 ++++++++++++++++++++++++++++++---
- mcp-server/data/posts/prism-base/PRISM-Base-Hurco-3Axis.cps         |  44 ++++++++++++++++++++++++++++++---
- mcp-server/data/posts/prism-base/SAMPLE-PRISM-Base-Hurco-RICH.nc    | 136 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/data/posts/prism-base/SAMPLE-PRISM-Base-Hurco.nc         |   2 +-
- scripts/emit-rich-sample-nc.mjs                                     | 147 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/prism-base-hurco.test.mjs                                   |  48 ++++++++++++++++++++++++++++++++++--
- 6 files changed, 412 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bfd0fd431555`
- Milestone envelope: `mcp-server/data/milestones/ECHO-POST.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._