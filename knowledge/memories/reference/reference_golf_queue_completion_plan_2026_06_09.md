---
name: reference_golf_queue_completion_plan_2026_06_09
description: "Golf galaxy (fleet-hygiene) work-queue completion plan — dependency-ordered finish plan for all open golf units, with per-unit Ollama-staging. Built via Ollama gpt-oss:120b deep-read of 43 golf handoffs + CLOSE-OUT-DEFERRED, Claude reconciliation, + bounded 3-lens ultracode brainstorm. Plan file: state/shared/golf-galaxy-completion-plan-2026-06-09.md."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.598Z
aliases: reference_golf_queue_completion_plan_2026_06_09
---


**2026-06-09 (slot golf, /loop /goal "deep-dive all open golf work + plan to finish queue, stage grunt on Ollama").** Plan: `state/shared/golf-galaxy-completion-plan-2026-06-09.md`.

**Method (the operator's literal architecture):** Ollama `gpt-oss:120b` did the grunt read — reconciled 43 golf handoffs + CLOSE-OUT-DEFERRED golf items vs shipped commits into 14 still-open candidates (offload counted in telemetry). Claude reconciled against THIS WEEK's golf ships (downgraded 2 to verify-only, handed 5 off as not-golf-core, added 5 hidden items the list missed). Bounded 3-lens ultracode workflow `wf_cfbf3c86-4c4` (sequence/ollama-staging/reconcile lenses, plain-text, peak concurrency 3 per the twice-bitten ≤3-4 fan-out lesson) refines.

**Golf-CORE finish queue (waves):**
- **Wave 1 (reaper safety):** G1 boost-stamp janitor (FR-MS4-A) · G2 reaper-sweep boost-exclusion anti-regression test (FR-MS4-B) · H1 tribal-index WRITE-side sharding (the known-remaining gap from the V8-512MB-cap fix — append throws today).
- **Wave 2 (reliability depth):** G5 gpt-oss model-pull durability smoke-test · G6 slot-worktree adoption U-FGC-3 · H2 error_ledger_recall_similar leak · H4 MCP heap-floor formal 3-of-3.
- **Wave 3 (hygiene):** G7 broken-.git cleanup (disable-not-delete) · G8 noise-filter settings.json exclusions · H3 orphaned encoding-guard wiring · G14 golf-reviewer-eval E2E (U-CLEANUP-B9).
- **Verify-only:** V7 docker-guard coverage · V8 scheduled-task audit (Zombie-Reaper-v2 confirmed superseded this session) · H5 advisory->enforce audit + CRLF/wiki backlog batch-commit.
- **Hand-off (NOT golf-core):** combo dashboard->sierra · scoped-skill glob + context-cascade CLAUDE.md->alpha · LSP hint->papa · CAMP triage->operator clarification.

**Ollama-staging doctrine:** 120b=reasoning (schema/leak-triage/eval), 32b=code drafts (test scaffolds/audits/globs), 1.5b=cheap classify (log states/broken-git/service-diff). Claude reserved for every safety decision (never-reap, disable-not-delete), wiring, torn-write guards, and ALL scrutiny (3-of-3 Claude-only). Pattern: Ollama drafts/reads/classifies -> Claude decides/wires/gates.

**v2 (ultracode-refined, `wf_cfbf3c86-4c4` completed clean — 3 agents, NO rate-limit, validating the bounded-fan-out lesson):** the reconcile lens did repo ground-truth pulls that CORRECTED v1 materially —
- `.active-chat-boost/` dir does NOT exist (0 stamps; cleanup already at `fleet-reaper-sweep.mjs:1682`) and `selectSoftReliefTargets` is a phantom symbol (0 refs) + `fleet-reaper-soft-relief-v2.test.mjs` already has 19+ tests → v1's G1/G2 were specced against phantom contracts → now VERIFY-FIRST-gated (close if dir never populates).
- 70 worktrees, 0 prunable (broken-.git premise unconfirmed; real issue = count) → merge raw 1+6 into worktree-consolidation. 22,218 untracked confirmed (noise-filter real).
- Net: 14 raw → **9 golf units (4 BUILD: G1 noise-filter, G2 gpt-oss smoke, G3 tribal-index write-sharding[P0], G4 worktree-consolidation; 5 VERIFY: G5 boost-stamp-premise, G6 docker-probe-gap, G7 sched-task-audit, G8 eval-suite, G9 MCP/cron-lock/watchdog sweep) + 5 HANDOFF (scoped-skill+context-cascade->alpha, LSP->papa, dashboard->quebec, CAMP->operator)**.
- Exec order: G7+G9 verify -> G5 gate -> G1 -> G6 -> G2 -> G4 -> G3(last,heaviest) -> G8. Ollama 5-axis Claude-reserved boundary (destructive/wiring/scrutiny/test-intent/fact-check). Plan v2 committed.

Relates to [[reference_mcp_concurrency_harden_shipped_2026_06_09]] (shipped just before), [[feedback_utilize_ollama_for_efficiency]], [[feedback_workflow_concurrency_and_local_routing_2026_06_08]] (why fan-out bounded to 3 — proven again: bounded workflow completed where 9-agent rate-limited twice), [[reference_tribal_index_v8_string_cap_2026_06_08]] (G3's root).