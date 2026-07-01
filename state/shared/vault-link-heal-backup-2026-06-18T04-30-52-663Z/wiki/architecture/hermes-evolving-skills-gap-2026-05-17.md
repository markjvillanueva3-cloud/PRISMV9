---
title: Hermes Agent + Evolving Skills — gap fill 2026-05-17
type: architecture
status: queued
milestone: FEATURE-GAP-AUDIT-MS0
slot: juliett
created: 2026-05-17
tags: [hermes, nous-research, evolving-skills, voyager, closed-loop, learning, gap, queue]
---

# Hermes Agent + Evolving Skills — Gap Fill (2026-05-17)

User-surfaced gap: **NousResearch Hermes Agent** and the **evolving-skills closed learning loop** were neither in any roadmap unit nor on any chat-slot queue, despite prior PRISM session work flagging "Hermes scope" as an OPEN QUESTION. Three new gap units appended this session.

## What Hermes is

Open-source agent framework from NousResearch. ~150K GitHub stars. Currently #1 on OpenRouter for global token usage. Same shape as Claude Code, different philosophy: **rails, not toolkit**. Three layers per agent:

1. **Brain** — `~/.hermes/memories/{MEMORY.md, USER.md}` inject at session-start. SQLite session store, full-text recall.
2. **Personality** — `soul.md` per agent (concise/sarcastic/blunt/formal/etc).
3. **Skillset** — 123 OOB skills (GitHub PRs, Obsidian, Linear, Notion, Perplexity, deep research, browser, web scrape, vision, voice, scheduling) **+ closed learning loop that auto-writes new skills as the agent observes work**.

Plus: tool gateway (300+ models), MCP integration, 20+ messaging surfaces (Telegram/Discord/Slack/email/voice + CLI), runs on laptop/Docker/VPS/serverless. Multi-agent "company" topology (brain → orchestrator → specialist departments).

## What evolving skills means

The Hermes rule: *"do not try to write your own skills on day one. run real work, let the agent watch, and let the harness write the skills. you build a custom skill library faster by working than by writing prompts."*

Closed loop: agent watches → identifies recurring successful workflows → auto-codifies as skill → user's library compounds passively. Voyager (Wang et al 2023) is the canonical academic precedent — evolving code-snippet library, retrieved by similarity, auto-built when missing.

## Where PRISM stands vs Hermes

| Hermes pattern | PRISM equivalent | Verdict |
|---|---|---|
| Brain inject (MEMORY.md + USER.md) | CLAUDE.md + MEMORY.md + per-memory files | parity (PRISM more layered) |
| `soul.md` per-agent personality | implicit slot domain only | 🟡 minor gap |
| OOB skillset | ~700 skills | exceeded |
| **Harness auto-writes new skills** | manual `/forge-triple` + dispatch hooks only | **🔴 critical gap — compounding-capability lever** |
| Tool gateway | Ollama-cost-router + Claude + MCP | parity |
| MCP integration | PRISM IS an MCP server | exceeded |
| 20+ messaging surfaces | `/notify` + `bot-launch` partial | 🟡 post-revenue critical |
| Multi-agent company topology | 3-tier AI hierarchy + 13-slot fleet | exceeded (both vertical + horizontal) |
| SQLite session store | chat-bus + slot-state + handoff files | parity |

**Critical gap = harness-writes-skills closed loop.** Minor gaps = personality file per slot + multi-surface messaging.

## Three units queued

```
U-GAP-HERMES-EVAL              · misc → slot mike · no-dep
  Read Hermes article + clone repo + run one Docker session.
  Produce go/no-go per-pattern adoption matrix.

U-GAP-SKILL-AUTO-GEN-MS0       · academy → slot lima · no-dep · CRITICAL
  Closed learning loop: observe → cluster → stub → reviewer-gate → ship.
  Compounds across all 13 slot domains passively.
  MS0 estimated 4-6 units (observation, cluster, emitter, gate, ship, telemetry).

U-GAP-HERMES-MULTI-SURFACE-MSG · misc → slot mike · depends_on: HERMES-EVAL
  Telegram/Discord/Slack/email/voice for operator-in-the-loop hand-off.
  Post-revenue critical (JM-Die shop-floor Speed/Feed confirm loops).
```

All three appended to `state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json` (64 → 67 units) AND prepended at the top of `state/shared/slot-task-queues.json` queues for mike (+2) and lima (+1). Both files carry `lastInject` audit metadata. Atomic writes throughout.

## Sequencing relative to AI-training-first rule

Per [[feedback-ai-training-first-before-revenue]] (standing rule from this session): pre-revenue, AI training comes first. **The skill-auto-gen loop IS itself an AI-training mechanism** — it trains PRISM's *operational* knowledge (how it does work) rather than its *manufacturing* knowledge (what it does). Fits naturally **alongside** the LEARNING_LOOP stage units in [[domain-pipeline-ms0]] — the meta-level closed loop that compounds the per-domain ones.

## See also

- `state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md` — full research synthesis + gap matrix
- `hermes-shann-article.md` — primary source on disk
- [[domain-pipeline-ms0]] — where LEARNING_LOOP units live per domain
- [[feature-gap-audit-2026-05-17]] — sibling gap inventory
- [[feedback-ai-training-first-before-revenue]] — sequencing rule
- Voyager (Wang et al, 2023) — academic precedent for evolving skill libraries
