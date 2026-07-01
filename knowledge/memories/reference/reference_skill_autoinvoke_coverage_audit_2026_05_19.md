---
name: reference-skill-autoinvoke-coverage-audit-2026-05-19
description: "/forge-audit-v2 of PRISM skill auto-invocation — 23.5% honest Layer-2 coverage, 394 dark-gap skills; prior audit's extractor-scope root cause was misdiagnosed (real fix was a YAML parser bug)."
aliases: reference_skill_autoinvoke_coverage_audit_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.204Z
---


`/forge-audit-v2` audit (slot foxtrot, 2026-05-19, claude-6437979f) of skill auto-invocation, driven by the "20 Claude Skills Most Builders Don't Know Exist" article (sairahul1 X / BrowserAct) thesis *"the right skill loads when relevant."* Doc: `state/shared/specs/SKILL-AUTOINVOKE-COVERAGE-AUDIT-2026-05-19.md` (+ `.html`).

**Measured:** 622 skills, 121 covered by `skill-auto-trigger.mjs` = 19.5% raw / **23.5% honest** (excluding 104 NATO slot-wrappers + 3 six-chat — correctly dark). 394 genuine dark-gap skills. Ledger `_skill-triggers.jsonl` = 481 entries; 480/481 ≥0.65 — quality is fine, the gap is *missing* triggers not weak ones.

**Two auto-invoke layers** — the audit metric measures Layer 2 only: Layer 1 = the model picks from ~440 skill descriptions via the Skill tool (spans the whole surface — the article's actual mechanism); Layer 2 = `skill-auto-trigger.mjs` keyword-BM25 top-3 *suggestion* nudge (covers 121; a hook cannot invoke a skill).

**Core reframe:** 100% Layer-2 coverage is the WRONG target — a BM25 top-3 surface degrades with more contestants. Author triggers for the high-ROI dark tail (~40-60 skills); leave the long tail dark deliberately. Peer reviewer validated this as a sound precision property, not rationalization.

**Prior-audit correction (F1/F6):** `HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17` F3 claimed the extractor "reads only the project tree" — FALSE. The ledger's 36→481 growth was `U-HRR-PARSER-FLAT` (commit `2ba5d4baf3`): a YAML-parser bug that silently dropped flat-string triggers (87/124 trigger-bearing skills use the bare-string shape), plus `U-LIMA-A4` cross-tree union. The first draft of THIS audit propagated the misdiagnosis; the Phase-4B peer reviewer (worktree agent ab5510c8) caught it. **Lesson (F6):** a superseding audit must verify the prior root cause against git/source, not just observe the metric moved — same recurring class as the two CLAUDE.md "META-tool assumed a schema without reading the file" regressions.

**META artifact:** `scripts/skill-trigger-coverage.mjs` already existed (`U-LIMA-A5`) — NOT rebuilt; the duplication guard correctly blocked a re-create. Known defect: its raw `coveragePct` counts the 104 wrappers → recommend an `--exclude-wrappers` flag.

**Neural angle (honest):** NN-graph tier-5 (GraphSAGE engine-wiring) does NOT apply to skill triggers. The genuine neural lever is `nomic-embed-text` embedding similarity — propose `triggers:` blocks for dark skills by analogy to their nearest covered neighbour, making the F2 fix a review-and-approve task.

Related: [[reference_cyrilxbt_obsidian_article_delta_2026-05-07]] · [[reference_dev_velocity_autotrigger]] · [[reference_ollama_pipeline_ms0_2026_05_15]]
