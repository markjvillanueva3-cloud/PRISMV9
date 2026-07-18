# Regression inbox — for golf hygiene slot to drain into CLAUDE.md §Recent regressions

Per `golf-slot-write-allowlist.mjs` doctrine: chats other than golf cannot edit project CLAUDE.md directly. This file is a regression-discovery drop-off that golf reads on its next hygiene pass and merges into `CLAUDE.md` `## Recent regressions`.

## Entry to add (paste verbatim above the most-recent `## Recent regressions` entry)

```
- 2026-05-23 | **regen-viz fleet-wide crash — `merge-augmentations.mjs:1922` `RangeError: Invalid string length` on `JSON.stringify(G)`. 495MB system-graph.json serialized exceeds V8 ~512MB max-string-length ceiling. NOT heap-size — increasing --max-old-space-size won't help (limit is on the string primitive). regen-viz ABORTS before post-merge stages run, blocking auto-engine-wiki for any engine added since last successful regen. Fix: rewrite merge-augmentations.mjs:1922 to streaming JSON write (per-node/per-edge `JSON.stringify`, chunked `fs.createWriteStream`). Discovered: papa /loop 2026-05-23 attempting U-PSN-VIZ-REGEN. Memory: [[reference_regen_viz_string_length_2026_05_23]].** | observed-in: regen-viz.mjs --fast | fix: TBD — needs streaming-write rewrite of merge-augmentations.mjs:1922
```

## Context

Discovered while closing the final deferred item from the papa /loop PSN docu/OCR synergy pass (2026-05-23, session `2afa1e56`, slot papa). All 4 spec-deferred PSN follow-ups closed (#KNOWLEDGE-DISP-CORPUS, #AI-DISP-LORA, #TRIBAL-DOCU-OCR, attempted #VIZ-REGEN). The #VIZ-REGEN attempt surfaced this pre-existing fleet-wide bug — NOT session-caused.

After golf drains: delete this file.

## Related

- Full diagnostic + suggested fix code: `C:/Users/wompu/.claude/projects/H--prism/memory/reference_regen_viz_string_length_2026_05_23.md` (Stop hook auto-feeds to `H:/prism/knowledge/memories/reference/` on session close).
- Summary memo for the session: `reference_psn_docu_ocr_wiring_2026_05_23.md`.
