---
name: prism-tool-selector
description: |
  Tool selection decision trees. MCP vs filesystem vs embedded.
---

```
Is file on User's C: drive?
├── YES → Filesystem:read_file
│         path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\..."
│
├── Is it large (>10K lines)?
│   └── YES → Desktop Commander:read_file with offset/length
│             path: "C:\\...", offset: 0, length: 1000
│
└── Is file in Claude's container (/mnt/, /home/)?
    └── YES → view (but DON'T save work here!)
```

### Writing Files

```
Where should output go?
├── PRISM work (persistent) → Filesystem:write_file
│   path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\..."
│
├── Temporary processing → Container (bash_tool/create_file)
│   ⚠️ WILL BE LOST - only for intermediate steps
│
└── User artifact to show → create_file + present_files
    path: "/mnt/user-data/outputs/..."
```

### Listing/Searching

```
What do you need?
├── List directory contents → Filesystem:list_directory
│   path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\..."
│
├── Search for files by name → Desktop Commander:start_search
│   searchType: "files", pattern: "PRISM_MATERIALS*"
│
├── Search file CONTENTS → Desktop Commander:start_search
│   searchType: "content", pattern: "function calculate"
│
└── Deep recursive listing → Filesystem:directory_tree
```

### Large File Operations (Monolith)

```
Working with 986,621-line monolith?
├── Find module location → Desktop Commander:start_search
│   searchType: "content", pattern: "const PRISM_MODULE_NAME"
│
├── Extract specific lines → Desktop Commander:read_file
│   offset: [start_line], length: [num_lines]
│
├── Process entire file → Python script via Desktop Commander:start_process
│   command: "python scripts/process.py", timeout_ms: 60000
│
└── Quick preview → Filesystem:read_file with head parameter
    head: 100 (first 100 lines only)
```

### Batch Operations

```
Multiple files to process?
├── <10 files, simple ops → Loop with Filesystem tools
│
├── >10 files OR complex → Python script
│   Desktop Commander:start_process
│   command: "python scripts/batch_op.py --dir C:\\..."
│
└── Parallel extraction → Use prism-swarm-orchestrator
```

## COMMON TASK → TOOL MAPPING

| Task | Tool(s) | Notes |
|------|---------|-------|
| Read CURRENT_STATE.json | `Filesystem:read_file` | Always first! |
| Write CURRENT_STATE.json | `Filesystem:write_file` | Frequent updates |
| List EXTRACTED folder | `Filesystem:list_directory` | Check progress |
| Find module in monolith | `Desktop Commander:start_search` | searchType: "content" |
| Extract module lines | `Desktop Commander:read_file` | Use offset/length |
| Write extracted module | `Filesystem:write_file` | To EXTRACTED folder |
| Run Python script | `Desktop Commander:start_process` | timeout_ms important |
| Read a skill | `view` | Container path /mnt/skills/... |
| Search for files | `Desktop Commander:start_search` | searchType: "files" |
| Edit file in place | `Desktop Commander:edit_block` | For small changes |

## DECISION FLOWCHART

```
START: What am I trying to do?
│
├─► READ something
│   ├─► User's C: drive? → Filesystem:read_file
│   ├─► Large file? → Desktop Commander:read_file + offset
│   └─► Container/skill? → view
│
├─► WRITE something
│   ├─► PRISM work? → Filesystem:write_file to C:\
│   ├─► User artifact? → create_file + present_files
│   └─► Temp file? → Container (but know it disappears!)
│
├─► FIND something
│   ├─► Find files? → Desktop Commander:start_search (files)
│   ├─► Find content? → Desktop Commander:start_search (content)
│   └─► List folder? → Filesystem:list_directory
│
├─► PROCESS something
│   ├─► Simple loop? → Multiple Filesystem calls
│   └─► Complex/batch? → Python via Desktop Commander:start_process
│
└─► EDIT something
    ├─► Small change? → Desktop Commander:edit_block
    └─► Full rewrite? → Filesystem:write_file
```

---

## Remember

1. **CURRENT_STATE.json** → Always `Filesystem:read_file` / `Filesystem:write_file`
2. **Skills** → Always `view` (they're in /mnt/skills/)
3. **PRISM output** → Always `Filesystem:write_file` to C:\
4. **Large files** → Always `Desktop Commander:read_file` with offset/length
5. **Search** → Always `Desktop Commander:start_search`
