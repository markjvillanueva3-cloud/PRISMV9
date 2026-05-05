---
schema_version: 1.0.0
source: project
section: MULTI-CLI ORCHESTRATION (Claude master, Gemini + Codex peers — added 2026-05-04)
slug: multi-cli-orchestration-claude-master-gemini-codex-peers-added-2026-05-04
start_line: 84
end_line: 99
indexed_at: 2026-05-05T13:49:55.469Z
content_hash: 8619bea16e188a735d9786baa7b6d93fba48bb94401585e81765e6317f0d59a2
mirror_engine: ClaudeMdChunkerEngine
---
## MULTI-CLI ORCHESTRATION (Claude master, Gemini + Codex peers — added 2026-05-04)
PRISM is wired for three coding CLIs in parallel — same MCP server, same context, same skills/hooks.

- **Claude Code** (master) — context: `CLAUDE.md` (this file) + `~/.claude/CLAUDE.md` (global). MCP: stdio-spawn `mcp-server/dist/index.js`. Auth: Claude Max subscription.
- **Gemini CLI** (`@google/gemini-cli`) — context: `GEMINI.md` (project) + `~/.gemini/GEMINI.md` (global), both verbatim mirrors of CLAUDE.md. MCP: `gemini mcp add prism node H:\prism\mcp-server\dist\index.js`. Hooks: `gemini hooks migrate` ports Claude Code hooks. Auth: Google account OAuth (uses Gemini Advanced subscription).
- **Codex CLI** (`@openai/codex`) — context: `AGENTS.md` (project) + `~/.codex/AGENTS.md` (global), verbatim mirrors. MCP: `[mcp_servers.prism]` block in `~/.codex/config.toml` (stdio: `command = "node"`, `args = ["H:\\prism\\mcp-server\\dist\\index.js"]`). Plugins via `codex plugin`. Auth: ChatGPT subscription OAuth.

**Mirror-sync:** `H:/prism/.claude/helpers/sync-cli-context-files.mjs` keeps CLAUDE.md → GEMINI.md / AGENTS.md aligned on every edit. **Edit CLAUDE.md only** (project) or `~/.claude/CLAUDE.md` (global) — sync helper propagates to the others. Run manually after major edits, or wire to a Stop hook for auto-sync.

**When to use each CLI:**
- **Claude** — orchestration, deep reasoning, safety-critical reviews, multi-file refactors
- **Gemini** — long-context (2M token) jobs, alternative perspective in consensus, cost-efficient bulk
- **Codex** — non-interactive batch via `codex exec`, sandboxed exploration, parallel co-worker sessions

Multi-model consensus across all three + Ollama: see MULTI-MODEL CONSENSUS section.
