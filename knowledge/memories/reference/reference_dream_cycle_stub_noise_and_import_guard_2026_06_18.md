---
name: reference_dream_cycle_stub_noise_and_import_guard_2026_06_18
description: Dream-cycle connection discovery was 77% catalog-stub noise (node_* template duplicates); plus a CLI-guard footgun ran the whole nightly synth on programmatic import.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.556Z
aliases: reference_dream_cycle_stub_noise_and_import_guard_2026_06_18
---


**Hermes dream-cycle catalog-stub noise + import-execution guard bug (slot:bravo, 2026-06-18, U-DREAM-STUB-NOISE `3074d67567`)**

**Finding 1 -- catalog-stub noise (the VALUE fix):** `scripts/hermes-dream-cycle-synth.mjs` discovers cross-memo connections via Jaccard-over-keywords. The memory corpus is **66% auto-imported `node_*` graph stubs** (19,357 total -> only 6,499 real `feedback_/reference_/project_` knowledge memos; the rest are `node_formula_` 7.6K, `node_tribal_` 4.4K, `node_milestone_/course_/registry_/algorithm_`). Each `node_*` KIND is template-near-identical (every MIT course shares syllabus boilerplate; every formula node shares the formula template), so they score 0.82-0.90 intra-kind Jaccard and **flood the connection output** -- a live top-25 was 100% MIT-course<->MIT-course, burying every real cross-domain link. **Fix:** `isCatalogStub(name)` (/^node_/) excludes them from the connection corpus by default (knob `--include-catalog-stubs` restores legacy), reporting `catalog_stub_excluded` in the result + dream-file frontmatter/header (R12). Live validation: stub-involved connections **77% -> 0%**, real-knowledge connections surfaced **47 -> 200** (4.3x), top real connection identical before/after (signal preserved, not just count).

**Finding 2 -- import-execution guard footgun (a REGRESSION class):** the CLI guard was `if (thisUrl === \`file:///${argv1}\` || thisUrl.endsWith(argv1))`. Under `node -e` / programmatic import, `process.argv[1]` is **empty**, so `thisUrl.endsWith("")` is **always true** -> importing the module RAN THE WHOLE NIGHTLY SYNTH (wrote a dream file + ran the galaxy cascade) as a side effect. I hit this live doing analysis-by-import. **Fix:** `if (argv1 && (...))` -- empty argv1 short-circuits to false; the real CRON/CLI path (`node "<abs-path>" --llm-synth`, argv1 truthy) fires exactly as before.

**Why / How to apply (generalizable):**
1. **Connection/similarity discovery over a mixed corpus must separate CATALOG entries from KNOWLEDGE.** Auto-imported near-identical template records (catalog stubs) dominate any keyword/embedding similarity metric by template overlap, not real signal -- exclude or tag them before ranking, or they bury the real cross-domain connections the tool exists to find. Prove noise-down AND signal-preserved with before/after numbers on the LIVE corpus, never "looks better."
2. **A `thisUrl.endsWith(argv1)` CLI guard is a footgun: `endsWith("")` is always true.** Any `is-this-the-main-module` guard that compares against `process.argv[1]` MUST guard the empty-argv1 case (`argv1 && ...`), or the module self-executes on `node -e`/import. Sibling guards (e.g. `hermes-self-reflect-populater.mjs`) likely share the bug -- backport.
-> [[feedback_wire_test_validate_all_galaxies]] · [[feedback_never_assume_data_file_contents]]
