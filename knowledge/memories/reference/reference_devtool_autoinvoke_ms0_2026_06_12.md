---
name: reference_devtool_autoinvoke_ms0_2026_06_12
description: DEVTOOL-AUTOINVOKE-MS0 — made slash commands exploit ollama/system-viz/obsidian/hermes/loops; ultracode 9-agent assessment found the auto-invoke infra is OVER-supplied (44% of proposals were redundant/already-built)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.552Z
aliases: reference_devtool_autoinvoke_ms0_2026_06_12
---


**DEVTOOL-AUTOINVOKE-MS0** (2026-06-12, slot:tango). Operator: "make all 735 slash commands auto-invoke Ollama/system-viz/Obsidian/Hermes/loops at dev decision points, EXTEND not rebuild, emphasis on Ollama offload + Blackwell." Spec: `state/shared/specs/DEVTOOL-AUTOINVOKE-MS0-ASSESSMENT-2026-06-12.md` (canonical punch list + dedup rejections).

**Planned via ultracode** (9-agent Workflow `wf_a9765b61-578`: 4 inventory + 3-lens gap + adversarial dedup + synthesis).

**KEY FINDING: the auto-invocation infrastructure is OVER-supplied, not missing.** Under-utilization has 3 failure modes — (1) built-but-unwired, (2) wired-but-coverage-gap, (3) command-body-doesnt-anchor-the-capability (the OLLAMA-PIPELINE-MS0 root cause). NOT a missing-infra problem.

**Dedup caught 44% false gaps (the tango value):** 9 proposed -> 5 shipped, **4 REJECTED**. The assessment agents grepped literal strings + "is it wired?" without reading file headers / checking behavioral coverage:
- P3 obsidian-precheck-inject "wire it" -> REJECTED: duplicates `memory-relevance-inject` (already covers knowledge/memories/* + firing).
- U2/P9 goal-ship-report "wire it" -> REJECTED: its OWN HEADER says "operator-invoked, no hook wiring, per feedback_dont_wire_for_wiring_sake_2026_05_16." Intentionally unwired.
- U4/P6 pre-bash-graph-inject SEARCH_INTENT -> REJECTED: the hook ALREADY redirects search verbs to the graph; `audit-viz-first-inject` ALREADY auto-runs system-viz-query before grep. Grepped the string, not the behavior.
- U5/P8 cag domain-tag sidecar -> REJECTED: 2 session-domain-tag writers already exist.

**SHIPPED (5):**
- **U1** (commit `80f7c7a4f3`): forge-build Ollama triggers — `forge-engines/tests/schema/skills/wiring` route mechanical phases to local `qwen2.5-coder:32b` in `ollama-pipeline-injector` + `ollama-prewarm-on-pipeline` (both wired). Live-verified.
- **U3** (commit `923880ffb7`): `task-start-substrate-inject` Path B — planning-command branch (`/checkin /goal /propose-goal /rgs /pick-* /plan-build /smart`) fires the substrate matrix when NO active loop -> planning dev-situation gets auto-context universally (one mechanism, not 735 body edits). 12/12 tests, knob `PRISM_SUBSTRATE_INJECT_PLAN=0`.
- **U8** (LOCAL skills): `loop-decision.md` NEW skill surfaces `decidePlanningAction` (continue/rerank/replan/stop + thresholds) to every command, not just rgs6; + `checkin.md` loop-decision gate.
- **U6** (LOCAL skills): CONTEXT-PULL anchors in `dedup.md` (search-index-first) + `scrutinize.md` (free Ollama 4th-reviewer + Hermes fan-out). deep-search.md skipped (already had 10 refs).
- **U9** (LOCAL skill): `forge.md` phase-offload pointer. forge2-6 skipped (superseded by forge7).

**LESSON (reinforces tango law):** when an assessment flags an orphan/gap, read the file's OWN header for wiring-INTENT + check whether a SIBLING wired hook already provides the behavior — before building. "grep -c <string> = 0" is not proof of a gap; "is it wired? no" is not proof it SHOULD be. See [[feedback_dont_wire_for_wiring_sake_2026_05_16]], [[feedback_read_full_content_not_titles]]. Builds on [[reference_rgs_planning_loop_bridge_2026_06_11]] (the substrate router + loop core this surfaces) + [[reference_ollama_pipeline_ms0_2026_05_15]] (the offload-injector this extends).

**PROCESS GOTCHAS:** node heredoc (`node <<EOF`) WEDGES git-bash (exit-255 cascade) -- use a staging `.mjs` run via `node file.mjs`. Stale `slot/tango` binding (no worktree) mis-fires git-add-lane-guard -- commit via node-wrapper that re-points `chat-slots.tango.branch` -> real branch ([[feedback_lane_guard_no_worktree_misfire]]).
