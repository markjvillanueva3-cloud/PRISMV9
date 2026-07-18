# CAM Galaxy GSD.md — CAM-domain session lifecycle + dev protocol (slot:kilo)

> Domain-specific GSD (Get-Stuff-Done) protocol for CAM work. The fleet-wide lifecycle is
> `mcp-server/data/docs/gsd/GSD_QUICK.md`; THIS is the CAM-scoped distillation — what a kilo
> session does at start / during / at close, plus the hard-won CAM-dev patterns that future
> sessions should not re-derive. Synthesized 2026-05-29 from slot:kilo session history
> (CAM-mastery, post-bridge, SF-PSN, master-post, cad-fusion, quoting, galaxy buildout,
> awareness surface, wiring campaign). Companion to [`./CLAUDE.md`](CLAUDE.md) (doctrine) +
> [`./MEMORY.md`](MEMORY.md) (brain) + [`./PATHS.md`](PATHS.md) + [`./TOOLBELT.md`](TOOLBELT.md).

## 1. Session bootstrap (every CAM session — ~0 extra tokens)
1. The galaxy brain auto-loads (`slot-context-bundle-inject` → `SLOT_GALAXY_MAP.kilo='cam'`) → `cam/CLAUDE.md` + `cam/MEMORY.md` apply.
2. The compact CAM awareness digest auto-injects at SessionStart (`.claude/hooks/cam-awareness-inject.mjs`, slot=kilo-gated). For the FULL picture: `node scripts/cam-awareness-snapshot.mjs --stdout`.
3. Confirm the galaxy is whole: `node scripts/cam-galaxy-verify.mjs` (8 checks, exit 0/1/2). Run after any peer merge.
4. Read THIS chat's handoff (`per-agent-handoff.mjs read`) before picking work.

## 2. CAM work routing (route-before-grep)
- **prism_cam** (camDispatcher, 18.9K lines) — primary. Triad `cam_strategy_recommend → toolpath_generate → collision_check_full`. Now also `cam_p2p_orchestrate/explain` + physics: `cam_kienzle_force / cam_taylor_tool_life / cam_feedrate_chipload / cam_tool_deflection / cam_coolant_strategy / cam_omega_score`.
- **camFunctionDispatcher** — per-vendor function/operation index.
- **prism_toolpath** (toolpathDispatcher) — strategy engine + physics-aware `simulate`/`cycle_time_estimate`/`surface_finish_predict`.
- Always `prism_session:master_index_query` / `Glob CAM*.ts` BEFORE grepping 3000+ engines.

## 3. The CAM engine-wiring pattern (proven — `reference_kilo_cam_wiring_campaign_2026_05_29`)
Wiring an orphaned CAM engine into prism_cam:
1. **Audit ground-truth** (not BUILD_STATE — it counts transitive): is the engine referenced in any non-engine src? If only other engines reference it → internal-layer (leave). If nowhere → true orphan (wire).
2. **Dedup** — `grep "<action>" camDispatcher.ts` + check the engine isn't superseded by an existing action (e.g. `surface_finish_predict`, `cycle_time_estimate` already exist on prism_toolpath).
3. Read the engine: singleton export + primary method + typed Input/Result.
4. Add action(s) to the `ACTIONS` z.enum array (snake_case + comment) AND a `case` in the switch (lazy `await import()`, `params as Parameters<typeof fn>[0]` cast, null-return → descriptive error).
5. Test `camDispatcher.<x>-wire.test.ts`: MockMCPServer + `call()` + **z.enum-membership guard** (catches the false-green class — MockMCPServer bypasses the SDK z.enum) + **CONCRETE value assertions** (reuse the engine's own test fixtures; `.toBeTruthy()` is rejected by the TEST LEGITIMACY GATE).
6. `vitest run` the suite + `tsc --noEmit | grep <surfaces>` (repo has a tsc baseline — isolate NEW errors).
7. Per-file scrutiny (2 reviewers) → 3-of-3 → commit `[kilo] [...]/U-CAM-WIRE-<X>`.

## 4. Hard-won gotchas (do NOT re-learn — from session history)
- **Security-reminder hook false-flags** the node spawn API AND the bare regex match-method token (`.exec`) as shell-injection — even in MEMORY *prose*. Build galaxy scripts/hooks **spawn-free** (read git via `.git/HEAD` + `.git/logs/HEAD` reflog with `fs`) and use `matchAll` for scans. Avoid quoting those tokens in memory files.
- **Bash cwd resets after a session resume** — chain `cd H:/prism-slot-kilo && rtk git ...` in ONE `&&` sequence, or SLOT-COMMIT-ENFORCE blocks the commit (it sees cwd=H:/prism). A blocked `[kilo]` commit also UNSTAGES — re-`git add` chained.
- **PowerShell here-strings (`@'...'@`) don't work in the Bash tool** — use bash `-m "subject" -m "body"` flags for multi-line commits.
- **Workflow tool**: schema-forced StructuredOutput + parallel fan-out can fail (StructuredOutput non-compliance, then rate-limit). For an audit, a direct inline audit is more reliable than a flaky workflow; sequential/small-batch agents beat large parallel fan-outs under rate-limit.
- **Worktree-vs-main staleness** is NOT a real gap: galaxy files committed to slot/kilo show stale on main until golf merges; hooks wired at the main-tree path activate on merge (don't pre-wire settings.json — it breaks the fleet).

## 5. Invariants (kilo doctrine — the 5 refuses)
1. Physics constants from `src/physics/constants.ts` — never inline.
2. No toolpath ships without `collision_check_full` at the engagement (clearance number, not "safe").
3. Cross-CAM transfer via `CAM_VENDOR_REGISTRY` / `CAMCrossSystemTranslator` — same-physics-class ≠ same-param-name.
4. shop_floor tier (Ω≥0.95, S(x)≥0.98) on every recommendation.
5. CAM terminates in a validated strategy handoff to echo — never emits G-code dialect.

## 6. Close-out (every CAM unit)
- Per-file scrutiny on multi-file builds; 3-of-3 Stop gate (arms A/B/C all PASS) before done.
- Doc-reflection: update the relevant memory + (if doctrine) cam/CLAUDE.md + wiki `cam-galaxy.md` + tribal.
- Commit `[kilo] [SCOPE]/U-ID: title` (routes to slot worktree); the campaign memory tracks multi-iteration progress.
- `xproc_outcome_publish {slot:'kilo', domain:'cam'}` closes india's learning loop (auto via `outcome-bus-auto-tap`).

## PSN + cross-refs
delta→CAM (features) · CAM→echo (G-code) · foxtrot/whiskey/mike↔CAM (cut physics) · oscar→CAM (speed/feed) · CAM→india (outcomes/GNN) · tango→CAM (geometry algos). Memories: [[reference_kilo_cam_galaxy_buildout_2026_05_28]] · [[reference_kilo_cam_awareness_surface_2026_05_28]] · [[reference_kilo_cam_wiring_campaign_2026_05_29]] · [[reference_kilo_cam_dispatcher_surface_2026_05_28]].
