# Optimize Context — Auto-Slim Before Next Prompt

Trim the conversation context when token budget exceeds 70% of the model window. Prefers reversible compression (load-on-demand digests, drop verbose tool outputs) over destructive truncation.

## Args: $ARGUMENTS
- (none required) — checks current budget vs threshold; only acts when over
- `--threshold=<pct>`: override the 70% trigger (e.g., `--threshold=60` for tighter pruning)
- `--dry-run`: report what would be slimmed without modifying state

## Trigger policy
```yaml
policy:
  tier: 1
  triggers:
    - context_pct > 70
    - on:UserPromptSubmit
    - keyword:"too long"
    - keyword:"context full"
```

## What gets slimmed (in order, until under threshold)
1. **Verbose tool outputs older than the last 3 prompts** — replaced with a one-line digest pointer
2. **Repeated injection blocks** (chat-bus, awareness, etc.) — only the most-recent retained
3. **Large file reads** that haven't been edited since — replaced with `[path:line-range, re-read on demand]`
4. **Duplicate handoff blocks** — keep the newest, drop earlier copies

## What is never slimmed
- Active TodoWrite/TaskCreate items
- Plan-mode plans before approval
- The current user prompt and the assistant's response in flight
- Memory recalls explicitly cited in active reasoning

## MCP wiring
This command currently has no dispatcher action — it operates on local conversation state. Future: `prism_session:context_slim` action will expose the slim algorithm to other agents for cross-session use.

## Output
One-line summary: `slimmed N blocks (-X tokens) | budget: 72% → 58%`. Verbose breakdown only on `--dry-run`.

## Related
- `/token-economy-report` — see which categories burned the most context this session
- `/context-delta` — show what changed since last checkpoint (delta-only, never absolute snapshot)
