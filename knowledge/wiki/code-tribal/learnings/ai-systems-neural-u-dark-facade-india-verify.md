# AI-SYSTEMS-NEURAL/U-DARK-FACADE-INDIA-VERIFY — [MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-DARK-FACADE-INDIA-VERIFY (slot:india): verified india's 13 dark actions into a fix-ready queue (4 clean)

**Commit:** `0e491a59d124` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T19:26:48-05:00
**Tags:** ai-systems-neural, u-dark-facade-india-verify, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-DARK-FACADE-INDIA-VERIFY (slot:india): verified india's 13 dark actions into a fix-ready queue (4 clean)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-DARK-FACADE-INDIA-VERIFY (slot:india): verified india's 13 dark actions into a fix-ready queue (4 clean)

Used the U-DARK-FACADE-AUDIT harness output + a verification agent (read the REAL
engine bodies, not the heuristic) to classify the 13 india-owned dark facade
actions (aiReasoning 4 + orchestration 9):
- CLEAN (4, ready to fix, real method verified):
  - uncertainty_pipeline_run -> propagate (instance-singleton; guard uncertain_params[]+stages[])
  - cross_domain_orchestrate -> planJob (static-class; guard features[].min(1) {id,type})
  - foresight_orchestrate -> reportFor (async instance-singleton; guard non-empty description)
  - wet_run_pilot_orchestrate -> pilotPromotionReadiness (positional-args (pilot_id, nowTs))
- AMBIGUOUS (4): mit_course_knowledge_query, sampling_plan_generate, roadmap_dag_build
  (each maps to >=2 real methods -> need a `type` discriminator); smart_tool_select
  (likely promotes to clean after reading SmartToolSelector + PipelineDecisionOrchestrator).
- NEEDS BUILD (4): machine_lora_base_info, print_corpus_orchestrate, operator_dashboard_orchestrate,
  rollback_plan_build (engine has no suitable callable / ctor broken).
- FALSE POSITIVE (1): tribal_explain (real explainTipRelevance exists; heuristic probed explain/run/generate).

Spec: state/shared/specs/DARK-FACADE-INDIA-FIXLIST-2026-06-23.md. The 4 clean are
india's next /loop fix targets (apply the recipe in
[[reference_dark_facade_action_class_2026_06_23]]: rewire + strict crash-guard
schema + mock-server real-path test). Cross-domain dark actions (calc/quality/cam/
turning/cad/auth) remain in the heuristic backlog for their owning slots to verify.

Read-only verification (no dispatcher/engine/schema edited this commit).
```

## Files touched (2)
- state/shared/specs/DARK-FACADE-INDIA-FIXLIST-2026-06-23.md | 39 +++++++++++++++++++++++++++++++++++++++
- 1 file changed, 39 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0e491a59d124`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-NEURAL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._