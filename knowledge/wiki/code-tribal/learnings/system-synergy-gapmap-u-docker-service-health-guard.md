# SYSTEM-SYNERGY-GAPMAP/U-DOCKER-SERVICE-HEALTH-GUARD — [MAIN] [SYSTEM-SYNERGY-GAPMAP]/U-DOCKER-SERVICE-HEALTH-GUARD (slot:golf): detect downed prism-* Docker services (closes recurring qdrant-down gap)

**Commit:** `fb314a6fd194` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T23:55:01-05:00
**Tags:** system-synergy-gapmap, u-docker-service-health-guard, auto-distilled

## Subject
[MAIN] [SYSTEM-SYNERGY-GAPMAP]/U-DOCKER-SERVICE-HEALTH-GUARD (slot:golf): detect downed prism-* Docker services (closes recurring qdrant-down gap)

## Body
```
[MAIN] [SYSTEM-SYNERGY-GAPMAP]/U-DOCKER-SERVICE-HEALTH-GUARD (slot:golf): detect downed prism-* Docker services (closes recurring qdrant-down gap)

CONTEXT (synergy /loop iter8, goal names ollama/docker/qdrant): a local-stack
sweep found Qdrant DOWN — :6333 refused, prism-qdrant absent from `docker ps`.
Root: a name-conflict had renamed the container to `fe30e81bd0ed_prism-qdrant`
stuck in 'Created', so `docker start prism-qdrant` 404s; started it by the real
renamed name -> healthz 200, collections intact (prism_engines 3866/green,
skills 241, formulas 32, queryable). Semantic vector search (CAG-router substrate
/ PSN leg) restored. This is the THIRD qdrant-down (also 2026-05-24, -05-28) with
no monitor — fleet-task-health audits SCHEDULED TASKS, not containers.

SHIPPED: scripts/docker-service-health-check.mjs — pure-core classifier
(parseDockerRows/classifyServices/summarize, exported + tested) that flags any
expected prism-* service as down/created/exited/absent AND emits the correct fix
(`docker start <realName>` for the renamed-leftover case; launcher for absent).
CLI: --json (exit 0 healthy / 1 degraded) + --fix (docker start each downed
service by real name; NEVER touches the Docker daemon itself).
TESTED: 5/5 hermetic (no Docker needed) — the load-bearing case is today's exact
renamed-'created' qdrant -> fix targets the REAL name (a plain start would 404).
VALIDATED LIVE: correctly reported all-4-up after the restore (qdrant shown with
its renamed real name).

SCOPE (R12 honest): CLI-complete + tested, NOT yet hook-wired — matches the
fleet-task-health-watch.mjs CLI-first precedent. NEXT: wire a Stop/SessionStart
advisory (surface downed named services every session) — deferred from a deep-
budget post-incident turn rather than rush a settings.json edit.
[[reference_qdrant_down_created_leftover_2026_06_08]]
```

## Files touched (3)
- scripts/docker-service-health-check.mjs      | 138 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/docker-service-health-check.test.mjs |  80 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 218 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fb314a6fd194`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-SYNERGY-GAPMAP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._