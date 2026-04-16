#!/usr/bin/env node
/**
 * AI Reasoning Session Start Hook
 * ================================
 * Fires on session start to remind about PRISM AI capabilities.
 *
 * Output: JSON with hookSpecificOutput containing AI guidance
 */

const AI_GUIDANCE = `
## PRISM AI-First Development Protocol

You have access to **prism_ai** dispatcher (87 actions) for AI-powered reasoning:

### Core Reasoning (12 actions)
- reason, speed_feed, tool_select, sequence, strategy, quote
- resolve_error, safety_check, feasibility, process_plan, gcode, stats

### Multi-Agent Coordination (14 actions)
- register_session, update_session, list_sessions, execute_chain
- claim_chain, release_chain, share_chain, query_chains, token_status

### Reasoning Chain Sharing (7 actions)
- register_reasoning_chain, share_reasoning_chain, find_similar_chain
- validate_chain, query_shared_chains, extract_tribal

### Opus-Level Capability (6 actions)
- opus_execute, opus_assess_complexity, opus_validate_physics
- opus_translate_nl, opus_generate_hypotheses, opus_stats

### Neural Bridge / Semantic Search (8 actions)
- neural_index_entity, neural_semantic_search, neural_find_similar
- neural_graph_reasoning, neural_detect_gaps, neural_infer_relations

### Agent Profiles (10 actions)
- profile_register, profile_match, profile_best
- team_compose, team_get, profile_stats

### Chain-of-Thought + Advanced (30 actions)
- cot_reason, cot_adversarial, cot_tree_search
- uncertainty_analytical, uncertainty_monte_carlo
- learning_update, learning_status, decision_select
- roadmap_intelligence, proactive_* actions

### When to Use prism_ai:
1. **Complex reasoning** → opus_execute with category="deep_reasoning"
2. **Physics validation** → opus_validate_physics
3. **Natural language → structured** → opus_translate_nl
4. **Find similar past solutions** → neural_semantic_search or find_similar_chain
5. **Multi-step problems** → cot_reason or cot_tree_search
6. **Uncertainty analysis** → uncertainty_monte_carlo
7. **Team coordination** → team_compose with requirements

### AI Integration Checkpoint:
Before completing any significant work, ask:
- Could prism_ai have helped reason about this?
- Should reasoning chains be shared with extract_tribal?
- Are there knowledge gaps to detect with neural_detect_gaps?
`;

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: AI_GUIDANCE.trim()
  }
}));
