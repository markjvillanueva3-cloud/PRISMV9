# Hermes + Obsidian: Self-Learning / Self-Improving OS Pattern
Sources:
- https://x.com/cyrilXBT/article/2061290917403713538 "Obsidian + Hermes Agent one system" (login-walled; preview only)
- Equivalent full capture: https://artemxtech.substack.com/p/i-stopped-teaching-my-agent-who-i (Artem Zhutov, "my second brain learns me back")
- Related: github.com/itechmeat/open-second-brain (nightly dream passes), github.com/Burgunthy/hermes-second-brain (Hermes+Obsidian+LLM Wiki compound system)
Captured: 2026-06-09 — zulu slot

## The core thesis (from cyrilXBT preview + equivalents)
Vault stores knowledge but can't act. Agent acts but forgets. Connect them into ONE system:
agent READS vault before acting, WRITES outcomes back after — a closed self-learning loop.

## The self-improvement loop (three background triggers, from Hermes source)
1. **Memory review @ 10 user turns** — dedicated learning agent analyzes the transcript for
   "persona, desires, preferences" → writes to USER.md / MEMORY.md, or stops if nothing worth saving.
2. **Skill review @ 15 tool iterations** — learning pass finds "non-trivial approaches that
   worked" → updates existing skills or creates new ones autonomously.
3. **Idle session pass @ 4 AM** — sessions untouched for days get a final learning review.

## Channel isolation
Separate Discord channels per life area (vault / build / content). Each channel = isolated skill
set + custom personality via CLAUDE.md-style prompt file defining scope and behavior.

## Division of labor
- **Hermes (phone/async):** capture inbox, async tasks, skill execution.
- **Claude Code (desk):** deep work with human oversight, file-by-file control alongside Obsidian.
Treat the agent as an asynchronous CAPTURE INBOX feeding the knowledge system.

## open-second-brain pattern (nightly dream passes)
Local-first memory living IN the Obsidian vault; nightly passes turn REPEAT CORRECTIONS into
confirmed preferences with measurable confidence. Adapters for Claude Code/Codex/OpenClaw + MCP.

## hermes-second-brain pattern (compound knowledge)
Self-growing second brain = Hermes Agent + Obsidian + LLM Wiki. Claude Code delegates, Hermes
executes 24/7 on a server, reachable from Discord/CLI.

## PRISM mapping for Task #35 (wire Hermes→Obsidian self-learning loop)
PRISM's "Obsidian vault" = `knowledge/memories/` + `knowledge/wiki/` (722-entry index, code-tribal).
Already-built analogs:
- READ-before-act: recall injectors (memory-relevance, wiki-precheck-inject, galaxy-brain inject) ✓
- WRITE-outcomes-back: post-ship distillation (reference_post_ship_*), error-pattern-promote ✓
- 4AM idle pass analog: galaxy crons + weekly-hermes-reflection (exists per wiki node) — verify
- Repeat-corrections→confirmed-preferences w/ confidence: NO equivalent (gap)
- @10-turns memory review / @15-tool-calls skill review COUNTERS: NO turn-counter triggers (gap —
  PRISM triggers are event-based hooks, not accumulation counters)
