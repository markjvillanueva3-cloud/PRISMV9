# CLOSE-OUT-DEFERRED — explicitly-triaged candidates that are NOT being closed this session

> Append-only ledger. Each line names a candidate `unit_id` surfaced by
> `scripts/audit-close-out-candidates.mjs` plus the deferral reason.
> `goal-complete-gate.mjs` checks this file when verifying triage so the
> gate clears without requiring every flagged unit to have a fresh commit.

## Format

```
<unit_id> | <session/slot/chat-id> | <ISO timestamp> | <reason>
```

`<reason>` should be one of:
  - `closed-in-commit:<sha>` — already closed in a separate commit (e.g. peer chat); not duplicating
  - `defer-to-followup:<reason>` — needs more work / cross-team coord / capacity-bound
  - `false-positive:<why>` — audit flagged it but verification shows spec intent unsatisfied

---

## Entries

U-CAMP01 | claude-de9949da/BRAVO | 2026-05-13T17:10:00Z | defer-to-followup: CAM-PARITY-AGI-MS0 is a different milestone scope; deliverables resolve (Mastercam DL + material bridge files exist) but cross-CAM parity requires verifying ALL 4 sibling CAM systems before declaring complete. Out of scope for this session's BRAVO slot.
U-CAMP13 | claude-de9949da/BRAVO | 2026-05-13T17:10:00Z | defer-to-followup: CAM AGI Master Orchestrator deliverable file resolves but engine wiring + dispatcher integration not verified end-to-end. Needs a dedicated session to audit the orchestrator's actual API surface before close-out.
U-CAMP14 | claude-de9949da/BRAVO | 2026-05-13T17:10:00Z | defer-to-followup: Post Processor AGI Unification — file token resolves to a unification doc/script but cross-CAM coverage (Fanuc/Siemens/Haas/Mazak/Okuma) requires per-controller verification. Out of scope for goal-complete-gate landing session.
U-CAMP15 | claude-de9949da/BRAVO | 2026-05-13T17:10:00Z | defer-to-followup: Master Post Fine-Tuning System — file token resolves but training-loop and shipped fine-tuned weights need separate verification. Audit confidence 1.0 reflects file presence only; spec correctness pending dedicated review.
OBSIDIAN-INTELLIGENCE-MS3/G3 | claude-c0f06dee/CHARLIE | 2026-05-17T00:55:00Z | false-positive: silent-close-out audit (task #8) for "hotel C3/G3 duplicates" confirms NO duplicate work. G3 (U-AGENT-RUNTIME-ALERTS) shipped exactly once in commit 37fad8f0c on branch work/hotel-c2-dashboard — single git origin. Envelope owner field "claude-c0f06dee slot charlie" reflects final-author attribution; branch path reveals hotel slot was the originating workspace. No duplicate, no missing surface — provenance-attribution drift only (informational).
OBSIDIAN-INTELLIGENCE-MS3/C3 | claude-c0f06dee/CHARLIE | 2026-05-17T00:55:00Z | closed-in-commit:2e9204ce1 | silent-close-out audit (task #8) for "hotel C3/G3 duplicates" confirms TWO sequential ships, NOT a duplicate: (1) 7234ceb0a on branch work/hotel-e1-recover added scripts/extract-design-system.mjs at 274 lines (initial ship by hotel slot per branch name); (2) 2e9204ce1 on branch work/nn-stack-integ-ms0 regenerated the same file to 886 lines (canonical regen, current on-disk state). Diff: +241/-853 net. Both commits same author, same day (2026-05-15). Envelope ascribes single ownership to charlie which matches the final canonical regen owner. No work wasted; sequential improvement across slots is the intended pattern.
CAM-PARITY-AGI-MS0/U-CAMP13 | claude-c0f06dee/CHARLIE | 2026-05-17T01:25:00Z | closed-in-commit:57f0ceb47a | re-triaged from defer-to-followup (2026-05-13) to completed via real verification: opened deferred close-out + ran tests (was 57/58 PASS, 1 silent fail). Per-file 2-arm scrutiny uncovered 3 bugs: (a) wrong method name `mastercamStrategyEngine.recommend()` — actual export is `selectStrategy()`; typo silently threw TypeError, returned 3 strategies instead of contracted 4; (b) selectBestStrategy ranking bug — bestScore=0 init meant fallback with confidence:0 never overrode strategies[0]; (c) test brittleness — length-4 assertion would pass with all-fallback. All 3 fixed in same edit; 58/58 PASS post-fix. Files absorbed into peer commit 57f0ceb47a [DEV-TOOLS-AUDIT-F3]/U-DEV-TOOL-LEVERAGE-SKILL via commit-collision (git commit -a race); verified intact on HEAD.

HTML-COMPANION-MS0/U-HTML-CLAUDE-MD-EDIT | claude-339c8ff7/BRAVO | 2026-05-17T01:00:00Z | peer-claimed: claude-416be9ac holds h:/prism/CLAUDE.md edit lock for OBSOLESCENCE-CLEANUP-MS0 work (29m+ ago at audit time, see chat-bus). Cannot edit CLAUDE.md to add the MD/HTML role-split pointer until peer release. Workaround: the doctrine lives canonically in BORIS-LOOP-AGENT-DOCTRINE.md §8 (shipped this commit) which is the deeper source; CLAUDE.md just needs a one-line pointer. Land after peer ships OBSOLESCENCE-CLEANUP-MS0 commits or after the file-claim TTL expires.