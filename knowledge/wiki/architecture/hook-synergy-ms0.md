---
title: HOOK-SYNERGY-MS0 — hook + coordination infrastructure built 2026-05-12..13
date: 2026-05-13
agent: claude-80d35610
slot: alpha
milestone: HOOK-SYNERGY-MS0
tags: [hooks, coordination, sqlite, ipc, async, infrastructure]
boost_keywords: [settings.json, hook synergy, async hook dispatcher, coordination store, "*.mjs", hook latency, sqlite wal]
links:
  - "[[reference_h7_async_hook_dispatcher]]"
  - "[[reference_h8_coordination_store]]"
  - "[[reference_u_coord11_ipc]]"
  - "[[feedback_conflict_fork_rule]]"
---

# HOOK-SYNERGY-MS0 — 11 units shipped 2026-05-12..13

Source: this content lived inline in `H:/prism/CLAUDE.md` lines ~107-127 from 2026-05-12 through 2026-05-13. Extracted to the wiki via U-CLEANUP-D1 to keep CLAUDE.md under the 200-line "compliance collapse" threshold described in CLAUDE.md §RULES 5-12.

## Cross-worktree firewall

2026-05-12, `hook-cross-worktree-block.mjs`, HOOK-SYNERGY-MS0/U-HOOK-CROSS-WORKTREE-FIREWALL.

Once forked, you may NOT write to the **main tree's shared-state files** from your worktree. A PreToolUse Tier-0 hook blocks Edit/Write/MultiEdit/NotebookEdit when the target is `.claude/settings.json`, `.claude/hooks/*.mjs`, `.mcp.json`, `state/shared/*.{json,md}`, `mcp-server/data/state/*.json`, `mcp-server/data/milestones/*.json`, or top-level `CLAUDE.md`/`AGENTS.md`/`CODEX.md`/`GEMINI.md`.

**Remediation:** make the change from the main tree (`cd H:/prism`, edit, commit) — these files coordinate the whole fleet and cross-worktree writes drift behaviour silently. Emergency override: `PRISM_CROSS_WORKTREE_BYPASS=1` (still logs the bypass). Worktree-local files (under `H:/prism-<scope>/...`) are unaffected; the firewall only fires on shared-state paths.

## Hook creation gate

2026-05-12, `hook-creation-gate.mjs` + `HookCreationGuardEngine`, HOOK-SYNERGY-MS0/U-HOOK-CREATION-GATE.

Before creating a new `.claude/hooks/*.mjs`, the hook scans `state/shared/HOOK_REGISTRY.json` for (a) exact basename collision, (b) fuzzy-name match ≥0.7, (c) description-token overlap, and (d) (event, matcher) signature collision — the last is what the existing name-only guards (`ai-duplication-guard`, `duplication-hard-block`) miss.

**Advisory by default**: emits a system message with the recommendation (`skip` / `extend` / `rename` / `proceed`) rather than blocking, because fuzzy/description matches have non-zero false-positive rates. Set `PRISM_HOOK_CREATION_GATE_BLOCK=1` to promote `skip` + `extend` recommendations into hard blocks. Programmatic access: `prism_hook:creation_check` (snake_case action; returns `{shouldProceed, recommendation, matches, topMatch}`).

## Settings dedup audit

2026-05-12, `scripts/settings-dedup-audit.mjs`, HOOK-SYNERGY-MS0/U-HOOK-AUDIT.

Comprehensive `.claude/settings.json` redundancy auditor. Aggregates the dimensions the older narrower audits (`audit-hook-duplicates`, `audit-cross-file-hooks`, `verify-hook-refs`) cover **plus** the dimension they all miss: **matcher-overlap dedup** (e.g. one entry with matcher `Bash`, another with `^Bash$`, both pointing at the same script → double-fires).

Run `node scripts/settings-dedup-audit.mjs` to write `state/shared/SETTINGS_DEDUP_REPORT.md` + `state/shared/settings-dedup-report.json`. Six dimensions: duplicate commands, matcher overlap, dead refs, cross-file duplication, bloated chains (>25 hooks/event), coverage gaps. Audit-only — does not block; consume the report to plan a cleanup commit.

## Hook registry reader

2026-05-12, `HookRegistryReaderEngine` + `scripts/build-hook-registry.mjs` + `.claude/hooks/hook-registry-regen.mjs`, HOOK-SYNERGY-MS0/U-HOOK-REGISTRY.

Canonical query surface over `state/shared/HOOK_REGISTRY.json` (the 455-hook / 171-wired manifest the H1 audit consumes). Read-only engine with mtime cache; never returns the full 228 KB blob — every method is a projection (counts, compact event-map, find/search, byEvent/byTier, wired/orphaned, isStale).

Wired as **`prism_dev:hook_registry`** (mode-switched: `counts|meta|compact|find|search|by_event|by_tier|wired|orphaned|stale`) and **`prism_session:hook_map_compact`** (mirrors `dispatcher_map_compact` for hooks). The regen hook (already wired in `H:/prism/.claude/settings.json`) fires fire-and-forget on every `Edit|Write|MultiEdit` touching `.claude/hooks/*.mjs` or `.claude/settings*.json`, so the registry stays current without manual refresh. Knob: `PRISM_HOOK_REGISTRY_REGEN=0` disables regen during batch hook edits.

## Hook latency envelope

2026-05-12, `.claude/hooks/_envelope.mjs` + `HookLatencyEngine` + `scripts/digest-hook-latency.mjs`, HOOK-SYNERGY-MS0/U-HOOK-ENVELOPE.

Profiling shim that wraps any hook by prefixing its settings.json command — e.g. `"\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/_envelope.mjs H:/prism/.claude/hooks/foo.mjs"` — measures wall time, appends `{ts, hook, durationMs, exitCode, signal}` to `state/shared/hook-latency.jsonl` (auto-rotates at 50 MiB), and forwards stdout/stderr/exit code transparently. Self-overhead ≤2 ms p99.

Query surface via **`prism_dev:hook_latency`** (modes: `summary|per_hook|top_p95|recent_slow|recent_failures|total_fires|available`) backed by `HookLatencyEngine` (nearest-rank percentiles, mtime-cached). Nightly digest at `state/shared/HOOK_LATENCY_DIGEST.md` flags regressions (P95 ≥ 1.5× previous AND ≥ 50 ms) against the prior snapshot.

**Knobs:** `PRISM_HOOK_ENVELOPE=0` bypasses the shim, `PRISM_HOOK_LATENCY_JSONL=<path>` overrides output, `PRISM_HOOK_LATENCY_MAX_BYTES=<n>` tunes rotation. Opt-in per hook (no auto-wrap) — H7's tier-routing pass will decide which hooks get wrapped by default.

## Hook tier frontmatter

2026-05-13, `scripts/classify-hook-tiers.mjs` + `.claude/hooks/hook-tier-validator.mjs`, HOOK-SYNERGY-MS0/U-HOOK-TIERS.

Every hook in `.claude/hooks/*.mjs` now carries a `// tier: T#` line directly after its shebang.

**Taxonomy**: T0 critical blocker (hard exit / `decision:"block"` / Stop gates), T1 soft gate (PreToolUse advisory `approve`), T2 injector (UserPromptSubmit/SessionStart context), T3 observer (PostToolUse write-only side effects), T4 async (detached spawn / PreCompact).

Initial classification (508 hooks): T0=66, T1=77, T2=21, T3=93, T4=251. The classifier is idempotent — re-runs only touch hooks missing frontmatter unless `--rewrite` is passed. The validator (`hook-tier-validator.mjs`, wired as PreToolUse on `Edit|Write|MultiEdit`) emits an advisory when an edit lands on a hook without a tier tag; promote to hard block with `PRISM_HOOK_TIER_VALIDATOR_BLOCK=1`.

**Prereq cleared** — H6 (fast-lane matcher split) and H7 (async dispatcher) can now route by tier.

## Hook compression / shared duplication-guard

2026-05-12, `.claude/helpers/duplication-guard.mjs` + 3 refactored hooks, HOOK-SYNERGY-MS0/U-HOOK-COMPRESS.

Canonical engine-shim form for high-traffic hooks. Shared helper `findSimilarAssets(name, opts)` reads `cross-session-asset-registry.json` (shape: `{assets:{engines,hooks,actions,skills}}`) + `src/engines/index.ts` and returns fuzzy-matched canonical names — single source of truth for hook-side duplication detection.

Refactors landed:
- **`dedup-auto-invoke.mjs`** (149→55 LOC, delegates to helper)
- **`ai-feature-recommend.mjs`** (90→18 LOC, dead-code stripped since DOMAIN_KEYWORDS drift-rotted vs `PRISMSelfAwarenessEngine.findCapabilities`; re-enable via dispatcher call not inline map)
- **`inventory-check-guard.mjs`** (fixed phantom `readStdinSafe()` reference that silently no-op'd every fire pre-H9)

Audited as **already shim-quality** (kept as-is): `mcp-route-suggest.mjs` (Ollama-bridge + regex fallback + hook-profile gate), `wiki-precheck-inject.mjs` (BM25 over index.md + leaf-index + semantic fallback w/ mtime caches + telemetry), `chat-bus-inject.mjs` (delegates to `ChatBusEngine.ts` as authoritative read/write).

**Pattern for future hooks:** hook is the I/O envelope (read stdin → call shared module → emit MCP-style JSON), domain logic lives in `.claude/helpers/*.mjs` or `mcp-server/src/engines/*.ts`.

## SQLite WAL coordination store

2026-05-13, `CoordinationStoreEngine` + `prism_context:coord_sqlite` + `scripts/migrate-claims-to-sqlite.mjs`, HOOK-SYNERGY-MS0/U-HOOK-COORD-SQLITE.

SQLite WAL-mode replacement for the legacy single-JSON-file work-claim store at `state/shared/WORK_CLAIMS.json`. The legacy JSON is read+written by `work-claim.mjs` on every Edit/Write PreToolUse hook; with 6 fleet chats × 10 ops/min that's ~60 read-modify-writes/min on the same file, which is the dominant multi-chat coord contention source the H8 unit was designed to eliminate.

**DB config**: `journal_mode=WAL` (concurrent readers never block writes), `synchronous=NORMAL` (durable-through-OS-crash, fast hot path), `busy_timeout=5000` (concurrent writers wait up to 5 s before SQLITE_BUSY — well below the 30 s Stop budget). DB lives at `state/shared/coordination.db`.

**Schema** (`schemaVersion=1`): `claims(resource_path PK, session_id, pc_name, hostname, pid, intent, claimed_at, expires_at)` + `presence(session_id PK, pc_name, hostname, meta_json, last_seen_at)` + `meta(key PK, value)`. Indexes on `claims(session_id)` + `claims(expires_at)` + `presence(last_seen_at)`.

**Engine surfaces**: `claim({resourcePath, sessionId, ttlMs, intent, pid, hostname, pcName})` returns `{acquired:true,row}` or `{acquired:false,existing,reason}` (same shape as `chatBusEngine.claimFile()` — backward-compatible); same-session re-claim refreshes TTL idempotently; expired claims auto-purged on every claim check. `release({resourcePath,sessionId})`, `findClaim(path)`, `liveClaims()` (oldest first), `allClaims()` (admin debug), `heartbeat({sessionId, meta})`, `activeSessions(windowMs)`, `prune(now)`, `counts()`, `health()` (returns journal mode + schema version), `migrateFromJson(sourcePath)` (one-shot, idempotent — `session_id` falls back to legacy `by` field, `at` ISO parsed for `claimed_at`).

**Dispatcher action `prism_context:coord_sqlite`** is mode-switched over all 11 surfaces. **Migration script** `node scripts/migrate-claims-to-sqlite.mjs [--dry-run] [--source <path>] [--db <path>]` parses + reports + seeds the DB.

**Adoption path**: this commit lands the SQLite backend + dispatcher action + migration tool but does NOT modify the legacy `work-claim.mjs` hook — the active fleet keeps writing to WORK_CLAIMS.json. To complete the migration, run `node scripts/migrate-claims-to-sqlite.mjs` once, then swap the hook over to call `prism_context:coord_sqlite action=claim` instead of mutating the JSON; the engine's `migrateFromJson` is idempotent so a re-seed before the swap is safe.

Engine is pure (no top-level disk I/O until `ensureOpen()` is invoked by the first method call), prepared statements cached per construct, JSON.parse output bounded by `MAX_INTENT_BYTES=4096`. 41 tests green covering happy path / conflict / expired-auto-purge / same-session-refresh / release / heartbeat / prune / migration-with-by-fallback / missing-source-warn / malformed-JSON-warn / 3 distinct resource shapes / 3 distinct hostnames / 60-claim contention burst / on-disk WAL persistence across re-open / singleton + dispatcher contract.

## Async hook dispatcher

2026-05-13, `AsyncHookDispatcherEngine` + `prism_dev:async_dispatch` + `scripts/async-hook-runner.mjs` + `.claude/helpers/async-hook-enqueue.mjs`, HOOK-SYNERGY-MS0/U-HOOK-ASYNC-DISPATCH.

Decouples Tier-4 (async/background) hooks from the synchronous Stop critical path so vitest gates / git-sync / deep-test-sweep can never push Stop wall-time past 30 s.

**Two-surface design**: (1) `enqueue(job)` appends to `state/shared/async-hook-queue.jsonl` and spawns `scripts/async-hook-runner.mjs` as a **detached child** (`detached:true, stdio:"ignore"`, `.unref()` so the parent's event loop is freed); returns in <2 ms regardless of how long the wrapped hook actually takes. (2) Inside the detached child, `runJob(jobId)` looks up the queue entry, spawns the wrapped hook synchronously (with timeout race + SIGTERM→SIGKILL escalation), captures stdout/stderr **byte counts only** (full output stays in the H4 latency log), appends a result row to `state/shared/async-hook-results.jsonl`, removes the queue entry.

**Result statuses**: `succeeded` (exit 0), `failed` (non-zero / spawn error), `timeout` (per-job `timeoutMs`, default 5 min, capped at 30 min), `skipped` (job not in queue — handles double-spawn races).

**Back-pressure**: queue depth capped at 200; oldest auto-purged on enqueue with `pressureWarning` returned to the caller.

**Read surfaces** (pure projections, mtime-cached): `getPendingJobs()`, `getResults({status, hook, windowMs, limit})`, `getStats(windowMs)` (per-hook P50/P95/max + failure rate, default 24h window, max 30d), `isAvailable()`, `purgeOlderThan(ms)`.

**Operator wrapper**: replace a settings.json Tier-4 hook command with `"\"H:/.claude/bin/portable-node\" H:/prism/.claude/helpers/async-hook-enqueue.mjs --hook <path> --tier T4"` and the parent Stop hook returns `{"continue":true}` in <50 ms while the wrapped hook runs detached. The helper is **non-blocking by design** — missing engine bundle / spawn errors emit a `systemMessage` but never block the parent.

Dispatcher action `prism_dev:async_dispatch` exposes 6 modes (`enqueue|pending|results|stats|available|purge`) backed by the same engine singleton; SessionStart hooks consume `results`/`stats` to surface async failures.

**Knobs**: `PRISM_ASYNC_HOOK_DISABLE=1` (helper-side rollback), engine constructor accepts injected `spawnFn`/`now`/`jobIdFn` for hermetic tests.

**Pre-existing H6 wiring bug fixed in same commit** — `hook_fast_lane` was in the case handler but missing from the `ACTIONS` enum, so Zod was rejecting the action before it reached the case; this commit adds both `hook_fast_lane` and `async_dispatch` to the enum so the H6 dispatcher action is now actually callable.

Engine is pure (DI for spawn + clock + jobId), JSONL append-only with mtime-keyed cache, schema-versioned at `schemaVersion: 1`, 42-test suite covers happy / failure / adversarial / spanning T4 hook basenames / 100-job stress / dispatcher contract.

## IPC for hook queries

2026-05-13, `.claude/helpers/coord-ipc-server.mjs` + `coord-ipc-client.mjs` + daemon edit, COORD-MS0/U-COORD11.

NDJSON RPC over a named pipe (Windows `\\.\pipe\prism-coord-<userhash>`) / UDS (POSIX) so hooks can query coordination state without re-reading + JSON.parse-ing the 4 shared status files on every UserPromptSubmit.

**v1 methods** (extend via `METHODS` table in server):
- `health` → `{ok, pid, uptime_ms, started_at, version}`
- `status` → live AGENT_COORDINATION_STATUS contents (cached in daemon, refreshed each `update()` cycle)
- `coord_summary` → live AGENT_COORDINATION_SUMMARY contents
- `active_sessions({window_ms?})` → `[{chatId, lastSeen, slot, branch, topic, agent}, ...]` with optional last-N-ms filter

**Hook usage**: `await queryDaemon("active_sessions", {window_ms: 600_000}, {timeoutMs: 100, fallbackFile: "<path>", fallback: {agents:[]}})` — never throws, fallback ordering ipc → fallback-file → fallback-literal → `ok:false`. `r.source ∈ {"ipc","fallback-file","fallback-value","none"}`, `r.latencyMs` set on ipc path.

**Caps**: 8 KB request (`MAX_REQUEST_BYTES`), 5 s idle (`IDLE_TIMEOUT_MS`), 200 ms default client timeout (`DEFAULT_TIMEOUT_MS`), per-call timeout/path/token overrides.

**Performance**: ~1-2 ms warm pipe round-trip in tests vs 20-80 ms for the file-read+JSON.parse path it replaces.

**Auth**: shared-secret via `PRISM_COORD_IPC_TOKEN` env (empty-string normalized on both ends to "no auth" — typo must NOT silently disable).

**Daemon shutdown** covers SIGINT/SIGTERM/SIGHUP/SIGBREAK/uncaughtException/unhandledRejection so the pipe / UDS is always reclaimed (POSIX stale-socket cleanup is unconditional in `startIpcServer`).

**Knob**: `PRISM_COORD_IPC_DISABLE=1` skips IPC startup; hooks fall back to file reads transparently.

24 vitest cases (`mcp-server/src/__tests__/coordIpc.test.ts`) cover round-trip × 4 methods, 50-burst leak check, ERR_AUTH/ERR_METHOD/ERR_OVERSIZE/ERR_PARSE/ERR_TIMEOUT, fallback file vs literal vs none, isDaemonAlive contract. Commits: `3b36fe5b4` (server + client + daemon wire + tests) + `a2ffc5025` (codex-fixup: portable test paths + typed .mjs surface). 3-of-3 PASS in ledger.

**Companion** to the H8 SQLite store: SQLite handles *persisted* claim state (writes), IPC handles *ephemeral* hook queries (reads) — orthogonal optimizations.

**Deferred follow-up**: duplicate-daemon detection (two daemons on same user/host can silently collide — add a 50 ms `health` probe before `listen()` and refuse to start if a daemon is already alive; track as U-COORD13).

## Hook fast-lane matcher split

2026-05-13, `HookFastLaneEngine` + `prism_dev:hook_fast_lane` + `scripts/apply-hook-fast-lane.mjs`, HOOK-SYNERGY-MS0/U-HOOK-FAST-LANE.

Converts broad PreToolUse/PostToolUse matchers (`.*`, `Bash|Read`) into a narrow slow-lane allowlist (`^(Bash|Edit|Write|MultiEdit|NotebookEdit|Agent|Task|TaskCreate|Skill|mcp__.*)$`) **plus** a sibling fast-lane block matched on `^(Read|Glob|Grep)$` only when there are read-relevant hooks worth moving.

Classification uses the H3 `// tier: T#` frontmatter **plus** basename heuristics (read-relevant: `grep-*`, `read-*`, `recall-*`, `*-once-cache`, `*-result-cache`, `*-counter-track`; write-only: `edit-*`, `write-*`, `*-lint-*`, `*-build-*`, `*-on-write`, `*-creation-gate`, etc.). Conservative defaults: untagged hooks → slow-lane, T0 → both lanes.

Three-state plan per block:
- **no-op** (already narrow)
- **narrow-only** (matcher rewrite, hooks kept verbatim — covers the case where the broad matcher had no read-relevant hooks, e.g. `Bash|Read` with 15 bash-output condensers → narrow to `Bash`)
- **bifurcate** (narrow slow-lane + fast-lane sibling)

Forecast on the project `H:/prism/.claude/settings.json`: **Read 26→6 fires (76.9% cut), Glob 10→5, Grep 10→5, slow-lane tools 0% change**.

Dispatcher action `prism_dev:hook_fast_lane` exposes 5 modes: `analyze` (plan + forecast), `propose` (writes `<settings>.fastlane.json` for review), `apply_preview` (returns JSON + summary), `forecast` (per-tool counts only), `classify_block` (pure-function classification with no file I/O).

Apply script: `node scripts/apply-hook-fast-lane.mjs [--analyze|--propose|--apply|--diff] [--settings <path>]` — `--apply` writes `<settings>.bak` first and aborts if backup fails. Engine is pure (tierLookup injected) + idempotent (applying twice = applying once).
