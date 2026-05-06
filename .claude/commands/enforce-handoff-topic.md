# Enforce Handoff Topic — Peer Chat Overwrite Detector

Reactive guard that detects when this chat is about to write to a file or topic that another active peer chat has already claimed. Reads the chat-bus + per-agent handoff manifests, surfaces the conflict, and either blocks the write or tells you to claim the topic first.

## Args: $ARGUMENTS
- (none) — runs on demand to audit the current chat against active claims
- `--topic=<topic-id>`: probe a specific topic before claiming
- `--scan=<file-glob>`: probe whether any peer claims any of these files
- `--release=<topic-id>`: release a topic this chat had claimed but is done with

## Trigger policy
```yaml
policy:
  tier: 1
  triggers:
    - on:PreToolUse(Edit|Write)  # before any disk mutation
    - keyword:"who's working on"
    - keyword:"is X claimed"
    - keyword:"chat conflict"
```

## What it checks
1. **`state/shared/handoffs/HANDOFF-*.md`** — per-agent topic claims
   - If a HANDOFF mentions the file you're about to edit AND its `last_heartbeat` is < 2h old, you have a conflict
2. **Chat-bus tail** — recent `[time] Agent: claiming X` messages
3. **TodoWrite/Plan files** — open plans that gate the file
4. **Per-file `state/shared/file-claims/<path-hash>.json`** — explicit fine-grained claims

## Outcomes
- **Clear**: no peer claim found within heartbeat window — write proceeds
- **Stale claim**: peer claim exists but heartbeat > 4h old — surface a warning, allow write with `--force`
- **Active claim**: peer is working RIGHT NOW — block write, suggest:
  - Wait for them to finish (auto-recheck every 5min)
  - Coordinate via chat-bus message
  - Pick a different file/topic

## MCP wiring
- Reader: `prism_session:active_claims` action returns the live claim map
- Writer: `prism_session:claim_topic` / `prism_session:release_topic`

## Output format
```
CONFLICT: src/engines/Foo.ts is claimed by claude-aa6cc55c since 2026-05-06T12:30Z
  Last heartbeat: 12 minutes ago (active)
  Their topic: "INTEL-OLLAMA-OBSIDIAN-MS0/P5-U05 — diagnose_failure wiring"
  Chat-bus: H:/prism/state/shared/AGENT_CHAT.md (last 20 messages above)
Suggested action: post a message tagging @claude-aa6cc55c, or pick another unit.
```

## Related
- `/handoff` — write a HANDOFF record on session end (peer chats then see it)
- `/scrutinize` — heavier review that includes claim-status as one of several axes
