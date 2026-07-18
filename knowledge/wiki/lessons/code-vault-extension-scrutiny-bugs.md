---
title: Extending a per-file indexer's KINDS registry — two silent bugs scrutiny caught
type: lesson
slot: sierra
date: 2026-07-04
tags: [code-vault, indexer, scrutiny, regex, dedup, R9, R16]
---

# Extending a per-file indexer — two silent bugs the 3-of-3 caught

When `code-to-vault.mjs` (the code→Obsidian brain-note generator) gained two new
`KINDS` — `frontend` (root `mcp-server/web/src`, exts `.ts`+**`.tsx`**) and `module`
(catch-all root `mcp-server/src`) — the change passed 26 unit tests and a live count
check, yet the 3-of-3 scrutiny gate surfaced **two real defects the green suite did
not**. Both are reusable traps for anyone extending a file-walking indexer.

## Bug 1 — adding a file extension silently breaks the test-file exclusion regex

The walker excluded tests with `/\.test\.[mc]?[tj]s$/` — which matches `.test.ts`
and `.test.js` but **NOT `.test.tsx`/`.spec.tsx`** (the trailing `x` is unmatched).
The moment `frontend` started indexing `.tsx`, colocated React test files
(`JMDieDocumentSearchPanel.test.tsx`) slipped past both the `SKIP_DIRS` set (they
live beside their component, not in `__tests__/`) and the regex — and got emitted
as source brain-notes on the **default** run. Not self-healing (they are in the
produced set, so `--sweep-stale` keeps them), and it grows unbounded.

**Rule:** whenever you widen an indexer's accepted extensions, re-audit EVERY
downstream filter that encodes the old extension set — the test-file guard, the
`.d.ts` guard, any `sourcePath` heuristic. An extension whitelist and an exclusion
regex must move together.
**Fix:** extract `isIndexableSource(name, exts)` (a testable unit) with a guard that
covers the whole family: `/\.(test|spec)\.[mc]?[tj]sx?$/`. Add an R9 assertion that a
`Foo.test.tsx` candidate is excluded — the invariant must live in a test, not a comment.

## Bug 2 — an arg-order sort does NOT make a catch-all "residual"

`module` (root `mcp-server/src`) nests OVER every specific backend kind
(`engines`, `schemas`, `algorithms`, `tools/dispatchers`, ...). A full run keeps
the specific kinds via first-kind-wins dedup **only because** all kinds walk
together. The fix shipped was a `parseArgs` sort forcing kinds into KINDS-definition
order — but that only orders the kinds actually **requested**. `--kind module` alone
(a documented single-kind invocation) still swept all ~5.2k src files and mislabeled
every engine/schema as `code-module` (live: `--kind module --kind engine` → 1217).
The commit message even claimed "can never claim backend files regardless of arg
order" — an overstated guarantee the code did not deliver (R12 doc-truth).

**Rule:** ordering is not exclusion. A catch-all is only safe if it is
**structurally residual** — it must independently refuse any path already owned by a
specific root, not rely on a sibling kind running first.
**Fix:** `MODULE_EXCLUDE_PREFIXES` (every specific `mcp-server/src/*` root) +
`isModuleResidual(rel)`; the candidate loop drops non-residual module paths regardless
of which kinds ran. Live-verified `--kind module` alone → 140, not 5213.

## Meta-lesson

Both bugs were invisible to a passing suite because the tests asserted a **proxy**
(kind registration + sort order) rather than the **real contract** (".test.tsx is
excluded", "module never mislabels a backend file"). R9: test the contract, not the
proxy. R16: a first pass that "looks done" and is green is not done — an independent
adversarial reviewer arm (here, the 3-of-3 arm A) is what turns "green" into "correct."

Fixed in `[SIERRA-CODE-VAULT]/U-SIERRA-CODEVAULT-SCRUTINY-ARMA` (commit 394570dd).
See memory [[feedback_index_full_population_before_claiming_each_file]].
