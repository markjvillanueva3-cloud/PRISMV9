# CAD Galaxy TOOLBELT.md — tool-call efficiency for slot:delta

> Memoized Grep/Glob/Bash/Read/git/dispatcher patterns delta reaches for most. Each entry saves tokens or time vs. the naive alternative. Sourced from [[reference_delta_cad_toolchain_session_2026_05_27]].

## prism_* dispatcher actions used most (route BEFORE Grep — soul: route-before-grep)
- `prism_session:master_index_query keyword="cad"` | ranked top-K vs 110K-node graph | beats `grep -r CAD engines/` (10-50K tokens raw)
- `prism_cad:feature_recognize` | recognize features from geometry | don't reimplement
- `prism_cad:geometry_create` / `mesh_generate` / `assembly_analyze` | core ops | 564 actions available
- `prism_knowledge:tribal_search slot=delta` | surface CAD tribal tips | beats grep over corpus jsonl
- `prism_knowledge:tribal_capture {slot:'delta', tip, context, citation}` | record learning | NEVER write knowledge/tribal/cad-*.md directly (regen-overwritten)
- `prism_memory:semantic_search query="cad STEP ..." topK=20` | recall master brain | the PULL leg
- `octopus consensus (/octopus · MultiModelConsensusEngine)` | when `feature_recognize` confidence is low or returns conflicting interpretations (≥2 model passes → corroborated feature set; also STEP-vs-IGES unit-interpretation disputes) | dissent ledger `state/shared/octopus-outcomes/cad.jsonl` — PSN-octopus Wave-3 (papa 2026-06-09, per GALAXY-SYNERGY-MATRIX)

## CAD skills (slash-commands — the skills leg; route a CAD task to the matching skill before hand-rolling)
**delta-built (high-ROI, also surfaced by `delta-cad-awareness-inject`):** `/cad-electrode-delta` (STEP analyze / replicate-at-dims / parametric trilobe) · `/cad-to-desktop` (source+regen+topology+STL trio to Desktop) · `/cad-regen` (regen smoke vs CAD FILES corpus) · `/cad-fusion-verify` (Fusion visual-verify checklist)
**generic CAD (16):** `/cad-corpus` · `/cad-dfm` · `/cad-dfm-generate` · `/cad-explain` · `/cad-extract` · `/cad-feature-recognize` · `/cad-from-blueprint` · `/cad-from-photo` · `/cad-from-text` · `/cad-rag` · `/cad-review` · `/cad-search` · `/cad-tolerance` · `/cad-tolerance-check` · `/cad-train` · `/cad-validate`
**blueprint/OCR adjacents:** `/blueprint-read` · `/pdf-learn` (print→PRISM components)

## Grep patterns
- `CAD\w+Engine` | `mcp-server/src/engines/` | ~50 hits | locate a CAD engine by family
- `emitMultiPrismStep\|emitMultiSmoothPrismStep` | `scripts/lib/` | 2 files | proven-vs-regression emitter
- `CONVERSION_BASED_UNIT` | `scripts/lib/cad-step-*.mjs` | the inch/mm unit fix sites
- `B_SPLINE_CURVE_WITH_KNOTS` | `scripts/lib/` | periodic-knot regression sites (§6 known-failure)

## Glob patterns
- `mcp-server/src/engines/CAD*.ts` | ~50 files | every CAD engine
- `scripts/lib/cad-step-*.mjs` | parser/emitter/scaler trio
- `state/shared/cad-generated/*.step` | 70 synthesized fleet files
- `H:/PRISM/JM DIE/**/*.step` | 1,154 reference STEP (heavy — narrow by customer folder first)

## Bash one-liners (RTK-wrapped where applicable)
- `node scripts/cad-analyze-step.mjs <f.step>` | inspect schema/entities/coords/radii | beats opening a 30K STEP in Read
- `node scripts/cad-generate-ejot-electrode-exact.mjs` | regen canonical EJOT electrode | deterministic
- `node scripts/cad-replicate-from-template.mjs <ref> --target-peak-radius R --target-length L --out o.step` | scale any ref
- `rtk git diff --stat scripts/lib/` | compact diff of toolchain libs | 80% savings
- `node -e "console.log(require('H:/prism/mcp-server/data/state/CAD_COVERAGE_MATRIX.json').coveragePct)"` | one-field read vs full JSON

## Read offset+limit cheatsheet
- `CAD_COVERAGE_MATRIX.json` | use `node -e require().<field>` | full file is large
- ENGINE_DIGEST.md / domain-map memory | prefer `master_index_query` | 10-50K raw
- Any `.step` file | use `cad-analyze-step.mjs` not Read | STEP is verbose; the analyzer summarizes
- `cad-assembly-synthesize-lib.mjs` | offset to the op you need; 38 primitives, large file

## git common commands (RTK-wrapped, slot/delta worktree)
- `rtk git status` | compact | 59%
- `rtk git log --oneline -10` | recent [delta] commits | 60%
- `rtk git add mcp-server/src/engines/cad/ && rtk git commit -m "[delta] ..."` | slot-routed
- Never `git stash` in shared H:/prism (clobbers peers) — use `git show <ref>:<path>`

## Test commands (validate "tested" gate)
```bash
cd H:/prism-slot-delta
node --test scripts/lib/cad-step-roundtrip.test.mjs          # 8 round-trip identity
node --test scripts/lib/cad-assembly-synthesize-lib.test.mjs # 38-primitive synth (137+ cases)
node --test scripts/lib/cad-step-ap242-emitter.test.mjs      # emitter validity
cd mcp-server && npx vitest run -t "CAD"                      # engine tests
```

## Worktree discipline (slot:delta)
- `pwd` → `H:/prism-slot-delta` · `git branch --show-current` → `slot/delta`
- Commits route to slot worktree; golf integrates `slot/delta` → `cad-fusion-live-ms0`
- main-tree `cad/CLAUDE.md`+`MEMORY.md` are stale stubs this galaxy supersedes (golf reconciles at merge)

_Maintained by slot:delta. Last: 2026-05-29 (added CAD skills-leg section — 4 delta-built + 16 generic cad-* skills)._

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** Fusion 360, SolidWorks, Inventor 2027, FreeCAD, DWG TrueView 2027. Live corpus + versions: [[primary-domain-resource-map]] (keep-fresh cadence there).
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[cad-foundations]] / [[cad-source-atlas]] / [[cad-applied-practice]] / [[cad-advanced-techniques]].
- **This domain's local resource trove (resources/ + JM DIE/ subdirs, easy access):** [[primary-domain-resource-map]] (owner: delta). Cutting numerics (SFM/IPR/chip-load/Kienzle/Taylor) are NEVER inlined -- import from mcp-server/src/physics/constants.ts.
<!-- /OPERATIONAL-CONTEXT -->
