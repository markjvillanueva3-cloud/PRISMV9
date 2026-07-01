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
| `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (+ `.md` atlas) | The 3 most-important resource roots (`H:/PRISM/resources`, `H:/PRISM/JM DIE`, `H:/PRISM/Docustrata`) - every galaxy PATHS.md carries a marked pointer (operator directive 2026-05-30). Pathway = root + its own index; never re-OCR Docustrata (search `manifest.json` + `.index/`). Re-wire all galaxies: `node scripts/wire-galaxies-to-resource-roots.mjs`. Wiki [[critical-resource-roots]]; memory reference_critical_resource_roots_2026_05_30. |
| `mcp-server/data/vendor-catalog-db/` (manifest + tables) | Persisted vendor catalog corpus (Charlie's VENDOR-NETWORK-MS0): 425 vendors + 77 catalog-vendors + 131 SFC-maker pointers + JM procurement ($4.91M). Consolidated from gitignored `state/shared/quoting/` via `node scripts/build-vendor-catalog-db.mjs` (re-run after Charlie regenerates). Metadata only — oscar owns SFC cutting-data `.ts`. Wiki [[vendor-catalog-db]]; memory reference_vendor_catalog_db_2026_05_31. |
| `state/shared/RECENT-SHIPMENTS-<date>.md` | **Inbox** of milestones shipped recently that do NOT yet have a CLAUDE.md summary section. Sister pattern to `## Recent regressions`. A golf-slot chat batches them into full sections on a weekly drain cadence. Current file: `state/shared/RECENT-SHIPMENTS-2026-05-18-19.md`. |
- 2026-06-30 | **add feature-based non-cut budget (tool-change + approach/retract/air-cut + per-setup handling) to the MRR cycle-time path -- was chip-tim...** | observed-in: 778d3795d | fix: see commit | verify: `git -C H:/prism show 778d3795d`
- 2026-06-28 | **[MAIN-FORCE] [POST-PROCESSOR]/U-PP-OKUMA-GROOVE-CITE-FIX (slot:echo): R12 -- correct conflated groove/cutoff file citations (scrutiny arm...** | observed-in: 7d27a45ff | fix: see commit | verify: `git -C H:/prism show 7d27a45ff`
- 2026-06-28 | **[MAIN-FORCE] [RBA]/U-RBA-LIVE-VALIDATE (slot:india): live-validate the reason-before-action gate + fix a heavy-default SILENT NO-OP** | observed-in: f7dbefdef | fix: see commit | verify: `git -C H:/prism show f7dbefdef`
- 2026-06-28 | **[MAIN-FORCE] [VAULT-IMPROVE]/U-SIERRA-WIKI-NLI-VERIFIED (slot:sierra): enrich detector lesson -- deepseek-r1:14b verified SLOWER than gpt...** | observed-in: ac79fcf17 | fix: see commit | verify: `git -C H:/prism show ac79fcf17`
- 2026-06-28 | **[MAIN-FORCE] [POST-PROCESSOR]/U-PP-ROUGHING-LEAD-CORRECT (slot:echo): R12 self-correct -- on Okuma OSP G71 is the THREADING cycle (.cps +...** | observed-in: 966414740 | fix: see commit | verify: `git -C H:/prism show 966414740`
- 2026-06-28 | **[MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-DELTA-CADGEN-SPARKGAP-P2 (slot:delta): fix the ROOT cause -- stopword over-matching in the CAD trib...** | observed-in: a4f85b6ce | fix: see commit | verify: `git -C H:/prism show a4f85b6ce`
- 2026-06-28 | **[MAIN-FORCE] [POST-PROCESSOR]/U-PP-DWELL-R15-AUDIT (slot:echo): R15 apply-to-all audit confirms the Okuma dwell-dialect fix is fleet-comp...** | observed-in: 646c8eac4 | fix: see commit | verify: `git -C H:/prism show 646c8eac4`
- 2026-06-28 | **[MAIN-FORCE] [POST-PROCESSOR]/U-PP-DWELL-LU3000-DOCS (slot:echo): doc the Okuma dwell-dialect fix + LU3000-unverified flag (wiki + regres...** | observed-in: 120df087a | fix: see commit | verify: `git -C H:/prism show 120df087a`
- 2026-06-28 | **[MAIN-FORCE] [SFC-ACCURACY]/U-SFC-MATERIAL-ALIAS (slot:oscar): fix 2 live-confirmed silent-wrong SFC material defects from the math-accur...** | observed-in: 3acb65093 | fix: see commit | verify: `git -C H:/prism show 3acb65093`
- 2026-06-28 | **[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-TRIBAL-DISTRIBUTED-PAGES (slot:whiskey): distribute vision page sampling across vendor catalogs (...** | observed-in: 844221d92 | fix: see commit | verify: `git -C H:/prism show 844221d92`
- 2026-06-28 | **[MAIN-FORCE] [HOTEL-ERP-WIRING]/U-ERP-SCHEDULE-ROUTES (slot:hotel): wire Kienzle Scheduling page feeds + fix 2 optimizer crash bugs** | observed-in: 2b1adb6c8 | fix: see commit | verify: `git -C H:/prism show 2b1adb6c8`
- 2026-06-28 | **[MAIN-FORCE] [SFC-DB-WIRING]/U-OSC-SFC-MATERIAL-DATALIST (slot:oscar): DB-back SpeedFeedPage material input via datalist + ISO/hardness c...** | observed-in: 544279706 | fix: see commit | verify: `git -C H:/prism show 544279706`
- 2026-06-27 | **[MAIN-FORCE] [BRAIN-REFRESH]/U-SIERRA-BRAIN-STEP-HEAP (slot:sierra): fix false brain-FAILED:vault-links overnight alarm -- heap-cap-starv...** | observed-in: 1909e10ae | fix: see commit | verify: `git -C H:/prism show 1909e10ae`
- 2026-06-27 | **[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-ECONOMY-REGRESSION-LOG (slot:whiskey): log "74% uneconomical = flag artifact" to CLAUDE.md Recent...** | observed-in: 04b5d8f12 | fix: see commit | verify: `git -C H:/prism show 04b5d8f12`
- 2026-06-27 | **[MAIN-FORCE] [QUOTING-SYNERGY]/U-QOW-DOC-TRUTH-RECONCILE-FIX (slot:charlie): 3-of-3 arm-C fixes on the doc-reconcile (R12 self-correct)** | observed-in: 92e957e1a | fix: see commit | verify: `git -C H:/prism show 92e957e1a`
- 2026-06-27 | **[MAIN-FORCE] [BRAIN-REFRESH]/U-SIERRA-BRAIN-ROLLUP-FRESH (slot:sierra): fix false brain-refresh FAILED SessionStart alarm** | observed-in: 6defbde42 | fix: see commit | verify: `git -C H:/prism show 6defbde42`
- 2026-06-27 | **[MAIN-FORCE] [FLEET-HYGIENE]/U-TASKHEALTH-OVERNIGHT-STALE-FIX (slot:golf): fix fleet-task-health watchdog false-flagging overnight-window...** | observed-in: 998d16be1 | fix: see commit | verify: `git -C H:/prism show 998d16be1`
- 2026-06-27 | **[MAIN-FORCE] [FLEET-HYGIENE]/U-OLLAMA-LOCALHOST-PROBE-FIX (slot:golf): fix fleet-wide false 'Ollama down' — 20 hook/script probes used lo...** | observed-in: 010b8943b | fix: see commit | verify: `git -C H:/prism show 010b8943b`
- 2026-06-27 | **[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-ORCH-FORCE-PARITY-TEST (slot:oscar): track the force-parity proving test (3-of-3 P0 fix)** | observed-in: 8e6383290 | fix: see commit | verify: `git -C H:/prism show 8e6383290`
- 2026-06-27 | **[MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-DELTA-FUSION-TEST-NUANCE (slot:delta): R12 auto-fix -- Fusion bridge HAS 5 mocked tests incl units-...** | observed-in: 1a4e1b477 | fix: see commit | verify: `git -C H:/prism show 1a4e1b477`
- 2026-06-26 | **[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-GEOMCOMPARE-TESTS (slot:delta): first test suite for the untested CADGeometryComparisonEngine + fix A...** | observed-in: 202ce9969 | fix: see commit | verify: `git -C H:/prism show 202ce9969`
- 2026-06-26 | **[MAIN-FORCE] [POST-PROCESSOR]/U-PP-LATHE-GOLDEN-SNAPSHOT (slot:echo): golden-NC regression backstop -- byte-lock the OkumaB250 lathe mast...** | observed-in: aa904076a | fix: see commit | verify: `git -C H:/prism show aa904076a`
- 2026-06-26 | **[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-ANALYZE-OVERFLOW-FIX (slot:delta): fix cad-analyze-step inspect stack-overflow on large NURBS** | observed-in: 88c20606b | fix: see commit | verify: `git -C H:/prism show 88c20606b`
- 2026-06-26 | **[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-QCRON-LIVEGAP-SIGNAL (slot:quebec): repair FE-BE wiring cron's LF1 consumer + gate regression on ...** | observed-in: 30c17bb26 | fix: see commit | verify: `git -C H:/prism show 30c17bb26`
- 2026-06-26 | **[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-MACHINELIVE-METHOD-FIX (slot:quebec): fix machineLive client GET->POST method mismatch (2 dead wi...** | observed-in: 42f2ac7a5 | fix: see commit | verify: `git -C H:/prism show 42f2ac7a5`
> _Recent-commits log moved to [`state/shared/CLAUDE-MD-COMMIT-LOG-ARCHIVE.md`](state/shared/CLAUDE-MD-COMMIT-LOG-ARCHIVE.md) (token-injection slim, U-ALPHA-CLAUDEMD-SLIM 2026-06-11) -- it was a raw `git log` with no doctrine value. Full history: `git log`._
| `knowledge/memories/feedback/feedback_psn_definition.md` | **PSN canonical 11-leg taxonomy** (Obsidian brain · PRISM OS · Wiki · Memories · Tribal · System Viz · Engines · Algorithms · Formulas · NN/GNN · PRISM AI). Every PSN-aware tool refers here for the leg list + invocation paths + health signals. Created 2026-05-24 (slot:golf) to fix broken `[[feedback_psn_definition]]` pointer in MEMORY.md. |
| `knowledge/memories/feedback/feedback_commit_to_slot_worktree.md` | **Slot-worktree commit discipline** — every chat commits in `H:/prism-slot-<nato>` on `slot/<nato>` branch, NOT shared `H:/prism`. Shared-tree commits get absorbed into peer commits (attribution lost — 3 absorbed in a single golf session 2026-05-24). Enforcement hooks `PRISM_WORKTREE_ROUTE_ENABLE` / `_GIT_ADD_LANE_ENABLE` / `_MAINTREE_WRITE_BLOCK_ENABLE` arm once `chat-slots.json[slot].branch` starts with `slot/`. |

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
   It emits three reviewer prompts in the JSON output: `opusReviewerPrompt` (arm A), `opusReviewerPromptB` (arm B), `analystReviewerPrompt` (arm C). (The diff is captured with a 120 s git timeout — was 8 s, which timed out on this repo — and excludes auto-regenerated noise dirs; `PRISM_SCRUTINY_GIT_TIMEOUT_MS` / `PRISM_SCRUTINY_NO_DIFF_FILTER=1` override.) An optional Ollama pre-flight (deepseek-r1:14b) runs as an advisory arm only — does NOT block the 3-of-3. An optional **Codex CLI review arm** (`codex exec review`, default-on; `PRISM_SCRUTINY_CODEX=off` disables) is surfaced the same way: the JSON output carries a `codexReviewCommand` that the chat runs via Bash in parallel with the three Claude agents. Advisory only — it never marks the ledger and degrades to `skipped` on any Codex quota/auth/offline failure, so it cannot stall the gate (the failure mode that retired Codex *as a gate arm* 2026-05-13). Added 2026-05-18; wiki [[codex-review-arm]].
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

## PER-CHAT HANDOFF (UP TO 26 CONCURRENT CHATS — 25 work + 1 hygiene)
We run up to **26** concurrent Claude sessions across the full NATO sequence **alpha..zulu** (SLOT-RECLAIM expanded 13 → 26 on 2026-05-19): 25 work slots + 1 hygiene slot (`golf`, see §GOLF SLOT). Source of truth: `SLOT_NAMES` in `.claude/helpers/chat-slots.mjs` — never hard-code the count, always read the array length per [[feedback_fleet_design_10_chats]]. Each chat has its OWN handoff — **never write to `state/HANDOFF.md` (legacy singular)**. Golf chats produce slot-keyed filenames (`HANDOFF-golf-<task>.md`) via `--slot golf` per U-CLEANUP-A4; work chats stay instance-keyed.

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

### PER-SLOT WRAPPERS (2026-05-16, AUDIT-SYNERGY-MS0; fleet expanded to 26 on 2026-05-19)
**78** slash-command wrappers `/{precompact,handoff,startup}-<slot>` × **26** NATO slots (alpha..zulu) mirror the existing `/checkin-<slot>` pattern: force-take slot → bind topic `<slot>-work` → delegate to canonical `/precompact`, `/handoff`, or `/startup` pipeline. Each wrapper is ~30 lines, generated from a single template by `scripts/generate-per-slot-wrappers.mjs` (idempotent — re-runnable safely). Use when a chat-slot binding must be explicit (different terminal window, post-/compact drift, force-take from a dead peer). The wrappers are thin — the canonical pipeline body lives in the bare slash command. **Slot expansion history:** Slot 13 (`mike`) added 2026-05-16 per operator directive "add a 13th chat slot…"; subsequent SLOT-RECLAIM milestone (commit `ed5c49044b`) expanded `SLOT_NAMES` 13 → 26 (alpha..zulu) on 2026-05-19. Wrapper generation: re-run `scripts/generate-per-slot-wrappers.mjs` after any future expansion.

### HTML-FOR-MD (2026-05-16, AUDIT-SYNERGY-MS0)
`mdToHtml(filePath, opts)` exported from [`scripts/lib/html-report-render.mjs`](scripts/lib/html-report-render.mjs) renders any markdown source (MEMORY.md, CLAUDE.md, handoffs, wiki leaves) as a standalone HTML5 page using the existing PRISM dark-theme renderer. CLI: `node H:/prism/scripts/md-to-html.mjs <input.md> [--out <out.html>] [--toc] [--title "..."]`. Minimal parser (headings/lists/tables/code-fences/links/blockquote/bold/italic/inline-code), silent-fail on read error, javascript: URI XSS guard. Tests: `scripts/lib/md-to-html.test.mjs` (16 cases via node:test).

### PER-SLOT-CLAIM-MS0 (2026-05-16 — 6/6 shipped) — per-slot UNIT claims
Lane assignment in `atomic-roadmap.json` is *advisory*; this milestone adds enforceable per-slot unit locks so two slots never race-build the same `MILESTONE::U-ID`. Store: `state/shared/slot-task-claims.json` (lockfile-guarded atomic RMW — NOT the H8 SQLite, which won't resolve from `.claude/helpers/`). CLI: `node H:/prism/.claude/helpers/slot-task-claim.mjs {claim|release|heartbeat|list|check|sweep}`. `/pick-unit --slot S --chatId C` filters peer-claimed units (identity-gated — no `--chatId` = legacy no-filter behavior). `/checkin` Step 12 autonomous loop claims-on-pick + heartbeats-on-tick; the `.git/hooks/post-commit` U-PSC04 block auto-releases on `[SCOPE]/U-ID` commit subject. Stop hook `stop-slot-task-claims-advisory.mjs` (wired Stop[0].hooks[12]) surfaces held claims at session end. Forward-only phase (claimed→building→testing→committing); corrupt/schema-mismatch store → readOnly refuse-write (never silently clobbers a peer). Knobs: `PRISM_SLOT_TASK_ADVISORY_{DISABLE,VERBOSE,THROTTLE_MS}` (the documented `PRISM_SLOT_TASK_CLAIM_DISABLE=1` knob was never implemented in `slot-task-claim.mjs` — removed 2026-05-17 by OBSOLESCENCE-CLEANUP-MS0/U-OBS-C1 to prevent operators relying on a no-op). 64 tests (41 unit + 5 concurrent-race E2E + 10 post-commit + 8 advisory). Memory: [[reference_per_slot_claim_ms0_2026_05_16]]. Wiki: [`knowledge/wiki/architecture/per-slot-claim-ms0.md`](knowledge/wiki/architecture/per-slot-claim-ms0.md).

**HOOK-SYNERGY-MS0 (11 units shipped 2026-05-12..13)** — cross-worktree firewall, hook creation gate, settings dedup audit, hook registry reader, latency envelope, tier frontmatter, hook compression / shared duplication-guard, SQLite WAL coordination store, async hook dispatcher, IPC for hook queries, fast-lane matcher split. Full details + dispatcher actions + knobs at [`knowledge/wiki/architecture/hook-synergy-ms0.md`](knowledge/wiki/architecture/hook-synergy-ms0.md) (U-CLEANUP-D1). Memory: [[reference_h7_async_hook_dispatcher]], [[reference_h8_coordination_store]], [[reference_u_coord11_ipc]].

## SESSION CONTINUITY STACK (2026-05-15) — terminal-pin + auto-resume on /compact + auto-precompact + per-subagent pre-search across the up-to-13-chat fleet. Wiki: [[session-continuity-stack]] · [[subagent-per-task-presearch]]. Memory: [[reference_session_continuity_stack_2026_05_15]] · [[reference_twid_resolver_cache_2026_05_15]] · [[reference_precompact_hook_autowrite_2026_05_15]] · [[feedback_fleet_design_10_chats]] · [[feedback_reflect_all_changes_post_update]].

## GOLF SLOT (dedicated hygiene chat — CLEANUP-MS0; position 7 of 26 in NATO sequence)
PRISM's dedicated hygiene chat slot — `golf` is position 7 of the 26-slot NATO sequence (`alpha..zulu` per `SLOT_NAMES` in `.claude/helpers/chat-slots.mjs`). Reserved for **fleet hygiene** — not feature work. Operators claim it with `/checkin --golf`; it sits alongside the 25 work slots (`alpha..foxtrot, hotel..zulu`) without competing for them. The "7th hygiene chat" historical name refers to its position when the fleet was 7 slots (alpha..golf, mid-2026-05-15); the role + position-in-sequence are unchanged through every expansion (7 → 10 → 12 → 13 → 26).

1. **Write-allowlist (U-CLEANUP-A5) — DOC-CORRECTED 2026-06-09: the hook is UNWIRED, do NOT rely on it as a live guard.** `golf-slot-write-allowlist.mjs` is preserved on disk (never-delete-only-disable) and *would* hard-block every Edit/Write/MultiEdit from a golf chat outside the `FALLBACK_ALLOW` set (`state/shared/dashboards/**`, named ledger JSONLs, named report dashboards, `AGENT_CHAT.jsonl`, `golf-*.json`, `.cron-locks/*.lock`, `state/shared/system-viz/staging/**`, `mcp-server/data/state/**.log`) — but it has **0 refs in all three settings.json** (verified 2026-06-09; control `golf-slot-reaper-guardian` = 2), so it does NOT fire. "Feature commits from golf are impossible by design" was the *intent*, not current reality. Golf currently operates as a normal work slot (per the 2026-05-20 operator directive). Re-wire the hook (and flip this note) if golf write-confinement is reinstated.
2. **Self-DOS deny (U-CLEANUP-B4)** — a golf chat may NOT disable its own watchdog/audit/cron/allowlist. Kill switch (#5) is operator-only; a golf chat that tries to clear its own gates is blocked at PreToolUse.
3. **Heartbeat** — no dedicated heartbeat file (R3-UU2). Liveness is the same `chat-slots.json` `lastHeartbeat` as work slots, queried via `node .claude/helpers/chat-slots.mjs golf-liveness` (U-CLEANUP-B8) — returns `{status, isAlive, ageMs, staleThresholdMs, crashedThresholdMs}` already classified.
4. **Audit query** — `/peer-audit` (planned U-CLEANUP-B4) surfaces what the golf chat has touched recently (chat-slots activity + AGENT_CHAT.jsonl + golf-envelope-mutations.jsonl).
5. **Kill switch** — *(planned, U-CLEANUP)* `PRISM_GOLF_DISABLE=1` will disable all golf-side cron + flip the allowlist to "deny all writes from a golf chat". For an immediate operator emergency today: `PRISM_GOLF_FAIL_CLOSED=1` (already wired in `golf-slot-write-allowlist.mjs`) hardens the allowlist to deny-all; bypass is `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` (logged).
6. **Handoff naming (U-CLEANUP-A4)** — golf chats write `HANDOFF-golf-<task>.md` (slot-keyed), not `HANDOFF-<claude-id>-<topic>.md` (instance-keyed). Use `per-agent-handoff.mjs --slot golf` to read/write.
7. **Schema-bump cadence** — bump `chat-slots.json` `schemaVersion` only when `SLOT_NAMES` changes or `SlotState` fields rename. Rebuild stale slot files on bump; never silently migrate.
8. **Multi-host coexistence** — golf is a *role*, not a host-pin. One machine may host the full 26-slot fleet (`alpha..zulu`) together. Different machines may each run their own golf (lock files are per-host, no cross-host contention).

Skills + commands referencing golf: `/checkin --golf` · `node .claude/helpers/chat-slots.mjs golf-liveness` · `per-agent-handoff.mjs --slot golf` · `node scripts/fleet-status.mjs` (renders golf as a separate "hygiene" row).

## ENGINE WIRING — WIRE TO ALL SOURCES (2026-04-28)
> **R15 — Build it once, build it whole, build it everywhere (operator directive 2026-06-04).** ANYTHING you build (engine, hook, skill, script, schema, pattern) is "done" only after **WIRE → TEST → VALIDATE → APPLY-TO-ALL-GALAXIES**: (1) wire to every natural consumer in the same commit (no orphans); (2) real reference-value/invariant tests — happy + ≥3 failure + ≥2 adversarial, round-tripped through the dispatcher; (3) validate on LIVE data with numbers, never "looks fine"; (4) a general asset must cover/serve EVERY galaxy with proven coverage, a galaxy-specific one is cloned (not forked) to every galaxy that shares the need. Partial/one-galaxy = `[SCOPED]` only. Enforced by `comprehensive-build-enforce` + `stop_on_unwired_assets` + per-file 2-arm scrutiny. [[feedback_wire_test_validate_all_galaxies]].

When generating an engine, do NOT stop at one dispatcher. Wire to **every dispatcher that would naturally consume it**, in the same commit. Examples:
- New memory engine → `prism_memory` AND specialized consumer (e.g. `prism_guard:error_ledger_*`)
- New physics engine → `prism_calc` AND `prism_safety` (if it computes safety-relevant)
- New CAM engine → `prism_cam` AND vendor-specialized (mastercam, hypermill, etc.)
- New reasoning engine → `prism_ai` AND `prism_intelligence`

Verification:
- `stop-auto-wire.mjs` (Stop hook, NOW WIRED) audits new engines/hooks/skills, warns on missing dispatcher refs.
- `stop_on_unwired_assets.mjs` is the transcript-scoped orphan-block for NEW engines (an R15 enforcer) — but it is **currently bypassed fleet-wide by `PRISM_ALLOW_UNWIRED=1`** (the 2026-05-24 YOLO-bypass cluster, `settings.json:45`) AND has 0 direct settings.json Stop-block refs. It is preserved on disk + validated (`.claude/hooks/__tests__/stop_on_unwired_assets.wiring.test.mjs`, 4/4 — proves it blocks a real orphan when the flag is off), so it is **ready to arm** once the bypass is lifted and it is added to the Stop block. Until then the "no-orphans" guarantee is advisory, not enforced (R12: do not assume it fires). Known false-positive history: [[reference_stop_unwired_assets_false_positive_2026_05_23]] — re-verify before arming.
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

## KNOWLEDGE VAULT (U-VAULT01, 2026-05-15) — memory + wiki + commands + handoffs + specs. CLAUDE.md is the doctrine POINTER INDEX (≤200 lines), NOT a 6th namespace. Promotion: fleeting → memory → wiki → CLAUDE.md pointer. Schema: [`knowledge/wiki/architecture/knowledge-vault-schema.md`]. Bug-finding→wiki gate hook: `stop-bug-finding-wiki-gate.mjs` (advisory). Memory: [[reference_u_vault01_knowledge_vault_schema]] · [[feedback_always_update_wiki_on_bug_finding]].

## WIKI PROTOCOL (Karpathy LLM-Wiki — see `WIKI_SCHEMA.md`)
PRISM has a compounding markdown wiki at `H:/prism/knowledge/wiki/`. **Query it before re-deriving.**
- `wiki/index.md` — 722-entry catalog (575 engines + 90 dispatchers + 57 memories), maintained by `WikiIndexMaintainerEngine`
- `wiki/log.md` — chronological audit (`grep '^## \[' wiki/log.md | tail -10`)
- `wiki/{concepts,entities,decisions,patterns,trajectories,lessons,code-tribal,architecture,software-engineering,ux-design}/`
- **Ollama owns ≥70% of wiki maintenance** (summarize, suggest cross-refs, lint candidates, embed)
- **Claude owns synthesis, contradiction resolution, schema evolution**
- Multi-chat: all wiki writes acquire `prism_context:claim_file` lock; log entries carry `by:claude-{id}` attribution
- Full protocol: `H:/prism/WIKI_SCHEMA.md` (3 layers · 3 ops · 2 index files · frontmatter spec · multi-chat rules · deprecation path)

## DECISION CROSSROADS -> BRAINSTORM-WORKFLOW (auto, 2026-05-30)
At a genuine **crossroad** (>=2 valid paths, real/irreversible consequences, no obvious default) **auto-run the `brainstorm-path-forward` multi-agent Workflow** -- don't guess one path or ask a bare either/or. Fans out 5 strategic-lens agents (safety-first, root-cause, fastest-unblock, distributed-ownership, adversarial) -> 1 synthesis agent -> a dependency-ordered recommended path + operator-only decisions + immediate-safe-actions + risks. **Plain-text agents, NO JSON schema** (the default subagent can't reliably emit StructuredOutput -- [[reference_alpha_explore_agent_schema_incompat]]); on synthesis rate-limit or resume, re-pass the SAME `args.crossroad` (resuming without args re-runs blind). Template + trigger criteria: wiki [[crossroad-brainstorm-workflow]]. Doctrine: [[feedback_crossroad_brainstorm_workflow]]. Skip trivial decisions with an obvious default.

## CREATIVE REASONING
For complex problems, use cross-domain synthesis:
```typescript
import { prismCreativeReasoningEngine } from "mcp-server/src/engines/PRISMCreativeReasoningEngine.js";
const result = prismCreativeReasoningEngine.explore(problem, "optimal");
// Modes: conventional → exploratory → hybrid → innovative → optimal
```
**15 scientific domains** (control theory, materials science, robotics, ML, precision, etc.) · **120+ formulas/algorithms** (PID, LQR, Kalman, Johnson-Cook, NURBS, S-curve, CNN, K-means, Abbe error). Entry point: `CrossDisciplinaryDeepLearningEngine`.

<!-- Append-only log per Boris CLAUDE.md back-flow pattern. New entries at TOP. -->
<!-- Older entries archived to knowledge/wiki/lessons/claude-md-regression-log.md (drained by `scripts/claude-md-archive-regressions.mjs`). -->


## DEV PRODUCTIVITY HOOKS (2026-05-14) — 3 UserPromptSubmit injectors fire on slash-command keywords: `loop-iteration-inject` (`/loop`), `pick-prefresh-inject` (`/pick-unit`/`/pick-task`/`/checkin`/`/pick-build-close`), `goal-prereq-inject` (`/goal`). Knobs: `PRISM_LOOP_INJECT_DISABLE` · `PRISM_PICK_PREFRESH_DISABLE` · `PRISM_GOAL_PREREQ_DISABLE`. Companion artifacts: `.claude/helpers/loop-state.mjs`, `scripts/hook-health-check.mjs`, `/pick-build-close` skill. Wiki: [[dev-velocity-autotrigger]]. Memory: [[reference_dev_velocity_autotrigger]].

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

## GOAL-COMPLETE GATE (2026-05-13) — `.claude/hooks/goal-complete-gate.mjs` (Stop, Tier-0) blocks task completion if /goal was invoked this session AND `state/shared/CLOSE-OUT-CANDIDATES.json` is stale (>2h, knob `PRISM_GOAL_GATE_STALE_HRS`) OR untriaged candidates exist (must appear in last-30 commit bodies OR `CLOSE-OUT-DEFERRED.md`). Disable: `PRISM_GOAL_GATE_DISABLE=1`. Bypass (logged): `PRISM_GOAL_GATE_AUDIT_BYPASS=1`. Wiki: [[close-out-audit]].

## CLOSE-OUT AUTOMATION (2026-05-13) — `scripts/audit-close-out-candidates.mjs` surfaces silent close-out debt (shipped artifacts vs envelope `pending`). Skill: `/close-out-audit`. Hook: `.claude/hooks/close-out-audit-suggest.mjs` (UserPromptSubmit, advisory). Reports: `state/shared/CLOSE-OUT-CANDIDATES.{json,md}` (`advisoryOnly:true, mustHumanVerify:true`). Knobs: `PRISM_CLOSE_OUT_AUDIT_INJECT=0` · `PRISM_CLOSE_OUT_AUDIT_STALE_HRS=N` · `PRISM_CLOSE_OUT_AUDIT_K=N`. Wiki: [[close-out-audit]].

## MISC-TASKS INVENTORY (2026-05-16) — 318 orphaned incomplete tasks extracted across 912 transcripts + 504 handoffs + 25 debt files. Spec: `state/shared/specs/MISC-TASKS-INVENTORY.{json,md,html}` (advisory). Surfaced in /system-viz `ghost.misc_tasks` roost. Wiki: [[misc-tasks-extraction]]. Memory: [[misc-tasks-extraction-2026-05-16]].

## ROADMAP CONSOLIDATION (2026-05-16) — `scripts/consolidate-roadmaps.mjs` unifies MILESTONE_PROGRESS + roadmap-index + envelopes + BUILD_STATE + MISC-TASKS + prose-roadmap extraction. Spec: `state/shared/specs/ROADMAP-CONSOLIDATED.{json,md,html}` (849 milestones, 4497 pending, 26 wiring + 16 deep-integration bridges, advisory). Surfaced as /system-viz `ghost.bridge_synergy` roost. Wiki: [[roadmap-consolidation]]. Memory: [[roadmap-consolidation-2026-05-16]].

## /checkin-<nato> /loop <task> (2026-05-16) — single canonical entry: slot-claim → slot-worktree cutover → routing hooks → injection chain → roadmap pickup → autonomous-loop (`/checkin` Step 12) → slot-routed commits → auto-handoff across /compact. Detail: [[checkin]]. Wiki: [[checkin-loop-fullstack]]. Memory: [[checkin-loop-fullstack-2026-05-16]].

## MULTI-DOMAIN ACCESS (FLEET-WIDE, operator directive 2026-06-30 — every chat has full codebase access)
All 26 chat slots may access and work in ANY domain across the whole codebase — not only their specialty. The previous 9-slot any-domain limit is superseded; `ANY_DOMAIN_SLOTS` in `state/shared/CHAT-SLOT-DOMAINS.md` = all 26, and every soul carries `codebase_access: full` + `multi_domain: true`. **Prefer-own-domain-first still holds** (each slot LEADS its specialty by default; `domain_filter` is a focus hint, not a wall) — but a slot is no longer domain-BOUND. **Worktree/lane isolation is UNCHANGED** (`git-add-lane-guard`/`pre-edit-lane-guard`/`main-tree-write-block`/`slot-commit-worktree-enforce` gate the git TREE, not the domain); cross-domain work on the shared trunk lands via `[MAIN-FORCE]`, coordinated over chat-bus so peers don't double-build. → [[feedback_multi_domain_fleet_policy]] · `state/shared/CHAT-SLOT-DOMAINS.md`.

## NEVER IDLE — ALWAYS HUNT (FLEET-WIDE, operator directive 2026-06-18)
A chat slot NEVER answers "Idle." When its current unit is done it HUNTS down the ladder (descend only when the rung above is dry; PREFER own domain first): (0) finish in-flight work; (1) own-domain leftover/deferred (handoff/DELTA open-threads); (2) slot-task/priority queue + backlogged roadmaps (`loop-state.mjs next`, ROADMAP-CONSOLIDATED, PRISM-UNIFIED-ROADMAP); (3) **FIXES** (failing tests, tsc errors, `## Recent regressions` debt); (4) **WIRINGS** (`audit-unwired-engines.mjs`, BUILD_STATE NEEDS_WIRING); (5) **GHOST builds/wirings** (/system-viz ghost roosts, `master_index_query`); (6) **BACKLOG** (MISC-TASKS-INVENTORY; ALL 26 slots may expand to ANY domain here per the multi-domain policy above); (7) **ULTIMATE FALLBACK — transcript+chat reconciliation:** run `mine-galaxy-transcripts.mjs` / read the already-mined MISC-TASKS-INVENTORY (912 transcripts + 504 handoffs) + ROADMAP-CONSOLIDATED, reconcile promised-vs-shipped against the CURRENT build (BUILD_STATE/ENGINE_DIGEST/system-viz), then build/wire the gaps. **Use the existing miners — never read raw transcripts into Claude context (R5/Ollama-first).** Idle is valid ONLY when every rung is dry AND budget is RED (a spiral is the only other stop signal; context growth is NOT — R6). → [[feedback_slots_never_idle_always_hunt]] · [[feedback_loop_exhaustion_domain_fallback]] · [[feedback_any_domain_fallback_slots]]

## CLAUDE-FLOW TOOL POLICY (2026-05-28, slot:alpha)
`mcp__claude-flow__*` exposes ~200 tools, **mostly redundant** with PRISM natives. Stop wasting attention on them. The rule:

**REDUNDANT — use PRISM natives instead:**
| claude-flow | PRISM native |
|---|---|
| `swarm_*` / `agent_spawn` / `hive_mind_*` | 26-slot NATO fleet + SLOT-WORKTREE-MS0 + slot-tab-boot launcher |
| `memory_store / memory_search / memory_retrieve` | `prism_memory:*` + auto-memory + AgentDB-backed |
| `hooks_*` | 700+ live PRISM hooks in `.claude/hooks/` |
| `embeddings_search / embeddings_generate` (basic) | ONNX 384-d + HNSW (`embeddings_search` action via PRISM) |
| `autopilot_*` | `prism_atcs:*` (12 actions, file-system state machine) |
| `task_*` | TaskCreate native + `prism_business:task_*` |
| `session_*` | `prism_session:*` + per-chat HANDOFF-* |
| `config_*` | direct settings.json edit via c-to-h-mirror |

**HARVEST — keep 5; no PRISM equivalent:**
1. **`embeddings_rabitq_build / _search`** — 1-bit quantized HNSW (32× compression). Use when NN-GRAPH MS2 retrain (~9GB RAM) hits memory pressure.
2. **`agentdb_graph-pathfinder`** — personalized PageRank / dynamic-mincut / spectral-sparsify / temporal-centrality. Stronger than our hand-rolled BFS in `/system-viz find`.
3. **`hooks_route`** — 3-tier model routing. **Tier-1 = Agent Booster, 0ms/$0 for var-to-const, add-types, simple renames** — every refactor like that should route here, not Sonnet.
4. **`managed_agent_create / prompt / events / terminate`** — Anthropic cloud-managed long-running agents (CLOUD, not the WASM-local subagents). Useful when a slot needs a multi-hour bake that survives /compact + cross-session restart.
5. **`aidefence_scan / has_pii / is_safe`** — PII + prompt-injection scanner. Plug into `intake_processor_*` / email-intake / webhook-ingest (currently ZERO PII gate on untrusted intake).

**DEFER — interesting but lower ROI today:** `wasm_agent_*` (sandbox isolation — niche), `consensus_decide` (octopus already covers), `daa_*` (cognitive-pattern adaptation — overlaps Hermes), `neural_*` train/predict (overlaps PRISM neural).

**Rule for chats:** if a task fits the redundant column, use the PRISM native — claude-flow on the redundant side is a token-burn distraction. The 5 HARVEST tools are real leverage; the other ~195 are not.

## SKILL AUTO-INVOKE — Layer-2 mandatory directive (2026-05-28, slot:alpha)
When `skill-auto-trigger.mjs` emits an `🚨 SKILL AUTO-INVOKE` block in the UserPromptSubmit `additionalContext` (high-confidence match against `INVOKE_NOW_SKILLS` allowlist with score ≥ 0.85), the named skills are **mandatory** for that turn — invoke each via the `Skill` tool BEFORE other tool calls, unless the operator's prompt is informational (asking *about* the skill, not asking to *do* the work the skill exists for). Allowlist (17, operator-curated): `dedup, forge7, forge-audit-v2, forge-triple, scrutinize, handoff, precompact, checkpoint, compact, wire-edm-studio, lathe-studio, quote-to-ship, octopus, wiki-query, master-index, pick-unit, pick-build-close`. Per 2026-05-19 SKILL-AUTOINVOKE-COVERAGE-AUDIT, Layer-2 hooks cannot themselves invoke skills — a directive nudge moves the model from "ignore" to "invoke". Source-of-truth: `INVOKE_NOW_SKILLS` set in `scripts/extract-skill-triggers.mjs` (extractor — promotes score to ≥0.85, action to `"invoke"`) + `.claude/hooks/skill-auto-trigger.mjs` (consumer). Knobs: `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1` · `PRISM_SKILL_INVOKE_NOW_MIN=<0..1>`. Existing 490 `action:"suggest"` triggers preserved byte-identical (back-compat). Memory: `feedback_skill_autoinvoke_mandatory_2026_05_28.md` (TBD).

## DEV-VELOCITY-AUTOTRIGGER-MS0 (2026-05-12..13) — 13 units: 11 skills + `skill-auto-trigger.mjs` UserPromptSubmit hook reading `knowledge/wiki/architecture/_skill-triggers.jsonl` (regenerated by `extract-skill-triggers.mjs`). Top-K suggest-only, knob `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1`. Memory: [[reference_dev_velocity_autotrigger]].

## WEDM AGI Status — 62 engines + 101 tests + 23 skills + 14 formulas + 46 tribal tips + 5 controller dialects + 5 MIT courses + 26 indexed JM Die programs. SVI psi 0.875. Re-generate via `wedm_generate_digest.ts`. Detail: `knowledge/wiki/architecture/wedm-status.md`.

## OLLAMA OFFLOAD DASHBOARD (P0-U03) — `node scripts/ollama-offload-dashboard.mjs [--json|--window=48h|--reset]`. State: `mcp-server/data/state/ollama-offload-stats.json` (schemaVersion 2.0.0). Healthy install: offload rate ≥30%. `offloaded=0, keptOnClaude>0` → Ollama unreachable; check `http://127.0.0.1:11434/api/tags` + `.claude/cache/ollama-rate-limit.json`. Wiki: [[ollama-pipeline-ms0]]. Memory: [[reference_ollama_pipeline_ms0_2026_05_15]].

## KNOWLEDGE-CONVERSION-MS0 (2026-05-17, 7 units) — MIT-OCW + monolith → PRISM via 3-lane router (Lane A direct-wire 259 tribal tips · Lane B port-verify · Lane C 6-node-type forge-queue). 7 algorithms shipped: OperatorSplitting/ODEIntegrator/LinearStateSpace/FDM/GradientDescent/FEM/Lagrangian (148/148 tests) + SafeExpressionEvaluator (60 tests). Wiki: [[knowledge-conversion-ms0]] · [[course-forge-stubs-emitter]] · [[course-forge-conversions]]. Memory: [[reference_knowledge_conversion_ms0_2026_05_17]] · [[reference_course_forge_conversions_2026_05_17]].

## RGS-TOOL-AUTOINVOKE (MS0+MS1) — per-roadmap-unit toolchain enrichment
Attaches self-correcting toolchain to every open roadmap unit (4,404 units); rule table `scripts/lib/rgs-pipeline-rules.mjs`; sidecar `state/shared/roadmap-tool-plans.json`. MS1 fixed 10 P0s after fake-reader audit ("pure-core+injected-readers MUST ship a real-data E2E" lesson). Shipped U-CRON nightly replan + U-DOMAIN-RULES (mill/lathe/wedm/cam/cad pipeline rules) + U-DISPATCHER (`prism_dev:roadmap_tool_plan_{query,build,coverage}`). Knobs: `PRISM_RGS_TOOL_PLAN_INJECT`, `PRISM_RGS_OUTCOME_RECORD_DISABLE`. Wiki: [[rgs-tool-autoinvoke-ms0]] · [[rgs-tool-autoinvoke-ms1]]. Memory: [[reference_rgs_tool_autoinvoke_ms0_2026_05_16]] · [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] · [[reference_u_dispatcher_2026_05_16]].

## JULIETT-12CHAT-ALLOCATION-MS0 (2026-05-17, amended 2026-05-27 D3) — 12-chat ROI allocation across alpha..mike + golf hygiene. 25 agents / 3 iters / 5-wave ordering / CLEAR-NOT-COMPACT doctrine / 11 bypass systems / 5 silent-degrade fixes (F1-F5). PATCH-SIBLING convention codified. **D3 soul-slot amendment (DOMAIN-GALAXY-DOCTRINE-MS1):** canonical galaxy↔slot mapping — alpha=mill, bravo=mill (shared), charlie=quoting, hotel=business, whiskey=lathe (2026-05-27 designation, see [[reference_whiskey_lathe_soul_designation_2026_05_27]]), lima=academy (de-facto), echo=post-processor (de-facto), papa=system-viz/canvas, sierra=hermes-memory, golf=hygiene. Pending wedm-soul + cad-soul + cam-soul + shop-floor-soul + cad-fusion-live-soul + tribal-knowledge-soul + compliance-safety-soul + quality-soul assignment (no specialist claimed; default fallback = mill-adjacent slots until claimed). Wiki: [[juliett-12chat-allocation-ms0]]. Memory: [[reference_juliett_12chat_allocation_2026_05_17]] · [[reference_juliett_devtools_synergy_map_2026_05_17]].

## DOMAIN-GALAXY-DOCTRINE-MS0 (2026-05-26, slot:alpha) — Bibryam Context Cascade × PRISM slot-soul × /system-viz × MCP
8-pillar × 20-galaxy doctrine for per-domain context partitioning. Phase A complete: 5 of 5 galactic-center sentinels shipped at `mcp-server/src/engines/{mill,lathe,wedm,quoting,business}/CLAUDE.md` (auto-load via Bibryam Context Cascade when Claude edits within those subdirs). Mill is fully populated by alpha; lathe is mostly populated (R7-flagged for lathe-soul refine); wedm/quoting/business are honest stubs awaiting wedm-soul/charlie/hotel refinement respectively. Pillars 5-8 (atlas/soul/MCP/census) were already PRISM-native; Pillars 1-4 (cascade/noise-filter/scoped-skill/LSP) annex Bibryam's article. Sister noise-paths catalog ships P2 advisory at `state/shared/specs/PRISM-NOISE-PATHS-2026-05-26.md` (deny-rule syntax pending operator-touch validation). Specs: `state/shared/specs/{DOMAIN-GALAXY-DOCTRINE,GALAXY-PHASE-A-COMPLETE,BIBRYAM-LARGE-CODEBASE-PATTERNS-APPLIED,PRISM-NOISE-PATHS}-2026-05-26.md`. Memory: [[reference_domain_galaxy_doctrine_2026_05_26]]. MS1 (26 units) doctrine substrate complete via alpha solo ship 24/26 + A3/D3 bypass-shipped 2026-05-27 (audit-logged at state/shared/claude-md-bypass.jsonl; operator goal-gate overrode golf-only doctrine after live-golf failed to action chat-bus work-request). Next phase B (path-scoped skills) gated by `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1` — re-enable before shipping.

## OLLAMA-PIPELINE + OLLAMA-EXPAND + WIKI-OFFLOAD-ADVISORY — local-LLM offload surface
Three pipeline artifacts close the audit gap (offload ratio 13.8% → 30% target): `scripts/ollama-docker-health.mjs` CLI probe · `ollama-pipeline-injector.mjs` UserPromptSubmit hook (matches `/forge-audit`, `/rgs`, `/scrutinize`, `/dedup`, `/precompact`, `/deep-search`, `/pdf-learn`, `/close-out-audit`, `/forge-triple` → injects phase→model routing) · `ollama-prewarm-on-pipeline.mjs` (detached `/api/generate` warm-up). **OLLAMA-EXPAND** ships `scripts/ask-ollama.mjs` (modes: viz/rerank/summarize/explain/triage/ask; single warm qwen2.5-coder:32b + keep_alive; the :3b tag was retired 2026-06-04 Blackwell migration) + `ollama-prism-bridge.mjs` L2 agent-loop (3 read-only tools). **WIKI-OFFLOAD-ADVISORY** (HIGH-ROI-TOKEN-SAVINGS/U-WIKI-OFFLOAD-ADVISORY, slot:golf, 2026-05-20, commit `6853d35257`): `wiki-read-offload-advisory.mjs` PreToolUse:Read hook surfaces `/route-to-obsidian` for wiki entries ≥500 lines; bumps `ollama-offload-stats.json byHook.wiki-read-offload-advisory.suggested`. Knobs: `PRISM_OLLAMA_PIPELINE_INJECT`, `PRISM_OLLAMA_PREWARM_DISABLE`, `PRISM_WIKI_OFFLOAD_{ADVISORY_DISABLE,MIN_LINES,VERBOSE}`. Wiki: [[ollama-pipeline-ms0]] · [[ollama-expand-ms0]] · [[ollama-prism-bridge]]. Memory: [[reference_ollama_pipeline_ms0_2026_05_15]] · [[reference_ollama_expand_ms0]] · [[reference_ollama_prism_bridge_l2]].

<!-- merged into ## OLLAMA-PIPELINE + OLLAMA-EXPAND + WIKI-OFFLOAD-ADVISORY above -->

## NN-GRAPH (MS0+MS1+MS2) — GraphSAGE wiring-inference tier-5
GNN as 5th tier of wiring-inference cascade for UNKNOWN `ghost.unwired-engine` classification. Strictly additive (`PRISM_NNG_DISABLE=1` reverts). MS1 wired stratified neg-sampling (`97c9286311`). MS2 added U1 reference-pool seed stage + U2 self-retrain lifecycle (S4U scheduled task; promote IFF AUROC≥0.78/macroF1≥0.55/Brier≤0.15) + NN-1 768-d feature swap. **Status: research-only** — model-side AUROC gate (current 0.096) pending operator stratified retrain; auto-promotion already wired. **2026-05-23 RAG-UPGRADE-MS0/U-GNN-NODE-EMBED-BRIDGE (slot golf):** the bridge that closed the empirical `embeddingHitCount=0` gap. `scripts/lib/graph-node-embedding-bridge.mjs` (49/49 tests) is now wired into `nn-graph-retrain-lifecycle.mjs` as a pre-retrain stage — every retrain forwards a fresh `--embedding-source state/shared/nn-graph/node-embeddings-768d.jsonl` to the trainer. First live build: 562 nodes matched (was 0). **P0 follow-up — RESOLVED + SUPERSEDED (2026-06-02, slot:india):** `positiveTypeMarginal` + `sampleStratifiedNegativeEdges` ARE exported by `graphsage-trainer.mjs` (lines 141/204), imported + used by the pipeline; 154/154 trainer+pipeline tests pass — `U-NN-TRAINER-EXPORT-RESTORE` was a STALE claim (no action). **Real binding blocker (verified):** the deploy gate defers on `insufficient-reference-pool` (poolSize 0) — `nn-graph-eval.buildHoldout` needs ≥2 high-confidence `ghost.unwired-engine` reference ghosts in the live graph. The May-23 seed (`reference-pool-seed-2026-05-23.json`, purpose: "dormant because reference pool is 0-sized") exists but `NN-EVAL.json` is STALE (May-16, pre-seed, 8-dim auroc 0.096); the Jun-1 768d candidate scores auroc 0.388 (still <0.5 heterophily, <0.78 gate). Next-unit `U-NN-REFPOOL-REEVAL` = fresh `runAssessment` against the post-seed graph (548MB streaming-load). The PSN leg-state hook's "embeddingSource mismatch" string was a FABRICATED diagnosis from a schema-read bug (read top-level `auroc` vs canonical `checkpointMeta.auroc`) — fixed `U-NN-LEG-SCHEMA-READ-FIX` (`f436b2c614`), now reads via `classifyGnn` + reports the real `DEFERRED`/reason. Knobs: `PRISM_NNG_*`, `PRISM_NN_RETRAIN_*`. Wiki: [[nn-graph-ms0]] · [[u-nng-pipeline-stratified-wire]] · [[gnn-node-embedding-bridge]]. Memory: [[reference_nn_graph_ms0_2026_05_16]] · [[reference_u_nng_pipeline_stratified_wire_2026_05_17]] · [[reference_nn_graph_ms2_u1_2026_05_17]] · [[reference_nn_graph_ms2_u2_2026_05_17]] · [[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]] · [[reference_gnn_node_embedding_bridge_2026_05_23]] · [[reference_trainer_export_regression_2026_05_23]]. **STATUS UPDATE (2026-06-06, slot:india — supersedes the 0.096/0.388 framing above):** the ref-pool reeval landed — live 62-ghost direct-embed holdout scores **AUROC 0.808 ✓ / macro-F1 0.439 ✗ / Brier 0.179 ✗**. **Calibration is a measured DEAD END for the Brier gate** (Murphy reliability/miscalibration only 0.0197 of 0.179; best density-matched LOO-CV calibrator 0.178 — residual is refinement loss, not miscalibration; `scripts/nn-graph-calibration-analysis.mjs`). **BUT tier-5 is DEPLOY-READY-SELECTIVE at the production gate** (`GNN_DEFAULTS.minConf=0.7`): emitted-set Brier 0.041, macro-F1 1.0, 32% coverage, robust — it abstains below the gate and defers to the LLM tier (textbook risk@coverage). `nn-graph-eval.mjs` now emits an additive `selective` section + `gradeSelectiveDeploy`; full-coverage lift = reference-pool growth + sharper features (H2GCN/GPU retrain), NOT calibration. Wiki [[gnn-selective-deploy]] · memory [[reference_gnn_selective_deploy_2026_06_06]].

<!-- merged into ## NN-GRAPH (MS0+MS1+MS2) above -->

<!-- merged into ## NN-GRAPH (MS0+MS1+MS2) above -->

## PSN-OCTOPUS-FLEET-SYNERGY-MS0 — build-once master-brain wiring (slot:bravo, 2026-05-31)
Lights up Obsidian + the 11-leg PSN + system-viz + the **octopus** (multi-model consensus) loop across **all 34 galaxies** from a small **build-once-fleet-wide** layer, not 34× re-impls. **Keystone:** the octopus had never run for real (consensus ledger was a 522B `stub-not-yet-merged`) — so dependency order is producer-first (de-stub → feed real PSN corpus → wire consumers; R13). **Build-once layer SHIPPED** on `cad-fusion-live-ms0`: `5cb68aaad3` P0-P1 (corpus loader, 5 PSN text legs + real `MultiModelConsensusEngine.ask()`, ledger 522B→9244B) · `d289d53006` P2 (`fetchLiveBrain()`→slot-context, `PRISM_OBSIDIAN_LIVE=1`) · `7fdacfc76b` P3 (34 galaxy `MEMORY.md`→Obsidian mirror, `GALAXY_INDEX_MIRROR_ENABLE`) · `65059681d5` P5 (octopus ledger→WeeklySynthesis, `PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1`) · `94bb94d022` P6 (always-on N/11 leg-coverage dial). **Security (scrutiny-caught):** shared `scripts/lib/redact-secrets.mjs` masks every snippet before any external voice/ledger; private `C:` memory gated behind `PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY=1` (default OFF); O_APPEND ledger fix. **6 reusable synergy patterns** (P1 octopus-reads-legs · P2 liveBrain→slotctx · P3 galaxy-MEM→graph · P4 ledger→ghost-roost · P5 outcomes→synthesis · P6 leg-dial; P2/P3/P6 build-once, P1/P4/P5 per-galaxy). **Wave 3 (per-galaxy, remaining):** P1 corpus-tuning (wedm/speed-feed/cam/cad/post-proc) · P4 ledger-roosts (hermes-zulu/fleet-hygiene/database-expansion) · P5 verify-links (lathe/mill/quoting already cloned india's AI). Wiki: [`knowledge/wiki/architecture/psn-octopus-fleet-synergy-ms0.md`]. Memory: [[reference_psn_octopus_fleet_synergy_2026_05_31]]. Specs: `state/shared/specs/PSN-{OBSIDIAN-OCTOPUS-SYNERGY-ASSESSMENT,SYNERGY-FLEET-ROADMAP}-2026-05-31.md`.

## CROSS-SUBSTRATE-SYNERGY-MS0 — typed ADD-only edge spine (system-viz ↔ Hermes ↔ Obsidian ↔ PRISM-AI, slot:sierra 2026-06-03)
Bounded answer to the unbounded `/goal` "synergize every substrate / connect every node to all logical combinations": a typed, ADD-only cross-substrate edge contract instead of an O(V²) soup (the `brainstorm-path-forward` 5-lens synthesis rejected the infinite framing per R12). **Shipped:** `scripts/lib/cross-substrate-edge-schema.mjs` (typed whitelist `documented-by|owned-by-slot|embeds|consensus-of` + `{source,confidence,addedBy,addedAt}` provenance + `assertAddOnly()` deletion-guard; 18/18 tests) · `scripts/generate-cross-substrate-edges.mjs` → `state/shared/system-viz/cross-substrate-edges-augmentation.json`. **TWO edge types now materialized (120 edges, 34 galaxy-roost nodes, single-writer, no 548MB load):** (1) **82 `owned-by-slot`** (7 eng-canon@1.0 + 41 domain-infer@0.85 + 34 galaxy-roost@1.0 — all 34 galaxies, U-XSUB-GALAXY-ROOST); (2) **38 `documented-by`** (galaxy → `memory_patterns.<galaxy>_synthesis`, the system-viz↔Obsidian/Wiki synergy edge, U-XSUB-DOCUMENTED-BY 2026-06-03) — node-id namespaces confirmed (`memory_<kind>.<slug>`+`wiki.<section>.<slug>`, both folded live); convention C (galaxy MEMORY.md `[[backlinks]]`) wired, compounds as wiki/memory node coverage grows. Test `generate-cross-substrate-edges.test.mjs` (6/6: NO-DANGLING invariant + both conventions + owned-by-slot no-regression) + schema 18/18. `merge-augmentations.mjs` ADD-only deduped splice folds both types on next `regen-viz` (stamps `G.meta.crossSubstrateEdges`). **Rule:** every new edge type extends `EDGE_TYPES` deliberately; `confidence<1` graded so a GNN-AUROC-0.5 edge is never read as ground truth. Decomposition ledger (regen-exec gated 24GB RAM, `embeds`/`consensus-of` types remaining, Blackwell offload of system-viz model calls, per-galaxy doc-sync as per-slot `/loop`): `state/shared/specs/CROSS-SUBSTRATE-SYNERGY-BOUNDED.md`. Wiki [[cross-substrate-synergy-ms0]]. Memory [[reference_cross_substrate_synergy_ms0_2026_06_03]].

## CHEAP-NODE-ACCESS-MS0 — token-cheap node read-by-id (system-viz, slot:sierra 2026-06-04)
The fleet had a cheap node SEARCH (`system-viz-query find` over `find-cache.json`) but **no cheap READ-by-id** — reading a node meant `Read`-ing the 644MB `system-graph.json` ≈ **~186K tokens**. `node_card` closes that: **`node scripts/system-viz-query.mjs node-card <id> [<id>…]`** returns a compact NodeCard (~200 tokens, **~98.7% cut**) — id/label/layer/kind/status/info + the `knowledge` wiki/memory docs to read next — sourced from the freshest compact sidecar (`system-graph-index.json` 193MB → `find-cache.json` 55MB), **never the 644MB graph** (STAT-only freshness + 2KB head-stamp check; `stale` flag; THROWS if no sidecar — R12, proven by a poison-pill NO-GRAPH-LOAD test). **Use `node-card` instead of `Read`-ing the graph; pair `find <query>` → ids → `node-card <id>`.** Surfaces: `scripts/lib/node-card-{schema,read}.mjs` (+tests 14/14), the `node-card` CLI short-circuit (before `loadGraph()`), `/node-card` skill. Importable: `readCard(id)`/`readCards(ids)`. Dropped the `node-capability-index.json` enrichment (0/302K key-namespace match — dead I/O; scrutiny B P1, fixed). **U-NODECARD-OFFSET-INDEX (SHIPPED 2026-06-04, a6f924a84c + 1cb4b44fb8):** seekable offset index (`node-cards.jsonl` 159MB + `node-card-offsets.json` 24MB, both gitignored) so `readCard` SEEKS one record (parse the 24MB offsets once, then `fs.read` exact bytes from the jsonl) instead of the 193MB sidecar — transparent to ALL callers (CLI/batch/future-dispatcher). 301,185 cards live, 8/8 all-galaxy seek hits, warm ~0.3ms/card. Emitted by `scripts/lib/node-card-offset-lib.mjs` (`makeCard` single-sourced so the jsonl shape can't drift), wired into `build-graph-index` regen (fail-soft, in-memory nodes, zero extra graph read) + standalone `scripts/build-card-offset-index.mjs` backfill. Torn-pair guard (`jsonlBytes` verify) + integrity guard (id-match) + multibyte-exact offsets; 24 tests, 2-reviewer PASS. **U-NODECARD-PREFETCH-HOOK (SHIPPED 2026-06-04, 158d364493):** `node-card-prefetch-inject.mjs` (UserPromptSubmit, wired after master-index, timeout 3000) detects node ids in a prompt (whitelisted distinctive prefixes `eng/disp/ghost/formula/wiki/skill/memory_*/tribal-tip/ms-envelope` — EXCLUDES noisy `fs/test/git/core/script`) and injects each card + its doc pointers with **zero tool call** via the new hook-safe `seekCard()` (seek-only, NEVER the 193MB parse, never throws). Cheap-when-irrelevant: regex-only (~0ms) unless a whitelisted candidate is present; the offset index verifies every candidate so `fs.readFileSync` injects nothing. Live: `eng.mill`+`ghost.galaxy.wedm` inject, `fs.*` silent. Knobs: `PRISM_NODECARD_PREFETCH_DISABLE`, `PRISM_NODECARD_PREFETCH_K`. Still staged: CAG cold-tier skip, `prism_session:node_card` action, GPU semantic `--near`. Wiki [[cheap-node-access-ms0]]. Memory [[reference_cheap_node_access_ms0_2026_06_04]].

## Recent regressions
<!-- Last 15; older entries in state/shared/CLAUDE-REGRESSIONS-ARCHIVE.md. Auto-managed by scripts/compress-claude-md.mjs (golf hygiene). -->
<!-- Older entries archived to knowledge/wiki/lessons/claude-md-regression-log.md (drained by `scripts/claude-md-archive-regressions.mjs`). -->

- 2026-06-29 | **Okuma OSP 5-axis TCP-OFF was flipped to a WRONG code (G168) by a 2026-06-28 "fix" that rested on a FABRICATED citation -- the real Okuma TCPC-off is G170; corrected engine+2 tests+verifier+2 .cps+.nc (slot:echo)** | observed-in: U-PP-OKUMA-5AXIS-G170-CORRECTION (this commit) | root cause: regression `77e1861bba` (U-PP-5AXIS-DIALECT-FIX; the earlier `ed5a7ae10d` had correctly shipped G170 -- verified via `git log -S`) changed `OkumaOSPMillMasterPostEngine.resolveTcpCodes` TCP-off `G170`->`G168` (mode `G169_G168`), accusing the prior code of a "fabricated dialect citation" and citing `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:47,515` as proof of G168. **That citation was itself false:** the cited shipped `.cps` L47 reads `// TCP CONTROL (G169/G170)`, L515 "G169 (TCP on) and G170 (TCP off)", and emits real `gFormat.format(170)` at :4538/:4697. WebSearch of Okuma's own OSP 5-axis training material + the Autodesk vendor post confirm **G169 = TCPC ON / G170 = TCPC OFF; G168 is NOT a documented TCPC-off code** (generic MODIN macro slot only). `okuma-dialect-knowledge.ts` carries no TCP code (no G168 corroboration). On the real Genos M460V a non-cancel of TCPC = crash on the next positioning move (safety-critical). The G168 error had propagated to SIX sites: engine, FiveAxisTcp.test, JMDiePreset.test, verify-jm-fleet-coverage.ts (active assertion -> would false-fail), the generated 5axis-okuma-genos-m460v.nc, AND the `prism-enhanced` .cps copy (hand-edited to `gFormat.format(168)` while the JM-shipped copy stayed correctly G170). fix: all six -> G170. VALIDATED: 57/57 Okuma tests pass; `verify-jm-fleet-coverage.ts` -> ALL 20 FLEET-COVERAGE CHECKS PERFECT incl `5ax/okuma-genos-m460v (G169/G170 TCP + A/C): TCP-ON TCP-OFF A/C OK | 0E`; regenerated .nc shows `G170 (TCP OFF)`. Lessons: VERIFY a dialect citation against the cited line before trusting it (the "fix" that cried fabrication fabricated its own cite); a wrong safety code rarely lives in one file -- apply the FIX to all instances (R15); the JM-shipped .cps was ground truth, the prism-enhanced copy drifted. | verify: `git -C H:/prism show b6b863d268` -- [[reference_echo_okuma_5axis_g170_tcp_correction_2026_06_29]]
- 2026-06-29 | **The SessionStart meta-health inject false-alarmed "HERMES [DOWN]" fleet-wide off a LIFETIME cumulative fail-rate -- a recovered transient outage pinned the alarm while the proxy was healthy NOW (slot:sierra)** | observed-in: U-SIERRA-HERMES-LIVEPROBE-GATE (a5b71672f9) | root cause: `gradeHermesUtilization` (`scripts/reconcile-zulu-ledger.mjs`) declared `DOWN` purely from `bySource.fail / fired` (live: 9/10 = 90% > the 10% threshold) with NO live probe -- its own comment codified "DOWN regardless of recency". The `ollama-offload-stats.json byHook["ask-hermes"]` counters are monotonic-forever (never window/decay), so a proxy outage ~2.4h ago kept reading DOWN until ~80 successes dilute the lifetime ratio -- even though `/health` answered `{status:"ok",authenticated:true}` 200 right then. Same false-positive class as the brain-refresh false-FAILED alarms + bravo's MCP-kickoff fix (a stale-prone signal actuating a fleet-wide alarm with no live evidence at decision time). fix (doctrine: require positive DOWN evidence from a live probe at decision time): NEW `checkHermesProxy()` (timeout-bounded 2500ms, AbortController, never throws) GETs `/health`; `hermesHealthUrl()` origin-strips the `/v1`-suffixed base (the fleet default `PRISM_HERMES_PROXY_URL` IS `/v1`; `/v1/health` 404s -> would re-introduce the false DOWN -- caught by per-file scrutiny arm A, mirrors proven `healthUrlFor`); `gradeHermesUtilization(stats,nowMs,liveProbe=null)` -- high fail-rate is now SUSPICION (liveProbe.ok=true -> recovered -> recency grade, never DOWN; =false -> confirmed DOWN; =null -> ledger-only DOWN preserved, back-compat); NEW async `reconcileMetaSystemsLive()` probes LAZILY (only when the ledger would alarm, zero network on the healthy path), adopted by the inject hook + `reconcile()` runner. VALIDATED live + `/v1`-env: probe derives ROOT `/health`, ok:true -> hermes UTILIZED (alarm GONE), inject silent; SYNC path still DOWN (gate is load-bearing). 36/36 tests (6 new); 2-arm scrutiny PASS. Orthogonal to alpha's actual proxy/cron fix (this is the MONITOR, not the substrate). Lesson: a lifetime-cumulative health counter must never actuate a fleet-wide alarm alone -- gate the verdict on a live probe; any Hermes probe must origin-strip the `/v1` base before `/health`. | verify: `git -C H:/prism show a5b71672f9` -- [[meta-health-hermes-down-liveprobe-gate]] · [[reference_sierra_hermes_liveprobe_gate_2026_06_29]]
- 2026-06-29 | **ReasonBeforeActionEngine (the new "reason before any action" gate) was a SILENT NO-OP -- it inherited the consensus layer's HEAVY default models, too slow for the latency cap -> fail-opened 100% of consequential actions; caught ONLY by live validation, the 65 green unit tests could not (slot:india)** | observed-in: U-RBA-LIVE-VALIDATE | root cause: `ReasonBeforeActionEngine.plan()` built a `ConsensusInput` WITHOUT pinning a local model, so `MultiModelConsensusEngine` fell to its deep-consensus default `gpt-oss:120b` (65GB) + `qwen2.5-coder:32b` -- correct for a thorough latency-tolerant consensus, FATAL for a pre-action gate: a 65GB cold-load hangs tens of seconds, even warm a 32B votes ~9-14s, and the PreToolUse hook caps sub-second. So every medium/high action fail-opened (live: 0/4 reached the panel) = a gate that never reasons. The 65 hermetic tests injected a FAKE consensus panel -> proved LOGIC, never that the engine reaches a usable model in budget (R9/R15: a mock can't prove the live core path runs). fix ($0/local, 3 levers): (1) PIN fast small models via new `rbaPinnedModels()` -- defaults qwen3-vl:8b-instruct + qwen2.5vl:7b (live ~0.6-0.9s, correct: rm-rf->REVISE; NOT qwen2.5-coder:7b which reproducibly HANGS here), env-overridable, shared engine list-substitutes absent models; (2) additive `ConsensusInput.ollamaMaxTokens` (default 1024 = no change for existing consumers; RBA passes 32) -- a one-word vote shouldn't emit up to 1024 tokens of prose/`<think>` first; (3) 2 voices BOTH tiers (Ollama voices SERIALIZE on the single GPU, so a 3rd voice only adds latency; >=2 satisfies corroborated-block; high differs by timeout not voice count -- dropped the diverse-panel-for-high that added a probe + 3rd serialized voice and blew the budget). hook cap 1500->2500ms + prewarm required. PROVEN live: git commit->REVISE (2 voices, agree 1.0), rm-rf->REVISE (1-voice BLOCK softened -- corroboration invariant working); every safety invariant held (fail-open=PROCEED always, never a false BLOCK). CAVEAT (honest): sub-second in isolation but QUEUES under concurrent fleet Ollama load (5-6 slots -> 16-30s -> fail-open) -- activation needs a prioritized inference lane or accepts peak-load fail-open. 66 tests green (41 vitest + 25 hook), tsc-clean. Lessons: a green hermetic suite can hide a 100%-dead feature -- live-validate anything latency-bounded; a latency gate must pin a FAST model + cap output tokens, never inherit a deep-consensus default; on a serialized GPU, voice count is a latency multiplier. | verify: `git -C H:/prism show HEAD` -- [[reason-before-action-ms0]] · [[feedback_wire_test_validate_all_galaxies]]

## ONE-GLANCE CHECKLIST (every new task)
1. Read HANDOFF for this chat via per-agent-handoff.mjs `read`
2. If building/auditing/investigating → hooks auto-inject inventory + duplicate guards
3. Check `PRISM-INVENTORY-LATEST.md` if you need counts
4. Use MCP dispatcher actions before reinventing logic
5. Obey shared directives for coordination (6 chats running)
6. Finish current delivery before starting next roadmap pass (per ROADMAP_COLLABORATION_STATE.md gate)
7. On session end → `/handoff` writes to per-chat file; `/compact` also wires this automatically

## FLEET-REAPER (MS0+MS1+MS2+Tier-1..3) — slot-aware orphan reaper for the 26-chat fleet
Maps PID→slot via ancestry + chat-slots.json; reaps orphans gated by confirm-after-N-ticks (2×300s default). Three runners: in-session Monitor (`/fleet-reaper`), durable `PRISM Fleet Reaper` scheduled task (5-min, +210s phase), Stop hook (45s global throttle). **MS1** added Tier-1 graduated pressure gate + critical-memory ballast + Tier-2 service-restart (Docker daemon NEVER auto-restart) + Tier-3 GPU/Ollama coordinator. **MS2** added enumeration cache sidecar + cross-PC host filter. **Tier-3 SYSTEM principal**: scheduled task default `NT AUTHORITY\SYSTEM`; `--hunt` CLI surfaces operator orphan list. **Golf owns the reaper** (moved from alpha 2026-05-16); `/checkin-golf` carries the non-skippable section. Re-register elevated: `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow`. Knobs: `PRISM_FLEET_REAPER_*` + `PRISM_GOLF_GUARDIAN_DISABLE`. Wiki: [[fleet-reaper]] · [[alpha-slot-reaper-guardian]] · [[ollama-routing-hint]]. Memory: [[reference_fleet_reaper]] · [[reference_fleet_reaper_ms1]] · [[reference_fleet_reaper_ms2_2026_05_18]] · [[reference_fleet_reaper_tier1_2026_05_17]] · [[reference_fleet_reaper_autonomy_robust_2026_05_16]] · [[reference_fleet_reaper_system_principal_2026_05_18]] · [[feedback_golf_owns_reaper]].

<!-- merged into ## FLEET-REAPER (MS0+MS1+MS2+Tier-1..3) above -->

## FLEET-MEMORY-MONITOR — durable RAM/per-chat-tree advisor (5-min cron, slot:golf)
Scheduled task that names WHICH chat to `/compact` under critical pressure. Attribution unit is the **claude.exe tree** (NOT `chat-slots.pid` — ephemeral). One `AGENT_CHAT` advisory per critical episode. Phase offset +330s. Knobs: `PRISM_FLEET_MEMMON_*`. Wiki: [[fleet-memory-monitor]]. Memory: [[reference_fleet_memory_monitor_2026_05_16]].

## FLEET-TASK-HEALTH — watchdog-over-watchdogs + critical-pressure compact nudge
(A) `fleet-task-health-watch.mjs` + Stop hook audits every `PRISM *` scheduled task; only Windows HRESULT launch-failure codes count as failing. (B) `critical-memory-compact-nudge.mjs` UserPromptSubmit targets the `/compact` directive at the named largest tree — ONE chat per critical episode. Knobs: `PRISM_FLEET_TASKHEALTH_*`, `PRISM_CRIT_MEM_NUDGE_*`. Wiki: [[fleet-task-health-ms0]]. Memory: [[reference_fleet_task_health_ms0_2026_05_17]].

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

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
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
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
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