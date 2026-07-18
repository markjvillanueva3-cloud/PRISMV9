---
title: Verify agent/synthesis-built queues against disk + measurement before building
type: lesson
tags: [r8, agent-orchestration, workflow, hooks, anti-duplication, verification]
created: 2026-06-11
updated: 2026-06-11
related:
  - reference_goal_crosssurface_queue_2026_06_09
  - reference_skills_hooks_audit_2026_06_11
  - feedback_never_claim_absence_without_deep_search
---

# Verify agent/synthesis-built queues against disk + measurement before building

## Lesson
An agent-built or synthesis-built "build queue" (the ranked list a fan-out Workflow or a synthesis agent produces) does NOT reliably R8-check existing assets. It will confidently propose **already-built** items as "novel" and **non-viable** items as "high-ROI." ALWAYS disk-verify every "novel" claim and measure every cost/feasibility premise BEFORE building. Trust the structure of an agent queue (the ranking, the framing); never trust its existence/novelty claims.

## Evidence (occurred twice)
- **2026-06-09 (alpha, cross-surface fire):** the agent queue's top-3 token-savings items were `read-dedup-cache` (ALREADY BUILT: `file-read-cache.mjs`), `read-to-ollama-digest` (already attempted + non-converting), and `route-suggest-decay` (the one genuinely novel). A rigorous R8 pass caught the duplicates. See [[reference_goal_crosssurface_queue_2026_06_09]].
- **2026-06-11 (golf, skills+hooks audit):** the Workflow's dedicated `hook:r8-verify` agent was **rate-limited and never ran**, so the synthesis agent reconstructed proposals WITHOUT adversarial verification and falsely proposed **HRH-NEW-1 CAG-inject hook as novel** ("Glob -> No files found"). Disk-verify showed `.claude/hooks/cag-router-inject.mjs` was built, wired in settings.json, AND firing in-session. Separately, **HRH-NEW-3 write-time-tsc** sounded high-ROI but a 1-command MEASUREMENT killed it: warm incremental `tsc --noEmit` = 12s (async-only) AND 648 pre-existing baseline errors (a raw per-write tsc drowns the new error in 648 -> would have to baseline-diff, which `tsc-baseline-regression-gate.mjs` already does = duplicate). See [[reference_skills_hooks_audit_2026_06_11]].

## Root-cause amplifier
A rate-limited / failed verify-agent silently degrades a queue to UNVERIFIED while the synthesis still emits confident "novel" claims. The failure is invisible unless you check the run's `failures[]` AND re-verify each item yourself.

## The rule
1. For EACH "novel"/"unbuilt" claim: `Glob`/`grep` the hooks + settings.json + the relevant tree to confirm absence (per [[feedback_never_claim_absence_without_deep_search]]).
2. For EACH cost/feasibility premise (latency, error-count, size): MEASURE it with one command before committing to the build. A 12s + 648-error measurement resolved a multi-turn "should we build it?" hedge in seconds.
3. Two genuinely-novel items survived both audits and were built (route-suggest-decay, regression-lock-gate); the rest were rejected with disk/measurement evidence. That ratio (most proposals are already-built or non-viable) is the expected shape of an agent queue.
