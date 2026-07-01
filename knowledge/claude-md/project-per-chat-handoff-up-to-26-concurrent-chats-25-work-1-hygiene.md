---
source: project
section: PER-CHAT HANDOFF (UP TO 26 CONCURRENT CHATS — 25 work + 1 hygiene)
slug: per-chat-handoff-up-to-26-concurrent-chats-25-work-1-hygiene
indexed_at: 2026-06-06T05:18:30.555Z
---

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
