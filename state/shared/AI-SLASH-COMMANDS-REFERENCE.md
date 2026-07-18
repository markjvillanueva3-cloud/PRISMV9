---
title: PRISM AI Slash Commands Reference
generated_by: H:/prism/.claude/hooks/ai-command-awareness.mjs (extracted 2026-05-19)
status: STATIC — slash command list reflects 2026-05-19 snapshot; live list at .claude/commands/*.md
companion_hook: H:/prism/.claude/hooks/skill-auto-trigger.mjs (UserPromptSubmit — fires per-prompt top-3 matches)
---

# PRISM Slash Commands — operator reference card

> ⚠️ **STATIC SNAPSHOT — extracted 2026-05-19 from `ai-command-awareness.mjs` body.**
>
> For the LIVE list of available commands always read these:
> - Project-scoped: `.claude/commands/*.md` (relative to the active worktree)
> - User-global: `~/.claude/commands/*.md`
>
> Per-prompt automatic surfacing: `.claude/hooks/skill-auto-trigger.mjs` (UserPromptSubmit hook) injects top-3 keyword-matched skills on every prompt. That's where the actual "what to suggest right now" lives — this file is for browsing.
>
> Origin: extracted from the SessionStart inject body by [GOLF]/U-WAVE2 — see
> [SESSIONSTART-HOOK-AUDIT-2026-05-19.md](specs/SESSIONSTART-HOOK-AUDIT-2026-05-19.md).

## Critical Commands — auto-suggest immediately when triggered

| Command | Triggers | Purpose |
|---------|----------|---------|
| `/pdf-learn` | pdf, document, manual, catalog | AI PDF extraction → tribal tips/formulas |
| `/video-learn` | video, youtube, tutorial | AI video extraction → procedures |
| `/forge-triple` | create, build, forge, new engine | Create engines+skills+hooks (EXHAUSTIVE) |
| `/dedup` | duplicate, dedup, redundant | Check duplicates — MUST run BEFORE creating any new asset |
| `/wire-edm-studio` | wire edm, wedm, wire cut | Full Wire EDM programming studio |
| `/lathe-studio` | lathe, turning, okuma | Full lathe programming studio |
| `/machine-harden` | harden, strengthen, improve machine | Harden machine-specific AI |
| `/quote-to-ship` | quote, estimate, job cost | Full quote-to-ship pipeline |
| `/auto-speed-feed` | speed, feed, cutting parameters | Auto-calculate optimal speed/feed |
| `/shop-knowledge` | tribal, shop floor | Extract tribal knowledge |
| `/scrutinize` | review, audit, check | Deep code scrutiny |
| `/smart` | smart, intelligent, auto | Smart AI task routing |

## Mandatory rules

1. ALWAYS suggest `/pdf-learn` when ANY pdf/document is mentioned
2. ALWAYS suggest `/video-learn` when ANY video/tutorial is mentioned
3. ALWAYS run `/dedup` BEFORE creating ANY new engine/hook/skill
4. ALWAYS suggest `/forge-triple` (not `/forge-engine`) for new capabilities

## All commands by category (2026-05-19 snapshot)

> ⚠️ STATIC — for the canonical live set, list `.claude/commands/*.md`.

### Knowledge extraction (critical)
`/pdf-learn`, `/video-learn`, `/ingest`, `/shop-knowledge`

### Forge pipelines
`/forge-triple`, `/forge-engine`

### Hardening & optimization
`/machine-harden`, `/de-sloppify`, `/scrutinize`, `/program-optimize`

### Verification & validation
`/formula-check`, `/verify-loop`, `/dedup`

### Roadmap & planning
`/continue-roadmap`, `/generate-roadmap`, `/rgs`

### Shop floor operations
`/quote-to-ship`, `/job-cost`, `/shop-schedule`, `/shop-live-status`, `/traveler`

### Machine-specific (critical)
`/wire-edm-studio`, `/lathe-studio`, `/wire-edm-analyze`, `/wedm-batch`, `/wedm-program`, `/lathe-ai`

### Analysis & reporting
`/program-audit`, `/resource-census`, `/context-audit`, `/biz-health`

### Macro & post processing
`/macro-convert`, `/pp-resolve`

### AI commands
`/smart`, `/advisor-strategy`, `/self-improve`

### Data & inventory
`/material-stock`, `/tooling`, `/vendor`, `/prints`

### Search
`/desk-search`, `/order-status`

## Total

~45 commands across 11 categories (2026-05-19 snapshot). Live count: `ls .claude/commands/*.md | wc -l`.
