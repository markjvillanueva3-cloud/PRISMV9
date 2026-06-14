---
title: roadmap-index.json atomic writer consolidation
type: architecture
unit: U-ROADMAP-INDEX-WRITER-CONSOLIDATE
created: 2026-05-19
by: claude-df944902 (slot bravo)
---

# roadmap-index.json — single atomic writer (`scripts/lib/atomic-json.mjs`)

## Problem (DEV-TOOL-CONFLICT-AUDIT F4, 2026-05-17)

`mcp-server/data/roadmap-index.json` had **5 independent writer scripts**, each
with its own copy of the write primitive:

| Writer | Pre-consolidation state |
|--------|-------------------------|
| `reconcile-milestones.mjs` | inline `tmp+rename`, fixed `.tmp` suffix, no trailing `\n` |
| `register-devtools-roadmap-envelopes.mjs` | inline `tmp+rename`, fixed `.tmp` suffix, `+"\n"` |
| `register-revenue-roadmap-envelopes.mjs` | inline `tmp+rename`, fixed `.tmp` suffix, no trailing `\n` |
| `reconcile-roadmap-drift.mjs` | inline `tmp+rename`, fixed `.tmp` suffix, no trailing `\n` |
| `close-out-milestone.mjs` | private `function atomicWriteJson`, per-PID suffix, `+"\n"` |

Two bugs lived in this sprawl:

1. **Fixed-`.tmp` collision.** Four of the five wrote `${INDEX_PATH}.tmp` — a
   single fixed path. Several target the *same* `roadmap-index.json`, so two
   concurrent runs wrote the same temp file: the loser's content could survive
   the rename (silent wrong data), and the second `renameSync` threw `ENOENT`
   on the already-consumed temp.
2. **Five implementations of one primitive** — the exact "two writers, two
   impls" hazard the audit exists to surface; a fix to one never reached the
   others.

## Fix

`scripts/lib/atomic-json.mjs` exports the single canonical
`atomicWriteJson(filePath, obj, {trailingNewline=true, fsImpl})`:

- writes to a **per-PID** temp sibling (`${filePath}.tmp-${process.pid}`) then
  `renameSync` — distinct processes never share a PID, so the collision is gone;
- the temp is a same-directory sibling → rename is always intra-filesystem → atomic;
- a `renameSync` failure best-effort `unlinkSync`s the orphan temp, then rethrows
  loud (R12) — the original error is never masked by a cleanup failure;
- a non-serializable input (`BigInt`, circular ref) throws in `JSON.stringify`
  *before* any file is touched.

All 5 writers now call the helper. The 3 that previously emitted no trailing
newline converge on `\n` (default) — `roadmap-index.json` is machine-generated
and `JSON.parse`-only, so all 5 writers are now byte-consistent (the file's
trailing byte previously flip-flopped with whichever writer ran last).

## Verification

- `scripts/lib/atomic-json.test.mjs` — 15 `node:test` cases (round-trip, atomicity,
  per-PID temp, write-before-rename ordering, fail-loud both error paths,
  orphan-temp cleanup, non-serializable-throws-before-write, byte-parity).
- `close-out-milestone.mjs --self-test` — 25/25 (exercises the helper through a
  real consumer; the file re-exports `atomicWriteJson` for back-compat).
- `node --check` clean on all 5; `reconcile-milestones.mjs --dry-run` smoke OK.

## Out of scope (follow-ups)

- `extract-domain-pipeline-units.mjs` carries a 6th private `atomicWriteJson`
  copy — it writes milestone *envelopes*, not `roadmap-index.json`, so it is
  outside this unit. Route it through the shared helper in a follow-up.
- Envelope-file writes in the two `register-*` scripts remain raw non-atomic
  `writeFileSync` — separate follow-up.
- `index.milestones` is an array in 3 scripts and an object-map in 2 — a
  pre-existing schema disagreement, not introduced here.

Memory: [[reference_roadmap_index_writer_consolidate_2026_05_19]].
