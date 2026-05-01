# PRISM Micro Reference v1.0
## 45 dispatchers | 1060 actions | 103 cadences | 182 engines | 136 hooks

## 6 LAWS
1. S(x)>=0.70 BLOCK  2. NO PLACEHOLDERS  3. NEW>=OLD  4. MCP FIRST  5. NO DUPLICATES  6. 100% UTILIZATION

## BOOT
START: prism_dev→session_boot THEN prism_context→todo_update
END: prism_session→state_save → prism_context→todo_update

## ROUTING
Calc → prism_calc (91) + prism_safety (29)
Intel → prism_intelligence (250)
Data → prism_data (14)
Session → prism_session (30)
Context → prism_context (18)
Quality → prism_validate (7) + prism_omega (5) + prism_ralph (3)
Orchestrate → prism_orchestrate (26) + prism_atcs (12) + prism_autonomous (8)
Dev → prism_dev (9) + prism_sp (19)

## MULTI-CHAT
Claim: prism_orchestrate→roadmap_claim  Release: prism_orchestrate→roadmap_release
Heartbeat: prism_orchestrate→roadmap_heartbeat  Status: prism_orchestrate→roadmap_list

## FULL REF
See GSD_QUICK.md for decision tree, formulas, layer architecture
