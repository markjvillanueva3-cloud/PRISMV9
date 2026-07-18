# PRISM Tree Reorganization — Plan v2

## Context

**Why this is being done.** PRISM has grown to 44 active git worktrees with ~11,150 untracked files spread across them (7,038 in main alone). Branch naming is flat (`work/<scope>`), worktree paths are inconsistent, and 16 conflict-artifact files (`-1`/`-2` suffixes) have accumulated. The user has just begun building neural network infrastructure (CrossProcess Tier 1-12 wired in `intelligenceDispatcher.ts`). The blast radius of "one mistyped path" is much higher with neural wiring than with isolated engine work — auto-imports cascade.

**Intended outcome.** A track-based hierarchy (`track/<category>/<milestone>`) covering all parts of the PRISM ecosystem, with path bugs **investigated** before being touched (the stub is more likely intentional than regression — see below), conflict artifacts triaged, and per-track catch-up commits replacing the giant uncommitted-file backlog.

**Three forensic findings reorder the priority list:**
1. `H:/PRISM/mcp-server/src/engines/index.ts` is an 818-byte stub but `index.ts-1` (252 KB) and `index.ts-2` (319 KB) contain real engine barrel exports. **Crucial nuance:** neural tests are passing now. The stub is therefore probably the canonical state, with engines importing each other directly via filename rather than through the barrel. Restoring from `-1`/`-2` is the riskier move. Investigation must precede any edit.
2. 11 stale `.claude/worktrees/agent-*` worktrees from 2026-04-17 are locked. They may still hold claim files referenced by current peer chats — must verify before pruning.
3. `H:/prism-xproc-neural` worktree has NULL HEAD (uninitialized) and `H:/prism-cad-complete` has 3,811 untracked.

## Track Taxonomy

### User-defined (14)
1. `track/dev-tools/` — build, test, lint, hooks, scripts, harness, scrutiny, tsc-cleanup
2. `track/ai-systems/` — orchestration, AGI reasoning, dispatchers, knowledge graphs, embeddings, fuzzy hybrid
3. `track/learning-systems/` — LoRA, neural ensembles, episodic memory, transfer learning, federated, curriculum
4. `track/mill/`
5. `track/lathe/`
6. `track/wire/` — wire EDM
7. `track/waterjet/`
8. `track/laser/`
9. `track/sinker/` — sinker EDM (distinct subsystem from wire)
10. `track/sfc/` — Speed Feed Calculator (saleable product)
11. `track/ppg/` — Post Processor Generator + Master Post (saleable product)
12. `track/business/` — shop management, scheduling, costing, quoting, dashboards
13. `track/erp/` — work orders, inventory, integrations (E2/Epicor/ProShop)
14. `track/hr/` — payroll, PTO, training, compensation, compliance

### Final taxonomy (all decisions captured 2026-05-06)
- **CAD = own track** (`track/cad/`) — design, feature recognition, blueprint-to-program, geometry.
- **CAM = per machining domain** — `track/mill/cam/`, `track/lathe/cam/`, `track/wire/cam/`, `track/waterjet/cam/`, `track/laser/cam/`, `track/sinker/cam/`, `track/grinding/cam/`. Each machining track owns its CAM bridges (Fusion, hyperMILL, Mastercam, SolidCAM, NX, PowerMill, CATIA) and toolpath strategies for that machine class.
- **`track/safety/`** — own track (Ω(x), S(x), tolerance validators; gates everything).
- **`track/quality/`** — own track (CMM, SPC, gauge R&R, FAI).
- **`track/grinding/`** — own track (full machining domain peer of mill/lathe/wire).
- **`track/tools-catalog/`** — own track (tool crib, inventory, vendor catalogs).
- **`track/knowledge/`** — own track (wiki, tribal knowledge, courses).

### Cross-track scope resolution rule
**Primary machining domain wins, then dispatcher owner.** Examples:
- `CAM-EXHAUST-MS0` → spans CAM strategies cross-machine; if mill-primary: `track/mill/cam-exhaust-ms0`. If genuinely platform-level (multi-machine bridges): treat as `track/dev-tools/cam-platform-exhaust-ms0`. Investigate per scope.
- `CAM-FUSION-MS1` → Fusion bridge spans mill+lathe; route to whichever machine that milestone primarily targets.
- `CAD-COMPLETE-MS0` → `track/cad/complete-ms0`
- `INFRA-NEURAL-LEDGER-MS1` → `track/ai-systems/neural-ledger-ms1`
- `LATHE-PROD-READY-MS0` → `track/lathe/prod-ready-ms0`
- `INTEL-OLLAMA-OBSIDIAN-MS0` → `track/ai-systems/intel-ollama-ms0`
- `WEDM-AGI-MS5` → `track/wire/agi-ms5`

## Critical Files

- `H:/PRISM/mcp-server/src/engines/index.ts` — INVESTIGATE FIRST. Don't edit until imports are mapped.
- `H:/PRISM/mcp-server/src/engines/index.ts-1`, `index.ts-2` — diff against canonical, against each other.
- `H:/PRISM/.claude/hooks/worktree-commit-route.mjs` — extend regex for `track/<category>/<scope>` alongside `work/<scope>`.
- `H:/PRISM/mcp-server/src/tools/dispatchers/intelligenceDispatcher.ts` — already wires CrossProcess T1-T12. Confirm no barrel-imports here before any `index.ts` move.
- `H:/PRISM/.gitignore` — expand for auto-regenerated state files.
- `H:/PRISM/.claude/scripts/verify-hook-refs.mjs` — already shipped this session. Will catch reorg breakage.
- `H:/PRISM/state/shared/handoffs/HANDOFF-*.md` — references to old branch names will need updating per chat.

## Reuse

- `worktree-commit-route.mjs` already enforces commit-scope ↔ branch matching — only the regex needs an extension for the `track/` pattern.
- `verify-hook-refs.mjs` (just shipped) detects broken paths + duplicate registrations.
- `prism_context:chat_post` for posting reorg progress to peer chats.
- `per-agent-handoff.mjs` already namespaces handoffs by chat ID + topic.
- `duplicationGuardEngine.checkBeforeCreating()` for any new track-mapping registry.

## Phased plan — atomic milestones (5–7 sessions, never bundle)

Each milestone ends with a checkpoint commit + handoff. Multi-session shape per Plan-agent feedback.

### M1 — Engines barrel resolution (Phase 0.4 + 0.1, read-then-act)
**Goal:** decide once and for all what to do with `index.ts` vs `-1`/`-2`. **No edits until investigation complete.**
- M1.1 `grep -rn "from .*engines/index" H:/PRISM/mcp-server` and `from .*engines";` — if zero importers, stub is intentional, delete artifacts.
- M1.2 If importers exist, diff stub vs `-1` vs `-2`. Run `tsc --noEmit` with each candidate as `index.ts` (in a temp copy) to find the version that compiles cleanly.
- M1.3 If stub is canonical: delete `-1`, `-2`. If `-1` is canonical: replace stub, run full build + tests.
- M1.4 Remaining 14 `-1`/`-2` files: same diff-then-delete.
- M1.5 Delete corrupted-name root files (`C:UsersMark...memory.unindexed.tmp.json`, `%SystemDrive%/`, `0`, `"#`, `.tmp-clear-creo-ownership-*.mjs`×8, `.tmp-clear-ownership-*.mjs`×3).
- **Exit gate:** `verify-hook-refs.mjs` clean, `tsc --noEmit` 0 errors, vitest baseline green.

### M2 — Worktree hygiene
- M2.1 For each of 11 stale `agent-*` worktrees: grep `state/shared/AGENT_CHAT.md` and claim files for any reference to its path. **No reference → safe to remove. Reference exists → leave alone, document in followup.**
- M2.2 Resolve `H:/prism-xproc-neural` (NULL HEAD): initialize properly OR `git worktree remove`.
- M2.3 Reconcile `H:/prism-cad-complete` 3,811 untracked: stash with `git stash -u` (preserves work), then inspect stash on a separate session. Don't lose data.
- **Exit gate:** `git worktree list` shows ≤ 12 active worktrees, all non-NULL HEAD, no live claims orphaned.

### M3 — Gitignore expansion
- M3.1 Add patterns for auto-regen state, tmp debris, build artifacts:
  ```
  state/shared/.brief-drift-snapshot.json
  state/shared/.cross-session-last-check.json
  state/shared/.svi-session-baseline.json
  state/shared/.hook-janitor-stamp
  state/shared/.prism-node-close-stamp
  state/shared/.scrutiny-*.txt
  state/shared/.wiki-lint-suggested-on
  state/checkpoints/
  mcp-server/data/state/learning-cache/
  .tmp-*
  *.ts-1
  *.ts-2
  *.json-1
  ```
- M3.2 Hard gate: `git check-ignore -v` against ≥ 3 example files per pattern. Verify ZERO real-work files are now-ignored. `git status --ignored` review by hand.
- M3.3 Commit `.gitignore` only.
- **Exit gate:** untracked count drops by ≥ 500 with provably zero data loss.

### M4 — Router supports both patterns (no renames yet)
- M4.1 Extend `worktree-commit-route.mjs` regex to recognize **both** `work/<scope>` (legacy) and `track/<category>/<scope>` (new). Coexistence during migration.
- M4.2 Add unit test for the new pattern.
- M4.3 Commit. **No branch renames yet.** All peer chats continue working on legacy names.
- **Exit gate:** new pattern accepted by router; legacy still works; tests pass.

### M5 — Per-track rename (one track per session)
- M5.1 Pick first track to migrate (recommend `dev-tools` since it has lowest cross-traffic).
- M5.2 Broadcast on chat bus: "rename window opening for `<branch>` → `track/<cat>/<scope>`. Pause non-trivial commits for 10 minutes."
- M5.3 `git branch -m <old> <new>`. Update worktree path if mismatched. Update `HANDOFF-*-*.md` references for the affected scope. Commit.
- M5.4 Build + test smoke. Broadcast completion.
- M5.5 Repeat for next track.
- **Critical:** never batch renames. One rename, one build, one commit, one handoff.
- **Exit gate per track:** all 4 active peer chats acknowledge new branch name; commit hook validates; no peer-claim breakage.

### M6 — Per-track catch-up commits
**Never `git add -A`.** Track-by-track within their renamed branches.
- M6.1 For each track, switch to its worktree (or main with `[MAIN]` prefix for cross-cutting).
- M6.2 Use file content + path + last-mtime to attribute each untracked file to a milestone.
- M6.3 Stage only files belonging to that track's current milestone. Commit with `[track/<cat>/<milestone>]/U-<unit>` subject.
- M6.4 Sequence: dev-tools → ai-systems → learning-systems → machine tracks (mill/lathe/wire/sinker/waterjet/laser/grinding) in roadmap-priority order → sfc → ppg → cad/cam (cross-cutting) → safety/quality (cross-cutting) → business → erp → hr → tools-catalog → knowledge.
- **Exit gate:** `git status --porcelain | wc -l` ≤ 50.

### M7 — Validation
- M7.1 `verify-hook-refs.mjs` clean.
- M7.2 Full build (`npm run build`) — must pass.
- M7.3 Full test suite (`npx vitest run`) — must match `state/shared/TSC_BASELINE_ERRORS.json`.
- M7.4 All 4 active peer chats post `chat_post` confirming their handoff and claims still resolve.
- M7.5 Commit final `[MAIN] [TRACK-REORG-MS0]/U-COMPLETE` checkpoint.

## Risk Register (top 5)

1. **Restoring `index.ts-1` re-breaks build** — diff-then-tsc-noEmit before any commit; if stub is canonical (likely), don't touch.
2. **Pruning `agent-*` worktrees kills active claim files** — grep peer-bus for any path under those worktrees before `git worktree remove`. If unsure, leave it.
3. **Branch rename mid-session orphans peer handoffs** — restart all peer sessions; pin a "rename window" with no concurrent writes; broadcast on chat bus before each rename.
4. **`.gitignore` swallows real work** — `git status --ignored` diff and review by hand for every pattern.
5. **3,811 untracked in cad-complete contains the only copy of recent work** — `git stash -u` per worktree before any destructive op, verify stash list survives across sessions.

## Verification

End-to-end after M7:
```bash
node H:/PRISM/.claude/scripts/verify-hook-refs.mjs            # exit 0
cd H:/PRISM/mcp-server && rtk npx tsc --noEmit                # 0 errors
cd H:/PRISM/mcp-server && rtk npx vitest run                  # all green
cd H:/PRISM && git status --porcelain | wc -l                 # ≤ 50
git worktree list                                              # ≤ 12 entries on track/<cat>/<scope>
node H:/PRISM/.claude/scripts/chat-bus-tail.mjs --since=24h | grep TRACK-REORG-CONFIRMED
```

## Final taxonomy (20 tracks)

User-named (14): dev-tools, ai-systems, learning-systems, mill, lathe, wire, waterjet, laser, sinker, sfc, ppg, business, erp, hr.
Cross-cutting (6, all own tracks per user 2026-05-06): cad, safety, quality, grinding, tools-catalog, knowledge.

CAM is **NOT** a top-level track — it lives as a subdirectory inside each machining track (`track/<machine>/cam/`).

## Decisions captured

- ✅ **CAD = own track**, **CAM = per machining domain**
- ✅ **Cadence = M1-M7 across sessions with handoffs** (1-2 milestones per session, chat-bus broadcasts at each boundary)
- ✅ **All 5 cross-cutting subsystems become their own tracks**: safety, quality, grinding, tools-catalog, knowledge
- ✅ **Cross-track scope resolution rule**: primary machining domain wins, then primary dispatcher owner. Disambiguate per-scope when ambiguous.
