# Hermes Agent + Evolving Skills — gap research + adoption brief

**Date:** 2026-05-17
**Slot:** juliett (claude-9f57075a)
**Trigger:** user asked "did we include hermes agents and evolving skills, do deep research. if we didn't add it to the task queue to a chat slot"
**Verdict:** GAP CONFIRMED — neither was on the queue. Three new units appended to `FEATURE-GAP-UNITS-2026-05-17.json` (wave `GAP-HERMES`).

## Audit findings (corpus search before this session)

| Concept | PRISM corpus presence | Roadmap unit? | On queue? |
|---|---|---|---|
| Hermes Agent (NousResearch) | `hermes-shann-article.md` at H:/prism root (94KB X-article scrape) + flagged "OPEN QUESTION: Hermes scope" in juliett-consolidated-work-plan-ms0-u-plan-v1.md | **No** | **No** |
| Evolving skills / closed learning loop / harness-writes-skills | None — PRISM has `skill-auto-trigger.mjs` + `_skill-triggers.jsonl` (auto-skill **dispatch**) and `/forge-triple` (**manual** skill creation), but no auto-skill **generation** from observed work | **No** | **No** |

The 1 false positive (`HM-KC-MS1.json`) was a hyperMILL/hyperCAD substring collision, not Hermes.

## What Hermes Agent is (from the on-disk article)

NousResearch's open-source agent framework. ~150K GitHub stars. Currently #1 on OpenRouter for global token usage. **Same shape as Claude Code, different philosophy** — Claude Code is a toolkit (build your own from primitives), Hermes is rails (opinionated defaults, batteries included, productive on day one).

**Three layers per agent:**
1. **Brain** — `~/.hermes/memories/MEMORY.md` + `USER.md` inject at session-start. Sessions stored in SQLite, recall across sessions is full-text searchable.
2. **Personality** — `soul.md` per agent. One brain can spin up multiple agents with different "souls" (closer's-energy outbound rep, long-sentence researcher, terse assistant).
3. **Skillset** — 123 skills out-of-box (GitHub PRs, Obsidian, Google Workspace, Linear, Notion, Typefully, Perplexity, deep research, browser control, web scraping, vision, voice, scheduling). **PLUS the closed learning loop: as the agent works, it writes new skills along the way.**

**Surfaces:**
- Tool gateway: one subscription, 300+ models, web scraping + browser automation built in
- MCP integration
- 20+ messaging surfaces: Telegram, Discord, Slack, email, voice + CLI

**Runtime:** laptop / Docker container / SSH on VPS / serverless (Daytona, Singularity, Modal)

**Multi-agent "company" topology:**
1. Company brain (vision/brand/customers/products — context every layer inherits)
2. Orchestrator Hermes agent (reads brain, picks the right department)
3. Specialist Hermes agents (SEO, outbound/BD, design-review, content-writing — each with its own soul)
4. Optional task bus

## Evolving skills — the compounding-capability lever

Hermes' rule: *"do not try to write your own skills on day one. run real work, let the agent watch, and let the harness write the skills. you build a custom skill library faster by working than by writing prompts."*

This is the **closed learning loop**:
1. Agent watches itself work
2. Harness identifies repeated successful workflow patterns
3. Harness auto-codifies them as new skills in the user's library
4. Library compounds — week N has more capability than week N−1 with zero user input

**Adjacent SOTA** (for the build unit's research phase):
- **Voyager** (Wang et al, 2023) — GPT-4 Minecraft agent that maintains an evolving skill library of composable code snippets, retrieved by similarity, auto-built when missing. Canonical reference paper.
- **DSPy / GEPA / TextGrad** — optimize prompt programs over time using "gradients" extracted from execution traces.
- **Agent-Skill-Discovery / AutoGPT skill-stores** — explicit skill stores with retrieval.

## PRISM gap analysis

| Hermes pattern | PRISM equivalent | Gap? |
|---|---|---|
| Brain (`~/.hermes/memories/MEMORY.md`) | `C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md` + CLAUDE.md inject | ✅ Equivalent (PRISM is more layered: CLAUDE.md doctrine + MEMORY.md index + per-memory files) |
| Personality (`soul.md` per agent) | No per-slot personality file | **🟡 GAP — minor** (slot domain implies role, but no explicit voice/style/escalation file) |
| Skillset OOB (123 skills) | ~700 skills in `~/.claude/commands/` + `.claude/commands/` | ✅ Exceeds Hermes |
| **Harness-writes-skills closed loop** | None — only manual `/forge-triple` + dispatch hooks | **🔴 GAP — critical, compounding** |
| Tool gateway (300+ models) | Ollama-cost-router + Claude routing + MCP tools | ✅ Equivalent (different topology, similar capability) |
| MCP integration | Native; PRISM IS an MCP server | ✅ Exceeds |
| 20+ messaging surfaces | `/notify` skill + `bot-launch` skill (partial) | **🟡 GAP — post-revenue critical for JM-Die shop-floor operator hand-off** |
| Multi-agent "company" topology | 3-tier AI hierarchy (Claude Tier-1 → FullSystemAICoordinator Tier-2 → 7 domain specialists Tier-3) + 13-slot fleet | ✅ Exceeds (PRISM has both vertical hierarchy AND horizontal slot fleet) |
| SQLite session store | `chat-bus` / `AGENT_CHAT.jsonl` + slot-state JSON + handoff files | ✅ Equivalent (different file shape) |

**Net:** the 🔴 critical gap is the **harness-writes-skills closed loop**. The 🟡 gaps (personality + multi-surface messaging) are smaller and revenue-deferred.

## Unit assignments — the three new gap units

### U-GAP-HERMES-EVAL (domain: misc → slot mike)
Research / decision unit. Read `hermes-shann-article.md` + clone Hermes repo + read 5 reference skills + 1 reference agent + run one Hermes session in Docker. Produce a go/no-go-per-pattern recommendation: which Hermes patterns PRISM should port, which to skip, which are already-exceeded. Output: spec doc in `state/shared/specs/HERMES-ADOPTION-PATTERN-MATRIX-<date>.md`. Estimated 1-2 sessions.

### U-GAP-SKILL-AUTO-GEN-MS0 (domain: academy → slot lima)
**The critical compounding-capability lever.** Build the closed learning loop:
1. Observation layer — every successful slash-command execution + every successful multi-Bash-Edit sequence is logged (we already have `_skill-triggers.jsonl` + AGENT_CHAT for this; need a "successful workflow" tagger).
2. Pattern clusterer — group recurring sequences by similarity (token-embedding cosine over the sequence + outcome match).
3. Skill stub emitter — when a cluster crosses N occurrences (start: N=5), auto-emit a `/forge-triple` stub into `state/shared/specs/SKILL-CANDIDATE-<id>.md` with the captured pattern + suggested trigger keywords + suggested template.
4. Reviewer-agent gate — independent reviewer agent grades the candidate against the existing skill library (dedup-check, leverage-check, dispatch-conflict-check) and emits PASS/FAIL.
5. Ship layer — on PASS, file lands in `.claude/commands/` as draft; on FAIL, advisory journal entry.

**Compounds across all 13 slots** — each slot's domain accumulates its own skill library passively while the operator works.

Voyager-style design (per-domain skill libraries, similarity retrieval, auto-build on miss). Hermes-style invocation (the harness, not the operator, writes the skill).

Estimated MS0 = 4-6 units across observation / pattern-cluster / stub-emitter / reviewer-gate / ship-layer + 1 telemetry unit.

### U-GAP-HERMES-MULTI-SURFACE-MSG (domain: misc → slot mike)
20+ messaging surfaces (Telegram, Discord, Slack, email, voice). PRISM has `/notify` + `bot-launch` partial coverage. **Pre-revenue: low priority. Post-revenue + JM-Die shop-floor: critical** — Speed/Feed result → operator confirmation → tool starts. Hand-off loop across Slack / Telegram / email + push-mobile / Twilio voice for floor operators not at a keyboard.

## Sequencing relative to existing doctrine

Per the standing rule in [[feedback_ai_training_first_before_revenue]] (just-captured this session): **pre-revenue, AI training comes first**. The skill-auto-gen loop is itself an AI-training mechanism (it trains PRISM's *operational* knowledge, not its *physics/manufacturing* knowledge). So U-GAP-SKILL-AUTO-GEN-MS0 fits naturally **alongside** the LEARNING_LOOP stage units in DOMAIN-PIPELINE-MS0 — it's the meta-level learning loop that compounds the per-domain learning loops.

## See also

- `hermes-shann-article.md` — primary source (94KB X-article scrape)
- `knowledge/wiki/code-tribal/learnings/juliett-consolidated-work-plan-ms0-u-plan-v1.md` — where "Hermes scope" was flagged as OPEN QUESTION
- [[domain-pipeline-ms0]] — LEARNING_LOOP stage where this lever ultimately lands
- [[feedback_ai_training_first_before_revenue]] — sequencing rule
- Voyager (Wang et al, 2023) — academic precedent for evolving skill libraries
