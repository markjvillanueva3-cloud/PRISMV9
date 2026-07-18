# Hermes Agent Masterclass — The Complete Course (Nous Research)
Source: https://x.com/cyrilXBT/article/2060883609935077667 (login-walled repost)
Canonical mirror captured: https://www.dailydoseofds.com/p/hermes-agent-masterclass/ (Avi Chawla)
Captured: 2026-06-09 — zulu slot. Hermes = NousResearch/hermes-agent (90K GitHub stars in 2 months).

## Core architecture
- Single `AIAgent` class (`run_run.py`) = unified entry for CLI, messaging gateways, batch, IDE.
- ReAct-style synchronous loop: build system prompt → check compression → interruptible API call → execute tools → iterate.
- Six execution environments: local terminal, Docker, SSH, Modal, Daytona, Singularity.
- Multi-provider: Claude, GPT, Gemini, Ollama via translation layers.
- **Hard 90-turn per-task cap** — prevents runaway loops and credit waste.

## Identity layer: SOUL.md
- `~/.hermes/SOUL.md` occupies SLOT #1 of the system prompt, before all other context.
- Defines personality, tone, communication style, HARD LIMITS. Static across sessions/projects.
- The frame within which memory + skills operate.

## Three-tier memory
**Tier 1 — persistent markdown, strict caps:**
- `MEMORY.md` (2,200 char max): environment notes, project conventions, tool quirks, lessons.
- `USER.md` (1,375 char max): user profile, preferences, skill level, things to avoid.
- Writes persist immediately; appear in system prompt NEXT session.
- At ~80% capacity the agent CONSOLIDATES entries into denser versions.

**Tier 2 — SQLite FTS session store** (`state.db`): every conversation searchable; unlimited
capacity; costs active search + LLM summarization.

**Tier 3 — external memory providers** (8 plugins, one active at a time): auto-prefetch relevant
memories BEFORE each turn, sync turns after responses, extract memories at session end.

## Self-evolving skills (procedural memory)
- Markdown files + YAML frontmatter (name, description, version, author, platforms) with
  procedures, pitfalls, verification criteria.
- **Progressive disclosure:** L0 names+descriptions (~3K tokens whole catalog) → L1 full content → L2 reference files.
- **Autonomous creation triggers** (`skill_manage` tool): complex task done (5+ tool calls),
  solution found after errors/dead ends, user corrections, non-trivial workflow discovered.
- Actions: create, patch (preferred — token-cheap), edit, delete, write_file, remove_file.

## Curator — automated skill maintenance
- Background fork on INACTIVITY checks (not cron): after 7 days without updates + 2h idle.
- Own prompt cache; never touches active conversations.
- Phase 1 deterministic: unused 30d → stale; unused 90d → archived.
- Phase 2 LLM review (≤8 iterations): keep / patch / consolidate / archive each agent-authored skill.
- NEVER touches bundled/hub skills. NEVER auto-deletes (worst = recoverable archive
  `~/.hermes/skills/.archive/`). tar.gz snapshot before each pass. Pinning protects critical skills.

## GEPA — Genetic-Pareto Prompt Evolution (offline skill optimization)
- Repo: NousResearch/hermes-agent-self-evolution. Fixes SELF-CONGRATULATION BIAS by using
  execution traces, never agent self-evaluation.
- Pipeline: read skill → generate eval dataset (synthetic + real session history + hand-curated)
  → optimizer reads traces, finds failure points, generates variants → LLM-as-judge with RUBRICS
  (not binary) → constraint gates (100% test pass, <15KB, caching-compatible, semantic purpose
  preserved) → output as PULL REQUEST, never direct commit.
- ~$2-10 per run, no GPU.

## ~/.hermes/ layout
config.yaml (non-secrets source of truth) · .env (secrets) · SOUL.md · memories/{MEMORY.md,USER.md}
· skills/ (+.hub/) · sessions/ · state.db (FTS) · cron/{jobs.json,output/} · plugins/ · hooks/ · skins/ · logs/

## Skills Hub
687 skills, 18 categories (87 built-in, 79 on-demand, 16 Anthropic, 505 LobeHub).
Custom taps: `hermes skills tap add user/repo` + install.

## Profiles — multiple isolated agents
- `hermes profile create designer --clone` etc. Fully isolated config/memory/skills/sessions/identity.
- Each profile = own Telegram bot token + gateway.
- Examples: designer (hand-drawn illustration style, learns style as a skill), programmer
  ("staff engineer, terse, boring tech" — DELEGATES execution to Claude Code via PATH while
  Hermes orchestrates), researcher (4 streams: GitHub trending, big-tech announcements, papers,
  social pulse; cite every claim with URL).

## Scheduled tasks (cron)
- Built-in scheduler in gateway daemon, ticks every 60s, runs due jobs in ISOLATED agent
  sessions, delivers output to messaging platforms.
- `~/.hermes/cron/jobs.json` + `cron/output/`. English → schedule conversion.
- One-shot (`30m`), recurring (`every 2h`), cron exprs, `--skill` attachment.
- **Job chaining via `context_from`** — one cron's output feeds the next (multi-stage automations).

## Key differentiator (verbatim claim)
Hermes uniquely combines "runtime skill learning, persistent multi-layer memory, and an optional
weight-training pipeline" — vs OpenClaw which packages "an agent around a messaging gateway"
rather than "a gateway around a learning agent."

## PRISM/zulu verification checklist (extracted for Task #33)
1. SOUL.md-equivalent identity slot — PRISM: CLAUDE.md global+project (✓ analog), but no per-slot identity file.
2. Capped MEMORY.md with consolidate-at-80% — PRISM MEMORY.md index <200 lines rule (✓ analog), no auto-consolidation.
3. SQLite FTS over all sessions — PRISM: transcript miner + tribal index (partial; no FTS db over transcripts).
4. Auto-prefetch memories before each turn — PRISM: recall injectors / wiki-precheck-inject (✓ analog).
5. Skill auto-creation on triggers (5+ calls, error-recovery, corrections) — PRISM: error-pattern-promote + /forge-triple (partial; not autonomous).
6. Curator (stale/archive lifecycle + LLM review, never-delete) — PRISM: NO equivalent skill-lifecycle daemon.
7. GEPA offline optimization via traces + PR-gated — PRISM: NO equivalent; scrutiny gates are online only.
8. 90-turn hard cap — PRISM: /loop target + budget gates (✓ analog).
9. Profile isolation per agent — PRISM: 26 NATO slots + worktrees (✓ analog, stronger).
10. Cron with job chaining — PRISM: scheduled tasks + galaxy crons (✓; chaining via context_from = gap).
