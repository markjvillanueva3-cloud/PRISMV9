---
name: reference_claude_desktop_cli_parity_2026_06_22
description: Claude Desktop app's "Code" tab IS Claude Code (same engine) — it loads the SAME ~/.claude/settings.json hooks + project .claude + CLAUDE.md + MCP as the CLI. So ollama-offload / hermes / obsidian / psn parity is automatic by design. Verified: no separate desktop settings.json, portable-node present, substrate injectors are user-level. Only undocumented bit = hook-fire timing in desktop (test empirically).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.518Z
aliases: reference_claude_desktop_cli_parity_2026_06_22
---


# Claude Desktop ↔ CLI parity for ollama/hermes/obsidian/psn — 2026-06-22 (slot:zulu)

Operator: "make sure the Claude desktop app (esp. Claude Code) has access to everything the CLI has + operates the same re: ollama offload, hermes, obsidian vault, psn."

## Verdict: parity is BY DESIGN — nothing to build
Claude Code docs (via claude-code-guide): *"Each surface connects to the same underlying Claude Code engine, so your CLAUDE.md files, settings, and MCP servers work across all of them."* The Desktop app's **Code** tab IS Claude Code (not a separate product). No documented differences for settings/hooks/MCP loading.

## Verified locally (this session)
- The 4 substrates (ollama-offload, hermes, obsidian, psn) are all **USER-LEVEL hooks** in `C:/Users/wompu/.claude/settings.json` (64 UserPromptSubmit hooks: obsidian-vault-precheck, cag-router, master-index-precheck, ollama-pipeline-injector, ollama-prewarm, memory-rag-inject, tribal-by-domain, memory-index-precheck, psn-tag-parser, psn-leg-state, psn-prompt-checklist, ...). User-level → fire regardless of which project is open.
- Claude Desktop has **NO separate settings.json** (`AppData/Roaming/Claude/` has `claude_desktop_config.json` = the desktop's MCP, but no settings override). So it does NOT override the shared `~/.claude/settings.json`.
- Hooks invoke a **hardcoded `H:/.claude/bin/portable-node`** (present, +`.cmd`) — NO PATH dependency, so they run regardless of the launcher's environment.
- Substrate hooks are **pure context-injectors** (read files / call ollama / call MCP :3100) — no terminal needed, so the desktop (non-terminal) context doesn't break them. (Only terminal/SendKeys hooks — zulu-orchestrator, self-compact, window-rename — are CLI-only, and those are NOT the 4 substrates.)

## To "make sure" (operator checklist — there is no config to change)
1. In the desktop app's **Code** tab, open **H:/prism** as the project folder (so project CLAUDE.md + project `.claude/settings.json` load; the user-level substrate hooks fire regardless of folder). NB: desktop has `git-worktrees.json` — if it opens a WORKTREE instead of `H:/prism`, project-relative hooks key on that path; open the main tree for full parity.
2. Bring up the shared runtime deps (same as CLI): **prism MCP HTTP `:3100`** (the obsidian-RAG + memory-rag hooks call it), **Ollama `:11434`**, and the **Hermes proxy `:8645`** when started. These are shared dependencies, not desktop-specific.
3. **Empirically verify** (the ONE undocumented bit): submit a prompt in the desktop Code tab on H:/prism and confirm the SAME injection banners appear as in the CLI (PSN savings headline, CAG-route, obsidian-vault-precheck, psn-leg-state, ollama-pipeline, master-index). If they appear → full parity proven. If they do NOT fire → that's a genuine Claude Code desktop bug to report to Anthropic (the docs say they should be identical).

## Note
Desktop MCP (`claude_desktop_config.json` mcpServers.prism) spawns a STDIO server via `C:/Program Files/nodejs/node.exe H:/PRISM/mcp-server/dist/index.js` — that is the desktop's MCP TOOL path; the HOOKS use the `:3100` HTTP bridge independently. Both must be healthy for full tool+hook parity. Source: [[reference_hermes_obsidian_utilization_assessment_2026_06_22]].
