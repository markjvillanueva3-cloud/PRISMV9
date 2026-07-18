---
title: Windows file-URL CLI guard is silently dead (file:// vs file:///)
type: lesson
created: 2026-07-01
by: claude-f78235d1 (slot:sierra)
tags: [windows, esm, cli-guard, silent-no-op, regen-viz, augmentation-freshness]
---

# Windows file-URL CLI guard is silently dead (`file://` vs `file:///`)

## The bug class

```js
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) { main(); }
```

On Windows this guard is **never true**: `process.argv[1]` is a drive-letter path
(`H:\prism\scripts\x.mjs`), so the template yields `file://H:/prism/scripts/x.mjs`
(two slashes — `H:` parsed as URL *authority*), while `import.meta.url` is
`file:///H:/prism/scripts/x.mjs` (three slashes — empty authority). The comparison fails,
`main()` never runs, and the script **exits 0 with no output** — a silent CLI no-op.

## How it hid

`regen-viz.mjs` FAST[] ran `generate-forge-audit-token-context-features.mjs` on every regen;
it exited 0 every time, so the pipeline stayed GREEN while its augmentation went **219h stale**
— merge-augmentations kept folding the old file (GREEN = re-merge recency, NOT data freshness).
Only `audit-augmentation-freshness.mjs` (AUG-STALE-ORPHAN) surfaced it. Sibling of the
[[detector-silent-skip-and-cache-overwrite]] class: a green exit code proves nothing about work done.

## Sweep result (2026-07-01, slot:sierra)

Grep `import\.meta\.url === \`file://\$\{process\.argv` over `scripts/`: **42 files** carried the
pattern; 31 were saved by a fallback (`|| argv[1].endsWith("name.mjs")` or `argv[1] === __filename`);
**11 were CLI-dead on Windows** and are now fixed: generate-forge-audit-token-context-features
(the stale-orphan), audit-jm-lathe-post-enhancements, bridge-status-resolver,
build-session-evidence-packs, cag-stats-aggregator, **lora-dataset-builder**, **nn-eval-refresh**,
lib/memory-namespace-classifier, lib/namespace-churn-ranker, cad-regen-test, handoff-consolidate
(consolidated handoffs had been frozen since 2026-06-25 because of this).

## Canonical guards

- Repo convention (most siblings): `if (import.meta.url === \`file://${argv[1]}\` || process.argv[1]?.endsWith("<name>.mjs"))`
- Exact (no basename-collision risk): `import { pathToFileURL } from "node:url"; if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`
- NEVER the bare 2-slash template-literal equality on a repo that runs on Windows.

## Detection recipe

1. `node scripts/<x>.mjs` exits 0 with zero output where output is expected → suspect the guard.
2. `node scripts/audit-augmentation-freshness.mjs` → AUG-STALE-ORPHAN names the folded-stale victims.
3. Class sweep: grep the pattern above; any match without `endsWith`/`__filename`/`pathToFileURL` fallback is dead.

## Toolchain footnote

While patching via a bash-heredoc→python pipeline on this Windows harness, backslashes in the
heredoc body were HALVED in transit (`\\\\` arrived as `\\`) — string-match patches containing
backslashes silently miss. Use backslash-free anchors (line markers, `endsWith` fragments) for
scripted surgery here.
