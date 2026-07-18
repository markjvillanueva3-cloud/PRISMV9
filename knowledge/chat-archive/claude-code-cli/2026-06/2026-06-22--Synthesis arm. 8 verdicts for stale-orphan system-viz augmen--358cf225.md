---
type: "chat-session"
source: "claude-code-cli"
session_id: "358cf225-d753-40b9-9ef5-8ea38cf462fa"
title: "Synthesis arm. 8 verdicts for stale-orphan system-viz augmentations (each folds "
date: "2026-06-22"
first_ts: "2026-06-22T15:13:54.835Z"
last_ts: "2026-06-22T15:15:04.272Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/workflows/wf_214687c8-287/agent-a5bf77aa244dee613.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Synthesis arm. 8 verdicts for stale-orphan system-viz augmentations (each folds 

> **claude-code-cli** | 2026-06-22 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/workflows/wf_214687c8-287/agent-a5bf77aa244dee613.jsonl`

## Transcript

### User | 2026-06-22T15:13:54.835Z

Synthesis arm. 8 verdicts for stale-orphan system-viz augmentations (each folds ~44-day-old data into the canonical merged graph every regen). Produce an ORDERED, de-conflicted markdown fix plan.

VERDICTS:
[
  {
    "augmentation": "awareness-augmentation.json",
    "generatorScript": "H:/prism/scripts/augment-graph-with-awareness.mjs",
    "generatorExists": true,
    "inFastArray": false,
    "hasLoadOptionalSplice": true,
    "spliceLocation": "H:/prism/scripts/merge-augmentations.mjs:143",
    "dataWanted": "wanted",
    "generatorCost": "expensive-oneshot",
    "recommendation": "rewire-heavy",
    "rationale": "The producer (`augment-graph-with-awareness.mjs`) loads the full 548 MB `system-graph.json` via `readJsonSafe(GRAPH_PATH)` at line 188 and iterates every node to compute per-node svi/testCount/complexity/coverage fields. This makes it genuinely expensive and unsuitable for inclusion in FAST[] on every regen. The data is clearly wanted: merge-augmentations.mjs folds it into `n.awareness` on every node (line 374-375) and records it in `augmentationVersions.awareness` (line 274). The generator exists and is correct; it simply needs to be scheduled as a periodic job (e.g. nightly or on-demand after a graph rebuild) rather than silently folding a potentially stale file on every regen.",
    "evidence": "Producer path: H:/prism/scripts/augment-graph-with-awareness.mjs:24 (GRAPH_PATH = system-graph.json), :188 (readJsonSafe(GRAPH_PATH) — full 548 MB graph load), :220 (iterates every graph.nodes). FAST[] absence: grep of H:/prism/scripts/regen-viz.mjs for \"augment-graph-with-awareness\" returned no output. Splice: H:/prism/scripts/merge-augmentations.mjs:143 (loadOptional(\"awareness-augmentation.json\")), :374-375 (folds into n.awareness), :274 (augmentationVersions.awareness)."
  },
  {
    "augmentation": "business-value-map.json",
    "generatorScript": "H:/prism/scripts/build-business-value-map.mjs",
    "generatorExists": true,
    "inFastArray": false,
... [+14076 chars truncated]

### Assistant | 2026-06-22T15:15:04.272Z

## Stale-Orphan Augmentation Fix Plan

### 1. Summary Table

| Augmentation | Producer? | In FAST[]? | Data Status | Recommendation |
|---|---|---|---|---|
| awareness-augmentation.json | yes | no | wanted | rewire-heavy |
| business-value-map.json | yes | no | wanted | rewire-heavy |
| engine-spotlight.json | no | no | wanted (static) | keep-as-is |
| file-coverage-v2-augmentation.json | yes | no | wanted | rewire-fast |
| h-drive-exhaustive-audit.json | yes (PS1) | no | wanted | rewire-heavy |
| h-drive-skipped-census.json | yes | no | wanted | rewire-heavy |
| heuristic-classification.json | yes | no | wanted | rewire-fast |
| novelty-catalog.json | yes | no | wanted | rewire-fast |

---

### 2. Grouped Actions

#### GROUP A: KEEP-AS-IS (0 changes to splice or generator)

**engine-spotlight.json**
- No producer script exists anywhere in the repo (verdict evidence: `Glob('H:/prism/scripts/**/*spotlight*')` returns nothing).
- The splice at `merge-augmentations.mjs:146` loads a hand-curated static catalog (categories, ratings, `whatItDoes`, `technique` per engine) used for HUD/Tour mode.
- Action: add a comment at `merge-augmentations.mjs:146` noting this is a static hand-maintained artifact, not regen-able, so future auditors do not chase a missing generator.

---

#### GROUP B: REWIRE-FAST (add cheap generator to FAST[] in regen-viz.mjs)

These three generators have no FS walk, no 745MB graph load, and no LLM calls. They are safe to run on every `regen-viz` invocation.

**B1. novelty-catalog.json**
- Generator: `H:/prism/scripts/build-novelty-catalog.mjs`
- Cost basis: shallow `fs.readdir` of engines + algorithms dirs, reads top 4000 bytes per `.ts` file, CAP=100 entries, reads 2 registry files. No graph load. (Verdict evidence: `build-novelty-catalog.mjs` CAP=100, no graph load.)
- Add to FAST[] in `regen-viz.mjs` (after the existing `generate-fs-inventory.mjs` entry at line 95, keeping FS-related generators grouped).
- Splice retained at `merge-augmentations.mj
... [+9558 chars truncated]
