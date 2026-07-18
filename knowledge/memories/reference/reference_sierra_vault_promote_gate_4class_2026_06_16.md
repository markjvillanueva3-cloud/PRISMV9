---
name: reference_sierra_vault_promote_gate_4class_2026_06_16
description: "Sierra hardened the Obsidian->wiki promotion gate (scripts/promote-memory-to-wiki.mjs nonPromotableReason) to exclude ALL FOUR structural junk classes, so the freeze-disabled vault-promotion cron promotes ONLY genuine synthesized knowledge when it arms. 3 commits 2026-06-16: 409532c31e (node-pointer + unverified-advisory), ee43c54876 (run-log convention + 31-file backfill + generator marker), 4531d79ae3 (deadbeef test-fixture). Live dry-run went 54->5 candidates (all genuine reference atoms; 0 node_*/nn_retrain/smoke). All [MAIN-FORCE] to cad-fusion-live-ms0 (canonical-only file). Shared-index contention lesson: use git commit <pathspec> not git add+commit on the contended shared tree."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.202Z
aliases: reference_sierra_vault_promote_gate_4class_2026_06_16
---


# Sierra: vault promote-gate 4-class hardening (2026-06-16, slot:sierra)

Operator: "continue hardening obsidian vault." The Obsidian->wiki promoter
(`scripts/promote-memory-to-wiki.mjs`, run by the freeze-disabled vault-promotion cron
with --apply) had NO junk filter -- it would graduate non-knowledge into the canonical
wiki the moment the cron arms. Iteratively closed every structural junk class until the
live candidate set is 100% genuine knowledge.

## The 4 exclusion classes (all in `nonPromotableReason(fm)`, all R9/R12)
1. **node-pointer** (`node_kind` frontmatter) -- graph-node pointer stubs (MIT course/formula),
   refs inflated to ~10 by a single index hub. (409532c31e)
2. **unverified-advisory** (`advisoryOnly`/`mustHumanVerify` YAML-truthy) -- LLM syntheses +
   audit-pending stubs that self-declare "verify first". (409532c31e)
3. **run-log** (`run_log` truthy) -- ephemeral machine-generated per-retrain metric records
   (nn-feedback-to-memory.mjs). GENERALIZABLE convention: generator now emits `run_log: true`;
   31 existing reference_nn_retrain_*.md backfilled (EOL-preserved, 1 CRLF). (ee43c54876)
4. **test-fixture** (`deadbeef` sentinel in sessionId/agent/originSessionId) -- smoke fixtures
   (feedback_d2_smoke etc.) mirrored into the vault by a test run; cleared via the feedback_
   filename prefix + dreams/ hub-inflated refs. Frontmatter-only match (dream PROSE mentions of
   deadbeef are correctly NOT excluded). (4531d79ae3)

## Result (live, R12)
- Dry-run: **54 -> 5 candidates**. The 5 are all genuine reference atoms (forge-audit,
  master-index-fix, mcp-oom-fix, rag-triggers, ck26-producer); 0 node_*/nn_retrain/smoke.
- Gate tests 35/35; generator tests 15/15. Each unit: per-file 2-arm scrutiny PASS; units 1+2
  also full 3-of-3 PASS. All mutation-verified (tests fail when the gate logic regresses).

## THE recurring root cause (one pattern, 3 of the 4 classes)
**Auto-generated index/hub files inflate inbound [[ref]] counts**, letting junk clear minRefs=3:
node_* by an MIT-course index, nn_retrain by a retrain hub, smoke fixtures by dreams/ files.
I fixed the SYMPTOM per-class (surgical, safe). The deeper ROOT fix (not done -- preventive only,
candidate set is already clean): exclude auto-gen hub dirs (dreams/, indexes) from the
ref-COUNT scan so ref-count reflects genuine cross-referencing. Filed as a follow-up.

## Lane + contention lessons
- promote-memory-to-wiki.mjs is **canonical-only** (cad-fusion-live-ms0, absent from slot/sierra).
  Committed via the lane-guard kill switch + [MAIN-FORCE] (same as romeo's tip). A slot-branch
  fork would duplicate a 379-line canonical file. See [[feedback_sierra_commit_to_slot_branch]].
- **SHARED-INDEX CONTENTION (real, hit this session):** between my `git add`+guard and `git commit`,
  a peer (alpha) re-staged 3 cag-warm files into the shared index -> my commit swept them. Caught it
  (R12 -- verified `git show --stat` post-commit), `git reset --soft HEAD~1` + re-committed only my
  paths (alpha's WIP preserved + re-staged). **FIX FOR NEXT TIME: `git commit <pathspec>` commits
  ONLY the named paths regardless of index races -- contention-immune. Use it on the shared tree.**

## Open follow-ups (filed)
- Dreams-hub root-cause de-inflation (preventive; above). Cron ARMING still operator-gated on
  deleting state/shared/MIGRATION-FREEZE-ACTIVE.flag (HW-migration freeze ACTIVE).

Sibling: [[reference_sierra_vault_promote_gate_harden_2026_06_16]] (the class-1/2 detail).
Related: [[reference_obsidian_vault_audit_2026_06_08]].
