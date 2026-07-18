---
name: audit-token-context-memory-2026-05-16
description: "/forge-audit-v2 token/context/memory audit (slot juliett). 2 META artifacts shipped: audit-hook-stack-cost.mjs + memory-size-watch.mjs. Peer review caught uncalibrated savings + phantom fix + missed memory axis."
source: prism-memory
synced: 2026-05-18T01:02:09.196Z
aliases: reference_audit_token_context_memory_2026_05_16
---


# Token/Context/Memory Audit (2026-05-16, slot juliett, /forge-audit-v2)

## Shipped (re-runnable META artifacts)

- `scripts/audit-hook-stack-cost.mjs` — enumerates settings.json hook chains, scores est tokens/fire by role (inject/compute/advisory/guard). Baseline `state/shared/AUDIT-HOOK-STACK-COST-BASELINE.json`. **Heuristic is flat-400/inject — uncalibrated; do NOT cite its per-hook k-token splits as measured.**
- `scripts/memory-size-watch.mjs` — MEMORY.md vs 24576-B ceiling guard. exit 0/1/2, WARN ≥90% CRITICAL ≥97%, history jsonl. Mirrors `synergy-regression-watch.mjs`.

## Baselines

UserPromptSubmit ~3420 est tok/fire (8 injects) · Ollama offload **0.222** (63/283, drifted from 0.232 mid-audit) · MEMORY.md **23826 B / 96.9% — WARN, exit 1** (needs compression now).

## Durable lesson

A `/forge-audit-v2` is only as good as its peer review. The adversarial reviewer (mandatory `isolation: worktree`) caught three real defects in my first pass: (1) F1 savings were heuristic-on-heuristic 3-sig-fig fabricated precision from a flat 400-token constant — relabel uncalibrated; (2) F2 R3 was a phantom fix targeting a regex that already existed (`ollama-task-offloader.mjs:102` already matches space-form `/checkin`); (3) the audit declared "memory retention" in scope but produced **zero memory findings** until review surfaced MEMORY.md was 750 B from re-triggering a *known prior shipped regression* (U-MEMORY-COMPRESS). **When auditing, the scope axes you name are a contract — produce a verifiable finding for each, or the review will (rightly) fail you on the gap.** The strongest finding (F7) came from the reviewer, not the author.

## Pending (next chat)

F2 fixes R1+R2+R4+R5 (file:line in spec) → flips offload ≥30%. F1+F6 paired (calibration first). Wire `memory-size-watch.mjs` to daily task / Stop advisory — the CronCreate self-schedule is session-only. CLAUDE.md back-flow done (2 entries: MEMORY.md re-growth + Ollama dead-router).

Wiki: [[audit-token-context-memory-2026-05-16]]. Companions: [[reference_synergy_regression_watch_2026_05_16]], [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]], [[feedback_verify_actual_contract_not_proxy]].


## Related
[[skills/forge-audit-v|/forge-audit-v]] • [[skills/audit-hook-stack-cost|/audit-hook-stack-cost]] • [[skills/fire|/fire]] • [[skills/compute|/compute]] • [[skills/advisory|/advisory]] • [[skills/guard|/guard]] • [[skills/shared|/shared]] • [[skills/inject|/inject]] • [[skills/memory-size-watch|/memory-size-watch]] • [[skills/checkin|/checkin]]