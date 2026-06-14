---
name: reference-hermes-evolving-skills-gap-2026-05-17
description: "2026-05-17 juliett — user surfaced that NousResearch Hermes Agent and the evolving-skills closed learning loop were neither in any roadmap unit nor on any chat-slot queue. Audited corpus (1 source article + 1 OPEN-QUESTION flag in juliett's consolidated work plan = total prior surface). Wrote research synthesis + appended 3 units to FEATURE-GAP-UNITS-2026-05-17.json + prepended to mike (2) + lima (1) queues."
aliases: reference_hermes_evolving_skills_gap_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.139Z
---


## What was missing

Hermes (NousResearch open-source agent framework, ~150K GH stars, #1 OpenRouter token usage) and the evolving-skills closed learning loop (harness watches workflows → auto-writes new skills, compounding capability without operator input) had been flagged in `knowledge/wiki/code-tribal/learnings/juliett-consolidated-work-plan-ms0-u-plan-v1.md` as one of 5 OPEN QUESTIONS for the operator ("Hermes scope, lima claim/distribute, PRISM-APP-QUEUE timing, MS1 envelope yes/no, NN-GRAPH deploy goal") — but never converted into a roadmap unit or queued. Source already on disk: `hermes-shann-article.md` (94KB X-article scrape) at H:/prism root.

## The three units added

| Unit | Domain | Slot | Wave |
|---|---|---|---|
| `U-GAP-HERMES-EVAL` | misc | mike | GAP-HERMES |
| `U-GAP-SKILL-AUTO-GEN-MS0` | academy | lima | GAP-HERMES |
| `U-GAP-HERMES-MULTI-SURFACE-MSG` | misc | mike | GAP-HERMES |

Appended to `state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json` (64 → 67 units; atomic tmp+rename) AND prepended to `state/shared/slot-task-queues.json` (top of mike + lima so `/pick-unit` / `/checkin-<slot> /loop` surfaces them next). Both files carry `lastInject` audit metadata.

## Hermes vs PRISM gap matrix (from research synthesis)

| Hermes pattern | PRISM equivalent | Gap |
|---|---|---|
| Brain (`~/.hermes/memories/MEMORY.md` + `USER.md`) | CLAUDE.md + MEMORY.md + per-memory files | none (PRISM more layered) |
| Personality (`soul.md` per agent) | implicit (slot domain) | 🟡 minor |
| 123 OOB skills | ~700 skills | exceeded |
| **Harness-writes-skills closed loop** | NONE (only manual `/forge-triple` + dispatch) | **🔴 CRITICAL — the compounding-capability lever** |
| Tool gateway (300+ models) | Ollama-cost-router + Claude routing | equivalent |
| MCP integration | PRISM IS an MCP server | exceeded |
| 20+ messaging surfaces | `/notify` + `bot-launch` partial | 🟡 post-revenue critical |
| Multi-agent company topology | 3-tier AI hierarchy + 13-slot fleet | exceeded (vertical + horizontal) |
| SQLite session store | chat-bus + slot-state + handoff | equivalent |

## How to apply

- When slot **mike** picks up its next work via `/checkin-mike /loop`, the queue's top entries are `U-GAP-HERMES-EVAL` (no-dep, can start) and `U-GAP-HERMES-MULTI-SURFACE-MSG` (depends_on: U-GAP-HERMES-EVAL — wait).
- When slot **lima** picks up its next work via `/checkin-lima /loop`, the queue's top entry is `U-GAP-SKILL-AUTO-GEN-MS0`. This is the CRITICAL compounding-capability lever — it compounds across every other slot's domain.
- The research synthesis (`state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md`) is the first read for whichever slot picks up first.
- Sequencing: per [[feedback_ai_training_first_before_revenue]], the skill-auto-gen loop fits naturally **alongside** LEARNING_LOOP-stage units in [[domain-pipeline-ms0]] (it's the meta-level closed loop that compounds the per-domain ones).

## See also

- `state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md` — full research + gap matrix + unit specs
- `hermes-shann-article.md` — primary source (NousResearch Hermes Agent walkthrough)
- [[domain-pipeline-ms0]] — where LEARNING_LOOP units land
- [[feedback_ai_training_first_before_revenue]] — sequencing rule
- [[reference_feature_gap_audit_2026_05_17]] — sibling milestone
- Voyager (Wang et al 2023) — academic precedent for evolving skill libraries
