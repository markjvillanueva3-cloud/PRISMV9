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

### Lane discipline + conflict-fork rule (2026-04-28)
Each chat **stays in its own lane** — claims a milestone scope, commits to the matching `work/<scope>` worktree. `worktree-commit-route.mjs` enforces routing when wired (currently dormant; deeper rules in `data/docs/gsd/GSD_MICRO.md` Multi-Chat section).

**Conflict-fork rule:** if `commit-ownership-guard` or `git-anti-clobber` blocks your commit because another chat owns the files in the shared tree, do NOT fight for the same tree. **Fork to your own tree:**
```bash
git worktree add ../prism-<milestone> -b work/<milestone>
# move work via git stash → pop in new tree, OR cherry-pick
# update HANDOFF-<id>-<topic>.md to point at new worktree
```
This avoids multi-chat thrash on shared HEAD and keeps milestones independently mergeable.

**HOOK-SYNERGY-MS0 (11 units shipped 2026-05-12..13)** — cross-worktree firewall, hook creation gate, settings dedup audit, hook registry reader, latency envelope, tier frontmatter, hook compression / shared duplication-guard, SQLite WAL coordination store, async hook dispatcher, IPC for hook queries, fast-lane matcher split. Full details + dispatcher actions + knobs at [`knowledge/wiki/architecture/hook-synergy-ms0.md`](knowledge/wiki/architecture/hook-synergy-ms0.md) (U-CLEANUP-D1). Memory: [[reference_h7_async_hook_dispatcher]], [[reference_h8_coordination_store]], [[reference_u_coord11_ipc]].

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

## MASTER INDEX + AWARENESS STACK (search-first discipline)
Before Grep/Glob/Agent, hit the unified index. Auto-injects top-5 hits on every UserPromptSubmit (`master-index-precheck-inject.mjs` T2) + 15-line awareness digest on every SessionStart (`awareness-snapshot-inject.mjs` T2). Surfaces: `prism_session:master_index_query` + `master_index_node_status` + `master_index_utilization_dashboard`; skills `/master-index`, `/utilization-dashboard`, `/awareness-snapshot`, `/orphan-inventory`, `/deep-search`. Full surface table + hit-shape doc + knobs at [`knowledge/wiki/architecture/master-index-surface.md`](knowledge/wiki/architecture/master-index-surface.md) (U-CLEANUP-D2). Memory: [[reference_master_index_surface]], [[reference_awareness_stack]]. Knobs: `PRISM_MASTER_INDEX_INJECT=0`, `PRISM_MASTER_INDEX_K=N`, `PRISM_AWARENESS_INJECT=0`.

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
