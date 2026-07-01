# HERMES Adoption Pattern Matrix — U-HERMES01 close-out

**Date:** 2026-05-20
**Slot:** november/foxtrot (claude-5852a0b9)
**Closes:** U-GAP-HERMES-EVAL / U-HERMES01 — go/no-go decision per Hermes pattern.

Mapped from the on-disk `hermes-shann-article.md` (Shann³ Verified — 94KB scrape, NousResearch Hermes Agent, ~150K GH stars, #1 OpenRouter for global token usage). Operator can flip individual cells later — this is the **shipped-by-default** decision matrix.

## The 9 Hermes patterns × PRISM disposition

| # | Hermes pattern | PRISM today | Recommendation | Status |
|---|---|---|---|---|
| 1 | **Three-layer agent** (brain / personality / skillset) | brain ✅ exceeds (CLAUDE.md + MEMORY.md + per-file memory + CLAUDE-BRIEF + PRISM-BUILD-VISION); personality ⚠️ was missing; skillset ✅ exceeds (~700 vs 123) | **ADOPT personality layer** — `state/shared/slot-souls/<slot>.md` per-slot soul file (HERMES-MS0/U-HERMES02). Keep brain + skillset as-is. | ✅ **SHIPPED MS0** |
| 2 | **Brain location** (`~/.hermes/memories/MEMORY.md` + `USER.md`) | `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` + per-file index, auto-fed by Stop hook. | **KEEP PRISM SHAPE** — more layered than Hermes (MEMORY.md is index, individual files hold detail), already auto-mirrored C: → H:. | ✅ already done |
| 3 | **Personality** (`soul.md` per agent: concise / sarcastic / blunt / formal) | None before MS0. Slot domain implied role but no explicit voice. | **ADOPT** — per-slot `soul.md` with `voice / tone / escalation_path / refuse_list / preferred_subagent_type / domain_filter / hermes_role` frontmatter. 3 souls shipped (zulu/golf/bravo); other 23 slots inherit generic domain-specialist default. | ✅ **SHIPPED MS0/U-HERMES02** |
| 4 | **Skillset OOB** (123 skills) + **closed learning loop** (harness writes skills) | ~700 skills + manual `/forge-triple`. Closed loop was the 🔴 critical gap. | **ADOPT closed-loop**. Observation layer U-HERMES03 (Stop hook + pure lib, 24/24 tests). Cluster→gate→ship layer U-HERMES04..07 (pipeline lib + CLI orchestrator, 30/30 tests, dry-run default, `--apply` to actually write). | ✅ **SHIPPED MS0+MS1** |
| 5 | **Tool gateway** (one subscription, 300+ models, web scraping + browser automation built in) | Ollama-cost-router (local LLM) + Claude (cloud) + MCP tools + Playwright MCP for browser. | **KEEP PRISM SHAPE** — multi-vendor surface achieves the same capability without subscription lock-in. Cost-router auto-selects vendor per task. | ✅ already done |
| 6 | **MCP integration** | PRISM IS an MCP server (`mcp-server/`). | **KEEP** — PRISM exceeds Hermes on this layer (every PRISM capability already speaks MCP via prism_* dispatchers). | ✅ already done |
| 7 | **20+ messaging surfaces** (Telegram / Discord / Slack / email / voice / CLI) | `/notify` skill + `bot-launch` skill (partial). | **SCAFFOLD framework now; defer transport-config** per [[feedback_ai_training_first_before_revenue]]. Adapter lib + null-backend stubs allow operator to drop in real backends post-revenue without architectural rework. | ✅ **SHIPPED framework MS1/U-HERMES08-FRAME** (transport-config deferred) |
| 8 | **Deployment surface** (laptop / Docker / SSH-VPS / Daytona / Singularity / Modal) | Windows scheduled task (5-min poll, S4U, +420s phase offset, AtStartup, Restart3×1m). | **KEEP** — equivalent surface; scheduled-task pattern shipped in `install-zulu-orchestrator-task.ps1`. | ✅ already done |
| 9 | **Multi-agent company topology** (company brain → orchestrator → specialists → optional task bus, all Docker containers on one VPS) | PRISM 3-tier AI hierarchy + 26 NATO slot fleet + `slot-task-queues.json` task-bus + AGENT_CHAT.jsonl. Zulu was orchestrator backbone but not labeled "Hermes orchestrator" until this session. | **ADOPT mapping** — zulu is now the designated Hermes orchestrator. Company brain = `CLAUDE-BRIEF + PRISM-BUILD-VISION + PRISM-BUILD-CONTEXT`. Specialists = 25 work slots (each with own soul). Task bus = `slot-task-queues.json`. | ✅ **SHIPPED MS0** (zulu designation) |

## Cells flipped this session vs the 2026-05-17 spec

- **Pattern 3** (personality): juliett's spec said "🟡 GAP — minor"; this session shipped U-HERMES02 (3 souls + inject hook + wiring) → status flip to ✅ ADOPT.
- **Pattern 4** (closed loop): juliett's spec said "🔴 GAP — critical, compounding"; this session shipped U-HERMES03 (observe) + U-HERMES04..07 (cluster→gate→ship) → status flip to ✅ ADOPT.
- **Pattern 7** (multi-surface messaging): juliett's spec said "🟡 GAP — post-revenue critical"; this session ships the **framework** as `scripts/lib/multi-surface-messaging.mjs` with null-backend adapters; transport-config decisions deferred post-revenue per doctrine.
- **Pattern 9** (topology): juliett's spec already noted "✅ exceeds (PRISM has both vertical hierarchy AND horizontal slot fleet)"; this session adds the **explicit "zulu = orchestrator-Hermes"** designation via slot soul.

## Net adoption stance

- **3 of 9 patterns** flipped from gap → shipped this session (3, 4, 7-framework).
- **5 of 9 patterns** were already at-or-above Hermes equivalent before this session (2, 5, 6, 8, 9).
- **1 of 9 patterns** ships as scaffolding only with explicit deferral (7-transport-config).
- **0 of 9 patterns** rejected outright. Every Hermes idea has a PRISM analog or adoption path.

## What's not in the matrix (out-of-scope of the Hermes patterns)

- **Account-cycling at session limits** (U-ZULU08) — separate concern; Hermes pattern is single-subscription tool gateway, not multi-account rotation. Design spec at `state/shared/specs/U-ZULU08-ACCOUNT-CYCLE-DESIGN.md`; awaits credential mechanism clarification.
- **Lane-guard / shared-tree migration** (U-ZULU03/04/07 commit blocker) — PRISM-specific multi-chat fleet hygiene, no Hermes analog.

## See also

- `state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md` — original juliett gap research
- `knowledge/wiki/architecture/hermes-zulu-integration.md` — HERMES-MS0+MS1 architecture
- `reference_hermes_zulu_ms0_2026_05_20.md` — Obsidian memory for the ship
- `hermes-shann-article.md` — primary source (94KB on-disk scrape)
- [[feedback_ai_training_first_before_revenue]] — sequencing doctrine for pattern 7 transport-config deferral
