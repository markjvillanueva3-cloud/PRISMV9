---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_file_claim_guard_fix_recipe.md
source_filename: project_file_claim_guard_fix_recipe.md
content_hash: b684a8348dbdf391a6efdbf33cf2c3cfda94efa73a6fe31c78af9791145fb9b2
mirror_ts: 2026-05-05T13:00:09.496Z
mirror_engine: ObsidianMemorySyncEngine
---
**Root cause** (from background Agent A investigation 2026-04-27):
- `file-claim-guard.mjs:226` uses `resolveSessionId()` which returns `claude-XXXXXXXX` (truncated 8-char UUID via stable-session-id.mjs)
- `agent-coordination.mjs:516-557` uses `identity.instance` (full `Agent@MARKV/pid-XXXXX` or `Claude@MARKV/pid-XXXXX`)
- Two schemes never normalize — claims written under one are invisible to lookup under the other
- File-claim-guard has ZERO knowledge of full instance form; only sees truncated session IDs

**Why:** When the same machine spawns multiple Claude chats, each gets a unique 8-char UUID, even if they share the same Agent@MARKV/pid-X identity. The guard compares only sessionIds, missing instance-level matches.

**Concrete fix (3 files, backward compatible):**

### 1. `H:/PRISM/.claude/hooks/file-claim-guard.mjs:130-175` (attemptClaim function)
Store both fields, check both on lookup:
```javascript
function attemptClaim({ sessionId, pcName, targetPath, intent, agentInstance }) {
  // ... existing claim file resolution ...
  if (existing) {
    const isOwn = existing.sessionId === sessionId ||
                  (agentInstance && existing.agentInstance === agentInstance);
    // ... rest of conflict logic ...
  }
  const claim = {
    schemaVersion: "1.0.0",
    path: canonical,
    sessionId,
    agentInstance: agentInstance || sessionId,  // NEW FIELD
    pcName,
    acquiredAt: existing && (existing.sessionId === sessionId || existing.agentInstance === agentInstance)
      ? existing.acquiredAt : nowIso,
    expiresAt,
    intent,
  };
  // ... atomic write ...
}
```

### 2. `H:/PRISM/.claude/hooks/file-claim-guard.mjs:200-244` (main function)
Extract agentInstance from payload:
```javascript
const sessionId = resolveSessionId(payload.session_id || payload.sessionId);
const agentInstance = payload.agent_instance || payload.agentInstance || payload.session_id || null;
const result = attemptClaim({ sessionId, pcName, targetPath, intent, agentInstance });
```

### 3. `H:/PRISM/.claude/hooks/file-claim-commit-guard.mjs:151-174` (findForeignClaimsForPaths)
Apply dual-key check:
```javascript
function findForeignClaimsForPaths(sessionId, absPaths, agentInstance) {
  // ... iterate claim files ...
  if (claim.sessionId === sessionId ||
      (agentInstance && claim.agentInstance === agentInstance)) {
    continue;  // Own claim
  }
  // ... else conflict ...
}
```

**Regression test** in `.claude/hooks/__tests__/file-claim-guard.test.mjs`:
- Test 1: Same agentInstance from different sessionIds → NOT blocked (proves fix)
- Test 2: Different agentInstance → BLOCKED (proves new check works)
- Test 3: Old claim without agentInstance → falls back to sessionId (backward compat)

**Other namespace gaps Agent A found:**
1. `peerIsLive()` in file-claim-guard.mjs:92-99 also uses sessionId — presence registry should also use agentInstance as tiebreaker
2. file-claim-guard generates its own reduced sessionId via stable-session-id.mjs while agent-coordination uses inferAgentIdentity() — consider consolidating to single source

**Rollout risk: LOW**
- Backward compatible: old claims without agentInstance fall back to sessionId
- No migration needed
- No peer chat restart needed
- Old claims expire via TTL and get rewritten in dual-format

**Evidence:**
- Claim registry: `H:/PRISM/state/shared/chat-bus/claims/*.json`
- Sample claim: `5d027270a547fa6f.json` had `sessionId="claude-a3adcd0c"` but no agentInstance
- AGENT_CHAT.jsonl shows agent_instance field used by chat-bus (`Agent@MARKV/pid-51344`)
- Race observed 2026-04-27 13:50 UTC: my Agent@MARKV/pid-51344 edited file claimed by MarkV-20636 (different scheme)

**Application order:** Apply fix in 3-file commit on `meta/file-claim-fix` branch (separate from CLAUDE.md slim). Test via the regression test BEFORE committing.
