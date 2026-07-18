---
name: feedback_papa_cross_galaxy_work_commit_to_their_worktrees
description: "PERMANENT RULE (operator 2026-06-15): when papa's own backend/wiring work is exhausted, papa autonomously picks up OTHER galaxies' backend-fittable work across all 34 galaxies AND commits it to the OWNING slot's branch/worktree (slot/<X> @ H:/prism-slot-<X>), with a safe shared-tree fallback when the slot is live. Drive with crons + harnessed /loop + Hermes agents."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.439Z
aliases: feedback_papa_cross_galaxy_work_commit_to_their_worktrees
---


# Papa: cross-galaxy work + commit to their worktrees (PERMANENT, operator 2026-06-15)

**Rule:** papa is never idle. When papa's own queue is exhausted (WIRE-UNWIRED + H-DRIVE + build health), papa AUTONOMOUSLY picks up OTHER galaxies' backend-fittable work — wiring dispatcher-unwired engines, TSC error triage, Zod schema validation, vitest coverage, build health — across ALL 34 galaxies, and commits that work to the OWNING slot's branch/worktree, driven by crons + harnessed `/loop` + Hermes agentic coding.

**Why:** papa is the elevated cross-cutting build/wiring force-multiplier — no ownership/lane/claim/deference gate blocks it (operator 2026-06-10, see [[feedback_papa_no_gates_full_pathways]]). Idle papa = wasted fleet capacity. There is a standing shared backlog (e.g. 37 dispatcher-unwired engines per `audit-unwired-engines.mjs` 2026-06-15) that is shared romeo(wiring)/november(DEA)/papa work. Routing each commit to the OWNING slot's branch keeps the work attributed to its domain and merging through that domain's normal path.

**How to apply:**
1. **Finish papa's own queue first** (WIRE-UNWIRED + H-DRIVE + build health), THEN pivot to other galaxies.
2. **Re-audit, never trust a stale worklist** — run `node H:/prism/scripts/audit-unwired-engines.mjs` for the LIVE unwired backlog. (The 2026-06-15 "no candidates remain" miss came from declaring done against a fixed 18-engine worklist without re-auditing the fleet's 37.)
3. **dup-check EACH engine across ALL branches** before wiring: `git -C H:/prism log --all --oneline | grep -i <engine>`. Peers build on slot branches (MeasureSummary->romeo, PactContractTest->november were already-built-unmerged). Re-wiring = a merge collision.
4. **Commit to the owning slot's worktree/branch when free:** `cd H:/prism-slot-<X> && git add ... && git commit -m "[<SCOPE>]/U-... (slot:papa->X): ..."`. **Safe fallback:** if slot X is LIVE (fresh `chat-slots.json` heartbeat) OR its worktree is contended (`index.lock`/`CHERRY_PICK_HEAD`), commit to the shared integration tree with X's `[SCOPE]` tag + `(slot:papa->X)` attribution and post to the chat bus so the owner + integrator see it. **NEVER clobber a peer's live worktree.**
5. **Universal rails still bind:** per-file 2-agent scrutiny, `tsc` 0-new-errors, affected vitest, no stubs, no inlined physics constants, defer domain-PHYSICS edits to the domain slot (papa does the WIRING, not the physics).
6. **Drive it autonomously:** a recurring `/loop` cron (off-minute) + harnessed loop-state + Hermes agentic coding (Agent fan-out for triage + per-engine wiring). The Workflow fanout-gate caps cost — individual `Agent` subagents (build-doctor/Explore/general) are not gated; use those for the per-engine grind, or override the gate under ultracode.

Related: [[feedback_papa_no_gates_full_pathways]] · [[feedback_primary_backend_builders_no_galaxy_gate_block]] · [[feedback_charlie_commit_own_slot_branch]] · [[reference_papa_wire_unwired_loki_tenant_sbom_2026_06_13]] · the wiring galaxy is romeo; DEA is november.
