# AUTOPILOT ROUTING VERIFICATION — DA-MS3 Step 4
# Date: 2026-02-17

## Verified Working (24 tool groups across 5 categories)
- manufacturing: prism_data, prism_calc, prism_safety, prism_thread, prism_toolpath
- validation: prism_validate, prism_omega, prism_ralph
- session: prism_session, prism_context, prism_gsd
- development: prism_dev, prism_doc, prism_sp, prism_guard
- orchestration: prism_orchestrate, prism_autopilot_d, prism_manus, prism_atcs
- knowledge: prism_skill_script, prism_knowledge, prism_hook, prism_generator

## Also Available (infrastructure)
- prism_autonomous, prism_telemetry, prism_pfp, prism_memory
- prism_nl_hook, prism_compliance, prism_tenant, prism_bridge

## Key Commands (natural language → tool routing)
- "check health" → prism_session:health_check
- "build" → prism_dev:build
- "check registry" → prism_knowledge:stats
- "run safety check" → prism_safety:* or prism_validate:safety
- "save state" → prism_session:state_save
- "what's my position" → read CURRENT_POSITION.md via prism_doc or DC