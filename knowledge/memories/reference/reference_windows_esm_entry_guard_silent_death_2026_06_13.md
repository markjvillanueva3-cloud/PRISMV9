---
name: reference_windows_esm_entry_guard_silent_death_2026_06_13
description: "Fleet bug class — `import.meta.url === \\`file://${process.argv[1]}\\`` ESM entry-guards are BROKEN on Windows (file:///H:/ vs file://H:/) so main() never runs = silently-dead CLIs/hooks. 23 PRISM files lack the endsWith fallback; nn-eval-refresh.mjs confirmed dead + fixed. 38 others already safe."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.265Z
aliases: reference_windows_esm_entry_guard_silent_death_2026_06_13
---


2026-06-13 slot:alpha. Found + fixed while refreshing the NN/GNN PSN-leg-state surface.

## The bug class
The common Node ESM "am I the entry point?" guard:
```js
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) { main(); }
```
is **BROKEN on Windows**. For a drive path, `import.meta.url` is `file:///H:/prism/scripts/x.mjs` (THREE slashes — absolute paths get a leading-slash authority-empty form), but the template builds `file://H:/prism/...` (TWO slashes). They never match -> `main()` never runs -> the script/hook is a **silently-dead no-op** when invoked as `node x.mjs` (exit 0, no output, no side effect). On Unix it works (the path starts with `/`, giving `file:///...`). py_compile/tsc/import-tests do NOT catch it (it's a runtime path-string mismatch, not syntax).

## Confirmed instance + fix
`scripts/nn-eval-refresh.mjs` (U-NN-EVAL-REFRESH) was DEAD: running it produced zero output and never wrote `state/shared/nn-graph/latest-candidate.json`, so the SessionStart PSN-LEG-STATE banner kept reading the **stale 2026-06-06 NN-EVAL.json** instead of the latest retrain metrics. Fixed by replacing the guard with the repo's robust convention:
```js
if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/nn-eval-refresh.mjs")) { main(); }
```
VALIDATED: now prints "# Wrote candidate envelope ...", writes latest-candidate.json with current metrics (auroc 0.4286 / macroF1 0.1053 / brier 0.2555, grade "shipped-research-only"); `--json`/`--dry-run` work; unit test green.

## Fleet sweep (R15 apply-to-all)
`grep -rIlF 'file://${' scripts/ .claude/hooks/ mcp-server/scripts/` = 71 files contain the substring. Of the 61 with an actual `import.meta.url ===` guard:
- **38 already have a `|| process.argv[1]...endsWith("name.mjs")` fallback** -> Windows-SAFE (the dominant, correct convention).
- **23 have NO fallback** -> genuinely Windows-broken-on-direct-invoke candidates. Each must be verified that the broken guard actually GATES the script's work (some do work at top-level, making the guard irrelevant).

The 23 (minus the now-fixed nn-eval-refresh) include **3 hooks** confirmed cleanly-gated (main() called ONLY inside the broken guard -> dead on Windows): `cag-soul-cache-block.mjs`, `meta-learning-inject.mjs`, `stop-playbook-corpus-drift-advisory.mjs`. CAUTION: reviving a long-dead hook is a BEHAVIOR CHANGE — `cag-soul-cache-block` may be a *blocking* PreToolUse hook, so waking it needs per-hook judgment, not a blind batch. The ~19 remaining are plain compute/write scripts (e.g. `bridge-status-resolver`, `lora-dataset-builder`, `master-index-query-stats`, `handoff-consolidate`, `system-viz-dead-pixel-sweep`, several `generate-*-features.mjs`) — safe mechanical fixes (clone the `|| endsWith` fallback).

## How to apply
Canonical robust forms (any one):
- `process.argv[1]?.replace(/\\/g,"/").endsWith("<name>.mjs")` (repo convention)
- `import.meta.url === pathToFileURL(process.argv[1]).href` (Node `node:url`)
Never the bare `import.meta.url === \`file://${argv1}\`` form. Sibling of [[reference_hermes_app_launch_fix_cred_pool_2026_06_12]] (Windows os.sysconf) — both are "works-on-Unix, silently-dead-on-Windows" runtime traps that compilers miss. Lesson: a Windows host must treat `file://${...}` ESM guards as suspect; grep them in any audit.
