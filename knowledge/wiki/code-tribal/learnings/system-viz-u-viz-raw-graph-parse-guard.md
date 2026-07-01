# SYSTEM-VIZ/U-VIZ-RAW-GRAPH-PARSE-GUARD — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-PARSE-GUARD (slot:sierra): regression-lock the 875MB-graph string-cap crash class

**Commit:** `1ffd8c229979` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T20:42:28-05:00
**Tags:** system-viz, u-viz-raw-graph-parse-guard, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-PARSE-GUARD (slot:sierra): regression-lock the 875MB-graph string-cap crash class

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-PARSE-GUARD (slot:sierra): regression-lock the 875MB-graph string-cap crash class

Hardening: locks PRISM's most-destructive recurring bug class -- a raw
JSON.parse(readFileSync(<merged system-graph.json>, "utf8")) materializes the
~875MB graph as one JS string and throws V8's 512MiB max-string-length BEFORE
parsing (bit repeatedly: tribal-index V8 clobber, graph-OOM, build-business-value-map,
augment-graph-with-awareness). The cap-safe readGraphStreaming fix was held only by
CONVENTION -- nothing stopped a future edit from reintroducing the raw read.

- scripts/lib/raw-graph-parse-guard.mjs: pure scanner. Binds merged-graph path vars
  (excludes architecture-graph.json + the system-graph-index sidecar), detects a raw
  utf8 JSON.parse of them, exempts files using a cap-safe reader (readGraphStreaming/
  graph-io/...). Comment-stripped; Buffer reads not flagged.
- scripts/lib/raw-graph-parse-guard.test.mjs: 13/13. Unit (positive/negative/adversarial)
  + the FLEET LOCK -- scans all real scripts/*.mjs, asserts ZERO violations (passes now =
  the class is hardened; fails loud if reintroduced).

R8 read-before-write caught the scanner's own scope-blindness: it first flagged
psn-synergy-collect.mjs:209, but that `path` is a `for (const path of candidates)`
loop var over SMALL (<=8MB-gated) files -- a DIFFERENT scope from the merged-graph
`path` (read via the bounded-head reader). Added isReusedAsLoopVar() to drop
scope-ambiguous loop-reused names -> 0 false positives on the live tree. Did NOT
"fix" the (correct) psn-synergy-collect file.
```

## Files touched (3)
- scripts/lib/raw-graph-parse-guard.mjs      | 131 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/raw-graph-parse-guard.test.mjs | 159 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 290 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1ffd8c229979`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._