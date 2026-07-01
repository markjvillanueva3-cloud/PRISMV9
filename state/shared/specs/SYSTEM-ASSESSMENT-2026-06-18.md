# PRISM Full-System Assessment -- 2026-06-18 (slot:golf)

> Evidence-grounded assessment across the 6 operator-named dimensions: **synergy opportunities,
> improvements, gaps, bugs, conflicts, inefficiencies.** Every finding cites concrete evidence
> (file/artifact/measured number) gathered this session. Advisory; owner slots are best-guess.
> Method: inline evidence-gather (deterministic reads/greps) + synthesis (the Workflow fanout-gate
> capped the agent fan-out as mechanical; assessment needs repo tool-use, so it was done inline).

## Executive summary

PRISM is **structurally healthy and actively self-correcting** -- 48 regressions logged+fixed in the
current CLAUDE.md window, anti-pattern greps for the dangerous classes (fail-open-on-corrupt,
empty-catch) come back clean, AI-synergy scores 34/34 on the owns-AI + vault dimensions, and the MCP
disconnect root-cause (the `mcp-bridge-enforce` gate) is fixed + verified this session. The system's
real liabilities are **process/scale-hygiene, not correctness**: a 34K-file uncommitted shared tree, a
196-hook per-event injection surface, two divergent milestone trees, and two autonomous-loop control
bugs that can trap a chat in an unsatisfiable loop. None is safety-critical; all are high-ROI to fix.

---

## P0 -- highest priority (correctness/loss risk)

### P0-1 [conflicts/inefficiency] 34,122-file uncommitted shared tree
- **Evidence:** `git status --porcelain | wc -l` = 34,122 (this session). Commits race: my staged file
  was dropped mid-commit by a concurrent peer (`india`/`zulu`) twice; fixed only by atomic path-scoped commits.
- **Risk:** at-risk work (uncommitted = lost on a reset), racy commits, false BUILD_STATE signals
  (BUILD_STATE NEEDS_WIRING showed stale 18 vs live 8). Untracked engines (e.g. `GrokCLIClientEngine.ts`)
  can't be safely committed by peers without absorbing each other's work.
- **Recommendation:** fleet-wide drain -- each slot commits its own work to its slot branch; integrator
  (golf/sierra) batches `[MAIN]` commits. Add a per-slot "uncommitted-age" watchdog. **Owner: golf + all slots.**

### P0-2 [bugs/process] goal-complete-gate accepts only unsatisfiable multi-turn outcomes -> infinite loop
- **Evidence:** observed live this session -- the `/goal` gate (`goal-complete-gate.mjs`) rejected 6
  consecutive evidence-grounded stops, demanding golf clear a "3890-unit / 730-milestone" fleet-wide
  backlog in one session (BUILD_STATE.NEEDS_BUILDING). It cannot be satisfied in a single session by one slot.
- **Risk:** traps a chat in a re-block loop; burns tokens; the re-block-storm-breaker is the only escape.
- **Recommendation:** gate should accept a BOUNDED done-signal (this-turn progress committed + handoff written)
  for inherently multi-turn goals, not a fleet-wide-completion check. **Owner: bravo/zulu (orchestration).**

### P0-3 [bugs/process] autonomous `/loop` re-returns a completed single-task -> degenerate loop
- **Evidence:** `loop-state.mjs next` returned `MULTI-CLI-SYNC-HOOK-MS28 / P0-U02` repeatedly
  (`rollsTotal` 2->3->4) AFTER both its units were committed (`cbc5fc6db6`, `bf3c2f866a`); `end` did not
  stick (reactivated at iter 0). pick-unit keys off a source (roadmap-index) not updated by envelope completion.
- **Recommendation:** pick-unit must consult envelope/commit completion before re-issuing a task; `end`
  must persist against the auto-resume RESUME_LOOP directive. **Owner: bravo/zulu.**

---

## P1 -- high ROI

### P1-1 [inefficiency] 196-hook per-event injection surface
- **Evidence:** `settings.json` hooks = 64 UserPromptSubmit + 63 SessionStart + 69 Stop = **196**. Every
  prompt fires 64 injectors; every Stop fires 69. The per-turn injected context is ~20+ blocks (visible in
  this session's prompts).
- **Risk:** token + latency overhead on every single turn fleet-wide; injection-dedup helps but the raw
  count is the cost driver.
- **Recommendation:** audit for redundant/overlapping injectors (several are CAG-gated duplicates);
  consolidate SessionStart headline injectors; measure per-hook token cost + retire low-value ones.
  **Owner: alpha (token-optimization/injection).**

### P1-2 [conflicts] two divergent milestone trees (753 vs 383)
- **Evidence:** `mcp-server/data/milestones/*.json` = 753 (canonical) vs `data/milestones/*.json` = 383 (stale).
  Tooling has pointed at the wrong tree (DRIFT-01 milestone-progress bug fixed this session `c4f8ea3d4d`;
  FileSystemNavigator hint de-rotted `cc45bcb095`). A `_RETIRED-USE-MCP-SERVER-DATA-MILESTONES.txt` sentinel
  was added last session.
- **Recommendation:** finish retiring the 383 tree -- repoint/verify every reader (`reconcile-milestones.mjs`
  DATA_DIR, any others) to the canonical tree, then archive the stale tree. **Owner: golf/sierra.**

### P1-3 [synergy] MCP-babysitting hook cluster is over-engineered (the disconnect was self-inflicted)
- **Evidence:** the cluster (`mcp-bridge-enforce` + `mcp-broadcast-reconnect` + `mcp-connectivity-check` +
  `mcp-priority-guardian` + route-takeup + posttool-tracker). The enforce gate (built 2026-06-16) DENIED tool
  calls on a false-positive liveness heuristic and WAS the recurring "every chat disconnects" -- now disabled
  (`PRISM_MCP_ENFORCE_DISABLE=1`, verified this session; only heuristic block path, early-exits before I/O).
- **Recommendation:** prefer the stable server + Claude Code native reconnect; keep the babysitting hooks
  advisory-only; do NOT re-arm the enforce gate. **Owner: bravo (built it) + golf (MCP lifecycle).**

### P1-4 [gaps] 8 cross-domain CAD bridges unwired
- **Evidence:** live `audit-unwired-engines.mjs` = UNWIRED 8 / WIRE-EXEMPT 122 (after golf tagged 3 octopus
  clients exempt this session, `97e93e784e`). The 8 are CAD bridges (Creo/Onshape/Rhino/CATIA/NX) with
  `UNKNOWN` suggested dispatcher; romeo verified them this week.
- **Recommendation:** delta/kilo decide each bridge's dispatcher home (prism_cad/prism_cam) + wire with a
  round-trip test. NOT golf's blind call. **Owner: delta (CAD) + kilo (CAM).**

---

## P2 -- worth doing

### P2-1 [synergy] knowledge-feeder crons paused under HW-migration freeze
- **Evidence:** `MIGRATION-FREEZE-ACTIVE.flag` present since 6/9; ~45 `PRISM *` scheduled tasks disabled
  incl. 11 Galaxy Mine (ollama->obsidian) + Brain Refresh + Galaxy Knowledge Iterate. fleet-task-health WARN
  (the disabled set is classified "expected (migration freeze)"). Obsidian deep-mining compounding is paused.
- **Recommendation:** when the operator confirms the HW/drive migration is done + removes the flag, re-arm the
  verified-safe feeder subset (one-command restore). Until then, leave frozen. **Owner: golf + operator.**

### P2-2 [gaps] NN/GNN tier-5 below full-coverage gate
- **Evidence:** PSN-leg-state -- NN/GNN AUROC 0.789, deploy-ready-selective @ tau=0.7 (27% coverage, Brier
  0.0417); full-holdout below the 0.78 macro-F1/Brier gate. Calibration is a measured dead-end; lift needs
  ref-pool growth + sharper features.
- **Recommendation:** grow the high-confidence ghost reference pool + GPU retrain (H2GCN). **Owner: india.**

### P2-3 [gaps] NEEDS_FRONTEND = 2 pending merges
- **Evidence:** BUILD_STATE.NEEDS_FRONTEND = "2 codex frontend builds pending merge into mcp-server/web."
- **Recommendation:** merge the 2 frontend builds so the web app surface is current. **Owner: quebec.**

---

## What is HEALTHY (do not churn)
- **Correctness:** anti-pattern greps (fail-open-on-corrupt / empty-catch returning empty) come back clean in
  scripts/lib + .claude/hooks -- the dangerous-data-loss classes from the recent regression log are fixed.
- **MCP server:** :3100 healthy + stable; the disconnect cause (enforce gate) is fixed + verified.
- **Fleet safety net:** Fleet Reaper / Memory Monitor / Task Health / Zombie Reaper v2 / MCP Watchdog all
  `Ready / 0x0`.
- **AI synergy:** 34/34 galaxies pass owns-AI + vault-synergy; cross-substrate typed-edge spine live.
- **Self-correction loop:** 48 regressions logged+fixed in the current window; bug-finding->wiki gate active.

## Cross-cutting themes
1. **Scale-hygiene > correctness** is PRISM's current frontier: the 34K uncommitted tree + 196-hook surface +
   two milestone trees are all "too much accumulated, not enough consolidation" -- not broken logic.
2. **Autonomous-loop control bugs** (goal-gate + pick-unit) can trap a chat; they need bounded done-signals.
3. **Over-instrumentation** (MCP-babysitting cluster, large injection surface) is itself a source of the
   "we never used to have these problems" -- prefer stable substrates + native mechanisms over fragile auto-enforcement.

## Top-5 prioritized actions
1. (P0-1) Drain the 34K uncommitted tree -- per-slot branch commits + integrator batching. [golf+all]
2. (P0-2/P0-3) Fix the goal-gate + pick-unit to accept bounded done-signals; stop the degenerate loops. [bravo/zulu]
3. (P1-1) Audit + trim the 196-hook injection surface. [alpha]
4. (P1-2) Finish retiring the stale 383 milestone tree. [golf/sierra]
5. (P1-4) Wire the 8 CAD bridges with domain judgment. [delta/kilo]
