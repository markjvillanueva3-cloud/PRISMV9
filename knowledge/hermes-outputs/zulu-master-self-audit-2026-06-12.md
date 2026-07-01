# ZULU Master Self-Audit — Research Synthesis + Efficiency Plan
**Date:** 2026-06-12 (autonomous build)
**Sources:** Ollama qwen2.5-coder:32b (Hermes architecture + Obsidian vault best practices) + loaded CLAUDE.md + existing PRISM surfaces.

## 1. Research Synthesis (Ollama Fan-Out)

### Hermes Agent Best Practices (from qwen2.5-coder:32b)
- **Core Components:** Skills (modular capabilities), Hooks (lifecycle callbacks), Slash commands (user control), Memory providers (persistent state), Delegation (task distribution), MCP integration (external coordination), Gateway (entry point).
- **Best Practices for Master Orchestrator (PRISM 17 slots / 34 galaxies):**
  - Persistent memory: Robust DB with versioning + backups.
  - Token efficiency: Batching, context management, monitoring.
  - Autonomous self-improvement loops: Feedback mechanisms, skill updates, experimentation.
  - Scalability: Load balancing, containerization, redundancy.
  - Our current master bridge + live heartbeat hook aligns well with hooks + MCP + delegation.

### Obsidian Vault as Central Brain (from qwen2.5-coder:32b)
- **Daily Notes:** Templates, backlinks, tags for consistency.
- **Knowledge Graphs:** Nodes/links for galaxies, dynamic updates.
- **Tribal Knowledge Capture:** Documentation + community + version control.
- **Wiki Integration:** Sync + access control.
- **Self-Learning Loops:** Feedback + automation + ML integration.
- **Scalability for PRISM:** Modular folders per galaxy, cross-referencing, search optimization.
- Our `knowledge/` vault (34 MEMORY.md + wiki + tribal) is strong; live heartbeat + master bridge adds real-time layer.

### CLAUDE.md Patterns (from system prompt + synthesis)
- **Expert Role + Deep Thinking:** Exhaustive analysis, edge cases, second-order effects.
- **4-LOOP Protocol:** Build → Scrutinize (3-of-3) → Gap Fill → Tie Up (tests + wiring).
- **Self-Awareness Guards:** Duplication checks, inventory, ai-feature-recommend before any create.
- **Handoff Protocol:** Per-chat HANDOFF-*.md + stable session ID.
- **Token Economy:** Route mechanical to local (Ollama), reserve Claude for judgment.
- **Common Gaps when not applied:** Duplication, stubs, shallow tests, context loss, no real execution verification, ignored safety gates.

## 2. Gap Analysis — Our Current System (Master Bridge + Live Heartbeat)
**Strengths (Applied Well):**
- Master brain role + direct H: access + MCP + PS ZULU delegation.
- Real-time live heartbeat surface + hook (aligns with Hermes hooks + Obsidian graphs).
- CLAUDE.md rules enforced (no stubs, real tool output, self-awareness).
- Ollama integration confirmed.
- Write lane limited to hermes-outputs/.

**Gaps / Not Fully Applied:**
1. **Persistent Memory for ZULU Master:** No dedicated Hermes memory provider (Honcho/Mem0) wired for cross-session ZULU state beyond files. Risk of losing orchestration history.
2. **CAG / RAG / LoRA in Coordination:** No explicit Context-Augmented Generation or RAG layer on the bus/workboard for galaxy knowledge retrieval. LoRA adapters not applied to orchestrator for domain-specific routing.
3. **Self-Improvement Loops:** Weekly reflection exists in MEMORY, but no automated "RGS" (Research-Generate-Synthesize) loop using Ollama to continuously audit and patch the master bridge.
4. **Forge & RGS Slash Commands:** Not yet implemented as first-class Hermes slash commands (forge-triple is PRISM concept; RGS is missing).
5. **Efficiency in Build:** Still some one-off files instead of reusable skills/hooks. Token economy good (Ollama used here) but not fully gated in every turn.
6. **Obsidian Graph Integration:** Knowledge graphs not dynamically updated from live heartbeat.
7. **Agentic Coding Patterns:** Delegation to PS ZULU is manual; no automatic skill-based routing for Claude Code CLI tasks.

## 3. Efficiency Plan — Applying Everything + Most Efficient Ways
**Forge-Triple Application (new /forge command):**
- Every future enhancement = Hook + MCP action + Skill (e.g., the live heartbeat was hook-only; next iteration adds MCP action + skill).

**RGS Loop (new /rgs slash command — Research-Generate-Synthesize):**
- Weekly autonomous loop: Ollama fans out on key topics → Generates patch proposals → Synthesizes into skills/hooks → Applies via 4-LOOP.

**Immediate Actions (Autonomous Next):**
1. Wire Hermes memory provider for ZULU (persistent orchestration memory).
2. Add RAG layer on live-fleet-heartbeat.jsonl (semantic search over heartbeats).
3. Create `/forge` and `/rgs` slash commands (via hermes_cli/commands.py extension or skill).
4. Convert master bridge into a loadable skill (`prism-galaxy-master`).
5. Add LoRA fine-tune path for ZULU routing model (using existing gpt-oss models).
6. Update Obsidian graph with live heartbeat nodes (via plugin or script).

**Efficiency Gains:**
- Skills/hooks > custom code (reuse across galaxies).
- Ollama for all mechanical research/synthesis (saves Claude tokens).
- 4-LOOP + self-awareness on every change.
- PS ZULU as specialized execution arm (PowerShell/Claude Code CLI).

**Verdict:** We have a strong foundation (master bridge + live feed) but are not yet taking full advantage of Hermes skills/hooks + Obsidian graphs + CLAUDE.md 4-LOOP + CAG/RAG/LoRA loops. The RGS loop + forge-triple will close the gaps and make ZULU the most efficient master orchestrator possible.

---
**Status:** Research complete. Plan ready. Next autonomous step: Implement RGS loop + /forge + /rgs commands under full CLAUDE.md rules.