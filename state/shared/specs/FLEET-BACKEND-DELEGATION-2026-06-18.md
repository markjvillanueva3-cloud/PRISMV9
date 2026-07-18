# Fleet backend delegation -- zulu master orchestrator (2026-06-18)

> Operator directive: "you're not the only chat working on backend build... you're the master orchestrator so
> delegate tasks to: alpha, bravo, golf, india, papa and sierra. let them work on their domain tasks first."
> Goal (all 6 share it): **complete all backend tasks so the fleet can pivot to frontend (web/phone app).**

Delivery channel: `slot-brief-inject.mjs` (targeted, consume-once) -> `state/shared/slot-briefs/<slot>.md`,
injected into each slot's next prompt (SendKeys is topology-blocked on this host; this is the working path).
All 6 slots verified LIVE at delegation time (heartbeats 0-12m). Each brief leads "DOMAIN TASKS FIRST".

## Assignments (domain-first, then the orchestrated cross-cutting item)

| Slot | Domain (do first) | Orchestrated cross-cutting item |
|------|-------------------|----------------------------------|
| **alpha** | token-opt / Obsidian / memory / routing-graph / skills | Skill-curator **telemetry feed** -- skill-utilization-scan is mtime-only (SKILL_QUALITY_REGISTRY unpopulated; skill-usage-stats tracks 11/749). Feed real invocation telemetry. |
| **bravo** | Hermes/Zebra build + stub-hunt | (1) **C1 Multi-Wave DAG Scheduler runtime driver** (engine built, never executed -- canonical #1). (2) **reactive-chains activation**: gated boot site shipped (`reactive-chains-boot.ts`); resolve 2 blockers (reoptimize_schedule collision, job_to_invoice auto-fire) before enabling. |
| **golf** | fleet reaper (keep running) | Re-register 3 **stale knowledge crons** (Brain Refresh, Galaxy Knowledge Iterate, SFC Closed Loop) from elevated shell -- feed the Obsidian brain. |
| **india** | AI/NN/GNN/LoRA/RAG training | (1) **GNN selective -> full-coverage** (ref-pool growth; PSN-leg #10). (2) **WEDMLoRADatasetBuilderEngine** (refs=1) -- verify WIRED-VIA-ENGINE vs gap. |
| **papa** | backend helper (burn 3890 roadmap) | (1) **tsc-error burn-down** to zero. (2) **6 external-CAD-bridge** router-consumption audit (false-positive vs orphan). |
| **sierra** | system-viz integration/utilization | Fix **`audit-unwired-engines.mjs`** mis-classification -- (a) double-count of "Skipped" engines, (b) add `WIRED-VIA-BOOT` for EventBus bridges now imported via `reactive-chains-boot.ts`. Makes the backend-completion signal accurate. |

## Detail refs
- `state/shared/specs/BACKEND-COMPLETION-TRIAGE-2026-06-18.md` (the enumerated backlog + per-engine triage)
- `state/shared/specs/HERMES-FULL-ASSESSMENT-2026-06-17.md` (canonical Hermes target-state; C1 = #1)
- `state/shared/specs/HERMES-UTILIZATION-ASSESSMENT-2026-06-18.md` (skill-curator finding)

## What zulu already shipped this cycle (so slots don't re-do)
`U-REACTIVE-CHAINS-BOOT` (boot site, gated) · `U-WIRE-EXEMPT-TAGS` (3 test/contract engines) ·
`U-SEMANTIC-INDEX-EXEMPT` (redundant-with-memoryDispatcher) · `U-BACKEND-TRIAGE` · `U-FLEET-SURVIVAL-ADVISORY`.

## Honest scope (R12)
Backend completion (~3890 roadmap units) is the FLEET's continuous job across these 6 slots + the cron loops,
NOT one chat's. Zulu's role per operator: delegate + coordinate, not solo-build. The 6 cron build-loops
(alpha/bravo/golf/india/papa/sierra/zulu) are the harnessed mechanism that keeps it running between sessions.

## Follow-up routed 2026-06-18 (zulu) -- combined remote-utilization headline (alpha/sierra)
The offload dashboard headline "offload rate 16.6% (154/926)" counts ONLY top-level offloaded
(the ollama-router decisions) and EXCLUDES the 853 ask-hermes offloads (byHook) -> true combined
hermes+ollama remote utilization is badly understated. BUT a naive combined figure is UNSAFE:
top-level `stats.offloaded` is written by 10+ hooks (grep-index-first, large-read-digest,
nav-rerank, ollama-route-pretooluse, ollama-task-offloader, wiki-read-offload-advisory, ...) AND
per-hook byHook exists -> "top-level + sum(byHook.offloaded)" risks DOUBLE-COUNTING. Needs a clean
counter-topology reconciliation (which writers bump top-level vs byHook; are byHook entries a
breakdown OF top-level or disjoint?) BEFORE a combined headline can be shown honestly. Owner:
alpha (token-opt/offload dashboard) or sierra. Zulu verified the gap + the double-count risk;
did NOT ship a combined figure (R12: a wrong combined metric is worse than none). U-OFFLOAD-SOURCE-SPLIT
(a04efc7695) already surfaces the per-hook bySource split, which is the safe partial.
