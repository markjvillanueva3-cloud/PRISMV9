# System-Viz Live Diff

> Generated: 2026-05-13T23:10:21.909Z
> Source: `scripts/build-system-viz-livediff.mjs`
> Current : `H:/prism/state/shared/system-viz/system-graph.json` (110375 nodes · 114858 edges · gen 2026-05-10T23:30:30.172Z)
> Previous: `H:/prism/state/shared/system-viz/system-graph.previous.json` (110375 nodes · 114858 edges · gen 2026-05-10T23:30:30.172Z)

## Headline counters

| Section | Key | Previous | Current | Δ |
|---------|-----|---------:|--------:|---:|
| counts | `actions` | 7341 | 7341 | 0 |
| counts | `algorithms` | 53 | 53 | 0 |
| counts | `claudeHooks` | 464 | 464 | 0 |
| counts | `dispatchers` | 97 | 97 | 0 |
| counts | `engines` | 3180 | 3180 | 0 |
| counts | `formulas` | 499 | 499 | 0 |
| counts | `registries` | 26 | 26 | 0 |
| counts | `scripts` | 526 | 526 | 0 |
| counts | `slashLocal` | 247 | 247 | 0 |
| counts | `slashUser` | 390 | 390 | 0 |
| counts | `srcHooks` | 54 | 54 | 0 |
| counts | `tests` | 3430 | 3430 | 0 |
| headline | `built` | 2302 | 2302 | 0 |
| headline | `drift` | 2 | 2 | 0 |
| headline | `pendingFE` | 2 | 2 | 0 |
| headline | `unwired` | 875 | 875 | 0 |
| headline | `wikiEntries` | 776 | 776 | 0 |

## Nodes

- Added: **0**
- Removed: **0**
- Changed (`status`/`tier`/`businessValue`): **321**

<details><summary>Changed (sample)</summary>

- `ai.ollama.embed` — businessValue:[object Object]→[object Object] — Ollama: embeddings
- `ai.ollama.llama` — businessValue:[object Object]→[object Object] — Ollama: llama3.2
- `ai.ollama.qwen` — businessValue:[object Object]→[object Object] — Ollama: qwen2.5-coder
- `ai.ollama.reflect` — businessValue:[object Object]→[object Object] — Ollama: reflection
- `ai.t1.claude` — businessValue:[object Object]→[object Object] — Tier-1: Claude
(master orchestrator)
- `ai.t2.coordinator` — businessValue:[object Object]→[object Object] — Tier-2: FullSystemAICoordinator
- `ai.t3.cad` — businessValue:[object Object]→[object Object] — T3: CAD AI
- `ai.t3.cam` — businessValue:[object Object]→[object Object] — T3: CAM AI
- `ai.t3.lathe` — businessValue:[object Object]→[object Object] — T3: Lathe AGI
- `ai.t3.mill` — businessValue:[object Object]→[object Object] — T3: Mill AGI
- `ai.t3.quality` — businessValue:[object Object]→[object Object] — T3: Quality AI
- `ai.t3.safety` — businessValue:[object Object]→[object Object] — T3: Safety AI
- `ai.t3.wedm` — businessValue:[object Object]→[object Object] — T3: Wire EDM AGI
- `core.algos` — businessValue:[object Object]→[object Object] — Algorithms (53)
- `core.formulas` — businessValue:[object Object]→[object Object] — Formulas (499)
- `core.hooks_cl` — businessValue:[object Object]→[object Object] — Claude Hooks (450 → 26 buckets)
- `core.hooks_src` — businessValue:[object Object]→[object Object] — Source Hooks (54)
- `core.migrations` — businessValue:[object Object]→[object Object] — Migrations (1)
- `core.physics` — businessValue:[object Object]→[object Object] — Physics Constants (3)
- `core.schemas` — businessValue:[object Object]→[object Object] — Zod Schemas (314 → 13 buckets)
</details>

## Edges

- Added: **0**
- Removed: **0**

> Advisory only — added/removed counts surface what changed but not whether the change is good.
> Cross-reference with `state/shared/BUILD_STATE.md` and `state/shared/MILESTONE_PROGRESS.md` for context.