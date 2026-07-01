# CLAUDE-MD PATCH — U-ROADMAP-INDEX-WRITER-CONSOLIDATE

**By:** claude-df944902 (slot bravo) · **Date:** 2026-05-19 · **Reason:** CLAUDE.md
was peer-dirty (`M CLAUDE.md` at session start) — patch-sibling per the
peer-locked-surface convention rather than commingle a peer's uncommitted edit.

## Apply to `H:/prism/CLAUDE.md` — `## Recent regressions`

The 2026-05-17 entry for `roadmap-index.json` 5-writer / 3-non-atomic should be
updated: the unit `U-ROADMAP-INDEX-WRITER-CONSOLIDATE` is **SHIPPED**.

The entry's verify command is now stale — it was:
```
grep -L "atomicWriteJson" scripts/{reconcile-milestones,register-devtools-roadmap-envelopes,register-revenue-roadmap-envelopes}.mjs  → returns all 3
```
That returned all 3 because the scripts had achieved atomicity via *inline*
`tmp+rename`, not the named helper. As of this unit all 5 writers
(those 3 + `reconcile-roadmap-drift.mjs` + `close-out-milestone.mjs`) import the
shared `scripts/lib/atomic-json.mjs` `atomicWriteJson`.

### Suggested replacement line for the `## Recent regressions` block

```
- 2026-05-19 | **U-ROADMAP-INDEX-WRITER-CONSOLIDATE SHIPPED** — all 5 roadmap-index.json
  writers (reconcile-milestones, register-devtools/revenue-roadmap-envelopes,
  reconcile-roadmap-drift, close-out-milestone) now route through the single shared
  helper `scripts/lib/atomic-json.mjs`. Fixes the fixed-`.tmp`-suffix concurrent-writer
  collision (per-PID temp) and collapses 5 copies of the primitive to 1. The prior
  2026-05-17 F4 entry's `grep -L "atomicWriteJson"` verify command is obsolete.
  | fix: commit <SHA>, slot bravo. | verify:
  `grep -L "atomicWriteJson" scripts/{reconcile-milestones,register-devtools-roadmap-envelopes,register-revenue-roadmap-envelopes,reconcile-roadmap-drift}.mjs` → empty;
  `node --test scripts/lib/atomic-json.test.mjs` → 15/15.
```

## Follow-ups (not done by this unit)

- `extract-domain-pipeline-units.mjs:342` — a 6th private `atomicWriteJson` copy
  (writes envelopes, not roadmap-index.json). Route through the shared helper.
- Envelope-file writes in the two `register-*` scripts remain raw `writeFileSync`.
