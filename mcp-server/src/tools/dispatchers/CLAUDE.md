# PRISM Dispatchers — Claude Code Context

## Dispatcher Conventions
- Every dispatcher file maps action strings to engine methods
- Pattern: `switch(action) { case "action_name": return engine.method(params) }`
- Parameter normalization happens in dispatcher, NOT engine
- All dispatchers registered in `src/tools/dispatchers/index.ts`

## Parameter Normalization Rules
- Accept both flat params AND nested `params.material`, `params.tool`, etc.
- Normalize to flat before passing to engine
- Convert units to SI internally (mm→m only when physics requires it)
- Validate required params exist, throw descriptive errors if missing

## Action Routing
- Each dispatcher has 5-30 actions
- Action names: snake_case (e.g., `material_get`, `speed_feed_calc`)
- Effort tier mapping: quick (<100ms), standard (<1s), intensive (<10s)
- Check `data/wiring/PRECISE_WIRING_D2F.json` for dispatcher→formula mapping

## 45 Dispatchers (684 verified actions — see MASTER_INDEX.md)
Manufacturing: prism_calc, prism_safety, prism_thread, prism_toolpath
Data: prism_data, prism_knowledge
Session: prism_session, prism_context, prism_dev
Quality: prism_validate, prism_omega, prism_ralph, prism_guard
Intelligence: prism_pfp, prism_memory, prism_telemetry
Orchestration: prism_orchestrate, prism_atcs, prism_autonomous, prism_autopilot_d
Enterprise: prism_compliance, prism_tenant, prism_bridge, prism_nl_hook
Dev: prism_sp, prism_skill_script, prism_doc, prism_hook
Code Gen: prism_generator, prism_gsd, prism_manus
+ 14 additional L6/L8/L9/L10 route dispatchers (see MASTER_INDEX.md for full list)

## Anti-Regression
- Before modifying any dispatcher: count existing actions
- After modification: new count >= old count
- Run `validate_anti_regression` before committing changes
