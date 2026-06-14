---
name: college-course-autogen-specs-2026-05-24
description: PSN-synergized auto-spec generator for ALL college/training courses under H:/PRISM/resources. 96 AUTOGEN-SPEC.md + master index + /college-extract execution skill + system-viz roost + wiki + GNN-feeder. Closes /goal "auto generate skills/scripts/hooks/engines/algorithms/formulas/nodes + synergize PSN and Prism App".
aliases: reference_college_course_autogen_specs_2026_05_24
type: reference
slot: india
source: prism-memory
synced: 2026-06-09T14:54:09.069Z
---


# College-course AUTOGEN specs — PSN-synergized inventory (2026-05-24)

## What shipped (slot:india iter15, commit `fa0c809c1c`)

Full execution-loop pair for the 96 cataloged college/training courses under
`H:/PRISM/resources`. Generator + execution-loop + system-viz roost + wiki +
memory + future GNN-feed — every PSN leg either auto-feeds or has a named
lima follow-up.

Path | Role
---|---
`scripts/auto-college-course-spec-emit.mjs` | Auto-discovers + emits per-course AUTOGEN-SPEC.md
`scripts/generate-college-course-features.mjs` | Emits system-viz augmentation
`scripts/generate-college-course-features.test.mjs` | 12/12 PASS
`state/shared/college-course-specs/AUTOGEN-SPEC-*.md` | 96 per-course build blueprints
`state/shared/COLLEGE-COURSE-AUTOGEN-INDEX-2026-05-24.md` | Master index (kind+source+slug table)
`state/shared/system-viz/college-course-augmentation.json` | 1 roost + 96 course nodes for /system-viz
`.claude/commands/college-extract.md` | On-disk skill (gitignored), drives per-course execution
`knowledge/wiki/architecture/college-course-autogen-specs.md` | Wiki entry, PSN map

## Why this matters

The user's standing goal "extract all data from all college courses in h drive
+ auto generate skills/scripts/hooks/engines/algorithms/formulas/nodes +
synergize with all logical nodes, PSN and Prism App" requires two pieces:
(a) the **inventory** (what to extract) and (b) the **execution loop** (how
each extraction wires to PSN). PRISM's COMPREHENSIVE-BUILD hook blocks stubs
at file-write time — so the generator emits build *blueprints* (advisory +
must_human_verify), not auto-builds, and the `/college-extract` skill drives
real per-course extraction + wiring on demand.

## PSN wiring status (per leg)

| Leg | Mechanism | Status |
|---|---|---|
| Obsidian brain | THIS file (auto-fed every Stop) | ✅ live |
| PRISM OS | future `os_college_course_list` action | 📝 lima |
| Wiki | `knowledge/wiki/architecture/college-course-autogen-specs.md` + per-course entries | ✅ live (architecture entry this commit) |
| Memories | per-course `reference_<slug>_live_extracted_<date>.md` | 📝 lima emits per extraction |
| Tribal | course formulas → KnowledgeTip[] ([[reference_knowledge_conversion_ms0_2026_05_17|Knowledge-Conversion-MS0]] lane A) | 📝 lima emits per extraction |
| System Viz | `ghost.college_courses` (L8) + 96 children (L9) — `generate-college-course-features.mjs` | ✅ live |
| Engines | per-spec named engines built via /college-extract (NOT stubbed) | 📝 lima on-demand |
| Algorithms | per-spec named algorithms | 📝 lima on-demand |
| Formulas | per-spec named formula sets | 📝 lima on-demand |
| NN/GNN | course nodes feed `node-embeddings-768d.jsonl`; next nn-graph retrain auto-picks up | 📝 auto on next retrain |
| PRISM AI | `prism_ai:ai_resource_training_data` consumes spec dir | 📝 needs lima action wire |

## Lessons + apply

- **Advisory-not-build is forced by COMPREHENSIVE-BUILD enforcement.** When
  the user asks to "auto generate engines/algorithms/formulas", the doctrinally
  correct answer is a spec emitter + an execution skill — never a stub forge.
  PRISM hooks will block the stub path; users see a degraded experience.
- **System-viz augmentation pattern is canonical** (`generate-*-features.mjs`
  → `state/shared/system-viz/<name>-augmentation.json` → registered in
  `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice). Use it whenever
  you have an inventory that should render as a `/system-viz` roost.
- **Test files reveal `.replace()` vs `.replaceAll()` bugs early** — caught
  this session by test 11. `.replace(needle, repl)` replaces FIRST occurrence
  only; long sample bodies with the same token in two places will hide bugs.
  Always use `.replaceAll()` when seeding test fixtures.
- **Shared-tree git-add race workaround is single-bash atomic chain**:
  `command git add X && command git commit ...` — peer commits cannot absorb
  files staged between two operations of the same bash chain. Used 4× this
  session; succeeded on iter15.

Related: [[reference_mit_ocw_resolver_joint_course_slug_bug_2026_05_23]] ·
[[reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23]] ·
[[reference_mit_courses_goal_scope_handoff_2026_05_23]] ·
[[feedback_commit_prefix_main_on_shared_tree]] ·
[[feedback_psn_definition]]
