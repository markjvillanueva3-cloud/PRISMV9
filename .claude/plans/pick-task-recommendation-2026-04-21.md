# /pick-task Recommendation — 2026-04-21

## State of the claim board
- `H:\PRISM\mcp-server\data\claims\ACTIVE_CLAIM.json` = `{}` (this chat has no active claim)
- Other chats currently committing: Agent 3104, 4548 (from baseline awareness)
- Roadmap: **318/675 milestones complete** · 12 in-progress · 335 not-started

## Top 3 pickable (unblocked, CRITICAL/HIGH priority)

| Rank | Milestone | Priority | Units | Sessions p50 | Rationale |
|---|---|---|---:|---:|---|
| 1 | `CAD-GROUND-TRUTH-MS0` | CRITICAL | 10 | 4 | **Only unblocked CRITICAL** in queue. Unblocks `CAD-DRAW-EVERY-MS0`. Fresh greenfield — good for a focused session. |
| 2 | `TEST-LEGIT-MS1` | HIGH | 12 | ? | **Hottest momentum** — last 7 commits are U-INFRA01-07 landing today (TestAST, public-method/param-type/return-shape introspection, TestRegistryAdapter, physics-reference-db). Picking up U-INFRA08+ continues the flow. |
| 3 | `CAD-TRAINING-EXTRACT-MS0` | HIGH | 12 | 4 | PDF→drawing intelligence. Depends on CAD-GROUND-TRUTH-MS0 (option 1) for full value; do #1 first. |

## Recommendation: **TEST-LEGIT-MS1**
Reasoning:
- Momentum: 7 consecutive units landed today, infrastructure is warm.
- Other chats aren't touching it right now (no active claim).
- Infrastructure work (AST, harness, registry, physics DB) unblocks correctness of every future engine build — high multiplier.
- CAD-GROUND-TRUTH-MS0 (the CRITICAL) should go to a chat dedicated to it; mixing with today's infrastructure-heavy session would dilute focus.

## Execution (next session, not this one)
```bash
# 1. read roadmap envelope
cat H:\PRISM\mcp-server\data\milestones\TEST-LEGIT-MS1.json | jq '.units[] | select(.status != "complete") | {id, title, deps}' | head -5
# 2. pick first not-complete unit (likely U-INFRA08)
# 3. claim
node H:\PRISM\.claude\helpers\work-claim.mjs claim TEST-LEGIT-MS1 U-INFRA08
# 4. read unit steps, execute
# 5. build verify: cd H:\PRISM\mcp-server && npm run build:fast
# 6. commit: [TEST-LEGIT-MS1/U-INFRA08]: <title>
# 7. release claim when unit done
```

## Why NOT starting execution in THIS session
- This session already delivered: portability infra (8 files), master CLAUDE.md (262 lines, 3 iterations), forge brainstorm, 3 audit plans. Token budget is spent on breadth.
- TEST-LEGIT-MS1 unit implementation needs fresh budget: read spec + build + real tests + commit. Starting + stopping mid-unit leaves half-work = SVI drift.
- Cleaner: `/compact`, open new session, `/startup`, `/pick-task` (or run the claim command above).

## Alternative: claim CAD-GROUND-TRUTH-MS0 if CAD is higher priority in your queue
Same flow — just substitute the milestone ID.
