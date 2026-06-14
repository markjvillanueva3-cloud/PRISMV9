---
title: Node-capability injection
type: architecture
generated_by: hand (whiskey slot, 2026-05-22)
last_verified: 2026-05-22
related:
  - scripts/lib/node-capability-injector.mjs
  - scripts/build-node-capability-index.mjs
  - .claude/hooks/node-capability-inject.mjs
  - scripts/lib/emit-node-memory-pointer.mjs
  - .claude/hooks/master-index-precheck-inject.mjs
tags: [architecture, psn, injection, hooks, master-index, deterministic]
---

# Node-capability injection

> **Goal:** when a prompt explicitly names a graph node (engine, algorithm, formula, action, skill, hook, milestone, dispatcher, etc.) — by class name, kebab id, dispatcher:action call, or source path — the node's wiki entry + memory pointer is in the injected context with **deterministic 100% coverage** (within a budget cap). Closes the gap surfaced in the operator work order: `master-index / wiki / memory` injectors return BM25 top-K and silently cut explicit mentions past the K-cutoff.

## Surfaces

| Surface | Role |
|---|---|
| `scripts/lib/node-capability-injector.mjs` | Pure library — `extractNodeMentions(text)` · `resolveMentions(mentions, index)` · `planInjection({resolved, budget})` · `renderInjection(plan)` · `DEFAULT_BUDGET=12` · `HARD_BUDGET_CAP=50`. 27/27 hermetic tests. |
| `scripts/build-node-capability-index.mjs` | Walks `knowledge/memories/reference/node_*.md`, parses frontmatter without a YAML dep, atomically writes `state/shared/system-viz/node-capability-index.json`. Pure exports: `parsePointerFile`, `buildIndex`. 6/6 tests. |
| `.claude/hooks/node-capability-inject.mjs` | T2 UserPromptSubmit hook. mtime-cached index load. Wired in `C:\Users\<u>\.claude\settings.json` after `master-index-precheck-inject` (auto-mirrored to `H:/.claude/settings.json`). 7/7 spawn-based tests. |

## Mention extraction (4 forms)

`extractNodeMentions(text)` deduplicates and lowercases, preserves first-appearance order:

1. **CamelCase engine-like** — `[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+){1,8}` followed by an optional engine-class suffix (Engine, Adapter, Service, Manager, Router, Bridge, Hook, Pipeline, Dispatcher, Registry, Detector, Optimizer, Predictor, Validator, Generator, Builder, Extractor, Calculator, Analyzer, Reasoning) **OR** ≥3 capitals (filters generic English). E.g. `KienzleForceEngine`, `FooBarBaz`.
2. **Kebab/underscore kind-prefixed** — `(alg|formula|hook|action|dispatcher|milestone|registry|monolith|skill|course|frontend|layer|domain|test|engine|node)[-_]<slug>`. E.g. `alg-kalman-filter`, `hook-stop-foo`, `action_cutting_force`.
3. **Dispatcher:action** — `prism_<xxx>:<snake_case>`. E.g. `prism_calc:cutting_force`. The resolver also tries the action-half (`cutting_force`) as a fallback candidate.
4. **Source paths** — only the basename without extension. E.g. `mcp-server/src/engines/X.ts` contributes `x` as a mention; `scripts/lib/my-helper.mjs` contributes `my-helper`.

Linear-time regex throughout — no nested quantifiers, no catastrophic backtracking (verified by the adversarial-input test).

## Resolution (3-stage fallback)

For each mention, `resolveMentions` tries candidates in order — first hit in `displayNameToId` wins:

1. **Direct** — mention as-is (lowercased)
2. **Suffix-strip** — drop one of the 20 engine-class suffixes (e.g. `kienzleforceengine` → `kienzleforce`)
3. **Kebab-prefix-strip** — drop kind prefix (e.g. `alg-kalmanfilter` → `kalmanfilter`)
4. **Dispatcher action-half** — for `prism_xxx:yyy`, also try `yyy`

Dedup by `nodeId` — three mentions of the same engine yield one entry. Pointer entry payload: `{kind, slug, displayName, wikiPath, pointerPath}`.

## Plan and render

`planInjection({resolved, budget=12})` → `{items, truncated, budget}`:
- `budget` clamped to `[1, HARD_BUDGET_CAP=50]`
- `items = resolved.slice(0, cap)` — deterministic, first-mention wins
- `truncated = max(0, resolved.length - cap)` surfaced in the output

`renderInjection(plan)` emits a compact markdown block with header, one or two lines per item (wiki path + pointer path), and a `_+N more truncated_` footer when budget bites. Default cap → ≤ ~3KB block.

## Index shape (7351-pointer build)

```json
{
  "version": 1,
  "builtAt": 1716422400000,
  "pointersDir": "knowledge/memories/reference",
  "count": 7351,
  "skipped": 0,
  "pointers": {
    "algorithm.alg_kalmanfilter": {
      "kind": "algorithm",
      "slug": "alg_kalmanfilter",
      "displayName": "Algorithm — KalmanFilter",
      "wikiPath": "knowledge/wiki/architecture/algorithms/alg-kalmanfilter.md",
      "pointerPath": "knowledge/memories/reference/node_algorithm_alg_kalmanfilter.md"
    }
  },
  "displayNameToId": {
    "algorithm — kalmanfilter": "algorithm.alg_kalmanfilter",
    "alg_kalmanfilter":         "algorithm.alg_kalmanfilter",
    "kalmanfilter":             "algorithm.alg_kalmanfilter"
  }
}
```

First build (2026-05-22, whiskey slot): **7351 pointers → 21,751 lookup keys → 5.6MB minified JSON**. Atomic write (`.tmp-<pid>-<epoch>` + rename) survives concurrent Stop-hook fires across the 26-chat fleet.

## Wiring

Inserted into UserPromptSubmit chain immediately after `master-index-precheck-inject` (so BM25 ranks first, then explicit-mention coverage adds 100% routing), before `memory-index-precheck-inject`:

```json
{
  "_comment": "NODE-CAPABILITY-INJECT-MS0/U-NCI-WIRE: deterministic 100% coverage of explicitly-named graph nodes (complements BM25 top-K above with explicit-mention routing). Disable: PRISM_NODE_CAPABILITY_INJECT=0",
  "type": "command",
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/node-capability-inject.mjs",
  "timeout": 2500
}
```

## Knobs

| Env | Effect |
|---|---|
| `PRISM_NODE_CAPABILITY_INJECT=0` | Hook short-circuits before any work. |
| `PRISM_NODE_CAPABILITY_BUDGET=N` | Override default budget (12). Hard cap 50 still applies. |
| `PRISM_NODE_CAPABILITY_VERBOSE=1` | Emit a `systemMessage` with diagnostic info (missing index, 0 resolved). |

## Coverage guarantee

For every **explicitly-named** node whose `nodeId` is reachable via the 3-stage resolver against the pre-built index, AND that lands within the budget window (default 12 mentions per prompt, hard cap 50), the node's wiki path + pointer path will be in the injected block. **Beyond that:** the existing BM25 top-K injectors (master-index / wiki / memory) handle ranked relevance for ambiguous queries — this hook is strictly additive.

**Known coverage gaps** (consumer of the 7351 pointers, not a bug in this hook):
- The pointer set emitted by `emit-node-memory-pointers.mjs` is keyed on what `regen-wiki-from-viz.mjs` actually surfaces — algorithms, formulas, actions, skills, hooks, milestones, registries, tests, dispatchers, frontend, layers, domains, monolith modules, courses, tribal categories. **Engines are present only as the 7 generators that produce per-node wiki entries cover them** — a freshly built engine without a wiki entry yet will not have a pointer.
- The Stop-hook auto-regen (`stop-wiki-from-nodes-autopopulate`) re-emits pointers on every graph delta + 6h throttle, so new wiki entries arrive in this index automatically.

## Sibling surfaces

- [[node-memory-pointer-autopopulate]] — the upstream of the 7351 pointers this hook consumes.
- [[wiki-coverage-audit]] — reports which graph kinds have generators producing per-node wiki entries (currently 78.7%); any gap there propagates to a gap in this hook's coverage.
- [[master-index-precheck-inject]] — the BM25-top-K sibling this hook runs after.
- [[recall-injection-flow]] — full UserPromptSubmit injection chain doc.

## Why this exists

Operator directive (2026-05-22, whiskey slot, post-/compact): *"devise a system to synergize with PSN so that those nodes you generated are strategically used with 100% coverage capability injection relative to task | ensure node wikis are injected strategically and logically"*. The 7351 pointers shipped by U-NMP-CORE were discoverable via BM25 against memory namespace, but BM25 caps at top-K — explicit mentions past K-cutoff were silently lost. This hook closes the loop: explicit mention → direct route → 100% coverage (within budget).

## Stop-hook integration (follow-up)

The build script `build-node-capability-index.mjs` is currently invoked manually + by `.claude/scheduled-tasks` (TBD). A follow-up unit `U-NCI-STOPHOOK-EXTEND` will modify `stop-wiki-from-nodes-autopopulate.mjs` to ALSO spawn the index rebuild whenever it spawns the pointer regen — so a single graph delta drives both. Until then, the index is rebuilt by hand or by the next scheduled-task tick; stale-index detection in the hook surfaces `node-capability-inject: index is Xh old` via `systemMessage` when the build is >24h behind.
