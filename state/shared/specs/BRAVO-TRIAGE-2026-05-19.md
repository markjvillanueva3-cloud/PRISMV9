# BRAVO TRIAGE — last night's compiled tasks (2026-05-19)

**Compiled by:** claude-ddda9e7c slot bravo, `/startup-bravo /goal compile + clear bravo tasks from last nights sessions /loop 5m /goal` iter 1.
**Source:** 6 last-night bravo handoffs + 40 consolidated open threads + git log cross-reference.

## ✅ CLEARED this iter

- **U-CK15 (COMMAND-KERNEL-MS0)** — populator tool. Shipped `f3dad18253`. Recovered from claude-df944902's C:-ENOSPC block. 49/49 tests, round-2 PASS/PASS. 4-surface doc-reflect done. See [[u-ck15-command-frontmatter-populator]].

## 🟢 NO-OP — work already shipped, handoff is stale

The bravo handoff RESUME line is templated with `Next: INFRA-CONSENSUS-WIRE-MS0, INFRA-AGI-ROUTER-MS2, L8-P0-MS2` which is a fleet-wide "next planned" suggestion, NOT a real bravo claim. ~30 of 40 consolidated open threads carry only this template — discount.

Already-shipped milestones referenced in stale handoffs (per CLAUDE.md doctrine + git log):
- **HOOK-SYNERGY-MS0** (11 units shipped 2026-05-12..13) — open threads 38 + 39
- **DEV-VELOCITY-AUTOTRIGGER-MS0** (13 units shipped 2026-05-12..13) — open thread 38
- **COORD-MS0** (U-COORD03 + U-COORD10 closed) — open threads 28, 30
- **SLOT-WORKTREE-MS0** (activated 2026-05-16) — open thread 20
- **SYSTEM-VIZ-FS-COVERAGE-MS0** (per CLAUDE.md doctrine) — open thread 17
- **NN-GRAPH-MS0** + **NN-GRAPH-MS1** (per CLAUDE.md NN-1 section, +graphsage checkpoint committed 2026-05-16+17) — open thread 10
- **HIGH-ROI-HOOKS-MS0** (U-HRH03 shipped commit `13234bf19c`) — handoff 757e0140-high-roi-hooks

These should be cleared from the consolidated bravo.md on next regen of `scripts/handoff-consolidate.mjs`. They linger because the handoff-consolidator checks per-RESUME-SHA git match, not per-milestone aggregate ship state.

## 🟡 NEEDS OPERATOR GREENLIGHT — research-complete, awaiting go

- **U-LLM-DEV-CORPUS + U-LLM-TRAINER** (open thread 3, 757e0140-llm-tribal). Per the handoff RESUME: *"Pivot directive COMPLETE. bravo shipped 5 units on slot/bravo. NEXT PHASE needs operator greenlight (only research was requested): implement prism-dev LoRA adapter MVP per state/shared/specs/PRISM-CUSTOM-LLM-FEASIBILITY-2026-05-18.md"*. **Do not auto-ship — operator decision.**

## 🔴 GENUINELY PENDING — bravo-eligible for next iter

Listed in priority order (highest leverage first). Each needs a per-iter verification before pickup (the unit may have shipped via a peer slot since the handoff was written).

1. **U-MULTI-AGENT-COST-TELEMETRY / COST-CASCADE-MS0** — open thread 6 (52.4h). Hotel shipped one piece (`/two_pass` cascade engine, commit `0d9d79bc89`); the multi-agent cost-telemetry leg may still be open. Verify against COST-CASCADE-MS0 envelope before pickup.
2. **U-HTML-* family** (open threads 5+7) — U-HTML-CLAUDE-MD-EDIT, U-HTML-DOCTRINE-UPDATE, U-HTML-COMPANION-GENERATOR, U-HTML-BACKFILL, U-HPS01, HTML-COMPANION-MS0, HTML-PRIMARY-MS0. Multiple HTML-companion-related commits last night (`3421c5a533 U-HTML-COMPANION-SRCHASH` in iter2 lima); may already be largely shipped under different unit-ids. Cross-check via `git log --grep="HTML"` before pickup.
3. **U-COORD08-HARDEN** (open thread 28) — coord-ms0 follow-up. COORD-MS0 had unit-level close-outs (U-COORD03/10) but U-COORD08-HARDEN may be distinct.
4. **U-AAM01..U-AAM04 / AUTOCOMPACT-AUTONOMOUS-MS0** (open thread 13) — autocompact reapply chain.
5. **PILLAR-TELEMETRY-RECOVERY-MS0** — U-PTR01, U-PTR02 (open thread 22).
6. **U-PPL-A5** — docu-print-org (open thread 14).
7. **U-ALL02, U-ALL03 / BACKEND-DEVTOOLS-RGS6-AUTO-LEARNING-LOOP-MS0** (open thread 32).
8. **ACP-MS0** orphan-rescue (open thread 36).
9. **OBSIDIAN-PRISM-OS-MS0** orphan-rescue (open thread 18).
10. **BLUEPRINT-OCR-TRAINING-MS1** (open thread 11) — separate from already-shipped MS2 U-TDP08.

## 📋 Recommended workflow for subsequent /loop iters

Each iter should:
1. Run `scripts/audit-close-out-candidates.mjs` (fresh staleness ≤2h) to surface auto-detected close-out candidates.
2. Verify the candidate unit-IDs against current `MILESTONE_PROGRESS.json` + `roadmap-index.json` + recent git log `[SCOPE]/U-ID` subjects.
3. For unshipped units in section 🔴 above, claim via `slot-task-claim.mjs claim` + `pick-unit` workflow, then ship.
4. For false-positive "open threads", append to `state/shared/CLOSE-OUT-DEFERRED.md` to silence the consolidator.
5. Tick `loop-state.mjs tick` after each iter; never continue from a state you can't describe.

## See also
- [[u-ck15-command-frontmatter-populator]] — this iter's ship
- [[silent_close_out_drift_detector]] — the systemic fix for the templated-RESUME false-positive class
- [[close_out_audit]] — the discovery surface
