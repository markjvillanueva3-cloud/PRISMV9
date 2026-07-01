---
title: Autonomous build-workflows must commit AFTER verify, not before (commit-then-verify lets bad commits land)
type: lesson
domain: ai-training
slot: india
date: 2026-06-30
tags: [workflow, multi-agent, orchestration, adversarial-verify, r15, commit-discipline]
commits: [7a630db9ef, 0a1fc2a8c4, 9fdd7cb2c6]
related: [[feedback_wire_test_validate_all_galaxies]], [[reference_india_do_all_remaining_work_2026_06_30]], [[crossroad-brainstorm-workflow]]
---

# Autonomous build-workflows: commit AFTER verify, not before

## The failure mode (observed 2026-06-30, india "do all remaining work" under ultracode)

A discover->build->verify Workflow ran 8 ai-training units. Each **builder agent committed its unit
itself**, THEN an adversarial `code-analyzer` verify arm reviewed the commit. The verify gate worked --
it correctly REJECTED 4 of 8 -- but because the builders had already committed, **4 flawed commits were
sitting in the shared `cad-fusion-live-ms0` tree** when the rejections came in:

- 1 **harmful**: a `doc_routed` emit added inside the *pure* `routeDocumentToConsumers` while the
  dispatcher already emitted `document_routed` at the impure boundary -> every routed document
  double-wrote the learning ledger that feeds LoRA/GNN (`7a630db9ef` fixed it).
- 3 **orphans / false claims**: an engine with zero callers; a manifest no code reads; a "script
  committed" claim that committed only a 0-byte `.gitkeep`. The dominant failure class was
  **"built-but-not-wired + claimed-but-absent tests"** -- exactly what an honest adversarial verify
  catches and an over-trusting holistic review misses.

A whole remediation pass (a second Workflow + a solo fix) was then needed to wire/fix/clean the 4.
The work landed correctly in the end, but the **commit-then-verify ordering created tree debt** that
should never have existed.

## The rule

**Build in isolation -> adversarially verify -> commit ONLY on PASS.** Two ways to enforce it in a
Workflow:

1. **Worktree isolation per builder** (`isolation: 'worktree'`): each builder commits to its own
   throwaway branch; the verify stage gates; a final stage merges ONLY the PASS branches into the
   shared tree. Bad units never touch the shared tree.
2. **Builder returns the diff, does NOT commit**: the build agent implements + tests + returns its
   change as a diff/summary; the verify agent reviews; the Workflow (or the parent) commits only the
   verified diff. Simpler, but loses the builder's own commit hygiene.

Either way: **a builder must not write to the shared tree's history before an independent reviewer has
passed it.** A green builder self-report is not evidence -- 4 of 8 builders this run reported "done"
on work that was orphaned, uncommitted, or actively harmful.

## Second-order lesson: reconcile built-vs-verified, never trust the "resolved" set

A `pipeline()` verify stage can silently DROP a unit (one unit got no verdict and fell out of both the
resolved AND the still-failing sets). Always reconcile the BUILT set against the VERIFIED set and
**manually verify any unit missing a verdict** (R12) before reporting it done -- I caught a corpus-registry
unit this way (it was actually fine: 13/13, wired -- but it had no workflow verdict).

## Why the adversarial-verify gate is still worth it

Despite the ordering flaw, the adversarial `code-analyzer` arm (default-FAIL-if-uncertain, runs the
tests itself, greps for real callers) caught 100% of the bad-faith builder claims. Keep the gate; just
move the COMMIT to after it. This is the workflow-scale form of [[feedback_wire_test_validate_all_galaxies]]
(R15): "built" is not "done" until it is WIRED + TESTED + VERIFIED -- and in a multi-agent workflow,
not COMMITTED until verified either.
