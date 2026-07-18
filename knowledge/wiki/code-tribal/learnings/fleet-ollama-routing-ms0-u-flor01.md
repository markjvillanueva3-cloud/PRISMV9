# FLEET-OLLAMA-ROUTING-MS0/U-FLOR01 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR01 (slot:tango): lane-aware resolveExecutor (foundation)

**Commit:** `05cd41c1001f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T19:39:56-05:00
**Tags:** fleet-ollama-routing-ms0, u-flor01, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR01 (slot:tango): lane-aware resolveExecutor (foundation)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR01 (slot:tango): lane-aware resolveExecutor (foundation)

Operator: "improve ollama ... auto-utilization of the best available Ollama LLM per task." vLLM PARKED (gated-OFF inert lane only).

EXTEND not greenfield (duplication-guard would throw on a new router): added
resolveExecutor() to .claude/hooks/lib/ollama-cost-router.mjs, wrapping the
existing routeModelForTask() and adding the LANE dimension the prior router lacked:
  prism_calc -> deterministic PRISM code, no model spend (R5)
  claude     -> judgment/safety, never a local model (hard invariant)
  vllm       -> high-fan-out grunt, ONLY when PRISM_VLLM_ENABLE + healthy; fixed
                single hot model, auto-falls-back to Ollama (parked OFF by default)
  ollama     -> the always-available local floor at the cost-router-resolved tier

FAIL-LOUD (R12): an offloadable task that cannot reach Ollama (down or empty
roster) returns lane:claude with an explicit reason -- never silently pretends to
offload. 3 single-sourced category Sets (CLAUDE_LANE / DETERMINISTIC_LANE /
VLLM_PREFERRED) so every consumer shares ONE "Claude-only" definition.

12 new R9 tests (52/52 total): all 5 ladder branches + Blackwell-promotion-through-
lane + ollama-down fail-loud + empty-roster + vLLM up/down/subset-gate + unknown-
category-still-offloads (no silent-claude regression) + frozen-set anti-mutation.
Purely additive; routeModelForTask untouched (back-compat).

Foundation for U2 (fail-loud hooks), U4 (route-pretooluse allowlist widen), U5
(/smart model-routing), U7 (command wiring). New Ollama models (qwen3-coder/
deepseek-v4) fold into TIER_PREFERENCES once their live tags are verified -- not
yet visible on native :11434 or Docker Model Runner :12434.
```

## Files touched (3)
- .claude/hooks/__tests__/ollama-cost-router.test.mjs | 132 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/lib/ollama-cost-router.mjs            | 115 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 247 insertions(+)

## Lessons surfaced in commit body
- tilization of the best available Ollama LLM per task." vLLM PARKED (gated-OFF inert lane only).
- till-offloads (no silent-claude regression) + frozen-set anti-mutation.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 05cd41c1001f`
- Milestone envelope: `mcp-server/data/milestones/FLEET-OLLAMA-ROUTING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._