# MILESTONE: WORKTREE-CONSOLIDATE-MS0 — H: drive cleanup

## Context

The H: drive has accumulated **45 git worktrees** (audit at `state/shared/WORKTREE-AUDIT-2026-05-06.md`) representing months of parallel multi-chat development. Domain scrutiny (`state/shared/DOMAIN-SCRUTINY-2026-05-06.md`) shows **major production claims contradicted by stranded commits**:
- `OkumaMultusB250IIMillTurnMasterPostEngine` — claimed production, NOT in main HEAD (lives in `prism-ppgh05` with 798 stranded commits)
- MILL-MASTER-AI-WIRING U1-U17 — 17 unmerged units idle 12d in `prism-mill-worktree`
- AdvancedPost / RapidReposition / AutoSpeedFeed pipelines — 682 commits stranded in `prism-ppg-advancedpost`

A **second symptom** discovered during exploration: `.lintstagedrc*` config file does not exist. That's the root cause of the recurring `FIX1/FIX2: actually ship X (lost in prior lint-staged stash)` pattern (T2-02, T3-04, T4-01, CAD-FUSION-LIVE PHASE1). Without rules, lint-staged stashes everything as a safety measure; if the husky pre-commit gate fails, the stash is orphaned and files appear "lost."

Goal: consolidate stranded commits onto main via a dedicated `merge-staging-ms0` branch using cherry-pick (no peer chat disruption), reduce active worktree count from 45 → ~31, and fix the lint-staged root cause so the leakage stops.

## Strategy: Hybrid Risk + Cherry-Pick Side Branch

Per user direction:
- **Side branch** — `work/merge-staging-ms0` worktree at `H:/prism-merge-staging`. All cherry-picks land here first; main only gets the squashed result.
- **Hybrid risk** — small worktrees (≤10 commits, idle ≥6d, clean tree) fast-forward; big stranded branches (≥100 commits) get full 3-of-3 scrutiny gate.
- **Multi-chat safe** — only this chat operates on `merge-staging-ms0`; peer chats keep their lanes (`file-claim-guard` already enforces this; `worktree-commit-route.mjs` whitelist needs `[MERGE-STAGING]` prefix added).

## Reusable Tooling (already exists — do NOT reinvent)

| Tool | Path | Use for |
|---|---|---|
| `DuplicationGuardEngine` | `mcp-server/src/engines/DuplicationGuardEngine.ts` | `mustCheckBeforeCreating()` before any new asset; `searchExisting()` for cluster audits |
| `/dedup` skill → `prism_dev:engine_overlap_scan` | `.claude/commands/dedup.md` | Cluster-level overlap scan for Collision/MillingAGI/Cost reconciliation |
| `worktree-commit-route.mjs` | `.claude/hooks/worktree-commit-route.mjs` | Already routes commits by scope — extend whitelist to allow `[MERGE-STAGING]` |
| `git-anti-clobber.mjs` | `.claude/hooks/git-anti-clobber.mjs` | Per-worktree locks already serialize git mutations safely across chats |
| `scrutiny-3way.mjs` | `.claude/scripts/scrutiny-3way.mjs` | Pre-existing 3-of-3 multi-CLI gate (Codex+Gemini+Opus) for big-merge sign-off |
| `test-legitimacy.mjs` | `.claude/hooks/test-legitimacy.mjs` | **Note:** only blocks **weak EOL** `.toBeDefined()` — the raw 1500 grep count includes many legitimate uses. Real violation count is much lower; needs targeted audit. |
| `ShopSchedulerEngine.ts` U-CONSOL1/U-CONSOL2 marks | `mcp-server/src/engines/ShopSchedulerEngine.ts` | Reference pattern for engine consolidation commits |

## Tooling to Build (does NOT exist)

| New asset | Path | Why |
|---|---|---|
| `.lintstagedrc.json` | repo root | **P0 CRITICAL** — stops the FIX1/FIX2 stash-leakage class of bug |
| `scripts/cherry-pick-consolidator.mjs` | `mcp-server/scripts/` | Drives cherry-pick from a stranded worktree → `merge-staging`, with conflict detection + 3-way scrutiny hook |
| `scripts/orphan-file-audit.mjs` | `mcp-server/scripts/` | Enumerate `.js`/`.ts` pairs, `*-1` orphans, files with no exports — feeds dedup decisions |
| `scripts/test-legitimacy-targeted.mjs` | `mcp-server/scripts/` | Apply the EXACT regex from `test-legitimacy.mjs` to the 1500 grep matches; returns the real violation list |

## Phased Plan (7 phases, each independently shippable)

### P0 — Stop the bleeding (1-2 hours, NO peer-chat conflicts)
**Critical files to create:**
- `.lintstagedrc.json` — explicit rules: lint+format `**/*.{ts,tsx}` and `**/*.{md,json}`; no auto-stash for files outside the rule set
- `mcp-server/scripts/cherry-pick-consolidator.mjs` — accepts `--from <worktree-path> --range <sha-or-range> --to merge-staging-ms0` and uses `git -C` so it never changes the active CWD
- `mcp-server/scripts/orphan-file-audit.mjs` — outputs JSON to `state/shared/ORPHAN-AUDIT-2026-05-06.json`
- `mcp-server/scripts/test-legitimacy-targeted.mjs` — outputs `state/shared/TEST-LEGITIMACY-VIOLATIONS-2026-05-06.json`

**Worktree-commit-route extension:** Add `[MERGE-STAGING]` to `MAIN_WHITELIST_PREFIXES` in `worktree-commit-route.mjs` (currently only `[MAIN]` and `[MAIN-FORCE]` are whitelisted).

**Create the merge-staging worktree:**
```bash
git worktree add H:/prism-merge-staging -b work/merge-staging-ms0 main
```

**Verification:** Run `node scripts/orphan-file-audit.mjs` and `node scripts/test-legitimacy-targeted.mjs`; commit the configs as `[MERGE-STAGING]/U-FOUNDATION-01..04`.

---

### P1 — Fast-forward the 4 small ready-to-land worktrees (~30 min)

Per audit, these have ≤1 commit ahead, clean tree, idle ≥6d:

| Worktree | Branch | Action |
|---|---|---|
| `.claude/worktrees/data-loss-fix` | `worktree-data-loss-fix` | Cherry-pick `8f3527e2e` → merge-staging |
| `.claude/worktrees/guard-wire-ms0` | `worktree-guard-wire-ms0` | Cherry-pick `94194af1a` → merge-staging |
| `.claude/worktrees/omega-loader-ms0` | `worktree-omega-loader-ms0` | Cherry-pick `e628b0c4c` → merge-staging |
| `.claude/worktrees/stabilize-cba638c3` | `worktree-stabilize-cba638c3` | Already merged → just `git worktree remove` (no cherry-pick needed) |

After cherry-picks land + tests pass + main fast-forward: prune all 4 worktrees with `git worktree remove`. **No 3-of-3 gate** — these are 1-commit additions, lower bar acceptable per hybrid policy.

---

### P2 — Mastercam 8/8 milestone (medium merge, ~1 hour)

`prism-cam-ms1-93a0` (`work/cad-fidx-fus-93a0`, 626 ahead, milestone-complete tag, idle 5d). 16 commits are `[MAIN]`-tagged Mastercam 1/8 → 8/8 + Fusion 8/8 + Inventor 8/8 — already vetted as "mergeable as-is" in CAD scrutiny.

**Steps:**
1. Cherry-pick the 16 `[MAIN]`-tagged commits via `cherry-pick-consolidator.mjs --from H:/prism-cam-ms1-93a0 --filter '\[MAIN\]'`
2. Re-run `npx vitest run src/__tests__/{Mastercam,Fusion360,Inventor}*.test.ts` against staging
3. Run 3-of-3 scrutiny gate: `node .claude/scripts/scrutiny-3way.mjs --target HEAD~16..HEAD`
4. On all PASS, fast-forward main from staging; remove worktree

---

### P3 — Big stranded merges (3 worktrees, full gate, ~3-4 hours each)

For each: cherry-pick `[MAIN]`-tagged commits → merge-staging; resolve conflicts off-chain; run domain-targeted vitest; run 3-of-3 scrutiny; FF main.

**P3a: `prism-ppgh05` (798 commits)** — Multus + OkumaOSPMill PPGOH + HurcoV11 PPGH series
- Stranded engine: `OkumaMultusB250IIMillTurnMasterPostEngine.ts` (NOT in main)
- Domain: post processors / lathe / mill-turn
- Risk: peer chat `claude-31dfad9c` is actively editing `prism-ppgh05` files RIGHT NOW (calcDispatcher, safetyDispatcher, ArcFeedFactor tests). **Must wait for peer to finish current commit before starting cherry-pick range.** Coordinate via chat-bus message.

**P3b: `prism-ppg-advancedpost` (682 commits)** — AdvancedPost / RapidReposition / AutoSpeedFeed pipelines, JM Die fleet profiles
- Domain: post processors / mill / hyperMILL
- Risk: low (idle 4d, no peer claims)

**P3c: `prism-mill-worktree` (63 ahead, 20+ uncommitted modifications, idle 12d)** — MILL-MASTER-AI-WIRING U1-U17
- **Pre-step:** Audit the 20+ uncommitted modifications. Either commit as `[MAIN] [MILL-MASTER-AI-WIRING]/U-W17-FINAL` or `git stash` them with a labeled stash, then proceed with cherry-pick of the 63 ahead commits.
- Domain: mill / AI wiring
- Risk: medium — uncommitted state could mask half-finished work

---

### P4 — INVESTIGATE worktrees triage (14 worktrees, manual)

Each requires a per-tree decision. Split by destructiveness:

**Subgroup A — Aborted rebase / sync drift (4 trees):** `prism-cad-complete` (3811 deletions), `prism-cam-exhaust` (30 del), `u-fus-api01` (116 del), `u-fus-api02` (77 del incl. live engine deletions: `MillPatternMiner`, `SurfaceFinishPredictor`, `ChainFailureRecovery`).
- Action: `git rebase --abort` first if applicable. Cherry-pick valid `[MAIN]`-tagged commits → merge-staging. Discard the deletions (sync drift, not intent). Prune.
- **Critical:** `u-fus-api02` deletions of live engines must NOT be cherry-picked.

**Subgroup B — Destructive deletions on doc/meta branches (3 trees):** `prism-claudemd-enforcement` (468 ahead, 20+ deletions of WEDM tests), `prism-file-claim-fix` (482 ahead), `prism-knowledge-wiki` (493 ahead).
- Action: Per audit, scope mismatch. Cherry-pick only the 1-2 actual `[META]/[CLAUDEMD-FIX]` commits matching scope; discard everything else.

**Subgroup C — Self-declared milestone close (1 tree):** `prism-iooms1` (612 ahead, MS-CLOSE).
- Action: Run 3-of-3 scrutiny on full delta vs main; if PASS, squash-merge as one commit `[INTEL-OLLAMA-OBSIDIAN-MS1]/MS-CLOSE`. If FAIL, retire branch.

**Subgroup D — Diverged/mid-flight (2 trees, mill-worktree handled in P3c):** `prism-session-efficiency` (78 ahead, 20+ deletions, idle 12d), `psau-sav2` (52 ahead, 28 deletions, divergent).
- Action: Treat as P3-equivalent; cherry-pick clean commits, discard deletions.

**Subgroup E — Broken (1 tree):** `prism-xproc-neural` (HEAD unreachable, branch never received initial commit, 13,119 staged files).
- Action: Delete worktree + branch. Whatever was staged is lost (the branch was created but the initial commit never landed). Document the loss.

**Subgroup F — Already-archived (1 tree):** `prism-forge-archive` (6 ahead, behind=0, contradiction).
- Action: Tag the 6 archive commits as `archive/forge-orphans-2026-05-01-final`, prune worktree, formally retire branch.

**Subgroup G — Dead locked agent (1 tree):** `agent-abd2bcee` (111 deletions, ahead=0).
- Action: Same as PRUNE list — `git worktree remove --force`.

---

### P5 — Dedup audit (4 sub-tracks, ~2 hours)

**P5a — Orphan files (5 deletions, low risk):**
- Delete `.js` files where `.ts` exists: `AutoWiringEngine.js`, `QualityDashboardEngine.js`, `QualityScoreEngine.js`
- Delete `*-1` orphans: `ActualCostEngine.ts-1`, `ChatterStabilityLobeEngi-1` (no ext), `WEDMPrintToProgramEngine-1` (no ext)
- Verify each: `grep -rln "AutoWiringEngine.js" mcp-server/src/` returns zero before deletion
- Commit: `[MERGE-STAGING]/U-DEDUP-ORPHAN-01..03`

**P5b — Cost engine pair:**
- Run `duplicationGuardEngine.checkBeforeCreating({assetType:'engine', proposedName:'CostEstimation', keywords:['cost','estimate']})` — returns existing matches
- If `CostEstimationEngine.ts` and `CostEstimatorEngine.ts` are >70% similar: deprecate the lesser-wired one with `@deprecated` JSDoc; consolidate consumers

**P5c — Collision cluster (5 engines):**
- Run `prism_dev:engine_overlap_scan --candidate=CollisionDetectionEngine`
- Likely keep `CollisionDetectionEngine` as canonical (broad/narrow phase); `CollisionEngine` is a likely thin wrapper to deprecate
- `CollisionHazardDetectorEngine`, `CollisionIntegrationEngine`, `CollisionPreventionEngine` may be legitimate specialty roles — verify via dispatcher action audit before any deletion

**P5d — MillingAGI cluster:**
- Per dedup agent finding, only 2 engines (MillingAGIMasterEngine + MillingAGIOrchestrationEngine), not 7 as initially feared
- Verify Master is wrapped by Orchestration; if so, both keep with `@orchestrates` JSDoc
- The other 5 (MillingAILearningOrchestrator, MillingAIUltraIntelligence, MillingAIUnification, MillingUltimateAI, MillingAIIntegration) are different responsibilities — confirm via reading their headers, no action

---

### P6 — Test legitimacy audit (~1 hour)

The raw count of 1500 `toBeDefined()` files is misleading. The hook (`test-legitimacy.mjs`) only blocks **weak EOL presence assertions** — many of the 1500 are legitimate uses inside larger assertion chains.

**Steps:**
1. Run `node scripts/test-legitimacy-targeted.mjs` (built in P0). It applies the exact regex from the hook to all 1500 files.
2. Output: real violation count (likely 50-200 files, not 1500)
3. Triage by domain: critical-path tests (mill physics, lathe safety, WEDM AGI) get priority
4. For each real violation: replace `expect(x).toBeDefined()` at EOL with concrete assertion (exact value, exact count, regex match)
5. Run anti-regression: `npx vitest run` per fixed file
6. Target: top 100 highest-value violations fixed; document remainder for follow-up milestone

---

### P7 — Final cleanup

- Prune the 10 PRUNE list worktrees (locked agent-* + stabilize-cba638c3) with `git worktree remove --force`
- Verify final state: `git worktree list` shows ~31 entries (down from 45)
- Update `state/shared/WORKTREE-AUDIT-2026-05-06.md` with final outcome
- Update `state/shared/DOMAIN-SCRUTINY-2026-05-06.md` readiness scores
- Push all merge-staging commits to main: `git checkout main && git merge --ff-only work/merge-staging-ms0 && git push`
- Retire `merge-staging-ms0` branch + worktree

## Multi-Chat Safety Protocol

This entire milestone runs in **one dedicated chat** (this one) on `merge-staging-ms0`. Other chats continue in their own lanes — they will not block on us.

**Before each cherry-pick range:**
1. Read chat-bus (auto-injected each prompt). If peer chat has active claims on files in the source worktree, post via `prism_context:chat_post` requesting completion ETA.
2. Wait for claim to expire OR for peer to ack.
3. Acquire `git-anti-clobber` lock on the source worktree (per-worktree, allows parallel work elsewhere).
4. Cherry-pick → merge-staging.
5. Release lock.

**Commit subject format:** All commits land as `[MERGE-STAGING]/U-<phase>-<unit>: <one-line>` so `worktree-commit-route.mjs` can route them.

## Verification

End-to-end test plan after each phase:

```bash
# Build (must be PASS at every phase boundary)
cd H:/prism-merge-staging/mcp-server && npm run build:fast    # 3s
cd H:/prism-merge-staging/mcp-server && npm run build         # full ~30s, pre-commit gate

# Anti-regression suite (per-domain after that domain's merges land)
npx vitest run src/__tests__/Mill        # P3c
npx vitest run src/__tests__/{Okuma,Hurco,WEDM}  # P3a, P3b
npx vitest run src/__tests__/{Mastercam,Fusion,Inventor}  # P2

# Scrutiny gate (P2 + P3a + P3b + P3c + P4 subgroup C + each subgroup A item)
node .claude/scripts/scrutiny-3way.mjs --target <range>
# requires Codex PASS + Gemini PASS + Opus PASS

# Final inventory verification
git worktree list | wc -l    # expect ~31 (was 45)
node scripts/update-prism-inventory.mjs  # regenerate PRISM-INVENTORY-LATEST.md
```

## Rollback plan

- **Per-merge:** Cherry-picks land on `merge-staging-ms0` first. If anything fails verification, `git reset --hard origin/main` on staging and retry.
- **Per-phase:** Each phase commits independently. If P3a corrupts, P0/P1/P2 are already in main and unaffected.
- **Catastrophic:** All operations cherry-pick from source worktrees that remain intact until P7 prunes them. Source-of-truth is preserved until the final verification pass.

## Out of scope

- Building Mazak / Heidenhain / Siemens 840D / Hass mill posts (CAD scrutiny gap — separate milestone)
- Building Trumpf / Bystronic / Amada laser posts (deferred — separate milestone)
- Sinker EDM controller dialects (deferred)

## Estimated effort

- P0: 1-2 hours (foundation tooling)
- P1: 30 min (4 fast-forwards)
- P2: 1 hour (Mastercam medium merge)
- P3: 3-4 hours each × 3 = 9-12 hours (big stranded merges with full gate)
- P4: 2-4 hours (14 INVESTIGATE worktrees triaged in subgroups)
- P5: 2 hours (dedup audit)
- P6: 1 hour (test legitimacy targeted audit)
- P7: 30 min (cleanup)

**Total: 17-23 hours over 3-5 sessions.** Each phase is independently shippable; session-end checkpoint via `/handoff` after each phase boundary.
