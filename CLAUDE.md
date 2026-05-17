# PRISM — Manufacturing Intelligence Platform

## EXPERT ROLE (ALWAYS ACTIVE)
<!-- DUPLICATE-CANDIDATE 2026-05-17 OBSOLESCENCE-CLEANUP-MS0/U-OBS-C2: parallel section in C:/Users/wompu/.claude/CLAUDE.md §EXPERT ROLE. Proposed canonical owner: GLOBAL. Collapse this body to pointer after 2026-05-24. Advisory: state/shared/specs/CLAUDE-MD-DUPLICATION-CANDIDATES-2026-05-17.md -->
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
1. **Run the script** against the session diff (emits THREE Claude-reviewer prompts; no external CLI is spawned):
   ```bash
   node .claude/scripts/scrutiny-3way.mjs --session-id <id-from-block-message>
   # or: --target HEAD (last commit) | --target <sha> (specific commit)
   ```
   It emits three reviewer prompts in the JSON output: `opusReviewerPrompt` (arm A), `opusReviewerPromptB` (arm B), `analystReviewerPrompt` (arm C). (The diff is captured with a 120 s git timeout — was 8 s, which timed out on this repo — and excludes auto-regenerated noise dirs; `PRISM_SCRUTINY_GIT_TIMEOUT_MS` / `PRISM_SCRUTINY_NO_DIFF_FILTER=1` override.) An optional Ollama pre-flight (deepseek-r1:14b) runs as an advisory arm only — does NOT block the 3-of-3.
2. **Dispatch ALL THREE Claude PRISM agents in parallel** in one tool block (single message, three parallel tool calls):
   ```js
   Agent({ subagent_type: 'reviewer',      description: 'Review session diff (3way reviewer A)',                 prompt: <opusReviewerPrompt> })
   Agent({ subagent_type: 'reviewer',      description: 'Review session diff (3way reviewer B — independent)',   prompt: <opusReviewerPromptB> })
   Agent({ subagent_type: 'code-analyzer', description: 'Review session diff (3way reviewer C — analyst)',       prompt: <analystReviewerPrompt> })
   ```
   Arm B is weighted toward test integrity / dispatcher-wiring completeness / inlined-constant detection (does NOT assume arm A caught everything). Arm C is weighted toward silent breakage / regression risk / I/O security / error-budget completeness / integration coupling (does NOT assume A or B caught everything).
3. **Record all three verdicts** when the agents return (use `fail` instead of `pass` for any FAIL — the gate keeps blocking until arms A + B + C are all PASS):
   ```bash
   node .claude/scripts/scrutiny-3way.mjs --mark-opus    pass --session-id <id> --notes "<reviewer A summary>"
   node .claude/scripts/scrutiny-3way.mjs --mark-claude  pass --session-id <id> --notes "<reviewer B summary>"
   node .claude/scripts/scrutiny-3way.mjs --mark-analyst pass --session-id <id> --notes "<reviewer C summary>"
   # --mark-claude  is the arm-B mark; --mark-opus-b / --mark-gemini are accepted aliases.
   # --mark-analyst is the arm-C mark; --mark-codex is accepted as a legacy alias.
   ```

The hook is in `MINIMAL_ALLOWLIST` so `PRISM_HOOK_PROFILE` cannot disable it. After 3 block attempts the gate auto-passes with a warning (escape hatch). Ledger lives at `mcp-server/data/state/SCRUTINY_LEDGER.json` keyed by session id; arm A is stored as `opusReviewed`, arm B as `claudeReviewed` (legacy `geminiReviewed` / transitional `opusBReviewed` flags accepted as aliases), and arm C as `codexReviewed` (the slot keeps its pre-2026-05-13 name for backward compat with existing ledger entries — the *invocation* is now a Claude `code-analyzer` agent, not Codex). Legacy `selfReviewed && agentReviewed` entries (pre-3way) still clear via backward-compat fallback in `scrutiny-ledger.mjs:isCleared()`.

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

### Lane discipline + conflict-fork rule (2026-04-28 — superseded 2026-05-15 by slot-worktree model)
Each chat **stays in its own slot worktree** — the per-NATO-name model shipped in `SLOT-WORKTREE-MS0` and activated 2026-05-16 (12 slot worktrees `H:/prism-slot-<name>` on `slot/<name>` branches; golf = integrator). Full architecture: [`state/shared/SLOT-WORKTREE-ARCHITECTURE.md`](state/shared/SLOT-WORKTREE-ARCHITECTURE.md). Enforcement: 3 default-on hooks (`worktree-commit-route` + `git-add-lane-guard` + `main-tree-write-block`) arm per-chat once `chat-slots.json[slot].branch` starts with `slot/`. Migration: `/checkin` Step 2c cutover, gradual per-chat. Memory: [[reference_slot_worktree_activation_2026_05_16]] · [[reference_slot_worktree_ms0_p3_cutover_complete]].

**Conflict-fork rule (when you can't migrate):** if a routing hook blocks your commit while you're still in the shared `H:/prism` tree AND another chat owns the files, do NOT fight for the same tree. The slot-worktree migration via `/checkin-<slot>` is the canonical fix. As a one-off fallback: `git worktree add ../prism-<scope> -b work/<scope>` keeps milestones independently mergeable. Memory: [[feedback_conflict_fork_rule]].

### PER-SLOT WRAPPERS (2026-05-16, AUDIT-SYNERGY-MS0)
39 slash-command wrappers `/{precompact,handoff,startup}-<slot>` × 13 NATO slots (alpha..mike) mirror the existing `/checkin-<slot>` pattern: force-take slot → bind topic `<slot>-work` → delegate to canonical `/precompact`, `/handoff`, or `/startup` pipeline. Each wrapper is ~30 lines, generated from a single template by `scripts/generate-per-slot-wrappers.mjs` (idempotent — re-runnable safely). Use when a chat-slot binding must be explicit (different terminal window, post-/compact drift, force-take from a dead peer). The wrappers are thin — the canonical pipeline body lives in the bare slash command. Slot 13 (`mike`) added 2026-05-16 per operator directive "add a 13th chat slot, update everything that needs to update to intake a 13th chat".

### HTML-FOR-MD (2026-05-16, AUDIT-SYNERGY-MS0)
`mdToHtml(filePath, opts)` exported from [`scripts/lib/html-report-render.mjs`](scripts/lib/html-report-render.mjs) renders any markdown source (MEMORY.md, CLAUDE.md, handoffs, wiki leaves) as a standalone HTML5 page using the existing PRISM dark-theme renderer. CLI: `node H:/prism/scripts/md-to-html.mjs <input.md> [--out <out.html>] [--toc] [--title "..."]`. Minimal parser (headings/lists/tables/code-fences/links/blockquote/bold/italic/inline-code), silent-fail on read error, javascript: URI XSS guard. Tests: `scripts/lib/md-to-html.test.mjs` (16 cases via node:test).

### PER-SLOT-CLAIM-MS0 (2026-05-16 — 6/6 shipped) — per-slot UNIT claims
Lane assignment in `atomic-roadmap.json` is *advisory*; this milestone adds enforceable per-slot unit locks so two slots never race-build the same `MILESTONE::U-ID`. Store: `state/shared/slot-task-claims.json` (lockfile-guarded atomic RMW — NOT the H8 SQLite, which won't resolve from `.claude/helpers/`). CLI: `node H:/prism/.claude/helpers/slot-task-claim.mjs {claim|release|heartbeat|list|check|sweep}`. `/pick-unit --slot S --chatId C` filters peer-claimed units (identity-gated — no `--chatId` = legacy no-filter behavior). `/checkin` Step 12 autonomous loop claims-on-pick + heartbeats-on-tick; the `.git/hooks/post-commit` U-PSC04 block auto-releases on `[SCOPE]/U-ID` commit subject. Stop hook `stop-slot-task-claims-advisory.mjs` (wired Stop[0].hooks[12]) surfaces held claims at session end. Forward-only phase (claimed→building→testing→committing); corrupt/schema-mismatch store → readOnly refuse-write (never silently clobbers a peer). Knobs: `PRISM_SLOT_TASK_ADVISORY_{DISABLE,VERBOSE,THROTTLE_MS}` (the documented `PRISM_SLOT_TASK_CLAIM_DISABLE=1` knob was never implemented in `slot-task-claim.mjs` — removed 2026-05-17 by OBSOLESCENCE-CLEANUP-MS0/U-OBS-C1 to prevent operators relying on a no-op). 64 tests (41 unit + 5 concurrent-race E2E + 10 post-commit + 8 advisory). Memory: [[reference_per_slot_claim_ms0_2026_05_16]]. Wiki: [`knowledge/wiki/architecture/per-slot-claim-ms0.md`](knowledge/wiki/architecture/per-slot-claim-ms0.md).

**HOOK-SYNERGY-MS0 (11 units shipped 2026-05-12..13)** — cross-worktree firewall, hook creation gate, settings dedup audit, hook registry reader, latency envelope, tier frontmatter, hook compression / shared duplication-guard, SQLite WAL coordination store, async hook dispatcher, IPC for hook queries, fast-lane matcher split. Full details + dispatcher actions + knobs at [`knowledge/wiki/architecture/hook-synergy-ms0.md`](knowledge/wiki/architecture/hook-synergy-ms0.md) (U-CLEANUP-D1). Memory: [[reference_h7_async_hook_dispatcher]], [[reference_h8_coordination_store]], [[reference_u_coord11_ipc]].

## SESSION CONTINUITY STACK (2026-05-15 — terminal-pin + auto-resume + compact-boundary fix + auto-precompact)
Four pieces shipped to make /compact + new-chat-in-same-window seamless across the up-to-10-chat fleet:

1. **`precompact-auto-trigger.mjs` compact-boundary fix** — the byte-estimate fallback was dividing the entire transcript file size by 3.5, which after one /compact reported pre-compact bloat as current-context tokens (false-positive 1.43M-token block immediately after a successful compact, observed 2026-05-15 session 6eac1b66). The fix: new `findLastCompactOffset()` scans the tail for `"isCompactSummary":true` and only the bytes AFTER that boundary feed the estimate. Sanity floor tightened 1.5× → 1.1× cap.
2. **`session-start-auto-resume.mjs`** (T0, SessionStart matcher `compact`) — reads the per-chat handoff for this session's stable id, extracts `## RESUME`, injects as `additionalContext` so the post-/compact chat anchors to its prior exit-state without the user typing "continue". Stale handoffs (>240m, knob `PRISM_AUTO_RESUME_MAX_AGE_MIN`) surface a hint instead of resuming. Disable: `PRISM_AUTO_RESUME_DISABLE=1`.
3. **`session-start-terminal-pin.mjs`** (T1, SessionStart all events) + **`terminal-window-id.mjs`** helper + **chat-slots schema v2** — slot ↔ PowerShell-window binding via stable `terminalWindowId`. When the same window spawns a new chat (via /compact, /clear, fresh `claude` invocation), chat-slots finds the slot whose `terminalWindowId` matches and inherits it — never claims a new slot. **10 PowerShell windows → 10 deterministic slot bindings.** Disable: `PRISM_TERMINAL_PIN_DISABLE=1`. Verbose: `PRISM_TERMINAL_PIN_VERBOSE=1`.

**`terminal-window-id.mjs` resolver hardening (2026-05-15, commit 5c4778b59):** the original 3-tier resolver (`WT_SESSION` → wmic ancestor → bare ppid) silently degraded when wmic flaked once on Win11 — producing 3 different IDs for the same window, defeating slot-pinning. Fixed: **tier-0 cache** keyed on sessionId + **never-downgrade rule** (`tw-wt(4) > tw-ps(3) > tw-pa(2) > tw-pp(1)`) + **PowerShell `Get-CimInstance`** replacing deprecated wmic + new tier-3 `tw-pa` (first non-shell-child ancestor → reaches stable claude.exe). Knobs: `PRISM_TWID_CACHE_FILE`, `PRISM_TWID_CACHE_DISABLE`, `PRISM_TWID_TIMEOUT_MS`. See [[reference_twid_resolver_cache_2026_05_15]].

**`terminal-window-id.mjs` cache-hit auto-upgrade (2026-05-15, commit 9e67e2cde + follow-up):** closes Reviewer B P2 on 59465d7c2 — the never-downgrade rule's write-side compare was unreachable on cache hit, so a session that first resolved to a degraded tier (wmic flaked) would freeze at tier 1 forever. Fix: throttled auto-upgrade probe on cache-hit when `cachedTier < MAX_TIER` AND `(now - lastProbeAt) >= AUTOUPGRADE_THROTTLE_MS`. If fresh tier higher, replace cache entry (`upgradedFrom` chained as array preserving multi-step lineage). Cache schema extended back-compat: `lastProbeAt` (string ISO) + `upgradedFrom` (string in legacy, array in current — resolver auto-migrates). Knobs: `PRISM_TWID_AUTOUPGRADE_DISABLE=1`, `PRISM_TWID_AUTOUPGRADE_THROTTLE_MS=N` (default 30000, hard floor 1000ms to prevent probe-storm DoS, read at call-time so per-call overrides take effect). See [[reference_twid_cache_hit_autoupgrade_2026_05_15]].

4. **`/compact` auto-generates the precompact handoff (2026-05-15, commit 5c4778b59).** The 2026-05-06 handoff-writer ban ([[feedback_handoff_writers]]) meant a chat that ran `/compact` *without* manually running `/precompact` got no real RESUME. Now `precompact-handoff.mjs` (PreCompact hook) synthesizes a RESUME via `generateSmartResume()` and writes it through a NEW strictly-gated `--source precompact-hook` in `per-agent-handoff.mjs`: resume must be ≥30 chars + non-placeholder, and a fresh live-chat RESUME (<5min) always wins anti-clobber. Handoff topic is slot-prefixed (`<slot>-<topic>`, coincides with `/checkin` slot binding) and padded to a deterministic size via `padFileToBytes()` (`PRISM_PRECOMPACT_HANDOFF_PAD_BYTES`, default 4096; HTML-comment block, invisible to markdown + RESUME extractor; `PRISM_PRECOMPACT_HANDOFF_PAD_DISABLE=1` to skip). The ban is NOT lifted — `precompact-hook` is a strict exception, not a general grant. **Do not disable Claude CLI autocompact entirely** — cap `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` at 95-98; hitting the 1M wall with no autocompact kills the session. See [[reference_precompact_hook_autowrite_2026_05_15]].

**Cross-tree commit-collision advisory (2026-05-15, wired commit 5c4778b59 follow-up):** `stop-cross-tree-collision-advisory.mjs` (T3 Stop hook) — NOW WIRED at Stop[7]/36 in both `C:\Users\<user>\.claude\settings.json` and `H:\.claude\settings.json` (timeout 3000ms) per the Stop advisory wiring cluster pattern (between `session-end-peer-share` and `duplication-guard-stop`). Fires once per 4h when a chat is in the shared `H:/prism` main tree with critical files dirty AND a sibling worktree matches its topic — emits a migration hint. Lighter touch than `worktree-commit-route.mjs` (default-OFF, opt-in via `PRISM_WORKTREE_ROUTE_ENABLE=1`). Knob: `PRISM_CROSS_TREE_ADVISORY_DISABLE=1`. See [[reference_stop_advisory_wiring_cluster_2026_05_15]].

**Per-subagent master-index + tribal pre-search (2026-05-15, commit d7797a6e7):** every spawned subagent (Agent-tool spawn) now receives TWO fresh keyword-search blocks in its context bundle — `## 🧭 Master-index pre-search for THIS subagent's task` (top-K hits from `system-graph.json` matching the subagent's prompt) AND `## 🧠 Relevant tribal knowledge for THIS subagent's task` (top-K hits from `tribal-embed-index.json`, with `subagentType`→tribal-domain inferred for boost — `physics-reviewer`→mill, `lathe-*`→lathe, `wedm-*`→wedm, `cad-*`→cad, `cam-*`→cam). Backed by new shared lib `scripts/lib/master-index-search-lib.mjs` (320 LOC, 34 tests, `node --test` passing; same BM25-lite weights as the parent's `master-index-precheck-inject.mjs` which now also imports the lib — refactored 259→110 LOC, behavior preserved). **Sync-to-system-viz:** the lib reads `state/shared/system-viz/system-graph.json` via mtime cache; when peers regenerate the graph (e.g., SYSTEM-VIZ-FS-COVERAGE-MS0 expanding L12 filesystem leaves), the next subagent spawn picks up the new nodes automatically — no manual refresh required. Both consumer hooks (`subagent-start-context.mjs` SubagentStart matcher `*`, `master-index-precheck-inject.mjs` UserPromptSubmit) were already wired before this commit — settings.json untouched. Knobs: `PRISM_MASTER_INDEX_INJECT=0`, `PRISM_MASTER_INDEX_K=N` (existing, unchanged). See [[reference_subagent_per_task_presearch_2026_05_15]].

**Fleet-design directive (2026-05-15, user):** every slot-aware design must accommodate **up to 13 concurrent chats** (expanded 2026-05-16 from 10 → 12 → 13: added `kilo` + `lima` mid-day, then `mike` later same day; additive forward-compat throughout, schemaVersion intentionally NOT bumped to avoid disrupting active peers). Current 13: alpha..foxtrot + golf (historically-hygiene; usable as work slot via `/checkin-golf` after bypassing `golf-slot-write-allowlist`) + hotel..mike. All new code reads `SLOT_NAMES` from `chat-slots.mjs` — never hard-code count.

**Doc reflection rule (2026-05-15, user):** every change-set updates ALL FOUR doc surfaces in the same session — CLAUDE.md + MEMORY.md + wiki + Obsidian memories. See [[feedback_reflect_all_changes_post_update]].

**Autonomous loop (2026-05-16):** `/checkin <loop-keyword>` (`/loop`, `autopilot`, `continuous`, `until complete`, `keep going`) engages `checkin.md` Step 12 — the `/autopilot-full` + `/yolo-mode` doctrine rolled into the slot system: pick unit → build (per-file scrutiny) → commit → `loop-state.mjs` tick → repeat, zero-questions, no implicit unit caps. It **resumes itself across every `/compact`** via the new Step 2b loop-resume detection (an active `running` loop-state resumes regardless of args — the post-compact auto-fired `/checkin` carries no keyword). Keyword-gated: a bare `/checkin` is unchanged; `--no-loop` is the off-switch. The 12 `checkin-<slot>` NATO wrappers inherit it. Detail: wiki [[checkin]].

Wiki: [`knowledge/wiki/architecture/session-continuity-stack.md`](knowledge/wiki/architecture/session-continuity-stack.md) · [`knowledge/wiki/architecture/subagent-per-task-presearch.md`](knowledge/wiki/architecture/subagent-per-task-presearch.md). Memory: [[feedback_fleet_design_10_chats]] · [[feedback_reflect_all_changes_post_update]] · [[reference_session_continuity_stack_2026_05_15]] · [[reference_subagent_per_task_presearch_2026_05_15]].

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

**Bug-finding → wiki gate (2026-05-17, lima 77971357 — commit `bb198d9285`):** `.claude/hooks/stop-bug-finding-wiki-gate.mjs` (T3 Stop advisory, wired Stop[0].hooks[19] in both `C:\Users\<u>\.claude\settings.json` + auto-mirrored to H:). Detects bug findings shipped this session via three signals — CLAUDE.md `## Recent regressions` delta, new `feedback_*.md`/`reference_*_(bug|regression|fix)_*.md` memory files, and commit-subject keywords (`[fix]`, `regression`, `silent`, `corruption`, `R12`, `BLOCK`, `FAILLOUD`, `fail-loud`, `rot`) — then verifies a companion wiki entry exists under `knowledge/wiki/{lessons,code-tribal,architecture}/`. Missing → advisory `systemMessage` reminder pointing at [[feedback_always_update_wiki_on_bug_finding]] doctrine. NOT a block (per-file scrutiny + 3-of-3 stay in front). Knobs: `PRISM_BUG_FINDING_WIKI_GATE_{DISABLE,HORIZON,MAX_LIST}`. Wiki: [`knowledge/wiki/lessons/bug-findings-wiki-gate.md`]. Memory: [[feedback_always_update_wiki_on_bug_finding]].

- 2026-05-17 | **wiki entry + patch-sibling for CLAUDE.md/MEMORY.md (peer-locked)** | observed-in: 8391f3d28 | fix: see commit | verify: `git -C H:/prism show 8391f3d28`
- 2026-05-17 | **wire consolidated open-threads into post-/compact resume-read path** | observed-in: 182df1aa3 | fix: see commit | verify: `git -C H:/prism show 182df1aa3`
- 2026-05-17 | **MaterialEntry->context adapter + 3 canonical ISO tables (-13)** | observed-in: 4eb6ce33b | fix: see commit | verify: `git -C H:/prism show 4eb6ce33b`
- 2026-05-17 | **4-surface reflection + P0 regression log** | observed-in: a6abf2704 | fix: see commit | verify: `git -C H:/prism show a6abf2704`
- 2026-05-17 | **bump CANONICAL_MATERIAL_DB count test 13->15 (scrutiny arm-C blocker)** | observed-in: f24d9a3c0 | fix: see commit | verify: `git -C H:/prism show f24d9a3c0`
- 2026-05-17 | **correct cutover spec (3-of-3 arm-A R12 fix)** | observed-in: 3177ae823 | fix: see commit | verify: `git -C H:/prism show 3177ae823`
- 2026-05-17 | **WireEDMSettingsEngine wiring-gate test + 2 real bug fixes** | observed-in: 56f90ae99 | fix: see commit | verify: `git -C H:/prism show 56f90ae99`
- 2026-05-17 | **doc-reflection for U-SDF19 heartbeat-cache wire** | observed-in: 16096eabe | fix: see commit | verify: `git -C H:/prism show 16096eabe`
- 2026-05-17 | **extend C0-strip to $p.Name (closes enum-blind regression class)** | observed-in: ac9cca890 | fix: see commit | verify: `git -C H:/prism show ac9cca890`
- 2026-05-17 | **backfill CLAUDE.md regression block for U-SDF13 + U-SDF15** | observed-in: 1904c4cf7 | fix: see commit | verify: `git -C H:/prism show 1904c4cf7`
- 2026-05-17 | **sticky chatId→slot history cache (closes /compact slot-drift regression)** | observed-in: 590b565fb | fix: see commit | verify: `git -C H:/prism show 590b565fb`
- 2026-05-17 | **derive slot-identity-cache default dir from PRISM_ROOT env var** | observed-in: 72e768371 | fix: see commit | verify: `git -C H:/prism show 72e768371`
- 2026-05-17 | **doc-reflection — wiki entry for slot-identity-cache (+ Obsidian memory file)** | observed-in: ce0d9f994 | fix: see commit | verify: `git -C H:/prism show ce0d9f994`
- 2026-05-17 | **cross-reference CLOSE-OUT-DEFERRED in /goal pre-flight injector** | observed-in: bc11938c6 | fix: see commit | verify: `git -C H:/prism show bc11938c6`
- 2026-05-17 | **fail-loud stderr log on slot-identity-cache persist failure** | observed-in: 9ea2f9dcf | fix: see commit | verify: `git -C H:/prism show 9ea2f9dcf`
- 2026-05-17 | **wire slot-identity cache into heartbeat() — pre-SDF13/heartbeat-only chats never got a cache file (3/8 live peers drifting)** | observed-in: 9f47f18ca9 | fix: see commit | verify: `git -C H:/prism show 9f47f18ca9`
- 2026-05-17 | **restore EDM_PHYSICS.kunieda volumetric-efficiency block (-10 TS2339)** | observed-in: 36671c740 | fix: see commit | verify: `git -C H:/prism show 36671c740`
- 2026-05-17 | **unknown-bridge for 10 WEDM safety-gate engine calls (-10 TS2345)** | observed-in: 86a06e8e3 | fix: see commit | verify: `git -C H:/prism show 86a06e8e3`
- 2026-05-17 | **v1.2 same-day fix detection** | observed-in: 2e5dd1397 | fix: see commit | verify: `git -C H:/prism show 2e5dd1397`
- 2026-05-17 | **align mlDispatcher with engine input schemas (-7 errors)** | observed-in: 944aa77a3 | fix: see commit | verify: `git -C H:/prism show 944aa77a3`
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

## KNOWLEDGE VAULT — 5-namespace schema (U-VAULT01, 2026-05-15)
PRISM's knowledge lives in 5 namespaces — `memory` (cross-session feedback/reference) + `wiki` (project-lifetime architecture) + `commands` (skills) + `handoffs` (inter-session) + `specs` (audits/plans). CLAUDE.md is the **doctrine pointer index**, NOT a 6th namespace — ≤200 lines of dense pointers, drill into wiki for detail. Promotion path: fleeting → memory → wiki → CLAUDE.md pointer. Back-flow path: regression → `## Recent regressions` (auto by U-VAULT03 hook — pending). Command frontmatter validated by `.claude/schemas/command-frontmatter.schema.json` (U-CK06; baseline today 33/167 valid). Full schema doc: [`knowledge/wiki/architecture/knowledge-vault-schema.md`](knowledge/wiki/architecture/knowledge-vault-schema.md).

- 2026-05-17 | **rate-limit doctrine reminder (~50 fires/session -> 1)** | observed-in: 6409714df | fix: see commit | verify: `git -C H:/prism show 6409714df`
- 2026-05-17 | **strip comments+strings+dates before magic-number scan** | observed-in: 5d02ecb50 | fix: see commit | verify: `git -C H:/prism show 5d02ecb50`
- 2026-05-17 | **lower inject threshold + rate-limit** | observed-in: b459870a2 | fix: see commit | verify: `git -C H:/prism show b459870a2`
- 2026-05-16 | **handoff-driven slot pinning (closes bravo->delta drift)** | observed-in: d7631452b | fix: see commit | verify: `git -C H:/prism show d7631452b`
- 2026-05-16 | **prototype-form ReturnType + generateProgram rename (-6)** | observed-in: 623022ca5 | fix: see commit | verify: `git -C H:/prism show 623022ca5`
- 2026-05-16 | **z.input<> for generate+predictCount param types (-8)** | observed-in: 97edb4179 | fix: see commit | verify: `git -C H:/prism show 97edb4179`
- 2026-05-16 | **[MAIN] [TSC-FIX]/routes/milling: return next(e) consistency + merge enrichSpeedFeed 3rd arg (-7)** | observed-in: 683a255d5 | fix: see commit | verify: `git -C H:/prism show 683a255d5`
- 2026-05-16 | **3 wiring-gate test suites (36/36 PASS)** | observed-in: 964454db9 | fix: see commit | verify: `git -C H:/prism show 964454db9`
- 2026-05-16 | **1199: taylorLife 3-arg + preserve coating multiplier (-1)** | observed-in: 711713029 | fix: see commit | verify: `git -C H:/prism show 711713029`
- 2026-05-16 | **2802: direct import of CostSavingsTrackerEngine (-1)** | observed-in: 33245533f | fix: see commit | verify: `git -C H:/prism show 33245533f`
- 2026-05-16 | **2721: drop stale 2nd arg to slimResponse (-1)** | observed-in: 6b768b29f | fix: see commit | verify: `git -C H:/prism show 6b768b29f`
- 2026-05-16 | **4 discriminated-union narrowings (-5)** | observed-in: ce873f7e2 | fix: see commit | verify: `git -C H:/prism show ce873f7e2`
- 2026-05-16 | **824: explicit discriminant narrowing on broadcast result (-2)** | observed-in: f1681107c | fix: see commit | verify: `git -C H:/prism show f1681107c`
- 2026-05-16 | **1180: unknown-bridge for LatheOptimizationConstraints (-1)** | observed-in: f28fce374 | fix: see commit | verify: `git -C H:/prism show f28fce374`
- 2026-05-16 | **[MAIN] [TSC-FIX]/MachiningPlaybook+PlaybookRules: add getAllRules() canonical API (-1)** | observed-in: 12f4cd0d4 | fix: see commit | verify: `git -C H:/prism show 12f4cd0d4`
- 2026-05-16 | **canonical field renames + drop non-existent keys (-2)** | observed-in: fc864822f | fix: see commit | verify: `git -C H:/prism show fc864822f`
- 2026-05-16 | **WIRE-EXEMPT + 15-case test + 2 latent-bug fixes** | observed-in: f7fd9b29b | fix: see commit | verify: `git -C H:/prism show f7fd9b29b`
- 2026-05-16 | **revive auto-router for /-prefixed prompts** | observed-in: 66aa07afa | fix: see commit | verify: `git -C H:/prism show 66aa07afa`
- 2026-05-16 | **353: search() returns array, not envelope (-1)** | observed-in: 96df2c778 | fix: see commit | verify: `git -C H:/prism show 96df2c778`
- 2026-05-16 | **420: stats().total in place of getAllRules() (-1)** | observed-in: 6755e7f9d | fix: see commit | verify: `git -C H:/prism show 6755e7f9d`
- 2026-05-16 | **the permanent fix — bump transcript freshness 5min → 4h** | observed-in: b3d7693bd | fix: see commit | verify: `git -C H:/prism show b3d7693bd`
- 2026-05-16 | **PlaybookRule shape + RuleCategory literal (-2)** | observed-in: 1131b3713 | fix: see commit | verify: `git -C H:/prism show 1131b3713`
- 2026-05-16 | **3264: unknown-bridge for OutcomeRecord (-1)** | observed-in: 5a560716a | fix: see commit | verify: `git -C H:/prism show 5a560716a`
- 2026-05-16 | **14-case behavioral suite clears wiring gate** | observed-in: ef7235297 | fix: see commit | verify: `git -C H:/prism show ef7235297`
- 2026-05-16 | **selectOptimalStrategy 3-arg + featuretype/kinematics rename (-1 net)** | observed-in: 9562a197d | fix: see commit | verify: `git -C H:/prism show 9562a197d`
- 2026-05-16 | **realign 5 engine adapter calls (-5)** | observed-in: fc8c96cb7 | fix: see commit | verify: `git -C H:/prism show fc8c96cb7`
- 2026-05-16 | **rename primary_strategy→selected_strategy (-4)** | observed-in: a0228c8db | fix: see commit | verify: `git -C H:/prism show a0228c8db`
- 2026-05-16 | **window-PID liveness gate — slot stays locked as long as the terminal window is open** | observed-in: f2156e582 | fix: see commit | verify: `git -C H:/prism show f2156e582`
- 2026-05-16 | **[MAIN] [OBSIDIAN-INTELLIGENCE-MS3]/E1+E4-ENVELOPE-DRIFT-FIX: flip status=completed (re-verified 49/49 tests PASS)** | observed-in: 28ac3ff50 | fix: see commit | verify: `git -C H:/prism show 28ac3ff50`
- 2026-05-16 | **ToolGeometry + TaskCategoryT casts via unknown bridge (914->908, -6)** | observed-in: e62ebadbe | fix: see commit | verify: `git -C H:/prism show e62ebadbe`
- 2026-05-16 | **wire tribal corpus into MillingAGIMasterEngine (audit finding #3)** | observed-in: cdad09490 | fix: see commit | verify: `git -C H:/prism show cdad09490`
- 2026-05-16 | **rotation_order 2-char rotary pairs + MaterialProps literal (total 941->932)** | observed-in: 9eda303f5 | fix: see commit | verify: `git -C H:/prism show 9eda303f5`
- 2026-05-16 | **complete 11 MaterialProps literals (total 952->941)** | observed-in: 99286ba87 | fix: see commit | verify: `git -C H:/prism show 99286ba87`
- 2026-05-16 | **live wired-engine resolver (CLAUDE-BRIEF #1 gap)** | observed-in: 2513098c8 | fix: see commit | verify: `git -C H:/prism show 2513098c8`
- 2026-05-16 | **eval-harness honesty fix + reproducible U4 checkpoint** | observed-in: 51b4c66bf | fix: see commit | verify: `git -C H:/prism show 51b4c66bf`
- 2026-05-16 | **kc1_1->kc11_mpa 7 of 15 (total 959->952)** | observed-in: 872ad577d | fix: see commit | verify: `git -C H:/prism show 872ad577d`
- 2026-05-16 | **mark 2 FiveAxis engines as intentional internal-layer** | observed-in: a95ac0286 | fix: see commit | verify: `git -C H:/prism show a95ac0286`
- 2026-05-16 | **[MAIN] [TSC-FIX]/FiveAxis MaterialProps + kinematics field-rename (1015->1003 net)** | observed-in: 3591c991d | fix: see commit | verify: `git -C H:/prism show 3591c991d`
- 2026-05-16 | **activate the per-slot branch system — fix juliett/lima drift + /checkin Step 2c cutover** | observed-in: b8dfbf208 | fix: see commit | verify: `git -C H:/prism show b8dfbf208`
- 2026-05-16 | **10 clean fixes (15->5 errors)** | observed-in: 832400d48 | fix: see commit | verify: `git -C H:/prism show 832400d48`
- 2026-05-16 | **post-ship audit punch-list (10 P0 integration bugs)** | observed-in: e7e2dbf1b | fix: see commit | verify: `git -C H:/prism show e7e2dbf1b`
- 2026-05-16 | **mark 2 internal-layer engines WIRE-EXEMPT** | observed-in: fa003c123 | fix: see commit | verify: `git -C H:/prism show fa003c123`
- 2026-05-16 | **extractConstraints reads real MachineSpindle fields** | observed-in: 64ab700dc | fix: see commit | verify: `git -C H:/prism show 64ab700dc`
- 2026-05-16 | **fix 4 pre-existing devDispatcher.ts tsc errors** | observed-in: 1f1fec299 | fix: see commit | verify: `git -C H:/prism show 1f1fec299`
- 2026-05-15 | **atomically swap 10 stop_on_* gates → stop-regression-bundle** | observed-in: 62587fb9f | fix: see commit | verify: `git -C H:/prism show 62587fb9f`
- 2026-05-15 | **restore 4 session-continuity hooks (slot-resume was broken fleet-wide)** | observed-in: 5bd70167f | fix: see commit | verify: `git -C H:/prism show 5bd70167f`
- 2026-05-15 | **restore 3 more wiped MINIMAL_ALLOWLIST gates** | observed-in: 4984c918b | fix: see commit | verify: `git -C H:/prism show 4984c918b`
- 2026-05-15 | **restore scrutinize-before-stop (3-of-3 gate was OFF fleet-wide)** | observed-in: 58e89c46e | fix: see commit | verify: `git -C H:/prism show 58e89c46e`
- 2026-05-15 | **spawn writer via process.execPath, not bare "node"** | observed-in: 940f95e43 | fix: see commit | verify: `git -C H:/prism show 940f95e43`
- 2026-05-15 | **stop-regression-bundle (BUILT + tested, NOT wired)** | observed-in: 7e29bcea0 | fix: see commit | verify: `git -C H:/prism show 7e29bcea0`
- 2026-05-15 | **[HOOKS-AUTOMATION-V2]/P0.3-B: fix error-pattern-promote grouping (never promoted)** | observed-in: 049eb81c4 | fix: see commit | verify: `git -C H:/prism show 049eb81c4`
- 2026-05-15 | **[HOOKS-AUTOMATION-V2]/P0.1: fix memory-relevance-inject 0% fleet-wide recall** | observed-in: 2a5b60cfd | fix: see commit | verify: `git -C H:/prism show 2a5b60cfd`
- 2026-05-15 | **classifier category accuracy + Unicode-bypass safety pre-gate** | observed-in: 2bbf12654 | fix: see commit | verify: `git -C H:/prism show 2bbf12654`
- 2026-05-15 | **[MAIN] [OBSIDIAN-INTELLIGENCE-MS3]/D2-FIXUP — close 3-of-3 Arm B+C blockers (parity test + WIRE-EXEMPT + unterminated-fm audit-log fix)** | observed-in: 7c87d2161 | fix: see commit | verify: `git -C H:/prism show 7c87d2161`
- 2026-05-15 | **regression-auto-write.mjs Stop hook + 22 tests** | observed-in: 8ba9a84d7 | fix: see commit | verify: `git -C H:/prism show 8ba9a84d7`
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

## Recent regressions
<!-- Append-only log per Boris CLAUDE.md back-flow pattern. New entries at TOP. -->
- 2026-05-17 | **`readDockerHealth` (FLEET-REAPER-MS1.1) only mirrored `parsed.services.*` but the real `ollama-docker-health.mjs` probe emits `docker` + `ollama` as TOP-LEVEL keys (only `{qdrant,postgres,prometheus}` under `services`).** Net: `services.docker` was NEVER populated for any real payload → `dockerHealth.available` permanently `false` (→ spurious "docker down but ollama reachable" caveat on every real run), and the new Tier-2 `serviceRestartAction` daemon-down safety guard (`svc.docker && svc.docker.up===false`) was DEAD in production — with `PRISM_FLEET_REAPER_SERVICE_RESTART=1` it would `docker restart` against a dead daemon, the exact destructive action the invariant forbids. Hermetic Tier-2 tests all passed because their `HEALTH()` fixture fabricated `docker` *inside* `services` — a shape the producer never emits (the "hermetic fakes don't prove production wiring" class, same as RGS-TOOL-AUTOINVOKE-MS1). Caught by per-file scrutiny Reviewer A (code-analyzer) before ship. | fix: U-FR-TIER2-SERVICE-RESTART (commit this session, slot alpha) — `readDockerHealth` now folds top-level `parsed.docker`/`parsed.ollama` into the normalized `services` map (back-compat: an explicit `parsed.services.docker` is NOT overwritten); `available` derives correctly; added 3 real-producer-shape E2E tests (`REAL_PROBE()` → `readDockerHealth → serviceRestartAction → restartWedgedServices`) — the fail-on-revert regression oracle the hermetic suite lacked. Reviewer B independently verified end-to-end PASS. Side-effect: fixes the latent MS1.1 spurious-caveat bug too. | observed-by: claude-23c10eea slot alpha per-file scrutiny. Lesson: a pure-core + injected-readers design MUST ship ≥1 real-producer-shape E2E. | verify: `node --test H:/prism/scripts/__tests__/fleet-reaper-service-restart.test.mjs` → 19/19; `node -e "import('./scripts/fleet-reaper-sweep.mjs').then(m=>{const d=m.readDockerHealth({runHealthProbe:()=>JSON.stringify({docker:{up:false},services:{qdrant:{up:false}}})});console.log(d.services.docker.up===false)})"` → `true`.
- 2026-05-17 | **`scripts/regen-viz.mjs --full` silently corrupted downstream artifacts when the merge subprocess SIGKILLed under host memory pressure.** Parent emitted `[regen-viz] ✗ merge failed` with ZERO captured stderr (signal-kill leaves no V8 message; `stdio: "inherit"` was already set but the kernel reaped the child before V8 could print), then *continued* through 7 post-merge stages (`repair-graph-engine-classification` → `dedup-graph-nodes` → `reparent-viz-categories` → `add-parent-contains-edges` → `system-viz-obsidian-bridge-v2` → `generate-executive-briefing` → `generate-wiki-debt-worklist` → drift-gate), ALL reading the *stale* pre-merge `system-graph.json` (~99K nodes instead of expected ~145K). `EXECUTIVE-BRIEFING.md` / `WIKI-DEBT-WORKLIST.md` / `obsidian-augmentation.json` published with stale headline metrics; drift-gate falsely certified "clean" because stale ≠ truncated. Script exited 1 (already fail-loud on `failed > 0`) — cron caught the signal but artifacts were *already* corrupted. Karpathy R12 — silent corruption masquerading as a recoverable failure. Reproduced 2026-05-17 lima session 77971357 (`.tmp-regen-viz-lima-full.log`). | fix: U-REGEN-VIZ-MERGE-FAILLOUD (commit `f9dc218d78`, 2026-05-17 lima) — new pure helper `scripts/lib/regen-viz-merge-guard.mjs` `decideMergePostState({mergeStatus, mergeSignal, preMergeNodeCount, postMergeNodeCount, augTotalBytes})` returning `{abort, exitCode, reason, message}`. Four paths: merge-fail (exit 2), silent-no-op (exit 3, defined as `augBytes ≥ 1MB && pre > 0 && post ≤ pre`), continue, default. Orchestrator snapshots pre+post node count, calls guard, `process.exit(guard.exitCode)` on abort — post-merge stages never run against a stale graph. 19/19 tests PASS via `node:test`. Per-file 2-reviewer gate (arm A: code-analyzer, arm B: independent reviewer): both PASS, 0 P0/P1. **Spec lesson**: the prior-session spec at `state/shared/specs/U-REGEN-VIZ-MERGE-FAILLOUD-FIX-PLAN-2026-05-17.md` claimed 4 fixes; 3 were ALREADY in place (heap arg `--max-old-space-size=16384`, `stdio: "inherit"`, fail-loud exit). Re-reading the actual code at HEAD invalidated 3 of 4 spec claims — handoff RESUMEs are working hypotheses, not ground truth. | observed-by: claude-77971357 slot lima `/checkin-lima /loop all lima work`. P2 follow-ups for separate units: streaming node-count reader (avoid 2× JSON.parse on 153MB graph), atomic-write in `merge-augmentations.mjs:1430`, extending fail-loud to repair/dedup/reparent/parent-edges/executive-briefing stages. Memory: [[reference_u_regen_viz_merge_faillod_2026_05_17]]. | verify: `node --test H:/prism/scripts/lib/regen-viz-merge-guard.test.mjs` → 19/19 PASS; `grep -c decideMergePostState H:/prism/scripts/regen-viz.mjs` ≥ 1.
- 2026-05-16 | **MEMORY.md crossed the 24,576-byte truncation ceiling — 24,688 B / 100.5% / status=critical**. The U-MEMORY-COMPRESS one-shot fix without a durable watchdog allowed silent re-growth past 22 KB → past 24 KB in ~0 days; the `memory-size-watch.mjs` shipped earlier today exists but ran only on-demand, never gated/scheduled. Fleet-wide recall now actively truncating; freshest memory entries unreachable across all sessions until compressed. | fix: re-run U-MEMORY-COMPRESS protocol (pointer-only index, ≤200 chars/entry) AND wire `scripts/memory-size-watch.mjs` into a Stop hook OR `/loop --interval 1d` for durability. Watchdog gap is the root cause; the one-shot is not enough. | observed-by: claude-416be9ac slot bravo `/forge-audit-v2 look for nodes that need updating reflecting whats now built and optimize their usage` peer-reviewed BLOCK→FIX→SHIP. Audit: `state/shared/specs/STALE-NODES-AUDIT-2026-05-16.md`. META tool: `scripts/node-staleness-rank.mjs` (baseline appended to `state/shared/node-staleness-history.jsonl`). | verify: `node scripts/node-staleness-rank.mjs --json | jq '.memory.bytes,.memory.status'` → bytes < 22000 AND status == "fresh".
- 2026-05-16 | **System-graph utilization classifier degenerate — 281,683 ghost / 0 orphan / 81.7% ghost density**. `AWARENESS-SNAPSHOT.md` (injected into every chat at SessionStart by `awareness-snapshot-inject.mjs`) reports 0 orphans across a 372K-node graph with active 836-engine wiring debt — implausible. The classifier's binary "any-doc-edge → not-ghost" threshold makes the orphan signal (the "punch list of built-but-undocumented") unusable. Every chat reads "0 orphans" and concludes nothing needs documenting; reality is 1,348 wired engines lack wiki entries. | fix: re-tune classifier in `scripts/augment-graph-with-awareness.mjs` or `scripts/regen-viz.mjs` — drop binary doc-edge rule, use degree percentile + has-source-file as the orphan signal. Until fixed, the punch-list line in awareness-snapshot is misinforming every chat. | observed-by: claude-416be9ac `/forge-audit-v2` F4 (peer-reviewer-added). | verify: `node scripts/node-staleness-rank.mjs --json | jq '.utilization.classifierDegenerate, .utilization.orphan'` → false AND >0.
- 2026-05-16 | **3 META-tool calculation bugs shipped in first-pass `node-staleness-rank.mjs` caught by peer-reviewer (Boris doctrine working as designed)**: (a) Ollama schema path `o.totals.offloaded` (non-existent) → reported 0% ratio while reality was 20.3%; (b) envelope-drift regex over-counted 60× by sweeping `consistent`/`n/a` rows (681 false-positives vs real 11); (c) wikiCoverage read `bs.engines.*` (schema drifted, never existed in current shape) → all-zero output. All three are the same class of bug: assuming a schema without reading the file first. Fixes shipped same session via Edit; back-compat fallbacks added (`o.offloaded || (o.totals||{}).offloaded`, `bs.headline.built_engines || bs.BUILT?.summary?.total_built`). | fix: schema-read-first discipline — when writing a measurement tool against a JSON state file, ALWAYS `Object.keys(json)` it first; never assume a shape from the prose summary in the .md sibling. | observed-by: claude-416be9ac `/forge-audit-v2` peer-reviewer BLOCK verdict. | verify: `node scripts/node-staleness-rank.mjs --json | jq '.ollama.ratio, .envelopeDrift.driftedMilestones, .wikiCoverage.coverageGap'` → 0.20-ish, 11, 1348.
- 2026-05-16 | **MEMORY.md re-grew to 23,826 B (96.9% of the 24,576-byte truncation ceiling) only 0 days after U-MEMORY-COMPRESS — the one-shot compression had no watchdog, so the known fleet-wide silent-recall-truncation regression (line below) was 750 B from re-triggering with zero alert.** | fix: `scripts/memory-size-watch.mjs` shipped 2026-05-16 via `/forge-audit-v2` (mirrors `synergy-regression-watch.mjs`: read → `state/shared/memory-size-history.jsonl` → exit 0/1/2; WARN ≥90%, CRITICAL ≥97% of ceiling). Makes the U-MEMORY-COMPRESS fix DURABLE instead of one-shot. Surfaced by the audit's peer-reviewer as the strongest missed finding (audit had "memory retention" in scope but no memory finding until review). Wire to `/loop --interval 1d` or Stop advisory. | observed-by: claude-3a1c1c68 slot juliett `/forge-audit-v2` (peer-reviewer-added F7). | verify: `node scripts/memory-size-watch.mjs --json | jq '.bytes,.pctOfCeiling,.status'` → currently 23826 / 0.9695 / "warn" (exit 1) — index needs compression NOW.
- 2026-05-16 | **Ollama offload rate sat at 22.2% (target 30%) for an unknown period with no automated alert, and `ollama-auto-router.mjs:166` `/`-prefix skip made the auto-router dead code for the entire `/checkin`/`/loop`/`/forge` prompt class (0 decisions recorded in telemetry — wired but never fired).** Mirrors the synergy-regression-watch gap; corroborated by `feedback_ollama_docker_pipeline_dead_code_2026_05_16` (88% of Ollama hook surface unwired). | fix: pending — F2 R1 (drop `/` skip `ollama-auto-router.mjs:166`) + R2 (`INJECT_THRESHOLD` 0.90→0.80 `ollama-task-offloader.mjs:56`) + R4 (rate-limit 5min→60s `:54`) + R5 (auto-execute Ollama for safe categories `:441`); R1+R5 projected to clear 30%. R3 from first-pass audit DROPPED (phantom — space-form `/checkin` regex already present at `:102`). | observed-by: claude-3a1c1c68 slot juliett `/forge-audit-v2`. | verify: `node scripts/ollama-offload-dashboard.mjs --json | jq '.totals|(.offloaded/(.offloaded+.keptOnClaude))'` ≥ 0.30 AND `ollama-auto-router` appears in `ollama-offload-stats.json.byHook` with `fired>0`.
- 2026-05-16 | **Synergy ratio regressed 22.2% → 21.1% over 7 days (2026-05-09 → 2026-05-16) without any automated alert.** The `system-synergy-map.mjs` measurement existed but ran only on-demand; there was no week-over-week diff, no chat-bus alert, no `/loop` schedule. A 1.1pp drop in the single most load-bearing dev-pipeline health metric went unnoticed for a full week, surfacing only when slot foxtrot ran `/forge-audit-v2` for an unrelated dev-tool enhancement audit. | fix: `scripts/synergy-regression-watch.mjs` shipped 2026-05-16 (215 LOC, NOT claimed by any peer chat) — runs synergy-map, appends to `state/shared/synergy-history.jsonl`, exits non-zero on regression beyond configurable threshold (default 0.5pp week-over-week). 3 modes (normal/`--json`/`--history`), cron/CI-friendly exit codes (0=clean, 1=regression, 2=measurement-error). Baseline seeded at 0.211. Wire to `/loop --interval 1d` or Windows-task scheduler for daily watch. | observed-by: claude-32a39c0c slot foxtrot, `/forge-audit-v2` dev-tools-pipelines audit. | verify: `node scripts/synergy-regression-watch.mjs --json | jq -r .currentRatio` returns a number; `node scripts/synergy-regression-watch.mjs --history` shows ≥1 record under `state/shared/synergy-history.jsonl`.
- 2026-05-16 | **MEMORY.md index 73KB / 3× the 24.4KB compliance threshold — load was silently truncated every chat fleet-wide, breaking cross-session recall.** The Anthropic harness emits `Only part of it was loaded` when MEMORY.md exceeds 24576 bytes, but the index entries had grown to 1500+ chars each (dense distillations duplicating content already in the linked per-memory files). Confirmed live via the SessionStart system-reminder in slot bravo claude-339c8ff7. | fix: U-MEMORY-COMPRESS (AUDIT-SYNERGY-MS0, 2026-05-16) — rewrote index so each entry is ≤200 chars per global CLAUDE.md schema; underlying memory files in `C:/Users/wompu/.claude/projects/H--prism/memory/` untouched. Final size: 21474 bytes / 134 lines (well under the 24576-byte limit). Doctrine: index entries are pointers — full detail belongs in `<slug>.md`, never inlined. | observed-by: claude-339c8ff7 slot bravo, /forge7 audit. | verify: `wc -c C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` < 24576; next-chat SessionStart load must NOT emit the truncation warning.
- 2026-05-16 | **`stop-force-loop-continue.mjs` Stop hook is dead code fleet-wide — the `## RESUME_LOOP` handoff re-injection never fires.** `stop-force-loop-continue.mjs:174` gates with `if (loop.status !== "active") approveAndExit(...)`, but `loop-state.mjs` never writes `"active"` — `cmdStart` (line 71) writes `status:"running"`, and the only other values are `ended`/`abandoned`/`stale` (the last set by `reap`). So the hook early-exits on EVERY real loop and never injects `## RESUME_LOOP` into the handoff. Loop continuation across `/compact` thus has no Stop-hook belt — it rests entirely on `session-start-auto-resume` re-firing `/checkin` + the `checkin.md` Step 2b loop-resume detection (which reads `loop-state` directly and works without this hook). | fix: pending — 1-line `stop-force-loop-continue.mjs:174` `"active"` → `"running"`. NOT fixed in the observing commit (out of scope: that commit rolled the autonomous loop into `/checkin`; the checkin loop does not depend on this hook). | observed-by: claude-339c8ff7 slot alpha — per-file scrutiny reviewer B during the `/checkin` autonomous-loop roll-in. | verify: `grep -n 'loop.status' H:/prism/.claude/hooks/stop-force-loop-continue.mjs` → the comparison must read `!== "running"`.
- 2026-05-16 | **`git-add-lane-guard.mjs` false-blocked every legitimate main-tree `git add` via case-sensitive path compare.** `canonicalize()` lowercased only the drive letter (`H:`→`h:`), leaving the rest of the path case-sensitive. `git worktree list --porcelain` reports the main worktree as `H:/PRISM` (uppercase) while a chat's cwd is `h:/prism` — the SAME directory on case-insensitive NTFS. `isWithin()` did `cwd.startsWith(root+"/")` → `"h:/prism".startsWith("h:/PRISM/")` → false → every explicit pathspec flagged "outside slot worktree" → staging blocked. Compounded by slot mis-resolution (juliett chat resolved to slot `alpha`), but the casing bug alone is sufficient to block. Kill switch `PRISM_GIT_ADD_LANE_DISABLE=1` is a `process.env` read — unreachable from a tool call (PreToolUse hook runs in the harness process; an inline `VAR=1 git add` prefix does NOT reach it). | fix: `canonicalize()` now lowercases the WHOLE path on `process.platform==="win32"` (NTFS is case-insensitive); non-Windows keeps drive-only behavior. Verified: `canonicalize("H:/PRISM")===canonicalize("h:/prism")`. The `.claude/hooks/__tests__/git-add-lane-guard.test.mjs` suite imports `vitest` and cannot run under the isolated `.claude/` test infra (pre-existing gap, same class as the helpers/ vitest bug) — fix verified by direct invocation. | observed-by: claude-3a1c1c68 slot juliett (MISC-TASKS extraction commit). | verify: `node -e "import('./.claude/hooks/git-add-lane-guard.mjs').then(m=>console.log(m.canonicalize('H:/PRISM')===m.canonicalize('h:/prism')))"` → `true`.
- 2026-05-16 | **`/compact` silently no-op'd the precompact handoff write on every portable-node machine (stale RESUME across the whole fleet).** `precompact-handoff.mjs:419` spawned the per-agent-handoff writer with bare `spawnSync("node", ...)`. Under portable-node `process.execPath`=`H:\Tools\nodejs\node.exe` resolves but `node` is NOT on the PreCompact-hook child's PATH → `spawnSync("node",...)` returns `ENOENT` with `stdout=undefined`. The result parser did `(writeResult.stdout||"").trim()` → `""` → `if(out)` skipped → `JSON.parse` never ran → `catch` never fired → `writeMsg` frozen at its init literal `"(no output)"`. Net: every `/compact` emitted `auto-write attempted ((no output))` and the handoff RESUME was never refreshed (user report: "compact doesn't kick off precompact anymore"; observed session claude-339c8ff7 — RESUME stale 65min, pre-U3-U8). Silent because the hook still returned `{continue:true}` and the swallow hid the ENOENT. The sibling test `precompact-hook-source.test.mjs:28` already documented this exact footgun in its own harness — production never applied the lesson. | fix: `precompact-handoff.mjs:419` `"node"`→`process.execPath` (matches the working line-337 terminal-resolver spawn) + fail-loud result parser (surfaces `writeResult.error.code` as `SPAWN FAILED:` and the empty-stdout-no-error case as `writer emitted no stdout (status=,stderr=)` instead of `(no output)`, per Karpathy R12). 3 regression guards added to `precompact-pad.test.mjs` (comment-stripped source assertion — guard inspects code not prose, avoiding the AAM04 comment-blind class below); 16/16 + writer-source 10/10 green; live repro `{"ok":true,"file":"...HANDOFF-..."}`. `runGit()` bare `"git"` (line 85) verified NOT affected (git IS on the spawn PATH; status=0). Same-class latent bug flagged not-fixed (scope): `.claude/helpers/portability-setup.mjs:83` bare `spawnSync("node",...)`. | observed-by: claude-339c8ff7 slot bravo (user-reported during autonomous-chain test). | verify: `"H:/.claude/bin/portable-node" -e "const{spawnSync}=require('child_process');const r=spawnSync(process.execPath,['H:/prism/.claude/helpers/per-agent-handoff.mjs','read','--terminal','x'],{encoding:'utf8'});console.log(r.status,(r.stdout||'').length>0)"` → `0 true`; `node --test H:/prism/.claude/helpers/precompact-pad.test.mjs` → 16/16.
- 2026-05-16 | **AAM04 hook-wiring auditor reported 14 dangling refs but 12 were INTERNAL auditor bugs.** 6 from over-greedy `parseBundleChildren` regex capturing bare `.mjs` string literals in `bundles/smoke-test.mjs:16-21` (`join(tempDir, "ok.mjs")` etc.); 6 from helper-scope blindness — `findHooksOnDisk` excludes `.claude/helpers/` by design, so `${HELPER_BASE}/foo.mjs` bundle refs surface as dangling even when the helper exists on disk. Only 2 of 14 were real: `posttool-edit-bundle.mjs:46-47` refs `${HOOK_BASE}/build-cache-manager.mjs` + `${HOOK_BASE}/build-tracker.mjs` but BOTH files live in `helpers/` (runtime ENOENT pending; per 2026-05-14 regression `build-tracker.mjs` had xmalloc OOM — likely moved to helpers/ as mitigation but bundle ref not updated). | fix shipped: commit `e3a08b95e` AAM04-FIX1 — tightened `parseBundleChildren` regex to require path separator before basename + 1 regression-guard test (25/25 PASS); dangling 14→8. | fix #2 deliberately NOT shipped: helper-aware lenience would mask the 2 real scope-mismatches (Karpathy R12 fail-loud). | follow-up: scope-aware `parseBundleChildren` tracking prefix context per ref (HOOK_BASE vs HELPER_BASE) → emit separate `scopeMismatch` diagnostic. | observed-by: claude-549c9f4f kilo slot AAM04 /loop iter 1-7. | verify: `node H:/prism/scripts/harness-wiring-audit.mjs` → severity=warn, dangling=8.
- 2026-05-16 | **Error-learn hooks documented as auto-firing but 0/6 actually wired in either settings.json.** `grep error-(pattern\|block\|learner) settings.json` returned ZERO matches in BOTH C: and H: copies — `error-pattern-promote`, `error-pattern-capture`, `error-pattern-learner`, `error-pattern-memory`, `error-block-capture`, `error-block-prewarn` all dead-code on disk despite CLAUDE.md (project + global) AND `data/docs/gsd/GSD_QUICK.md` claiming they fire on PostToolUse/PreToolUse/Stop. Result: `ERROR_LEARN_LEDGER.jsonl` writes never accumulated; user's "make sure error learning hooks fire" silently failing for an unknown period. | partial fix: `error-pattern-promote.mjs` wired into Stop[12] after `stop-wiring-audit-suggest` (timeout 5000ms, atomic node-script + manual `cp` C:→H: per 2026-05-15 mirror-gap pattern, byte-equal preserved, hook smoke-tested `{"continue":true}`). 1/6 done. | remaining 5 need header-read first to confirm matcher: `error-pattern-capture` (T2 PostToolUse `Bash|Edit|MultiEdit|Grep|Glob`), `error-pattern-learner`, `error-pattern-memory`, `error-block-capture` (PreToolUse), `error-block-prewarn` (UserPromptSubmit). | **CAVEAT 2026-05-16 in-flight**: `claude-6d0595bf` concurrently writing `scripts/_emergency-unwire-yolo-25.mjs` + `feedback_dont_wire_for_wiring_sake_2026_05_16.md` + `reference_hook_wiring_yolo_25_2026_05_16.md` — read those before piling on more wires; doctrine may shift from "wire by default" to "wire on demonstrated need", potentially reverting `error-pattern-promote`. | observed-by: claude-549c9f4f kilo slot. | verify: `grep error-pattern-promote C:/Users/wompu/.claude/settings.json` ≥1 match.
- 2026-05-16 | **Settings.json hook wiring silently REVERTED on shipped SYSTEM-VIZ-BRAIN-MS0 keystone units.** U-P0-AUDIT-VIZ-FIRST + U-P1-POST-SHIP-DISTILL shipped together in `0c11ff1cb` (2026-05-15) with their hook .mjs files, skill, script, wiki entry, and auto-distilled post-ship memo. Commit body explicitly wired `audit-viz-first-inject.mjs` into `UserPromptSubmit` chain idx 5 and the post-ship-distill Stop hook. Audit on 2026-05-16 via slot ECHO: `grep audit-viz-first` returned **0 matches** in BOTH `C:/Users/wompu/.claude/settings.json` AND `H:/.claude/settings.json` — wiring was reverted in some intervening multi-chat merge. Hooks were dead-code on disk despite envelope+memos saying "shipped". | fix: re-spliced both entries via atomic node JSON write into C:/Users/wompu/.claude/settings.json (UserPromptSubmit[4] right after master-index-precheck-inject; Stop[8] right after stop-system-viz-drift per [[reference_stop_advisory_wiring_cluster_2026_05_15]]); manually `cp` to H:/.claude/settings.json because c-to-h-mirror hook fires on Edit/Write/MultiEdit/NotebookEdit but NOT on Bash node-writes (separate documented mirror gap); both files byte-identical 30731B; smoke-tested each hook with empty stdin (post-ship-distill returns `{"continue":true}`, audit-viz-first silently no-ops). | observed-by: claude-a61bbf34 slot echo /loop iter 1 SYSTEM-VIZ-BRAIN-MS0. | verify: `node -e "['H:/.claude/settings.json','C:/Users/wompu/.claude/settings.json'].forEach(p=>{const c=require('fs').readFileSync(p,'utf8'); console.log(p+': audit-viz-first='+((c.match(/audit-viz-first/g)||[]).length)+' post-ship-distill='+((c.match(/post-ship-distill/g)||[]).length))})"` → both ≥1. Doctrine + protocol: [[feedback_settings_wiring_drift_2026_05_16]] — add grep-check as 5th surface to the `feedback_reflect_all_changes_post_update` close-out rule for any unit that touches harness config.
- 2026-05-15 | **`c-to-h-mirror` hook was DOCUMENTED but NEVER WIRED (silent C:↔H: drift for months).** Both global and project CLAUDE.md claimed "c-to-h-mirror hook auto-replicates C: → H: on every save" since 2026-05-12 at the latest. Reality: `.claude/hooks/mirror-c-to-h.mjs` existed but had ZERO entries in either settings.json. Every Claude session on this PC wrote to `C:\Users\<u>\.claude\` (memory, plans, transcripts) and silently failed to mirror to `H:\.claude\`. Live audit on 2026-05-15: **34,003 files walked on C:, 33,040 missing on H:** (≈97% drift), 575 correctly excluded by the hook's exclusion list, 388 already in sync. | fix: INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01 (claude-b6c4b196 slot delta 2026-05-15) wired the hook into the `Edit|Write|MultiEdit|NotebookEdit` PostToolUse group in BOTH `C:\Users\<u>\.claude\settings.json` AND `H:\.claude\settings.json` (timeout 3000ms, byte-identical 30064 bytes); shipped 2 supporting scripts (`scripts/mirror-c-to-h-audit.mjs` to surface drift, `scripts/bootstrap-h-mirror.mjs` for one-shot backlog sync with --apply); 32 vitest tests in `.claude/helpers/mirror-c-to-h.test.mjs` (plain `node:assert` because the helpers/ vitest-config has a pre-existing infra bug). | verify: `node scripts/mirror-c-to-h-audit.mjs` → `missing-on-h: 0` after running `node scripts/bootstrap-h-mirror.mjs --apply` once. The hook continues to fire on every Edit/Write going forward.
- 2026-05-14 | **DISPATCHER_DIGEST.md regen parser broken for spread-array action enums.** `scripts/generate-dispatcher-wiki.mjs` (or whichever emits the digest) does NOT recognise `z.enum([...A, ...B] as const)`. Four high-traffic dispatchers show 0 actions in the digest while their `.ts` files have 428 / 27 / 121 / 130 case statements (`aiReasoningDispatcher`, `localDispatcher`, `millDispatcher`, `mlDispatcher`). Every downstream audit that scrapes the digest mis-prioritises these as "zero-action wiring milestones". | fix: pending — unit `U-HVA-DIGEST-PARSER-FIX` (S). Test fixture: `enum X = [...A, ...B]` literal must produce `len(A)+len(B)` actions. Interim mitigation: `scripts/high-value-additions-rank.mjs` counts directly from `.ts` files via `case ["']\w+["']\s*:` regex. | observed-by: claude-a2b1b5ca slot alpha /forge-audit-v2 + peer reviewer agent a8299dd3b088946a6. | verify: `node scripts/high-value-additions-rank.mjs --json | jq .dispatchers.digestParserBroken` must return `false`.
- 2026-05-14 | **BUILD_STATE.NEEDS_WIRING signal has ≥ 50 % false-positive rate on sample.** `master_index_query buildClass:unknown` actually means "not indexed by node-classifier", not "no dispatcher import". Sampling 10 named candidates this session: 5 are wired (HookLatencyEngine→devDispatcher, TokenEconomyEngine→contextDispatcher, AutoFixPipelineEngine→devDispatcher, OllamaEmbedderEngine→memoryDispatcher, HookTelemetryEngine→hookDispatcher). | fix: unit `U-HVA-UNWIRED-SIGNAL-VALIDATE` — `scripts/validate-unwired-signal.mjs` samples 50 random NEEDS_WIRING engines + greps every dispatcher for imports. False-positive rate ≤ 10 % gates downstream wiring milestones. | observed-by: same peer reviewer. | verify: re-run script → false-positive rate ≤ 10 %.
- 2026-05-14 | **Hook orphan-rate metric was bundle-blind (overstated by 12.7 pp).** v1 of `scripts/high-value-additions-rank.mjs` only scraped settings.json `command` fields and missed bundle-child refs (six `bundles/*.mjs` invoke ~91 child hooks via `${HOOK_BASE}/foo.mjs`). Original baseline 78.6 % → corrected 65.9 %. | fix: v2 walks `bundles/*.mjs` and unions child refs into the wired set before computing orphans. | observed-by: same peer reviewer. | verify: `node scripts/high-value-additions-rank.mjs --json | jq '.hooks | {wiredViaSettings,wiredViaBundle,sourceHooks}'` returns sane numbers (settings+bundle ≥ 130 on this repo).
- 2026-05-14 | `system-viz-live-bridge` (iter 2 — supersedes 2026-05-14 iter 1 below): even reclassifying TypeError → `viz-not-running` (info) still emitted 1 record per session per 5-min backoff window — pure noise for an optional dev tool. Operators don't care about "viz is off" on machines where viz is intentionally off. | fix: extracted pure `telemetryRecordFor()` that returns `null` for viz-not-running (no JSONL row at all). The `.down` sidecar (`viz-live-bridge-<sid>.down`, backoff-until epoch) remains the audit trail — its mtime tells operators when viz was last detected down. `scripts/hook-health-check.mjs` `NEUTRAL_EVENTS` still includes `viz-not-running` to correctly classify historical pre-fix rows. Also fixed: malformed `post:{}` from adversarial custom postFn now returns `null` instead of falling through to bogus `ping-failed`. | observed-by: claude-a2b1b5ca slot alpha (3-of-3 scrutiny FAIL → fix → PASS cycle) | verify: `node --check .claude/hooks/system-viz-live-bridge.mjs` + the 8 new vitest cases in `__tests__/system-viz-live-bridge.test.mjs`
- 2026-05-14 | `system-viz-live-bridge` PostToolUse hook logged 1,347 `ping-failed:TypeError` events (4.3% of telemetry stream) when local viz server was off — every Edit/Write retried ECONNREFUSED forever | fix: classify TypeError as `viz-not-running` (info) + add 5-min session backoff via `VIZ_DOWN_BACKOFF_MS` + `vizDownFile` sidecar | observed-by: claude-48450e3d /forge-audit-v2 | verify: `node scripts/hook-health-check.mjs --window=1h` should show 0 broken hooks
- 2026-05-14 | `build-tracker.mjs` PostToolUse:Write fires `/bin/bash: xmalloc: cannot allocate 8192 bytes` (fork-storm symptom under Windows hook load) | fix: not a code bug; run `node .claude/hooks/node-process-janitor.mjs --full` to reap orphan bash.exe + MCP procs | observed-by: claude-48450e3d /forge-audit-v2 | verify: subsequent Write hooks emit no xmalloc errors

## DEV PRODUCTIVITY HOOKS (2026-05-14 /forge-audit-v2 addition)
3 UserPromptSubmit hooks auto-fire on slash-command keywords to inject pre-flight context. **Knobs**: `PRISM_LOOP_INJECT_DISABLE=1`, `PRISM_PICK_PREFRESH_DISABLE=1`, `PRISM_GOAL_PREREQ_DISABLE=1`. Wired in C: and H: `.claude/settings.json` UserPromptSubmit chain (after token-budget-gate, before auto-consensus).

| Hook | Trigger | Surfaces |
|---|---|---|
| `loop-iteration-inject.mjs` | `/loop` | this session's loop-state (iter/target/status), other fleet loops, Karpathy R10 reminder |
| `pick-prefresh-inject.mjs` | `/pick-unit` `/pick-task` `/checkin` `/pick-build-close` | MILESTONE_PROGRESS + BUILD_STATE + CLOSE-OUT-CANDIDATES staleness, active claims, research order |
| `goal-prereq-inject.mjs` | `/goal` | CLOSE-OUT-CANDIDATES freshness vs Stop-gate threshold, sibling-unit pending status |

Companion artifacts:
- `.claude/helpers/loop-state.mjs` — start/tick/read/end/list/reap for resumable `/loop` state (`state/shared/loop-state/loop-<sid>.json`)
- `.claude/commands/pick-build-close.md` — macro skill: pick → research → build → close-out → handoff
- `scripts/hook-health-check.mjs` — re-runnable telemetry analyzer (META artifact, baselines hook failure rate)

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

## MASTER INDEX + AWARENESS STACK (search-first discipline)
Before Grep/Glob/Agent, hit the unified index. Auto-injects top-5 hits on every UserPromptSubmit (`master-index-precheck-inject.mjs` T2) + 15-line awareness digest on every SessionStart (`awareness-snapshot-inject.mjs` T2). Surfaces: `prism_session:master_index_query` + `master_index_node_status` + `master_index_utilization_dashboard`; skills `/master-index`, `/utilization-dashboard`, `/awareness-snapshot`, `/orphan-inventory`, `/deep-search`. Full surface table + hit-shape doc + knobs at [`knowledge/wiki/architecture/master-index-surface.md`](knowledge/wiki/architecture/master-index-surface.md) (U-CLEANUP-D2). Memory: [[reference_master_index_surface]], [[reference_awareness_stack]]. Knobs: `PRISM_MASTER_INDEX_INJECT=0`, `PRISM_MASTER_INDEX_K=N`, `PRISM_AWARENESS_INJECT=0`.

**Wiring verification (2026-05-14 orphan-rescue by claude-a2b1b5ca):** both injectors were in `.claude/hooks/` but NOT wired in any bundle or `settings.json` between 2026-05-12 (initial engine ship) and 2026-05-14 (wiring landed). Stale-claim hazard: this CLAUDE.md section and the memory `reference_master_index_surface` both asserted "auto-injects on every UserPromptSubmit" while the wiring was missing — verify before relying. Now wired as individual entries in `C:/Users/wompu/.claude/settings.json` (UserPromptSubmit after `prompt-context-inject.mjs`, SessionStart after `build-state-inject.mjs`); auto-mirrored to `H:/.claude/settings.json` by the `c-to-h-mirror` hook. **DO NOT** wire either into `sessionstart-bundle.mjs` going forward — the bundle is high-contention peer-claimed real-estate; individual entries survive multi-chat bundle churn. Verify wiring with `echo '{"prompt":"test"}' | "H:/.claude/bin/portable-node" .claude/hooks/master-index-precheck-inject.mjs` (expect exit 0 + JSON `hookSpecificOutput.additionalContext`).

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

## MISC-TASKS INVENTORY — orphaned incomplete work (2026-05-16, slot juliett)
The *inverse* of close-out-audit: work identified across PRISM chats that was never finished **AND** never formalized into a roadmap unit/milestone envelope. A 10-agent scan of all chats (912 transcripts + 504 handoffs + 184 loop-state/plans + 25 curated debt files) feeds `scripts/extract-misc-tasks.mjs` (deterministic dedupe + cross-reference against roadmap-index + 694 envelopes + MILESTONE_PROGRESS). Durable inventory: `state/shared/specs/MISC-TASKS-INVENTORY.{json,md,html}` (advisory, `mustHumanVerify`). Surfaced in `/system-viz` as the `ghost.misc_tasks` roost + one `misc-task` child per item, via `scripts/generate-misc-tasks-features.mjs` (registered in `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice — augmentations need BOTH, no auto-discover). First run: 522 raw → **318 misc tasks**. Wiki: [`knowledge/wiki/architecture/misc-tasks-extraction.md`]. Memory: [[misc-tasks-extraction-2026-05-16]].

## ROADMAP CONSOLIDATION — one inventory of all remaining work (2026-05-16, slot juliett)
Unifies every scattered PRISM roadmap into one consolidated inventory + a bridge/synergy layer. `scripts/consolidate-roadmaps.mjs` (deterministic) merges `MILESTONE_PROGRESS` + `roadmap-index` + 694 envelopes + `BUILD_STATE` + `MISC-TASKS-INVENTORY` + 6-agent prose-roadmap extraction (REVENUE v7.6, BACKEND-DEVTOOLS-MEGA, UNIFIED-v2, prism-stabilization, GIT-TREE-REMEDIATION, OBSIDIAN-INTELLIGENCE-MS3) → `state/shared/specs/ROADMAP-CONSOLIDATED.{json,md,html}`: `milestones[]`, `pending_units[]` (the master remaining-work set), `unconsolidated_prose[]` (prose-roadmap units with NO envelope), `bridge_units` (wiring + deep-integration). First run: **849 milestones · 4497 pending units · 969 un-consolidated prose · 318 misc orphans · 26 wiring + 16 deep-integration bridge units = 5826 total remaining**. The bridge layer is the "synergize the galaxy" value — `DEEP_INTEGRATION_BRIDGES` (16 curated: SFC→6 CAM bridges, Master Post→CAM, CAD↔CAM AI, 3-tier AI hierarchy, closed-loop learning, ERP, operator gates). Surfaced in `/system-viz` as `ghost.bridge_synergy` roost via `scripts/generate-bridge-synergy-features.mjs` (registered in `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice). Advisory + `mustHumanVerify`. Wiki: [`knowledge/wiki/architecture/roadmap-consolidation.md`]. Memory: [[roadmap-consolidation-2026-05-16]].

## `/checkin-<nato> /loop <task>` — full-stack dev pipeline contract (2026-05-16)
Single canonical entry. Typing `/checkin-alpha /loop <task>` (or any other slot — `bravo..foxtrot, hotel..lima`; `golf` is the integrator) activates the entire PRISM dev stack autonomously:

1. **Slot claim** — `chat-slots.mjs claim --preferSlot <nato> --force` binds this chat. Terminal-pin keeps the slot across `/compact` (per [[reference_session_continuity_stack_2026_05_15]]).
2. **Slot worktree cutover** — `/checkin` §2c migrates onto the slot branch (`slot/<nato>`) + slot worktree (`H:/prism-slot-<nato>`). Live since SLOT-WORKTREE-MS0 (peer-shipped activation 2026-05-16 commits `b8dfbf208 + 912f10fff`, per [[reference_slot_worktree_activation_2026_05_16]] — "0 pipeline wrappers needed"). Once bound to `slot/<nato>`, three hooks arm automatically: `main-tree-write-block` (no Edit/Write into `H:/prism`), `git-add-lane-guard` (case-insensitive path compare since 2026-05-16, per [[reference_misc_tasks_extraction_2026_05_16]] §Recent regressions), `worktree-commit-route` (commits route to slot worktree). Golf is the only slot exempt — it integrates slot branches into `cad-fusion-live-ms0`.
3. **Per-iteration full-stack injection** — every `/loop` iteration is a fresh UserPromptSubmit and fires the canonical hook chain: `master-index-precheck-inject` (top-5 graph hits), `wiki-precheck-inject`, `memory-relevance-inject`, `tribal-by-domain-inject` (slot-domain-aware), `ollama-pipeline-injector` + `ollama-prewarm-on-pipeline` (route summarize/explain/classify off Claude), `comprehensive-build-enforce`. Subagent spawns get per-task pre-search (per [[reference_subagent_per_task_presearch_2026_05_15]]).
4. **Pickup source** — `/pick-unit` / `/pick-dev` from atomic-roadmap + MILESTONE_PROGRESS for shipped-work subtraction. **The 5826-item ROADMAP-CONSOLIDATED inventory is the master remaining-work picture** — bridge units (26 wiring + 16 deep-integration) are the highest-leverage starting set since they connect already-built capability. **Priority-queue layer (PRIORITY-QUEUE-MS0, 2026-05-16)** surfaces all remaining units color-coded in `/system-viz` (`ghost.priority_queue` roost — blue=backend-dev, amber=bridge, green=app-functionality) with backend-dev units sorted to the TOP. Runtime pickup API: `node .claude/helpers/priority-queue.mjs --pick [--slot X] [--top N]` returns the next-best eligible unit (already-shipped + peer-claimed filtered). Generator: `scripts/generate-priority-queue-features.mjs` (registered in `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice). Wiki: [`knowledge/wiki/architecture/priority-queue.md`]. Memory: [[priority-queue-ms0-2026-05-16]].
5. **Error-learn loop** — `error-pattern-capture` + `error-block-prewarn` + `error-learn-store` write to the unified ledger; the next iteration's pre-warn surfaces relevant prior errors via Qdrant similarity. Mistakes flow to memory via `/learn-from-mistake` skill + the auto-capture loop ([[feedback_always_capture_lessons]]).
6. **Build/scrutiny/commit/handoff** — autonomous loop runs per-file scrutiny (multi-file builds), 3-of-3 Stop gate, slot-routed commits (`[SCOPE]/U-ID: title`), per-agent handoff write (`HANDOFF-<slot>-<topic>.md`). `/compact` auto-writes the handoff (per [[reference_precompact_hook_autowrite_2026_05_15]]); `session-start-auto-resume` continues across compact.

**The contract:** typing `/checkin-<nato> /loop <task>` is sufficient. Slot, worktree, signature, file routing, dev-tool injection, parallel agents, tribal-knowledge surfacing, Ollama offload, mistake learning, and self-continuation across compact all activate without further input. Nothing in this section is new code as of this entry — it's the doctrine pointer that names the contract so chats know it works.

Wiki: [`knowledge/wiki/architecture/checkin-loop-fullstack.md`]. Memory: [[checkin-loop-fullstack-2026-05-16]].

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
**Triggers registered:** 36     **Last regen:** 2026-05-16T20:51:21.819Z
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

## KNOWLEDGE-CONVERSION-MS0 (2026-05-17, 7 units shipped — 4 phases) — MIT-OCW + monolith → PRISM 6-node-type routing

Closes the extracted-but-not-consumed gap for MIT-OCW courseware (65 candidates / 126 assets) + v8.89 monolith extraction (12 formulas + 52 algorithms + 948 modules). Three-lane model: **Lane A** (direct-wire — `scripts/course-to-tribal-tips.mjs` + `monolith-to-tribal-tips.mjs` auto-emit `KnowledgeTip[]` into `cad-engine/knowledge_store/`, engine auto-loads; 259 tips shipped); **Lane B** (port-verify — `state/shared/specs/U-KC-C1-FORMULA-PORT-VERIFICATION.md` + `U-KC-C2-ALGORITHM-VERIFICATION.md` confirmed 0 ports needed across 12 formulas + 52 algorithms, 1 forge-candidate routed); **Lane C** (forge-queue — `scripts/lib/course-data-router-lib.mjs` pure-core router + 30 tests routes per-asset to one of 6 PRISM node-types: knowledge / algorithm / formula / engine / skill / pipeline). Live first-run: 31 TRIBAL-SHIPPED · 69 FORGE-QUEUE · 10 DUPLICATE · 16 DISCARD. Reusable for `/pdf-learn` + `/video-learn` + `/shop-knowledge` outputs — drop into `course-content-candidates.jsonl` shape, rerun `node scripts/course-data-router.mjs`. Doctrine pins: formula path ALWAYS Lane C with physics-reviewer (NEVER inline constants); engine threshold > algorithm threshold; advisoryOnly + mustHumanVerify on every ledger. Wiki: [[knowledge-conversion-ms0]]. Memory: [[reference_knowledge_conversion_ms0_2026_05_17]].

**Lane C operator-action layer (2026-05-17 india, commits `dea7274d23 + 5d5c363f0e + 6ae5399608`)** — closes the "we have a 69-item FORGE-QUEUE but operators have no actionable list" gap. Three artifacts: (1) `state/shared/specs/COURSE-FORGE-PROPOSALS.md` — hand-curated P1-P10 stubs with dedup-preflight grep, physics_gate flags, consolidation/reject guidance, anti-pattern list. (2) `scripts/course-data-router.mjs --emit forge-stubs --min-relevance N` — bulk emitter producing `state/shared/specs/COURSE-FORGE-STUBS.md` (62 stubs at 0.6 floor); kind-aware path proposals (`algorithms/<Pascal>.ts`, `engines/<Pascal>Engine.ts`, `physics/constants.ts` for formula); REJECT auto-flag for first-party CAM bridges (mastercam/hypermill/esprit/fusion360/inventor/solidworks); name-similarity dedup-preflight against live algorithms/+engines/ inventory. (3) `scripts/course-data-router.cli.test.mjs` — 13-case hermetic node:test suite (happy path + filter behavior + REJECT + physics_gate + PascalCase + JSON mode + dry-run + adversarial arg validation + regression guard on default ledger mode). Advisory + mustHumanVerify; per-stub `/forge-triple` invocation still gated by `duplicationGuardEngine.mustCheckBeforeCreating()` THROW. Wiki: [[course-forge-stubs-emitter]]. Memory: [[reference_course_forge_stubs_emitter_2026_05_17]].

**First conversions — 4 composable algorithm nodes forming a PDE suite (2026-05-17 india, commits `1323fa4ee7 + b38a9f2285 + a547223bbf + 7cbbe511d7`)** — proves the pipeline end-to-end: course idea → routed → proposed → forged → tested → committed. **P1 `OperatorSplittingMethod`** (MIT-OCW 10.34; Lie-Trotter + Strang split of `dy/dt=A(y)+B(y)`, 28 tests). **P7 `ODEIntegrator`** (MIT-OCW 2.003j; explicit Euler + classical RK4, `makeSubstepIntegrator` adapter, 28 tests). **P6 `LinearStateSpaceModel`** (MIT-OCW 2.003; LTI ẋ=Ax+Bu, SISO TF via Faddeev-LeVerrier, Bode, Kalman ranks, `pendulumCartExample`, 22 tests). **FDM `FiniteDifferenceMethod`** (MIT-OCW 2.086; 1D fwd/bwd/central + Laplacian stencils, Dirichlet/Neumann/periodic BCs, `makeMethodOfLinesRHS` adapter, 18 tests). **All four compose into a PDE solver**: `FDM.makeMethodOfLinesRHS → ODEIntegrator/RK4` (heat-eq Fourier decay verified); `LinearStateSpace.simulate → ODEIntegrator`; `ODEIntegrator.makeSubstepIntegrator → OperatorSplitting`. 96/96 tests, tsc clean. NO inline physics constants (numerical/algebraic primitives — caller owns physics). All `mcp-server/src/algorithms/*.ts`, WIRE-EXEMPT sharing deferred `U-COURSE-FORGE-P1-DISPATCHER` (`prism_calc:{operator_split,ode_integrate,lti_analyze,fdm_discretize}`). Plus **GD `GradientDescent`** (MIT-OCW 18.02; commit `271351e7ec`; vanilla/heavy-ball-momentum/Adam, analytic-or-central-FD gradient, divergence guard, 17 tests) — a 5th conversion, complementary not composable: the first-order LOCAL optimizer regime alongside the existing derivative-free `BayesianOptimizer`/`GeneticOptimizer`. Plus **FEM `FiniteElementMethod1D`** (MIT-OCW 1.050/3.22/1.105; commit `937bc66e76`; Galerkin P1 weak-form solver for `−(a·u′)′+c·u=f`, exact element matrices, Thomas tridiagonal solve, Dirichlet/Neumann BCs, 17 tests) — a 6th conversion, the weak-form sibling of FDM (strong-form); together the two canonical PDE discretizations. Plus **LAG `LagrangianMechanics`** (MIT-OCW 16.07/2.032; commit `56243befc9`; numerical Euler-Lagrange `M·q̈=∂L/∂q+Q−…`, mass matrix by central FD, Gauss-elim solve, `makeEOMDerivative` adapter, singular-Lagrangian fail-loud, 18 tests) — a 7th conversion that composes into ODEIntegrator (model physics as a Lagrangian, integrate numerically). **Total: 7 nodes, 148/148 tests.** Five bugs caught+fixed mid-build (R12): a secretly-commuting convergence-test operator pair, Faddeev-LeVerrier negative-zero emission, an isotropic-bowl momentum premise, and two safety-threshold expectations — all test-side except the −0 (code). Wiki: [[course-forge-conversions]]. Memory: [[reference_course_forge_conversions_2026_05_17]].

## RGS-TOOL-AUTOINVOKE-MS0 (2026-05-16, 12 units) — per-roadmap-unit toolchain enrichment

Attaches a self-correcting PRISM toolchain to every open roadmap unit (4,404 units), surfaced at `/pick-unit` / `/rgs` pickup, with a Stop-hook outcome feedback loop (Beta re-rank). Only net-new artifact: rule table `scripts/lib/rgs-pipeline-rules.mjs`. All signal sources delegate to existing engines (findCapabilities, skill-triggers.jsonl, system-viz-graph, tribal). Sidecar: `state/shared/roadmap-tool-plans.json`. Ops: `/rgs tool-plan-coverage` (anti-rot %-fresh metric). Knobs: `PRISM_RGS_TOOL_PLAN_INJECT=0`, `PRISM_RGS_OUTCOME_RECORD_DISABLE=1`. Wiki: [[rgs-tool-autoinvoke-ms0]]. Memory: [[reference_rgs_tool_autoinvoke_ms0_2026_05_16]].

**MS1 / U-INTEG-FIX-P0 (2026-05-16, commit `b287c1614`)** — a post-ship 10-agent audit found MS0 was architecturally sound but functionally broken: the 97 unit tests injected FAKE readers, so 10 P0 bugs in the REAL reader factories (tribal/capabilities/ollama/outcomes) + the hook↔sidecar schema seam shipped untested. U-INTEG-FIX-P0 fixes all 10 and adds `scripts/rgs-tool-planner.e2e.test.mjs` — the real-data regression oracle (11 failing assertions on the buggy code → 84/84 green). **Core lesson: a "pure core + injected readers" design MUST ship one real-data E2E test — hermetic fakes do not prove production wiring.** **U-CRON** (nightly cron replan — `--time-budget` flag + `onFlush` lock-refresh + scheduled-task installer) shipped 2026-05-16 (commit `025d5c248`). **U-DOMAIN-RULES** (5 mill/lathe/wedm/cam/cad pipeline rules + structural Wire-EDM exclusion + /lathe polysemy guard + deep-freeze rule arrays + 5 canonical skill triggers in mill/lathe/wedm/cam-strategy/cad-from-blueprint frontmatter; 31/31 tests) shipped 2026-05-16. **U-DISPATCHER** (wired `prism_dev:roadmap_tool_plan_{query,build,coverage}`: query=pure sidecar read, build/coverage=execFileSync subprocess delegation per R8; 9/9 tests; per-file scrutiny caught the MS0 false-green recurring at the test-mock layer — MockMCPServer bypasses the `z.enum(ACTIONS)` SDK gate so a missing-from-enum action 9/9-passes while production is 100% broken — fixed) shipped 2026-05-16. P1 backlog (4 units left): feedback forcing, RIE adapter, calibration, transfer priors. Punch list: `docs/superpowers/specs/2026-05-16-rgs-tool-autoinvoke-MS1-punchlist.md`. Wiki: [[rgs-tool-autoinvoke-ms1]]. Memory: [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] · [[reference_u_dispatcher_2026_05_16]].

## JULIETT-12CHAT-ALLOCATION-MS0 (2026-05-17, juliett — iter-2/3/3.5)

12-chat ROI allocation across alpha..mike (12 work slots; golf hygiene). 25 agents across 3 iters: 10 V2.1 scrutiny + 10 SYNERGY (S1-S10) + 5 fan-out (T1-T5). 5-wave ordering coordinates Stage-2 BLOCKERS, 5 NEW V2.1 units, 10 SYNERGY units, 5 fan-out units, 10 hand-picked backend-dev wirings (A4 6%-true-orphan filter). **CLEAR-NOT-COMPACT doctrine** (new): prefer `/clear` over `/compact` for token headroom; 11 bypass systems documented (per-agent handoff, terminal-pin, obsidian memory+wiki, /system-viz query, master-index, awareness inject, build-state, per-unit specs, chat-bus, slot-task-claim, RGS tool-plan). **5 silent-degrade fixes (F1-F5)**: master-index-search-lib 200MB cap on 331MB graph silent-fails fleet-wide unified search; session-start-auto-resume accepts `clear` in code but settings.json wires only `compact`; error-pattern-capture 0-fire makes entire 3-stage error-learn chain DEAD; 10 duplicate hook wirings (stress-harness-emit ×4); `state/shared/specs/UNITS/` dir didn't exist (FIXED). **PATCH-SIBLING convention** codified: `state/shared/dashboards/patches/<SURFACE>-PATCH-<unit>.md` for peer-locked surfaces; U-DOC-REFLECTION-GATE-WITH-PATCH-SIBLINGS elevates to fleet-wide Stop hook. **Iter-3.5 critical alerts**: Docker daemon WEDGED (HTTP 500) → Qdrant/Postgres/Prometheus DOWN → master-index BM25-only fleet-wide SILENTLY (compounds F1); 3 obsolete reaper scheduled tasks running concurrent with Fleet Reaper MS1 → PID-reuse race risk; system-viz classifier degeneracy still UNFIXED post-MS1. Files: `state/shared/specs/JULIETT-{12CHAT-ROI-ALLOCATION,DEVTOOLS-SYNERGY-MAP,PLAN-V2.1-SCRUTINY-DELTAS,FAN-OUT-T1-T5-ADDENDUM}-2026-05-17.md` + `state/shared/specs/UNITS/U-{RGS-RULE-BACKEND-DEV,CLEAR-AUTO-RESUME,MEMORY-COMPRESS-V2,ACTIVATE-BEFORE-BUILD-PRECHECK,PRECOMMIT-PATHSPEC-ONLY}.md`. Wiki: [`knowledge/wiki/architecture/juliett-12chat-allocation-ms0.md`](knowledge/wiki/architecture/juliett-12chat-allocation-ms0.md). Memory: [[reference_juliett_12chat_allocation_2026_05_17]] · [[reference_juliett_devtools_synergy_map_2026_05_17]].

**Per-slot RGS allocator (2026-05-17, juliett continuation)** — `scripts/allocate-rgs-per-slot.mjs` answers "begin rgs pipeline for each chat slot": it partitions the `priority-queue` master pool into a per-slot work queue for all 13 slots (12 work slots round-robin over the priority-ordered pool, `--per-slot` default 6; golf gets hygiene-milestone units only + standing duties). Emits `state/shared/specs/JULIETT-PER-SLOT-RGS-ALLOCATION-<date>.{json,md}` atomically. Picking is **delegated** to `.claude/helpers/priority-queue.mjs` (never re-implemented — R8). Advisory-only, deterministic, fail-loud on duplicate cross-slot assignment (exit 1) and priority-queue schema drift (exit 2), empty-pool safe. Complements the hand-curated `JULIETT-12CHAT-ROI-ALLOCATION` (ROI swarm) — this is the mechanical RGS partition. Wiki: [[per-slot-rgs-allocation]].

## OLLAMA-PIPELINE-MS0 (2026-05-15, commit c34405927) — wire local LLM into skill pipelines

Closes the gap where 21 ollama hooks + 8 engines existed but `/forge-audit`, `/rgs`, `/forge-triple` had **zero Ollama mentions** (9% offload rate vs 30% healthy target). Three load-bearing artifacts:

| Artifact | Role | Knob |
|----------|------|------|
| `scripts/ollama-docker-health.mjs` | CLI probe — Ollama daemon + Docker + Qdrant + Postgres + Prometheus in 1 line. `--text`/`--json`/`--require ollama,qdrant` gate. Uses curl subprocess (node fetch/http both fail under parallel-localhost-probe contention). | n/a |
| `.claude/hooks/ollama-pipeline-injector.mjs` | UserPromptSubmit T2 4000ms — matches 9 pipeline triggers (`/forge-audit`, `/rgs`, `/scrutinize`, `/dedup`, `/precompact`, `/deep-search`, `/pdf-learn`, `/close-out-audit`, `/forge-triple`), injects concrete model + saving recommendations. | `PRISM_OLLAMA_PIPELINE_INJECT=0` |
| `.claude/hooks/ollama-prewarm-on-pipeline.mjs` | UserPromptSubmit T3 3000ms — when trigger fires AND model NOT warm, spawns detached `curl /api/generate` with `keep_alive=10m`. 10-min per-model cooldown stamp. Hides cold-load latency in Claude reasoning window. | `PRISM_OLLAMA_PREWARM_DISABLE=1` |

Wiring in C:/.claude/settings.json UserPromptSubmit chain (auto-mirrored to H:/.claude/settings.json by c-to-h-mirror). Skill-doc updates: `/checkin` §6g local-compute health + `local_compute:` Report line; `/forge-audit` + `/rgs` skill bodies (gitignored — local-only) carry explicit phase→model routing tables. The injector hook is the canonical source — skill text is advisory documentation.

The deeper insight: 21 hooks fire on harness events automatically (good), but SKILL .md runbooks didn't reference Ollama — so post-`/compact` chats re-derived from skill text and missed the wiring. The injector makes the routes **deterministic and surface-visible on every invocation**.

Wiki: [`knowledge/wiki/architecture/ollama-pipeline-ms0.md`](knowledge/wiki/architecture/ollama-pipeline-ms0.md). Memory: [[reference_ollama_pipeline_ms0_2026_05_15]].

## NN-GRAPH-MS0 (2026-05-16, 8 units) — GraphSAGE GNN tier-5 wiring inference

Adds a GraphSAGE link-prediction GNN as the **5th tier** of the wiring-inference cascade (keyword → expanded-keyword → sibling-prefix → LLM → **GNN**) that classifies UNKNOWN `ghost.unwired-engine` system-viz nodes into a dispatcher. Strictly additive: `PRISM_NNG_DISABLE=1` reverts to the 4-tier cascade exactly; a missing trained checkpoint makes the GNN tier a graceful no-op. The GNN (`scripts/seed-ghost-gnn-classify.mjs`) does k-NN label-propagation over high-confidence reference ghosts in GraphSAGE embedding space; the tier-5 gate is wired into `scripts/seed-ghost-llm-classify.mjs` before its Ollama batch. Assessment harness `scripts/lib/nn-graph-eval.mjs` grades against AUROC≥0.78 / macro-F1≥0.55 / Brier≤0.15. **Status: `shipped-research-only`** — all 8 units built+tested+committed. **Continuation 2026-05-16b (slot alpha, claude-fe461853):** the U4 checkpoint is now trained + **committed** (`state/shared/nn-graph/graphsage-checkpoint.json`, 152KB) so the deferred state is reproducible in-tree, and `nn-graph-eval.mjs` got an **honesty fix** — it no longer prints "no trained checkpoint exists" when one is present; it distinguishes `no-checkpoint` from data-blocked `insufficient-reference-pool`, and the strong "trained / U4-resolved" prose is gated on the checkpoint's embedded training metadata (+2 fail-on-revert regression tests, 48/48, 2-reviewer per-file gate PASS incl. a fixed P1 overclaim). Deploy gate still DEFERRED but the blocker moved **code-side → data-side**: `poolSize 0 < 2` (the live system-viz graph currently has 0 reference ghosts; the tier is dormant by data). Link-pred pretext AUROC=0.096 is the *known* heterophily/type-imbalance anti-correlation (already triply-confirmed in [[reference_nn_graph_ms0_2026_05_16]], not a new finding). **Actual deploy progress requires a NEW unit** (`U-NEG-SAMPLE-STRATIFIED` cheap test, or `U4-768D-FEATURES`) — not more MS0 work. Knobs: `PRISM_NNG_{DISABLE,MIN_CONF,REF_MIN_CONF,TOPK,CHECKPOINT}`. Wiki: [`knowledge/wiki/architecture/nn-graph-ms0.md`](knowledge/wiki/architecture/nn-graph-ms0.md). Memory: [[reference_nn_graph_ms0_2026_05_16]].

## NN-GRAPH-MS1 (2026-05-17, slot alpha) — U-NNG-PIPELINE-STRATIFIED-WIRE

Commit `97c9286311`. Wires the trainer's already-shipped stratified
negative-sampling through `runTrainingPipeline` so the GNN trains AND evaluates
against a type-marginal-matched negative distribution — closes the *cause* of
the AUROC=0.096 deferred gate (heterophily anti-correlation under uniform
negatives; the defect was the trainer↔pipeline integration boundary, not the
algorithm). Opt-in via `--node-type-field <field> --neg-p-hard <0..1>`;
byte-identical legacy path when unset (regression-tested), preserving
`PRISM_NNG_DISABLE` discipline. New exported `extractNodeTypes` +
`sampleStratifiedEvalNegatives` (eval keyed by `canonicalEdgeKey`, mirrors the
trained distribution; `typeMarginal` from trainEdges only = leakage-safe).
74/74 pipeline + 183/183 NN-GRAPH stack green (+23 cases). **Deploy gate moved
code-side → data-side**: `state/shared/nn-graph/NN-EVAL.json` stays
`deferred:true, poolSize:0` (live graph has 0 reference ghosts — dormant *by
data*, not bug). Lift = operator out-of-session run `node
scripts/lib/graphsage-train-pipeline.mjs --node-type-field layer --neg-p-hard
0.7` against the real 372k-node graph. Wiki:
[`knowledge/wiki/architecture/u-nng-pipeline-stratified-wire.md`](knowledge/wiki/architecture/u-nng-pipeline-stratified-wire.md).
Memory: [[reference_u_nng_pipeline_stratified_wire_2026_05_17]].

## NN-GRAPH-MS2 (2026-05-17, slot alpha) — autonomous NN lifecycle

**U1-REFERENCE-POOL-SEED-STAGE** (commit this session) — DEDUP/simplify win:
`seed-ghost-from-unwired.mjs` already existed (high-conf 0.80-0.85
`ghost.unwired-engine` + `proposed_wiring`, idempotent `--apply`) but was NOT a
regen-viz stage, so every regen left 0 ghost nodes → `nn-graph-eval` poolSize:0
→ GNN tier-5 DORMANT BY DATA. Fix = one explicit **post-merge** spawnSync stage
in `regen-viz.mjs` (after `add-parent-contains-edges`, past the merge-abort
gate, fail-loud, idempotent). 4 node:test fail-on-revert guards; per-file 2-rev
PASS. **NECESSARY BUT NOT SUFFICIENT** (R12): clears only the data-side gate
(eval can now grade instead of defer); the model-side gate
(AUROC≥0.78 vs current 0.096) is untouched — full autonomy still needs the
operator stratified retrain + **U2** (queued: self-retrain lifecycle scheduled
task reusing the fleet-reaper S4U pattern — pool-rebuild→drift→retrain→eval→
auto-promote-on-gate-pass-only). Lesson: when a milestone says "build X
builder", first check X isn't already built+unwired. Wiki:
[`knowledge/wiki/architecture/u-nng-pipeline-stratified-wire.md`](knowledge/wiki/architecture/u-nng-pipeline-stratified-wire.md)
(MS2 section). Memory: [[reference_nn_graph_ms2_u1_2026_05_17]].

## ONE-GLANCE CHECKLIST (every new task)
1. Read HANDOFF for this chat via per-agent-handoff.mjs `read`
2. If building/auditing/investigating → hooks auto-inject inventory + duplicate guards
3. Check `PRISM-INVENTORY-LATEST.md` if you need counts
4. Use MCP dispatcher actions before reinventing logic
5. Obey shared directives for coordination (6 chats running)
6. Finish current delivery before starting next roadmap pass (per ROADMAP_COLLABORATION_STATE.md gate)
7. On session end → `/handoff` writes to per-chat file; `/compact` also wires this automatically

## FLEET-REAPER-MS0 (2026-05-14, 6 files shipped)

Slot-aware orphan-process reaper for the 7-chat fleet. Maps every running node/git/bash PID to its owning chat slot via process ancestry + chat-slots.json, reaps orphans of crashed slots gated by **confirm-after-N-ticks** (`firstSeenAt` timestamp, default `2 × 300s = 10 min` continuous candidacy). Three runners: in-session `Monitor` (`/fleet-reaper`), `PRISM Fleet Reaper` Windows scheduled task (5-min cadence, +210s phase offset so it doesn't pile onto Cleanup Orchestrator + Memory Pressure Relief), Stop hook `fleet-reaper-stop.mjs` (throttled 45s — 7 simultaneous Stops collapse to one sweep). Additive — does NOT replace the generic `node-process-janitor` / `cleanup-orchestrator` / `03-memory-pressure-auto-relief` reapers; they cover age/dead-parent/cmdline heuristics, this covers the slot-attribution layer they lack.

**Safety invariant** (load-bearing): a process is a reap CANDIDATE only when its ancestry provably leads to a GENUINELY DEAD PID (`unowned`) OR to a crashed chat slot whose recorded harness PID IS ITSELF DEAD (`owned-by-crashed`). PID reuse + wedged-harness cases (slot crashed but harness process still alive) both resolve to `indeterminate`, never a candidate.

**Kill switch**: `PRISM_FLEET_REAPER_DISABLE=1` makes every runner refuse to kill anything, fleet-wide. `--uninstall` is only per-chat Monitor + the global task.

**Files**:
- `scripts/fleet-reaper-sweep.mjs` — the brain (`--once` / `--monitor-loop` / `--status` / `--dry-run` / `--stop-event` / `--detach`)
- `.claude/helpers/process-slot-map.mjs` — PID→slot classifier (vendors `SLOT_NAMES`/`classifySlot`/`readSlots` module-private — chat-slots.mjs is vitest-unloadable; KEEP-IN-SYNC marker + drift-guard test)
- `.claude/helpers/fleet-reaper.test.mjs` — 66-case vitest suite (real-value assertions, multi-sweep confirm-window integration, hermetic via injected enumerator/slots/killer/ledger)
- `.claude/hooks/fleet-reaper-stop.mjs` — Stop hook (bounded async stdin, stamp-file throttle, spawn-detached); wired into Stop chain (timeout 3000ms)
- `.claude/helpers/install-fleet-reaper-task.ps1` — scheduled-task installer (`-DryRun` burn-in, `-StartOffsetSeconds 210`, elevation probe, `-RunNow` poll, `-Uninstall`)
- `.claude/commands/fleet-reaper.md` — `/fleet-reaper` skill (immediate sweep + ensure task + launch Monitor + 3-state verdict)

**Knobs (env)**: `PRISM_FLEET_REAPER_DISABLE=1` · `PRISM_FLEET_REAPER_DRY_RUN=1` · `PRISM_FLEET_REAPER_KILL_AFTER=N` (default 2) · `PRISM_FLEET_REAPER_AGE_FLOOR_SEC=N` (default 45) · `PRISM_FLEET_REAPER_INTERVAL_SEC=N` (default 300) · `PRISM_FLEET_REAPER_MEM_PRESSURE_PCT=N` (default 90).

**Run `/fleet-reaper` in ONE chat only** — the scheduled task is global; a second chat's Monitor is redundant load on the host the reaper is protecting.

Wiki: `knowledge/wiki/architecture/fleet-reaper.md` · Memory: [[reference_fleet_reaper]] · Sister to [[feedback_never_delete_only_disable]] (`-Uninstall` / `Disable-ScheduledTask` are the reversal levers).

## FLEET-REAPER-MS1 (2026-05-14 — Phase 2, 6 units, strictly additive over MS0)

Three new layers in `fleet-reaper-sweep.mjs` + a new candidate class + a hint consumer + the alpha-slot guardian. Reframes the reaper from "kill more" to "use what's idle" — the box runs near the commit-memory ceiling while the GPU sits at single-digit utilization.

- **U-PHASE2-BASH-CLASSIFIER** (`process-slot-map.mjs`) — new `leftover-bash-task` candidate class: bash/sh + structural cmd-pattern (AND-of-simple-regexes, 4096-char truncation = ReDoS-safe) + age ≥ 15 min + an **UNPINNED** `claude.exe` ancestor + resolved slot data. Catches the orphan MS0 missed — a Bash-tool Monitor loop whose chat died but whose `claude.exe` lingered unpinned. Degraded slot data never widens the candidate set.
- **U-PHASE2-SOFT-RELIEF** (Layer 1) — reversible RAM/CPU relief on **stale-slot** processes only: BelowNormal priority + working-set trim (.NET `EmptyWorkingSet`). Age floor 180 s. Audit → dedicated `state/shared/.fleet-reaper-actions.jsonl` (NOT the kills log).
- **U-PHASE2-GPU-PROBE** (Layer 2) — `readGpuState` (nvidia-smi CSV, fail-soft) + `readOllamaState` (`/api/tags` + `/api/ps`, honors `OLLAMA_URL`).
- **U-PHASE2-OLLAMA-COORD** (Layer 3) — `decideOllamaCoordination` (pure) + `prewarmOllama` (fire-and-forget GPU model load) + `writeRoutingHint` (atomic, TTL'd, neutralizes a stale aggressive hint to `mode:auto`). Advisory: a coordinator error NEVER flips the reap-mission `ok`.
- **U-PHASE2-HINT-CONSUMER** (`ollama-task-offloader.mjs`) — `loadRoutingHint` reads `state/shared/.ollama-routing-hint.json` (fixed absolute literal — cross-process contract), applies `thresholdDelta` clamped to ±0.30 so more hook-eligible work clears for Ollama.
- **U-PHASE2-ALPHA-GUARDIAN** (`alpha-slot-reaper-guardian.mjs`) — **the chat slotted into `alpha` OWNS the reaper.** SessionStart + UserPromptSubmit hook: for the alpha chat it ensures the "PRISM Fleet Reaper" scheduled task is registered + enabled and kicks a throttled detached `--once` sweep; every other chat is a near-instant silent no-op. Advisory-only, never blocks. Stamp-throttled (≤ 1 expensive pass / 4 min).

**Doctrine — golf owns the reaper (SUPERSEDES the prior alpha-owns rule, 2026-05-16)**: ownership moved from alpha → golf to unify all fleet-hygiene under one slot (golf already hosts FLEET-MEMORY-MONITOR-MS0). The `golf-slot-reaper-guardian.mjs` hook (wired into SessionStart + UserPromptSubmit, settings.json) enforces it automatically; the prior `alpha-slot-reaper-guardian.mjs` was UNWIRED from settings.json but preserved on disk per [[feedback_never_delete_only_disable]]. If the durable scheduled task is ever missing/disabled the golf guardian emits a LOUD advisory telling golf to run `/fleet-reaper`. Same coverage gap: a task disabled while the golf chat sits idle isn't caught until golf's next prompt — the scheduled task's own self-heal + the Monitor are the backstops. Knobs: `PRISM_GOLF_GUARDIAN_DISABLE=1` (new), `PRISM_ALPHA_GUARDIAN_DISABLE=1` (back-compat alias, still respected). The `/checkin-golf` skill carries the non-skippable fleet-reaper section that `/checkin-alpha` used to. Memory: [[feedback_golf_owns_reaper]] (live), [[feedback_alpha_owns_reaper]] (SUPERSEDED).

**New CLI flags**: `--no-coord` (skip Layers 2-3 — GPU/Ollama probe + coordinator) · `--no-relief` (skip Layer 1). **New knobs**: `PRISM_FLEET_REAPER_{GPU_DISABLE,GPU_FREE_MIN_MB,HINT_THRESHOLD_DELTA,HINT_TTL_SEC,OLLAMA_COORD_DISABLE,OLLAMA_KEEP_ALIVE,OLLAMA_PREWARM_MODEL,SOFT_RELIEF_AGE_SEC,SOFT_RELIEF_DISABLE,SOFT_RELIEF_PRESSURE_PCT}` + `OLLAMA_URL` (reused) · `PRISM_ALPHA_GUARDIAN_DISABLE=1` · `PRISM_ALPHA_GUARDIAN_NO_SWEEP=1`.

Tests: `fleet-reaper.test.mjs` 66 → 137 `it()` cases (vitest harness currently blocked by a pre-existing vite-transform bug — code verified via `node --check` + esbuild + plain-import + a live production sweep). Wiki: `knowledge/wiki/architecture/fleet-reaper.md` (Phase 2 section) · `ollama-routing-hint.md` · `alpha-slot-reaper-guardian.md`. Memory: [[feedback_alpha_owns_reaper]] · [[reference_fleet_reaper_ms1]].

### Autonomy + enumeration-robustness hardening (2026-05-16b, slot alpha, commit `2cd22c52`)

Two fixes after a live "reaper not staying open / orphans accumulate / `xmalloc` fork-storm" report:

1. **Enumeration-blinding ROOT CAUSE fixed** (`process-slot-map.mjs` `windowsEnumerate`). PS 5.1 `ConvertTo-Json` emits raw C0 control bytes inside string literals (no `\u`-escaping), so a single process whose `CommandLine` contains a control char (e.g. a `node --eval` payload) made Node `JSON.parse` throw → the **entire** enumeration degraded to empty → the reaper went blind (0 candidates while 33 orphans / ~95% commit-mem accumulated). Fix: strip `[\x00-\x1F]`→space in the PS script *before* `ConvertTo-Json` (lossless for the reaper's structural cmdline regexes; space-not-empty avoids token fusion). Live-verified: sweep went `0 candidates + "process enumeration failed" caveat` → `2 candidates, no caveat`. +1 fail-on-revert test (`matchesLeftoverTaskPattern`: raw→true, space→true, empty→**false**).
2. **Installer hardened to true-autonomous** (`install-fleet-reaper-task.ps1`). The task registered with **no `-Principal`** → `Logon Mode: Interactive only` → did NOT run unless the installing user was logged in. Now ONE elevated run yields: default **S4U** principal (`-RunLevel Highest`, runs whether-logged-on-or-not, no stored password) — `-AsSystem` for the strongest mode, `-Interactive` for legacy; a second **`-AtStartup`** trigger (resumes pre-login on reboot); `-RestartCount 3 -RestartInterval 1m` recovery; `Register-ScheduledTask` splatted so `-Principal` is *omitted* (not `$null`) in legacy mode. `-Uninstall` / `Disable-ScheduledTask` reversibility unchanged. **One elevated command makes it set-and-forget:** `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow` (add `-AsSystem` for machine-account mode). 2-reviewer per-file gate PASS (0 P0; B's P1 = the added test, satisfied). Known P3: the test's in-file C0 char-class is raw control bytes (functionally correct, `node --check` clean; an encoding-guard hook reverts `\u`-escape beautify — cosmetic). Memory: [[reference_fleet_reaper_autonomy_robust_2026_05_16]].

### Tier 1 — graduated pressure gate + critical ballast (2026-05-17, slot alpha)

Two strictly-additive, backward-compatible units in `scripts/fleet-reaper-sweep.mjs`:

- **U-FR-TIER1-AGGRESSIVE-THRESHOLDS** (`f4ab9e01d9`) — pure exported
  `tierFromPressure(usedPct, warnPct, criticalPct, killAfter) → {tier, effectiveKillAfter}`
  replaces the binary `underPressure ? min(killAfter,1) : killAfter` reap gate:
  `<warn`→normal (full killAfter), `[warn,critical)`→warn (`min(killAfter,1)`),
  `>=critical`→critical (`0` — reap this sweep). New `DEFAULT_MEM_CRITICAL_PCT=95`
  + `PRISM_FLEET_REAPER_MEM_CRITICAL_PCT`. warn==`memPressurePct` (90) so behavior
  <95% is byte-identical to pre-MS1 (in-test legacy parity proof). Fail-safe
  (R12): non-finite/negative usedPct → normal; `crit<warn` clamps up (collapse,
  never invert). 16 `node:test`.
- **U-FR-TIER1-MEM-BALLAST** — 256MB `Buffer` reserved at CLI boot, released
  one-shot the first critical sweep (Windows charges commit at allocation, so
  freeing it hands ~256MB back exactly when the reaper's own enumeration needs
  headroom — the OOM-blinding mode). Pure `ballastAction` + fail-soft
  `ensureBallast` + one-shot-latched `releaseBallast`; lives in the CLI shell
  (`runSweep` byte-untouched → zero regression). `--status` skips it. Knob
  `PRISM_FLEET_REAPER_BALLAST_MB` (0=off). 20 `node:test`.
- **U-FR-TIER2-SERVICE-RESTART** — under critical pressure a wedged
  Qdrant/Postgres/Prometheus container is the highest-leverage relief (a wedged
  Docker silently degrades master-index to BM25-only fleet-wide). Pure
  `serviceRestartAction` + fail-soft one-shot `restartWedgedServices`, wired in
  the coordinator block. ADVISORY BY DEFAULT — acts only with
  `PRISM_FLEET_REAPER_SERVICE_RESTART=1`; the Docker DAEMON is NEVER an
  auto-restart target (advise-only — auto would kill every container);
  `result.ok` stays reap-mission-only. Per-file scrutiny Reviewer A caught a P0
  (the real `ollama-docker-health.mjs` probe emits `docker`/`ollama` top-level,
  but `readDockerHealth` only mirrored `parsed.services.*` → safety guard dead
  in production) — fixed (fold top-level into `services`, back-compat) + 3
  real-producer-shape E2E tests added (see `## Recent regressions`). 19
  `node:test`.

Both per-file 2-reviewer scrutiny rounds PASS, 0 P0/P1 (Tier-2: A found P0 →
fixed → B verified). 55/55 tests: `scripts/__tests__/fleet-reaper-{tier,ballast,service-restart}.test.mjs`.
Wiki: `knowledge/wiki/architecture/fleet-reaper.md` (Tier 1-2 section). Memory:
[[reference_fleet_reaper_tier1_2026_05_17]].

## FLEET-MEMORY-MONITOR-MS0 (2026-05-16, slot=golf-work, 5 files shipped)

Durable **system-RAM + per-chat-tree memory monitor** that runs every 5 minutes via Windows Scheduled Task, **independent of alpha** (no guardian hook, no in-session Monitor — scheduled task IS the firing surface). Closes the gap the fleet-reaper leaves when all 13 chats are LIVE: reaper has no orphans to kill, but the box is at 96% commit pressure. This monitor names WHICH live chat to `/compact`. Strictly advisory — never kills.

**Attribution unit — claude.exe trees, NOT chat-slots.pid** (load-bearing lesson). First-cut design joined RSS to slots via `chat-slots.json` `state.pid`; live verification proved that pid is the ephemeral subshell that called `claim` (exits seconds later); `terminalWindowId` shell pid is similarly recycled across `/compact`. Stable anchor: **claude.exe** itself — each open chat IS a claude.exe; harness restart on `/compact` spawns a fresh one. Attribution unit is `claude.exe pid + parent-chain descendants`. Slot label overlay is best-effort only when a slot.pid happens to hit a live claude.exe; otherwise the tree key is `tree-<PID>` and the operator identifies the window by PID. Never invent a label (R12).

**Files**:
- `scripts/fleet-memory-monitor.mjs` — main sweep
- `scripts/fleet-memory-monitor.test.mjs` — 28 unit tests via `node:test`
- `.claude/helpers/install-fleet-memory-monitor-task.ps1` — elevated installer (S4U/AtStartup/Restart3×1m, +330s phase offset)
- `.claude/helpers/register-fleet-memory-task-unelevated.ps1` — unelevated fallback (used for this session's initial registration)
- `state/shared/fleet-memory-history.jsonl` — telemetry rotated at 512KB

**Pipeline**: PS5.1 Get-CimInstance (Win32_OperatingSystem phys+commit + Win32_Process rss/ppid filtered to node/claude/bash/git/pwsh/powershell) → `attributeProcesses` walks parent chain (cycle-safe, 32-hop cap) into claude.exe trees → `decideLevel` worst-of-phys-or-commit (clean<80<warn<92≤critical) → `decideAdvisory` cooldown+sustained-ticks → ONE line to `AGENT_CHAT.jsonl` naming the largest tree as `/compact` target. C0 control bytes stripped inside PowerShell before `ConvertTo-Json` (defensive against 2026-05-16b reaper enumeration-blinding class).

**Knobs**: `PRISM_FLEET_MEMMON_{DISABLE,WARN_PCT,CRIT_PCT,ADVISORY_COOLDOWN_SEC,SUSTAINED_TICKS,PS_TIMEOUT_MS}`. Phase offset +330s leaves it clear of Cleanup Orchestrator (+60s), Memory Pressure Auto-Relief (+120s), PRISM Fleet Reaper (+210s). Exit codes: 0 clean · 1 warn · 2 critical · 3 measurement failure.

**Live verification**: phys 74.5% / commit 96.0% → exit 2 (critical), 12 chat trees, largest = PID 46816 (858MB), AGENT_CHAT advisory emitted, NextRunTime at 5-min cadence, 28/28 tests pass. **Hardening to S4U+AtStartup** (currently unelevated current-user): `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-memory-monitor-task.ps1 -RunNow`.

Wiki: `knowledge/wiki/architecture/fleet-memory-monitor.md` · Memory: [[reference_fleet_memory_monitor_2026_05_16]] · Sister to [[reference_fleet_reaper_ms1]] (same scheduled-task pattern, different question answered).
