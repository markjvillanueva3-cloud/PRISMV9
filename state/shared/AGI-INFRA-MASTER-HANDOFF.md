# AGI-INFRA-MASTER — Session Handoff

**Paused:** 2026-04-17T03:00:00Z
**Phase:** Phase E — Worktree-per-chat migration (3/8 shipped, 5/8 pending)
**Branch:** `work/agi-infra-phase-e` (in isolated worktree `H:/prism-phase-e`)
**Primary docs:**
- Entry points: `H:/prism/.claude/helpers/prism-paths.mjs` + `H:/prism/mcp-server/src/constants.ts` (both env-aware)
- Bootstrap: `H:/prism/scripts/worktree-init.mjs` (E3 output) — **once merged to main**, live at `H:/prism-phase-e/scripts/worktree-init.mjs` for now

---

## RESUME HERE TOMORROW

Primary pick-up trigger phrases: **"continue AGI-INFRA"** · **"resume phase e"** · **"continue worktree migration"** · **"continue the infra roadmap"**.

**Next unit to execute:** **E4 — Launch discipline + branch guard**

If E4 lands quickly, continue with remaining Phase E items in order:
1. **E4** → `scripts/launch-chat.ps1 <name>` + `.git/hooks/pre-commit` refusing Claude commits on `main`
2. **E5** → `scripts/reconcile-work-branches.mjs` — auto-FF-merge clean `work/*` branches, human-gate conflicts
3. **E6** → attribution repair one-time audit (scan history for mixed-session absorptions; report-only, no rewrites)
4. **E7** → migrate existing sessions (stash + pop into per-chat worktrees using E3 init)
5. **E8** → validation (two-chat race test, reconciler test, hook-propagation test)
6. **Merge to main** — once E4-E8 done, `work/agi-infra-phase-e` → `main` via reconciler (E5) or manual FF

---

## Why This Exists (The Motivating Incident)

Commit `cc72709e` labeled `LATHE-MASTER/P0/U-LTH02+03` **absorbed three Phase D files** from a different chat. Both sessions were working in shared `H:/prism` with one git index. The other chat's `git add -A` + `git commit` swept up my staged files and committed them under their subject line. Phase D shipped successfully but with wrong attribution. Phase E is the **structural fix**: each chat gets its own worktree (own `.git/worktrees/<name>/index`), so parallel mutation cannot cross-contaminate.

---

## Commit Timeline (this session)

| Commit | Phase | Work |
|---|---|---|
| `d92b435e` | E1 | `src/constants.ts` env-aware path resolver — 40+ PATHS entries rewritten to use `${PRISM_SHARED_BASE}` / `${PRISM_ROOT_BASE}`. Backward-compat: both default to `"H:\\prism"` when env unset. |
| `58784fb0` | E2 | `.claude/helpers/prism-paths.mjs` (new) + migrated `sync-memory.mjs`, `compaction-survival.mjs`, `git-commit-checkin.mjs` — same dual-env contract on JS side. Smoke-tested both modes (unset → shared-root; worktree mode → correctly splits). |
| `2f862618` | E3 | `scripts/worktree-init.mjs` — one-shot bootstrap. Creates worktree at `H:/prism-<name>` on `work/<name>` branch, registers `safe.directory`, writes `.env` + `.claude/.worktree-marker`. Tested end-to-end (create → inspect → refresh-with-force → remove). |

**Pre-Phase-E context:** Phase B (token-efficiency hooks) + Phase C (doc/roadmap coherence) + Phase D (absorption-prevention hooks) all shipped earlier in the session — see commits prior to `d92b435e`.

---

## Phase E Progress

| Unit | Status | Commit | Artifact |
|---|---|---|---|
| E1 `constants.ts env resolver` | ✅ landed | `d92b435e` | `mcp-server/src/constants.ts` |
| E2 `JS-side path resolver` | ✅ landed | `58784fb0` | `.claude/helpers/prism-paths.mjs` + 3 migrated helpers |
| E3 `worktree-init.mjs` | ✅ landed | `2f862618` | `scripts/worktree-init.mjs` |
| **E4 `launch discipline + branch guard`** | ⏸ **NEXT — PENDING** | — | see plan below |
| E5 `work-branch reconciler` | pending | — | `scripts/reconcile-work-branches.mjs` |
| E6 `attribution repair audit` | pending | — | report-only scan |
| E7 `migrate existing sessions` | pending | — | stash + pop per session |
| E8 `validation tests` | pending | — | race + hook-propagation |

---

## E4 Plan (Next Up)

**Goal:** Make it impossible for a chat that launches in the wrong place to commit to `main`.

**Two artifacts:**

1. `scripts/launch-chat.ps1 <chat-name>` — PowerShell wrapper that:
   - Resolves worktree path: `H:/prism-<chat-name>`
   - Errors if worktree doesn't exist (suggests `node scripts/worktree-init.mjs <chat-name>` first)
   - Sources `.env` into PowerShell environment (`$env:PRISM_ROOT`, `$env:PRISM_SHARED`, `$env:PRISM_CHAT_NAME`)
   - `cd` into worktree
   - Launches `claude` (or respects `$env:CLAUDE_CODE_CMD` override)

2. `.git/hooks/pre-commit` — shell hook that:
   - Checks current branch: if `main` or `master`, refuses commit
   - Exception: if commit author is NOT Claude (no `Co-Authored-By: Claude` trailer), allow (human can still commit to main)
   - Exception: if environment flag `ALLOW_CLAUDE_MAIN_COMMIT=1` set, allow (emergency override)
   - Prints clear error explaining how to move work to `work/<chat-name>` branch via `git checkout -b`

**Testing plan for E4:**
- Install pre-commit hook
- Try `git commit` on `main` as Claude → should refuse
- Try `git commit` on `main` as human (no Claude trailer) → should pass
- Try `git commit` on `work/foo` → should pass
- Test `launch-chat.ps1 nonexistent-name` → should error with init hint
- Test `launch-chat.ps1 test-init-e4` after running init → should `cd` + source env

**Gotcha:** `.git/hooks/` is **not** tracked by git by default. Either (a) commit the hook under `scripts/hooks/pre-commit` and have `worktree-init.mjs` copy/symlink it into `.git/hooks/pre-commit`, or (b) use `core.hooksPath` pointing at a tracked dir. Option (b) is cleaner — add `git config core.hooksPath scripts/hooks` to E3.

---

## Key Files to Re-read Tomorrow

1. **Roadmap for Phase E:** (no dedicated md — lives in E1 commit body + this handoff)
2. **Entry points:**
   - `H:/prism/mcp-server/src/constants.ts` (E1 output)
   - `H:/prism/.claude/helpers/prism-paths.mjs` (E2 output, **ONLY on `work/agi-infra-phase-e` branch — not on main yet**)
   - `H:/prism/scripts/worktree-init.mjs` (E3 output, same branch caveat)
3. **Phase D context** (absorption prevention hooks):
   - `H:/prism/.claude/hooks/git-anti-clobber.mjs` (serialization lock)
   - `H:/prism/.claude/hooks/git-commit-checkin.mjs` (intent broadcast — was updated in E2)
4. **Three shared-state files Phase E must not break:**
   - `H:/prism/state/shared/AGENT_CHAT.jsonl` (coordination bus)
   - `H:/prism/state/shared/GIT_LOCK.json` (serialization)
   - `H:/prism/state/shared/ACTIVE_WORK_REGISTRY.json` (claim tracking)

---

## Test Protocol Before Merging Phase E to Main

1. Finish E4–E8 on `work/agi-infra-phase-e` branch (stays in `H:/prism-phase-e` worktree)
2. E8 race test: spawn two throwaway worktrees, have each run a `git add` + `git commit` loop simultaneously, confirm no cross-absorption
3. E5 reconciler test: verify FF-merge of a clean `work/*` into main
4. Manual smoke: launch a real Claude session in a fresh worktree, run one real unit of work, confirm it commits to its own branch and doesn't touch main
5. Merge `work/agi-infra-phase-e` → `main` via reconciler (or manual FF)
6. Update `MEMORY.md` baseline counts (scripts count, hooks count, etc.)

---

## Open Questions For Future Chat

- **Symlinks vs branch-tracking for `.claude/` hooks:** Current decision is "let git tracking handle it" — hooks are committed, so `git worktree add` pulls them in. But WIP hooks in shared root working tree don't propagate without `--sync-uncommitted`. Is additive-on-demand enough, or should we auto-rerun it whenever `scripts/launch-chat.ps1` is invoked?
- **`node_modules` in worktrees:** E3 doesn't handle this. Each fresh worktree needs `npm install` (~2 min). Options: (a) junction `mcp-server/node_modules` from shared root (dangerous if shared does install during someone else's build), (b) document `npm install` as a required post-init step, (c) copy-on-write via symlink if filesystem supports it. Revisit during E7.
- **Reconciler conflict policy (E5):** Auto-FF-merge only, or also attempt octopus-merge of multiple clean branches? Octopus fails on any conflict; FF is simpler and predictable.

---

## DO NOT FORGET

- Phase E is **ironic / meta**: you're fixing absorption by using absorption-resistant worktrees while you build the absorption-resistant system. All Phase E commits are in the `H:/prism-phase-e` worktree on `work/agi-infra-phase-e` branch — **no Phase E commit has touched main yet**. That's by design.
- The phase lives on a branch, so `prism-paths.mjs` and `worktree-init.mjs` are invisible to anything cloning/pulling main. When resuming tomorrow, `cd H:/prism-phase-e` first.
- **Backward-compat is verified.** When `PRISM_ROOT` and `PRISM_SHARED` are both unset, every path resolves to `H:/prism` exactly as before. Shipping Phase E to main won't break any unmigrated session.
- The `.claude/.worktree-marker` file is the authoritative signal that a directory is an isolated worktree. Future hooks (E4 pre-commit, reconciler) should key off this, not off directory name.

---

## Cross-Chat Coordination Notes

Other handoffs active in `H:/prism/state/shared/`:
- `MILL-MASTER-HANDOFF.md` — W2 mill work (ENGINE_USAGE_INDEX.json next)
- `LATHE-MASTER-HANDOFF.md` — lathe roadmap (pending review)
- `HANDOFF-pp-road-map.md` — post-processor roadmap
- `WEDM-CONSOLIDATED-ROADMAP.md` — wire EDM phase 4 RUL work

**No overlap with Phase E.** Phase E is pure infra — it modifies hooks + adds a bootstrap script. It does not touch engines, dispatchers, or domain logic. The other roadmaps can proceed independently; they'll benefit from Phase E once merged because future mill/lathe/wire chats will auto-isolate via `worktree-init.mjs`.

---

## Commands To Run First Tomorrow

```bash
# 1. Verify you can see Phase E branch
cd H:/prism-phase-e
git log --oneline -5
# should show: 2f862618 AGI-INFRA-PHASE-E/E3 ...

# 2. Confirm backward-compat still holds
node -e "import('./.claude/helpers/prism-paths.mjs').then(m => console.log(m.PRISM_ROOT, '|', m.PRISM_SHARED))"
# expect: H:\prism | H:\prism   (when env unset)

# 3. Pick up E4
# Read this handoff's E4 plan section
# Start with scripts/hooks/pre-commit (tracked hook), then launch-chat.ps1
```
