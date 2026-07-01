# PRISM Quick Reference v23.1
## 53 dispatchers | 1286 verified actions | 101 cadence auto-functions | 218 engines (150 exported) | 220 hooks
## All 95 milestones COMPLETE | See MASTER_INDEX.md for full reference

## SESSION LIFECYCLE
START: prism_dev→session_boot THEN prism_context→todo_update (2 calls, always)
WORK: Use dispatchers per task type (see DECISION TREE below)
BUILD: npm run build (esbuild, NEVER tsc) → gsd_sync auto-fires → Phase Checklist triggers
END: prism_session→state_save → prism_doc→append(ACTION_TRACKER.md) → prism_context→todo_update

## 6 LAWS (HARD RULES)
1. S(x)≥0.70 BLOCK — safety score must pass before any release
2. NO PLACEHOLDERS — every value real, complete, verified
3. NEW≥OLD — never lose data, actions, hooks, knowledge, line counts
4. MCP FIRST — use prism: dispatchers before Desktop Commander or bash
5. NO DUPLICATES — check before creating, one source of truth
6. 100% UTILIZATION — if it exists, use it everywhere

## DECISION TREE — What Tool For What Task (53 dispatchers)
### Core Manufacturing
Manufacturing calculation → prism_calc (75 actions) + prism_safety (29 actions)
Turning operations → prism_turning (7 actions) — SAFETY CRITICAL
Grinding operations → prism_grinding (6 actions) — SAFETY CRITICAL
CAM/Toolpath generation → prism_cam (14 actions) — SAFETY CRITICAL
5-axis kinematics → prism_5axis (5 actions) — SAFETY CRITICAL
EDM processes → prism_edm (4 actions)
Thread operations → prism_thread (13 actions)
Toolpath strategy → prism_toolpath (8 actions)
Process control/SPC → prism_process_control (6 actions)
### Data & Intelligence
Material/machine/tool data → prism_data (27 actions)
Intelligence/learning → prism_intelligence (49 core + 200 legacy forwarding)
Knowledge query → prism_knowledge (5 actions)
Knowledge extraction → prism_knowledge_ext (44 actions)
Shop practice → prism_shop_practice (12 actions)
Document learning → prism_doc_learn (5 actions)
### Quality & Safety
Quality/inspection → prism_quality (8 actions)
Validation → prism_validate (7) + prism_omega (5) + prism_ralph (3)
Machine live/adaptive → prism_machine_live (40 actions)
### Integration & Export
CAD integration → prism_cad (10 actions)
Export/post-process → prism_export (8 actions)
Scheduling → prism_scheduling (8 actions)
Industry standards → prism_industry (4 actions)
### Session & Infrastructure
Session management → prism_session (30 actions)
Context/attention → prism_context (18 actions)
Read/write docs → prism_doc (7 actions)
Find skills/scripts → prism_skill_script (23 actions)
Hook management → prism_hook (18 actions)
GSD/protocol reference → prism_gsd (6 actions)
Development workflow → prism_dev (9 actions) + prism_sp (19 actions)
Code generation → prism_generator (6 actions)
### Orchestration & Agents
Agent orchestration → prism_orchestrate (14 actions)
Autonomous tasks → prism_atcs (12 actions) + prism_autonomous (8 actions)
External research → prism_manus (11 actions)
Workflow orchestration → prism_autopilot_d (8 actions)
Reasoning/enforcement → prism_guard (14 actions)
### Infrastructure
System diagnostics → prism_telemetry (7) + prism_pfp (6) + prism_memory (6)
Natural language hooks → prism_nl_hook (8 actions)
Compliance templates → prism_compliance (8 actions)
Multi-tenant management → prism_tenant (15 actions)
Protocol bridge / API → prism_bridge (13 actions)
Automation → prism_automation (5 actions)
Auth management → prism_auth (8 actions)
Alarm decode/fix → prism_data alarm_decode/search/fix
L2 engine dispatch → prism_l2 (38 actions)
Diagnosis → prism_diagnosis (42 actions)
Integration → prism_integration (47 actions)
Product management → prism_product (44 actions)

## ORCHESTRATOR-FIRST — When to Use Automation vs Manual

### Complexity Routing:
SIMPLE (1-3 steps, single domain) → Manual sequence per Decision Tree above
MEDIUM (4-8 steps, multi-domain) → prism_autopilot_d→autopilot_quick (lightweight)
COMPLEX (8+ steps, brainstorm needed) → prism_autopilot_d→autopilot (full 6-phase pipeline)
MULTI-SESSION (spans context windows) → prism_atcs→task_init + prism_autonomous→auto_plan
PARALLEL (independent subtasks) → prism_orchestrate→swarm_parallel

### What AutoPilot Does (so you don't have to):
1. Loads GSD protocol (canonical v21.2+)
2. Loads current state (CURRENT_STATE.json)
3. Brainstorms with 7 parallel API calls (real, not canned)
4. Executes with real swarm deployment
5. Validates with 4-phase Ralph loop (real API)
6. Updates state, hooks, memories

### When NOT to use orchestrators:
- Quick data lookups (material_get, alarm_decode)
- Single calculations (speed_feed, cutting_force)
- File reads/writes (doc operations)
- Session management (boot, save, checkpoint)

## QUALITY GATES (Use in this order)
Quick check → prism_validate action=safety (is S(x)≥0.70?)
Code review → prism_ralph action=scrutinize (single validator pass)
Full validation → prism_ralph action=loop (4-phase: SCRUTINIZE→IMPROVE→VALIDATE→ASSESS)
Final assessment → prism_ralph action=assess (Opus-grade, use for releases)
Release readiness → prism_omega action=compute (Ω score, all components)

## AUTO-FIRE (zero cost, no calls needed)
@every-call: autoSkillHint, autoKnowledgeCrossQuery, autoScriptRecommend
@every-error: autoD3ErrorChain (extract→detect→store)
@every-success: autoD3LkgUpdate (last-known-good)
@5 calls: autoTodoRefresh (attention anchor)
@8 calls: autoContextPressure, autoAttentionScore, autoD4BatchTick
@10 calls: autoCheckpoint (state snapshot)
@12 calls: autoCompactionDetect (predict compaction risk)
@15 calls: autoCompactionSurvival, autoD4CacheCheck, autoD4DiffCheck
@20 calls: autoResponseVariation
@41+ calls: autoCompactionSurvival (second save)
@60%+ pressure: autoContextCompress + autoCompactionSurvival (third save)
@build-success: gsd_sync_v2.py (auto-updates tools.md and GSD_QUICK.md)
@file-write: autoDocAntiRegression (warn >30%, BLOCK >60% content loss)

## SKILL CREATION GATE v2.0 (HARD — always_apply)
Read C:\PRISM\skills-consolidated\skill-authoring-checklist\SKILL.md BEFORE writing any skill.
Key rules (v2.0 — anti-template enforcement):
- **Rule 0**: Single purpose. One function per skill. >8KB = probably split.
- **4 sections**: When/How/Returns/Examples — must be UNIQUE per skill, not templated.
- **Anti-template**: If operational sections could be swapped between skills, rewrite.
- **Real examples**: Actual numbers, materials, calculated outputs. Never "provide recommendation."
- **Batch limit**: 3-5 skills per session. Never auto-generate operational sections.
- **No enforcement hook exists yet** — this gate is prompt-level only (see roadmap R-SKILL).
Violation history: v1.0 checklist led to 115 identical template headers. v2.0 prevents this.

## BUFFER ZONES (ADVISORY ONLY — pressure governs, not call counts)
🟢0-20: Normal operation. Full 20KB responses.
🟡21-30: Plan upcoming checkpoint. Consider prism_session→auto_checkpoint.
🔴31-40: Checkpoint recommended. Verify todo is current.
⚫41+: Auto-save fires. Continue working — NO forced stops.
Caps: 20KB/12KB(60%+)/8KB(70%+)/5KB(85%+) — PRESSURE determines cap, not zone.

## COMPACTION RECOVERY (v21.1 — 3-layer automatic)
**L1 (_context)**: Every MCP response includes task/resume/next action. Always present, zero cost.
**L2 (_COMPACTION_RECOVERY)**: 5-call injection on 30s gap OR session_boot-mid-session.
**L3 (Aggressive hijack)**: First call after detection → response REPLACED with full recovery payload.
If you see `_COMPACTION_DETECTED: true` → follow `_MANDATORY_RECOVERY` instructions. DO NOT re-audit. DO NOT ask user.
Survival reads: ACTION_TRACKER pending items, RECENT_ACTIONS flight recorder, CURRENT_STATE quick_resume.
Transcripts: /mnt/transcripts/ (Claude container)

## EDITING PROTOCOL
READ file → edit_block/str_replace → VERIFY change
Never retype existing code. Append don't rewrite. State exact lines changed.
Plan first for >50 lines. Ask when ambiguous.
>30% doc reduction → warning. >60% doc reduction → BLOCKED.

## Changelog
- 2026-02-24: v23.0 — R0-P0 audit reconciliation. 32 dispatchers, 541 actions, 73 engines. Added prism_intelligence (238 actions) to decision tree. Fixed prism_guard→prism_ralph_loop. Updated all counts.
- 2026-02-17: v22.1 — Added SKILL_CREATION_GATE (hard gate, always_apply). Audit: 1/116 skills pass checklist. Remediation planned.
- 2026-02-13: v22.0 — F1-F8 complete. 31 dispatchers, 368 actions, 37 engines. Added nl_hook, compliance, tenant, bridge to decision tree. Synergy cadence (compliance@25, crossHealth@15).
- 2026-02-11: v21.2 — Verified audit: 324 actions (was ~279), 29 engines (was 26), 30 session actions (was 26). Added guard+autopilot to decision tree. MASTER_INDEX.md now truth source.
- 2026-02-10: v21.1 — Compaction recovery section added (3-layer system).
- 2026-02-10: v21.0 — Content-optimized. Decision tree added. Quality gate sequence. Full auto-fire schedule. Editing protocol.
- 2026-02-10: v20.0 — File-based GSD. Pressure-only caps. Advisory buffer zones.
- 2026-02-09: v19.0 — Buffer zone fix, telemetry rebuild.
