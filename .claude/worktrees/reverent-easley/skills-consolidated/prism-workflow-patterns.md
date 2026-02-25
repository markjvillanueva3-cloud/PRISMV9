# PRISM Workflow Patterns — v2.0
# 15 dispatcher chain patterns for common manufacturing scenarios
# Use: Quick-reference for which dispatchers to chain in what order

## 1. Session Boot
```
prism:prism_dev action=session_boot → prism:prism_context action=todo_update
```

## 2. Manufacturing Query (material → calc → safety)
```
prism:prism_data action=material_search  params={query:"Ti-6Al-4V"}
→ prism:prism_calc action=cutting_force  params={material from above, depth, feed, speed}
→ prism:prism_safety action=check_spindle_power  params={required_power, spindle_max}
→ prism:prism_data action=alarm_decode  params={code, controller} (if alarm triggered)
```

## 3. Full Part Setup (material → toolpath → threading → safety)
```
prism:prism_data action=material_get  → get material properties
prism:prism_data action=tool_recommend  → select cutting tool for operation
prism:prism_toolpath action=strategy_select  → pick toolpath strategy
prism:prism_toolpath action=params_calculate  → get speeds/feeds for strategy
prism:prism_calc action=cutting_force  → verify forces within limits
prism:prism_safety action=check_spindle_power  → verify machine can handle it
prism:prism_safety action=validate_workholding_setup  → verify clamping
prism:prism_thread action=calculate_tap_drill  → if threading needed
prism:prism_thread action=generate_thread_gcode  → generate G-code
```

## 4. Debug Workflow
```
prism:prism_sp action=debug  params={phase:"evidence", context:"..."}
→ prism:prism_guard action=error_capture  params={error, context}
→ prism:prism_guard action=failure_library  params={action:"search", pattern:"..."}
→ prism:prism_sp action=debug  params={phase:"root_cause"}
→ FIX → prism:prism_dev action=build
```

## 5. Build & Deploy
```
prism:prism_dev action=build → PASS/FAIL
→ Restart Claude Desktop
→ Phase checklist: skills → hooks → GSD → memories → orchestrators → state → scripts
```

## 6. Validation Chain (material quality → overall → anti-regression)
```
prism:prism_validate action=material  params={material_id}
→ prism:prism_validate action=kienzle  params={material_id}
→ prism:prism_validate action=taylor  params={material_id}
→ prism:prism_omega action=compute  params={target, scores}
→ prism:prism_validate action=anti_regression  params={old_count, new_count}
```

## 7. Safety-Critical Chain (collision → spindle → tool → workholding)
```
prism:prism_safety action=check_toolpath_collision  → collision check
→ prism:prism_safety action=check_spindle_power  → power envelope
→ prism:prism_safety action=check_spindle_torque  → torque limits
→ prism:prism_safety action=predict_tool_breakage  → tool risk
→ prism:prism_safety action=validate_workholding_setup  → clamp adequacy
→ prism:prism_safety action=validate_coolant_flow  → chip evac/cooling
ALL must pass S(x) ≥ 0.70 or HARD BLOCK
```

## 8. Session End
```
prism:prism_session action=state_save → persist full state
→ prism:prism_doc action=write  params={name:"ACTION_TRACKER.md", content:"..."}
→ prism:prism_context action=todo_update → final anchor
```

## 9. Knowledge Query & Orchestration
```
prism:prism_knowledge action=search  params={query:"...", registries:[...]}
→ prism:prism_skill_script action=skill_find_for_task  params={task:"..."}
→ prism:prism_skill_script action=script_recommend  params={task:"..."}
→ prism:prism_orchestrate action=agent_execute  (if complex multi-step)
```

## 10. Quality Gate Chain (Ralph → Omega → Evidence → Gates)
```
prism:prism_ralph action=loop  params={target, content} (LIVE API required)
→ prism:prism_omega action=compute  params={target, scores}
→ prism:prism_sp action=evidence_level  params={claim, evidence}
→ prism:prism_sp action=validate_gates_full  params={...}
All gates must pass: S(x)≥0.70, Ω≥0.70, Evidence≥L3
```

## Audit Mode
```
prism:prism_autopilot_d action=registry_status → what's loaded
→ prism:prism_autopilot_d action=working_tools → what's callable
→ prism:prism_dev action=code_search  params={pattern, scope}
→ Compare: loaded vs wired vs functional → report gaps
```

## Wire Mode (connect existing code to MCP)
```
prism:prism_dev action=file_read  params={path:"src/tools/source.ts"}
→ Write registerXTools() JS to dist/tools/
→ Import in dist/index.js
→ prism:prism_dev action=build → test
```

## 11. Compliance Provisioning (F8 → F4 signed audits)
```
prism:prism_compliance action=list_templates → see available frameworks
→ prism:prism_compliance action=apply_template  params={template_id:"iso_13485", disclaimer_acknowledged:true}
→ prism:prism_compliance action=check_compliance  params={template_id:"iso_13485"}
→ prism:prism_compliance action=gap_analysis  params={template_id:"iso_13485"}
→ (Auto: synergyComplianceAudit fires every 25 calls, signs with CertificateEngine)
```

## 12. Natural Language Hook Creation (F6)
```
prism:prism_nl_hook action=create  params={description:"Block any cutting speed above 500 m/min for titanium"}
→ (Auto: parse → compile → validate → sandbox → deploy)
→ prism:prism_nl_hook action=list  params={status:"pending"} → review
→ prism:prism_nl_hook action=approve  params={hook_id:"nlh_xxx"}
```

## 13. Multi-Tenant + Shared Learning (F5)
```
prism:prism_tenant action=create  params={name:"Shop Floor A"}
→ prism:prism_tenant action=get_context  params={tenant_id:"..."}
→ prism:prism_tenant action=publish_pattern  params={tenant_id, type:"optimization", data:{...}, confidence:0.8}
→ prism:prism_tenant action=consume_patterns  params={tenant_id, type:"optimization"}
→ prism:prism_tenant action=promote_pattern  params={pattern_id:"..."} (if locally confirmed)
```

## 14. API Gateway Setup (F7)
```
prism:prism_bridge action=create_key  params={name:"shop-floor-api", scopes:["prism_calc:*", "prism_data:*"]}
→ prism:prism_bridge action=register_endpoint  params={protocol:"rest", path:"/api/cutting-force", dispatcher:"prism_calc", action:"cutting_force"}
→ prism:prism_bridge action=route_map → view all routes
→ prism:prism_bridge action=health → verify status
```

## 15. System Health Deep Dive (F1 + F3 + cross-engine)
```
prism:prism_telemetry action=get_dashboard → overall metrics
→ prism:prism_telemetry action=get_anomalies → detect outliers
→ prism:prism_pfp action=get_dashboard → failure predictions
→ prism:prism_pfp action=assess_risk  params={dispatcher:"prism_calc", action:"cutting_force"}
→ prism:prism_memory action=get_health → graph integrity
→ (Auto: synergyCrossEngineHealth fires every 15 calls)
```
