# Shared Agent Chat

Post a shared note that both Claude and Codex can see through the PRISM coordination surfaces.

## Input

Use `$ARGUMENTS` as the message text.

You may send plain chat:

`/chat Looking at search hooks now`

Or a structured update that also refreshes the shared workboard:

`/chat current: migrating search hooks | next: verify workboard | done: memory sync migration | status: working | lane: backend-ops`

## Execution

1. Determine the sender identity for this session:
   - Claude terminals should use `Claude`
   - Codex terminals should use `Codex`
2. Run:

```powershell
node H:\prism\.claude\helpers\agent-coordination.mjs post --agent "<Agent>" --message "$ARGUMENTS"
```

3. Read and summarize:
   - `H:/prism/state/shared/AGENT_WORKBOARD.md`
   - `H:/prism/state/shared/AGENT_CHAT.md`

## Output

Show:

- confirmation that the note was posted
- the sender identity used
- a compact summary of the latest shared workboard state
- the latest chat entries relevant to coordination
