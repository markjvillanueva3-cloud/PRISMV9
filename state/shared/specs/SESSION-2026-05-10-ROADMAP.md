# SESSION ROADMAP — claude-85cedf09 · 2026-05-10

> **Pipeline:** RGS v6 (self-optimizing, adaptive-thresholds, AI-priority + conflict-predict gates)
> **Brief:** Consolidate ALL work enumerated in chat session claude-85cedf09 on 2026-05-10
> **Milestone tracks:** 4 (HOOK-SYNERGY-MS0, K2-CLOUD-MS0, HTML-COMPANION-MS0, VIZ-COVERAGE-MS0)
> **Total atomic units:** 29 · **Already shipped:** 2 · **Remaining:** 27 · **Estimated effort:** ~28-32 hours / 5-6 sessions
> **Conflict verdict (vs 5 active peer chats):** GREEN — zero predicted collisions on these 4 tracks

---

## §1 — Tracks (priority-sorted, AI-priority axis applied)

| # | Milestone | Priority | Units | Done | Remaining | Critical-path hours | Status |
|---|---|---|---|---|---|---|---|
| 1 | **HOOK-SYNERGY-MS0** — Hook System v2 (480-hook overload remediation) | P0 | 11 | 1 (stopgap) | 10 | 10h | in_progress |
| 2 | **K2-CLOUD-MS0** — Kimi K2.6:cloud mid-tier AI integration | P0 | 13 | 1 (K1 inventory) | 12 | 9-13h | in_progress (blocked by HOOK-SYNERGY H1+H6) |
| 3 | **HTML-COMPANION-MS0** — HTML companion infrastructure | P1 | 4 | 0 | 4 | 3h | not_started |
| 4 | **VIZ-COVERAGE-MS0** — System-viz coverage discrepancy fix | P2 | 1 | 0 | 1 | 1h | not_started |

**Cross-track dependencies:**
- HOOK-SYNERGY H1 (settings-dedup-audit) + H6 (fast-lane matchers) → unblock K2-CLOUD K2-K12 (every Edit on `AISystemRouterEngine.ts` currently waits for full PreToolUse hook stack — caused the AISystemRouterEngine.ts revert this session)
- HTML-COMPANION generator → unblock all future strategic spec docs from manual HTML hand-write
- VIZ-COVERAGE → independent (no deps, no consumers)

---

## §2 — Recommended execution order (waves)

### Wave 0 (immediate — restores tool stability)
- **HOOK-SYNERGY U-HOOK-AUDIT** (H1, 2h) — settings-dedup-audit script + report
- **HOOK-SYNERGY U-HOOK-REGISTRY** (H2, 3h) — HOOK_REGISTRY.json + dispatcher action
- **HOOK-SYNERGY U-HOOK-TIERS** (H3, 3h) — tier frontmatter on 480 hooks + validator
- **HOOK-SYNERGY U-HOOK-FAST-LANE** (H6, 2h) — matcher split, target 70% read-latency cut

**Wave 0 outcome:** Tool-call P95 drops; AISystemRouterEngine.ts edits no longer hang; K2-CLOUD work becomes safe.

### Wave 1 (after Wave 0 — code is editable again)
- **K2-CLOUD U-K2-TIER-REGISTER** (K2, 1h) — register kimi-k2.6:cloud backend in AISystemRouterEngine
- **K2-CLOUD U-K2-CLOUD-ENGINE** (K3, 2h) — K2CloudOllamaEngine.ts adapter
- **K2-CLOUD U-K2-ROUTER-DECISION** (K4, 1h) — routing matrix mid-band rules
- **K2-CLOUD U-K2-COST-GUARD** (K7, 1h) — 100K budget cap + fail-closed at 90K
- **K2-CLOUD U-K2-CLAUDE-SCRUTINIZE-CHAIN** (K4.5, 2h) — two-pass safety pattern

### Wave 2 (parallel-safe — no deps)
- **HTML-COMPANION U-HTML-CLAUDE-MD-EDIT** (0.25h) — role-split rule
- **HTML-COMPANION U-HTML-DOCTRINE-UPDATE** (0.25h) — define qualifying artifacts
- **HTML-COMPANION U-HTML-COMPANION-GENERATOR** (2h) — `scripts/spec-html-companion-generator.mjs`
- **HTML-COMPANION U-HTML-BACKFILL** (0.5h) — generate HTMLs for 3 existing strategic specs
- **VIZ-COVERAGE U-VIZ-COVERAGE-FIX** (1h) — single-source-replacement in generate-system-viz.mjs

### Wave 3 (K2 infra after engine + cost guard ship)
- **K2-CLOUD U-K2-TIER-HOOK** (K5, 1h) — UserPromptSubmit ollama-tier-router hook
- **K2-CLOUD U-K2-SKILL** (K6, 1h) — `/k2-ask` skill
- **K2-CLOUD U-K2-TELEMETRY** (K8, 2h) — schema 2.0.0 → 3.0.0 with per-model breakdown
- **K2-CLOUD U-K2-DASHBOARD** (K9, 1h) — extend offload dashboard with cost projection

### Wave 4 (validation + close)
- **K2-CLOUD U-K2-FALLBACK-TESTS** (K10, 2h) — 5 failure modes + 2 adversarial + 3 scrutiny paths
- **K2-CLOUD U-K2-AUTH-SETUP** (K11, 1h) — `ollama signin` wrapper
- **K2-CLOUD U-K2-CLAUDE-MD-DOC** (K12, 1h) — 3-tier ladder doc

### Wave 5 (HOOK-SYNERGY wave 2 — after Wave 0 measurement)
- **HOOK-SYNERGY U-HOOK-ENVELOPE** (H4, 3h) — _envelope.mjs profiling shim
- **HOOK-SYNERGY U-HOOK-CREATION-GATE** (H5, 2h) — HookCreationGuardEngine
- **HOOK-SYNERGY U-HOOK-ASYNC-DISPATCH** (H7, 4h) — Tier-4 deferral
- **HOOK-SYNERGY U-HOOK-COORD-SQLITE** (H8, 3h) — SQLite WAL claim store
- **HOOK-SYNERGY U-HOOK-COMPRESS** (H9, 4h) — refactor 6 hooks into engine-shim form
- **HOOK-SYNERGY U-HOOK-CROSS-WORKTREE-FIREWALL** (H10, 1h) — Tier 0 firewall

---

## §3 — Already shipped (don't re-do)

| Unit | Milestone | Commit | Date |
|---|---|---|---|
| U-HOOK-STOPGAP | HOOK-SYNERGY-MS0 | settings.json edits (mirrored, NOT in git) | 2026-05-10 |
| U-K2-CONFIG-INVENTORY (K1) | K2-CLOUD-MS0 | 29d0d18ec | 2026-05-10 |
| U-PLAN (HOOK-SYNERGY-V2-PLAN.md + .html) | (stopgap support) | 4230efe17 | 2026-05-10 |

**Note:** AISystemRouterEngine.ts had K2 edits applied this session (kimi-k2.6:cloud backend, KIMI_K2_PRICING constants, contextSize/isSafetyCritical/getCurrentSessionTokens helpers, probe handler) but they were REVERTED by a session crash before commit. K2 must be re-applied after Wave 0 stabilizes the hook system.

---

## §4 — Boris loop+agent gates (per-unit verification)

Every U-* unit ships:
1. **Self-review** — diff against acceptance_criteria in milestone envelope
2. **Peer reviewer subagent** (`Agent({ subagent_type: 'reviewer', isolation: 'worktree', ... })`) — independent verification on isolated worktree
3. **Cross-CLI 3-way** (Codex + Gemini + Opus) — only at milestone close, not per unit
4. **Regression flow** — any defects → CLAUDE.md `## Recent regressions` block

Verification batches (reduce subagent spawn cost):
- HOOK-SYNERGY: H1 standalone; H2+H3 batch; H4+H5 batch; H6 standalone (critical); H7-H10 batch
- K2-CLOUD: K1+K2+K3 batch (engine surface); K4+K4.5+K7 batch (routing+safety+cost); K8+K9+K10 batch (infra+tests); K11+K12 batch (auth+doc)
- HTML-COMPANION: doctrine pair batch; generator+backfill batch
- VIZ-COVERAGE: single unit, single review

---

## §5 — Compounding-gains artifacts (RGS6 tax compliance)

Every milestone in this roadmap MUST emit at least one reusable dev-velocity artifact:

| Milestone | Compounding artifact | Compounds over |
|---|---|---|
| HOOK-SYNERGY-MS0 | HOOK_REGISTRY.json (H2) + _envelope.mjs (H4) + HookCreationGuardEngine (H5) | All future hook work + audits + duplicate prevention |
| K2-CLOUD-MS0 | K2ScrutinizeChainEngine (K4.5) — generic two-pass generator+critic | All future safety-critical AI workloads (not just K2.6) |
| HTML-COMPANION-MS0 | scripts/spec-html-companion-generator.mjs | All future strategic spec docs (saves 400+ HTML lines per spec) |
| VIZ-COVERAGE-MS0 | Integration test enforcing single-source-of-truth between build-state-snapshot and generate-system-viz | All future viz/build-state divergence prevention |

---

## §6 — Conflict awareness (5 peer chats active)

| Peer chat | Owns | My exposure |
|---|---|---|
| claude-99eca613 | mcp-server/package.json, system-viz envelope | NONE (my K2 work doesn't touch package.json; my viz fix is in scripts/, not envelope) |
| claude-7b9d1810 | LatheThermodynamicsEngine, ScientificReasoningEngine, AwarenessQueryEngine, PipelineConsistencyHookEngine | NONE (different domain) |
| claude-0413eca6 | combo-survey scripts, system-viz.html, scripts/regen-viz.mjs, generate-layer-bridges.mjs | LOW — VIZ-COVERAGE-MS0 touches scripts/generate-system-viz.mjs which is adjacent to peer's regen-viz/system-viz.html (coordinate before merge) |
| claude-845cf238 | OutcomeDriftCalibrationBridgeEngine | NONE |
| claude-d9860be8 | docker/ocr-tools/, Docustrata/.index/ | NONE |

**Conflict-predict verdict on these 4 tracks:** GREEN (0 of 1187 collisions touch our scope).

---

## §7 — Acceptance criteria (roadmap-level, definition of "done")

### HOOK-SYNERGY-MS0
- [ ] Total wired hook count ≤200 (currently 480)
- [ ] Every hook has tier frontmatter (audit returns 0 violations)
- [ ] P95 read-tool latency ≤5s; write-tool ≤15s
- [ ] Stop never waits >30s
- [ ] Zero cross-worktree hook references
- [ ] HOOK_REGISTRY.json regenerates on settings.json change

### K2-CLOUD-MS0
- [ ] AISystemRouterEngine.AIBackend includes `kimi-k2.6:cloud`
- [ ] Routing: context>8K AND not safety-critical → K2.6 (verified by tests)
- [ ] Safety-critical → K4.5 two-pass chain (PASS|REVISE|FAIL paths tested)
- [ ] Per-session budget cap 100K enforced fail-closed at 90K
- [ ] schema 3.0.0 with per-model breakdown
- [ ] CLAUDE.md documents 3-tier ladder + two-pass pattern

### HTML-COMPANION-MS0
- [ ] CLAUDE.md role-split section
- [ ] BORIS-LOOP-AGENT-DOCTRINE.md defines qualifying artifacts
- [ ] Generator renders any qualifying MD into HTML matching reference pattern
- [ ] PostToolUse hook fires generator within 5s
- [ ] Every existing spec ≥150 lines has sibling .html

### VIZ-COVERAGE-MS0
- [ ] generate-system-viz.mjs reads from BUILD_STATE.COVERAGE_BY_DOMAIN.rows
- [ ] Regenerated viz reports same wired/total/% as BUILD_STATE.json
- [ ] CLAUDE.md regression entry updated to RESOLVED
- [ ] Integration test asserts COVERAGE_BY_DOMAIN values match buildState

---

## §8 — RGS6 pipeline outputs (this run)

| Stage | Tool | Output |
|---|---|---|
| S0 | pipeline-telemetry.mjs record | `pipeline-telemetry.jsonl` (S0 stage_entry recorded) |
| S2.5.A | ai-priority-rank.mjs | `state/shared/ai-priority-ranks.json` (1102 ranks) |
| S2.5.B | atomic-roadmap-emit.mjs | `state/shared/atomic-roadmap.json` (1102 units across 6 lanes) + `atomic-roadmap-chat-1..6.md` + `atomic-roadmap-summary.md` |
| S2.5.C | conflict-predict.mjs | `state/shared/predicted-collisions.json` (1187 total — 0 affecting our 4 tracks) |
| S2.5 | pipeline-telemetry.mjs record | outcome=pass, milestones_registered=4 |
| S11.7.B | adaptive-thresholds.mjs | `state/shared/adaptive-thresholds.json` (6 params tuned from 3-milestone sample) |
| S11.7.A | pipeline-telemetry.mjs record | S11.7 stage_entry |

**Adaptive thresholds (current):**
- tier_floor_pct = 90
- context_nudge_pct = 60
- context_urgent_pct = 80
- leverage_min = 14
- dispatcher_capacity_ceiling = 200
- expected_wired_delta_tolerance = 0.2

---

## §9 — Spec doc index (everything written this session)

| Path | Type | Lines | HTML companion |
|---|---|---|---|
| state/shared/specs/HOOK-SYNERGY-V2-PLAN.md | Strategic plan | 430 | ✓ HOOK-SYNERGY-V2-PLAN.html (300+ lines) |
| state/shared/specs/K2-CLOUD-INTEGRATION-PLAN.md | Strategic plan | ~250 | ✗ pending HTML-COMPANION U-HTML-BACKFILL |
| state/shared/specs/K2-ROUTER-INVENTORY.md | Inventory | ~300 | ✗ pending HTML-COMPANION U-HTML-BACKFILL |
| state/shared/specs/SESSION-2026-05-10-ROADMAP.md | This roadmap | ~200 | ✗ generate after HTML-COMPANION U-HTML-COMPANION-GENERATOR ships |
| state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.md | Prior session audit | 290+ | ✓ SYSTEM-SYNERGY-AUDIT-2026-05-09.html |
| mcp-server/data/milestones/HOOK-SYNERGY-MS0.json | Milestone envelope | — | n/a |
| mcp-server/data/milestones/K2-CLOUD-MS0.json | Milestone envelope | — | n/a |
| mcp-server/data/milestones/HTML-COMPANION-MS0.json | Milestone envelope | — | n/a |
| mcp-server/data/milestones/VIZ-COVERAGE-MS0.json | Milestone envelope | — | n/a |

---

## §10 — Provenance

- Pipeline run: RGS v6 invoked from chat claude-85cedf09 at 2026-05-10T17:52Z
- Pipeline ID: `RGS6-CONSOLIDATE-2026-05-10`
- Telemetry ledger: `state/shared/pipeline-telemetry.jsonl`
- Doctrine: `state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md` + RGS6 self-optimization law
- Stopgaps shipped pre-pipeline: 7 hook timeout reductions in `C:/Users/wompu/.claude/settings.json` (158s → 52s worst-case wait)
- Active peer chats during run: claude-0413eca6, claude-7b9d1810, claude-845cf238, claude-99eca613, claude-d9860be8
- Conflict-predict verdict: RED globally (1187 collisions across full 1102-unit backlog) but GREEN for our 4-track scope (0 collisions)
