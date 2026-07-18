# HOOK-SYSTEM-SYNERGY-V2 — Architectural Plan

> **Author:** claude-85cedf09 · **Date:** 2026-05-10
> **Trigger:** Hook overload causing 50+ minute hangs (480 wired hooks, ~98 PreToolUse fan-out per call)
> **Diagnosis:** see `state/shared/AGENT_CHAT.md` — settings audit completed this session
> **Scope:** Forward design + 13 atomic build units (H1-H13). Stopgap timeout fixes already shipped.

---

## §1 — Core problem statement

Hooks have grown organically into **480 wired commands across 3 settings.json layers**. Every tool call fires up to ~98 PreToolUse hooks. There is:

1. **No hook-creation discipline** — same problem `duplicationGuardEngine` solves for engines, but no equivalent for hooks
2. **No hook tier classification** — safety-critical hooks (file-claim-guard) and chatty injections (chat-bus-inject) get equal priority
3. **No hook latency telemetry** — we don't know which hooks are P99 outliers until users observe minute-long hangs
4. **No async/background lane** — synchronous critical-path hooks block tool calls even when their output isn't needed for correctness
5. **Settings layers stack instead of override** — same hook can be wired in C: global, H: project, and `.local.json` simultaneously
6. **Cross-worktree phantom dependencies** — hooks in main tree reference `H:/prism-iooms0/...` paths, so sibling tree health affects main tree latency
7. **Chat-bus state contention** — 6 chats writing to the same shared JSON files = lock thrash
8. **Hook ↔ Engine duplication** — many hooks wrap engine methods that callers could invoke directly, doubling cost

---

## §2 — Hook classification system (mirrors AI tier ladder from K2-CLOUD)

| Tier | Purpose | Budget | Fail mode | Examples |
|---|---|---|---|---|
| **T0: Critical Safety** | HARD BLOCK on violation | <2s | block + escalate | `duplication-hard-block`, `file-claim-guard`, `asset-deletion-block`, `comprehensive-build-enforce` |
| **T1: Active Enforcement** | Block on detected bad pattern | <5s | block + report | `ban-facade-patterns`, `code-completeness-gate`, `test-legitimacy`, `magic-number-detector` |
| **T2: Awareness Injection** | Inject context, never block | <3s | skip silently | `claude-brief-inject`, `chat-bus-inject`, `wiki-precheck-inject`, `inventory-check-guard` |
| **T3: Telemetry/Logging** | Fire-and-forget | <1s | log error, continue | `hook-stats-tracker`, `ollama-offload-tracker`, routing ledger |
| **T4: Async/Background** | Defer to background queue | unbounded | result lands in next session | `test-100-percent-gate`, `git-sync-fetch`, `auto-lint-post-edit` |

**Enforcement:** every hook file MUST declare its tier in a frontmatter comment:

```javascript
// @hook-tier: T2
// @hook-event: PreToolUse
// @hook-matchers: Bash|Read|Edit|Write
// @hook-budget-ms: 3000
// @hook-fail-mode: skip-silently
```

A new T0 hook (`hook-tier-validator.mjs`) fires on `Edit` to any `.claude/hooks/*.mjs` and HARD BLOCKS commits where tier metadata is missing or violates budget.

---

## §3 — The 13 atomic build units (H1-H13)

| # | Unit | Tier delivered | Purpose | Blocks |
|---|---|---|---|---|
| **H1** | `U-HOOK-REGISTRY` | T2/T3 | `mcp-server/src/engines/HookRegistryEngine.ts` — enumerates all 480 hooks across 3 settings layers + per-hook metadata (tier, event, matchers, latency budget, fail mode). Exposes via `prism_dev:hook_registry`. | H2-H13 |
| **H2** | `U-HOOK-LATENCY-TELEMETRY` | T3 | New telemetry pipe: every hook invocation appends to `mcp-server/data/state/hook-latency.jsonl` with `{ts, hook, event, matcher, tool, latency_ms, exit_code}`. Wraps existing hooks via PreCommand/PostCommand shim — no per-hook edit needed. | H3, H4, H7 |
| **H3** | `U-HOOK-PROFILE-DASHBOARD` | T2 | `scripts/hook-profile-dashboard.mjs` reads H2 telemetry, prints P50/P95/P99 per hook, auto-flags hooks where P95 > timeout × 0.8 (timeout-prone). Skill: `/hook-profile`. | H4 |
| **H4** | `U-HOOK-CREATION-GATE` | T0 | `mcp-server/src/engines/HookCreationGuardEngine.ts` (mirrors `DuplicationGuardEngine`) + PreToolUse hook on Edit/Write to `.claude/hooks/*.mjs`. Checks proposed hook against existing 480 by name + behavior signature; THROWS on ≥75% behavior overlap; forces tier metadata. | H5 |
| **H5** | `U-HOOK-DEAD-CODE-AUDIT` | T2 | `scripts/hook-deadcode-audit.mjs` reads H2 telemetry; reports hooks with zero fires in 30 days. Promotes them to a `hooks/_deprecated/` directory (not deleted — reversible). | — |
| **H6** | `U-SETTINGS-LAYER-DEDUP` | T2 | `scripts/settings-dedup-audit.mjs` walks all 3 settings.json layers; detects same hook wired multiple times; computes per-tool-call fan-out factor (e.g., "Bash fires 47 hooks; Read fires 31 hooks"); suggests pruning. Skill: `/settings-dedup`. | H7 |
| **H7** | `U-CROSS-WORKTREE-FIREWALL` | T0 | New SessionStart hook `cross-worktree-ref-guard.mjs` — scans settings.json for `H:/prism-*` paths NOT matching current checkout. HARD BLOCKS SessionStart if found, auto-fixes by rewriting to `H:/prism/`. | — |
| **H8** | `U-ASYNC-HOOK-DISPATCHER` | T0/T4 | `mcp-server/src/orchestration/AsyncHookDispatcher.ts` — long-running hooks (T4) write task to `state/shared/hook-task-queue.jsonl`; background worker drains queue; results land in `state/shared/hook-results/` and surface in next SessionStart. Migrate `test-100-percent-gate`, `git-sync-fetch`, `auto-lint-post-edit` to T4. | H9, H12 |
| **H9** | `U-HOOK-FAST-LANE` | T2 | New matcher set `Read|Glob|Grep` (read-only, no blast) fires ONLY T0+T1+T2 hooks (target: ≤10 hooks total). Edit/Write/Bash get full fan-out as today. Cuts read-tool latency by ~70%. | — |
| **H10** | `U-CHAT-BUS-SQLITE` | T2 | Migrate `state/shared/AGENT_CHAT.json`, `WORK_CLAIMS.json`, `file-claims/*.json` to `state/shared/coordination.db` (SQLite WAL mode). Concurrent reads, serialized writes, atomic claims. Cuts 6-chat lock contention from ~200ms/op to <5ms/op. | H8 |
| **H11** | `U-HOOK-ENGINE-COMPRESSION` | T2 | Migration pass: identify hooks that wrap a single engine method (e.g., `dedup-auto-invoke.mjs` → `duplicationGuardEngine.checkBeforeCreating()`); convert hook body to a 3-line shim; document as `// @hook-shim-of: <engineMethod>` in frontmatter. Reduces per-hook code by 80%. | H1 |
| **H12** | `U-HOOK-CIRCUIT-BREAKER` | T0 | Per-hook circuit breaker: 3 consecutive timeouts → hook auto-disables for 10 min, with notification to chat bus. Prevents one bad hook from killing 50+ minutes of work. State in `mcp-server/data/state/hook-circuit-breaker.json`. | H8 |
| **H13** | `U-HOOK-CLAUDE-MD-DOC` | T2 | Document the new tier system + Boris back-flow note in `H:/PRISM/CLAUDE.md` §HOOK ENFORCEMENT GATES. Update global `~/.claude/CLAUDE.md` "PRISM Global Operational Playbook" with the tier ladder. | H1-H12 |

**Estimated effort:** 14-20 hours across 3-4 sessions.
**Wave timing:** Wave 0.5 (BEFORE K2-CLOUD-MS0/K2-K12 — hook overload is currently degrading every chat in the system; fixing it makes K* and all subsequent work faster).

---

## §4 — Variability axes (per build-enforcement floor)

| Axis | Configurations | Coverage in tests |
|---|---|---|
| Hook tier | T0, T1, T2, T3, T4 | All 5 represented in fixtures |
| Hook event | SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop, PreCompact | All 6 |
| Tool matcher | empty, .*, Bash, Edit, Write, Read, Glob, Grep, Skill, Task, Agent, mcp__prism__* | ≥6 spanning matchers in tests |
| Settings layer | C: global, H: project, .local.json overrides | All 3 read in H1 |
| Worktree context | main tree, sibling worktree, missing sibling | All 3 covered in H7 |
| Multi-chat load | 1 chat, 3 chats, 6 chats | H10 perf tests at 1/3/6 |
| Failure mode | hook OK, hook timeout, hook crash, hook missing | All 4 in H12 circuit-breaker tests |

---

## §5 — Risks + mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | Tier metadata adoption is voluntary → hooks ship without tags | H4 HARD BLOCK on Edit; force adoption at modification time |
| 2 | Async lane (H8) hides failures (test-100-percent-gate not blocking Stop) | Surface result in next SessionStart additionalContext; add to BUILD_STATE drift report |
| 3 | SQLite migration (H10) breaks existing readers | Dual-write phase: write to both JSON and SQLite for 7 days; cutover when no JSON readers detected |
| 4 | Circuit-breaker (H12) auto-disables a critical safety hook → silent risk window | T0 hooks exempt from circuit-breaker; T0 timeout = process termination + chat-bus alert + audit log entry |
| 5 | Cross-worktree firewall (H7) breaks legitimate cross-tree integration tests | Allowlist mechanism: hooks may declare `// @cross-tree-allowed: prism-iooms0` and the firewall respects it |
| 6 | Hook compression (H11) creates indirection, harder to debug | Each shim hook keeps a `console.error("[shim] -> engine.method")` line that's a one-grep trace |
| 7 | 480 → fewer hooks process feels like asset deletion → safety rails block | All deprecated hooks move to `hooks/_deprecated/` with timestamp; nothing is rm'd; reversible per CLAUDE.md no-delete-assets |

---

## §6 — Hard rules (no escape hatches)

- **No new hook ships without tier metadata** (H4 HARD BLOCK)
- **No T0/T1 hook may exceed its budget without tripping circuit breaker** (H12)
- **No hook may reference cross-worktree paths** unless explicitly allowlisted (H7)
- **No hook duplicates engine logic** unless `// @hook-shim-of:` declared (H11 compression pass)
- **Telemetry is mandatory** — H2 instrumentation can't be opted out (only `PRISM_HOOK_PROFILE=off` for emergency, with chat-bus warning)
- **Settings.json edits MUST go through C: source** (existing rule, reinforced by H6 dedup audit)

---

## §7 — Synergy with rest of PRISM

| PRISM subsystem | How H1-H13 plugs in |
|---|---|
| **AI tier ladder (K2-CLOUD-MS0)** | Hook tier 0-4 mirrors AI tier free-local→cloud→premium; same routing engine pattern |
| **DuplicationGuardEngine** | H4 HookCreationGuardEngine is its sibling; both prevent the same anti-pattern in different asset types |
| **prism_dev dispatcher** | H1 `hook_registry` becomes a new action alongside `engine_browse` / `dispatcher_map_compact` |
| **BUILD_STATE.json** | H1 emits hook counts into BUILD_STATE so envelope drift detection covers hooks too |
| **PRISM-INVENTORY-LATEST.md** | H1 contributes hook count + tier breakdown |
| **System-viz (10-layer atomic graph)** | Add layer L11.5 (hooks) — each hook is a node, edges to event types + tools they fire on |
| **Boris loop+agent doctrine** | H4 + H7 are HARD GATES; H3 + H6 produce the artifacts peer-reviewer subagents review |
| **Chat bus / 6-chat coordination** | H10 SQLite migration directly addresses the 6-chat contention pathology that compounds hook latency |
| **Ollama offload telemetry** | H2 latency telemetry parallels existing `ollama-offload-stats.json` schema; same tooling pattern |

---

## §8 — Stopgap fixes already shipped this session (not part of H1-H13)

These are emergency band-aids before the structural plan lands:

| Hook | Old timeout | New timeout | Reduction |
|---|---|---|---|
| `git-health-guard.mjs` | 35s | 8s | 27s |
| `git-sync-stop.mjs` | 35s | 8s | 27s |
| `session-start-zombie-reap.mjs` | 25s | 8s | 17s |
| `auto-lint-post-edit.mjs` | 15s | 8s | 7s |
| `git-sync-fetch.mjs` | 12s | 5s | 7s |
| `claude-brief-inject.mjs` | 12s | 5s | 7s |
| `quality-dashboard-alert.mjs` (×2 instances) | 12s | 5s | 14s |

**Worst-case stuck-hook wait:** 158s → 52s (-67%)
**Backup:** `C:/Users/wompu/.claude/settings.json.backup-pre-hang-fix-20260510-111644`
**NOT touched:** `test-100-percent-gate.mjs` (120s) — has built-in fast-path skip + `PRISM_TEST_GATE=off` escape; bound is for legitimate test runs.

---

## §9 — Open questions (deferred to user before H1 starts)

1. **SQLite migration risk tolerance** — H10 changes coordination storage format. Acceptable to dual-write for 7 days, OR cutover on a quiet weekend?
2. **Async lane behavior on test failure** — if H8 makes `test-100-percent-gate` async, do we BLOCK next SessionStart on previous-failure, or just warn? (Current sync behavior: BLOCK Stop.)
3. **Hook compression aggressiveness (H11)** — convert all 480 hooks to shims, or only the obvious wraps (~80 candidates)?
4. **Tier metadata enforcement window** — H4 HARD BLOCK on day 1, or 14-day grace period to add tags to existing 480?
5. **Cross-worktree allowlist** — auto-allow current PRISM siblings (`prism-iooms0`, `prism-iooms1`, `prism-tribal-binder`, `prism-xproc-neural-aci`) by default, or require explicit per-hook tag?

---

## §10 — Boris loop verification (mandatory for H1-H13)

Each H* unit:
1. **Build** the asset
2. **Tests:** happy + ≥3 failure modes + ≥2 adversarial inputs (per build-enforcement)
3. **Spawn peer Claude reviewer subagent** with `isolation: 'worktree'` after every 3 units (batched)
4. **3-way scrutiny** at H4, H8, H10, H12 (Codex + Gemini + Opus) — these are the high-blast-radius units
5. **Regressions flow to CLAUDE.md** §Recent regressions per Boris back-flow doctrine
6. **HTML companion** for H3 dashboard (Thariq pattern)
7. **CronCreate self-schedule** for H6 dedup audit (weekly)

---

## §11 — Provenance

- Diagnosis session: claude-85cedf09 on 2026-05-10
- Settings audit findings: see chat at `state/shared/AGENT_CHAT.md` 2026-05-10T15:1*Z
- Backup: `C:/Users/wompu/.claude/settings.json.backup-pre-hang-fix-20260510-111644`
- Doctrine references: `BORIS-LOOP-AGENT-DOCTRINE.md`, `K2-CLOUD-INTEGRATION-PLAN.md` (parallel tier-system pattern)
- Sibling specs: `K2-ROUTER-INVENTORY.md` (same enumeration discipline)
