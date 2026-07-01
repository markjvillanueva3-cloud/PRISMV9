---
name: reference_lima_academy_awareness_surface_2026_05_29
description: lima's custom academy-domain awareness surface — scripts/academy-awareness.mjs + lima-academy-awareness-inject hook; live 3-leg + PSN-leg verdict.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.643Z
aliases: reference_lima_academy_awareness_surface_2026_05_29
---


slot:lima built a **custom academy-domain PRISM-awareness surface** (U-PSGB-LIMA-AUDIT, 2026-05-29) so the academy galaxy always opens with live domain context — the analogue to oscar's `sfc-awareness-snapshot.mjs` and india's `ai-training-awareness.mjs`.

**`scripts/academy-awareness.mjs`** (pure `gatherState`/`renderBlock`/`renderSnapshot`/`psnLegs` + CLI `--json`/`--snapshot`). Computes the LIVE academy state:
- **3-leg course pipeline** via syntax-agnostic `course-<id>` token-set diff across the three surfaces (data filenames / `CurriculumEngine.ts` / `mcp-server/web/src/data/academy.ts`). Gap classes: unwired (data-but-no-CurriculumEngine), no-web, orphanWired, orphanWeb, fullyShipped.
- **One-by-one PSN-leg verdict** 🟢synergized / 🟡partial / 🔴gap / ⚪N/A — where ⚪ means N/A-for-domain (R12 honesty): academy CONSUMES india's corpus and trains humans, so it owns NO NN/GNN/LoRA nodes by design — that is not a gap.
- Verdict (after the independent workflow audit added the Tribal leg): **🟢9/🟡0/🔴1/⚪1 MOSTLY-SYNERGIZED · 63/63 courses fully shipped (all 3 legs)**. The 🔴 is Tribal (below).

**Independent workflow audit (4 agents) — what my own surface MISSED (it over-reported 🟢):**
- **Tribal 🔴:** `academy` is NOT in `tribal-by-domain-inject.mjs` DOMAIN_MAP `{mill,lathe,wedm,cad,cam,backend-dev}` → the wired tribal hook can NEVER surface an academy tip for lima; 0 academy-tagged tribal entries exist. (My MEMORY.md's old "≥5 tribal captured" was FALSE — corrected.) Surface now reports this leg 🔴 honestly via a new Tribal leg + DOMAIN_MAP routability check.
- **5 dispatcher-UNWIRED engines** (verified, 0 prism_* refs): `MITCourse{Expansion,Integration,Knowledge,Registry}Engine` (→ wire prism_dev) + `VideoELearningAIEngine` (→ prism_knowledge). 3,746 LOC reachable by no MCP action.
- **2 phantom engines:** `EmployeeMachineDomainAcademy`/`EmployeeRoleAcademy` engine files DON'T EXIST — galaxy docs wrongly listed them ("18" engines → really **16**). Corrected across CLAUDE.md/MEMORY.md/wiki + dropped from the surface's ENGINE_RE.
- Code-review of the 3 new files: **PASS 3/3, no P0/P1**. Fixed P2 (missing-dir vs empty-dir → "source absent" not "0-as-fact").
- Queued next iters: add `academy` to DOMAIN_MAP + capture tips; wire the 5 engines.

**Bundled-file trap (caught in verification, the load-bearing fix):** `course-6-to-12-advanced.ts` packs courses 6..12 (a RANGE) and `course-14-15-16-electrode-robot-sinker.ts` packs 14,15,16 (an ENUMERATION). The first cut of `dataCourseIds` grabbed only the leading filename token → falsely reported 8 phantom "wired-but-no-data-file" drift courses every prompt. A tool that lies every prompt is worse than none. Fix: expand ranges (`to`/`thru`/`through` markers) + enumerations; `course-55-5axis` must NOT yield `course-5` (pure-numeric `/^\d+$/` segment test, stops at first topic word). 22 node:test cases incl. a real-tree regression oracle asserting courses 7,8,9,10,11,12,15,16 ARE in dataIds — locks the fix.

**Wiring:** `lima-academy-awareness-inject.mjs` (slot-gated UserPromptSubmit, no-op for 25/26 slots, resolves the generator via `../../scripts/`) + `lima-course-ship-guard.mjs` (PostToolUse) both wired in settings.json 2026-05-29 at **interim worktree paths** (`H:/prism-slot-lima/.claude/hooks/...`) — must FLIP to `H:/prism/.claude/hooks/` + `H:/prism/scripts/` once golf merges slot/lima→main (peer convention is main-tree absolute paths; wiring main-path before merge would emit fleet-wide module-not-found noise).

Knobs: `PRISM_LIMA_AWARENESS_DISABLE=1`, `PRISM_LIMA_COURSE_SHIP_GUARD_DISABLE=1`, `PRISM_ROOT`, `PRISM_MEMORY_DIR`. Durable snapshot: `state/shared/ACADEMY-AWARENESS.md`.

Related: [[reference_lima_academy_galaxy_2026_05_28]] · [[reference_lima_academy_three_leg_ship]] · [[reference_lima_branch_drift_academy]] · [[feedback_verify_actual_contract_not_proxy]] (the bundled-file false-drift was caught by verifying the real contract, not the proxy) · [[feedback_reflect_all_changes_post_update]].
