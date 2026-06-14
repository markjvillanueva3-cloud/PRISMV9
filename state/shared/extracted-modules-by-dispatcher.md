# Extracted modules — by recommended dispatcher

Generated: 2026-05-26T17:10:30.216Z

Source: `state/shared/extracted-modules-classified.json` (1788 modules).
Per-dispatcher cap: top 15 WIRE + top 15 DATABASE by line count.

Operators picking work for a specific lane (e.g. lima for prism_cad-only): browse to the dispatcher heading below and pick the top WIRE_CANDIDATE.

## Summary

| Dispatcher | WIRE | DATABASE | Total lines (top-15 WIRE) |
|---|---:|---:|---:|
| n/a | 53 | 0 | 7,291 |
| prism_ai | 119 | 0 | 811,785 |
| prism_cad | 48 | 0 | 107,514 |
| prism_calc | 99 | 0 | 363,191 |
| prism_cam | 33 | 0 | 73,359 |
| prism_data | 59 | 208 | 268,362 |
| prism_dev | 810 | 0 | 1,477,858 |
| prism_session | 38 | 0 | 23,932 |

## n/a

### WIRE_CANDIDATE (top 15 of 53)

| Lines | Name | Path | Type |
|---:|---|---|---|
| 2,448 | PRISM_MIT_BATCH_16_TESTS | `extracted_modules/complete_extraction/PRISM_MIT_BATCH_16_TESTS.js` | test |
| 895 | SPEED_FEED_UI | `extracted/engines/SPEED_FEED_UI.js` | util |
| 709 | PRISM_UI_BACKEND_INTEGRATOR | `extracted_modules/complete_extraction/PRISM_UI_BACKEND_INTEGRATOR.js` | util |
| 348 | PRISM_UI_SYSTEM | `extracted/systems/PRISM_UI_SYSTEM.js` | util |
| 347 | PRISM_UI_SYSTEM | `extracted_modules/complete_extraction/PRISM_UI_SYSTEM.js` | util |
| 321 | PRISM_CONSTANTS_TEST | `extracted_modules/complete_extraction/PRISM_CONSTANTS_TEST.js` | test |
| 294 | PRISM_UI_BACKEND_INTEGRATOR | `extracted/systems/PRISM_UI_BACKEND_INTEGRATOR.js` | util |
| 265 | PRISM_PHASE3_SELF_TEST | `extracted_modules/complete_extraction/PRISM_PHASE3_SELF_TEST.js` | test |
| 263 | PRISM_UI_ADAPTER | `extracted/systems/PRISM_UI_ADAPTER.js` | util |
| 262 | PRISM_UI_ADAPTER | `extracted_modules/complete_extraction/PRISM_UI_ADAPTER.js` | util |
| 243 | PRISM_PHASE2_SELF_TEST | `extracted_modules/complete_extraction/PRISM_PHASE2_SELF_TEST.js` | test |
| 241 | PRISM_SESSION5_EXTENDED_V3_TESTS | `extracted_modules/complete_extraction/PRISM_SESSION5_EXTENDED_V3_TESTS.js` | test |
| 227 | PRISM_PHASE1_SELF_TEST | `extracted_modules/complete_extraction/PRISM_PHASE1_SELF_TEST.js` | test |
| 215 | PRISM_TEST_FRAMEWORK | `extracted_modules/complete_extraction/PRISM_TEST_FRAMEWORK.js` | test |
| 213 | PRISM_SESSION2B_TESTS | `extracted_modules/complete_extraction/PRISM_SESSION2B_TESTS.js` | test |

## prism_ai

### WIRE_CANDIDATE (top 15 of 119)

| Lines | Name | Path | Type |
|---:|---|---|---|
| 204,004 | PRISM_AI_EXPERT_INTEGRATION | `extracted_modules/GIANT/PRISM_AI_EXPERT_INTEGRATION.js` | ai_ml |
| 186,368 | PRISM_AI_100_KB_CONNECTOR | `extracted_modules/GIANT/PRISM_AI_100_KB_CONNECTOR.js` | ai_ml |
| 146,622 | PRISM_PHASE6_DEEPLEARNING | `extracted_modules/ULTRA/PRISM_PHASE6_DEEPLEARNING.js` | ai_ml |
| 61,970 | M_STAINLESS_complete | `extracted/materials_complete/M_STAINLESS/M_STAINLESS_complete.js` | ai_ml |
| 52,070 | PRISM_ML | `extracted_modules/MEGA/PRISM_ML.js` | ai_ml |
| 28,573 | HEIDENHAIN_ALARMS_MASTER | `extracted/controllers/alarms/HEIDENHAIN_ALARMS_MASTER.json` | ai_ml |
| 20,278 | PRISM_XAI_ENHANCED | `extracted_modules/MEGA/PRISM_XAI_ENHANCED.js` | ai_ml |
| 18,595 | stainless_steels_051_100_enhanced | `extracted/materials_enhanced/M_STAINLESS/stainless_steels_051_100_enhanced.js` | ai_ml |
| 18,243 | stainless_steels_051_100 | `extracted/materials/M_STAINLESS/stainless_steels_051_100.js` | ai_ml |
| 17,797 | stainless_steels_001_050 | `extracted/materials/M_STAINLESS/stainless_steels_001_050.js` | ai_ml |
| 15,616 | stainless_steels_001_050_enhanced | `extracted/materials_enhanced/M_STAINLESS/stainless_steels_001_050_enhanced.js` | ai_ml |
| 11,198 | stainless_conditions_generated | `extracted/materials/M_STAINLESS/stainless_conditions_generated.js` | ai_ml |
| 10,905 | HEIDENHAIN_ALARMS_COMPLETE | `extracted/controllers/alarms/archive/HEIDENHAIN_ALARMS_COMPLETE.json` | ai_ml |
| 10,905 | HEIDENHAIN_ALARMS_COMPLETE | `extracted/controllers/alarms/HEIDENHAIN_ALARMS_COMPLETE.json` | ai_ml |
| 8,641 | PRISM_BAYESIAN_LEARNING | `extracted_modules/COMPLETE/PRISM_BAYESIAN_LEARNING.js` | ai_ml |

## prism_cad

### WIRE_CANDIDATE (top 15 of 48)

| Lines | Name | Path | Type |
|---:|---|---|---|
| 66,508 | PRISM_ENHANCED_CAD_KERNEL | `extracted_modules/ULTRA/PRISM_ENHANCED_CAD_KERNEL.js` | geometry |
| 22,121 | PRISM_ADVANCED_GEOMETRY | `extracted_modules/MEGA/PRISM_ADVANCED_GEOMETRY.js` | geometry |
| 5,041 | PRISM_CAD_KERNEL_PASS2 | `extracted_modules/complete_extraction/PRISM_CAD_KERNEL_PASS2.js` | geometry |
| 2,971 | PRISM_COMPUTATIONAL_GEOMETRY | `extracted_modules/geometry_engines/PRISM_COMPUTATIONAL_GEOMETRY.js` | geometry |
| 1,546 | PRISM_WORKHOLDING_GEOMETRY_EXTENDED | `extracted_modules/complete_extraction/PRISM_WORKHOLDING_GEOMETRY_EXTENDED.js` | geometry |
| 1,294 | PRISM_BREP_CAD_GENERATOR_V2 | `extracted/engines/cad_cam/PRISM_BREP_CAD_GENERATOR_V2.js` | geometry |
| 1,285 | PRISM_BREP_CAD_GENERATOR_V2 | `extracted_modules/complete_extraction/PRISM_BREP_CAD_GENERATOR_V2.js` | geometry |
| 1,185 | PRISM_WORKHOLDING_GEOMETRY | `extracted_modules/complete_extraction/PRISM_WORKHOLDING_GEOMETRY.js` | geometry |
| 1,157 | PRISM_EXPANDED_CAD_CAM_LIBRARY | `extracted_modules/ULTRA/PRISM_EXPANDED_CAD_CAM_LIBRARY.js` | geometry |
| 998 | PRISM_STEP_PARSER_ENHANCED | `extracted_modules/geometry_engines/PRISM_STEP_PARSER_ENHANCED.js` | geometry |
| 928 | PRISM_STEP_TO_MESH_KERNEL | `extracted_modules/complete_extraction/PRISM_STEP_TO_MESH_KERNEL.js` | geometry |
| 716 | PRISM_ENHANCED_CAD_KERNEL | `extracted_modules/complete_extraction/PRISM_ENHANCED_CAD_KERNEL.js` | geometry |
| 627 | PRISM_STEP_PARSER_100 | `extracted_modules/complete_extraction/PRISM_STEP_PARSER_100.js` | geometry |
| 569 | PRISM_EXPANDED_CAD_CAM_LIBRARY | `extracted_modules/complete_extraction/PRISM_EXPANDED_CAD_CAM_LIBRARY.js` | geometry |
| 568 | PRISM_CAD_CAM_INTEGRATION_HUB | `extracted/engines/cad_cam/PRISM_CAD_CAM_INTEGRATION_HUB.js` | geometry |

## prism_calc

### WIRE_CANDIDATE (top 15 of 99)

| Lines | Name | Path | Type |
|---:|---|---|---|
| 214,580 | PRISM_PSO_OPTIMIZER | `extracted_modules/GIANT/PRISM_PSO_OPTIMIZER.js` | algorithm |
| 59,132 | PRISM_CUTTING_TOOL_EXPANSION_V3 | `extracted_modules/ULTRA/PRISM_CUTTING_TOOL_EXPANSION_V3.js` | physics |
| 27,213 | PRISM_CONSTRAINED_OPTIMIZATION_ENHANCED | `extracted_modules/MEGA/PRISM_CONSTRAINED_OPTIMIZATION_ENHANCED.js` | algorithm |
| 17,078 | PRISM_ALGORITHM_STRATEGIES | `extracted_modules/MEGA/PRISM_ALGORITHM_STRATEGIES.js` | algorithm |
| 13,583 | PRISM_CORE_ALGORITHMS | `extracted_modules/MEGA/PRISM_CORE_ALGORITHMS.js` | algorithm |
| 4,937 | PRISM_UNIVERSITY_ALGORITHMS | `extracted/mit/PRISM_UNIVERSITY_ALGORITHMS.js` | algorithm |
| 4,936 | PRISM_UNIVERSITY_ALGORITHMS | `extracted/knowledge_bases/PRISM_UNIVERSITY_ALGORITHMS.js` | algorithm |
| 4,928 | PRISM_UNIVERSITY_ALGORITHMS | `extracted_modules/COMPLETE/PRISM_UNIVERSITY_ALGORITHMS.js` | algorithm |
| 3,939 | PRISM_COMBINATORIAL_OPTIMIZER | `extracted/engines/optimization/PRISM_COMBINATORIAL_OPTIMIZER.js` | algorithm |
| 3,931 | PRISM_COMBINATORIAL_OPTIMIZER | `extracted_modules/COMPLETE/PRISM_COMBINATORIAL_OPTIMIZER.js` | algorithm |
| 2,214 | ALGORITHM_LIBRARY | `extracted/algorithms/ALGORITHM_LIBRARY.js` | algorithm |
| 2,214 | COMPLETE_TOOLPATH_ALGORITHM_LIBRARY | `extracted/algorithms/COMPLETE_TOOLPATH_ALGORITHM_LIBRARY.js` | algorithm |
| 1,826 | PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER | `extracted/engines/optimization/PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.js` | algorithm |
| 1,817 | PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER | `extracted_modules/COMPLETE/PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.js` | algorithm |
| 863 | PRISM_PSO_OPTIMIZER | `extracted/engines/ai_ml/PRISM_PSO_OPTIMIZER.js` | algorithm |

## prism_cam

### WIRE_CANDIDATE (top 15 of 33)

| Lines | Name | Path | Type |
|---:|---|---|---|
| 61,602 | PRISM_CAM_WORKFLOW | `extracted_modules/ULTRA/PRISM_CAM_WORKFLOW.js` | cam |
| 1,446 | PRISM_HYBRID_TOOLPATH_SYNTHESIZER | `extracted_modules/priority_extraction/PRISM_HYBRID_TOOLPATH_SYNTHESIZER.js` | cam |
| 1,238 | PRISM_CAM_KERNEL_COMPLETE | `extracted/engines/cad_cam/PRISM_CAM_KERNEL_COMPLETE.js` | cam |
| 1,205 | POST_PROCESSOR_100_PERCENT | `extracted/engines/post_processor/POST_PROCESSOR_100_PERCENT.js` | cam |
| 1,122 | PRISM_UNIVERSAL_POST_GENERATOR_V2 | `extracted_modules/complete_extraction/PRISM_UNIVERSAL_POST_GENERATOR_V2.js` | cam |
| 1,049 | PRISM_TOOLPATH_STRATEGIES_COMPLETE | `extracted/engines/cad_cam/PRISM_TOOLPATH_STRATEGIES_COMPLETE.js` | cam |
| 1,048 | PRISM_TOOLPATH_STRATEGIES_COMPLETE | `extracted_modules/complete_extraction/PRISM_TOOLPATH_STRATEGIES_COMPLETE.js` | cam |
| 1,007 | PRISM_OPTIMIZED_POSTS_V2 | `extracted_modules/complete_extraction/PRISM_OPTIMIZED_POSTS_V2.js` | cam |
| 677 | PRISM_POST_INTEGRATION_MODULE | `extracted/engines/post_processor/PRISM_POST_INTEGRATION_MODULE.js` | cam |
| 670 | PRISM_POST_INTEGRATION_MODULE | `extracted_modules/complete_extraction/PRISM_POST_INTEGRATION_MODULE.js` | cam |
| 555 | PRISM_CROSSCAM_STRATEGY_MAP | `extracted_modules/complete_extraction/PRISM_CROSSCAM_STRATEGY_MAP.js` | cam |
| 532 | PRISM_POST_PROCESSOR_UI | `extracted_modules/complete_extraction/PRISM_POST_PROCESSOR_UI.js` | cam |
| 434 | PRISM_CAM_KERNEL_PASS2 | `extracted_modules/complete_extraction/PRISM_CAM_KERNEL_PASS2.js` | cam |
| 391 | PRISM_ENHANCED_TOOLPATH_GENERATOR | `extracted/engines/cad_cam/PRISM_ENHANCED_TOOLPATH_GENERATOR.js` | cam |
| 383 | PRISM_ENHANCED_TOOLPATH_GENERATOR | `extracted_modules/complete_extraction/PRISM_ENHANCED_TOOLPATH_GENERATOR.js` | cam |

## prism_data

### WIRE_CANDIDATE (top 15 of 59)

| Lines | Name | Path | Type |
|---:|---|---|---|
| 179,167 | ALL_MACHINES | `extracted/machines/CONSOLIDATED/ALL_MACHINES.json` | machine |
| 31,049 | tool_steels_hardness_conditions | `extracted/materials/P_STEELS/tool_steels_hardness_conditions.js` | tool |
| 17,498 | tool_steels_101_150 | `extracted/materials/P_STEELS/tool_steels_101_150.js` | tool |
| 15,316 | tool_steels_101_150_enhanced | `extracted/materials_enhanced/P_STEELS/tool_steels_101_150_enhanced.js` | tool |
| 9,642 | PRISM_HAAS_NEW_MACHINES_LEVEL5 | `extracted/machines/LEVEL5/PRISM_HAAS_NEW_MACHINES_LEVEL5.json` | machine |
| 7,187 | PRISM_OPTIMIZED_TOOL_SELECTOR | `extracted_modules/COMPLETE/PRISM_OPTIMIZED_TOOL_SELECTOR.js` | tool |
| 1,624 | MATERIALS_MASTER | `extracted/materials/MATERIALS_MASTER.json` | material |
| 1,294 | PRISM_MATERIALS_COMPLETE | `extracted/materials/PRISM_MATERIALS_COMPLETE.js` | material |
| 1,293 | PRISM_MATERIALS_COMPLETE | `extracted_modules/complete_extraction/PRISM_MATERIALS_COMPLETE.js` | material |
| 1,021 | PRISM_HAAS_NEW_MACHINES_LEVEL5 | `extracted/machines/LEVEL5/PRISM_HAAS_NEW_MACHINES_LEVEL5.js` | machine |
| 947 | PRISM_TOOL_HOLDER_INTERFACES_COMPLETE | `extracted_modules/databases/PRISM_TOOL_HOLDER_INTERFACES_COMPLETE.js` | tool |
| 661 | PRISM_UNIFIED_MACHINE_SELECTOR | `extracted_modules/complete_extraction/PRISM_UNIFIED_MACHINE_SELECTOR.js` | machine |
| 559 | PRISM_TOOL_HOLDER_3D_GENERATOR | `extracted/engines/tools/PRISM_TOOL_HOLDER_3D_GENERATOR.js` | tool |
| 553 | PRISM_TOOL_WEAR_MODELS | `extracted/formulas/PRISM_TOOL_WEAR_MODELS.js` | tool |
| 551 | PRISM_TOOL_HOLDER_3D_GENERATOR | `extracted_modules/complete_extraction/PRISM_TOOL_HOLDER_3D_GENERATOR.js` | tool |

### DATABASE (top 15 of 208)

| Lines | Name | Path |
|---:|---|---|
| 113,932 | PRISM_VERIFIED_POST_DATABASE_V2 | `extracted_modules/GIANT/PRISM_VERIFIED_POST_DATABASE_V2.js` |
| 73,154 | PRISM_MANUFACTURER_CATALOG_DB | `extracted_modules/ULTRA/PRISM_MANUFACTURER_CATALOG_DB.js` |
| 62,732 | PRISM_FIXTURE_DATABASE | `extracted_modules/ULTRA/PRISM_FIXTURE_DATABASE.js` |
| 43,567 | MASTER_ALARM_DATABASE | `extracted/controllers/alarms/MASTER_ALARM_DATABASE.json` |
| 43,567 | MASTER_ALARM_DATABASE_v3 | `extracted/controllers/MASTER_ALARM_DATABASE_v3.json` |
| 21,357 | MASTER_ALARM_DATABASE_v2 | `extracted/controllers/MASTER_ALARM_DATABASE_v2.json` |
| 18,907 | MASTER_ALARM_DATABASE_ACCURATE | `extracted/controllers/alarms/MASTER_ALARM_DATABASE_ACCURATE.json` |
| 18,907 | MASTER_ALARM_DATABASE_ACCURATE | `extracted/controllers/MASTER_ALARM_DATABASE_ACCURATE.json` |
| 12,584 | PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v3 | `extracted/machines/ENHANCED/PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v3.json` |
| 10,169 | PRISM_WORKHOLDING_DATABASE | `extracted_modules/COMPLETE/PRISM_WORKHOLDING_DATABASE.js` |
| 8,855 | PRISM_MACHINE_3D_MODEL_DATABASE_V2 | `extracted/machines/CORE/PRISM_MACHINE_3D_MODEL_DATABASE_V2.json` |
| 5,932 | PRISM_POST_PROCESSOR_DATABASE_V2 | `extracted_modules/COMPLETE/PRISM_POST_PROCESSOR_DATABASE_V2.js` |
| 4,768 | MASTER_ALARM_DATABASE | `extracted/controllers/MASTER_ALARM_DATABASE.json` |
| 3,568 | PRISM_ALGORITHM_REGISTRY | `extracted/algorithms/PRISM_ALGORITHM_REGISTRY.js` |
| 3,567 | PRISM_DOOSAN_MACHINE_DATABASE_ENHANCED_v2 | `extracted/machines/ENHANCED/PRISM_DOOSAN_MACHINE_DATABASE_ENHANCED_v2.json` |

## prism_dev

### WIRE_CANDIDATE (top 15 of 810)

| Lines | Name | Path | Type |
|---:|---|---|---|
| 181,781 | PRISM_SIGNAL_ENHANCED | `extracted_modules/GIANT/PRISM_SIGNAL_ENHANCED.js` | misc |
| 168,511 | PRISM_SUBSCRIPTION_SYSTEM | `extracted_modules/GIANT/PRISM_SUBSCRIPTION_SYSTEM.js` | misc |
| 156,759 | P_STEELS_complete | `extracted/materials_complete/P_STEELS/P_STEELS_complete.js` | misc |
| 141,869 | PRISM_PRECISION | `extracted_modules/GIANT/PRISM_PRECISION.js` | misc |
| 115,880 | PRISM_EKF | `extracted_modules/ULTRA/PRISM_EKF.js` | misc |
| 105,609 | PRISM_NURBS_100 | `extracted_modules/ULTRA/PRISM_NURBS_100.js` | misc |
| 101,926 | PRISM_EKF_ENGINE | `extracted_modules/ULTRA/PRISM_EKF_ENGINE.js` | engine |
| 91,769 | PRISM_CUSTOMER_MANAGER | `extracted_modules/ULTRA/PRISM_CUSTOMER_MANAGER.js` | misc |
| 91,269 | PRISM_TAYLOR_COMPLETE | `extracted_modules/ULTRA/PRISM_TAYLOR_COMPLETE.js` | misc |
| 73,971 | PRISM_ROUGHING_LOGIC | `extracted_modules/ULTRA/PRISM_ROUGHING_LOGIC.js` | misc |
| 57,503 | FANUC_ALARMS_MASTER | `extracted/controllers/alarms/FANUC_ALARMS_MASTER.json` | misc |
| 54,424 | PRISM_PARAM_ENGINE | `extracted_modules/ULTRA/PRISM_PARAM_ENGINE.js` | engine |
| 53,520 | PRISM_COLLISION_MOTION | `extracted_modules/MEGA/PRISM_COLLISION_MOTION.js` | misc |
| 42,444 | SIEMENS_ALARMS_MASTER | `extracted/controllers/alarms/SIEMENS_ALARMS_MASTER.json` | misc |
| 40,623 | HAAS_ALARMS_MASTER | `extracted/controllers/alarms/HAAS_ALARMS_MASTER.json` | misc |

## prism_session

### WIRE_CANDIDATE (top 15 of 38)

| Lines | Name | Path | Type |
|---:|---|---|---|
| 12,002 | PRISM_EXAMPLE_PARTS_INTEGRATION | `extracted_modules/COMPLETE/PRISM_EXAMPLE_PARTS_INTEGRATION.js` | system |
| 6,407 | PRISM_GATEWAY_100_PERCENT_ROUTES | `extracted_modules/COMPLETE/PRISM_GATEWAY_100_PERCENT_ROUTES.js` | system |
| 1,091 | PRISM_GATEWAY_BULK_ROUTES | `extracted_modules/complete_extraction/PRISM_GATEWAY_BULK_ROUTES.js` | system |
| 1,085 | PRISM_GATEWAY_ENHANCED | `extracted_modules/complete_extraction/PRISM_GATEWAY_ENHANCED.js` | system |
| 477 | PRISM_ENHANCED_INTEGRATION | `extracted/integration/PRISM_ENHANCED_INTEGRATION.js` | system |
| 476 | PRISM_ENHANCED_INTEGRATION | `extracted_modules/complete_extraction/PRISM_ENHANCED_INTEGRATION.js` | system |
| 403 | PRISM_SIMULATION_INTEGRATION_BRIDGE | `extracted/integration/PRISM_SIMULATION_INTEGRATION_BRIDGE.js` | system |
| 402 | PRISM_SIMULATION_INTEGRATION_BRIDGE | `extracted_modules/complete_extraction/PRISM_SIMULATION_INTEGRATION_BRIDGE.js` | system |
| 357 | PRISM_FEED_INTEGRATION | `extracted_modules/complete_extraction/PRISM_FEED_INTEGRATION.js` | system |
| 307 | PRISM_EXAMPLE_PARTS_INTEGRATION | `extracted_modules/complete_extraction/PRISM_EXAMPLE_PARTS_INTEGRATION.js` | system |
| 206 | PRISM_PRODUCTION_INTEGRATION | `extracted/integration/PRISM_PRODUCTION_INTEGRATION.js` | system |
| 205 | PRISM_PRODUCTION_INTEGRATION | `extracted_modules/complete_extraction/PRISM_PRODUCTION_INTEGRATION.js` | system |
| 188 | PRISM_100_PERCENT_INTEGRATION | `extracted/integration/PRISM_100_PERCENT_INTEGRATION.js` | system |
| 187 | PRISM_100_PERCENT_INTEGRATION | `extracted_modules/complete_extraction/PRISM_100_PERCENT_INTEGRATION.js` | system |
| 139 | PRISM_KNOWLEDGE_INTEGRATION_ROUTES | `extracted/knowledge_bases/PRISM_KNOWLEDGE_INTEGRATION_ROUTES.js` | system |
