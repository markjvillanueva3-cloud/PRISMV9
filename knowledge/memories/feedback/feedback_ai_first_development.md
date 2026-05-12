---
name: AI-First Development Preference
description: User wants all development to leverage PRISM AI reasoning (prism_ai dispatcher with 87 actions) by default
type: feedback
originSessionId: 5621c4f7-6dcb-4da2-a8be-51e37bef599a
---
## Rule
Always consider and use prism_ai dispatcher for complex work. Don't wait to be asked.

**Why:** User explicitly requested AI-first development workflow. The prism_ai dispatcher has 87 actions covering reasoning, physics validation, semantic search, chain-of-thought, uncertainty analysis, and multi-agent coordination. These capabilities should be used proactively, not just when requested.

**How to apply:**
1. **Before complex reasoning** → Check `neural_semantic_search` for similar past solutions
2. **For physics calculations** → Always validate with `opus_validate_physics`
3. **After discovering something new** → Use `extract_tribal` to capture as tribal knowledge
4. **For debugging/diagnosis** → Use `resolve_error` or `opus_generate_hypotheses`
5. **For multi-step problems** → Use `cot_reason` or `cot_tree_search`
6. **For uncertainty analysis** → Use `uncertainty_monte_carlo`
7. **For team coordination** → Use `team_compose` with requirements

## Key prism_ai Actions by Category

### Opus-Level (complex reasoning)
- `opus_execute` — Deep reasoning with category routing
- `opus_validate_physics` — Physics formula validation
- `opus_translate_nl` — Natural language to structured
- `opus_generate_hypotheses` — Hypothesis generation for debugging

### Neural Bridge (semantic search)
- `neural_semantic_search` — Find similar past solutions
- `neural_index_entity` — Index new knowledge
- `neural_detect_gaps` — Find knowledge gaps

### Chain-of-Thought
- `cot_reason` — Step-by-step reasoning
- `cot_tree_search` — Beam search through reasoning paths
- `cot_adversarial` — Self-questioning

### Multi-Agent
- `team_compose` — Compose team for complex tasks
- `profile_best` — Find best agent profile for task
- `extract_tribal` — Extract learnings to tribal knowledge

## Enforcement
Hooks installed:
- SessionStart: `ai-reasoning-session-start.mjs` — Reminds about prism_ai capabilities
- Stop: `ai-integration-stop-check.mjs` — Checks if AI was used, suggests opportunities
