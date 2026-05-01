---
source: project
section: HOOK INJECTION RESPONSES — react to auto-injected context, don't scroll past
slug: hook-injection-responses-react-to-auto-injected-context-don-
indexed_at: 2026-04-30T17:23:34.960Z
---

## HOOK INJECTION RESPONSES — react to auto-injected context, don't scroll past

| Hook signal | Required action |
|---|---|
| `wiki-precheck-inject` top-3 entries | Read those entries before deriving; cite in reply |
| `chat-bus-inject` peer file claims | Do NOT edit listed files; post own claim before adjacent edits |
| `session-reorient-inject` brief | Use as ground truth; skip re-exploration of summarized work |
| `ollama-context-aggregator` summary | Treat as cached; skip Read of summarized files |
| `claudemd-ollama-enforcer` / `ollama-task-offloader` | Invoke `/ollama-*` skill; do not in-line the task |
| `auto-precompact-watchdog` pressure | Run `/precompact` + write per-agent handoff NOW |
| `posttool-mcp-backend-audit` stub flag | Fix before next Edit/Write |
| `signature-drift-detector` warning | Update all callers in same commit |
| `write-import-check` unresolved | Add/fix import before continuing |
| `error-recovery-memory` recurrence | Apply recorded fix; do not retry naively |
| `karpathy-discipline-inject` 5-step checklist | Apply CLASSIFY→TECHNIQUE→EDGES→FAILURES→WRITE before first Edit; enumerate edges in plan |
| `comprehensive-build-enforce` affected-tests | Run named tests + build before claiming unit complete |
| `discipline-expert-inject` domain framing | Use named domain primitives (physics/CAM/CAD); reject generic patterns |
| `magic-number-detector` hardcoded constants | Replace with import from `physics/constants.ts` before saving |
| `pretool-causal-trace` ripple list | Inspect listed dependents' tests in same commit |
| `read-already-have` cache hit | Skip redundant Read; reuse cached content |
| `coding-pattern-hint` pattern match | Apply hinted pattern (FSM/reducer/Promise.all) instead of ad-hoc |
| `skill-chain-suggest` next-skill | Invoke suggested skill; do not hand-roll the next step |

**Default rule:** any hook that emits a `systemMessage` or `additionalContext` is asserting a constraint or surfacing intel. Acknowledge it in your next decision; silence is non-compliance.
