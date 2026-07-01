---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_file_claim_namespace_bug.md
source_filename: feedback_file_claim_namespace_bug.md
content_hash: 7f434b185a44da4ea706450af674e74ddc167cdad089b3fbcfe92972df1b9788
mirror_ts: 2026-05-05T13:00:09.438Z
mirror_engine: ObsidianMemorySyncEngine
---
**Observed 2026-04-27 ~13:50 UTC during meta/ollama-relevance-gate work.**

`MarkV-20636` (PID-only identity scheme) claimed `H:/PRISM/.claude/hooks/ollama-unified-semantic-router.mjs` at 13:49:37. The file-claim-guard correctly BLOCKED `MarkV-18644` from editing 48 seconds later (CONFLICT message in AGENT_CHAT.md at 13:50:25). But my agent (`Agent@MARKV/pid-51344`, claude-9c056864 — Agent@MARKV/pid-X identity scheme) made 2 edits to the same file at ~13:50 with NO block fired.

**Root cause hypothesis:**
- `file-claim-guard.mjs` reads claims from a registry indexed by some identity key
- The two schemes (`MarkV-XXXXX` vs `Agent@MARKV/pid-X`) don't normalize to the same key, so cross-scheme claim lookup misses
- `agent-identity.mjs` likely produces different output depending on whether the calling context is a chat-ID context or a PID-only context

**Why:** This is a silent-corruption-class bug — exactly the failure mode the lane-discipline rule was meant to prevent. The rule itself is correct; the *enforcement* has a namespace gap.

**How to apply:**
1. **Until fixed**: when editing shared infrastructure files (`.claude/hooks/`, `.claude/helpers/`, `.claude/commands/`, `H:/.claude/settings.json`), MANUALLY check chat bus claims via `tail H:/PRISM/state/shared/AGENT_CHAT.md` and the prompt's chat-bus injection BEFORE editing — don't trust the file-claim-guard to catch all races.
2. **For the fix**: read `H:/PRISM/.claude/hooks/file-claim-guard.mjs` + `H:/PRISM/.claude/helpers/agent-identity.mjs` together. Normalize all identities to a single canonical form (e.g., extract PID-suffix from any identity string). Make claim lookup check ALL forms of the identity, not just the exact-match.
3. **Test**: write a regression test that simulates a `MarkV-XXXXX` claim then attempts edit from `Agent@MARKV/pid-X` and asserts the block fires.

**Anti-pattern:** trusting that "the hook will catch it" without verifying the hook actually fires for your identity scheme. Especially for Agent@MARKV/pid-X identities, which are common when sub-agents run.

**Detection signal:** If you see `CONFLICT: <file>` chat-bus messages from peer chats, check whether the file-claim-guard would also block YOU — try `node H:/PRISM/.claude/helpers/agent-identity.mjs` to see your effective identity, then grep claim registry for matching keys.
