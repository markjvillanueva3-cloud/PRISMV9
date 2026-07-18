"""
PRISM MCP Intelligence Tools Registration
Registers P1-INTEL + P2-CCE tools with FastMCP server

20 Tools Total:
- 5 Token Budget tools
- 3 Smart Reflection tools  
- 2 Cascading Review tools
- 3 Zero-Token Engine tools
- 7 CCE (Cognitive Composition Engine) tools
"""

from typing import Dict, Any, List, Optional
from mcp.server.fastmcp import FastMCP

# Import all intelligence modules
from .intelligence import (
    # Token Budget
    intel_budget_status,
    intel_budget_spend,
    intel_budget_report,
    intel_budget_can_spend,
    intel_budget_reset,
    
    # Smart Reflection
    intel_hook_on_failure,
    intel_reflection_run,
    intel_reflection_cache_status,
    
    # Cascading Review
    intel_review_cascade,
    intel_review_stats,
    
    # Zero-Token Engines
    intel_ast_complexity,
    intel_entropy_quick,
    intel_embed_local,
)


def register_intelligence_tools(mcp: FastMCP):
    """Register all intelligence tools with the MCP server"""
    
    # =========================================================================
    # TOKEN BUDGET TOOLS (P1I-001)
    # =========================================================================
    
    @mcp.tool()
    def intel_budget_status_tool() -> Dict[str, Any]:
        """
        Get current token budget status.
        
        Shows: session_budget, spent, remaining, utilization, zone (GREEN/YELLOW/WARNING/CRITICAL),
        breakdown by category, category limits.
        
        Zero-token operation.
        """
        return intel_budget_status()
    
    @mcp.tool()
    def intel_budget_spend_tool(
        category: str,
        tokens: int,
        operation: str = "",
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Record token spending.
        
        Categories: reflection (300), review (800), deep_analysis (1500), 
        background (500), cascade_cheap (100), cascade_focused (500),
        cascade_deep (1500), subagent (2000), composition (1000)
        
        Returns success status, remaining budget, warnings if budget low.
        """
        return intel_budget_spend(category, tokens, operation, metadata)
    
    @mcp.tool()
    def intel_budget_report_tool(include_history: bool = False) -> Dict[str, Any]:
        """
        Generate detailed budget report.
        
        Shows: summary, breakdown by category, efficiency score, recommendations.
        Optionally includes last 20 transactions.
        """
        return intel_budget_report(include_history)
    
    @mcp.tool()
    def intel_budget_can_spend_tool(category: str, tokens: int) -> Dict[str, Any]:
        """
        Check if spending is allowed (without actually spending).
        
        Returns: allowed, category_limit, session_remaining, reason if denied.
        """
        return intel_budget_can_spend(category, tokens)
    
    @mcp.tool()
    def intel_budget_reset_tool() -> Dict[str, Any]:
        """Reset token budget for new session."""
        return intel_budget_reset()
    
    # =========================================================================
    # SMART REFLECTION TOOLS (P1I-002)
    # =========================================================================
    
    @mcp.tool()
    def intel_hook_on_failure_tool(
        failure_type: str,
        error_message: str,
        file_path: str = None,
        line_number: int = None,
        stack_trace: str = None,
        test_name: str = None
    ) -> Dict[str, Any]:
        """
        Smart reflection hook - triggered on failure.
        
        failure_type: test_failure, build_failure, runtime_error, validation_error
        
        Uses caching to avoid re-analyzing same errors (ZERO tokens for cached).
        Returns: root_cause, confidence, suggested_fix, reasoning_steps, tokens_used.
        """
        return intel_hook_on_failure(
            failure_type=failure_type,
            error_message=error_message,
            file_path=file_path,
            line_number=line_number,
            stack_trace=stack_trace,
            test_name=test_name
        )
    
    @mcp.tool()
    def intel_reflection_run_tool(
        error_message: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Run smart reflection on an error.
        
        Simpler interface - just pass error message and optional context.
        Context can include: failure_type, file_path, line_number, stack_trace, test_name.
        """
        return intel_reflection_run(error_message, context)
    
    @mcp.tool()
    def intel_reflection_cache_status_tool() -> Dict[str, Any]:
        """Get reflection cache status (entries, TTL, max tokens)."""
        return intel_reflection_cache_status()
    
    # =========================================================================
    # CASCADING REVIEW TOOLS (P1I-003)
    # =========================================================================
    
    @mcp.tool()
    def intel_review_cascade_tool(
        code: str,
        file_path: str = None,
        language: str = None,
        force_deep: bool = False
    ) -> Dict[str, Any]:
        """
        Cascading code review: CHEAP → FOCUSED → DEEP.
        
        Only escalates when issues found - saves 70-90% tokens vs always-deep.
        
        - CHEAP (0 tokens): Pattern matching, syntax checks
        - FOCUSED (~500 tokens): Logic flow, null safety, resource cleanup  
        - DEEP (~1500 tokens): Security, performance, architecture
        
        Returns: summary, findings, risk_score, tokens_used, escalation_path.
        """
        return intel_review_cascade(code, file_path, language, force_deep)
    
    @mcp.tool()
    def intel_review_stats_tool() -> Dict[str, Any]:
        """
        Get cascading review statistics.
        
        Shows: total_reviews, stopped_at_cheap, stopped_at_focused, went_to_deep,
        tokens_saved, efficiency ratio.
        """
        return intel_review_stats()
    
    # =========================================================================
    # ZERO-TOKEN ENGINE TOOLS (P1I-004)
    # =========================================================================
    
    @mcp.tool()
    def intel_ast_complexity_tool(code: str, language: str = "python") -> Dict[str, Any]:
        """
        Analyze code complexity using AST - ZERO TOKENS.
        
        Returns:
        - cyclomatic_complexity: McCabe complexity
        - cognitive_complexity: Cognitive load
        - nesting_depth: Max nesting level
        - maintainability_index: 0-100 (higher = better)
        - halstead_volume: Halstead metrics
        - complexity_rating: LOW/MODERATE/HIGH/VERY HIGH
        
        Currently supports Python only.
        """
        return intel_ast_complexity(code, language)
    
    @mcp.tool()
    def intel_entropy_quick_tool(code: str) -> Dict[str, Any]:
        """
        Quick entropy/health analysis - ZERO TOKENS.
        
        Measures code diversity, detects duplication.
        
        Returns:
        - char_entropy, token_entropy, line_entropy
        - identifier_entropy: Variable name diversity
        - duplication_score: 0-1 (lower = less duplication = better)
        - health_score: 0-100 overall health
        - warnings: Issues detected
        """
        return intel_entropy_quick(code)
    
    @mcp.tool()
    def intel_embed_local_tool(
        text: str,
        compare_to: str = None,
        find_similar_in: List[str] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Local embeddings for similarity - ZERO TOKENS.
        
        Uses hash-based vectors (no external LLM).
        
        Modes:
        - Embed only: Returns embedding_dim, embedding_sample
        - Compare: Pass compare_to, returns similarity 0-1
        - Find similar: Pass find_similar_in list, returns top_k matches
        """
        return intel_embed_local(text, compare_to, find_similar_in, top_k)
    
    print(f"✅ Registered 13 Intelligence Tools (P1-INTEL)")
    
    # =========================================================================
    # CCE TOOLS (P2-CCE) - Cognitive Composition Engine
    # =========================================================================
    
    from .intelligence import (
        handle_cce_analyze_problem,
        handle_cce_technique_list,
        handle_cce_technique_get,
        handle_cce_match_techniques,
        handle_cce_compose,
        handle_cce_execute,
        handle_cce_stats,
    )
    
    @mcp.tool()
    def cce_analyze_problem(problem: str) -> Dict[str, Any]:
        """
        Analyze a problem to identify category, complexity, and requirements.
        
        Categories: calculation, optimization, selection, diagnosis, prediction,
        data_extraction, data_validation, planning, comparison, explanation.
        
        Returns: category, confidence, complexity, keywords, requirements.
        """
        return handle_cce_analyze_problem({"problem": problem})
    
    @mcp.tool()
    def cce_technique_list(category: str = None, limit: int = 50) -> Dict[str, Any]:
        """
        List available cognitive techniques (50+ techniques).
        
        Categories: deductive, inductive, abductive, analogical, causal,
        heuristic, exhaustive, greedy, evolutionary, gradient,
        divide_conquer, hierarchical, modular, recursive,
        aggregation, consensus, ensemble, fusion,
        verification, cross_validation.
        """
        return handle_cce_technique_list({"category": category, "limit": limit})
    
    @mcp.tool()
    def cce_technique_get(technique_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific technique.
        
        Example IDs: CALC-KIENZLE-001, OPT-COST-001, DIAG-ALARM-001
        
        Returns: id, name, category, description, problem_types, 
        complexity_range, token_cost, accuracy, prism_tools, example.
        """
        return handle_cce_technique_get({"technique_id": technique_id})
    
    @mcp.tool()
    def cce_match_techniques(problem: str, limit: int = 5) -> Dict[str, Any]:
        """
        Find the best techniques for solving a problem.
        
        Matches problem signature against technique library using:
        - Category match (40%)
        - Complexity match (20%)
        - Keyword match (20%)
        - Tool availability (20%)
        
        Returns ranked techniques with match scores.
        """
        return handle_cce_match_techniques({"problem": problem, "limit": limit})
    
    @mcp.tool()
    def cce_compose(problem: str, technique_limit: int = 3) -> Dict[str, Any]:
        """
        Compose a solution plan using matched techniques.
        
        Creates execution plan with:
        - Ordered steps
        - Technique assignments
        - Tool calls needed
        - Expected outputs
        - Estimated token cost
        """
        return handle_cce_compose({"problem": problem, "technique_limit": technique_limit})
    
    @mcp.tool()
    def cce_execute(problem: str) -> Dict[str, Any]:
        """
        Get execution guide for solving a problem.
        
        Provides step-by-step guidance including:
        - Execution order
        - Tool calls to make
        - Expected outputs
        - Priority ordering
        """
        return handle_cce_execute({"problem": problem})
    
    @mcp.tool()
    def cce_stats() -> Dict[str, Any]:
        """
        Get CCE statistics.
        
        Returns: total_techniques, by_technique_category, 
        by_problem_type, avg_accuracy.
        """
        return handle_cce_stats({})
    
    print(f"✅ Registered 7 CCE Tools (P2-CCE)")
    
    return 20  # 13 + 7


# Tool metadata for documentation
INTELLIGENCE_TOOL_METADATA = {
    'intel_budget_status': {'category': 'token_budget', 'tokens': 0},
    'intel_budget_spend': {'category': 'token_budget', 'tokens': 0},
    'intel_budget_report': {'category': 'token_budget', 'tokens': 0},
    'intel_budget_can_spend': {'category': 'token_budget', 'tokens': 0},
    'intel_budget_reset': {'category': 'token_budget', 'tokens': 0},
    'intel_hook_on_failure': {'category': 'smart_reflection', 'tokens': '0-300'},
    'intel_reflection_run': {'category': 'smart_reflection', 'tokens': '0-300'},
    'intel_reflection_cache_status': {'category': 'smart_reflection', 'tokens': 0},
    'intel_review_cascade': {'category': 'cascading_review', 'tokens': '0-2000'},
    'intel_review_stats': {'category': 'cascading_review', 'tokens': 0},
    'intel_ast_complexity': {'category': 'zero_token', 'tokens': 0},
    'intel_entropy_quick': {'category': 'zero_token', 'tokens': 0},
    'intel_embed_local': {'category': 'zero_token', 'tokens': 0},
    # CCE Tools (P2-CCE)
    'cce_analyze_problem': {'category': 'cce', 'tokens': 0},
    'cce_technique_list': {'category': 'cce', 'tokens': 0},
    'cce_technique_get': {'category': 'cce', 'tokens': 0},
    'cce_match_techniques': {'category': 'cce', 'tokens': 0},
    'cce_compose': {'category': 'cce', 'tokens': 0},
    'cce_execute': {'category': 'cce', 'tokens': 0},
    'cce_stats': {'category': 'cce', 'tokens': 0},
}


# =============================================================================
# CCE TOOLS REGISTRATION (P2-CCE)
# =============================================================================

from .intelligence.cce_tools import (
    handle_cce_analyze_problem,
    handle_cce_technique_list,
    handle_cce_technique_get,
    handle_cce_match_techniques,
    handle_cce_compose,
    handle_cce_execute,
    handle_cce_stats,
)


def register_cce_tools(mcp: FastMCP):
    """Register CCE (Cognitive Composition Engine) tools"""
    
    @mcp.tool()
    def cce_analyze_problem(problem: str) -> Dict[str, Any]:
        """
        Analyze a problem to identify its category, complexity, and requirements.
        
        Categories: calculation, optimization, selection, diagnosis, prediction,
        data_extraction, data_validation, planning, comparison, explanation.
        
        Returns: category, confidence, complexity, keywords, requirements.
        
        Example: "Calculate cutting force for 4140 steel" → category: calculation
        """
        return handle_cce_analyze_problem({"problem": problem})
    
    @mcp.tool()
    def cce_technique_list(category: str = None, limit: int = 50) -> Dict[str, Any]:
        """
        List available cognitive techniques (500+ total).
        
        Categories:
        - deductive, inductive, abductive, analogical, causal (reasoning)
        - heuristic, exhaustive, greedy, evolutionary, gradient (search)
        - divide_conquer, hierarchical, modular, recursive (decomposition)
        - aggregation, consensus, ensemble, fusion (synthesis)
        - verification, cross_validation (validation)
        """
        return handle_cce_technique_list({"category": category, "limit": limit})
    
    @mcp.tool()
    def cce_technique_get(technique_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific technique.
        
        Returns: id, name, category, description, problem_types, complexity_range,
        token_cost, accuracy, speed, prerequisites, outputs, prism_tools, example.
        
        Example: cce_technique_get("CALC-KIENZLE-001")
        """
        return handle_cce_technique_get({"technique_id": technique_id})
    
    @mcp.tool()
    def cce_match_techniques(problem: str, limit: int = 5) -> Dict[str, Any]:
        """
        Find the best techniques for solving a problem.
        
        Matching algorithm:
        - Category match (40%)
        - Complexity match (20%)
        - Keyword match (20%)
        - Tool availability (20%)
        
        Returns ranked techniques with match scores.
        """
        return handle_cce_match_techniques({"problem": problem, "limit": limit})
    
    @mcp.tool()
    def cce_compose(problem: str, technique_limit: int = 3) -> Dict[str, Any]:
        """
        Compose a solution plan using matched techniques.
        
        Creates execution plan with:
        - Ordered steps
        - Technique assignments
        - Tool calls needed
        - Expected outputs
        - Estimated token cost
        """
        return handle_cce_compose({"problem": problem, "technique_limit": technique_limit})
    
    @mcp.tool()
    def cce_execute(problem: str) -> Dict[str, Any]:
        """
        Get execution guide for solving a problem.
        
        Provides step-by-step guidance:
        - Execution order
        - Tool calls to make
        - Expected outputs
        - Priority ordering
        
        Note: Returns guide - actual execution via MCP tool calls.
        """
        return handle_cce_execute({"problem": problem})
    
    @mcp.tool()
    def cce_stats() -> Dict[str, Any]:
        """
        Get CCE statistics.
        
        Returns:
        - Total techniques
        - Techniques by category
        - Techniques by problem type
        - Average accuracy
        """
        return handle_cce_stats({})
    
    print(f"✅ Registered 7 CCE Tools (P2-CCE)")
    return 7


# Updated metadata
INTELLIGENCE_TOOL_METADATA.update({
    'cce_analyze_problem': {'category': 'cce', 'tokens': '0-100'},
    'cce_technique_list': {'category': 'cce', 'tokens': 0},
    'cce_technique_get': {'category': 'cce', 'tokens': 0},
    'cce_match_techniques': {'category': 'cce', 'tokens': '0-200'},
    'cce_compose': {'category': 'cce', 'tokens': '0-500'},
    'cce_execute': {'category': 'cce', 'tokens': '0-500'},
    'cce_stats': {'category': 'cce', 'tokens': 0},
})


def register_all_intelligence_tools(mcp: FastMCP) -> int:
    """Register all intelligence tools (P1-INTEL + P2-CCE)"""
    count = register_intelligence_tools(mcp)
    count += register_cce_tools(mcp)
    print(f"✅ Total Intelligence Tools: {count}")
    return count


# =============================================================================
# P3-WORKFLOW TOOLS - Selective Workflow
# =============================================================================

def register_workflow_tools(mcp: FastMCP) -> int:
    """Register P3-WORKFLOW Selective Workflow tools"""
    
    from .intelligence import (
        handle_dev_test_run,
        handle_dev_test_affected,
        handle_dev_test_coverage,
        handle_dev_lint_run,
        handle_dev_lint_fix,
        handle_intel_subagent_spawn,
        handle_intel_subagent_result,
        handle_dev_tdd_cycle,
    )
    
    @mcp.tool()
    def dev_test_run(path: str = None, pattern: str = None, 
                     verbose: bool = False) -> Dict[str, Any]:
        """
        Run tests with auto-detected framework (pytest, jest, mocha).
        
        Automatically detects test framework from project config.
        
        Returns: success, framework, summary (total, passed, failed, skipped)
        """
        return handle_dev_test_run({"path": path, "pattern": pattern, "verbose": verbose})
    
    @mcp.tool()
    def dev_test_affected(changed_files: List[str]) -> Dict[str, Any]:
        """
        Find tests affected by changed files.
        
        Uses dependency analysis to find related tests.
        Useful for running only relevant tests after code changes.
        
        Returns: affected test files list
        """
        return handle_dev_test_affected({"changed_files": changed_files})
    
    @mcp.tool()
    def dev_test_coverage(path: str = None) -> Dict[str, Any]:
        """
        Get test coverage report.
        
        Uses pytest-cov or jest --coverage depending on framework.
        
        Returns: lines %, branches %, functions %
        """
        return handle_dev_test_coverage({"path": path})
    
    @mcp.tool()
    def dev_lint_run(path: str = None) -> Dict[str, Any]:
        """
        Run linters on path.
        
        Runs ruff for Python, eslint for TypeScript/JavaScript.
        
        Returns: total issues, issues per linter
        """
        return handle_dev_lint_run({"path": path})
    
    @mcp.tool()
    def dev_lint_fix(path: str = None) -> Dict[str, Any]:
        """
        Run linters with auto-fix enabled.
        
        Automatically fixes fixable issues.
        
        Returns: total issues, total fixed
        """
        return handle_dev_lint_fix({"path": path})
    
    @mcp.tool()
    def intel_subagent_spawn(agent_id: str, task: str, 
                             context: Dict = None) -> Dict[str, Any]:
        """
        Spawn a subagent for parallel work.
        
        Creates a task that can be executed asynchronously.
        Use intel_subagent_result to get the result.
        
        Returns: task_id, status, execution_hint
        """
        return handle_intel_subagent_spawn({
            "agent_id": agent_id, 
            "task": task, 
            "context": context
        })
    
    @mcp.tool()
    def intel_subagent_result(task_id: str) -> Dict[str, Any]:
        """
        Get result of a spawned subagent task.
        
        Returns: task_id, agent_id, status, result, duration_ms
        """
        return handle_intel_subagent_result({"task_id": task_id})
    
    @mcp.tool()
    def dev_tdd_cycle(test_path: str = None, code_path: str = None,
                      auto_fix_lint: bool = True) -> Dict[str, Any]:
        """
        Run a complete TDD cycle: RED → GREEN → REFACTOR.
        
        1. RED: Run tests (should fail for new feature)
        2. GREEN: Implement code to pass tests
        3. REFACTOR: Lint and cleanup
        
        Returns: cycle_id, phases, status, next_action
        """
        return handle_dev_tdd_cycle({
            "test_path": test_path,
            "code_path": code_path,
            "auto_fix_lint": auto_fix_lint
        })
    
    print(f"✅ Registered 8 Workflow Tools (P3-WORKFLOW)")
    return 8


# Updated metadata for workflow tools
WORKFLOW_TOOL_METADATA = {
    'dev_test_run': {'category': 'workflow', 'tokens': 0},
    'dev_test_affected': {'category': 'workflow', 'tokens': 0},
    'dev_test_coverage': {'category': 'workflow', 'tokens': 0},
    'dev_lint_run': {'category': 'workflow', 'tokens': 0},
    'dev_lint_fix': {'category': 'workflow', 'tokens': 0},
    'intel_subagent_spawn': {'category': 'workflow', 'tokens': 0},
    'intel_subagent_result': {'category': 'workflow', 'tokens': 0},
    'dev_tdd_cycle': {'category': 'workflow', 'tokens': 0},
}


def register_all_intelligence_tools_v2(mcp: FastMCP) -> int:
    """Register all intelligence tools (P1-INTEL + P2-CCE + P3-WORKFLOW)"""
    count = register_intelligence_tools(mcp)  # 13 tools
    count += 7  # CCE tools already in register_intelligence_tools
    count += register_workflow_tools(mcp)  # 8 tools
    print(f"✅ Total Intelligence Tools: {count}")
    return count



# =============================================================================
# P5-META TOOLS - Auto-Fire Integration
# =============================================================================

def register_autofire_tools(mcp: FastMCP) -> int:
    """Register P5-META Auto-Fire Integration tools"""
    
    from .intelligence import (
        handle_autofire_status,
        handle_autofire_patterns,
        handle_autofire_enable,
        handle_autofire_disable,
        handle_autofire_test,
    )
    
    @mcp.tool()
    def autofire_status() -> Dict[str, Any]:
        """
        Get auto-fire integration status and statistics.
        
        Shows:
        - Total fires triggered
        - Tokens tracked
        - Proofs validated (Λ)
        - Facts verified (Φ)
        - Pattern fire counts
        """
        return handle_autofire_status({})
    
    @mcp.tool()
    def autofire_patterns() -> Dict[str, Any]:
        """
        List all registered auto-fire patterns.
        
        Patterns:
        - TOKEN_BUDGET_ALL: Track tokens on every call
        - REFLECTION_ON_FAILURE: Reflect on errors
        - PROOF_VALIDATE_CALC: Validate calc_* results (Λ)
        - FACT_VERIFY_WEB: Verify web_* facts (Φ)
        - ZERO_TOKEN_PRE_EXPENSIVE: Check before expensive ops
        - SAFETY_CHECK_MACHINING: Validate S(x) on machining
        """
        return handle_autofire_patterns({})
    
    @mcp.tool()
    def autofire_enable(pattern_id: str) -> Dict[str, Any]:
        """Enable an auto-fire pattern by ID."""
        return handle_autofire_enable({'pattern_id': pattern_id})
    
    @mcp.tool()
    def autofire_disable(pattern_id: str) -> Dict[str, Any]:
        """Disable an auto-fire pattern by ID."""
        return handle_autofire_disable({'pattern_id': pattern_id})
    
    @mcp.tool()
    def autofire_test(tool_name: str = "calc_cutting_force",
                      event: str = "after") -> Dict[str, Any]:
        """
        Test auto-fire on a simulated tool call.
        
        Events: before, after, on_error
        """
        return handle_autofire_test({'tool_name': tool_name, 'event': event})
    
    print(f"✅ Registered 5 Auto-Fire Tools (P5-META)")
    return 5


# Metadata for auto-fire tools
AUTOFIRE_TOOL_METADATA = {
    'autofire_status': {'category': 'meta', 'tokens': 0},
    'autofire_patterns': {'category': 'meta', 'tokens': 0},
    'autofire_enable': {'category': 'meta', 'tokens': 0},
    'autofire_disable': {'category': 'meta', 'tokens': 0},
    'autofire_test': {'category': 'meta', 'tokens': 0},
}


def register_all_intelligence_tools_v3(mcp: FastMCP) -> int:
    """Register ALL intelligence tools (P1 + P2 + P3 + P5)"""
    count = 0
    count += register_intelligence_tools(mcp)  # 13 P1-INTEL
    # CCE tools already included above
    count += register_workflow_tools(mcp)      # 8 P3-WORKFLOW
    count += register_autofire_tools(mcp)      # 5 P5-META
    print(f"✅ Total Intelligence Tools: {count + 7}")  # +7 for CCE
    return count + 7



# =============================================================================
# P6-OMEGA TOOLS - Omega Integration
# =============================================================================

def register_omega_tools(mcp: FastMCP) -> int:
    """Register P6-OMEGA Integration tools"""
    
    from .intelligence import (
        handle_omega_compute,
        handle_omega_breakdown,
        handle_omega_learn_weights,
        handle_omega_validate,
        handle_omega_history,
        handle_omega_optimize,
    )
    
    @mcp.tool()
    def omega_compute(R: float = 0.8, C: float = 0.8, P: float = 0.8,
                      S: float = 0.8, L: float = 0.5) -> Dict[str, Any]:
        """
        Compute Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
        
        Hard Constraint: S(x) ≥ 0.70 or BLOCKED
        
        Thresholds:
        - RELEASE_READY: Ω ≥ 0.70
        - ACCEPTABLE: Ω ≥ 0.65
        - WARNING: Ω ≥ 0.50
        - BLOCKED: Ω < 0.40 or S < 0.70
        """
        return handle_omega_compute({'R': R, 'C': C, 'P': P, 'S': S, 'L': L})
    
    @mcp.tool()
    def omega_breakdown(R: float = 0.8, C: float = 0.8, P: float = 0.8,
                        S: float = 0.8, L: float = 0.5) -> Dict[str, Any]:
        """Get detailed Omega breakdown with contributions and percentages."""
        return handle_omega_breakdown({'R': R, 'C': C, 'P': P, 'S': S, 'L': L})
    
    @mcp.tool()
    def omega_learn_weights(outcomes: list) -> Dict[str, Any]:
        """
        Learn optimal weights from outcomes.
        
        Each outcome: {components: {R,C,P,S,L}, actual_quality: 0-1, success: bool}
        """
        return handle_omega_learn_weights({'outcomes': outcomes})
    
    @mcp.tool()
    def omega_validate(omega: float = None, S: float = None) -> Dict[str, Any]:
        """Validate Omega score against thresholds."""
        return handle_omega_validate({'omega': omega, 'S': S})
    
    @mcp.tool()
    def omega_history(n: int = 10) -> Dict[str, Any]:
        """Get recent Omega calculation history."""
        return handle_omega_history({'n': n})
    
    @mcp.tool()
    def omega_optimize(R: float = 0.8, C: float = 0.8, P: float = 0.8,
                       S: float = 0.8, L: float = 0.5, 
                       target: float = 0.70) -> Dict[str, Any]:
        """Get optimization suggestions to reach target Omega."""
        return handle_omega_optimize({
            'R': R, 'C': C, 'P': P, 'S': S, 'L': L, 'target': target
        })
    
    print(f"✅ Registered 6 Omega Tools (P6-OMEGA)")
    return 6


def register_all_intelligence_tools_final(mcp: FastMCP) -> int:
    """Register ALL intelligence tools (P1 + P2 + P3 + P5 + P6)"""
    count = 0
    count += register_intelligence_tools(mcp)  # 13 P1-INTEL
    # CCE tools included in intelligence_tools    # 7 P2-CCE
    count += register_workflow_tools(mcp)        # 8 P3-WORKFLOW
    count += register_autofire_tools(mcp)        # 5 P5-META
    count += register_omega_tools(mcp)           # 6 P6-OMEGA
    total = count + 7  # +7 for CCE
    print(f"✅ Total Intelligence Tools: {total}")
    return total



# =============================================================================
# P5-META: Meta-Cognitive + CCE Evolution Tools
# =============================================================================

from .intelligence.meta_cognitive import (
    handle_cce_learn,
    handle_cce_outcomes_report,
    handle_cce_evolve,
    handle_intel_improve_self,
    handle_intel_infer_intent,
    handle_intel_pattern_extract,
    handle_intel_pattern_apply,
    ALL_META_TOOLS,
)


def register_meta_cognitive_tools(mcp: FastMCP) -> int:
    """Register P5-META meta-cognitive tools"""
    
    @mcp.tool()
    def cce_learn(
        problem_type: str,
        techniques_used: List[str],
        outcome: str,
        quality_score: float = 0.5,
        execution_time_ms: int = 0,
        notes: str = ""
    ) -> Dict[str, Any]:
        """
        Record execution outcome for CCE learning.
        
        Tracks which techniques worked for which problem types.
        Use after every significant execution to improve future recommendations.
        
        Args:
            problem_type: Type of problem (calculation, code, analysis, etc.)
            techniques_used: List of technique names used
            outcome: "success", "partial", or "failure"
            quality_score: 0-1 quality rating
            execution_time_ms: How long it took
            notes: Any additional notes
        """
        return handle_cce_learn({
            'problem_type': problem_type,
            'techniques_used': techniques_used,
            'outcome': outcome,
            'quality_score': quality_score,
            'execution_time_ms': execution_time_ms,
            'notes': notes
        })
    
    @mcp.tool()
    def cce_outcomes_report() -> Dict[str, Any]:
        """
        Generate learning analytics report.
        
        Shows:
        - Overall success/failure rates
        - Improvement trends over time
        - Top performing techniques
        - Problem type breakdown
        """
        return handle_cce_outcomes_report({})
    
    @mcp.tool()
    def cce_evolve(
        problem_type: str = None,
        min_outcomes: int = 5
    ) -> Dict[str, Any]:
        """
        Evolve technique compositions based on outcomes.
        
        Analyzes which technique combinations work best for problem types.
        Recommends techniques to prefer or avoid.
        """
        return handle_cce_evolve({
            'problem_type': problem_type,
            'min_outcomes': min_outcomes
        })
    
    @mcp.tool()
    def intel_improve_self(focus_area: str = None) -> Dict[str, Any]:
        """
        Self-improvement suggestions based on patterns.
        
        Analyzes outcome history to find improvement opportunities.
        Focus areas: speed, quality, reliability.
        """
        return handle_intel_improve_self({'focus_area': focus_area})
    
    @mcp.tool()
    def intel_infer_intent(
        user_message: str,
        context: Dict[str, Any] = None,
        history: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Infer user intent from context.
        
        Analyzes message to determine:
        - Primary intent (create, fix, analyze, etc.)
        - Urgency level
        - Complexity
        - Suggested approach
        """
        return handle_intel_infer_intent({
            'user_message': user_message,
            'context': context or {},
            'history': history or []
        })
    
    @mcp.tool()
    def intel_pattern_extract(
        min_occurrences: int = 3,
        domain: str = None
    ) -> Dict[str, Any]:
        """
        Extract reusable patterns from execution history.
        
        Analyzes recorded outcomes to find:
        - Recurring successful technique combinations
        - Problem-to-solution mappings with success rates
        - High-quality technique pairs
        
        Builds a pattern library for intel_pattern_apply.
        """
        return handle_intel_pattern_extract({
            'min_occurrences': min_occurrences,
            'domain': domain
        })
    
    @mcp.tool()
    def intel_pattern_apply(
        problem_type: str,
        context: Dict[str, Any] = None,
        max_recommendations: int = 5
    ) -> Dict[str, Any]:
        """
        Apply learned patterns to recommend techniques for a new problem.
        
        Searches:
        1. Direct pattern matches from extracted library
        2. Proven technique combinations (>0.7 quality)
        3. Technique track records from learning data
        4. Similar problem analysis from raw outcomes
        
        Returns ranked recommendations with confidence scores and evidence.
        """
        return handle_intel_pattern_apply({
            'problem_type': problem_type,
            'context': context or {},
            'max_recommendations': max_recommendations
        })
    
    print(f"✅ Registered 7 Meta-Cognitive Tools (P5-META)")
    return 7


def register_all_tools_complete(mcp: FastMCP) -> int:
    """Register ALL intelligence tools (P1 + P2 + P3 + P5-AutoFire + P5-Meta + P6)"""
    count = 0
    count += register_intelligence_tools(mcp)     # 13 P1-INTEL
    # CCE tools included in intelligence_tools     # 7 P2-CCE  
    count += register_workflow_tools(mcp)          # 8 P3-WORKFLOW
    count += register_autofire_tools(mcp)          # 5 P5-META AutoFire
    count += register_meta_cognitive_tools(mcp)    # 7 P5-META Cognitive (5 base + 2 pattern)
    count += register_omega_tools(mcp)             # 6 P6-OMEGA
    total = count + 7  # +7 for CCE
    print(f"✅ Total Intelligence Tools: {total}")
    return total
