# DEVTOOL-AUTOINVOKE-MS0 — Assessment + Punch List

**Author:** slot:tango (claude-97872074) · **Date:** 2026-06-12 · **Status:** assessed (ultracode 9-agent Workflow `wf_a9765b61-578`), build in progress
**Goal (operator):** make all 735 slash commands auto-invoke Ollama / system-viz / Obsidian / Hermes / loops at dev decision points (searching, building, recalling, planning, problem-solving, context-gaining). EXTEND existing infra, never rebuild. Strong emphasis on Ollama offload + Blackwell hardware leverage.

## Core finding
The auto-invocation *infrastructure* is OVER-supplied (large hook layer + capability libs already exist). The under-utilization has 3 failure modes, NOT a missing-infra problem:
1. **Built-but-unwired** — a hook/script exists on disk but is in 0 settings.json (fires never).
2. **Coverage gaps in WIRED injectors** — a wired hook only triggers on a subset of the commands/situations it should.
3. **Command bodies don't anchor the capability** — the hook fires, but the command runbook the model re-derives from (post-/compact) never tells it to USE the surfaced context (the documented OLLAMA-PIPELINE-MS0 root cause).

## DEDUP REJECTIONS (verified false gaps — do NOT build)
- **P3 obsidian-precheck-inject wiring — REJECTED (tango deep-dedup, 2026-06-12).** The assessment flagged it "REAL-GAP, wire-don't-rebuild" (unwired in both settings). FALSE on deeper read: it scans `knowledge/memories/{feedback,reference,project,user}/` — the SAME dir `memory-relevance-inject` ALREADY covers (and that hook IS wired + firing every prompt as "Memory vault pre-search"). Its own docstring even lists `memory-relevance-inject -> knowledge/memories/*` as existing coverage. Wiring it would duplicate memory recall. The assessment agent checked "is it wired" but not "is its coverage already provided by another wired hook." LESSON: read the body + cross-check coverage, never wire on absence-of-wiring alone.
- forge-triple as a NEW ollama trigger — ALREADY at `ollama-pipeline-injector.mjs:135` + prewarm:41 (survives only as the narrowed 5-subcommand set, P1).
- verify-unit-ready.mjs as NEW — EXISTS + already consumed by wired `goal-prereq-inject.mjs:172`.
- goal-ship-report as NEVER-BUILT — EXISTS + tested; downgraded to wiring-only (P9).
- ollama-unified-semantic-router per-prompt wiring — self-rejected (adds always-on Ollama call; wiki lesson warns against it).
- **U2/P9 goal-ship-report wiring — REJECTED (tango deep-dedup, 2026-06-12).** The assessment flagged it "built-but-unwired -> wire it." FALSE: the file HEADER (scripts/goal-ship-report.mjs:18-19) states it is "Operator-invoked ... no hook wiring, per feedback_dont_wire_for_wiring_sake_2026_05_16." The orphan status is INTENTIONAL + doctrine-backed (user rule 2026-05-16: "dont wire just for the sake of wiring"). Wiring it would violate a standing rule. The agent checked "is it wired? no -> gap" without reading the header. LESSON (same class as P3): read the file's own wiring-intent before calling an orphan a gap.

- **U4/P6 pre-bash-graph-inject SEARCH_INTENT — REJECTED (redundant, 2026-06-12).** The hook ALREADY detects file-search verbs (grep/rg/find/cat/ls) and surfaces graph hits "before the shell search" (header lines 4-12); `audit-viz-first-inject` ALSO auto-runs `system-viz-query find` before Grep. The function exists under different naming; the proposal grepped the literal string `SEARCH_INTENT` (absent) not the behavior (present). The searching dev-situation is fully covered by 2 wired hooks + the pre-read/grep/write graph-inject siblings.
- **U5/P8 cag-cold-cache-anchor domain-tag sidecar — REJECTED (redundant, 2026-06-12).** `grep -rl session-domain-tag` = 2 writers already exist + `cag-router-inject` already emits domain. The sidecar the proposal wants is already built.

## SHIPPED
- **U1** (commit 80f7c7a4f3): forge-build ollama triggers (5 subcommands) in injector + prewarm. Live-verified.
- **U3** (commit 923880ffb7): task-start-substrate-inject Path B -- planning-command branch (/checkin /goal /propose-goal /rgs /pick-unit /pick-dev /plan-build /smart) fires the substrate matrix when NO active loop, so the planning dev-situation gets auto-context universally. Knob PRISM_SUBSTRATE_INJECT_PLAN=0. 12/12 tests (4 new Path B), no regression, already wired (UserPromptSubmit). The ONE-mechanism answer for "planning" -- no per-command body edits.
- **U8** (LOCAL skills, on disk): `.claude/commands/loop-decision.md` NEW skill surfacing `decidePlanningAction` (continue/rerank/replan/stop + thresholds) to every command, not just rgs6; + `checkin.md` loop-decision gate pointer at the autonomous-loop entry. Makes the shipped planning-loop core discoverable from the command surface.

- **U6** (LOCAL skills, on disk): CONTEXT-PULL anchors in `dedup.md` (search-the-index-before-grep, read-body-before-dup-call) + `scrutinize.md` (free local Ollama 4th-reviewer + Hermes per-file fan-out). deep-search.md SKIPPED (already had 10 capability refs -- proposal was wrong).
- **U9** (LOCAL skill, on disk): `forge.md` PHASE OFFLOAD pointer (routeForgePhase -> mechanical phases to qwen2.5-coder:32b, Opus for design/verify/safety only). forge2-6 SKIPPED (numbered iterations superseded by forge7, each with an archive twin -- editing them is box-ticking noise, not enhancement).

## OUTCOME (dedup-rigorous net)
9 proposed -> **5 SHIPPED (U1 offload-triggers, U3 planning-branch, U8 loop-decision-skill, U6 dedup/scrutinize body anchors, U9 forge offload pointer), 4 REJECTED on deep-dedup (P3 obsidian-dup, U2/P9 doctrine-violation, U4/P6 redundant, U5/P8 redundant).** The 44% rejection rate IS the tango value: assessment agents grepped literal strings + "is it wired" without reading file headers / checking behavioral coverage. Core finding (3 failure modes: built-but-unwired / wired-coverage-gap / body-doesnt-anchor) was sound; the genuine high-value gaps were U1 (offload coverage) + U3 (planning coverage) + U8 (capability surfacing). Hardware: all offload routes target local Blackwell models (gpt-oss:120b / qwen2.5-coder:32b), Ollama UP. **Punch list COMPLETE.**

## SURVIVING PUNCH LIST (ranked ROI/risk; all EXTEND a named asset)
| U | Prop | Type | Scope |
|---|------|------|-------|
| **U1** | P1 | extend 2 wired hooks | add 5 keys (`forge-engines`/`forge-tests`/`forge-schema`/`forge-skills`/`forge-wiring`) to `ollama-pipeline-injector.mjs` PIPELINE_TRIGGERS + `ollama-prewarm-on-pipeline.mjs` PIPELINE_MODELS. (forge-triple/forge7 already present — do NOT re-add.) |
| **U2** | P9 | wire existing script | wire `scripts/goal-ship-report.mjs` (built+tested, 0 refs) into the goal-complete path. |
| **U3** | P2 | extend wired hook | `task-start-substrate-inject.mjs` add Path B: planning-phase branch (`/checkin /goal /propose-goal /rgs` w/o active loop) -> `routeTask(phase='plan')`. Knob `PRISM_SUBSTRATE_INJECT_PLAN=0`. Currently hard-exits when no active loop (line 74). |
| **U4** | P6 | extend wired hook | `pre-bash-graph-inject.mjs` add SEARCH_INTENT_RX + prepend a SEARCH-FIRST redirect line (~20 lines; currently post-decision node-hint only). |
| **U5** | P8 | extend wired hook | `cag-cold-cache-anchor.mjs` append a 10-line zero-latency `session-domain-tag` sidecar writer (no new Ollama call). |
| **U6** | P4 | command-body text | CONTEXT-PULL / DECISION-GATE block in deep-search.md, dedup.md, deep-think.md, scrutinize.md (grep=0 capability refs). |
| **U7** | P5 | command-body text | CONTEXT-PULL preamble in wire-edm-studio.md, lathe-studio.md, mill-studio.md (grep=0). |
| **U8** | P7 | new skill + gate | `loop-decision.md` skill surfacing decidePlanningAction + checkin.md Step-12 loop gate (planning-loop invisible outside rgs6). |
| **U9** | P10 | command-body text | one-line forge-route cross-ref + constants in forge1-6.md (all default to Opus today). |

**Build order:** U1 -> U2 -> U3 -> U4 -> U5 -> U6/U7 -> U8 -> U9. Most leverage is HOOK/WIRING (auto-fires for ALL commands) not per-body edits. Hardware: route the forge mechanical phases to local gpt-oss:120b / qwen2.5-coder:32b (Blackwell 96GB, Ollama UP).

Full agent output: workflow `wf_a9765b61-578` (in transcript). Prior art extended: OLLAMA-PIPELINE-MS0, RGS-PLANNING-LOOP-BRIDGE-MS0/MS1 (substrate router), the utilization-audit memory.
