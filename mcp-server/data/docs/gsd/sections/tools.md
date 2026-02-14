## PRISM MCP Tools — Verified 2026-02-13 (F1-F8 Complete)

### Dispatchers: 31 | Actions: 368 (verified)

| Dispatcher | Actions | File | Feature |
|-----------|---------|------|---------|
| prism_atcs | 10 | atcsDispatcher.ts | |
| prism_autopilot_d | 8 | autoPilotDispatcher.ts | |
| prism_autonomous | 8 | autonomousDispatcher.ts | |
| prism_bridge | 13 | bridgeDispatcher.ts | F7 |
| prism_calc | 21 | calcDispatcher.ts | |
| prism_compliance | 8 | complianceDispatcher.ts | F8 |
| prism_context | 18 | contextDispatcher.ts | |
| prism_data | 14 | dataDispatcher.ts | |
| prism_dev | 9 | devDispatcher.ts | |
| prism_doc | 7 | documentDispatcher.ts | |
| prism_generator | 6 | generatorDispatcher.ts | |
| prism_gsd | 6 | gsdDispatcher.ts | |
| prism_guard | 14 | guardDispatcher.ts | |
| prism_hook | 18 | hookDispatcher.ts | |
| prism_knowledge | 5 | knowledgeDispatcher.ts | |
| prism_manus | 11 | manusDispatcher.ts | |
| prism_memory | 6 | memoryDispatcher.ts | F2 |
| prism_nl_hook | 8 | nlHookDispatcher.ts | F6 |
| prism_omega | 5 | omegaDispatcher.ts | |
| prism_orchestrate | 14 | orchestrationDispatcher.ts | |
| prism_pfp | 6 | pfpDispatcher.ts | F1 |
| prism_ralph | 3 | ralphDispatcher.ts | |
| prism_safety | 29 | safetyDispatcher.ts | |
| prism_session | 30 | sessionDispatcher.ts | |
| prism_skill_script | 23 | skillScriptDispatcher.ts | |
| prism_sp | 19 | spDispatcher.ts | |
| prism_telemetry | 7 | telemetryDispatcher.ts | F3 |
| prism_tenant | 15 | tenantDispatcher.ts | F5 |
| prism_thread | 12 | threadDispatcher.ts | |
| prism_toolpath | 8 | toolpathDispatcher.ts | |
| prism_validate | 7 | validationDispatcher.ts | |

### Engines: 37 (includes 8 F-series)

Core: AdvancedCalculations, AgentExecutor, BatchProcessor, CalcHookMiddleware,
CollisionEngine, ComputationCache, CoolantValidationEngine, DiffEngine,
EventBus, HookEngine, HookExecutor, KnowledgeQueryEngine,
ManufacturingCalculations, PredictiveFailureEngine, ResponseTemplateEngine,
ScriptExecutor, SessionLifecycleEngine, SkillExecutor, SpindleProtectionEngine,
SwarmExecutor, ThreadCalculationEngine, ToolBreakageEngine, ToolpathCalculations,
WorkholdingEngine

F-series: CertificateEngine(F4), ComplianceEngine(F8), MemoryGraphEngine(F2),
MultiTenantEngine(F5), NLHookEngine(F6), PFPEngine(F1),
ProtocolBridgeEngine(F7), TelemetryEngine(F3)

Synergy: synergyIntegration.ts (cross-feature wiring)

### Auto-Fire: 30+ cadence functions (includes compliance audit @25)
### Hooks: 112 domain + 6 built-in

## Changelog
- 2026-02-13: F1-F8 complete. Added 4 dispatchers (nl_hook, compliance, tenant, bridge), 8 engines, synergy. 31/368 verified.
- 2026-02-11: Verified by comprehensive audit.
