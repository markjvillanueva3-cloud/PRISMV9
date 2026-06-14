---
title: Large generated artifacts must serialize compact (V8 string-cap)
tags: [lesson, system-viz, regen-viz, serialization, v8, bug-finding]
created: 2026-05-18
slot: hotel
chat: claude-cb728a14
shipped-with: U-SEED-GHOST-COMPACT
sibling-regression: CLAUDE.md ## Recent regressions 2026-05-18
domain: backend-dev
---

# Large generated artifacts must serialize compact (V8 string-cap)

## What happened

`scripts/seed-ghost-from-unwired.mjs` — the NN-GRAPH reference-pool seed stage
of `regen-viz.mjs` — wrote the merged `system-graph.json` with
`JSON.stringify(g, null, 2)` (pretty-printed, 2-space indent) at **both** write
sites (`--apply` line 303, `--revert` line 239).

The merged graph is now ~390 MB compact. Pretty-printing inflates the produced
**string** by ~1.6× → past V8's hard `String::kMaxLength` (~512 MB on 64-bit).
`JSON.stringify` then throws `RangeError: Invalid string length` **before** the
write — so the stage crashed clean out of every `regen-viz --full` run:

- `regen-viz` logged `failed=1` and continued (the stage is fail-loud but
  non-fatal), so the failure was easy to miss in a 410 s build log.
- 681 `ghost.unwired-engine` reference nodes were never seeded → `nn-graph-eval`
  stayed at `poolSize:0` → the GNN tier-5 wiring-inference cascade stayed
  **dormant by data**, not by code.

## Root cause

A generated artifact crossed a size threshold where its *pretty-printed*
serialization exceeds the V8 string cap. Indentation is pure waste for a
machine-read JSON file — and it is the difference between fitting and not
fitting under the cap.

## The fix

Compact `JSON.stringify(g)` at both sites — matching the sibling convention in
`merge-augmentations.mjs:1490` (`fs.writeFileSync(graphPath, JSON.stringify(G))`),
which already writes this same graph compact and was never affected.

## Lesson

- **Never pretty-print a large generated artifact.** Indentation is for
  human-edited files. Machine-read JSON (graphs, indexes, merged inventories)
  serializes compact — it halves the string and stays under the V8 cap.
- When several scripts round-trip the *same* artifact, they must share the
  serialization convention. `seed-ghost` was the last writer of `system-graph.json`
  still pretty-printing after `merge-augmentations` had already been fixed —
  an inconsistency that only surfaced once the graph grew.
- A fail-loud-but-non-fatal stage failure (`failed=1`) inside a long pipeline
  is easy to overlook. Read the regen log tail, not just the exit code.

## Verify

```bash
grep -c "JSON.stringify(g, null, 2)" H:/prism/scripts/seed-ghost-from-unwired.mjs   # → 0
node --test H:/prism/scripts/seed-ghost-from-unwired.test.mjs                       # → 24/24
```

Regression guard: `seed-ghost-from-unwired.test.mjs` →
`describe("graph write — compact serialization (V8 string-cap regression guard)")`
— structural source guard, fails on revert.

## See also

- CLAUDE.md `## Recent regressions` — 2026-05-18 entry (commit `0160a1521d`)
- The `merge-augmentations` / `decideMergePostState` fail-loud merge guard —
  same `system-graph.json`, same large-artifact failure family.
