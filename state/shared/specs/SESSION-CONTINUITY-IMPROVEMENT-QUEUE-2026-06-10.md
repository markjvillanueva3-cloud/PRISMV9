# Session-Continuity Improvement Queue (ultracode assessment, slot:alpha 2026-06-10)

Source: read-only ultracode Workflow `wf_e169ddd7-c93` (5 finders + synthesis, 1.6M subagent tokens).
Assessed: precompaction / compaction / session-handoffs / auto-continuation + the updated /loop + /goal.
ROI-ranked, dedup'd (ALREADY-BUILT items dropped). Each carries R15 determinations + an R12 verify-first.

## VERDICT
Subsystem is **hardened on the retention/handoff/auto-fallback path** (this session: slot-scoped
`(slot:` git anchor, >=30-char anti-clobber gate, memory-seed read-back, auto-advance, galaxy-pack,
files-digest). **Real gaps remain on the ENFORCEMENT path** — the loop/goal eval-gate, R15-completion,
and token-budget rules are advisory TEXT with zero teeth; plus two live leak/uniformity surfaces.

## BUILD QUEUE
- **RANK 1 [HIGH, FLEET]** Eval-gate into `loop-state.mjs:cmdNext` (~:256-310): hard-refuse auto-roll
  when prior iter `status==="fail"`, reusing shipped `computeVerdictMismatch` (:361-364); + tighten
  `goal-complete-gate.mjs:checkLoopTargetMet` (:191-209) to require final `status==="ok"`. Converts the
  doctrine's anti-slop promise from text -> deterministic gate. VERIFY FIRST: does `tick --status` carry
  a real verdict or default to "ok"? (gate is decorative if defaulted; a require-ok gate could deadlock).
- **RANK 2 [MED-HIGH, FLEET]** Add `git status --porcelain` summary to `generateSmartResume`
  (`precompact-handoff.mjs:397-518`) -> "Uncommitted: N staged, M modified" in the RESUME. ~5 lines.
  VERIFY: `runGit` here targets the slot worktree, not shared H:/prism (mirror the :470 slot-scoping).
- **RANK 3 [MED-HIGH, FLEET]** `/handoff read` (`commands/handoff.md:150`) uses `--terminal` with no
  `--slot` + ignores `matchedBy`/`fallback_note` -> can return a PEER handoff via family/global-latest
  (`per-agent-handoff.mjs:810-827`). Fix: pass `--slot` OR reject `matchedBy in {family-latest,
  global-latest,fuzzy}` (loop-state.mjs:151-177 is the template). Last live peer-leak on the read path.
- **RANK 4 [HIGH-aspiration/MED-confidence, FLEET] — THE OPERATOR'S TASK/BATCH-BOUNDARY COMPACT TRIGGER.**
  Model-emitted task-boundary marker -> opportunistic precompact: at a recognized "major batch shipped,
  heavy build incoming" seam the model invokes the `precompact` Skill (writes a clean-context handoff NOW)
  + drops a `compact-seam-<sid>.marker` a SessionStart reader consumes. NO such hook exists today
  (`checkpoint-auto-trigger` is edit-count; `precompact-auto-trigger` is token-%). **CRITICAL VERIFIED
  NEGATIVE (do NOT attempt): a chat CANNOT self-fire /compact; `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` is
  launch-time-only; a dynamic-threshold-to-FORCE-compaction is ARCHITECTURALLY IMPOSSIBLE.** So build
  ONLY the buildable half: the clean boundary-handoff + marker (so whenever the compact happens --
  operator or auto@90% -- it resumes from the clean seam, never a mid-build mess). It's a behavioral
  nudge for the COMPACT itself, not a deterministic trigger.
- **RANK 5 [MED, FLEET]** `stop-goal-clear-advance.mjs:268-271` only fires when a loop record exists ->
  a bare `/goal` (no `/loop`) idles on clear with no queue fall-back. VERIFY FIRST: does `/goal` always
  seed a loop-state? If yes, dormant -- skip.
- **RANK 6 [MED, FLEET]** `padFileToBytes` (`precompact-handoff.mjs:737-756`) returns pad-skipped-oversize
  when a `## MEMORY_SEED` block pushes the handoff past 4096 -> breaks the "exact same size" invariant.
  Fix: size-class banding (pad to next multiple) or raise default above worst-case seed.
- **RANK 7 [MED, FLEET]** Zulu `decideExecutionGate` (`zulu-orchestrator-lib.mjs:136-143`): downgrade
  execute->dry-run when the resolved PID's window is a Windows Terminal sharing its HWND across tabs
  (the live WT-tab wall proven this session -- keystrokes hit the ACTIVE tab = wrong slot). Preserve the
  script (asset-preservation); just gate actuation off under tab-ambiguity.
- **RANK 8 [LOW cluster, one cleanup unit]** 8a per-agent-handoff.mjs:532 default placeholder contradiction
  (emits a string its own :269 reject-set blocks; cmdRead shows it verbatim) · 8b loop token-budget stop
  unenforced (`tokensApprox` never read; only DEFAULT_MAX_ROLLS=8 stops -- CHECK loop-inject-token-budget
  node first) · 8c seed-failure leaves no in-handoff trace · 8d readActiveLoopState never rejects a stale
  `running` loop from a crash · 8e getExistingResume topicless early-check near-dead · 8f getRoadmapSummary
  "Next:" can conflict with the active claim · 8g cmdStop calls rejectNonLiveChat with 2 args (latent
  fail-open) · 8h propose-goal.md:114 circular self-reference (doc).

## BOTTOM LINE
Build **RANK 1 next** (smallest change, highest leverage, reuses computeVerdictMismatch). RANK 4 is the
operator's repeatedly-requested batch-boundary compact trigger -- buildable as a clean-handoff-at-seam +
marker, NOT as a forced compaction (impossible). Full synthesis: workflow wf_e169ddd7-c93 output.
Memory: [[reference_session_continuity_agentic_2026_06_10]] · [[reference_zulu_selfcompaction_test_2026_06_10]].
