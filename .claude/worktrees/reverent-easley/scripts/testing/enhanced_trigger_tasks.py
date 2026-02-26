"""
PRISM Enhanced Trigger Tasks v1.0
Highly specific tasks that guarantee selection of each resource
"""

# Each skill gets a task that MUST select it
SKILL_TRIGGER_TASKS = {
    "prism-api-contracts": "Define the API contract interface specification for gateway endpoints",
    "prism-dev-utilities": "Run development utility scripts for automation helper functions",
    "prism-error-recovery": "Implement error recovery fallback mechanism for graceful handling",
    "prism-expert-cad-expert": "Consult CAD expert for geometry modeling and feature recognition",
    "prism-expert-master": "Get expert master guidance and specialist consultation",
    "prism-expert-mechanical-engineer": "Consult mechanical engineer for stress deflection analysis",
    "prism-manufacturing-tables": "Look up manufacturing reference tables and data charts",
    "prism-material-templates": "Create material from predefined template structure",
    "prism-product-calculators": "Use product calculator to compute speed feed tool life",
    "prism-reasoning-engine": "Apply reasoning engine for logical inference and deduction",
    "prism-safety-framework": "Check safety framework constraints and protection limits",
    "prism-session-master": "Manage session master state context persistence and resume",
    "prism-sp-execution": "Execute implementation task with checkpoint progress tracking",
    "prism-sp-handoff": "Perform session handoff transition protocol documentation",
    "prism-sp-planning": "Create detailed planning roadmap with task decomposition",
    "prism-sp-review-quality": "Run quality review checking code standards and patterns",
    "prism-sp-review-spec": "Verify specification compliance and requirement matching",
    "prism-monolith-extractor": "Extract module from monolith codebase safely",
    "prism-monolith-navigator": "Navigate monolith to find and locate specific code",

}

# Each agent gets a task that MUST select it
AGENT_TRIGGER_TASKS = {
    "analyst": "Analyze patterns and perform detailed analysis of data",
    "api_designer": "Design API interface and define endpoint contracts",
    "calibration_engineer": "Calibrate coefficients and tune parameters",
    "call_tracer": "Trace call stack and debug function invocations",
    "cam_specialist": "Optimize CAM toolpath strategy and machining operations",
    "code_reviewer": "Review code quality and check coding standards",
    "coder": "Write implementation code and generate modules",
    "completeness_auditor": "Audit completeness and verify all requirements met",
    "estimator": "Estimate effort time cost for task planning",
    "formula_lookup": "Look up formula in reference database",
    "process_engineer": "Optimize manufacturing process workflow efficiency",
    "proof_generator": "Generate mathematical proof and verification certificate",
    "quality_engineer": "Engineer quality processes and validation procedures",
    "quality_gate": "Check quality gate criteria and verify passage",
    "refactorer": "Refactor code structure and improve architecture",
    "session_continuity": "Ensure session continuity across context transitions",
    "state_manager": "Manage state persistence and coordinate checkpoints",
    "standards_expert": "Apply standards expertise for compliance validation",
    "tool_lookup": "Look up tool specifications in catalog database",

}
