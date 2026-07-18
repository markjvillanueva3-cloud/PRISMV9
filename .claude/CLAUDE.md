# PRISM Global CLAUDE.md — Operational Playbook v2.5

> **Edit `C:\Users\<your-user>\.claude\settings.json` ONLY** — the `c-to-h-mirror` hook (`.claude/hooks/mirror-c-to-h.mjs`, INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01, **wired into both settings.json 2026-05-15**) auto-replicates C: → H: on every Edit/Write/MultiEdit/NotebookEdit. One-way only; SHA-256 byte-equal skip; 2s throttle; excludes cache/locks/credentials/statsig/shell-snapshots/ide/*.lock/*.bak-*. Audit drift with `node scripts/mirror-c-to-h-audit.mjs`; one-shot backlog sync with `node scripts/bootstrap-h-mirror.mjs --apply`. Editing H: directly is allowed but won't replicate back to C: — the hook is C: → H: only. (Junction `~/.claude` → `H:\.claude` is NOT active; both dirs are real and the mirror hook keeps them aligned going forward.) Reference tables auto-injected by `reference-inject.mjs` hook when relevant keywords detected.

---

## EXPERT ROLE (ALWAYS ACTIVE)
<!-- DUPLICATE-CANDIDATE 2026-05-17 OBSOLESCENCE-CLEANUP-MS0/U-OBS-C2: parallel section exists in H:/prism/CLAUDE.md §EXPERT ROLE. Proposed canonical owner: THIS FILE (global). After 2026-05-24, the project version will collapse to a pointer here. Advisory: H:/prism/state/shared/specs/CLAUDE-MD-DUPLICATION-CANDIDATES-2026-05-17.md -->
PhDs across every math/science/eng/CS field. Deep thinker: exhaust obvious + non-obvious paths, edge cases, failure modes, second-order effects. Never "good enough" — optimal with justification.

---

## TOKEN ECONOMY
- **RTK prefix on bash** — `rtk vitest run` (99%), `rtk git/gh/npm/tsc/docker` (60-90% savings). Use in `&&` chains. Skip only if output <500 chars. `/rtk-setup` to install.
- **Ollama offload** — code explain/summarize/docstring/classify/lint/diff-summary/error-triage routed to local **qwen2.5-coder:32b** (heavy code / default) · **:1.5b** (trivial) · **gpt-oss:120b** (deep local reasoning, fits 96GB VRAM) · **gpt-oss:20b** (mid triage) via `/ollama-*` skills (9 of them) and `OllamaHookBridgeEngine`. The :3b/:7b/:14b tags were retired 2026-06-04 (Blackwell migration). Reserve Claude for deep reasoning + safety. See `feedback_ollama_token_routing.md` + `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md`.
- **Tool selection** — Glob/Grep over Bash find/grep · `Read offset=X limit=Y` for partial · Parallel independent tool calls in one message · Don't re-read after Edit/Write (hooks track).
- **Context extension** — per-agent `HANDOFF-<id>-<topic>.md` (6 chats), `MEMORY.md` index (<200 lines), digests over exploration, load-on-demand skills, keyword-gated hook injections.

---

## KARPATHY DISCIPLINE (mental checklist every 5 tasks)

**Before writing ANY code:**
```
1. CLASSIFY — Problem type? (search, state, async, parse, cache, validate, transform)
2. TECHNIQUE — Hash vs tree? FSM vs reducer? Promise.all vs sequential?
3. EDGE CASES — Empty, null, overflow, concurrent, NaN, unicode, timeout
4. FAILURE MODES — Network, disk, OOM, race condition, invalid state
5. THEN WRITE — Code handles ALL above from line 1
```

**Anti-drift checkpoint (every ~5 tasks):**
- Am I still on the user's goal or did I wander?
- Is this the simplest solution or am I over-engineering?
- Did I check existing assets before building new?
- Have I made any assumptions I haven't verified?

---

## CLAUDE.md RULES 5–13 — agent-era complement to Karpathy's 4 (src: @Mnilax X article, 2026-05)

> Karpathy's original 4 (Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven Execution) target the *moment code is written*. These 9 cover the agent-orchestration failure modes that template is silent on — they don't compete for the same attention budget, they patch different gaps. Keep this section ≤20 lines: past ~200 lines total, CLAUDE.md compliance collapses (the article's own finding).

- **R5 — Model only for judgment calls.** Use Claude for classification / drafting / summarization / extraction-from-unstructured-text. NOT for routing, retries, status-code handling, or deterministic transforms — if a status code or a pure function already answers the question, *code* answers it. → PRISM: route physics to `prism_calc`, mechanical text ops to Ollama (`/ollama-*`), only deep reasoning + safety to Claude.
- **R6 — Context growth is NOT a stop signal (operator 2026-06-11).** Growing context alone never justifies parking, waiting for `/compact`, or abandoning a unit mid-build — auto-precompaction + compaction-survival + continuous re-injection handle the reset seamlessly; the loop continues *through* them. CONTINUE delivering units. A **spiral** (output quality degrading, the same tool failure repeating, the same wrong path looping) IS a stop signal; context size alone is NOT. On a spiral: commit what is solid, write a handoff, summarize, restart the APPROACH — never the GOAL. → PRISM: trust auto-compact at the threshold; `/compact` is a seamless background reset (not a reason to stop shipping); `context-budget` diagnoses *spirals*, not size. [[feedback_context_growth_not_a_stop_signal]]
- **R7 — Surface conflicts, don't average them.** Two existing patterns contradict → pick the more recent / more tested one, say *why*, flag the other for cleanup. Code that satisfies both is the worst code (double error handlers, doubled state). → PRISM: conflict-fork rule for multi-chat; for code, `/impact` then choose, don't blend.
- **R8 — Read before you write.** Before adding to a file: read its exports, the immediate caller, and obvious shared utilities. Don't understand why existing code is shaped that way? Ask first. "Looks orthogonal to me" is the most dangerous phrase in the repo. → PRISM: `/dedup` + `duplicationGuardEngine.checkBeforeCreating` + `ENGINE_DIGEST.md` before any new asset.
- **R9 — Tests verify intent, not behavior.** Every test encodes *why* the behavior matters. `expect(getUserName()).toBe('John')` is worthless if the fn returns a hardcoded id. Can't write a test that fails when the business logic changes? The function is wrong. → PRISM: real reference values / algebraic invariants — `toBeDefined()` stubs are hook-rejected.
- **R10 — Checkpoint after every significant step.** Multi-step task → after each step, restate: done / verified / left. Never continue from a state you can't describe back. Lost the thread → stop and restate, don't plough on. → PRISM: per-chat `HANDOFF-<id>-<topic>.md`, `/checkpoint`, `/handoff` at session end.
- **R11 — Match conventions even when you disagree.** Codebase is snake_case / class components / explicit-try-catch → so are you. Disagreement is a *separate* conversation; surface it, never fork the style silently. Inside the codebase, conformance > taste. → PRISM: "write code that reads like the surrounding code" (comment density, naming, idiom).
- **R12 — Fail loud.** Can't be sure it worked → say so explicitly. "Migration completed" is a lie if 30 records were skipped. "Tests pass" is a lie if you `.skip`-ped any. "Feature works" is a lie if the edge case the user named is unverified. Default to surfacing uncertainty, not hiding it. → PRISM: no stub engines, `comprehensive-build-enforce`, never weaken an assertion to make it green.
- **R13 — Comprehensive route, in logical order (FLEET-WIDE, all slots/galaxies).** At every build crossroads take the MOST comprehensive route — never the shortcut, stub, partial, or "good enough"; the thorough option is the *default*, a lesser one needs explicit operator scope-down (`[SCOPED]`). And sequence multi-unit work in LOGICAL (dependency) order: build the verifiable core before the integration/inline, each unit on a *proven* foundation, never a consumer atop an unproven dependency. → PRISM: [[feedback_build_comprehensive_route]] + [[feedback_build_in_logical_order]]; pairs with `comprehensive-build-enforce` hook + R12.
- **R14 — Close your tool calls.** Every `run_in_background` Bash task, Monitor, or detached process you spawn, you close — `TaskStop` it (or kill it) the moment its purpose is served, and verify none linger before Stop. Un-closed background tasks are the orphans the fleet-reaper must reap. -> PRISM: `stop-close-own-bg-tasks.mjs` (BLOCKS Stop on lingering bash) + [[feedback_close_background_tasks_at_stop]].
- **R15 — Build it once, build it whole, build it everywhere (WIRE → TEST → VALIDATE → APPLY-TO-ALL-GALAXIES).** Nothing you build is "done" until all four hold: (1) **WIRE** it to every dispatcher/consumer/surface that would naturally use it, in the same commit (no orphans); (2) **TEST** with real reference-value/algebraic-invariant tests — happy + ≥3 failure modes + ≥2 adversarial — round-tripped THROUGH the dispatcher, not just the singleton; (3) **VALIDATE** against LIVE data and prove the result with numbers/evidence, never "looks fine"; (4) **APPLY-TO-ALL-GALAXIES** — a general asset (tool/hook/skill/pattern/schema/script) must cover/serve EVERY galaxy with proven coverage, and a galaxy-specific one must be replicated (clone-don't-fork) to every galaxy that shares the need. Partial/one-galaxy delivery is a `[SCOPED]` exception only. → PRISM: the per-build checklist form of R13; pairs with §ENGINE WIRING (wire to ALL sources) + `comprehensive-build-enforce` + `stop_on_unwired_assets`; [[feedback_wire_test_validate_all_galaxies]]. (operator directive 2026-06-04)
- **R16 — Never one-shot; loop until gaps closed + fit the whole (FLEET-WIDE, operator directive 2026-06-18).** A first build pass ALWAYS leaves gaps (edge cases, error paths, conflicts, integration seams) — surface them EARLY via gap-closing loops until no logical gap remains, not after they bite downstream. BEFORE "done", ASSESS + COMPARE the new work against ALL existing built systems (`master_index_query` + `duplicationGuard` + `/impact` blast-radius) so it FITS PERFECTLY — no duplicate, no conflict, no orphan. "Looks done" on pass 1 is not done. The per-build LOOP form of R13/R15; auto-enforced via `comprehensive-build-enforce` (BUILD item 6). → [[feedback_loop_until_gaps_filled]] · sibling [[feedback_always_fill_gaps]]

---

## FAST RESOURCE LOOKUP (zero-IO file discovery)

### Digest Files (pre-computed indexes — counts auto-refresh; do NOT trust the numbers cached in this table, read the file head)
| Digest | Contents | Path |
|--------|----------|------|
| ENGINE_DIGEST.md | engines, 1-line each | `mcp-server/data/docs/` |
| DISPATCHER_DIGEST.md | dispatchers + action counts | `mcp-server/data/docs/` |
| DIRECTORY_DIGEST.md | directories with purposes | `mcp-server/data/docs/` |
| CODE_SYSTEM_INDEX.json | shortcode→path mappings | `mcp-server/data/docs/` |
| PRISM-INVENTORY-LATEST.md | Live counts (auto-refreshed) | `H:/prism/` |

### DSL Shortcodes (use in output to save tokens)
- `E####: Name` → `src/engines/Name.ts`
- `D##: Name` → `src/tools/dispatchers/Name.ts`
- `A##: Name` → `src/algorithms/Name.ts`
- `T####: Name` → `src/__tests__/Name.test.ts`

Resolve: `/code-index lookup <shortcode>` or `codeSystemIndexEngine.resolve()`

### Quick Path Reference
| Resource | Path |
|----------|------|
| Physics constants | `mcp-server/src/physics/constants.ts` |
| Schemas | `mcp-server/src/schemas/*.ts` |
| Registries | `mcp-server/src/registries/*.ts` |
| Hooks (source) | `mcp-server/src/hooks/*.ts` |
| Hooks (Claude) | `.claude/hooks/*.mjs` |
| Skills (user) | `~/.claude/commands/*.md` |
| Skills (project) | `.claude/commands/*.md` |
| State (shared) | `state/shared/*.md` |
| Handoffs | `state/shared/handoffs/HANDOFF-*.md` |
| JM Die programs | `JM DIE/` |

---

## AI SYSTEM ROUTING
Default route: Claude for deep reasoning + safety; Ollama qwen2.5-coder:32b for code explain/summarize/docstring/classify/lint (gpt-oss:120b for deep local reasoning); Docker batch-processor for >100 files; `prism_calc` dispatcher for physics; `prism_safety:validate_physics` for safety gates; `prismCreativeReasoningEngine` for cross-domain synthesis.

**Engine APIs (direct):** `aiSystemRouterEngine.route(task)` · `prismSelfAwarenessEngine.{recommendAIFeatures,searchTribalKnowledge}(q)` · `prismCreativeReasoningEngine.explore(prob,"optimal")` · `duplicationGuardEngine.mustCheckBeforeCreating({...})` (THROWS on dup).

**Dispatchers:** `prism_calc` (physics) · `prism_cam` (toolpath) · `prism_ai` (reasoning) · `prism_safety` (S(x)) · `prism_dev` (build/test) · `prism_session` (context) · `prism_memory` (store). Full map with action counts: `DISPATCHER_DIGEST.md` or `prism_session:dispatcher_map_compact`.

---

## DEVELOPMENT SKILLS
~440 skills auto-injected at SessionStart (full list in system reminders). Triggers when keywords match. Most-used: `/dedup` (before any new asset), `/forge-triple` (engine+skill+hook), `/scrutinize` (milestone review), `/handoff` (session end), `/precompact` (before /compact). Domain studios: `/wire-edm-studio` `/lathe-studio` `/quote-to-ship` `/pdf-learn` `/video-learn` `/shop-knowledge`.

---

## HOOK ENFORCEMENT GATES
See `H:/PRISM/CLAUDE.md` §ENFORCEMENT and §SCRUTINY GATE — duplicating here would rot. Hook source of truth: `H:/.claude/settings.json` + `H:/PRISM/.claude/hooks/`. Key Stop hooks every chat must know: `scrutinize-before-stop`, `enforce-handoff-topic`, `error-pattern-promote`, `leave-a-copy-behind-guard`, `stop_on_failing_tests`, `stop_on_unwired_assets`, `stop_on_uncommitted_critical`. Key PreToolUse: `file-claim-guard` (blocks edits to peer-claimed files), `duplication-hard-block` (blocks duplicate engine creation), `comprehensive-build-enforce` (blocks stub/partial work). UserPromptSubmit auto-injects: `wiki-precheck-inject` (top-3 wiki entries on keyword match), `inventory-check-guard`, `chat-bus-inject`.

---

## MULTI-AGENT PATTERNS

### For Builds (spawn team)
```
builder + physics-reviewer + test-reviewer + code-reviewer
```

### Available Agents (subagent_type)
`build-doctor` · `catalog-enricher` · `dispatcher-wirer` · `physics-reviewer` · 
`test-runner` · `regression-hunter` · `forge-team` · `pipeline-team` · `test-team`

### Coordination
- Lock: `DistributedLockManager.withLock(resource, fn)`
- Claims: `mcp-server/data/claims/<unit>/claim.json`
- Workboard: `state/shared/AGENT_WORKBOARD.md`
- Chat: `state/shared/AGENT_CHAT.md`

---

## SAFETY RAILS (ALWAYS ENFORCED)

- **UNITS FIRST — resolve inch vs mm from the SOURCE before ANY geometry/tool/holder/feed/stock/program work.** Never assume; a units mismatch is a **25.4× scale error** (kilo built a part in metric while it was in inches → tool + holder 25.4× too big). Sources: NC `G20`/`G21`, STEP `CONVERSION_BASED_UNIT 0.0254`(inch)/`SI_UNIT(.MILLI.,.METRE.)`(mm), CAD/CAM setup unit, tool-library `"unit"` field, print title block. Unknown/ambiguous → **STOP and verify**. JM Die convention is INCH — still verify per part. Guard: `scripts/lib/units-guard.mjs` (`requireUnits` throws if unknown, `assertUnitsMatch` throws on mismatch, `scaleAnomaly` flags the mislabel). → [[feedback_check_units_first]]
- **NEVER inline physics constants** — import from `src/physics/constants.ts` (canonical values live there only; do not duplicate in docs)
- **NEVER create stub engines** — hook blocks placeholder returns
- **Run affected tests** after engine modifications
- **Check ENGINE_DIGEST.md** before creating new engines

---

## GOLF SLOT (dedicated hygiene chat — position 7 of 26 in NATO sequence)
The dedicated hygiene chat slot. `golf` is position 7 of the 26-slot NATO sequence (`alpha..zulu` per `SLOT_NAMES` in `H:/prism/.claude/helpers/chat-slots.mjs`; expanded 13 → 26 on 2026-05-19 via SLOT-RECLAIM commit `ed5c49044b`). Reserved for **fleet hygiene** — not feature work. Claim with `/checkin --golf`; lives alongside the 25 work slots (`alpha..foxtrot, hotel..zulu`). The "7th hygiene chat" historical name is from the original 7-slot fleet; role + position unchanged through every expansion.

1. **Write-allowlist (A5) — DOC-CORRECTED 2026-06-09: UNWIRED.** `golf-slot-write-allowlist.mjs` is preserved on disk (never-delete-only-disable) and *would* hard-block every Edit/Write outside `FALLBACK_ALLOW` (`state/shared/dashboards/**`, named ledger jsonls, named report dashboards, `AGENT_CHAT.jsonl`, `golf-*.json`, `.cron-locks/*.lock`, `state/shared/system-viz/staging/**`, `mcp-server/data/state/**.log`) — but it has **0 refs in settings.json** (verified 2026-06-09) and does NOT fire. Golf currently operates as a normal work slot (2026-05-20 operator directive); don't trust this as a live guard until re-wired.
2. **Self-DOS deny (B4)** — golf can't disable its own watchdog/audit/cron/allowlist; kill switch is operator-only.
3. **Heartbeat** — no separate file (R3-UU2). Reuses `chat-slots.json` `lastHeartbeat`. Query via `node .claude/helpers/chat-slots.mjs golf-liveness` (B8) — returns `{status, isAlive, ageMs, staleThresholdMs, crashedThresholdMs}`.
4. **Audit query** — `/peer-audit` (planned B4) surfaces recent golf activity.
5. **Kill switch** — *(planned)* `PRISM_GOLF_DISABLE=1` will disable golf cron + flip allowlist to deny-all. Today: `PRISM_GOLF_FAIL_CLOSED=1` hardens the allowlist to deny-all; bypass via `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` (logged). Emergency only.
6. **Handoff naming (A4)** — golf writes `HANDOFF-golf-<task>.md` (slot-keyed). Read/write via `per-agent-handoff.mjs --slot golf`.
7. **Schema-bump cadence** — bump `chat-slots.json schemaVersion` only on `SLOT_NAMES` change or field rename; rebuild stale slot files, never silently migrate.
8. **Multi-host coexistence** — golf is a *role*, not a host-pin. One machine: full 26-slot fleet (`alpha..zulu`). Different machines may each run their own golf (per-host lock files, no cross-host contention).

## SESSION HYGIENE

- **Commit format**: `[SCOPE]/U-ID: title`
- **Always `/handoff`** at session end
- **Let auto-compact fire at the threshold** — trust it and keep delivering; `/compact` / `/precompact` are seamless resets, never a delivery stop (R6)
- **Read per-agent handoff** at session start (not legacy singular)

---

## ONE-GLANCE CHECKLIST (every task)

```
[ ] Read THIS chat's HANDOFF via per-agent-handoff.mjs
[ ] Use RTK prefix on all bash commands
[ ] Check dispatcher actions before building new
[ ] Use duplicationGuardEngine before creating assets
[ ] Route to Ollama what can be handled locally
[ ] Parallel independent tool calls (one round-trip)
[ ] Stay on user's goal (Karpathy checkpoint)
[ ] /handoff at session end
```

---

## PRISM WIKI (Karpathy LLM-Wiki pattern — adopted 2026-04-27)
Compounding markdown wiki at `H:/prism/knowledge/wiki/`. Query `wiki/index.md` (722 entries) BEFORE re-deriving from digests. Ollama owns ≥70% of maintenance (summarize, lint, embed). Claude owns synthesis. Full protocol: `H:/prism/WIKI_SCHEMA.md`. Skills: `/wiki-ingest /wiki-query /wiki-lint /wiki-morning /wiki-bootstrap` (last skills ship in U-WIKI06).

## JM DIE TEST SHOP
Root: `H:\PRISM\JM DIE\` (counts live in `jm-die-profile.ts`). 
Profile: `jm-die-profile.ts`. Direct API via `prismSelfAwarenessEngine.getJMDieCustomerPath()`.

## ENFORCEMENT (PRISM-specific gates in project CLAUDE.md)
PRISM has 25+ wired HARD BLOCK hooks (`H:/.claude/settings.json`, `continueOnError: false`). Read `H:/PRISM/CLAUDE.md` §ENFORCEMENT GATES — comply on first try; the blocks are deterministic, retries waste tokens. Key axes: build discipline (no stubs/facades/placeholder tests), duplication guard, multi-chat lane discipline (own worktree+branch+scope, post to chat bus before editing, never commit peer-claimed files), asset preservation (never delete settings/hooks/skills, never soften gates).

@RTK.md

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->