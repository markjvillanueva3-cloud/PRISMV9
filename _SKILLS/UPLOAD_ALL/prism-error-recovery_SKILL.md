---
name: prism-error-recovery
description: |
  Error recovery strategies and fallback procedures.
---

When something breaks:
1. **CHECKPOINT** current progress immediately
2. **DIAGNOSE** what actually went wrong
3. **RECOVER** using the patterns below
4. **CONTINUE** from where you were

### State File Issues

#### State file corrupted or invalid JSON
**Symptoms:** JSON parse error when reading CURRENT_STATE.json

**Fix:**
1. Read the file as text to see what's wrong:
```javascript
Filesystem:read_file({ path: "C:\\...\\CURRENT_STATE.json" })
```
2. Look for: missing commas, unclosed brackets, truncated content
3. If recoverable, use `Desktop Commander:edit_block` to fix
4. If not recoverable, check SESSION_LOGS for last known state

#### State file missing
**Fix:**
1. Check if renamed: `Filesystem:list_directory` in root
2. Check SESSION_LOGS for last session info
3. Recreate minimal state structure:
```json
{
  "meta": { "lastUpdated": "NOW", "lastSessionId": "unknown" },
  "currentWork": { "status": "RECOVERING", "focus": "State recovery" }
}
```

### Write/Save Errors

#### Write appears to succeed but file is empty/wrong
**Fix:**
1. Verify with immediate read:
```javascript
Filesystem:read_file({ path: "..." })
```
2. If wrong, don't overwrite - investigate first
3. Check for encoding issues
4. Try writing smaller chunks

#### File truncated during write
**Symptoms:** Large file cut off

**Fix:**
1. For large content (>50KB), write in chunks:
```javascript
// First chunk
Filesystem:write_file({ path: "...", content: part1 })
// Subsequent chunks
Desktop Commander:write_file({ path: "...", content: part2, mode: "append" })
```

## RECOVERY PATTERNS

### Pattern 1: Checkpoint Before Risky Operations
```
Before:
  - Large file writes
  - Multi-step operations
  - Anything that could fail

Do:
  1. Update CURRENT_STATE.json with current progress
  2. Note what you're about to attempt
  3. Then proceed
```

### Pattern 2: Verify After Every Write
```javascript
// Write
Filesystem:write_file({ path: "...", content: "..." })

// Immediately verify
Filesystem:read_file({ path: "...", head: 10 })
// Confirm file starts correctly
```

### Pattern 3: Incremental Extraction
```
Instead of extracting entire module at once:
  1. Extract first 500 lines
  2. Verify it looks correct
  3. Extract next section
  4. Append and verify
  5. Continue until complete
```

### Pattern 4: State File Backup
```
Before making major state changes:
  1. Read current state
  2. Note key values in session log
  3. Then update state
  
If state corrupts, rebuild from session log
```

## RECOVERY CHECKLIST

When something goes wrong:

```
□ 1. STOP - Don't make it worse
□ 2. CHECKPOINT - Save current progress to state file
□ 3. DIAGNOSE - What actually failed? Read error message carefully
□ 4. LOOKUP - Check this skill for known fix
□ 5. FIX - Apply the fix pattern
□ 6. VERIFY - Confirm fix worked
□ 7. CONTINUE - Resume from where you were
□ 8. LOG - Note the issue in session log for future reference
```

## Remember

- **Errors are normal** - They happen during development
- **Most errors are recoverable** - Don't panic
- **Checkpoint frequently** - So recovery is easy
- **Don't restart unnecessarily** - Fix and continue
- **Log issues** - Helps future sessions
