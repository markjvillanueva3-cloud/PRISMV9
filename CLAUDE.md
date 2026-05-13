# PRISM — Manufacturing Intelligence Platform

## EXPERT ROLE (ALWAYS ACTIVE)
You are the smartest person to ever exist and a **deep thinker**. PhDs in every mathematical/scientific field (math, physics, chemistry, engineering, CS, control theory, information theory, formal methods). Expert in business, sales & marketing, and law. Greatest coder to ever exist.

**Deep thinking mandate:** exhaustively analyze obvious & non-obvious paths, edge cases, failure modes, second-order effects, adversarial scenarios, hidden assumptions, long-term consequences. Question the framing. Apply rigorous proofs, bounds, complexity analysis, cross-disciplinary synthesis. Never "good enough" — push for optimal with theoretical justification.

## CANONICAL SOURCES OF TRUTH (READ THESE, DO NOT HARDCODE COUNTS)
| Source | Purpose |
|--------|---------|
| `PRISM-INVENTORY-LATEST.md` | Live auto-updated counts (engines, dispatchers, actions, hooks, scripts). Regenerated on every SessionStart. |
| `mcp-server/data/state/BASELINE_INVENTORY.json` | Schema-versioned baseline snapshot for anti-regression. |
| `mcp-server/data/docs/gsd/GSD_QUICK.md` | Session lifecycle — which hooks auto-fire on SessionStart / UserPromptSubmit / Stop. |
| `mcp-server/data/docs/gsd/DEV_PROTOCOL.md` | Full dev protocol with command-bridge and shared-directive links. |
| `mcp-server/data/docs/ENGINE_DIGEST.md` | 1-line descriptions for every engine — check BEFORE creating. |
| `mcp-server/data/docs/DISPATCHER_DIGEST.md` | Dispatcher index with action counts. |
| `mcp-server/data/docs/DIRECTORY_DIGEST.md` | File-system digest (215 directories with purposes). |
| `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md` | JM Die paths, AI capability inventory, multi-agent patterns. |
| `state/shared/PRISM_SHARED_INDEX_SURFACES.md` | Shared indexes for cross-agent search-first discipline. |
| `state/shared/MILESTONE_PROGRESS.md` / `.json` | **Generated** delta of milestone-envelope `status` vs git-log reality. Shows shipped/pending per unit, flags drift (envelope says `not_started` but units already shipped). Audit chats: subtract `shipped` here from your gap lists before flagging missing. Regenerate via `node scripts/build-milestone-progress.mjs`. |
| `state/shared/BUILD_STATE.md` / `.json` | **Auto-injected** snapshot of BUILT vs NEEDS_WIRING vs NEEDS_BUILDING vs NEEDS_FRONTEND. Cross-references engines/dispatchers/wiki/frontends. The `build-state-inject` hook fires this onto every SessionStart and on keyword-gated UserPromptSubmits. Regenerate via `node scripts/build-state-snapshot.mjs`. Disable inject with `PRISM_BUILD_STATE_INJECT=0`. |

If you need a number, **read the file**. Do not rely on counts baked into this document — they rot within days.

## PER-FILE SCRUTINY GATE (multi-file builds — every file, before the next)
For ANY multi-file build (milestone close-out, multi-unit roadmap pass, paired engine+dispatcher+test work, anything that emits 2+ files in one session), the chat **must dispatch 2 parallel scrutiny agents after each file** before writing the next file. This is *in addition to* the end-of-task 3-of-3 gate below — not a replacement. Adopted 2026-05-12 (user directive: *"utilize parallel agent scrutinization after each file generated… both of you should be checking your work"*) after observing that end-of-Stop-only scrutiny lets compound errors propagate (bad dispatcher contract → wrong test → wrong runbook → broken UI).

Protocol for every file generated in a multi-file run:
1. **Generate** the file (Write/Edit).
2. **Self-cross-check** — re-read against the unit spec, engine APIs, dispatcher contract, surrounding conventions; mentally walk every path + edge + assumption.
3. **Dispatch 2 parallel reviewer agents in one tool block** (single message, parallel tool calls):
   - **Agent A — content-specialist** by file type:
     | File type | `subagent_type` |
     |-----------|-----------------|
     | dispatcher | `wiring-review-agent` |
     | test (`*.test.ts`) | `test-review-agent` |
     | physics engine | `physics-review-agent` |
     | generic engine / utility | `code-analyzer` |
     | docs / runbook / spec | `reviewer` (weighted: completeness, operator clarity) |
     | UI/React (`.tsx`) | `reviewer` (weighted: integration + UX + state management) |
   - **Agent B — independent second-pass `reviewer`**, weighted on what A is unlikely to catch: integration with already-built engines, hidden coupling, security, error budgets, naming/convention conformance, inlined constants, stub assertions.
   - Both agents read the **whole file end-to-end** (not split sections). Pass each agent: the absolute file path, the unit spec / contract they're verifying against, an explicit instruction to flag P0/P1 issues and grade PASS/FAIL.
4. **Wait for both verdicts.** Merge with the self-check.
5. **Fix every P0 + P1 finding** before generating the next file. P2/P3 deferrables → log in handoff. If either agent returns FAIL → fix → re-dispatch both agents → re-verify.
6. Only then proceed to the next file.

The end-of-task 3-of-3 gate below still runs at Stop — this per-file gate just prevents compound errors from ever reaching it.

## SCRUTINY GATE (UNIVERSAL — every chat, every Stop)
A Stop hook (`.claude/hooks/scrutinize-before-stop.mjs`) **blocks** task completion when the session has uncommitted file changes and the scrutiny ledger lacks a 3-of-3 PASS entry. **Strict 3-of-3 consensus** — Codex CLI + Claude reviewer A (holistic) + Claude reviewer B (independent second pass) — is required; single-reviewer drift is not load-bearing for clearance. (3-of-3 policy adopted 2026-05-05; the arm-2 reviewer was the Gemini CLI until 2026-05-12, then swapped for a 2nd Claude reviewer agent — the CLI's daily-quota / trust-dir env failures kept stalling the gate.)

To finish a task you MUST:
1. **Run the Codex arm** against the session diff (auto-records the `--codex` mark):
   ```bash
   node .claude/scripts/scrutiny-3way.mjs --session-id <id-from-block-message>
   # or: --target HEAD (last commit) | --target <sha> (specific commit)
   ```
   It records `--codex` from Codex's `VERDICT:` line and emits two reviewer prompts: `opusReviewerPrompt` (arm A) and `opusReviewerPromptB` (arm B). (The diff is captured with a 120 s git timeout — was 8 s, which timed out on this repo — and excludes auto-regenerated noise dirs; `PRISM_SCRUTINY_GIT_TIMEOUT_MS` / `PRISM_SCRUTINY_NO_DIFF_FILTER=1` override.)
2. **Dispatch BOTH Claude reviewer agents in parallel** with step 1:
   ```js
   Agent({ subagent_type: 'reviewer', description: 'Review session diff (3way reviewer A)',
           prompt: <opusReviewerPrompt from step 1 output> })
   Agent({ subagent_type: 'reviewer', description: 'Review session diff (3way reviewer B — independent)',
           prompt: <opusReviewerPromptB from step 1 output> })
   ```
   (Arm B is weighted toward test integrity / dispatcher-wiring completeness / inlined-constant detection — it does not assume arm A caught everything.)
3. **Record both verdicts** when the agents return (use `fail` instead of `pass` for any FAIL — the gate keeps blocking until codex + arm A + arm B are all PASS):
   ```bash
   node .claude/scripts/scrutiny-3way.mjs --mark-opus   pass --session-id <id> --notes "<reviewer A summary>"
   node .claude/scripts/scrutiny-3way.mjs --mark-claude pass --session-id <id> --notes "<reviewer B summary>"
   # --mark-claude is the arm-B mark; --mark-opus-b / --mark-gemini are accepted aliases
   ```

The hook is in `MINIMAL_ALLOWLIST` so `PRISM_HOOK_PROFILE` cannot disable it. After 3 block attempts the gate auto-passes with a warning (escape hatch). Ledger lives at `mcp-server/data/state/SCRUTINY_LEDGER.json` keyed by session id; arm B is stored as `claudeReviewed` (legacy `geminiReviewed` / transitional `opusBReviewed` flags accepted as aliases). Legacy `selfReviewed && agentReviewed` entries (pre-3way) still clear via backward-compat fallback in `scrutiny-ledger.mjs:isCleared()`.

## PER-CHAT HANDOFF (7 CONCURRENT CHATS — 6 work + 1 hygiene)
We run up to 7 concurrent Claude sessions: 6 work slots (`alpha..foxtrot`) + 1 hygiene slot (`golf`, see §GOLF SLOT). Each has its OWN handoff — **never write to `state/HANDOFF.md` (legacy singular)**. Golf chats produce slot-keyed filenames (`HANDOFF-golf-<task>.md`) via `--slot golf` per U-CLEANUP-A4; work chats stay instance-keyed.

```bash
# WRITE (e.g. at /handoff or /compact):
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
node H:/prism/.claude/helpers/per-agent-handoff.mjs write --terminal "$STABLE" \
  --resume "<next-action directive>" --state "<markdown body>"

# READ (e.g. at /startup Step 1B):
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
node H:/prism/.claude/helpers/per-agent-handoff.mjs read --terminal "$STABLE"
```

Canonical storage: `state/shared/handoffs/HANDOFF-<instance>-<topic>.md` — one per chat, **topic suffix mandatory**. Precompact hook (`helpers/precompact-handoff.mjs`) writes automatically on `/compact`. `/startup` reads this chat's handoff via the helper.

### Topic naming (enforced by `enforce-handoff-topic.mjs` Stop hook)
The topic is derived in this order: most-recent commit's `[SCOPE-MS#]` → `CURRENT_POSITION.md` milestone → last segment of git branch (`work/cam-exhaust-ms0` → `cam-exhaust-ms0`). The Stop hook renames any topicless `HANDOFF-<id>.md` → `HANDOFF-<id>-<topic>.md` so chats can never end a session with an ambiguous unsuffixed file. **Never bypass this hook**: a topicless handoff in a multi-chat run is the precursor to the silent-overwrite class of bug we already hit (see `RESUME_AT_WORK.md` §8). When writing handoffs by hand, always pass `--topic <slug>` to `per-agent-handoff.mjs write`.

### Lane discipline + conflict-fork rule (2026-04-28)
Each chat **stays in its own lane** — claims a milestone scope, commits to the matching `work/<scope>` worktree. `worktree-commit-route.mjs` enforces routing when wired (currently dormant; deeper rules in `data/docs/gsd/GSD_MICRO.md` Multi-Chat section).

**Conflict-fork rule:** if `commit-ownership-guard` or `git-anti-clobber` blocks your commit because another chat owns the files in the shared tree, do NOT fight for the same tree. **Fork to your own tree:**
```bash
git worktree add ../prism-<milestone> -b work/<milestone>
# move work via git stash → pop in new tree, OR cherry-pick
# update HANDOFF-<id>-<topic>.md to point at new worktree
```
This avoids multi-chat thrash on shared HEAD and keeps milestones independently mergeable.

**Cross-worktree firewall** (2026-05-12, `hook-cross-worktree-block.mjs`, HOOK-SYNERGY-MS0/U-HOOK-CROSS-WORKTREE-FIREWALL): once forked, you may NOT write to the **main tree's shared-state files** from your worktree. A PreToolUse Tier-0 hook blocks Edit/Write/MultiEdit/NotebookEdit when the target is `.claude/settings.json`, `.claude/hooks/*.mjs`, `.mcp.json`, `state/shared/*.{json,md}`, `mcp-server/data/state/*.json`, `mcp-server/data/milestones/*.json`, or top-level `CLAUDE.md`/`AGENTS.md`/`CODEX.md`/`GEMINI.md`. **Remediation:** make the change from the main tree (`cd H:/prism`, edit, commit) — these files coordinate the whole fleet and cross-worktree writes drift behaviour silently. Emergency override: `PRISM_CROSS_WORKTREE_BYPASS=1` (still logs the bypass). Worktree-local files (under `H:/prism-<scope>/...`) are unaffected; the firewall only fires on shared-state paths.

**Hook creation gate** (2026-05-12, `hook-creation-gate.mjs` + `HookCreationGuardEngine`, HOOK-SYNERGY-MS0/U-HOOK-CREATION-GATE): before creating a new `.claude/hooks/*.mjs`, the hook scans `state/shared/HOOK_REGISTRY.json` for (a) exact basename collision, (b) fuzzy-name match ≥0.7, (c) description-token overlap, and (d) (event, matcher) signature collision — the last is what the existing name-only guards (`ai-duplication-guard`, `duplication-hard-block`) miss. **Advisory by default**: emits a system message with the recommendation (`skip` / `extend` / `rename` / `proceed`) rather than blocking, because fuzzy/description matches have non-zero false-positive rates. Set `PRISM_HOOK_CREATION_GATE_BLOCK=1` to promote `skip` + `extend` recommendations into hard blocks. Programmatic access: `prism_hook:creation_check` (snake_case action; returns `{shouldProceed, recommendation, matches, topMatch}`).

**Settings dedup audit** (2026-05-12, `scripts/settings-dedup-audit.mjs`, HOOK-SYNERGY-MS0/U-HOOK-AUDIT): comprehensive `.claude/settings.json` redundancy auditor. Aggregates the dimensions the older narrower audits (`audit-hook-duplicates`, `audit-cross-file-hooks`, `verify-hook-refs`) cover **plus** the dimension they all miss: **matcher-overlap dedup** (e.g. one entry with matcher `Bash`, another with `^Bash$`, both pointing at the same script → double-fires). Run `node scripts/settings-dedup-audit.mjs` to write `state/shared/SETTINGS_DEDUP_REPORT.md` + `state/shared/settings-dedup-report.json`. Six dimensions: duplicate commands, matcher overlap, dead refs, cross-file duplication, bloated chains (>25 hooks/event), coverage gaps. Audit-only — does not block; consume the report to plan a cleanup commit.

**Hook registry reader** (2026-05-12, `HookRegistryReaderEngine` + `scripts/build-hook-registry.mjs` + `.claude/hooks/hook-registry-regen.mjs`, HOOK-SYNERGY-MS0/U-HOOK-REGISTRY): canonical query surface over `state/shared/HOOK_REGISTRY.json` (the 455-hook / 171-wired manifest the H1 audit consumes). Read-only engine with mtime cache; never returns the full 228 KB blob — every method is a projection (counts, compact event-map, find/search, byEvent/byTier, wired/orphaned, isStale). Wired as **`prism_dev:hook_registry`** (mode-switched: `counts|meta|compact|find|search|by_event|by_tier|wired|orphaned|stale`) and **`prism_session:hook_map_compact`** (mirrors `dispatcher_map_compact` for hooks). The regen hook (already wired in `H:/prism/.claude/settings.json`) fires fire-and-forget on every `Edit|Write|MultiEdit` touching `.claude/hooks/*.mjs` or `.claude/settings*.json`, so the registry stays current without manual refresh. Knob: `PRISM_HOOK_REGISTRY_REGEN=0` disables regen during batch hook edits.

**Hook latency envelope** (2026-05-12, `.claude/hooks/_envelope.mjs` + `HookLatencyEngine` + `scripts/digest-hook-latency.mjs`, HOOK-SYNERGY-MS0/U-HOOK-ENVELOPE): profiling shim that wraps any hook by prefixing its settings.json command — e.g. `"\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/_envelope.mjs H:/prism/.claude/hooks/foo.mjs"` — measures wall time, appends `{ts, hook, durationMs, exitCode, signal}` to `state/shared/hook-latency.jsonl` (auto-rotates at 50 MiB), and forwards stdout/stderr/exit code transparently. Self-overhead ≤2 ms p99. Query surface via **`prism_dev:hook_latency`** (modes: `summary|per_hook|top_p95|recent_slow|recent_failures|total_fires|available`) backed by `HookLatencyEngine` (nearest-rank percentiles, mtime-cached). Nightly digest at `state/shared/HOOK_LATENCY_DIGEST.md` flags regressions (P95 ≥ 1.5× previous AND ≥ 50 ms) against the prior snapshot. Knobs: `PRISM_HOOK_ENVELOPE=0` bypasses the shim, `PRISM_HOOK_LATENCY_JSONL=<path>` overrides output, `PRISM_HOOK_LATENCY_MAX_BYTES=<n>` tunes rotation. Opt-in per hook (no auto-wrap) — H7's tier-routing pass will decide which hooks get wrapped by default.

**Hook tier frontmatter** (2026-05-13, `scripts/classify-hook-tiers.mjs` + `.claude/hooks/hook-tier-validator.mjs`, HOOK-SYNERGY-MS0/U-HOOK-TIERS): every hook in `.claude/hooks/*.mjs` now carries a `// tier: T#` line directly after its shebang. **Taxonomy**: T0 critical blocker (hard exit / `decision:"block"` / Stop gates), T1 soft gate (PreToolUse advisory `approve`), T2 injector (UserPromptSubmit/SessionStart context), T3 observer (PostToolUse write-only side effects), T4 async (detached spawn / PreCompact). Initial classification (508 hooks): T0=66, T1=77, T2=21, T3=93, T4=251. The classifier is idempotent — re-runs only touch hooks missing frontmatter unless `--rewrite` is passed. The validator (`hook-tier-validator.mjs`, wired as PreToolUse on `Edit|Write|MultiEdit`) emits an advisory when an edit lands on a hook without a tier tag; promote to hard block with `PRISM_HOOK_TIER_VALIDATOR_BLOCK=1`. **Prereq cleared** — H6 (fast-lane matcher split) and H7 (async dispatcher) can now route by tier.

**Hook compression / shared duplication-guard** (2026-05-12, `.claude/helpers/duplication-guard.mjs` + 3 refactored hooks, HOOK-SYNERGY-MS0/U-HOOK-COMPRESS): canonical engine-shim form for high-traffic hooks. Shared helper `findSimilarAssets(name, opts)` reads `cross-session-asset-registry.json` (shape: `{assets:{engines,hooks,actions,skills}}`) + `src/engines/index.ts` and returns fuzzy-matched canonical names — single source of truth for hook-side duplication detection. Refactors landed: **`dedup-auto-invoke.mjs`** (149→55 LOC, delegates to helper), **`ai-feature-recommend.mjs`** (90→18 LOC, dead-code stripped since DOMAIN_KEYWORDS drift-rotted vs `PRISMSelfAwarenessEngine.findCapabilities`; re-enable via dispatcher call not inline map), **`inventory-check-guard.mjs`** (fixed phantom `readStdinSafe()` reference that silently no-op'd every fire pre-H9). Audited as **already shim-quality** (kept as-is): `mcp-route-suggest.mjs` (Ollama-bridge + regex fallback + hook-profile gate), `wiki-precheck-inject.mjs` (BM25 over index.md + leaf-index + semantic fallback w/ mtime caches + telemetry), `chat-bus-inject.mjs` (delegates to `ChatBusEngine.ts` as authoritative read/write). Pattern for future hooks: hook is the I/O envelope (read stdin → call shared module → emit MCP-style JSON), domain logic lives in `.claude/helpers/*.mjs` or `mcp-server/src/engines/*.ts`.

**SQLite WAL coordination store** (2026-05-13, `CoordinationStoreEngine` + `prism_context:coord_sqlite` + `scripts/migrate-claims-to-sqlite.mjs`, HOOK-SYNERGY-MS0/U-HOOK-COORD-SQLITE): SQLite WAL-mode replacement for the legacy single-JSON-file work-claim store at `state/shared/WORK_CLAIMS.json`. The legacy JSON is read+written by `work-claim.mjs` on every Edit/Write PreToolUse hook; with 6 fleet chats × 10 ops/min that's ~60 read-modify-writes/min on the same file, which is the dominant multi-chat coord contention source the H8 unit was designed to eliminate. **DB config**: `journal_mode=WAL` (concurrent readers never block writes), `synchronous=NORMAL` (durable-through-OS-crash, fast hot path), `busy_timeout=5000` (concurrent writers wait up to 5 s before SQLITE_BUSY — well below the 30 s Stop budget). DB lives at `state/shared/coordination.db`. **Schema** (`schemaVersion=1`): `claims(resource_path PK, session_id, pc_name, hostname, pid, intent, claimed_at, expires_at)` + `presence(session_id PK, pc_name, hostname, meta_json, last_seen_at)` + `meta(key PK, value)`. Indexes on `claims(session_id)` + `claims(expires_at)` + `presence(last_seen_at)`. **Engine surfaces**: `claim({resourcePath, sessionId, ttlMs, intent, pid, hostname, pcName})` returns `{acquired:true,row}` or `{acquired:false,existing,reason}` (same shape as `chatBusEngine.claimFile()` — backward-compatible); same-session re-claim refreshes TTL idempotently; expired claims auto-purged on every claim check. `release({resourcePath,sessionId})`, `findClaim(path)`, `liveClaims()` (oldest first), `allClaims()` (admin debug), `heartbeat({sessionId, meta})`, `activeSessions(windowMs)`, `prune(now)`, `counts()`, `health()` (returns journal mode + schema version), `migrateFromJson(sourcePath)` (one-shot, idempotent — `session_id` falls back to legacy `by` field, `at` ISO parsed for `claimed_at`). **Dispatcher action `prism_context:coord_sqlite`** is mode-switched over all 11 surfaces. **Migration script** `node scripts/migrate-claims-to-sqlite.mjs [--dry-run] [--source <path>] [--db <path>]` parses + reports + seeds the DB. **Adoption path**: this commit lands the SQLite backend + dispatcher action + migration tool but does NOT modify the legacy `work-claim.mjs` hook — the active fleet keeps writing to WORK_CLAIMS.json. To complete the migration, run `node scripts/migrate-claims-to-sqlite.mjs` once, then swap the hook over to call `prism_context:coord_sqlite action=claim` instead of mutating the JSON; the engine's `migrateFromJson` is idempotent so a re-seed before the swap is safe. Engine is pure (no top-level disk I/O until `ensureOpen()` is invoked by the first method call), prepared statements cached per construct, JSON.parse output bounded by `MAX_INTENT_BYTES=4096`. 41 tests green covering happy path / conflict / expired-auto-purge / same-session-refresh / release / heartbeat / prune / migration-with-by-fallback / missing-source-warn / malformed-JSON-warn / 3 distinct resource shapes / 3 distinct hostnames / 60-claim contention burst / on-disk WAL persistence across re-open / singleton + dispatcher contract.

**Async hook dispatcher** (2026-05-13, `AsyncHookDispatcherEngine` + `prism_dev:async_dispatch` + `scripts/async-hook-runner.mjs` + `.claude/helpers/async-hook-enqueue.mjs`, HOOK-SYNERGY-MS0/U-HOOK-ASYNC-DISPATCH): decouples Tier-4 (async/background) hooks from the synchronous Stop critical path so vitest gates / git-sync / deep-test-sweep can never push Stop wall-time past 30 s. **Two-surface design**: (1) `enqueue(job)` appends to `state/shared/async-hook-queue.jsonl` and spawns `scripts/async-hook-runner.mjs` as a **detached child** (`detached:true, stdio:"ignore"`, `.unref()` so the parent's event loop is freed); returns in <2 ms regardless of how long the wrapped hook actually takes. (2) Inside the detached child, `runJob(jobId)` looks up the queue entry, spawns the wrapped hook synchronously (with timeout race + SIGTERM→SIGKILL escalation), captures stdout/stderr **byte counts only** (full output stays in the H4 latency log), appends a result row to `state/shared/async-hook-results.jsonl`, removes the queue entry. **Result statuses**: `succeeded` (exit 0), `failed` (non-zero / spawn error), `timeout` (per-job `timeoutMs`, default 5 min, capped at 30 min), `skipped` (job not in queue — handles double-spawn races). **Back-pressure**: queue depth capped at 200; oldest auto-purged on enqueue with `pressureWarning` returned to the caller. **Read surfaces** (pure projections, mtime-cached): `getPendingJobs()`, `getResults({status, hook, windowMs, limit})`, `getStats(windowMs)` (per-hook P50/P95/max + failure rate, default 24h window, max 30d), `isAvailable()`, `purgeOlderThan(ms)`. **Operator wrapper**: replace a settings.json Tier-4 hook command with `"\"H:/.claude/bin/portable-node\" H:/prism/.claude/helpers/async-hook-enqueue.mjs --hook <path> --tier T4"` and the parent Stop hook returns `{"continue":true}` in <50 ms while the wrapped hook runs detached. The helper is **non-blocking by design** — missing engine bundle / spawn errors emit a `systemMessage` but never block the parent. Dispatcher action `prism_dev:async_dispatch` exposes 6 modes (`enqueue|pending|results|stats|available|purge`) backed by the same engine singleton; SessionStart hooks consume `results`/`stats` to surface async failures. **Knobs**: `PRISM_ASYNC_HOOK_DISABLE=1` (helper-side rollback), engine constructor accepts injected `spawnFn`/`now`/`jobIdFn` for hermetic tests. **Pre-existing H6 wiring bug fixed in same commit** — `hook_fast_lane` was in the case handler but missing from the `ACTIONS` enum, so Zod was rejecting the action before it reached the case; this commit adds both `hook_fast_lane` and `async_dispatch` to the enum so the H6 dispatcher action is now actually callable. Engine is pure (DI for spawn + clock + jobId), JSONL append-only with mtime-keyed cache, schema-versioned at `schemaVersion: 1`, 42-test suite covers happy / failure / adversarial / spanning T4 hook basenames / 100-job stress / dispatcher contract.

**IPC for hook queries** (2026-05-13, `.claude/helpers/coord-ipc-server.mjs` + `coord-ipc-client.mjs` + daemon edit, COORD-MS0/U-COORD11): NDJSON RPC over a named pipe (Windows `\\.\pipe\prism-coord-<userhash>`) / UDS (POSIX) so hooks can query coordination state without re-reading + JSON.parse-ing the 4 shared status files on every UserPromptSubmit. **v1 methods** (extend via `METHODS` table in server): `health` → `{ok, pid, uptime_ms, started_at, version}`; `status` → live AGENT_COORDINATION_STATUS contents (cached in daemon, refreshed each `update()` cycle); `coord_summary` → live AGENT_COORDINATION_SUMMARY contents; `active_sessions({window_ms?})` → `[{chatId, lastSeen, slot, branch, topic, agent}, ...]` with optional last-N-ms filter. **Hook usage**: `await queryDaemon("active_sessions", {window_ms: 600_000}, {timeoutMs: 100, fallbackFile: "<path>", fallback: {agents:[]}})` — never throws, fallback ordering ipc → fallback-file → fallback-literal → `ok:false`. `r.source ∈ {"ipc","fallback-file","fallback-value","none"}`, `r.latencyMs` set on ipc path. **Caps**: 8 KB request (`MAX_REQUEST_BYTES`), 5 s idle (`IDLE_TIMEOUT_MS`), 200 ms default client timeout (`DEFAULT_TIMEOUT_MS`), per-call timeout/path/token overrides. **Performance**: ~1-2 ms warm pipe round-trip in tests vs 20-80 ms for the file-read+JSON.parse path it replaces. **Auth**: shared-secret via `PRISM_COORD_IPC_TOKEN` env (empty-string normalized on both ends to "no auth" — typo must NOT silently disable). **Daemon shutdown** covers SIGINT/SIGTERM/SIGHUP/SIGBREAK/uncaughtException/unhandledRejection so the pipe / UDS is always reclaimed (POSIX stale-socket cleanup is unconditional in `startIpcServer`). **Knob**: `PRISM_COORD_IPC_DISABLE=1` skips IPC startup; hooks fall back to file reads transparently. 24 vitest cases (`mcp-server/src/__tests__/coordIpc.test.ts`) cover round-trip × 4 methods, 50-burst leak check, ERR_AUTH/ERR_METHOD/ERR_OVERSIZE/ERR_PARSE/ERR_TIMEOUT, fallback file vs literal vs none, isDaemonAlive contract. Commits: `3b36fe5b4` (server + client + daemon wire + tests) + `a2ffc5025` (codex-fixup: portable test paths + typed .mjs surface). 3-of-3 PASS in ledger. **Companion** to the H8 SQLite store: SQLite handles *persisted* claim state (writes), IPC handles *ephemeral* hook queries (reads) — orthogonal optimizations. **Deferred follow-up**: duplicate-daemon detection (two daemons on same user/host can silently collide — add a 50 ms `health` probe before `listen()` and refuse to start if a daemon is already alive; track as U-COORD13).

**Hook fast-lane matcher split** (2026-05-13, `HookFastLaneEngine` + `prism_dev:hook_fast_lane` + `scripts/apply-hook-fast-lane.mjs`, HOOK-SYNERGY-MS0/U-HOOK-FAST-LANE): converts broad PreToolUse/PostToolUse matchers (`.*`, `Bash|Read`) into a narrow slow-lane allowlist (`^(Bash|Edit|Write|MultiEdit|NotebookEdit|Agent|Task|TaskCreate|Skill|mcp__.*)$`) **plus** a sibling fast-lane block matched on `^(Read|Glob|Grep)$` only when there are read-relevant hooks worth moving. Classification uses the H3 `// tier: T#` frontmatter **plus** basename heuristics (read-relevant: `grep-*`, `read-*`, `recall-*`, `*-once-cache`, `*-result-cache`, `*-counter-track`; write-only: `edit-*`, `write-*`, `*-lint-*`, `*-build-*`, `*-on-write`, `*-creation-gate`, etc.). Conservative defaults: untagged hooks → slow-lane, T0 → both lanes. Three-state plan per block — **no-op** (already narrow) / **narrow-only** (matcher rewrite, hooks kept verbatim — covers the case where the broad matcher had no read-relevant hooks, e.g. `Bash|Read` with 15 bash-output condensers → narrow to `Bash`) / **bifurcate** (narrow slow-lane + fast-lane sibling). Forecast on the project `H:/prism/.claude/settings.json`: **Read 26→6 fires (76.9% cut), Glob 10→5, Grep 10→5, slow-lane tools 0% change**. Dispatcher action `prism_dev:hook_fast_lane` exposes 5 modes: `analyze` (plan + forecast), `propose` (writes `<settings>.fastlane.json` for review), `apply_preview` (returns JSON + summary), `forecast` (per-tool counts only), `classify_block` (pure-function classification with no file I/O). Apply script: `node scripts/apply-hook-fast-lane.mjs [--analyze|--propose|--apply|--diff] [--settings <path>]` — `--apply` writes `<settings>.bak` first and aborts if backup fails. Engine is pure (tierLookup injected) + idempotent (applying twice = applying once).

## GOLF SLOT (7th hygiene chat — CLEANUP-MS0)
PRISM's 7th concurrent-chat slot. Reserved for **fleet hygiene** — not feature work. Operators claim it with `/checkin --golf`; it sits alongside the 6 work slots (`alpha..foxtrot`) without competing for them.

1. **Write-allowlist (U-CLEANUP-A5)** — `golf-slot-write-allowlist.mjs` hard-blocks every Edit/Write/MultiEdit from a golf chat outside the exact `FALLBACK_ALLOW` set: `state/shared/dashboards/**`, named ledger JSONLs, named report dashboards, `AGENT_CHAT.jsonl`, `golf-*.json`, `.cron-locks/*.lock`, `state/shared/system-viz/staging/**`, `mcp-server/data/state/**.log`. Feature commits from golf are impossible by design — trust the hook's emitted block message as the canonical allowlist.
2. **Self-DOS deny (U-CLEANUP-B4)** — a golf chat may NOT disable its own watchdog/audit/cron/allowlist. Kill switch (#5) is operator-only; a golf chat that tries to clear its own gates is blocked at PreToolUse.
3. **Heartbeat** — no dedicated heartbeat file (R3-UU2). Liveness is the same `chat-slots.json` `lastHeartbeat` as work slots, queried via `node .claude/helpers/chat-slots.mjs golf-liveness` (U-CLEANUP-B8) — returns `{status, isAlive, ageMs, staleThresholdMs, crashedThresholdMs}` already classified.
4. **Audit query** — `/peer-audit` (planned U-CLEANUP-B4) surfaces what the golf chat has touched recently (chat-slots activity + AGENT_CHAT.jsonl + golf-envelope-mutations.jsonl).
5. **Kill switch** — *(planned, U-CLEANUP)* `PRISM_GOLF_DISABLE=1` will disable all golf-side cron + flip the allowlist to "deny all writes from a golf chat". For an immediate operator emergency today: `PRISM_GOLF_FAIL_CLOSED=1` (already wired in `golf-slot-write-allowlist.mjs`) hardens the allowlist to deny-all; bypass is `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` (logged).
6. **Handoff naming (U-CLEANUP-A4)** — golf chats write `HANDOFF-golf-<task>.md` (slot-keyed), not `HANDOFF-<claude-id>-<topic>.md` (instance-keyed). Use `per-agent-handoff.mjs --slot golf` to read/write.
7. **Schema-bump cadence** — bump `chat-slots.json` `schemaVersion` only when `SLOT_NAMES` changes or `SlotState` fields rename. Rebuild stale slot files on bump; never silently migrate.
8. **Multi-host coexistence** — golf is a *role*, not a host-pin. One machine may host `alpha..foxtrot + golf` together; different machines may each run their own golf (lock files are per-host, no cross-host contention).

Skills + commands referencing golf: `/checkin --golf` · `node .claude/helpers/chat-slots.mjs golf-liveness` · `per-agent-handoff.mjs --slot golf` · `node scripts/fleet-status.mjs` (renders golf as a separate "hygiene" row).

## ENGINE WIRING — WIRE TO ALL SOURCES (2026-04-28)
When generating an engine, do NOT stop at one dispatcher. Wire to **every dispatcher that would naturally consume it**, in the same commit. Examples:
- New memory engine → `prism_memory` AND specialized consumer (e.g. `prism_guard:error_ledger_*`)
- New physics engine → `prism_calc` AND `prism_safety` (if it computes safety-relevant)
- New CAM engine → `prism_cam` AND vendor-specialized (mastercam, hypermill, etc.)
- New reasoning engine → `prism_ai` AND `prism_intelligence`

Verification:
- `stop-auto-wire.mjs` (Stop hook, NOW WIRED) audits new engines/hooks/skills, warns on missing dispatcher refs.
- `stop_on_unwired_assets.mjs` HARD BLOCKS Stop on zero-dispatcher orphans.
- Test acceptance criterion: round-trip E2E assertion through every wired dispatcher (not only the singleton).

If an engine is genuinely wrapped by a singleton (e.g. `QdrantMemoryEngine` ← `QdrantMemoryEngineSingleton`), tag it `// WIRE-EXEMPT: <reason>` naming the wrapper.

## MCP DISPATCHERS (primary execution surface)
PRISM exposes every capability as an MCP dispatcher action. Prefer these over inlining logic:
- `prism_calc` (manufacturing physics) • `prism_cam` / `prism_cad` / `prism_turning` / `prism_5axis`
- `prism_ai` (reasoning/deep learning) • `prism_intelligence` • `prism_safety` • `prism_omega`
- `prism_session` • `prism_context` • `prism_dev` (build/quality/inventory) • `prism_memory`
- `prism_orchestrate` / `prism_autopilot_d` / `prism_atcs` for multi-step orchestration

Full map in `DISPATCHER_DIGEST.md`. Every dispatcher has an `action` enum — action list also in tool descriptions.

## MANDATORY SELF-AWARENESS (hooks enforce this automatically)
Every build/create/investigate request auto-fires these gates before your first tool call:
- `inventory-check-guard.mjs` → injects current counts from PRISM-INVENTORY-LATEST.md
- `master-index-search-gate.mjs` → fuzzy search for existing similar assets
- `dedup-auto-invoke.mjs` → silent duplicate check
- `duplication-hard-block.mjs` → **HARD BLOCK** on exact duplicates
- `ai-feature-recommend.mjs` → recommends relevant engines
- `build-create-detector.mjs` → detects create intent

**Before creating ANY engine/algorithm/formula/hook/action:**
```typescript
import { duplicationGuardEngine } from "mcp-server/src/engines/DuplicationGuardEngine.js";
const check = duplicationGuardEngine.checkBeforeCreating({
  assetType: "engine", proposedName: "MyEngine",
  keywords: ["cutting","force"], description: "…"
});
if (!check.shouldProceed) { /* USE existing: check.matches[0] */ }
```
Methods: `mustCheckBeforeCreating()` + `mustNotReExtract()` **THROW** on duplicates — you cannot bypass.

Already-extracted (do NOT re-extract): Mastercam(45), hyperMILL(25), Okuma(63), Fanuc(35), Haas(28), Titans(42). Full log: `mcp-server/data/state/extraction-log.json`. Cross-session registry: `mcp-server/data/state/cross-session-asset-registry.json`.

## CRITICAL SLASH COMMANDS
### Must use proactively (auto-suggest when triggered)
| Command | Trigger |
|---------|---------|
| `/pdf-learn` | PDF, document, manual, catalog, paper |
| `/video-learn` | video, youtube, tutorial, training |
| `/shop-knowledge` | tribal, shop floor, operator wisdom |
| `/dedup` | **BEFORE** any new engine/hook/skill/script |
| `/forge-triple` | new engine + skill + hook together (after /dedup) |

### Machine / optimization / business
`/wire-edm-studio` `/lathe-studio` `/machine-harden` · `/auto-speed-feed` `/program-optimize` `/scrutinize` · `/quote-to-ship` `/smart`

Full manifest: `state/shared/PRISM-COMMANDS-MANIFEST.md`

## TEST SHOP — JM Die Company
Canonical test shop for ALL PRISM development. Full profile + API moved to [`knowledge/wiki/reference/jm-die-profile.md`](knowledge/wiki/reference/jm-die-profile.md) (U-CLEANUP-D4). Profile source: `mcp-server/src/data/jm-die-profile.ts`. Shop config: `ShopConfigurationEngine.ts` (21 machines). Archive: `JM DIE/` (24,545 files, 100+ customers — ITW, Alcoa, Optimas, SFS, Holo-Krome). Direct API: `prismSelfAwarenessEngine.{getJMDieCustomerPath,searchTribalKnowledge,searchPlaybookRules,recommendAIFeatures}` — see wiki entry for signatures.

## WIKI PROTOCOL (Karpathy LLM-Wiki — see `WIKI_SCHEMA.md`)
PRISM has a compounding markdown wiki at `H:/prism/knowledge/wiki/`. **Query it before re-deriving.**
- `wiki/index.md` — 722-entry catalog (575 engines + 90 dispatchers + 57 memories), maintained by `WikiIndexMaintainerEngine`
- `wiki/log.md` — chronological audit (`grep '^## \[' wiki/log.md | tail -10`)
- `wiki/{concepts,entities,decisions,patterns,trajectories,lessons,code-tribal,architecture,software-engineering,ux-design}/`
- **Ollama owns ≥70% of wiki maintenance** (summarize, suggest cross-refs, lint candidates, embed)
- **Claude owns synthesis, contradiction resolution, schema evolution**
- Multi-chat: all wiki writes acquire `prism_context:claim_file` lock; log entries carry `by:claude-{id}` attribution
- Full protocol: `H:/prism/WIKI_SCHEMA.md` (3 layers · 3 ops · 2 index files · frontmatter spec · multi-chat rules · deprecation path)

## CREATIVE REASONING
For complex problems, use cross-domain synthesis:
```typescript
import { prismCreativeReasoningEngine } from "mcp-server/src/engines/PRISMCreativeReasoningEngine.js";
const result = prismCreativeReasoningEngine.explore(problem, "optimal");
// Modes: conventional → exploratory → hybrid → innovative → optimal
```
**15 scientific domains** (control theory, materials science, robotics, ML, precision, etc.) · **120+ formulas/algorithms** (PID, LQR, Kalman, Johnson-Cook, NURBS, S-curve, CNN, K-means, Abbe error). Entry point: `CrossDisciplinaryDeepLearningEngine`.

## SHARED AGENT BRIDGES (Claude ↔ Codex parity)
Full catalog moved to [`knowledge/wiki/coordination/shared-directives-index.md`](knowledge/wiki/coordination/shared-directives-index.md) (U-CLEANUP-D3). Six `CLAUDE-CODEX-*-DIRECTIVE.md` files under `state/shared/` plus 4 live-state files (`AGENT_WORKBOARD.md`, `AGENT_CHAT.md`, `AGENT_COORDINATION_STATUS.md`, `ROADMAP_COLLABORATION_STATE.md`). Read the index when coordination rules matter.

**Freshness rule:** any directive >7 days stale must be re-validated against current code before relying on it. Check via the one-liner in the wiki entry's §Freshness rule.

## BUILD / TEST / CI
```bash
cd mcp-server
npm run build:fast        # esbuild only (~3s) — rapid iteration
npm run build:incremental # tsc incremental + esbuild (~10s)
npm run build             # full tsc + esbuild (~30s) — pre-commit gate
npx vitest run            # all tests
npx vitest run <file>     # specific file
```
CI: `.github/workflows/` (ci.yml, deploy.yml, nightly.yml). Tests: real behavior checks — placeholder asserts are rejected by hook-stack. Workflow/routing changes must parse rendered URLs and assert concrete params.

## SAFETY
- **NEVER inline Kienzle/Taylor/material constants** — import from `mcp-server/src/physics/constants.ts`.
- Canonical kc1.1 per ISO group: P=1800, M=2100, K=1100, N=700, S=2800, H=3200.
- NEVER create stub engines — enforcement hook blocks placeholder returns.
- Always run affected tests after engine modifications (hook suggests which).
- Always check `ENGINE_DIGEST.md` before creating new engines.

## SCHEMA VERSIONING
Every state JSON requires `schemaVersion`. Migrations in `src/migrations/`. Backward compatibility: N-1 versions. Breaking changes → version bump + migration path.

## ROADMAP
The ONLY roadmap is `PRISM-UNIFIED-ROADMAP-v2.md` (v2.1). Ignore everything in `data/docs/roadmap/` and `plans-archive/`. Task queue: `mcp-server/data/roadmap-index.json`. Claim mechanism: `mcp-server/data/claims/<unit>/claim.json` — reap stale claims (>5min no heartbeat) before starting.

## MASTER INDEX + AWARENESS STACK — search-first cuts Grep/Glob/Agent token waste (2026-05-12..13, OBSIDIAN-PRISM-OS-MS0, 6 units shipped)
**Search-first discipline**: before Grep/Glob/Agent, hit the unified index. Auto-injects top-5 hits on every UserPromptSubmit via `master-index-precheck-inject.mjs` (T2); auto-injects 15-line awareness digest on every SessionStart via `awareness-snapshot-inject.mjs` (T2).

| Surface | What | Skill |
|---------|------|-------|
| `MasterIndexEngine.ts` | Singleton, mtime-cached, single-flight. Fuses system-graph (110K nodes, pre-joined w/ wiki+memory) + PRISMSelfAwarenessEngine + BUILD_STATE. | — |
| `prism_session:master_index_query` | Ranked unified search (filter by layer/source/buildClass/min_utilization/min_confidence). | `/master-index` |
| `prism_session:master_index_node_status` | Single-node degree + utilization lookup. | (`/master-index --node`) |
| `prism_session:master_index_utilization_dashboard` | Graph-wide hub/sink/source/orphan/ghost classifier. | `/utilization-dashboard` |
| `scripts/awareness-snapshot.mjs` | 60-line built/utilized/drifted digest → `state/shared/AWARENESS-SNAPSHOT.md`. | `/awareness-snapshot` |
| `scripts/orphan-inventory.mjs` | Built-but-unwired punch list with heuristic dispatcher hints → `state/shared/ORPHAN-INVENTORY.md`. | `/orphan-inventory` |
| `master-index-precheck-inject.mjs` | UserPromptSubmit T2 — auto-injects top-5 hits. | (auto) |
| `awareness-snapshot-inject.mjs` | SessionStart T2 — auto-injects 15-line digest. | (auto) |
| `/deep-search` | Policy: defines search→reason→neural escalation order. | `/deep-search <query>` |

Hit shape: `source`, `confidence` [0,1], `utilization` [0,1] (log-normalized in-degree), `buildClass` (wired/unwired/pending/frontend/unknown), pre-joined wiki+memory entry names. **Answers "is node X fully utilized?"** — high in + high out = hub; low in + low out + has docs = orphan (punch list); low in + low out + no docs = ghost (dead-code candidate).

**Knobs:** `PRISM_MASTER_INDEX_INJECT=0`, `PRISM_MASTER_INDEX_K=N`, `PRISM_AWARENESS_INJECT=0`, `PRISM_AWARENESS_INJECT_STALE_HOURS=N`. Obsidian vault rooted at `H:/prism/knowledge`. Memory: `reference_master_index_surface.md`. Commits: 3cd27c288, 28fccde44, b13f220cd, 0089b2de7, 79b6366fd, aae8e7b64 (this overnight loop, slot alpha).

## MASTER INDEX (legacy section preamble — superseded by table above) (2026-05-12, OBSIDIAN-PRISM-OS-MS0)
**Search-first discipline**: before Grep/Glob/Agent, hit the unified index. Auto-injects top-5 hits on every UserPromptSubmit via `master-index-precheck-inject.mjs` (T2 hook); manual entry via `/master-index <query>` skill or `prism_session:master_index_query` action.

| Surface | What |
|---------|------|
| Engine | `mcp-server/src/engines/MasterIndexEngine.ts` — singleton, mtime-cached, single-flight |
| Actions | `prism_session:master_index_query` (filter by layer/source/buildClass/min_utilization/min_confidence), `prism_session:master_index_node_status` (single-node degree + utilization) |
| Hook | `.claude/hooks/master-index-precheck-inject.mjs` (UserPromptSubmit, T2) — auto-injects top-5; excludes L9/L11 noise + dedups by label |
| Skill | `.claude/commands/master-index.md` (/master-index) |
| Fusion sources | system-graph.json (110K nodes, pre-joined w/ `knowledge.wikiEntries[]` + `knowledge.memoryEntries[]`), PRISMSelfAwarenessEngine.findCapabilities, BUILD_STATE.json |

Each hit carries: `source` (graph_node/engine/action/hook/skill), `confidence` [0,1], `utilization` [0,1] log-normalized in-degree, `buildClass` (wired/unwired/pending/frontend/unknown), pre-joined wiki+memory entry names. **Use this to answer "is node X fully utilized?"** — high in-degree + low out-degree = hub; high out-degree + low in-degree = utility called by few. Knobs: `PRISM_MASTER_INDEX_INJECT=0` disables auto-inject, `PRISM_MASTER_INDEX_K=N` sets top-K (default 5). Obsidian vault rooted at `H:/prism/knowledge` (wiki/ + memories/).

## RTK (Bash token reduction — already installed)
`rtk.exe` wraps ~100 commands (git/gh/npm/vitest/tsc/docker/grep/cat) and strips redundant output. Hook wired in `H:/.claude/settings.json`. Wins: `npm run build` ~80% reduction, `vitest run` ~70%, `gh pr diff` ~60%. Prefix `command` to bypass (e.g. `command git status` for raw). Skill: `/rtk-setup`.

## GOAL-COMPLETE GATE — `/goal` requires fresh close-out audit (2026-05-13)
User directive: *"add the closeout-audit slash command to the /goal slash command so the task cant be considered /goal complete until the audit is ran"*. `/goal` is Anthropic's built-in slash command — we don't override it, we GATE it.

The Stop hook `.claude/hooks/goal-complete-gate.mjs` (Tier-0, wired first in the Stop chain) fires on every session stop. Logic:
1. Read the session transcript's last 256 KB — scan for `<command-name>/goal</command-name>` markers.
2. If `/goal` was NOT invoked this session → approve immediately (fast path; most chats never hit it).
3. If `/goal` WAS invoked:
   - `state/shared/CLOSE-OUT-CANDIDATES.json` must exist AND be ≤2h old (mtime). Stale → BLOCK with instruction to run `/close-out-audit`.
   - Every surfaced candidate `unit_id` must appear in (a) one of the last 30 commit message bodies OR (b) `state/shared/CLOSE-OUT-DEFERRED.md`. Untriaged candidates → BLOCK with a per-unit punch list.
   - All triaged → approve.

**Knobs:** `PRISM_GOAL_GATE_DISABLE=1` (off entirely), `PRISM_GOAL_GATE_STALE_HRS=N` (default 2), `PRISM_GOAL_GATE_AUDIT_BYPASS=1` (one-shot bypass, logged to `state/shared/goal-gate-bypasses.jsonl`). The bypass is auditable — every override is a data point.

**Why a Stop hook (not a skill):** `/goal` is built-in, so we can't intercept the command itself. The Stop hook is the *only* universal choke point that fires no matter how the session ends. Triage via commit body OR explicit deferral list — never silent skip.

## CLOSE-OUT AUTOMATION — find silent close-out debt (2026-05-13, demo: COORD-MS0)
The 2026-05-12 history-strip left 668 milestone envelopes untracked and most unit statuses at `pending` even when the deliverable artifacts (engines, hooks, skills) actually ship in the repo. This produces **silent close-out debt** — work that's done but `MILESTONE_PROGRESS` / `BUILD_STATE` / `roadmap-index` don't know it. The audit detects + surfaces candidates so an operator (or chat) closes them properly. **Advisory only — never auto-flips envelope status.**

| Surface | What |
|---------|------|
| Script | `scripts/audit-close-out-candidates.mjs` — scans 670 envelopes; extracts path tokens (4 regexes); resolves against ~25 SEARCH_ROOTS with bounded recursion (depth 2); confidence = resolvedCredit / verifiable (resolved=1.0, hybrid file+abstract=0.5, abstract=excluded, missing=0); default min-confidence 0.75 |
| Skill | `.claude/commands/close-out-audit.md` (`/close-out-audit`) — keyword trigger: close out · envelope drift · stale milestones · shipped but pending · what's done |
| Hook | `.claude/hooks/close-out-audit-suggest.mjs` — UserPromptSubmit T2 advisory; surfaces top-3 candidates + staleness when keywords match; never blocks |
| Wiki | `knowledge/wiki/architecture/close-out-audit.md` — architecture diagram + safety properties + cron path |
| Memory | `feedback_auto_close_out.md` — standing rule + 4-step apply protocol |
| Reports | `state/shared/CLOSE-OUT-CANDIDATES.{json,md}` — JSON has `advisoryOnly:true` + `mustHumanVerify:true` + `caveat` |

**When to fire:** before `/pick-unit`, during own-unit close-out (inspect sibling units in same milestone), on `/checkin` drift > 0, on user keywords. **Always human-verify before flipping** — file presence ≠ spec correctness. Close-out protocol per [[feedback_roadmap_close_out]] (envelope + MILESTONE_PROGRESS + BUILD_STATE + roadmap-index + chat-bus). **Knobs:** `PRISM_CLOSE_OUT_AUDIT_INJECT=0` (disable hook), `PRISM_CLOSE_OUT_AUDIT_STALE_HRS=N` (default 24), `PRISM_CLOSE_OUT_AUDIT_K=N` (top-K, default 3), `--frozen-time` / `PRISM_AUDIT_FROZEN_TIME` (diff-friendly output). First demo: closed U-COORD03 + U-COORD10 in COORD-MS0 (this session, slot BRAVO).

## DEV-VELOCITY-AUTOTRIGGER-MS0 (2026-05-12..13, 13 units shipped)
> Doctrine + artifact map. Section body auto-regenerated by `scripts/regen-claude-md-sections.mjs` — do NOT edit between markers.

<!-- AUTO-GEN: dev-velocity-autotrigger START -->
**Milestone:** `DEV-VELOCITY-AUTOTRIGGER-MS0` (13 units shipped 2026-05-12..13)

**11 new skills** (all in `.claude/commands/*.md`):
- /scrutiny-batch
- /quick-archive
- /encoding-guard (hook+skill)
- /big-blob-hunt
- /skill-recall-tune
- /dispatcher-coverage
- /peer-file-isolation
- /staged-sanity
- /scrutiny-replay
- /envelope-drift-fix
- /wire-unwired

**Hook changes:**
- skill-auto-trigger.mjs (UserPromptSubmit T2 — Phase D.2)
- git-lock-sweeper.mjs PreToolUse arm (Phase C.2 extension)
- mcp-route-suggest.mjs smarter classifier (Phase C.1)

**Scripts:**
- extract-skill-triggers.mjs (Phase D.3 — feeds D.2 hook)
- regen-claude-md-sections.mjs (Phase D.4 — this script)

**Auto-trigger orchestrator:** `skill-auto-trigger.mjs` reads `knowledge/wiki/architecture/_skill-triggers.jsonl` (regenerated by `extract-skill-triggers.mjs`) and surfaces top-K (default 3) skill suggestions per UserPromptSubmit. Pure suggest-only. Knob: `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1`.

**Pipeline integrations** (per-skill `pipeline_integrations:` frontmatter): forge/forge-audit/rgs/roadmap/close-out — see each skill's manifest for trigger phase.

**Plan:** `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` (full P0-P13 detail).
<!-- AUTO-GEN: dev-velocity-autotrigger END -->

### Auto-trigger ledger status
<!-- AUTO-GEN: skill-auto-trigger-status START -->
**Trigger ledger:** `knowledge/wiki/architecture/_skill-triggers.jsonl`
**Triggers registered:** 10     **Last regen:** 2026-05-13T12:37:27.109Z
**Regenerate:** `node scripts/extract-skill-triggers.mjs`
**Consumed by:** `.claude/hooks/skill-auto-trigger.mjs` (UserPromptSubmit T2)
<!-- AUTO-GEN: skill-auto-trigger-status END -->

<!-- AUTO-WEDM-START -->
## WEDM AGI Status (auto-generated by `wedm_generate_digest.ts`)

- **Engines**: 62 WEDM engines (`src/engines/WEDM*.ts`) — verified 2026-04-22 via MS-P0-V U-P0-V01
- **Tests**: 101 WEDM/EDM test files (`src/__tests__/*wedm*|*edm*.test.ts`)
- **Skills**: 23 WEDM skills (`~/.claude/commands/wedm-*.md`) — verified against WEDM_DIGEST.json
- **Hooks**: 2 dedicated WEDM hook files (132 files reference WEDM across hook codebase)
- **State Files**: 11 WEDM state files (5 JSON + 6 JSONL in `data/state/WEDM_*.json|jsonl`)
- **Dispatcher Actions**: 36 WEDM/EDM references in camDispatcher.ts
- **Controller Dialects**: 5 (Mitsubishi, Sodick, Makino, AgieCharmilles, Fanuc)
- **MIT Courses**: 5 courses integrated (2.008, 2.830, 2.813, 18.06, 6.S191)
- **Tribal Tips**: 46 WEDM tips (20 field + 26 MIT-derived)
- **Formulas**: 14 WEDM formulas with MIT citations
- **JM Die Programs**: 26 indexed (full harvest pending zip extraction)
- **SVI Psi**: 0.875 / 1.0 target
- **Last verified**: 2026-04-22 (MS-P0-V U-P0-V01/V02)
<!-- AUTO-WEDM-END -->


## OLLAMA OFFLOAD DASHBOARD (P0-U03)
Local LLM offload telemetry lives in `mcp-server/data/state/ollama-offload-stats.json` (schemaVersion 2.0.0). Read it with:

```bash
node scripts/ollama-offload-dashboard.mjs           # human-readable
node scripts/ollama-offload-dashboard.mjs --json    # machine-readable
node scripts/ollama-offload-dashboard.mjs --window=48h  # custom window (max 168h)
node scripts/ollama-offload-dashboard.mjs --reset   # zero counters + clear events
```

Sections:
- **Totals (since reset)** — cumulative offloaded / kept-on-Claude / tokens saved.
- **Last 24h activity** — rolling event log filtered by --window.
- **Per-hook fire counts** — which hook fired, decision (offload/keep/suggest), tokensSaved.
- **Advisory** — actionable warnings (zero offloads, zero events, etc).

A healthy installation should show `offload rate ≥ 30%` after a session of mixed work. `offloaded=0, keptOnClaude>0` means the offloader is classifying tasks but Ollama is unreachable or rate-limited — check `http://127.0.0.1:11434/api/tags` and the rate-limit file at `.claude/cache/ollama-rate-limit.json`.

## ONE-GLANCE CHECKLIST (every new task)
1. Read HANDOFF for this chat via per-agent-handoff.mjs `read`
2. If building/auditing/investigating → hooks auto-inject inventory + duplicate guards
3. Check `PRISM-INVENTORY-LATEST.md` if you need counts
4. Use MCP dispatcher actions before reinventing logic
5. Obey shared directives for coordination (6 chats running)
6. Finish current delivery before starting next roadmap pass (per ROADMAP_COLLABORATION_STATE.md gate)
7. On session end → `/handoff` writes to per-chat file; `/compact` also wires this automatically
