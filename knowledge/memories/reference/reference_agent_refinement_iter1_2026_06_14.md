---
name: reference_agent_refinement_iter1_2026_06_14
description: "Agent-refinement /goal (slot:sierra) iter1 -- sharpened 3 review-agent proactive triggers + repurposed test-long-runner stub; audit found ~48 broken claude-flow/ruv-swarm framework agents diluting routing (the iter2 cleanup target). Agent .md files are GITIGNORED runtime config, authoritative store = H:/prism/.claude/agents (114 files)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.462Z
aliases: reference_agent_refinement_iter1_2026_06_14
---


# Agent refinement /goal -- "refine our agents so they're more impactful" (2026-06-14, slot:sierra)

Operator /loop /goal: make subagents more impactful + forge general fleet-wide agentic-coding
combos. Bounded, verify-first. This memo = iter1 done + the verified iter2 plan.

## Topology (verified, was non-obvious)
- Agent `.md` files are **GITIGNORED runtime config** (only `.claude/agents/AGENT_DIGEST.md` is git-tracked).
  Persistence = the on-disk write, NOT a commit. The git-diff-based scrutiny-3way gate sees nothing
  from agent edits (they are ignored), so validate them directly (YAML parse + description quality).
- **Authoritative store = `H:/prism/.claude/agents/` (114 files)** -- this is what the harness loaded
  for this session (system-prompt agent list has far more than the 15-file user-global store, proving
  project-store precedence even though the shell CWD resets to the slot worktree H:/prism-slot-sierra).
- Stale duplicates live in user-global `C:/Users/wompu/.claude/agents/` + mirror `H:/.claude/agents/`
  (~15 files, old descriptions). Project precedence means refined project copies win for slots rooted
  at H:/prism; slot-worktree-rooted sessions could load the stale global copy -> sync refined files over
  existing global dupes (no new files, no deletes) to close the drift. Slot worktrees have ~empty
  agent stores (1 file).

## iter1 SHIPPED (4 PRISM-native refinements, applied in project + synced to both global mirrors)
1. `physics-review-agent.md` -- vague desc -> sharp PROACTIVE trigger (path globs mcp-server/src/engines
   + src/physics) + names the formulas + distinguishes from sibling `physics-reviewer` (manual). Kept
   `model: opus` (formula reasoning is genuine deep work -- REJECTED the audit's implicit downgrade).
2. `wiring-review-agent.md` -- sharp trigger (after any *Engine.ts) + "reports gaps for dispatcher-wirer".
3. `test-review-agent.md` -- sharp trigger + real-coverage criteria (reference-value asserts, >=3 failure
   + >=2 adversarial, no .skip/.only) + distinct-from test-runner.
4. `custom/test-long-runner.md` -- dead 44-line generic stub repurposed into a real **full-suite
   background test runner** (model: haiku, tools scoped to Bash/Read/Grep/Glob, R12 PARTIAL-run honesty,
   rtk vitest). Fills the gap test-runner (targeted foreground batches) does not cover.
All 4 YAML-validated (name+description present, plain-scalar descriptions, ASCII-only per ascii-guard).

## DELIBERATE NON-ACTION
- `regression-hunter.md` kept `model: opus`. The agents-audit (sonnet) ranked it for an opus->sonnet
  cost-downgrade, but root-causing a non-obvious regression IS deep reasoning; the operator's goal is
  MORE impactful, not cheaper-but-weaker. Downgrade would work against intent.

## iter2 OUTCOME (2026-06-14): scrutiny-gate reviewer FIX SHIPPED; deletion DEFERRED to operator

### BUG FOUND (R12-class) + FIXED: the 3-of-3 scrutiny gate ran on a broken/missing reviewer
- `subagent_type:'reviewer'` (CLAUDE.md 3-of-3 arms A+B, forge7, forge-audit-v2, scrutinize-mark)
  resolved to the ONLY `name: reviewer` agent = `core/reviewer.md`, which was a claude-flow IMPORT:
  broken `memory_store` / `mcp__claude-flow__memory_usage` lifecycle hooks + body, NO `model:`, NO
  `tools:` (so the scrutiny REVIEWER ran with ALL tools incl. write/edit -- wrong for a read-only reviewer).
- `subagent_type:'code-analyzer'` (arm C) had NO agent file at all (arm C switched from Codex to a Claude
  `code-analyzer` on 2026-05-13 per [[feedback_scrutiny_3of3_readonly]] but the agent was never created)
  -> silently fell back to general-purpose.
- FIX (non-destructive, auto-built per [[feedback_net_benefit_auto_build]]): rewrote `core/reviewer.md`
  into a proper read-only PRISM reviewer (tools Read/Grep/Glob/Bash, PASS/FAIL + P0/P1/P2 + file:line
  ledger contract, no claude-flow) + CREATED `code-analyzer.md` at agents root (arm-C analyst lenses:
  silent-breakage / regression / I/O-security / coupling / concurrency). Both YAML-valid, ASCII, model
  inherits caller. CAVEAT: agent defs may be session-cached -> full effect on next session/dispatch refresh.

### DECLINED by operator 2026-06-14 (kept all -- "fixes only", NO deletion; do NOT re-propose deleting these)
The 33 deterministically-dead framework agents STAY in place per operator decision. The fixes shipped this
session stand; no agent files were deleted. Original deferral context retained below for reference:
delete the 33 deterministically-dead framework agents
33 files match broken markers: github/ 13, hive-mind/ 5, core/ 5, swarm/ 4, optimization/ 4, templates/ 1,
goal/ 1. SAFE subset (~28 niche unreferenced) = delete candidates. NOT-safe: core/reviewer (now FIXED, keep)
+ core/coder. core/coder.md was dispatched by continue-roadmap.md:73 (`Task(subagent_type:"coder", isolation:
"worktree")`) but was a broken claude-flow import (no model, all-tools, dead memory_store hooks) -> NOW FIXED
2026-06-14: rewritten into a proper PRISM coding agent (model:sonnet, tools Read/Write/Edit/Bash/Grep/Glob,
CLAUDE.md-law operating procedure mirroring the native `implementer`, no claude-flow). So ALL three referenced-
but-broken agents (reviewer, code-analyzer[created], coder) are now repaired + synced to project+global stores.
Reference-check done; operator sign-off would still be needed before deleting non-self-created files (DECLINED).
The plan below is SUPERSEDED by this outcome.

## iter2 PLAN (SUPERSEDED -- see OUTCOME above) (verified-cleanup -- the single highest-impact action for "more impactful agents")
The agents-audit found ~48 of the 114 project agents are claude-flow / ruv-swarm FRAMEWORK IMPORTS that
are NON-FUNCTIONAL in PRISM (call `mcp__claude-flow__*`, `npx ruv-swarm`, `mcp.agent_list`,
`mcp.bottleneck_analyze`, hardcode foreign repo ruvnet/ruv-FANN). They dilute orchestrator routing
(119 agents visible, ~20 real). Subdirs implicated: core/ (5), hive-mind/ (5), optimization/ (5),
consensus/ (7), sublinear/ (5), swarm/ (3), flow-nexus/ (9), sparc/ (4), goal/ (3), github/ (2+).
iter2 steps: (1) deterministic Grep over `.claude/agents/**` for the broken-marker set; (2) reference-
check (grep skills/workflows/settings for any invocation of those agent names) before deleting; (3)
delete the verified-dead set from ALL stores (project + global mirrors); (4) regen AGENT_DIGEST.md once
after; (5) record. Deletion is destructive + files not self-created -> verify refs first, surface to
operator if any are referenced.

## combos half (auto-hermes-loops + model-switch + parallel agents)
~95% already built (prior session): task-substrate-router.mjs (ADVISORY model routing, injected per loop),
install-hermes-tasks.ps1 (prewarm + GEPA + skill-loop crons -- skill-loop closure cron added this stream),
Workflow tool (parallel agents), skill-loop-run.mjs. A PEER slot is building AGENTIC-SUBSTRATE-BRIDGE
(CAG telemetry) -- COORDINATE, do not duplicate. Genuine remaining agent-side gap = the iter2 cleanup.

Related: [[reference_qdrant_memory_singleton_never_connected_2026_06_13]] · [[feedback_sierra_no_gates_full_reign_2026_06_10]] · [[feedback_golf_owns_reaper]]
