---
name: reference_dream_cycle_value_frontmatter_noise_2026_06_17
description: "Task-#16 prove-loop-value finding (slot:bravo): the Hermes compounding loops RUN and emit volume (dream-cycle 200 connections/night, self-reflect 1.4MB weekly, LoRA 1336+513 pairs) but the dream-cycle's VALUE is noise-dominated -- 24/25 top connections are node_course/formula_mit catalog stubs matching on shared FRONTMATTER boilerplate (aliases/category/description/course_code), not semantic insight. A naive 'strip all frontmatter' fix OVER-CORRECTS to 0 connections (the 19K corpus is dominated by thin-bodied catalog stubs that only connect via frontmatter). Proper fix is a separate unit: filter catalog stubs OR curated metadata-stopwords + body-weighting."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.557Z
aliases: reference_dream_cycle_value_frontmatter_noise_2026_06_17
---


# Dream-cycle output is frontmatter-noise; naive strip zeroes it (2026-06-17, slot:bravo, task #16)

## What task #16 proved (prove the compounding loops emit VALUE, with numbers)
The Hermes self-improving loops RUN and emit real VOLUME (not no-ops):
- **Dream-cycle:** 200 connections/night over 19,012-19,156 memos (dreams/<date>.md daily).
- **Self-reflect weekly:** `weekly-hermes-reflection-2026-06-14.md` = 1.4 MB; -06-07 = 290 KB.
- **LoRA feed:** `state/shared/lora/fleet-lora-combined.jsonl` = 1336 pairs; `galaxy-synthesis-lora-2026-06-10.jsonl` = 513.

## The real finding (R12): volume != value for the dream-cycle
**24 of the top 25 dream connections are `node_course/formula_mit_*` catalog stubs** matching on
shared FRONTMATTER boilerplate (`aliases, category, course, course_code, description, fall, eecs,
esd, metadata`). The #1 connection (`feedback_d2_bom_smoke <-> feedback_d2_smoke`) collides on
`agent, claude-c0f06dee, desktop-n7mi1vb, category` -- host/agent/test-fixture metadata. So the
"latent insight" connections the dream-cycle is supposed to surface are buried under metadata
collisions, because `extractKeywords` tokenizes the YAML frontmatter and the corpus is dominated
by auto-generated catalog stubs with rich frontmatter + thin bodies.

## Why the naive fix FAILS (don't repeat it)
Stripping the leading YAML frontmatter block in `extractKeywords` dropped catalog-noise pairs
24/25 -> 0 -- but ALSO dropped TOTAL connections to **0** (live re-run, cascade off). The
frontmatter was the ONLY shared vocabulary; the catalog stubs have no body content to connect on,
and even real memos lean on frontmatter for shared terms. All-keep = 96% noise; all-strip = no-op.
Neither extreme is right. (45/45 tests passed but the default-strip is a 0-connection REGRESSION,
so it was REVERTED -- never shipped.)

## Proper fix (queued, NOT a deep-context rush -- needs careful re-validation)
Options, validate against the HIGH-VALUE memo subset (feedback_*/reference_* with real prose):
1. **Filter the auto-generated catalog stubs** out of the dream corpus in `listAllMemos`
   (skip `node_course_*` / `node_formula_*` / pure-metadata nodes) -- removes the noise pairs
   AND the thin-body problem, keeps real-memo connections.
2. **Curated metadata-stopwords** (aliases/category/description/source/synced/node_type/
   course_code/metadata/host-names/agent-ids) added to STOP_WORDS, NOT a full frontmatter strip
   -- suppress boilerplate while keeping body + meaningful frontmatter.
3. Possibly weight body terms over frontmatter terms rather than all-or-nothing.
Re-validate each: catalog pairs DOWN AND total connections > 0 (the naive strip failed the 2nd).
Related: [[reference_obsidian_dream_llm_synth_2026_06_09]] (the --llm-synth rationale pass, now
live -- it would help explain real connections but cannot fix the underlying keyword noise).

## Lesson
"The loop runs + emits output" (R12 volume check) is NECESSARY but NOT SUFFICIENT -- sample the
OUTPUT CONTENT for VALUE, not just exit codes / byte counts. And a one-line "strip the obvious
noise" fix can over-correct to a no-op; validate that the fix REMOVES NOISE while PRESERVING
SIGNAL (both numbers), not just that noise dropped.
