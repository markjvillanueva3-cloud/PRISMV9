---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_cross_session_duplication.md
source_filename: feedback_cross_session_duplication.md
content_hash: 4bcedce0c9fb3d4f64d2f3da60d33359dbbf89bc2fdab92113416c7fdcc8c17e
mirror_ts: 2026-05-05T13:00:09.422Z
mirror_engine: ObsidianMemorySyncEngine
---
Cross-session asset retention was failing — chats were duplicating work from other sessions because the in-memory cache didn't survive across processes.

**Why:** User explicitly reported "another chat is trying to build something it had already built a few hours ago in a previous session". The DuplicationGuardEngine was using in-memory caching with 5-minute TTL that didn't persist across chat sessions.

**How to apply:**
1. **Before creating ANY new engine/algorithm/formula/hook:**
   ```typescript
   const check = await duplicationGuardEngine.checkBeforeCreating('engine', 'Name', 'description');
   if (check.isDuplicate || check.similarity > 0.7) {
     // DO NOT CREATE — use check.alternatives[0] instead
   }
   ```

2. **After successfully creating a new asset:**
   ```typescript
   await duplicationGuardEngine.registerNewAsset('engine', 'MyEngine', 'src/engines/MyEngine.ts', 'description');
   ```

3. **SessionStart hook** (`cross-session-duplication-guard.mjs`) automatically displays recent assets from the last 72 hours to prevent duplicate work.

4. **Persistent storage**: `data/state/cross-session-asset-registry.json` survives across ALL chat sessions.
