---
name: reference-u-dhb-p1-hook-broker-classifier-2026-05-22
description: "2026-05-22 hotel post-compact iter — U-DHB-P1 shipped: hook-broker classifier (lib + CLI) + 602-hook survey; only 13% module-safe, 87% need spawn-isolation"
aliases: reference_u_dhb_p1_hook_broker_classifier_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.999Z
---


# U-DOCKER-HOOK-BROKER-P1 — hook-broker compat classifier (2026-05-22, hotel)

Commit `d5f3ac82b1`. 6 files / 6480 insertions. 59/59 tests pass.

## What shipped

**Pure-core lib** (`scripts/lib/hook-broker-classifier.mjs`, 355 LOC):
- `stripBlockBodies(source)` — brace counter that excises function/class bodies; string/template/comment-aware
- `detectMutations(text)` — regex set covering `spawn*`, `exec*`, `fork`, `fs.promises.*`, `appendFile*`, `unlink*`, `rename*`, `mkdirSync`, `fetch`, `https?.request`, `net.connect`. Scans RAW text (not stripped) so mutations inside exported async handlers still flag.
- `classifyHookContent(source)` — 6-category decision tree: `module-safe` / `cli-safe-stdin-stdout` / `mutates-process` / `imports-only` / `empty` / `unknown`. Order matters: mutates-process is checked BEFORE imports-only and module-safe so a hook with `import {spawnSync}` + top-level call lands in `mutates-process`, not `imports-only`.
- `summarizeReport(entries)` — frozen aggregation with `brokerStrategy` mapping, capped `topMutators[]` (≤25 + truncation count), `invalidEntries` separation.

**CLI walker** (`scripts/classify-hooks-for-broker.mjs`, 257 LOC):
- `walkHookFiles(dir)` excluding `*.test.mjs`, `_envelope.mjs`, `_disabled/`, `.deprecated/`, `__tests__/`
- `classifyHookFile(path)` with 2MB size cap + `readError` surfacing
- `renderMarkdownReport(report)` pure renderer
- `run({hooksDir, outJson, outMd, write, jsonOnly})` — atomic writes via `.tmp` then `renameSync`

**Tests:** 43 hermetic + 16 hermetic = 59 total. All pass on `node --test`.

**Real artifact:** `state/shared/HOOK-BROKER-COMPAT-REPORT.{json,md}` — 602 hooks scanned.

## Key finding

The Tier-1 broker's actual cold-start savings ceiling is **~13%**, not 100%:

| Category | Count | % | Broker strategy |
|---|---|---|---|
| `module-safe` | 78 | 13.0% | share in-process |
| `cli-safe-stdin-stdout` | 0 | 0.0% | (none found) |
| `mutates-process` | 372 | 61.8% | spawn-isolate REQUIRED |
| `unknown` | 146 | 24.3% | spawn-isolate (default) |
| `imports-only` | 5 | 0.8% | ignore |
| `empty` | 1 | 0.2% | ignore |

The original spec assumed most hooks could share. Real measurement shows 87% need spawn-isolation. This must inform Tier-1 broker design: build the 13% shareable path FIRST (high ROI), then evaluate whether spawn-cache (a warm subprocess pool with stdin/stdout pipes) is worth building for the remaining 87% or whether status quo (cold spawn per event) is acceptable. Net: U-DHB-P2 should focus on the 78-hook shareable subset, not a full migration.

## Per-file scrutiny gate run

- **Lib file** — 2 parallel agents (code-analyzer + reviewer). Initial verdict: 1 PASS + 1 **FAIL** (Reviewer B). Fixes applied:
  - P0 #1: expanded `detectMutations` regex from spawn/writeFileSync-only to include fs.promises.*, appendFile, unlink, rename, exec*, fork, fetch, https?.request, net.connect
  - P0 #2: unified mutation detection to run against raw `text` (was asymmetric: spawn checked file-wide, writeFile checked stripped)
  - P1: regex literal `/}/` brace-count concern — documented as acceptable (only causes over-isolation, never under)
  - P1: summarizeReport return value frozen + nested arrays
  - P1: mutators[] bounded growth (25 retained + truncation count)
- **CLI file** — 2 parallel agents. Both PASS, 3 P1s preemptively fixed:
  - P1-1: size cap (2MB) + readError surfacing in entry shape
  - P1-2: atomic writes via .tmp + renameSync
  - P1-3: freeze consistency on merged fullReport

## What's NOT in this unit (decomposition deferred to follow-up)

- U-DHB-P2 (broker server.mjs) — HTTP server that loads the 78 module-safe hooks; serves them via `POST /hook/:name`
- U-DHB-P3 (spawn-cache shim) — warm-subprocess pool for the 0 cli-safe (n/a today; may be reusable for `unknown` triage)
- U-DHB-P4 (migration script) — rewrites the 78 hooks to call `_rpc-shim.mjs` with .original.mjs fallback
- U-DHB-P5 (Dockerfile + compose stanza) — already specced, deferred until P2 proves the server design

## Lessons (for the wiki)

1. **Real measurement contradicts the spec.** The spec assumed broker would amortize cold-start across most hooks. Measurement says 13%. Build the survey BEFORE the broker — cheap classifier saves the milestone-scale wrong build.
2. **Conservative-by-design is the right side of the error** for safety classifiers: misclassification costs cold-start, not corruption.
3. **Decision-tree ordering matters.** `imports-only` originally fired before `mutates-process` because they had no overlap in the prior thinking — but `import { spawnSync }` + bare call has both signals. Test caught it.
4. **Per-file scrutiny gate is load-bearing.** Reviewer B's P0 #1 (missing fs.promises detection) is exactly the silent-corruption class the broker spec warned about. Single-reviewer wouldn't have caught it.

## Refs

- Parent spec: `state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md`
- Commit: `d5f3ac82b1`
- Handoff: `state/shared/handoffs/HANDOFF-claude-db0678d4-backend-dev-loop-u-d.md`
- Survey artifact: `state/shared/HOOK-BROKER-COMPAT-REPORT.{json,md}`
