---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_ai_first_development.md
source_filename: feedback_ai_first_development.md
content_hash: c2def89b979a54b5293f59d23c73b41523922859724c0b41b4484e1abbc0089a
mirror_ts: 2026-05-05T13:00:09.412Z
mirror_engine: ObsidianMemorySyncEngine
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
