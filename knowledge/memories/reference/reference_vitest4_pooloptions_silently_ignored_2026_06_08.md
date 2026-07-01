---
name: reference_vitest4_pooloptions_silently_ignored_2026_06_08
description: vitest.config.ts poolOptions.threads.* was silently ignored under Vitest 4.1.5 (API removed) — worker tuning had NO effect until migrated to top-level test.*
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.252Z
aliases: reference_vitest4_pooloptions_silently_ignored_2026_06_08
---


**vitest.config.ts worker tuning was a silent no-op under Vitest 4 (slot:alpha, 2026-06-08).**

`mcp-server/vitest.config.ts` nested `maxThreads/minThreads/isolate/singleThread` under `test.poolOptions.threads.*` — the **Vitest 3** schema. The project upgraded to **vitest 4.1.5**, which **removed `poolOptions`** and promoted those keys to **top-level `test.*`**. So from the upgrade until 2026-06-08 the entire worker-tuning block was **silently ignored** — vitest emitted a `DEPRECATED poolOptions was removed` line and fell back to defaults. The ~3400-case suite ran at default parallelism, not the configured cap.

Surfaced while applying the 9950X3D2 16-core retune (8→16): running the affected tests printed the deprecation warning. Caught per R8/R12 (read the actual runtime behavior instead of assuming the config took effect).

**Fix:** moved `maxThreads`/`minThreads`/`isolate`/`singleThread`/`maxConcurrency` to top-level under `test:` (kept `pool: "threads"`). Deprecation warning gone; the 16-thread setting now actually applies. Verified live: 33/33 affected tests green, no warning.

**Lesson:** after a major test-framework version bump, a config that *parses* can still be *ignored* — the framework warns but doesn't error. Always run once and read the runtime output to confirm tuning took effect. Shipped in `[BLACKWELL-HW-SYNC-MS0]/U-ALPHA-HWSYNC-RETUNES` (commit e5ad4ea802). Related: [[reference_blackwell_gpu_training_ready_2026_06_06]].
