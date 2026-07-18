# Lathe Galaxy KNOWLEDGE.md — compiled wiki + tribal + memory index (slot:whiskey)

> The single navigable surface for ALL lathe-domain knowledge: wiki entries + tribal tips + high-ROI memories, organized by topic. Compiled 2026-05-29 (U-PSGB-WHISKEY-KNOWLEDGE). Cascade-injects under `engines/lathe/`. When you need lathe knowledge, start here, then drill. Keep entries as pointers — detail lives in the linked file.

## 🔌 How this knowledge auto-invokes (the "needed → surfaced" chain)
Lathe knowledge reaches a session WITHOUT a manual lookup via 5 surfaces:
1. **`whiskey-lathe-context-inject.mjs`** (UserPromptSubmit, H:/.claude/hooks) — fires on slot==whiskey OR any lathe keyword; injects the safety reflex + constants + surface + this index pointer.
2. **`tribal-by-domain-inject`** — top-3 tribal hits by slot domain (lathe) on lathe-keyword prompts.
3. **`wiki-tribal-coverage-per-domain-inject`** (the wired per-domain wiki surface) / `wiki-precheck-inject` (on-disk injector) — wiki entries surfaced on keyword/domain match (the `[[lathe-*]]` entries below).
4. **Galaxy cascade** — editing under `engines/lathe/` auto-loads CLAUDE/MEMORY/GSD/this file.
5. **`/galaxy-verify-whiskey`** — on-demand full galaxy load + 13-gate + PSN verify.
_qdrant-gated (tribal_search/semantic_search) degrade to keyword/Glob when qdrant is down — see GSD.md §8._

## 📐 Wiki (knowledge/wiki/architecture/)
**Galaxy core (whiskey-authored):** [[lathe-galaxy]] · [[lathe-safety-gates]] · [[lathe-okuma-dialect]] · [[lathe-program-lint]] · [[lathe-gsd-protocol]]
**Domain (pre-existing):** [[domain-lathe]] · [[domain-turning]] · [[domain-okuma]] · [[dispatcher-turning]] · [[dispatcher-turningprogram]]
**Pipeline/audit:** [[lathe-adaptive-pipeline-assessment-2026-05-27]] · [[lathe-wiring-backlog-bridge]] · [[jm-die-lathe-upgrade-ms0-yolo-session]]

## 🧠 High-ROI memories (C:/…/memory + H:/knowledge/memories)
**Physics gotchas (9 doctrine — the §5 set):** [[feedback_whiskey_g50_css_cap_mandatory]] · [[feedback_whiskey_boring_bar_ld_ratio]] (L³/D⁴) · [[feedback_whiskey_nose_radius_surface_finish]] · [[feedback_whiskey_threading_multipass]] · [[feedback_whiskey_parting_peck_evacuation]] · [[feedback_whiskey_subspindle_phase_tolerance]] · [[feedback_whiskey_feed_ipr_ipm_dialect]] · [[feedback_whiskey_live_tooling_polar_mode]] · [[feedback_whiskey_okuma_first_corpus]]
**Corpus / Okuma:** [[reference_jm_die_is_okuma_heavy_implications_2026_05_27]] · [[reference_lathe_canned_cycle_dialects_2026_05_27]] · [[reference_whiskey_academy_lathe_bridge_2026_05_26]]
**Validation / failure-modes (R12):** [[reference_iter218_alcoa_outlier_retraction_2026_05_27]] (annotation≠machining) · [[feedback_jm_die_b_versions_are_ai_not_human_upgrade]] · [[reference_lathe_ab_version_locator_design_2026_05_27]] · [[reference_lathe_program_quality_rubric_2026_05_27]] · [[reference_lathe_cycle_time_levers_2026_05_27]]
**Tooling / process:** [[reference_whiskey_lathe_lint_tooling_2026_05_29]] (/lathe-lint) · [[reference_whiskey_lathe_gsd_protocol_2026_05_29]] (GSD)
**Threading / hard-turn:** [[reference_lathe_g76_thread_validator_design_2026_05_27]] · [[reference_lathe_h_class_cbn_expansion_design_2026_05_27]]
**NEW (2026-05-29):** [[reference_whiskey_jm_v2_envelope_fit_gate_2026_05_29]] (V2 envelope-fit SAFETY gate) · [[reference_whiskey_swiss_bar_feed_doctrine_2026_05_29]] (Swiss/bar-feed/GB) · [[feedback_gitignored_wiki_needs_byname_grep]] (search discipline)

## 🛠 Tribal (prism_knowledge:tribal_search slot=whiskey — qdrant-gated)
6 captured tips (G50/CSS cap · boring-bar L/D · threading multi-pass · sub-spindle phase · parting peck · IPR/IPM). Recall: `prism_knowledge:tribal_search {slot:"whiskey"}`; offline fallback `node scripts/query-lathe-tribal.mjs`. The 9 physics-gotcha feedback memories above are the durable mirror (qdrant-down resilient).

## ✅ Validation (is this index current?)
- Wiki: `ls knowledge/wiki/architecture/ | grep -iE "lathe|turn|okuma"` (12 entries) — point Grep at files BY NAME (gitignored, per [[feedback_gitignored_wiki_needs_byname_grep]]).
- Memories: `ls C:/…/memory/ | grep -iE "whiskey|lathe|okuma"` (~57).
- Auto-invoke: `grep -c whiskey-lathe-context-inject {C:,H:}/.claude/settings.json` (1 each).

## Related
- Galaxy brain: [[lathe-galaxy]] · CLAUDE.md · MEMORY.md · PATHS.md · TOOLBELT.md · GSD.md (this is the 6th)
