# CTX-GSD-SYNC: GSD_CORE Synchronization Hooks
# Keeps GSD documentation in sync with MCP capabilities

---

## CTX-GSD-SYNC-001: Pre-MCP-Change Detection

**Trigger Conditions:**
- About to modify prism_mcp_server.py
- About to modify any *_mcp.py file
- About to add new MCP tools

**Actions:**
1. Snapshot current tool count
2. Record pre-change state
3. Set flag for post-change sync

**Implementation:**
```python
# Before MCP modification
sync = GSDSync()
pre_state = sync.scanner.scan_all()
print(f"Pre-change: {len(pre_state)} tools")
```

---

## CTX-GSD-SYNC-002: Post-MCP-Change Sync

**Trigger Conditions:**
- MCP server file modified
- New MCP tools added
- MCP tools removed or renamed

**Actions:**
1. Scan all MCP files for tool definitions
2. Compare with GSD_CORE documented count
3. Update GSD_CORE if different
4. Log changes to sync state

**Implementation:**
```bash
# After MCP modification
python C:\PRISM\scripts\core\gsd_sync.py --post-mcp
```

**Auto-Trigger:**
Add to session end or after any MCP tool creation:
```python
import subprocess
subprocess.run(["python", "C:/PRISM/scripts/core/gsd_sync.py", "--post-mcp"])
```

---

## CTX-GSD-SYNC-003: Session Start Verification

**Trigger Conditions:**
- New session starts
- After reading ROADMAP_TRACKER.json and CURRENT_STATE.json

**Actions:**
1. Run sync in check mode (no apply)
2. If out of sync, warn and offer to fix
3. Log last sync time

**Implementation:**
```bash
# During session init
python C:\PRISM\scripts\core\gsd_sync.py --pre-commit
```

---

## Integration Points

### 1. With gsd_startup.py
Add to session initialization:
```python
# In gsd_startup.py
def verify_gsd_sync():
    result = subprocess.run(
        ["python", "C:/PRISM/scripts/core/gsd_sync.py", "--json"],
        capture_output=True, text=True
    )
    sync_status = json.loads(result.stdout)
    if sync_status["changes_needed"]:
        print(f"⚠️ GSD out of sync: {sync_status['gsd_tools']} vs {sync_status['mcp_tools']}")
```

### 2. With MCP Server Modifications
Add to end of any script that modifies MCP:
```python
# Auto-sync after MCP changes
os.system("python C:/PRISM/scripts/core/gsd_sync.py --post-mcp")
```

### 3. Pre-Commit Hook (optional)
```bash
# .git/hooks/pre-commit
python C:/PRISM/scripts/core/gsd_sync.py --pre-commit
```

---

## Sync State File

Location: `C:\PRISM\state\gsd_sync_state.json`

Structure:
```json
{
  "last_sync": "2026-02-01T20:30:00Z",
  "file_hashes": {
    "prism_mcp_server.py": "abc123...",
    "recovery_mcp.py": "def456..."
  },
  "tool_count": 57,
  "tools_by_category": {
    "recovery": 3,
    "state": 11,
    "orchestration": 14,
    "data_query": 9,
    "physics": 12,
    "validation": 8
  }
}
```

---

## CLI Reference

```bash
# Check sync status
python gsd_sync.py

# Apply changes
python gsd_sync.py --apply

# JSON output
python gsd_sync.py --json

# Watch mode (continuous)
python gsd_sync.py --watch

# Pre-commit check (exits with error if out of sync)
python gsd_sync.py --pre-commit

# Post-MCP change (always applies)
python gsd_sync.py --post-mcp
```

---

**Version:** 1.0.0
**Created:** 2026-02-01
**Hook IDs:** CTX-GSD-SYNC-001, CTX-GSD-SYNC-002, CTX-GSD-SYNC-003
