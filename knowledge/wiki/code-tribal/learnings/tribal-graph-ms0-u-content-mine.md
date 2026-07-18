# TRIBAL-GRAPH-MS0/U-CONTENT-MINE — [MAIN] [TRIBAL-GRAPH-MS0]/U-CONTENT-MINE: course-content mining -> ranked advisory candidate queue

**Commit:** `67895484ffe3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T00:53:26-05:00
**Tags:** tribal-graph-ms0, u-content-mine, auto-distilled

## Subject
[MAIN] [TRIBAL-GRAPH-MS0]/U-CONTENT-MINE: course-content mining -> ranked advisory candidate queue

## Body
```
[MAIN] [TRIBAL-GRAPH-MS0]/U-CONTENT-MINE: course-content mining -> ranked advisory candidate queue

Iter 7: mines the per-resource descriptor layer of MIT-OCW course zips into a
RANKED ADVISORY review queue of PRISM-value candidates (technique vocabulary +
formula/algorithm/engine proposals + mfg-relevance score).

Why advisory-only: MIT lecture PDFs are scanned images (OCR-gated, out of
scope); the minable signal is per-resource data.json descriptors. Output is a
human/forge-gated review queue - never auto-built engines (PRISM no-stub /
comprehensive-build / duplication-guard hooks block LLM-gen stubs by design).

Files (all through the per-file 2-arm scrutiny gate, 6 reviewer dispatches):
- scripts/lib/course-content-mine-lib.mjs - pure transforms (19 exports):
  sanitize/collect/aggregate/prompt/depth-aware-JSON-parse/score/floor/Ollama.
  Injection-hardened, fail-loud, ASCII-source.
- scripts/lib/course-content-mine-lib.test.mjs - 46 node:test cases (happy +
  failure modes + adversarial: injection, merge-attack, prototype pollution,
  NaN/Infinity, homoglyph limitation lock).
- scripts/tribal-graph-course-content-mine.mjs - zip->Ollama->ranked JSONL
  orchestrator: idempotent checkpoint, fail-loud exit, env-var PowerShell
  (injection-safe), UTF-8 stdout fix (PS 5.1 codepage bug - silently failed
  31 non-ASCII courses), 60s spawn timeout + hang-cap, symlink-recursion guard.

Result: 226/227 courses processed (1 corrupt 699MB zip, truncated EOCD,
handled gracefully). 65 ranked candidates, 126 asset proposals, 211 techniques
-> pipeline-consumable for prism_knowledge:tribal_search. 64 advisoryOnly
candidate nodes on /system-viz. Composes iters 3-6, no fork.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- scripts/lib/course-content-mine-lib.mjs      | 476 ++++++++++++++++++++++++++
- scripts/lib/course-content-mine-lib.test.mjs | 490 +++++++++++++++++++++++++++
- scripts/tribal-graph-course-content-mine.mjs | 424 +++++++++++++++++++++++
- 3 files changed, 1390 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 67895484ffe3`
- Milestone envelope: `mcp-server/data/milestones/TRIBAL-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._