# Scrutiny Report — SVI Coupling + Auto-Documentation Propagation
**Date:** 2026-04-15
**Subject:** `H:\prism\UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md`
**Source:** Two live user directives during Pass 4 AGI scrutiny:
1. *"make the system constantly aware of the svi system so we're always building to maximize the score"*
2. *"make sure claude.md, memories, skills and other relevant documents are automatically updated by the ai system anytime something new is built so everything is always up to date."*

Both are treated as a single coupled scrutiny pass because they share the same failure mode: **information that exists in the system but doesn't flow into session behavior.**

---

## Part 1 — SVI Continuous Awareness Coupling

### Audit

**Infrastructure that EXISTS:**
- `SystemVariabilityIndexEngine.ts` — computes SVI
- `MaterialBatchVariabilityEngine.ts`, `ProcessVariabilityIntegrationEngine.ts` — related
- `state/shared/SVI.json`, `SVI-compact.md`, `SVI-watch-status.json`, `SVI-watch-status.md`
- `state/shared/CLAUDE-CODEX-SVI-DIRECTIVE.md` — Ψ = 100% stop condition documented
- Always-on SVI watch loop inside MCP server
- MCP tools `prism_dev:svi_read` + `prism_dev:svi_summary`
- REST `/api/v1/dev/svi/read` + `/api/v1/dev/svi/summary`
- Current state: **Ψ = 40.9% reachability; SVI stable across 12 watched targets**

**Binding that DOES NOT EXIST:**
- No hook injects SVI into every UserPromptSubmit
- No engine projects Ψ-delta before creating a new surface
- No backlog ranker by Ψ impact
- No milestone pre-commit gate requiring Ψ justification
- No goal-stack binding (Phase 0.13) for `maximizeFor: "psi"` goals
- `CLAUDE-CODEX-SVI-DIRECTIVE.md` lives as a 50-line MD file; no enforcement that sessions read it
- `/smart` task router doesn't bias toward Ψ-positive work

### Gaps → Phase 0.14 Fix (already added to plan)

| Gap | Fix |
|-----|-----|
| Session unaware of current Ψ | `hook_session_svi_inject` on SessionStart + UserPromptSubmit adds 3-line block |
| No impact projection | `SVIImpactProjectorEngine.projectDelta(proposed)` + `hook_pre_tool_svi_projection` |
| No post-write surface refresh | `hook_post_tool_svi_watch_refresh` triggers targeted re-scan |
| Ψ-neutral milestones merge silently | `hook_milestone_svi_gate` pre-commit |
| Backlog not Ψ-ranked | `SVIRankedBacklogEngine` + `/svi-rank` + `/smart` integration |
| Goals can't target Ψ | `GoalStackEngine` gains `maximizeFor: "psi"` |
| Orphan surfaces delay Ψ recognition | `hook_orphan_surface_detector` extends Phase 0.9 |
| SESSION_BRIEF doesn't prioritize SVI | `SituationalAwarenessFilterEngine` (Phase 0.13) treats CLAUDE-CODEX-SVI-DIRECTIVE as mandatory-top-slice |

### Sanity rules preserved
- S(x) safety gate **always supersedes** Ψ gate — never sacrifice safety for Ψ
- Bug fixes / refactors / doc updates are legitimately Ψ-neutral; gate requires justification, not prohibition
- Ψ-maximization does NOT equal feature bloat — orphan surfaces are negative Ψ (orphan detector catches them)

### Exit verification
- Ψ baseline 40.9% → ≥60% within 30 days of Phase 0 rollout
- Ψ → ≥85% within 90 days
- Ψ = 100% = CLAUDE-CODEX-SVI-DIRECTIVE stop condition
- 7-day moving average of Ψ is non-negative throughout rollout

---

## Part 2 — Auto-Documentation Propagation

### Audit

**17 surfaces that currently drift:**

| # | File | Current state | Drift risk |
|---|------|--------------|-----------|
| 1 | `H:/prism/CLAUDE.md` | Hand-written; counts at "84 dispatchers / 4,296 actions / 1,660+ engines" | HIGH — real counts climb daily |
| 2 | `H:/prism/mcp-server/CLAUDE.md` | Hand-written dev counts | HIGH |
| 3 | `C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/MEMORY.md` | "Last synced: 2026-04-15"; Key Counts block stale | HIGH |
| 4 | `state/shared/PRISM-COMMANDS-MANIFEST.md` | Manifest of skills; NOT auto-synced from `.claude/commands/*.md` | HIGH |
| 5 | `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md` | "Current Counts: 1,559 engines | 499 formulas | 60+ algorithms | 4,296 actions | 112 hooks" — hand-maintained | CRITICAL — this is the session's primary awareness source |
| 6 | `state/shared/CLAUDE-CODEX-COMMAND-AWARENESS-DIRECTIVE.md` | Hand-written | MEDIUM |
| 7 | `state/shared/CLAUDE-CODEX-MCP-DIRECTIVE.md` | MCP tool list | HIGH — new tools added |
| 8 | `mcp-server/data/docs/MASTER_INDEX.md` | Has generator (`generate-master-index.mjs`) but not auto-triggered | MEDIUM |
| 9 | `mcp-server/data/docs/MASTER_INDEX_COMPACT.md` | NO generator exists | HIGH |
| 10 | `mcp-server/data/docs/ACTION_TRACKER.md` | Hand-maintained | HIGH |
| 11 | `mcp-server/data/docs/CODE_SYSTEM_INDEX.md` | Has generator (`regen-code-index.mjs`) | MEDIUM |
| 12 | `mcp-server/data/docs/ENGINE_DIGEST.md` | Unknown regenerator | MEDIUM |
| 13 | `mcp-server/data/docs/DISPATCHER_DIGEST.md` | Unknown regenerator | MEDIUM |
| 14 | `mcp-server/data/docs/DIRECTORY_DIGEST.md` | Unknown regenerator | MEDIUM |
| 15 | `mcp-server/data/docs/HOOK_DEFINITIONS_v20.md` | Hand-maintained | HIGH |
| 16 | `mcp-server/data/docs/DSL_COMPACT.md` | Shortcode table | MEDIUM |
| 17 | `state/shared/SESSION-START-INTELLIGENCE.md` | Session brief; stale counts bleed into every new session | CRITICAL |

### Gaps → Phase 0.15 Fix (already added to plan)

| Gap | Fix |
|-----|-----|
| Docs hand-written end-to-end | `AUTO-REFRESHED: managed-section-start/end` blocks — hybrid hand+auto |
| No cascade trigger on creation | `hook_post_write_doc_cascade` classifies write, enqueues affected docs |
| Per-doc regen is ad-hoc | `DocPropagationEngine.ts` + `propagate-docs-drainer.ts` with per-doc contracts |
| Stale counts persist | Live registry queries power managed blocks |
| Hand-edits inside managed blocks corrupt the loop | `hook_pre_tool_managed_block_guard` blocks them |
| No freshness verification | `scripts/verify-doc-freshness.ts` nightly + PreCompact |
| MEMORY.md sync is manual | Memory sync pipeline rate-limited (5 min) |
| Stale docs merge to main | Pre-commit `verify-managed-blocks.ts` |
| No audit trail | `DOC_CHANGE_LEDGER.jsonl` append-only |
| No manual kick | `/doc-sync --dry-run` shows pending changes |

### Integration with prior phases
- Phase 0.6 auto-wiring (code → code) fires FIRST
- Phase 0.15 auto-docs (code → docs) fires SECOND
- Both atomic inside forge-quint — no partial state shipped
- Phase 0.13 `SituationalAwarenessFilterEngine` reads AUTO-REFRESHED blocks; sessions always see live counts
- Phase 0.14 Ψ-delta is appended to managed blocks in `CLAUDE.md` + `MEMORY.md` under a `Current Ψ` line

### Anti-patterns
- Do NOT auto-rewrite entire files — hand-written narrative must survive
- Do NOT debounce faster than 60s — write storms cause cascade thrash
- Do NOT sync MEMORY.md more than 1× per 5 min — respect user's memory hygiene
- Do NOT let one regenerator failure block the whole cascade — per-doc isolation with retry
- Do NOT auto-edit CRITICAL safety files' managed blocks without explicit approval

### Exit verification
- Canary: create new engine → within 60s, `CLAUDE.md`, `MEMORY.md`, `PRISM-SELF-AWARENESS-DIRECTIVE.md`, `MASTER_INDEX_COMPACT.md`, `PRISM-COMMANDS-MANIFEST.md` all refresh their managed blocks
- `scripts/verify-doc-freshness.ts` nightly reports 0 drift across 17 surfaces
- `/doc-sync --dry-run` on a fresh clone shows 0 pending changes (idempotence)
- Hand-edit inside managed block → BLOCKED by PreTool hook
- `DOC_CHANGE_LEDGER.jsonl` non-empty after 1h session

---

## Coupled Invariant

The two directives are deeply connected:

- Auto-doc propagation WITHOUT SVI coupling: sessions see fresh counts but still don't know which work maximizes Ψ
- SVI coupling WITHOUT auto-doc: sessions see live Ψ but make decisions against stale feature inventories
- **Both together:** every session reads live, Ψ-tagged, auto-refreshed documentation. The docs tell the session what exists, what's Ψ-blocking, and what the highest-leverage work is — without human gardening.

This is the substrate on which Phase 1-4 must ship. Without Phase 0.14 + 0.15, the 490-artifact buildout from Phase 1-4 will expand the codebase faster than humans can hand-maintain awareness docs, and session self-awareness (Phase 0.13) will read increasingly stale context despite being technically functional.

---

## Verdict

Phase 0.14 (SVI coupling) and Phase 0.15 (auto-doc propagation) are now in the plan. Both leverage existing infrastructure:

- Phase 0.14 extends `SystemVariabilityIndexEngine` and the MCP watch loop
- Phase 0.15 wraps existing generator scripts (`generate-master-index.mjs`, `regen-code-index.mjs`, `gen-engine-exports.mjs`) into a unified `DocPropagationEngine` driver

Artifact count: ~528 → ~560 (+32 for 0.14 + 0.15 combined).

Build order unchanged — both phases sit between 0.10 and 0.11 and must complete before any Phase 1 milestone can be claimed.

**Updated coverage targets:**
- SVI/Ψ awareness: passive → active (live-injected + PreTool-projected + milestone-gated)
- Doc freshness: best-effort → 0 drift across 17 surfaces within 60s of any relevant write
