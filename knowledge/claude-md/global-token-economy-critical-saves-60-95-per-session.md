---
source: global
section: TOKEN ECONOMY (CRITICAL — saves 60-95% per session)
slug: token-economy-critical-saves-60-95-per-session
indexed_at: 2026-04-28T00:49:50.568Z
---

## TOKEN ECONOMY (CRITICAL — saves 60-95% per session)

### RTK Prefix (MANDATORY for Bash output)
Always prefix these commands — RTK strips redundant output:
| Command | Savings | Command | Savings |
|---------|---------|---------|---------|
| `rtk vitest run` | 99% | `rtk tsc` | 83% |
| `rtk git status/log/diff` | 59-80% | `rtk gh pr view/diff` | 79-87% |
| `rtk npm/pnpm install` | 70-90% | `rtk docker ps/logs` | 75% |
| `rtk grep` | 75% | `rtk ls` | 65% |

Use even in `&&` chains. Skip only if output <500 chars. `rtk gain` shows session savings.

### Ollama Offload (FREE local inference)
Route these to Ollama instead of consuming Claude tokens:
- **Code explanation** → `ollama-task-offloader.mjs` auto-suggests
- **Summarization** → local qwen2.5-coder:32b handles
- **Doc generation** → route via `OllamaHookBridgeEngine`
- **CLAUDE.md rule selection** → `claudemd-ollama-enforcer.mjs` (85% savings)

Manual: `curl -X POST http://localhost:11434/api/generate -d '{"model":"qwen2.5-coder:32b","prompt":"..."}'`

### Tool Selection (minimize tool calls)
| Instead of... | Use... | Why |
|---------------|--------|-----|
| Multiple `Grep` | Single `Agent subagent_type=Explore` | One call vs many |
| `Bash find/grep` | `Glob` / `Grep` native tools | Better UX, cached |
| Re-reading files | Trust context (hooks track changes) | No re-read after Edit/Write |
| Full file Read | `Read offset=X limit=Y` | Partial reads for large files |
| Sequential tool calls | Parallel independent calls | 1 round-trip vs N |

### Context Extension Strategies
1. **Per-agent handoff** — Each of 6 concurrent chats has own `HANDOFF-<session>.md`
2. **Memory files** — `MEMORY.md` persists cross-session (under 200 lines)
3. **Digests** — Pre-computed indexes replace live exploration
4. **Skills** — Load-on-demand (not always in context)
5. **Hooks** — Inject only when relevant (pattern-matched)

---
