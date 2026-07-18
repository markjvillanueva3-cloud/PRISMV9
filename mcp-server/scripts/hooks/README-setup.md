# PRISM Hooks Setup

To enable cross-session duplication guard and other hooks, add the following to your `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node H:\\prism\\mcp-server\\scripts\\hooks\\cross-session-duplication-guard.mjs",
            "timeout": 5000
          },
          {
            "type": "command",
            "command": "node H:\\prism\\mcp-server\\scripts\\hooks\\ai-reasoning-session-start.mjs",
            "timeout": 3000
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node H:\\prism\\mcp-server\\scripts\\hooks\\ai-integration-stop-check.mjs",
            "timeout": 3000
          }
        ]
      }
    ]
  }
}
```

## Available Hooks

### SessionStart
- **cross-session-duplication-guard.mjs**: Displays assets created in the last 72 hours across ALL Claude sessions. Prevents duplicate builds.
- **ai-reasoning-session-start.mjs**: Reminds about PRISM AI capabilities (prism_ai dispatcher actions).

### Stop
- **ai-integration-stop-check.mjs**: Checks for AI integration opportunities before stopping.

## Cross-Session Asset Registry

The duplication guard persists to `data/state/cross-session-asset-registry.json`.

**IMPORTANT**: Always use DuplicationGuardEngine before creating new engines:

```typescript
import { duplicationGuardEngine } from "./engines/DuplicationGuardEngine.js";

// BEFORE creating:
const check = await duplicationGuardEngine.checkBeforeCreating('engine', 'Name', 'desc');
if (check.isDuplicate || check.similarity > 0.7) {
  // USE existing asset instead
  console.log('Use:', check.alternatives[0]);
} else {
  // Safe to create
}

// AFTER creating:
await duplicationGuardEngine.registerNewAsset('engine', 'MyEngine', 'src/engines/MyEngine.ts', 'desc');
```
