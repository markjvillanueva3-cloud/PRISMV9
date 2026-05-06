---
policy:
  tier: 1
  triggers:
    - "pre-review"
---
# /pre-review — DeepSeek-R1 First-Pass Review

Manually invoke a DeepSeek-R1 chain-of-thought draft for a medium-complex task before Claude refines it. Saves ~60% of Claude tokens on tasks where R1's draft is mostly right and Claude's job is to polish for correctness, safety, and PRISM-domain integration.

## Usage

```
/pre-review <task description>
/pre-review --context <file:path> <task description>
/pre-review --tier 3 <task description>      # force tier (debugging the router)
/pre-review --domain physics <task>           # explicit domain — safety domains will skip drafting
```

Auto-injection mode (always-on) lives in `.claude/hooks/pre-claude-review-inject.mjs` (P22-U02). Set `PRISM_PRE_REVIEW_AUTO=1` to enable; default is suggest-only. This slash command is the **manual** path — explicit invocation, full output displayed.

## Procedure

### 1. Resolve arguments
- Capture the task description as `prompt`
- If `--context <file:path>` was given, read that file via the Read tool and pass its contents as `context`
- If `--domain <name>` was given, pass it through (router escalates safety/physics/Kienzle/Taylor/deflection/thermal/compliance to Claude → no draft)
- If `--tier <n>` was given, validate it is in [0..5] and warn if you forced a tier — drafting at tier 0/1/2 won't use chain-of-thought reasoning

### 2. Call `prism_ai:pre_review`
```
{
  "action": "pre_review",
  "params": {
    "prompt": "<task>",
    "context": "<optional file content>",
    "domain": "<optional>",
    "promptTokens": <optional estimated count>
  }
}
```

The dispatcher returns a `PreReviewResult`:
- `ok` (bool)
- `used` (bool — true iff R1 was invoked, false iff router escalated to Claude)
- `tier`, `model`, `reason`
- `draft`: `{reasoning_chain, draft, confidence}` or null
- `latencyMs`
- `error` (null on success)

### 3. Display the result

If `used=false` and `tier=5`: tell the user this task escalated to Claude (safety/physics) so no R1 draft was generated; proceed directly with Claude reasoning.

If `ok=false`: display the error reason. Common causes: Ollama unreachable (start it), `deepseek-r1:14b` not pulled (`node scripts/pull-multi-model-stack.mjs`), generate timeout (>25s — model still warming up).

If `ok=true` and `used=true`: display in this format:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEEPSEEK-R1 PRE-REVIEW DRAFT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:      <model>
Tier:       <tier>
Latency:    <ms>
Confidence: <0..1>

Reasoning chain:
<reasoning_chain>

Draft:
<draft>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. Refine, do not replicate

After displaying the draft, **read it critically** before adopting any of it:
- Does the reasoning chain reach a defensible conclusion, or does it hallucinate APIs / file paths?
- Is the draft answer consistent with the surrounding PRISM constraints (physics constants, dispatcher patterns, lane discipline)?
- For low confidence (<0.5): treat the draft as a hypothesis only.
- For high confidence (≥0.7): the draft is likely a useful skeleton — refine for safety, integration, tests.

Always cite which parts of the draft you adopted, modified, or rejected. The user can audit the value of pre-review by reading the citation pattern.

## Examples

```
/pre-review Refactor OllamaClientEngine to support streaming responses while preserving the OllamaResult<T> envelope
```

```
/pre-review --context mcp-server/src/engines/QdrantMemoryEngine.ts Debug why batch insert hangs on Windows when payload exceeds 4KB
```

```
/pre-review --domain safety Validate Kienzle force calculation
# → router escalates to tier 5; no R1 draft; proceed with Claude
```

## When to skip pre-review

- Trivial one-line edits (token cost > value)
- Safety / physics / compliance domains (Claude leads — escalates automatically)
- Tasks where you already know the answer (you'll spend tokens on a draft you ignore)
- Time-sensitive (network round-trip + R1 latency adds 5-25s)

## Underlying engine

`PreReviewOrchestratorEngine` at `mcp-server/src/engines/PreReviewOrchestratorEngine.ts` — wraps `OllamaClientEngine` and `ModelRouterEngine`. Does NOT block on safety domains; returns `used=false` with explanation. Tests in `mcp-server/src/__tests__/PreReviewOrchestrator.test.ts`.

## Telemetry

Hook events (skip / suggest / draft_ok / draft_fail / error) are logged to `mcp-server/data/state/pre-review-events.jsonl` for P23 adaptive routing. Each line: `{ts, event, tier, reason, ...}`.
