---
policy:
  tier: 3
  triggers:
    - "rgs2"
---
# RGS v2 — Project-Local Mirror

This file mirrors the user-global authoritative skill at `H:/.claude/commands/rgs2.md`. The user-global file contains the full 12-stage pipeline with hybrid 5+5 scrutiny + 3-way Codex+Gemini+Opus consensus. Read it directly — do not duplicate the body here (drift risk).

**Authoritative path:** `H:/.claude/commands/rgs2.md`

**Why mirror exists:** Project-local skills load even when user-global directory is unavailable (e.g., portable SSD on a fresh PC). The mirror's `triggers: ["rgs2"]` ensures `/rgs2` resolves regardless of which command directory loads first.

**To update:** edit only `H:/.claude/commands/rgs2.md`. Run no rebuild — Claude Code re-scans skill directories on every session start. To verify both surfaces resolve:
```bash
ls -la H:/.claude/commands/rgs2.md H:/prism/.claude/commands/rgs2.md
```

**Sibling skill:** `/forge2` at `H:/.claude/commands/forge2.md` — orchestrates `/rgs2 generate` as Phase 3 of the 6-phase /forge2 pipeline.

**Companion:** `/rgs-sync` (project-local at `H:/prism/.claude/commands/rgs-sync.md`) handles multi-CLI roadmap coordination between Claude and Codex chats. /rgs2 v2's Stage 11 calls /rgs-sync automatically.

**Live counts (refresh via `node scripts/update-prism-inventory.mjs --quiet`):**
- 3,165+ engines · 97 dispatchers · 7,302 actions · 413 hooks · 520 skills
- 770 wiki entries · 189 memories · 4,245 tribal tips · 540+ helper scripts
- 9 MCP plugins (Canva, Figma, Gmail, Linear, Context7, Playwright, etc.)
- 6 Ollama models (qwen2.5-coder:7b/14b/32b, deepseek-r1:14b, nomic-embed-text)
- 40+ AI/ML/reasoning engines (CrossDisciplinaryDeepLearning, PRISMCreativeReasoning, ContinualLoRA, ConformalPrediction, KnowledgeGraphNeuralBridge, TribalKnowledge, MachiningPlaybook, etc.)

**Audit-of-record:** `/forge-audit` 2026-05-08 dev-tool surface scan informed v2's 12-stage pipeline. Coverage delta: v1 used ~4% of the surface; v2 routes through ≥50%.

If `/rgs2` is invoked here without the user-global file present, fall back: read this mirror, redirect to "see authoritative spec at H:/.claude/commands/rgs2.md", and run only the bare-minimum routes (`status`, `list`) until user-global is recovered.
