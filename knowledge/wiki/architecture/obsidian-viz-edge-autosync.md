---
title: obsidian-viz-edge-autosync (hook)
type: architecture
status: built
slot: bravo
created: 2026-06-12
tags: [hook, cross-substrate, system-viz, obsidian, bridge, posttooluse]
---

# obsidian-viz-edge-autosync — the Obsidian -> system-viz edge bridge

PostToolUse(Edit|Write|MultiEdit) hook that keeps the **cross-substrate edge sidecar** fresh
whenever a knowledge note changes, so the system-viz graph's Obsidian<->viz edges stay current.
This is the **Obsidian -> system-viz** half of the operator's "edit one, auto-update the other"
bridge (`/loop /goal` mill-knowledge directive, 2026-06-12).

- **Source:** `.claude/hooks/obsidian-viz-edge-autosync.mjs`
- **Test:** `.claude/hooks/obsidian-viz-edge-autosync.test.mjs` (3 node:test cases, all green)
- **Commit:** `ded7ba339d` (slot:bravo)

## What it does

On every Edit/Write/MultiEdit whose target is a knowledge note, it re-runs
`scripts/generate-cross-substrate-edges.mjs` (detached) to refresh
`state/shared/system-viz/cross-substrate-edges-augmentation.json` — the lightweight ADD-only
edge sidecar that `merge-augmentations.mjs` folds into the graph on the next `regen-viz`.

It **qualifies** (fires for) exactly:
- `knowledge/(memories|wiki|tribal)/**/*.md` — vault notes
- `mcp-server/src/engines/<galaxy>/MEMORY.md` — galaxy-brain (Convention-C source)
- `C:/.../.claude/projects/h--prism/memory/*.md` — the C: live auto-memory brain

Everything else (engine `.ts`, galaxy `CLAUDE.md`, non-knowledge `.md`, non-`.md`) is a silent no-op.

## Single-writer safety (verified vs the generator)

The generator it spawns writes **ONLY its own augmentation sidecar**, NEVER the ~548MB
`system-graph.json`. sierra's `regen-viz` stays the single-writer of the graph; this hook only
keeps the sidecar fresh. The hook runs the generator from the **edited file's own tree root**
(`resolveTreeRoot`) so there is no cross-tree timing paradox, and returns `null` (skip) if that
tree lacks the generator.

## Design properties

- **Detached** (`spawn(...).unref()`) — never blocks the tool call (~1ms sync cost).
- **Debounced** per-tree via a `.xsub-autosync-stamp` (default 45s) — stamped BEFORE the spawn so
  concurrent edits debounce even if the child is slow.
- **Fail-soft** — every error path returns `{continue:true}`; an Edit/Write is never blocked.
- **Pure, tested logic** — `qualifies()`, `resolveTreeRoot(fp, env, exists)`, `isDebounced(stamp, now, win)`
  are exported and unit-tested (R9: a non-knowledge edit MUST NOT fire; a knowledge edit MUST fire;
  debounce suppresses thrash; tree resolves only when the generator exists).

## Knobs

| env | effect |
|-----|--------|
| `PRISM_XSUB_AUTOSYNC_DISABLE=1` | disable entirely |
| `PRISM_XSUB_AUTOSYNC_DEBOUNCE_MS=N` | debounce window (default 45000) |
| `PRISM_XSUB_AUTOSYNC_VERBOSE=1` | log decisions to stderr |

## Status / wiring gate

The hook + test are committed on `slot/bravo`. **Wiring into the global `settings.json`
`PostToolUse` array is MERGE-GATED:** the hook file must reach `H:/prism` (via golf-merge) before
the settings entry references it, else a live dangling-path ref. The exact settings entry to add is
in the `ded7ba339d` commit message. Until then the hook is BUILT + TESTED but not yet FIRING —
honest R12 status (do not claim the bridge is live until the settings entry is wired post-merge).

## Related

- [[cross-substrate-synergy-ms0]] — the typed ADD-only edge spine this refreshes
- `scripts/generate-cross-substrate-edges.mjs` — the generator (single-writer of the sidecar)
- [[reference_cross_substrate_synergy_ms0_2026_06_03]] — sierra's edge-schema work
