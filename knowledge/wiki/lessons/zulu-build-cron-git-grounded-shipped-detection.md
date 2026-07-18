---
title: Zulu build-loop cron — ground shipped-detection in git, not drifty prose
type: lesson
tags: [zulu, build-loop, cron, drift, git-grounding, hermes-zulu, slot-bravo]
created: 2026-06-16
slot: bravo
related:
  - "[[reference_zulu_parseshipped_prose_miscount_fix_2026_06_15]]"
  - "[[reference_zulu_build_cron_git_grounded_2026_06_16]]"
---

# Zulu build-loop cron: ground "shipped" in git reality, never hand-maintained prose

## Symptom
The autonomous zulu build-loop pointer (`state/shared/zulu-build-loop-next.json`, written by the
`PRISM Zulu Build Loop` cron) showed the **drained C1-C8 capability queue as pending**
(`next: C1, drained: false, done: 0`) while all 8 units were genuinely shipped (8 `Zulu*Engine.ts`
+ 8 `U-ZBL-C<n>` / `U-ZULU-CAP-C<n>` commits). Entering `/loop` on that pointer would rebuild the
shipped C1 and hit the duplication guard.

## Root cause
`parseShipped` (`scripts/lib/zulu-build-queue.mjs`) read shipped ids ONLY from the bravo brief's
`## SHIPPED` markdown prose (`state/shared/slot-briefs/bravo.md`). That prose **drifts or goes
missing** — live, the brief was unreadable, so `parseShipped("")` returned an empty set and the cron
marked the whole queue pending. Sibling of the 2026-06-15 `parseShipped` prose-miscount regression.

## Fix
- `parseShippedFromCommits(gitLogText)` — pure; extracts C-ids from commit subjects
  `U-ZBL-C<n>` / `U-ZULU-CAP-C<n>`, splitting the combined ship form `U-ZULU-CAP-C1C2C3` into
  C1+C2+C3, and **skipping `Revert` commits** (anchored to the `git log --oneline` shape
  `/^\S+\s+revert\b/i` so prose like `U-ZBL-C9 add revert-safety` still counts).
- `buildQueueFromTexts` takes the **union** of brief-prose shipped + git-commit shipped
  (`opts.gitLogText`); the legacy brief-only path is preserved byte-identically.
- `scripts/zulu-build-loop.mjs` reads a **fail-soft** read-only `execFileSync git log --oneline -400`
  (git absent / not-a-repo / timeout → `""` → brief-only fallback, never fails the cron).

Result: 20/20 tests; live driver run flipped the pointer `next=C1 done=0` → `DRAINED done=8`.

## The transferable lesson
**Prove "done / shipped" by REALITY (git commits or artifact existence), never by a hand-maintained
markdown section that drifts.** Any queue / ledger / cron that computes "done vs pending" from prose
a human edits is a drift hazard — and a SHARED single-writer source-of-truth must derive from a
non-drifting signal. The union (git can ADD a shipped id but never SUBTRACT from the brief) is a
deliberate, documented limitation: a git `Revert` is masked if the brief still lists the unit — fix
the brief, since a stale brief is the exact drift the git layer is layering on top of.

Commits: `[ZULU-BUILDLOOP]/U-ZBL-GIT-GROUNDED-SHIPPED` + `U-ZBL-REVERT-PRECISE` (slot:bravo, 3-of-3 PASS).

## Update 2026-06-25 (slot:zulu) — the git-commit signal ALSO drifts; artifact-existence implemented

The transferable lesson above already named "artifact existence" as a valid reality signal,
but the 06-16 fix only ever IMPLEMENTED the git-commit path -- and that path is itself
drift-prone. On `cad-fusion-live-ms0` the pointer AGAIN showed `next:C1 / done:0` while all 8
engines were built+wired, because **ZERO commit subjects on this branch carry a literal
`C<n>` / `[HERMES-CAPABILITY-C<n>]` / `U-ZBL-C<n>` tag** (`git log --all | grep -E '\bC[1-8]\b'`
empty). The units shipped under engine-NAME commit subjects, so BOTH `parseShipped` (brief)
and `parseShippedFromCommits` (git) missed every one. Commit-subject form is a CONVENTION
that drifts across branches/squashes -- it is not the ground truth; the engine FILE on disk is.

**Fix (`U-ZBL-ARTIFACT-SHIPPED`, commit `0511a885e8`):** added the artifact-existence signal
the lesson always recommended -- a `UNIT_ARTIFACTS` map (C1->ZuluWaveSchedulerEngine ...
C8->ZuluSoulEvolutionAdvisorEngine) + fail-soft `shippedByArtifact()` unioned via a new pure
`opts.extraShipped`. A unit is shipped iff its canonical engine `.ts` exists -- immune to
commit-subject form entirely. Live pointer `0 -> 8 DRAINED`; 44/44 tests.

**Sharpened transferable lesson:** of the three "shipped" signals -- hand-prose < commit-subject
< artifact-existence -- prefer the one closest to the deliverable itself. A commit subject is a
naming convention (drifts); the artifact's existence on disk is the deliverable. Its one
tradeoff (caveated in code): artifact-existence cannot see a reverted-but-not-deleted file --
so it complements, does not replace, the revert-aware commit signal (keep the union). Memory:
[[reference_zbl_artifact_shipped_2026_06_25]].
