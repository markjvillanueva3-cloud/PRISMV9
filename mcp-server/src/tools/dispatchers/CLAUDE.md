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

## 31 Dispatchers
prism_data, prism_calc, prism_safety, prism_thread, prism_toolpath,
prism_knowledge, prism_skill_script, prism_hook, prism_session,
prism_orchestrate, prism_validate, prism_omega, prism_guard,
prism_context, prism_doc, prism_dev, prism_sp, prism_generator,
prism_manus, prism_gsd, prism_autopilot_d, prism_ralph,
prism_telemetry, prism_pfp, prism_memory, prism_nl_hook,
prism_compliance, prism_tenant, prism_bridge, prism_atcs, prism_autonomous

## Anti-Regression
- Before modifying any dispatcher: count existing actions
- After modification: new count >= old count
- Run `validate_anti_regression` before committing changes
