# claude-octopus Integration Spike

**Milestone:** INTEL-OLLAMA-OBSIDIAN-MS0 / Hybrid path 1
**Spike date:** 2026-05-04
**Plugin version:** octo@nyldn-plugins v9.30.0
**Marketplace:** https://github.com/nyldn/plugins.git
**Plugin root (this machine):** `~/.claude/plugins/cache/nyldn-plugins/octo/9.30.0/`

## Install commands actually executed

```
claude plugin marketplace add https://github.com/nyldn/plugins.git
claude plugin install octo@nyldn-plugins
```

Both succeeded; plugin scope = user. Marketplace registered in user settings; clean uninstall path documented as `claude plugin uninstall octo`.

Note: `git` must be on PATH for `marketplace add` to clone. On this machine `git` is at `C:\Program Files\Git\cmd\git.exe`; the npm-installed `claude.cmd` doesn't inherit Git Bash's PATH so we set `$env:Path` before invoking.

## Discrepancy with documented surface

The plugin's public README claims:
> Plugin operates in isolated namespace... uses only PostToolUse and PostCompact, doesn't interfere with user-defined hooks.

**Reality** (per `~/.claude/plugins/cache/nyldn-plugins/octo/9.30.0/.claude-plugin/hooks.json`): the plugin registers hooks on **22 distinct events**:

| Event | Octopus matchers | PRISM has hooks? |
|------|-----------------|-----------------|
| PreToolUse | Bash patterns (orchestrate/codex/gemini/scheduler/destructive), TaskCreate, EnterPlanMode, Edit\|Write (freeze) | Yes — many HARD BLOCK gates |
| PostToolUse | Bash\|Agent\|Write\|Edit\|Read\|WebFetch\|Grep (broad), Bash patterns, TaskUpdate | Yes — auto-wire, build-check |
| SessionStart | unmatched (always) — 6 hooks | Yes — claude-brief, awareness, etc |
| SessionEnd | unmatched — 2 hooks | Yes |
| UserPromptSubmit | unmatched — 2 hooks | Yes — wiki-precheck, chat-bus, pre-review |
| PreCompact | unmatched | Yes |
| PostCompact | unmatched | No |
| TaskCreated, TaskCompleted, SubagentStop | unmatched | Partial |
| WorktreeCreate, WorktreeRemove | unmatched | No |
| ConfigChange, CwdChanged, TeammateIdle, Elicitation, ElicitationResult, PermissionDenied, StopFailure, InstructionsLoaded | unmatched | No |

**Implication:** every PRISM tool call (Bash/Edit/Write/Read/Grep) now fires `post-tool-dispatch.sh` from octopus in addition to existing PRISM hooks. Every UserPromptSubmit fires both PRISM's wiki-precheck/chat-bus/pre-review-inject AND octopus's user-prompt-submit + done-criteria. Per-call overhead is bounded by per-hook timeouts (3-60s, mostly 5-10s) but not zero.

## Coexistence test

After install, ran all 132 P20+P22+P23 tests via `npx vitest run` — **all pass**. Vitest doesn't go through the Claude Code hook system, so this only proves PRISM source is uncorrupted, not that runtime hook composition is clean. Runtime composition only takes effect on NEW Claude Code sessions; this current session was started before the install and won't see the plugin until restart.

## What's installed

- **48 slash commands** at `~/.claude/plugins/cache/nyldn-plugins/octo/9.30.0/.claude/commands/` — exposed as `/octo:auto`, `/octo:debate`, `/octo:debug`, `/octo:plan`, `/octo:review`, etc. PRISM's existing slash commands are not displaced; they live in a separate cache and resolve by name.
- **52 skills** at `.../.claude/skills/skill-*.md`
- **10 agents** at `.../.claude/agents/*.md` (backend-architect, code-reviewer, debugger, security-auditor, etc.)
- **2 plugin-internal hooks** at `.../.claude/hooks/{pre-commit.sh,visual-feedback.sh}` plus dozens at `.../hooks/*.sh` referenced by `hooks.json`.

## Provider auth status (per plugin docs, NOT yet verified)

| Provider | Auth | This machine status |
|---------|------|--------------------|
| Claude (Opus/Sonnet) | Built-in | ✓ already authenticated |
| Codex (GPT-5.4) | OPENAI_API_KEY env OR `codex login` OAuth | Unknown — `codex` CLI not verified on PATH |
| Gemini | GEMINI_API_KEY OR OAuth | Unknown |
| Qwen | OAuth flow first use (1-2k free req/day) | Unknown — would activate on `/octo:setup` |
| Ollama | local install, no auth | ✓ running on 127.0.0.1:11434 (qwen, deepseek-r1, nomic-embed-text, llama3.2-vision) |
| Copilot | existing GitHub subscription | Unknown |
| Perplexity | subscription | Not configured |

## Recommendations

**Keep plugin installed but expect overhead.** The hook surface is broader than advertised; on a slow machine the cumulative per-tool-call overhead from `post-tool-dispatch.sh` could be noticeable. Run `/octo:setup` in a future session to see what providers actually wire up and let it auto-detect.

**For PRISM-aware paths use the native stack** (P20+P22+P23 already shipped):
- `prism_ai:model_route` for tier selection
- `prism_ai:pre_review` for deepseek-r1 drafts
- `/pre-review` for manual invocation
- `prism_dev:model_telemetry_*` for cost tracking

**For general coding tasks not bound by PRISM physics/safety:** try `/octo:auto`, `/octo:debate`, `/octo:plan`. The 75% consensus gate may add value when refactoring is contentious.

**If overhead becomes painful:** disable the plugin without uninstalling:
```
claude plugin disable octo
```
Plugin can be re-enabled later. Uninstall path (verified in docs):
```
claude plugin uninstall octo
claude plugin marketplace remove nyldn-plugins
```

## Open follow-ups

1. **Restart a Claude Code session and run `/octo:setup`** — only way to discover which providers actually have credentials on this machine.
2. **Latency benchmark** — measure round-trip time for a small Bash call before vs after enabling, to quantify the post-tool-dispatch overhead concretely.
3. **Tier-6 escalation in `ModelRouterEngine`?** — could expose octopus debate/consensus as a synthetic tier-6 above Claude (when even Claude isn't enough). Not built; flag for design discussion.
4. **Settings hygiene audit** — run `/harness-security-audit` after `/octo:setup` to confirm none of octopus's settings.json entries softened existing PRISM gates.

## What did NOT happen

- The plugin did NOT modify `H:/.claude/settings.json` directly (verified). Per Claude Code plugin contract, plugin hooks are loaded from the plugin's own `hooks.json`, not merged into user settings.
- The plugin did NOT add any keys to PRISM dispatchers, engines, or skills.
- The 132 P20+P22+P23 tests do NOT depend on octopus and continue to pass.
- `~/.claude-octopus/` does NOT exist yet — created lazily when octopus first invokes a workflow.
