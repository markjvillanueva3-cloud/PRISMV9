# SYS-OPT-MS0 — System Optimization Plan (readable summary)

**Envelope:** `H:\PRISM\mcp-server\data\milestones\SYS-OPT-MS0.json` (registered in `roadmap-index.json`)
**Priority:** HIGH · **15 units · 6–9 sessions** (p50/p90)
**Motivation:** Session 2026-04-21 surfaced 20 cross-cutting system issues — waste, drift, dark features. This milestone turns every built feature into actively-utilized infrastructure.

## The 15 units at a glance

### Tier 1 — Correctness & Safety (4 units)
| Unit | Title | Effort |
|---|---|---|
| U-SYS-T1.1 | Finalize AppData junction on both PCs | SMALL |
| U-SYS-T1.2 | Integration tests for 5 portability guards | MEDIUM |
| U-SYS-T1.3 | Hook allowlist/blocklist audit — find silent failures | MEDIUM |
| U-SYS-T1.4 | Resolve `H:\PRISM-MCP-SERVER` duplicate (552 MB) | SMALL |

### Tier 2 — Performance (4 units)
| Unit | Title | Effort |
|---|---|---|
| U-SYS-T2.1 | Hook latency profile — median PreToolUse chain < 2s | HIGH |
| U-SYS-T2.2 | `settings.json` compaction: ~1,300 → ~400 lines | MEDIUM |
| U-SYS-T2.3 | Slash command dedup — delete 80 dup project-local copies | SMALL |
| U-SYS-T2.4 | Script dedup + dead code — 326 → ~220 live scripts | HIGH |

### Tier 3 — Feature Utilization (5 units) — activate dark features
| Unit | Title | Effort |
|---|---|---|
| U-SYS-T3.1 | Auto-inject `prismSelfAwarenessEngine.recommendAIFeatures` on SessionStart | MEDIUM |
| U-SYS-T3.2 | Auto-fire `duplicationGuardEngine` on Write of new `*Engine.ts` | MEDIUM |
| U-SYS-T3.3 | **Ollama/LoRA autopilot** — SessionStart deploys current adapter (biggest dark feature) | HIGH |
| U-SYS-T3.4 | Context engineering automation — checkpoint at 15/25/35 edits, compress trigger at 600K | MEDIUM |
| U-SYS-T3.5 | `/token-dashboard` skill — render `TokenEconomyEngine` state | SMALL |

### Tier 4 — Developer Experience (2 units)
| Unit | Title | Effort |
|---|---|---|
| U-SYS-T4.1 | Unified `/system-health v2` — 6-section traffic-light dashboard | MEDIUM |
| U-SYS-T4.2 | Execute CLAUDE.md consolidation (per existing plan) — ~400 lines saved | MEDIUM |

## Suggested execution order
1. **T2.3** first (smallest win, ~30 min): dedup 80 slash commands. Confidence boost + visible progress.
2. **T1.1** (user action): close out AppData junction. Unblocks T4.1 dashboard.
3. **T1.3 → T2.2 → T2.1** sequence: hook audit → settings compaction → latency profile. Each depends on the prior. This is the biggest performance win (30 hooks × seconds → <2s median).
4. **T1.2** (parallel): portability guard tests. Independent of above.
5. **T1.4**: PRISM-MCP-SERVER decision. Small scope.
6. **T3.1 → T3.2 → T3.4**: self-awareness + dedup autofire + context automation. These make the system use ITSELF more.
7. **T3.3 (Ollama/LoRA autopilot)**: biggest value-unlock of all units. The LoRA stack is the most built, least-used capability.
8. **T3.5, T4.1, T4.2**: polish tier — visibility + docs.

## Scrutiny (12-check roadmap gate, auto)
- [x] id + title + track present
- [x] priority set (HIGH)
- [x] all units have id/title/steps/entry/exit/deliverables
- [x] no forward-only refs (unit dependencies resolvable)
- [x] effort estimates present (SMALL/MEDIUM/HIGH)
- [x] exit conditions are verifiable (tests, file-presence, counts)
- [x] motivation block non-empty
- [x] sessions_p50 < sessions_p90
- [x] no circular deps
- [x] milestone-level dependencies empty (truly independent start)
- [x] entries parse as valid JSON
- [ ] scrutiny score requires running `/scrutinize` against the envelope; expected ≥ 0.92 based on completeness

## What THIS session will NOT do
Per Phase 4 Ralph Loop note: the user asked for a **plan**, not execution. Envelope + index entry + this summary = the deliverable. To execute: `/pick-task U-SYS-T2.3` (recommended first unit, smallest win) in a fresh session.

## Deliverables
- `H:\PRISM\mcp-server\data\milestones\SYS-OPT-MS0.json` — 15-unit envelope
- `roadmap-index.json` — new entry (milestone count +1)
- `H:\.claude\plans\SYS-OPT-MS0-summary.md` — this file
