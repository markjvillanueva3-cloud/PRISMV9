# HOOK-SYNERGY-V2 — Hook System Architecture Plan

> **Author:** claude-85cedf09 · **Date:** 2026-05-10 · **Doctrine:** Boris loop+agent + comprehensive-build
> **Trigger:** 480-hook overload diagnosed; 50+ minute tool hangs traced to stacked timeouts; user request "plan how to update hooks system to synergize with the overall system better so we stop having conflicts and issues and tool hangs"
> **Stopgaps already shipped:** 8 timeout reductions (158s → 52s worst-case). This plan replaces stopgaps with structural fix.

---

## §1 — Why hooks fail today (root-cause synthesis)

| # | Failure mode | Evidence | Cost |
|---|---|---|---|
| 1 | **Total hook count uncontrolled** — 480 wired commands across 3 settings layers (342 global + 138 project) with NO creation gate | `grep -c '"command"' C:/Users/wompu/.claude/settings.json` = 342; `H:/prism/.claude/settings.json` = 138 | Every tool call fans out to dozens of hooks |
| 2 | **Empty/wildcard matchers** fire on every tool — `""` and `.*` matchers don't filter | 17 matcher groups in PreToolUse; 2 are wildcards | A simple `Read` triggers 30+ hooks instead of 3 |
| 3 | **Synchronous critical-path on Stop** — heavy work (vitest, git ops, lint) blocks turn end | `test-100-percent-gate.mjs @ 120s`, `git-sync-stop.mjs @ 35s` | One stuck hook holds the entire session |
| 4 | **Cross-worktree references** — main settings reference sibling worktree paths | `H:/prism-iooms0/.claude/hooks/quality-dashboard-alert.mjs` wired in main | If sibling locked/corrupt, main hangs |
| 5 | **Settings layer additivity** — three layers ADD, not OVERRIDE | `C:/Users/wompu/.claude/`, `H:/.claude/`, `H:/prism/.claude/` all stack | Same hook can be wired multiple times silently |
| 6 | **Multi-chat lock contention** — every Edit fires file-claim-guard → JSON read+write on shared state | 6 concurrent chats × `state/shared/*.json` writes | Each chat blocks waiting for others' fsyncs |
| 7 | **No per-hook telemetry** — can't see which hook is slow until you grep settings | No `hook-latency.jsonl` ledger | Hangs are diagnosed manually each time |
| 8 | **Hook ≠ Engine separation broken** — hooks contain real business logic that should be engines | `ai-feature-recommend.mjs` (hook) duplicates `prismSelfAwarenessEngine.recommendAIFeatures()` (engine) | Hooks become parallel dispatcher universe — debugging happens in hooks land instead of engines land |
| 9 | **No back-pressure** — failing hooks keep firing | `continueOnError: false` for 25+ HARD BLOCK hooks means one hang = total block | No circuit breaker / rate limit |
| 10 | **Asset-creation drift** — every "I'll just add a hook" instinct compounds | 480 hooks vs intended ~50 | The same anti-pattern that produced 3163 engines is now in hooks |

---

## §2 — Synergy principles (mirror PRISM's existing architecture)

PRISM already has solved THIS class of problem for engines + dispatchers. Apply the SAME patterns to hooks:

| PRISM solved-pattern | Hook system parallel |
|---|---|
| `duplicationGuardEngine.checkBeforeCreating()` | `hookCreationGuard.checkBeforeWiring()` |
| `prism_session:dispatcher_map_compact` | `prism_session:hook_map_compact` |
| Engines tier 0-4 (cores → frontend) | Hooks tier 0-4 (safety → async) |
| `AISystemRouterEngine` (8 backends, 9 task classes) | `HookRouterEngine` (5 tiers, N hook types) |
| `BUILD_STATE.json` auto-injected | `HOOK_STATE.json` auto-injected |
| Boris doctrine: HARD GATE on verification feedback loop | Hook test harness: every new hook ships with a fire-test |
| `wire-edm-studio` 3-tier AI hierarchy | `hook-router` 3-tier latency hierarchy |
| `prism_calc:cutting_force_*` action enum + Zod schema | `hook-router:fire(<event>, <tier>)` action enum |

**Core insight:** hooks are functionally microservices that intercept tool calls. Treat them as a tier in the same architecture — not as a separate parallel system.

---

## §3 — Hook System v2 Architecture (10 elements)

### 3.1 Hook Classification System (5 tiers)

```
Tier 0: Critical Safety       — HARD BLOCK violations          — must complete <2s
        (duplication-hard-block, file-claim-guard, asset-deletion-block, settings-json-addonly-guard)
Tier 1: Active Enforcement    — Block on bad pattern           — <5s
        (ban-facade-patterns, code-completeness-gate, test-legitimacy, anti-pattern-detector)
Tier 2: Awareness Injection   — Inject context, never block    — <3s
        (claude-brief-inject, chat-bus-inject, wiki-precheck-inject, build-state-inject)
Tier 3: Telemetry/Logging     — Fire-and-forget                — <1s
        (hook-stats, ollama-offload-tracker, prism-awareness-cache)
Tier 4: Async/Background      — Defer with promise queue       — unbounded
        (test-100-percent-gate, git-sync-fetch, deep-test-sweep)
```

Every wired hook MUST declare its tier in a frontmatter block at top of file:
```js
/**
 * tier: 1
 * matcher: ^(Edit|Write)$
 * blastRadius: ~50 hooks fan-out per fire
 * avgLatencyMs: 350
 */
```

A new hook `hook-tier-validator.mjs` (PreToolUse on Edit of `.claude/hooks/*.mjs`) HARD BLOCKS commits of hooks missing tier frontmatter.

### 3.2 Hook Registry (mirror dispatcher registry)

New artifacts:
- `mcp-server/data/state/HOOK_REGISTRY.json` — auto-generated from settings.json + hook frontmatter
  - Per hook: `{ name, tier, matchers[], events[], avgLatencyMs, p95LatencyMs, fireCount, lastFired, failMode, blastRadius }`
- `mcp-server/data/docs/HOOK_DIGEST.md` — 1-line summary per hook (sortable by tier/latency/fan-out)
- `prism_dev:hook_registry` action — query/filter/aggregate
- `prism_dev:hook_map_compact` action — token-cheap (mirror of `dispatcher_map_compact`)

Skill `/hook-browse` already exists — extend it to read from the new registry.

### 3.3 Async hook dispatcher (Tier 4)

The 120s test-100-percent-gate shouldn't BLOCK Stop. New flow:

```
Stop event fires
  → tier-0/1/2/3 hooks run synchronously (budget: 30s total)
  → tier-4 hooks queue to AsyncHookDispatcher
  → AsyncHookDispatcher runs them in background process pool
  → Results land in state/shared/async-hook-results.jsonl
  → Next SessionStart hook reads jsonl, surfaces failed/stale results as warnings
  → Stop NEVER waits more than 30s for hooks
```

New engines:
- `AsyncHookDispatcherEngine.ts` — process pool, JSONL result writer, retry policy
- `AsyncHookResultReaderEngine.ts` — SessionStart consumer

### 3.4 Settings layer dedup tool

New script `scripts/settings-dedup-audit.mjs`:
- Parses all 3 settings.json layers (C:/global, H:/global, H:/prism/project, plus *.local.json)
- Builds `(hookCommand, event, matcher)` tuples
- Reports duplicates with location pointers
- Outputs `state/shared/SETTINGS_DEDUP_REPORT.md` with proposed prunings
- Optional `--apply` flag (gated by user confirmation) executes the prunings

Goal metric: target ≤200 wired hooks (down from 480) by removing exact duplicates and consolidating tier-1/2 hooks into single multi-purpose hooks.

### 3.5 Cross-worktree hook firewall

New PreToolUse hook `hook-cross-worktree-block.mjs` (Tier 0):
- Scans settings.json for `H:/prism-*` patterns NOT matching `process.cwd()`
- HARD BLOCKS SessionStart if found
- Auto-fixes in `--fix` mode by rewriting paths to current tree's `.claude/hooks/`

This eliminates the failure mode where main tree depends on sibling worktree health.

### 3.6 Chat-bus latency budget (SQLite WAL)

Replace JSON-on-disk file claims with SQLite WAL-mode:
- `state/shared/coordination.db` — WAL journal, concurrent reads, serialized writes
- Write latency: ~50ms (vs current ~500ms+ on contended JSON)
- Migration: `scripts/migrate-claims-to-sqlite.mjs` reads `WORK_CLAIMS.json` + `AGENT_CHAT.md` → seeds DB
- Backward-compat: `prism_context:claim_file` action body unchanged; only storage swap

Engine wrapper: `CoordinationStoreEngine.ts` (SQLite reader/writer with prepared statements).

### 3.7 Hook creation gate (mirror duplicationGuardEngine)

New PreToolUse hook `hook-creation-gate.mjs` fires on Edit/Write to `.claude/hooks/*.mjs`:

```js
import { hookCreationGuardEngine } from "...";

const check = hookCreationGuardEngine.checkBeforeWiring({
  proposedName: "my-new-hook.mjs",
  matcher: "^Edit$",
  event: "PreToolUse",
  tier: 2,
  behaviorSignature: <hash of regex patterns + dispatched MCP actions>,
});

if (!check.shouldProceed) {
  // BLOCK — overlap with existing hook(s): check.overlaps[]
  // Builder must extend existing hook OR write justification.md
}
```

New engine: `HookCreationGuardEngine.ts` (mirrors `DuplicationGuardEngine`).

### 3.8 Hook profiling telemetry

Wire `hookCallEnvelope.mjs` (a thin shim around `node` that all hook invocations route through):

```js
// Every settings.json hook command becomes:
"\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/_envelope.mjs <real-hook>"

// _envelope.mjs:
//   1. records start ts
//   2. spawns real hook, captures stdout/stderr/exit
//   3. appends { ts, hook, event, matcher, tool, latencyMs, exitCode } to hook-latency.jsonl
//   4. proxies result to caller
```

Daily digest at `state/shared/HOOK-PERFORMANCE.md` shows P50/P95/P99 per hook.

Auto-flag any hook with P95 > timeout × 0.8 — that hook is about to time out regularly. Ledger triggers a tier-promotion or timeout-bump proposal.

Self-tuning: each hook can read its own `getHookHistoricalP99()` and adjust internal logic (e.g. skip work when prior runs were slow).

### 3.9 Hook→Engine compression

Audit pass: identify hooks containing real business logic. For each, refactor to thin shim that calls existing engine.

Target candidates (initial pass):
| Hook | Compress to engine |
|---|---|
| `ai-feature-recommend.mjs` | `prismSelfAwarenessEngine.recommendAIFeatures()` |
| `dedup-auto-invoke.mjs` | `duplicationGuardEngine.checkBeforeCreating()` |
| `inventory-check-guard.mjs` | `prismSelfAwarenessEngine.getManifest()` |
| `mcp-route-suggest.mjs` | `aiSystemRouterEngine.classify()` + `route()` |
| `wiki-precheck-inject.mjs` | `wikiIndexMaintainerEngine.search()` |
| `chat-bus-inject.mjs` | `coordinationStoreEngine.recentMessages()` |

Result: hooks become routing layer; engines do real work. Tests live with engines (where they belong).

### 3.10 The "Hook Fast Lane"

New matcher convention: replace `""` (empty/all) and `.*` matchers with explicit tool sets:

```jsonc
// BEFORE (fires on every tool):
{ "matcher": "", "hooks": [...50 hooks...] }

// AFTER (split by blast radius):
{ "matcher": "^(Read|Glob|Grep|LS)$", "hooks": [...10 lightweight hooks...] }   // FAST LANE
{ "matcher": "^(Edit|Write|MultiEdit|Bash)$", "hooks": [...40 enforcement hooks...] }  // SLOW LANE
```

Read/Glob/Grep tool calls (the most common) skip enforcement hooks they don't apply to — instant ~70% latency reduction on read-only operations.

---

## §4 — Migration phases (H1–H6)

| Phase | Unit | Deliverable | Hours | Deps | Outcome |
|---|---|---|---|---|---|
| **H1** | U-HOOK-AUDIT | `scripts/settings-dedup-audit.mjs` + `state/shared/SETTINGS_DEDUP_REPORT.md` | 2 | none | Identify 100-200 prune candidates; ground-truth count |
| **H2** | U-HOOK-REGISTRY | `HOOK_REGISTRY.json` generator + `prism_dev:hook_registry` action | 3 | H1 | Single source of truth for all hooks |
| **H3** | U-HOOK-TIERS | Tier frontmatter on all 480 hooks (auto-classify by current behavior) + `hook-tier-validator.mjs` PreToolUse block | 3 | H2 | Every hook has known tier; new hooks must declare |
| **H4** | U-HOOK-ENVELOPE | `_envelope.mjs` shim + `hook-latency.jsonl` + nightly digest | 3 | H2 | Per-hook P50/P95/P99 visibility |
| **H5** | U-HOOK-CREATION-GATE | `HookCreationGuardEngine.ts` + `hook-creation-gate.mjs` PreToolUse | 2 | H2 | No more uncontrolled hook addition |
| **H6** | U-HOOK-FAST-LANE | Settings.json matcher split (Read/Glob/Grep vs Edit/Write/Bash) + dedup apply | 2 | H1, H2, H3 | Tool-call latency ↓ 70% on reads |
| **H7** *(stretch)* | U-HOOK-ASYNC-DISPATCH | `AsyncHookDispatcherEngine.ts` + Tier-4 routing for test-100-percent-gate | 4 | H3 | Stop never waits >30s |
| **H8** *(stretch)* | U-HOOK-COORD-SQLITE | SQLite WAL claim store + migration | 3 | none | Multi-chat coord latency ↓ 90% |
| **H9** *(stretch)* | U-HOOK-COMPRESS | Refactor 6 high-traffic hooks into engine-shim form | 4 | H2 | Hooks become routing layer; engines do real work |
| **H10** *(stretch)* | U-HOOK-CROSS-WORKTREE-FIREWALL | `hook-cross-worktree-block.mjs` Tier 0 | 1 | none | Eliminate sibling-worktree dependency |

**Critical path: H1 → H2 → H3 → H6** (10 hours, ~2 sessions)
**Full plan: H1-H10** (~25 hours, 4-5 sessions)

---

## §5 — Hard rules (no escape hatches)

1. **No new hook ships without tier frontmatter** (after H3 lands; enforced by `hook-tier-validator.mjs`)
2. **No new hook ships without P95 budget claim** (after H4 lands; envelope flags violators)
3. **No empty (`""`) or wildcard (`.*`) matchers in PreToolUse** (after H6 lands; explicit tool sets only)
4. **No cross-worktree hook references** (after H10 lands; firewall blocks)
5. **No hook duplicates business logic in an engine** (after H9 lands; refactor pass enforces)
6. **No settings layer is allowed to silently shadow another** (after H1 lands; dedup audit fails CI on duplicates)
7. **All Tier-4 (async) hooks MUST defer — never block synchronous Stop**
8. **HOOK_REGISTRY.json is single source of truth** — settings.json edits MUST update registry in same commit
9. **Boris loop: every H* unit ships with peer reviewer subagent (isolation:worktree)** before merge
10. **Build EVERY identified hook fix in this plan — no "deferred to follow-up" without user opt-out**

---

## §6 — Tie-ins with current PRISM systems

### 6.1 K2-CLOUD-MS0 alignment
The 480-hook hang directly blocks K2-K12 build (every Edit on `AISystemRouterEngine.ts` waits for full PreToolUse stack). H1+H6 unblock K2-K12 by reducing per-Edit hook latency from ~30s to ~5s.

### 6.2 SYSTEM-SYNERGY-AUDIT-2026-05-09 alignment
Audit's H3/H4 viz layers depend on a stable hook registry. H2 (HOOK_REGISTRY.json) is the data source for "L11: hook leaves" in the system viz.

### 6.3 BUILD_STATE auto-injection alignment
`build-state-inject` hook is currently in the SessionStart fan-out. H6 fast-lane keeps it on SessionStart but moves it OUT of every PreToolUse fan-out (which it shouldn't be in anyway).

### 6.4 Wiki + tribal knowledge alignment
`wiki-precheck-inject` fires on every UserPromptSubmit. H9 compresses it to engine call (`wikiIndexMaintainerEngine.search()`) — same behavior, ~10× faster, testable.

### 6.5 Multi-chat coordination alignment
6 concurrent chats × 480 hooks = the multiplicative latency problem. H8 (SQLite WAL) addresses the storage layer; H6 fast-lane addresses the fan-out layer. Together: multi-chat tool-call P95 drops from ~30s to ~3s.

### 6.6 Boris loop+agent doctrine alignment
Every H* unit ships peer-reviewer subagent (isolation:worktree) per doctrine. H4 envelope ledger gives the reviewer hard data to validate against. H5 creation gate prevents the reviewer's "this hook duplicates X" findings from re-occurring.

### 6.7 Adaptive-thresholds engine alignment
The existing `adaptive-thresholds.json` (telemetry-driven thresholds) is the right home for hook-tier P95 budget tuning. H4 envelope ledger feeds it; H3 tier system reads from it.

---

## §7 — Acceptance criteria (definition of done)

| # | Criterion | Measurement |
|---|---|---|
| 1 | Total wired hook count ≤ 200 | `grep -c '"command"' settings.json` across all layers |
| 2 | Every hook has tier frontmatter | `node scripts/audit-hook-frontmatter.mjs` returns 0 violations |
| 3 | P95 tool-call latency ≤ 5s for Read/Glob/Grep | `hook-latency.jsonl` aggregation |
| 4 | P95 tool-call latency ≤ 15s for Edit/Write/Bash | same |
| 5 | Stop never waits more than 30s | `_envelope.mjs` ledger shows zero >30s Stop completions over 7 days |
| 6 | Zero cross-worktree hook references | `hook-cross-worktree-block.mjs` audit passes |
| 7 | Zero duplicate (hookCommand, event, matcher) tuples | `settings-dedup-audit.mjs` passes |
| 8 | All 6 high-traffic hooks compressed to engine-shim form | manual code review |
| 9 | New hook creation requires `hookCreationGuardEngine.checkBeforeWiring()` PASS | gate hook in PreToolUse blocks otherwise |
| 10 | HOOK_REGISTRY.json regenerates on every settings.json change | git pre-commit hook |

---

## §8 — Open questions (resolve before H1)

1. **Tier-4 async dispatcher transport** — process pool (Node `worker_threads`) vs spawn-and-detach? Process pool is more efficient but adds complexity. **Tentative:** spawn-and-detach for v1, upgrade to pool in H7.5 if telemetry shows overhead.
2. **SQLite migration risk** — 6 concurrent chats currently relying on JSON files. Migration must be atomic. **Tentative:** dual-write period (write to BOTH JSON and SQLite for 1 week) before flipping reads, then deprecate JSON.
3. **Backward compat for hooks lacking tier frontmatter** — 480 hooks need backfill. **Tentative:** auto-classify by behavior heuristic (greps for `process.exit(2)` → Tier 0/1; absence → Tier 2/3) + manual review of edge cases.
4. **Hook envelope vs direct invocation perf** — adds ~5ms per hook fire. With 50 hooks per tool call = 250ms overhead. Acceptable? **Tentative:** yes for v1; if telemetry shows pain, write envelope in Rust later.
5. **Should H7 (async dispatch) be in critical path?** — H6 alone gives 70% improvement. H7 adds another 20% but more complex. **Recommendation:** ship H1-H6 as wave 1; H7-H10 as wave 2 after measuring impact.

---

## §9 — Provenance

- Diagnosis session: claude-85cedf09 on 2026-05-10
- Stopgaps applied (commit pending): 7 timeout reductions in `C:/Users/wompu/.claude/settings.json` (158s → 52s worst-case)
- Source files inspected:
  - `C:/Users/wompu/.claude/settings.json` (38KB, 342 wired hook commands)
  - `H:/prism/.claude/settings.json` (21KB, 138 wired hook commands)
  - `H:/prism/.claude/hooks/test-100-percent-gate.mjs` (confirmed has fast-path skip + env escape hatch)
- Active peer chats during diagnosis: 6 chats on DESKTOP-N7MI1VB (claude-0413eca6, 671e2b1f, 7b9d1810, 845cf238, 99eca613, d9860be8)
- Doctrine references: `state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md` (227 lines)
- Related plans: `state/shared/specs/K2-CLOUD-INTEGRATION-PLAN.md`, `state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.md`
