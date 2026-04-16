# Claude/Codex MCP Unified Directive (Compact)

**Replaces**: MCP-FULL-UTILIZATION-DIRECTIVE (690 lines), MCP-FULL-POWER-PLAYBOOK (278 lines), MCP-DEVELOPMENT-DIRECTIVE (122 lines) — consolidated into ~120 lines.

## Core Rule
Use `prism_dev` and `prism_session` MCP actions instead of ad-hoc shell commands. 79 dispatchers, 3,898+ actions available.

## Session Lifecycle (prism_dev)
| Action | When |
|--------|------|
| `session_boot` | Every /startup |
| `build` | After engine/dispatcher/schema edits |
| `test_smoke` | After any code change |
| `svi_compute` | After adding engines/dispatchers/schemas |
| `svi_read` | During startup, before audits |
| `quality_score` | Per-engine quality audit |
| `quality_dashboard` | System-wide quality snapshot |

## Session State (prism_session — 48 actions)
| Action | When |
|--------|------|
| `context_boot` | Session start — full context hydration |
| `dispatcher_map` | Discover all dispatchers + actions (live) |
| `memory_recall` | Load cross-session knowledge |
| `system_snapshot` | Before/after major changes |
| `action_search` | Find right MCP action for a task |
| `auto_checkpoint` | Every 5-10 tool calls |
| `memory_save` | Session end — persist knowledge |
| `tool_route_best` | Route intent to optimal dispatcher |

## Quality & Validation
| Action | When |
|--------|------|
| `route_health_audit` | Check route/dispatcher wiring |
| `engine_overlap_scan` | Find duplicate engines |
| `pipeline_health` | Pipeline stage coverage |
| `schema_gap_scan` | Find unschema'd actions |
| `auto_wiring_analyze` | Auto-detect wiring gaps |

## Ownership
- **Claude**: backend (L0-L4, engines, dispatchers, hooks, persistence, routes)
- **Codex**: frontend (L5, skills/UI, provider seams, desk convergence)
- **Gate**: finish-current-delivery-first (no scope expansion until current tranche complete)

## Coordination
- Workboard: `state/shared/AGENT_WORKBOARD.md`
- Chat: `state/shared/AGENT_CHAT.md`
- Roadmap: `state/shared/ROADMAP_COLLABORATION_STATE.md`
- Task queue: `state/shared/TASK_QUEUE.md`

## Reference-First Protocol
Before Glob/Grep/Agent, read these digests:
- `ENGINE_DIGEST.md` — 1,304 engines, 1-line each
- `DISPATCHER_DIGEST.md` — 79 dispatchers + action counts
- `DIRECTORY_DIGEST.md` — domain→path routing

## Plugin Utilization
| Plugin | Actions |
|--------|---------|
| Vitest MCP | `run_tests`, `analyze_coverage`, `list_tests` |
| ESLint MCP | `lint-files` |
| Taskmaster | `get_tasks`, `next_task`, `set_task_status` |
| Codebase Memory | `search_graph`, `trace_call_path` |

## Build/Test Commands
```
npx tsc --noEmit          # Type check (0 errors required)
npx vitest run [file]     # Run tests
npm run build             # Full build
```

## Mathematical Governance
Every formula must define: formula_id, domain, inputs, units, constants, constraints, output semantics, target consumers, provenance. No inline physics constants — import from `src/physics/constants.ts`.
