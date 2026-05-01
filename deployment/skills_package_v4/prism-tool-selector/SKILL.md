---
name: prism-tool-selector
description: |
  Instant tool selection for PRISM development. Eliminates "which tool do I use?" confusion. Decision trees for every common task type. READ THIS WHEN UNSURE WHICH TOOL TO USE - don't pivot mid-task to figure it out.
---

# PRISM Tool Selector

## 🔴 INSTANT DECISION TREES

### Reading Files

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

---

## TOOL QUICK REFERENCE

### Filesystem:* Tools (User's C: drive - PERSISTENT)

| Tool | Use For | Example |
|------|---------|---------|
| `read_file` | Read any text file | `path: "C:\\...\\CURRENT_STATE.json"` |
| `write_file` | Write/create files | `path: "C:\\...\\file.js", content: "..."` |
| `list_directory` | Directory contents | `path: "C:\\..."` |
| `search_files` | Find files by pattern | `path: "C:\\...", pattern: "*.js"` |
| `create_directory` | Make new folder | `path: "C:\\...\\NEW_FOLDER"` |
| `move_file` | Move/rename | `source: "...", destination: "..."` |
| `directory_tree` | Recursive listing | `path: "C:\\..."` |

### Desktop Commander:* Tools (Advanced Operations)

| Tool | Use For | Example |
|------|---------|---------|
| `read_file` | Large files with pagination | `offset: 5000, length: 500` |
| `write_file` | Write with append mode | `mode: "append"` |
| `start_search` | Powerful file/content search | `searchType: "content"` |
| `edit_block` | In-place file editing | `old_string: "...", new_string: "..."` |
| `start_process` | Run commands/scripts | `command: "python ...", timeout_ms: 30000` |
| `get_file_info` | File metadata | Size, dates, permissions |

### Container Tools (TEMPORARY - resets each session)

| Tool | Use For | Example |
|------|---------|---------|
| `view` | Read skills, project files | `path: "/mnt/skills/user/..."` |
| `bash_tool` | Run shell commands | `command: "python3 script.py"` |
| `create_file` | Create user artifacts | `path: "/mnt/user-data/outputs/..."` |
| `present_files` | Show files to user | `filepaths: ["/mnt/.../file.md"]` |

---

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

---

## ⚠️ COMMON MISTAKES

### WRONG: Using container tools for PRISM work
```javascript
// ❌ WRONG - will be lost!
create_file({ path: "/home/claude/module.js", ... })
bash_tool({ command: "echo 'data' > /home/claude/file.js" })

// ✅ CORRECT - persistent
Filesystem:write_file({ path: "C:\\PRISM REBUILD...\\module.js", ... })
```

### WRONG: Using view for user's files
```javascript
// ❌ WRONG - view is for container
view({ path: "C:\\PRISM REBUILD...\\file.js" })

// ✅ CORRECT
Filesystem:read_file({ path: "C:\\PRISM REBUILD...\\file.js" })
```

### WRONG: Not using offset/length for large files
```javascript
// ❌ WRONG - may timeout or truncate
Filesystem:read_file({ path: "...monolith.html" }) // 986K lines!

// ✅ CORRECT
Desktop Commander:read_file({ 
  path: "...monolith.html", 
  offset: 136000, 
  length: 2000 
})
```

---

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
