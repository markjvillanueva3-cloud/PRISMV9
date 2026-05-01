---
name: prism-error-recovery
description: |
  Error recovery protocols for PRISM development. What to do when tools fail, files get corrupted, or operations don't complete. Contains common error patterns and fixes. READ THIS WHEN SOMETHING BREAKS - don't panic or restart unnecessarily.
---

# PRISM Error Recovery

## 🔴 FIRST RULE: DON'T PANIC, DON'T RESTART

When something breaks:
1. **CHECKPOINT** current progress immediately
2. **DIAGNOSE** what actually went wrong
3. **RECOVER** using the patterns below
4. **CONTINUE** from where you were

---

## COMMON ERRORS & FIXES

### Tool Errors

#### "Parent directory does not exist"
```
Error: Parent directory does not exist: C:\...\NEW_FOLDER\file.js
```
**Fix:** Create the directory first
```javascript
Filesystem:create_directory({ path: "C:\\...\\NEW_FOLDER" })
// Then retry your write
```

#### "File not found"
```
Error: ENOENT: no such file or directory
```
**Fix:** Check the path
- Verify spelling (PRISM REBUILD vs PRISM-REBUILD)
- Check for extra/missing backslashes
- Use `Filesystem:list_directory` to verify parent exists

#### "Permission denied"
```
Error: EACCES: permission denied
```
**Fix:** 
- File might be open in another program
- Try closing editors/viewers
- Wait a moment and retry

#### "Search timeout"
```
Search taking too long or no results
```
**Fix:** 
- Use shorter search patterns
- Search smaller directories
- Check if path is correct
- Try `Desktop Commander:get_more_search_results` after starting

---

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

---

### Extraction Errors

#### Partial extraction (incomplete module)
**Symptoms:** Module cut off mid-function

**Fix:**
1. Don't delete what you have!
2. Find where extraction stopped
3. Search for module end:
```javascript
Desktop Commander:start_search({
  pattern: "const PRISM_NEXT_MODULE",  // Or end marker
  searchType: "content"
})
```
4. Extract remaining portion and append

#### Module not found in monolith
**Symptoms:** Search returns 0 results

**Fix:**
1. Try alternative patterns:
   - `PRISM_MODULE` vs `PRISM_MODULE_NAME`
   - `const PRISM_` vs `let PRISM_` vs `var PRISM_`
2. Check for typos in module name
3. Search for partial name: `PRISM_MATERIAL` instead of `PRISM_MATERIALS_MASTER`
4. Module might have different naming - check v7.0 documentation

#### Wrong module version extracted
**Symptoms:** Module exists at multiple locations

**Fix:**
1. Search for ALL occurrences
2. Usually want the LATEST version (highest line number)
3. Check version string in module: `version: '3.0.0'`
4. Compare to ensure you have newest

---

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

---

### Network/Connection Errors

#### Tool call timeout
**Fix:**
1. Wait a moment and retry
2. For long operations, increase timeout:
```javascript
Desktop Commander:start_process({ 
  command: "...", 
  timeout_ms: 60000  // 60 seconds
})
```

#### "Box" or external service unavailable
**Fix:**
1. Box is reference only - work continues locally
2. Note in session log that Box sync is pending
3. Continue with local files

---

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

---

## WHEN TO ASK USER

Ask the user for help when:
- ❓ File permissions won't resolve
- ❓ Path doesn't exist and you're not sure why
- ❓ Multiple conflicting module versions and unclear which to use
- ❓ State file is corrupted beyond recovery
- ❓ Error you haven't seen before

DON'T restart without asking when:
- ❌ You made a mistake (fix it instead)
- ❌ Tool failed once (retry first)
- ❌ Unsure what went wrong (diagnose first)

---

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

---

## EMERGENCY RECOVERY

### If Everything Seems Broken

1. **Breathe** - It's rarely as bad as it seems

2. **List the root directory:**
```javascript
Filesystem:list_directory({ 
  path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\" 
})
```

3. **Check what exists:**
   - CURRENT_STATE.json?
   - SESSION_LOGS folder?
   - EXTRACTED folder?

4. **Read last session log:**
```javascript
Filesystem:list_directory({ 
  path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\SESSION_LOGS\\" 
})
// Then read the most recent one
```

5. **Rebuild state from logs** if needed

6. **Ask user** if still stuck

---

## Remember

- **Errors are normal** - They happen during development
- **Most errors are recoverable** - Don't panic
- **Checkpoint frequently** - So recovery is easy
- **Don't restart unnecessarily** - Fix and continue
- **Log issues** - Helps future sessions
