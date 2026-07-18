# PRISM Dispatcher Digest

**78 dispatchers** | **4,130 total actions** | avg 52.9 actions/dispatcher
Updated: 2026-04-07 (auto-generated from source code scan)

## Dispatcher Map

| Dispatcher | Tool Name | Actions | Description |
|-----------|-----------|---------|-------------|
| fiveAxisDispatcher | prism_5axis | 5 | SAFETY CRITICAL — singularity/collision/RTCP errors |
| adaptiveControlDispatcher | prism_adaptive_control | 12 | Adaptive control & digital twin |
| atcsDispatcher | prism_atcs | 12 | Autonomous task completion system |
| authDispatcher | prism_auth | 8 | Authentication & authorization |
| automationDispatcher | prism_automation | 5 | Shop floor automation (digital thread, work instructions) |
| autonomousDispatcher | prism_autonomous | 8 | Autonomous execution engine |
| autoPilotDispatcher | prism_autopilot_d | 7 | AutoPilot workflow orchestration |
| bridgeDispatcher | prism_bridge | 13 | Multi-protocol API gateway |
| businessDispatcher | prism_business | 350 | Quote, cost, capacity, OEE, scheduling, pricing |
| cadDispatcher | prism_cad | 66 | CAD/geometry operations |
| cadDrawingKnowledgeDispatcher | prism_cad_drawing_kb | 11 | CAD drawing knowledge extraction |
| calcDispatcher | prism_calc | 1103 | Physics calculations, optimization, geometry, toolpath |
| camDispatcher | prism_cam | 701 | CAM/toolpath generation, post-processing, controllers |
| cncOpsDispatcher | prism_cnc_ops | 41 | CNC operations, machine control |
| complianceDispatcher | prism_compliance | 17 | Regulatory compliance (AS9100, ITAR, NADCAP) |
| contextDispatcher | prism_context | 26 | Context engineering & session management |
| dataDispatcher | prism_data | 159 | Registry data access (materials, tools, machines) |
| devDispatcher | prism_dev | 140 | Dev workflow, ACP, MXU, automation chains |
| diagnosisDispatcher | prism_diagnosis | 53 | Diagnostics, analysis, troubleshooting |
| documentDispatcher | prism_doc | 7 | Document management |
| documentLearningDispatcher | prism_doc_learn | 5 | Document knowledge extraction (Python cad-engine) |
| edmDispatcher | prism_edm | 69 | Non-traditional: wire/sinker/micro EDM, laser, waterjet |
| exportDispatcher | prism_export | 8 | Document export (PDF, Excel, CSV) |
| feasibilityDispatcher | prism_feasibility | 28 | Machining feasibility intelligence |
| fluidThermalDispatcher | prism_fluid_thermal | 48 | Heat exchangers, pumps, piping, thermal analysis |
| formingCastingDispatcher | prism_forming | 20 | Sheet metal forming, casting, forging |
| generatorDispatcher | prism_generator | 6 | Hook & code generator tools |
| grindingDispatcher | prism_grinding | 10 | Grinding process optimization |
| gsdDispatcher | prism_gsd | 6 | GSD protocol access |
| guardDispatcher | prism_guard | 14 | Reasoning & enforcement engine |
| holePatternDispatcher | prism_hole_pattern | 3 | Hole pattern pipeline |
| hookDispatcher | prism_hook | 20 | Hook & event management |
| inboxDispatcher | prism_inbox | 8 | DocuRead document inbox |
| industryDispatcher | prism_industry | 4 | Industry compliance standards |
| infraDispatcher | prism_infra | 6 | Infrastructure health monitoring |
| integrationDispatcher | prism_integration | 55 | External system integration (ERP, MES, MTConnect) |
| intelligenceDispatcher | prism_intelligence | 49 | Manufacturing intelligence & AI |
| knowledgeDispatcher | prism_knowledge | 98 | Unified knowledge query (materials, processes, standards) |
| knowledgeExtDispatcher | prism_knowledge_ext | 40 | Knowledge management extensions |
| l2EngineDispatcher | prism_l2 | 38 | L2 engine operations |
| machineLiveDispatcher | prism_machine_live | 70 | Machine live monitoring & OPC-UA |
| machineSetupDispatcher | prism_machine_setup | 81 | Machine setup, quality, fixturing |
| machiningKnowledgeBaseDispatcher | prism_machining_kb | 56 | Canonical machining data (Kienzle, Taylor, speed/feed) |
| manusDispatcher | prism_manus | 11 | Manus AI agent |
| materialProcessingDispatcher | prism_material_processing | 16 | Material processing (heat treat, plating, coating) |
| mechanicalDesignDispatcher | prism_mechanical | 51 | Mechanical design (bearings, gears, springs, shafts) |
| monitoringDispatcher | prism_monitoring | 9 | Monitoring & observability |
| multiOpDispatcher | prism_multi_op | 7 | Multi-operation orchestration |
| multiAxisProgramDispatcher | prism_multiaxis_program | 2 | Multi-axis print-to-program pipeline |
| omegaDispatcher | prism_omega | 6 | Omega quality equation |
| operatingSystemDispatcher | prism_operating_system | 47 | OS shell, file, process operations |
| orchestrationDispatcher | prism_orchestrate | 27 | Agent orchestration & swarm |
| partsLibraryDispatcher | prism_parts | 17 | Parts library & file storage |
| pfpDispatcher | prism_pfp | 6 | Predictive failure prevention |
| processControlDispatcher | prism_process_control | 6 | Process control & DOE |
| productDispatcher | prism_product | 72 | Product management tools |
| provenPipelineDispatcher | prism_proven_pipeline | 22 | Proven pipeline execution |
| qualityDispatcher | prism_quality | 17 | Quality, metrology, SPC |
| ralphDispatcher | prism_ralph | 3 | Ralph validation |
| realtimeDispatcher | prism_realtime | 6 | Real-time WebSocket messaging |
| safetyDispatcher | prism_safety | 30 | Safety-critical validations (collision, clearance, veto) |
| schedulingDispatcher | prism_scheduling | 8 | Production scheduling |
| scientificMathDispatcher | prism_scientific_math | 5 | Scientific mathematics |
| secondaryOpsDispatcher | prism_secondary_ops | 3 | Deburring, probing, engraving, wash |
| sessionDispatcher | prism_session | 48 | Session state management |
| shopPracticeDispatcher | prism_shop_practice | 23 | Tribal knowledge, playbooks, setup practices |
| skillScriptDispatcher | prism_skill_script | 27 | Skills, scripts, and bundles |
| spDispatcher | prism_sp | 19 | Development protocol |
| telemetryDispatcher | prism_telemetry | 7 | Dispatcher telemetry |
| tenantDispatcher | prism_tenant | 15 | Multi-tenant isolation |
| threadDispatcher | prism_thread | 21 | Threading calculations (tap, thread mill, gauges) |
| threadingPipelineDispatcher | prism_threading_pipeline | 3 | Threading pipeline |
| toolpathDispatcher | prism_toolpath | 34 | Toolpath strategy engine |
| turningDispatcher | prism_turning | 34 | Turning-specific operations |
| turningProgramDispatcher | prism_turning_program | 12 | Turning print-to-program pipeline |
| validationDispatcher | prism_validate | 13 | Input/output validation |
| vibrationPhysicsDispatcher | prism_vibration_physics | 16 | Vibration, dynamics & cutting physics |
| weldingJoiningDispatcher | prism_welding | 6 | Welding & joining processes |

## Top 10 by Action Count

| Rank | Dispatcher | Actions | % of Total |
|------|-----------|---------|------------|
| 1 | calcDispatcher | 1,103 | 26.7% |
| 2 | camDispatcher | 701 | 17.0% |
| 3 | businessDispatcher | 350 | 8.5% |
| 4 | dataDispatcher | 159 | 3.8% |
| 5 | devDispatcher | 140 | 3.4% |
| 6 | knowledgeDispatcher | 98 | 2.4% |
| 7 | machineSetupDispatcher | 81 | 2.0% |
| 8 | productDispatcher | 72 | 1.7% |
| 9 | machineLiveDispatcher | 70 | 1.7% |
| 10 | edmDispatcher | 69 | 1.7% |

## Action Tier Distribution

| Tier | Dispatchers | Total Actions | % of Total |
|------|------------|---------------|------------|
| Mega (500+) | 2 | 1,804 | 43.7% |
| Large (100-499) | 4 | 798 | 19.3% |
| Medium (50-99) | 9 | 608 | 14.7% |
| Small (20-49) | 14 | 409 | 9.9% |
| Minimal (1-19) | 49 | 511 | 12.4% |

## Routing Patterns

| Pattern | Count | Example |
|---------|-------|---------|
| switch/case | 45 | calcDispatcher, camDispatcher |
| ACTION_MAP + lazy cache | 2 | fluidThermalDispatcher, mechanicalDesignDispatcher |
| ACTION_HANDLERS map | 3 | shopPracticeDispatcher |
| Set-based + if-else | 2 | safetyDispatcher, threadDispatcher |
| Single engine delegate | 5 | machiningKnowledgeBaseDispatcher |
| Python subprocess | 2 | documentLearningDispatcher |
