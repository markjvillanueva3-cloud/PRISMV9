---
title: PRISM Development Tools Audit — Unified Classification Matrix
date: 2026-05-01
author: claude-8f04ae6a (synthesis of 5 parallel audit agents)
scope: skills · hooks · scripts · CLAUDE.md/GSD/protocols · external integrations (Obsidian, Ollama, Codex bridge, RTK)
goal: per-tool classification (MCP / CLI / API / Hybrid / Deprecate) with ranked migration recommendations
status: classification + recommendations only — no code changes in this audit
---

# PRISM Development Tools Audit (2026-05-01)

## 1. Executive Summary

**Surface area**: 1,629 development tools across 5 categories vs. 95 MCP dispatchers / 6,662 actions.

| Category | Count | Source |
|---|---:|---|
| Slash commands / skills (project) | 234 | `.claude/commands/` |
| Slash commands / skills (user-global) | 360 | `~/.claude/commands/` |
| Claude Code hooks (active in settings) | 147 | wired in `H:/.claude/settings.json` |
| Claude Code hooks (filesystem total) | 414 | `.claude/hooks/**/*.mjs` (267 dead/test/lib) |
| Source-side hook engines | 54 | `mcp-server/src/hooks/**/*.ts` |
| Scripts (root + server + .claude) | 474 | live count via audit agent |
| CLAUDE.md / GSD / directives | 75+ | project + user + knowledge fragments |
| External integration engines | 16 | Obsidian (6) + Ollama (5) + Wiki (5) |
| Wiki entries | 722 | `knowledge/wiki/index.md` |
| **Total auditable surfaces** | **1,629** | (excluding tests/lib helpers) |

**Headline finding**: PRISM has **6.3 skills per dispatcher** (594/95) — the slash-command surface has outgrown the MCP surface, creating a discoverability crisis and 84 duplicate skills between project and user directories. Concurrently, the **chat-bus / Codex bridge is file-based** and known-fragile on Windows (recent handoff-clobber fix in `AGENT_CHAT.md`); 13 Ollama hooks fire on every prompt with **no `prism_ollama` dispatcher** to consolidate them; and `omega-thresholds.json` is **aspirational** — the dispatcher inlines flat thresholds and ignores the JSON.

**Recommended disposition (totals across all categories):**

| Action | Count | Effort | Why |
|---|---:|---|---|
| **KEEP** as current surface | ~1,180 (72%) | n/a | Working enforcement, infrastructure, batch processors |
| **Promote to MCP** | ~190 (12%) | 4–6 weeks | Agent-callable actions, structured I/O, multi-agent shareable |
| **Deprecate / archive** | ~175 (11%) | 3 days | Bootstrap debt, dead hooks, superseded directives |
| **Consolidate** | ~80 (5%) | 2 weeks | Duplicate skills, fragmented docs, redundant hook registrations |
| **Promote to API (REST)** | ~10 (<1%) | 1–2 weeks | External clients (ERP, scheduling, mobile) |

---

## 2. Decision Framework

### What each surface means in PRISM

| Surface | Definition | Best when… |
|---|---|---|
| **MCP** | Dispatcher action (`prism_X:action_Y`) — agent-callable, structured I/O, in-process, multi-chat shareable | Repeated programmatically · structured input/output · used by ≥2 agents · safety-relevant gates · telemetry queries |
| **CLI** | Slash command, shell script, or user-typed bash — interactive, multi-turn, OS-level | Interactive workflow with checkpoints · build/test/lint pipelines · file-system ops · ad-hoc human-driven tasks · shell-pipeline integration (RTK) |
| **API (REST)** | Endpoint in `mcp-server/src/routes/` — network-accessible, external clients | Consumed by browsers/mobile/non-Claude agents · third-party integrations · public surface |
| **Hybrid** | MCP for agents + thin CLI wrapper for humans | Action that's both useful programmatically and as `/foo` shorthand · most domain skills (lathe, mill, wedm) |
| **Deprecate** | Remove — superseded, dead, one-time bootstrap, redundant with existing dispatcher | Marker says "ran 2026-XX", folder is `_completed_utilities/`, hook is in `DISABLED_TOKEN_REDUX_2026_04_23` |

### Ordering test for any tool

1. Does ≥1 other agent need to call this programmatically? → MCP
2. Is it inherently a multi-step interactive workflow with human checkpoints? → CLI
3. Does an external (non-Claude) client need it? → API
4. Both 1 and 2? → Hybrid
5. Is it superseded / one-time / disabled? → Deprecate

---

## 3. Per-Category Synthesis

### 3.1 Skills (594 total)

| Disposition | Count | Notes |
|---|---:|---|
| KEEP CLI (interactive workflow) | ~280 (47%) | All `*-studio` skills, `/forge-*` (21), `/autopilot-*` (3), `/hook-*` (5), `/github:*` (11), `/analysis:*` (6), `/automation:*` (6) |
| Hybrid (MCP+CLI demarcation) | ~179 (30%) | Machine families (`/lathe-*`, `/mill-*`, `/wedm-*`, `/grinder-*`, `/sinker-*`, `/welder-*`) — actions to MCP, studios stay CLI |
| Promote to MCP | ~110 (19%) | `/ollama-*` (9), `/quality-*` (3), `/cad-*` generation (8), `/cam-*` actions (6), `/post-*` (5), `/sparc:*` (35), `/turning-*` (8), `/milling-*` (8) |
| Promote to API | ~10 (~2%) | `/erp-*` (4), `/material-*` (2), `/schedule` (1) — external clients |
| Deprecate / consolidate | ~15 (~3%) | 84 duplicate project↔user (delete project copies); plus `/schema-check`, legacy `/wire-edm-studio` |

**Highest-impact finding**: 84 skills exist in both `H:/prism/.claude/commands/` AND `C:/Users/wompu/.claude/commands/`. User dir is canonical (wins precedence in harness). One commit can drop 84 files. Zero code impact.

**Anti-pattern flagged**: `/ollama-*` 9-skill explosion — each is a 1-line wrapper around Ollama HTTP. Should collapse to single `prism_ollama:offload(task, kind)` action with `kind` enum.

### 3.2 Hooks (147 active, 414 filesystem)

| Disposition | Count | Notes |
|---|---:|---|
| KEEP — hard blocks + critical infrastructure | 89 (60%) | Top-10 untouchables: `duplication-hard-block`, `test-100-percent-gate`, `stop_on_failing_tests`, `commit-ownership-guard`, `git-health-guard`, `import-verifier`, `stop_on_unsafe_gcode`, `c-to-h-mirror`, `physics-canonical-constants-guard`, `asset-deletion-block` |
| Convert to MCP action (on-demand) | 18 (12%) | Advisory hooks firing every prompt: `discipline-expert-inject`, `pretool-world-simulator`, `ai-reasoning-inject`, `skill-chain-suggest`, `ai-system-router-inject`, `test-coverage-enforcer`, `figma-ui-consistency`, `mcp-route-suggest`, `reference-value-injector`, `coding-pattern-hint` (plus 8 more) |
| Soften (keyword-gate fire rate) | 20 (14%) | Reduce auto-fire 30–50% by gating on prompt/file keywords |
| Deprecate / formal removal | 12 (8%) | 11 already disabled via `DISABLED_TOKEN_REDUX_2026_04_23` (naming-convention, complexity-gate, magic-number-detector, etc.) — delete code |
| Consolidate (merge dup registrations) | 8 (5%) | `error-pattern-memory.mjs` registered 2x; `tool-pattern-learner` 3x; `path-frequency-tracker` 2x; move `session-id-pin` to SessionStart-only |

**Highest-impact finding**: 18 advisory hooks fire on every prompt or every Edit, injecting 25–50 tokens each = ~450–900 tokens **per prompt** in pure overhead. Converting these to on-demand MCP actions (called by `/smart-route` or when the user asks) saves the same volume per prompt while preserving the capability.

**Critical reminder**: 9 hooks are **explicitly cited as gates in CLAUDE.md** and cannot be removed: `duplication-hard-block`, `commit-ownership-guard`, `c-to-h-mirror`, `physics-canonical-constants-guard`, `wiki-precheck-inject`, `chat-bus-inject`, `session-reorient-inject`, `test-100-percent-gate`, `stop_on_failing_tests`.

### 3.3 Scripts (474 total)

| Disposition | Count | Notes |
|---|---:|---|
| KEEP CLI | 280 (59%) | Build/postbuild (24 `build-*`), domain batch (23 wedm, 13 extract, 17 patch-*-fidx), CI/test (7 run-*), train (4 ML), package.json-referenced (6) |
| Deprecate / archive | 74 (16%) | All `_completed_utilities/` (37+37) — folder name says it; one-time iterations |
| Consolidate (dedup) | 67 (14%) | `convert_to_ts.*` exists in 3 locations · `close_gaps.js` / `add_atcs_renames.js` / `register_atcs.js` duplicated root↔mcp-server · 15 Phase 0.x research prototypes (`thompson-sampling`, `tla-model-check`, `phase-space-analyzer`, `lyapunov-monitor`) of unclear status |
| Promote to MCP | 45 (10%) | `update-prism-inventory`, `inventory-engines`, `snapshot`, `verify-full-wiring`, `release-gate`, `check-count-drift`, `emit-tribal-rag-index`, `generate-master-index`, `build-dispatcher-graph-index` (top 9 — full list in §6) |
| Promote to API | 8 (2%) | None identified concretely; reserved for future external clients |

**Highest-impact finding**: 74 scripts in `_completed_utilities/` directories should move to `H:/prism/.archive/scripts/` — they're labeled as completed iterations and clutter discovery. Risk: zero (not in `package.json`, not hook-wired).

**Architecture gap**: No `SCRIPTS_MANIFEST.json` exists. Lifecycle (active / deprecated / one-time) is not declared anywhere; `knowledge/scripts/INDEX.md` is stale (369 entries vs 474 actual = 22% drift).

### 3.4 CLAUDE.md / GSD / Directives (75+ files)

| Disposition | Count | Notes |
|---|---:|---|
| KEEP as docs | ~50 | Project + user CLAUDE.md (load-bearing); GSD_QUICK + DEV_PROTOCOL; AGENT_WORKBOARD/CHAT (operational); WIKI_SCHEMA |
| Consolidate | 73 → 11 | (a) 60 `knowledge/claude-md/*.md` fragments → 5 thematic bundles; (b) 3 `CLAUDE-CODEX-*-DIRECTIVE.md` → 1 unified; (c) GSD_MICRO + GSD_QUICK → cross-link |
| Promote to MCP | 4 | `omega-thresholds.json` → `prism_omega:thresholds_get`; `PRISM-COMMANDS-MANIFEST.md` → `prism_session:commands_manifest`; `PRISM-SELF-AWARENESS-DIRECTIVE.md` duplication-guard → `prism_awareness:duplication_check`; `ROADMAP_COLLABORATION_STATE.md` → `prism_orchestrate:roadmap_status` |
| Deprecate / archive | 2 | `state/shared/archive/CLAUDE-CODEX-MCP-FULL-UTILIZATION-DIRECTIVE.md` and `MCP-DEVELOPMENT-DIRECTIVE.md` (already noted as superseded) |

**Critical drifts found**:
1. **RTK reference duplication**: project + user CLAUDE.md both contain a full RTK reference block (~90 lines + ~40 lines). User CLAUDE.md should inherit from project; the duplication rots when project changes.
2. **Forward-reference to non-existent section**: project CLAUDE.md `§ENFORCEMENT` says "see §ENFORCEMENT GATES" but no such section exists in either CLAUDE.md — actual gates are scattered across GSD_QUICK §6 LAWS and DEV_PROTOCOL §Anti-Regression. Recommend single `ENFORCEMENT_GATES.md`.
3. **Aspirational omega-thresholds**: `omega-thresholds.json` lines 50–56 admit "thresholds_externalized: true, tier_check_action: aspirational — not yet wired" — `omegaDispatcher.ts` inlines flat thresholds instead. Governance theater.

### 3.5 External Integrations

#### Obsidian / Wiki (6 engines + 8 skills + 722 entries)
- **Current**: skills wrap engines; no `prism_wiki:*` dispatcher actions; query is O(n) grep on `index.md` (won't scale past ~500).
- **Recommended**: 6 MCP actions (`wiki_ingest`, `wiki_query`, `wiki_lint`, `wiki_log_append`, `wiki_index_rebuild`, `wiki_embed`) under `prism_knowledge` (or new `prism_wiki`). Build HNSW index on ingest completion.
- **Obsidian sync direction**: undocumented. Recommend unidirectional Claude→Obsidian (wiki = source of truth).

#### Ollama / Qwen Offload (5 engines + 9 skills + 13 hooks)
- **Current**: NO `prism_ollama` dispatcher exists. 9 skills are ~1-line wrappers; 13 hooks auto-route at PreToolUse/UserPromptSubmit; telemetry in JSON file only (`mcp-server/data/state/ollama-offload-stats.json`).
- **Recommended**: Create `prism_ollama` dispatcher with 6 actions: `offload(task, kind)`, `stats_get(since?, category?)`, `health_check()`, `model_load(model_id)`, `lora_deploy(model_id, adapter)`, `embed(text)`.
- **Failure mode**: Ollama 4s timeout in hook; cold-load can exceed 3s. Currently no exponential backoff; recommend documenting graceful degradation (silent skip, alert on repeated failures).

#### Codex Bridge / Claude↔Codex Coordination (10 directive files + 4 state files + 1 hook)
- **Current**: File-based (chat-bus/ directory + AGENT_CHAT.md append). Recently hit `cross-worktree handoff clobbering` (commit `6477d7cd5` per git log). Hook `chat-bus-inject.mjs` is Claude-only at the read side; file drops are bidirectional.
- **Recommended**: Migrate to `prism_orchestrate:bus_*` actions — `bus_post(recipient, message)`, `bus_read(sessionId, since?, limit?)`, `claims_register/release(files, ttl_ms?)`, `presence_heartbeat() / presence_list() / presence_reap(stale_ms?)`. Atomic, structured, multi-writer-safe.
- **Codex delegation**: no `codex_delegate` action exists. Add `prism_orchestrate:codex_delegate(action, params)` for explicit Claude→Codex calls; current ownership split ("Claude: backend, Codex: frontend") has no enforcement mechanism.

#### RTK CLI (v0.37.1, ~100 wrappers + advisory hook)
- **Current**: `rtk-prefix-reminder.mjs` PreToolUse advisory (never blocking). RTK works on shell output — fundamentally a shell-pipeline tool.
- **Recommended**: **KEEP CLI**. Do NOT wrap in MCP. Optional one MCP action `prism_shell:bash_rtk_format(cmd_output, cmd_base)` for retroactive compaction.
- **Improvement**: Hook lacks RTK availability check (`rtk --version` once per session, cache result); add to fail gracefully if RTK missing.

---

## 4. Cross-Cutting Findings

### Theme A — File-based coordination is fragile on Windows

Three subsystems all use file-append for cross-process / cross-chat coordination:
1. **Chat bus** (`state/shared/chat-bus/messages/{sessionId}.json`)
2. **AGENT_CHAT.md** (markdown append)
3. **File claims** (`state/shared/chat-bus/claims/{sessionId}.json`)
4. **Presence heartbeats** (`state/shared/chat-bus/presence/{sessionId}.json`)

Recent incident: `cross-worktree handoff clobbering` (commit 6477d7cd5). Concurrent appends on Windows have no atomicity guarantee (no `O_APPEND` on `fs.appendFile`). PID-based liveness (`process.kill(pid, 0)`) is unreliable on Windows (ESRCH vs EPERM ambiguity).

**Fix**: 8 `prism_orchestrate:bus_*` MCP actions backed by atomic write+rename + TTL-based reaper. Retire `.md` drops for inter-chat signaling.

### Theme B — Ollama integration is the worst MCP gap

Largest disconnect between effort spent and MCP coverage:
- **Engines built**: 5 (OllamaClient, OllamaHookBridge, OllamaIntegration, OllamaTaskOffloader, LatheLoRAOllamaDeployer)
- **Skills built**: 9 (`/ollama-*`)
- **Hooks wired**: 13 (auto-routing on every prompt + tool use)
- **Telemetry tracked**: yes, in JSON file
- **MCP dispatcher actions**: **zero**

This is anti-DRY at scale. A single `prism_ollama:offload(task, kind)` action with 6 helpers replaces all 9 skills and provides the queryable surface that 13 hooks can call uniformly.

### Theme C — Discoverability has collapsed

594 skills + 6,662 actions + 474 scripts + 414 hooks = **8,144 ways to do something**. The `/smart-route` skill exists to route, but:
- Skills aren't indexed by semantic embedding (only keyword)
- `PRISM-COMMANDS-MANIFEST.md` is static markdown
- `knowledge/scripts/INDEX.md` is 22% stale
- No central manifest correlates skill → engine → dispatcher action

**Fix**: Promote `PRISM-COMMANDS-MANIFEST.md` to `prism_session:commands_manifest` MCP action with live JSON. Add `SCRIPTS_MANIFEST.json` with lifecycle metadata (active/deprecated/one-time/archived).

### Theme D — Aspirational gates are governance theater

Files declaring rules that nothing enforces:
1. `omega-thresholds.json` — 4-tier ladder; dispatcher inlines flat thresholds
2. `WIKI_SCHEMA.md` — frontmatter spec; `WikiLintEngine` exists but not PostToolUse-wired
3. `state/shared/CLAUDE-CODEX-*-DIRECTIVE.md` — ownership split with no `codex_delegate` enforcement

**Pattern**: Either wire to a hook/dispatcher to enforce, or delete to remove confusion. No middle ground.

### Theme E — Bootstrap debt accumulates silently

- 74 scripts in `_completed_utilities/` folders
- 11 hooks short-circuited via `DISABLED_TOKEN_REDUX_2026_04_23` but still on disk
- 2 archived directives in `state/shared/archive/` with no cleanup commit
- `extend-intel-envelope*.mjs` × 3 versions, all marked "one-shot"

These are inert (don't fire, don't break things) but they:
1. Pollute search results in agent file discovery
2. Suggest patterns that newer code shouldn't follow
3. Waste cognitive load on every audit pass

**Fix**: One archive commit moves all to `H:/prism/.archive/`. Done.

### Theme F — Fragmentation everywhere

| Location | Should be | Currently |
|---|---|---|
| `knowledge/claude-md/*.md` | 5 thematic bundles | 60 fragments |
| `state/shared/CLAUDE-CODEX-*-DIRECTIVE.md` | 1 unified directive | 3 overlapping files |
| Skills (project + user) | Single canonical location | 84 duplicates |
| Scripts (root + mcp-server) | Logical separation | `convert_to_ts.{js,mjs,cjs}`, `close_gaps.js`, `add_atcs_renames.js` exist in both |

---

## 5. Decision Matrix (per category headline)

| Category | Total | KEEP | →MCP | →API | Deprecate | Consolidate |
|---|---:|---:|---:|---:|---:|---:|
| Skills | 594 | 280 | 110 | 10 | 15 | 84 (dedup) |
| Hooks (active) | 147 | 89 | 18 | 0 | 12 | 8 |
| Scripts | 474 | 280 | 45 | 8 | 74 | 67 |
| CLAUDE.md / GSD / dirs | 75 | 50 | 4 | 0 | 2 | 73→11 (bundles) |
| External integrations | 16 engines | 16 (kept) | + 22 new actions | 0 | 0 | 30 hook+skill+engine wraps |
| **Totals** | **1,306+** | **715** (55%) | **199 actions** | **18** | **103** | **262** |

---

## 6. Top 20 Migration Opportunities (ranked by ROI)

ROI = `(token_saved/session × sessions/week) + (developer_hours_saved/year) – (effort_to_implement)`

| # | Migration | Effort | Token / Time savings | Risk | Order |
|---:|---|---|---|---|---|
| 1 | Delete 84 duplicate project↔user skills | 10 min | Discovery clarity (-84 false hits) | None | **DO FIRST** |
| 2 | Archive 74 `_completed_utilities/` scripts to `.archive/` | 30 min | Discovery clarity (-74 hits) | None | **DO FIRST** |
| 3 | Formally remove 11 disabled hooks (DISABLED_TOKEN_REDUX) | 20 min | Code clarity | None | **DO FIRST** |
| 4 | Convert 18 advisory hooks → MCP on-demand actions | 2 days | ~450–900 tok/prompt = ~50K tok/week | Med (need to verify nothing regresses) | High ROI |
| 5 | Create `prism_ollama` dispatcher (6 actions, replaces 9 skills) | 3 hours | DRY, telemetry queryable | Low | High ROI |
| 6 | Migrate chat-bus to `prism_orchestrate:bus_*` (8 actions) | 6 hours | Eliminates Windows append-race | High (concurrency-critical) | High ROI |
| 7 | Wire `omega-thresholds.json` → `prism_omega:thresholds_get` + refactor dispatcher | 3 days | Activates shop_floor tier (currently aspirational) | Med (safety-relevant) | High ROI |
| 8 | Consolidate 60 `knowledge/claude-md/*.md` → 5 bundles | 2 weeks | -90% hook injection overhead | Low | Medium ROI |
| 9 | Soften 20 advisory hooks via keyword-gating (30–50% fire reduction) | 1 day | ~150–500 tok/event saved | Low | Medium ROI |
| 10 | Build HNSW wiki semantic index (replace O(n) grep) | 1 week | Wiki query stays viable past 1K entries | Low | Medium ROI |
| 11 | Promote `PRISM-COMMANDS-MANIFEST.md` → `prism_session:commands_manifest` | 4 hours | Live discovery for hooks + agents | Low | Medium ROI |
| 12 | Unify 3 `CLAUDE-CODEX-*-DIRECTIVE.md` → 1 with archive of old | 4 hours | -2 directive files; one source of truth | Low | Medium ROI |
| 13 | Promote Quality/SPC/FAI skills → `prism_quality` MCP (6 actions) | 5 hours | Aerospace/medical automation possible | Med | Medium ROI |
| 14 | Wire `WikiLintEngine` to PostToolUse hook | 3 hours | Wiki frontmatter validated pre-write | Low | Medium ROI |
| 15 | Promote inventory scripts (`update-prism-inventory`, `snapshot`, `inventory-engines`) → `prism_dev:*` | 1 day | Hooks call MCP instead of shell-fork | Low | Medium ROI |
| 16 | Promote CAD generation skills → `prism_cad:cad_generate_*` MCP (4 actions) | 6 hours | Batch CAD gen, automated design loops | Med | Medium ROI |
| 17 | Add `ENFORCEMENT_GATES.md` single source of truth + cross-ref from both CLAUDE.md | 1 day | Eliminates false forward-references | Low | Low ROI |
| 18 | Add `prism_orchestrate:codex_delegate(action, params)` action | 1 day | Enables explicit Claude→Codex calls | Med | Low ROI |
| 19 | Consolidate 8 duplicate hook registrations (`error-pattern-memory`, `tool-pattern-learner`, etc.) | 2 hours | -8 redundant fires/event | Low | Low ROI |
| 20 | Create `SCRIPTS_MANIFEST.json` (lifecycle metadata) | 3 hours | Stale-script detection in CI | Low | Low ROI |

**Quick wins (do this week, ≤4 hours each)**: #1, #2, #3, #11, #14, #19, #20 — together: -158 dead/duplicate files, +2 MCP actions, +1 manifest, ~3 hours total.

**Pillar wins (high impact, 1–2 weeks)**: #4 (advisory→MCP), #5 (`prism_ollama`), #6 (chat-bus MCP), #7 (omega activation).

---

## 7. Phased Execution Plan

### Phase 1 — Cleanup (this week, ~3 hours total)
1. Delete 84 duplicate project skills (commit: `chore(skills): remove project copies of user-canonical skills`)
2. Move 74 `_completed_utilities/` scripts to `.archive/scripts/completed-utilities/`
3. Formally delete 11 `DISABLED_TOKEN_REDUX` hook files
4. Move 2 archived `CLAUDE-CODEX-*-DIRECTIVE.md` files to `state/shared/archive/`
5. Consolidate 8 duplicate hook registrations in `H:/.claude/settings.json`

**Outcome**: -171 files in active surface; zero behavior change; massive clarity gain.

### Phase 2 — High-leverage MCP migrations (next 2 weeks, ~5 days work)
1. Create `prism_ollama` dispatcher with 6 actions; collapse 9 skills + retire 4 of 13 hooks (keep auto-route + telemetry)
2. Migrate chat-bus to `prism_orchestrate:bus_*` (8 atomic actions); retire `.md` drops for inter-chat signaling
3. Wire `omega-thresholds.json` → `prism_omega:thresholds_get`; refactor `omegaDispatcher.ts` to load from JSON
4. Convert top-10 advisory hooks to on-demand MCP actions (`prism_ai:discipline_check`, `prism_dev:simulate_change`, etc.)

**Outcome**: 24 new MCP actions; ~450 tok/prompt savings; Windows file-race class eliminated; shop_floor tier active.

### Phase 3 — Documentation consolidation (next 4 weeks, ~2 weeks work)
1. Consolidate 60 `knowledge/claude-md/*.md` → 5 thematic bundles (fundamentals, token-economy, project-specifics, ai-systems, safety-verification)
2. Unify 3 `CLAUDE-CODEX-*-DIRECTIVE.md` → 1 (CLAUDE-CODEX-UNIFIED-DIRECTIVE.md)
3. Create `ENFORCEMENT_GATES.md` single source of truth; cross-reference from both CLAUDE.md
4. Promote `PRISM-COMMANDS-MANIFEST.md` → `prism_session:commands_manifest` (live JSON via MCP)
5. Create `SCRIPTS_MANIFEST.json` with lifecycle metadata

**Outcome**: -73 doc files; -90% hook injection overhead at SessionStart; live command discovery.

### Phase 4 — Domain MCP promotions (next 6 weeks, ~3 weeks work)
1. `prism_quality` (6 actions: inspection, FAI, CMM, SPC, Gage R&R, compliance)
2. `prism_cad` generation (4 actions: from-text, from-blueprint, feature-recognize, validate)
3. `prism_post` (5 actions: generate, validate, lint, harden, register)
4. Wiki MCP (6 actions: ingest, query, lint, log-append, index-rebuild, embed) + HNSW index
5. SPARC family (35 actions under `prism_sparc:*`)

**Outcome**: ~60 new MCP actions; ~110 skills become hybrid (CLI + MCP).

### Phase 5 — API surface (deferred, when external client demand materializes)
1. `/api/v1/erp/*` (sync, health)
2. `/api/v1/material/*` (price, stock)
3. `/api/v1/scheduling/*` (schedule)

**Outcome**: 8–10 REST routes for non-Claude consumers.

---

## 8. What NOT to do

To prevent over-correction:

1. **Do NOT wrap RTK in MCP.** It's a shell-output filter; agents already invoke bash. Adding indirection adds zero value.
2. **Do NOT convert `*-studio` skills to MCP.** They're inherently interactive multi-step workflows with human checkpoints; agents have no context for "go back to step 3."
3. **Do NOT delete the 9 hooks cited as gates in CLAUDE.md.** `duplication-hard-block`, `commit-ownership-guard`, `c-to-h-mirror`, `physics-canonical-constants-guard`, `wiki-precheck-inject`, `chat-bus-inject`, `session-reorient-inject`, `test-100-percent-gate`, `stop_on_failing_tests` — all are explicit user contracts.
4. **Do NOT remove the 23 hooks in `DISABLED_TOKEN_REDUX_2026_04_23` until each is formally evaluated.** 10 are clearly redundant; 1 (`discipline-expert-inject`) needs MCP-action migration first; the other 12 likely stay disabled but on-disk for safety.
5. **Do NOT migrate the 6 USSH Phase 0.x research scripts to MCP.** Their status is unclear; audit-for-active-use first, then keep / consolidate / archive.
6. **Do NOT collapse `*-studio` web routes (lathe-studio, mill-studio) into pure MCP.** They are user-facing GUIs served via REST API + frontend; that's the right surface.

---

## 9. Open Questions for User

1. **Should `prism_ollama` be a new dispatcher, or actions under existing `prism_ai`?** Recommendation: new dispatcher (clean ownership, easier telemetry).
2. **Should chat-bus migration happen via fork-worktree (safe, isolated) or in-place?** Recommendation: fork — `git worktree add ../prism-bus-mcp -b work/bus-mcp` per CLAUDE.md conflict-fork rule, given concurrency risk.
3. **Wiki query: ship HNSW now (1 week) or defer until entry count crosses 500?** Currently at 722; already past the natural break-even for grep. Recommendation: ship.
4. **Is the SPARC family (35 skills) actively used?** If yes → MCP promotion is highest-ROI in Phase 4. If no (legacy) → consolidate to top-5 used and deprecate the rest.
5. **Codex bridge: still single-Codex-instance, or scaling to N?** If scaling, atomic chat-bus MCP becomes critical-path before any new Codex chat lands.

---

## 10. Reviewer notes

This audit was produced by 5 parallel `Explore` subagents (Skills, Hooks, Scripts, Protocols, External integrations) plus a synthesis pass. Per-tool numbers are sourced from:
- Live count: `PRISM-INVENTORY-LATEST.md` (regenerated 2026-05-01T01:59:53Z)
- Live `ls` of `.claude/commands/`, `.claude/hooks/`, `scripts/`, `mcp-server/scripts/`, `~/.claude/commands/`
- Active hooks: `H:/.claude/settings.json` (147 wired)
- Wiki entries: `knowledge/wiki/index.md` (722)
- RTK version: `rtk --version` (0.37.1)
- Existing MCP coverage: `mcp-server/data/docs/DISPATCHER_DIGEST.md`, `MASTER_INDEX_COMPACT.md`

No code was modified during this audit. Discrepancies between agent counts and headline counts (e.g. scripts: 474 audit vs 742 raw `ls`) reflect the agent's filter for non-test/non-lib files; both are accurate at their respective scopes.

**End of audit.**
