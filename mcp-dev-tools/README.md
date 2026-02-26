# MCP Dev Tools Server

**Tier 1 Game Changers for AI-Assisted Development**

## Quick Start

```bash
cd C:\PRISM\mcp-dev-tools
npm install --include=dev
npm run build
npm start  # or use via Claude Desktop
```

## Claude Desktop Configuration

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-dev-tools": {
      "command": "node",
      "args": ["C:/PRISM/mcp-dev-tools/dist/index.js"],
      "env": {
        "MCP_DEV_WORKING_DIR": "C:/PRISM"
      }
    }
  }
}
```

## Tools (18 Total)

### Background Tasks (5)
Run long processes without blocking conversation.

| Tool | Description |
|------|-------------|
| `task_spawn` | Start background process, returns task_id immediately |
| `task_status` | Get task status, output, exit code |
| `task_stream` | Stream incremental output (like tail -f) |
| `task_kill` | Terminate running task |
| `task_list` | List all tasks with filtering |

**Example:**
```
task_spawn(command="npm test", label="Unit Tests")
→ {task_id: "abc-123", status: "running"}

task_stream(task_id="abc-123", since_line=0)
→ {new_lines: ["PASS src/test.ts"], completed: false}
```

### Checkpoints (5)
Fearless experimentation with instant rollback.

| Tool | Description |
|------|-------------|
| `checkpoint_create` | Snapshot files + git state |
| `checkpoint_list` | List available checkpoints |
| `checkpoint_diff` | Compare current state to checkpoint |
| `checkpoint_restore` | Revert to checkpoint (dry_run supported) |
| `checkpoint_delete` | Remove old checkpoint |

**Example:**
```
checkpoint_create(label="before-refactor", paths=["src/"])
→ {checkpoint_id: "xyz-456", files_captured: 47, git_state: {branch: "main", dirty: true}}

checkpoint_restore(checkpoint_id="xyz-456", dry_run=true)
→ {restored_files: ["src/index.ts", ...], conflicts: []}
```

### Impact Analysis (3)
Know what breaks before editing.

| Tool | Description |
|------|-------------|
| `code_impact` | Analyze breaking risk, importers, test coverage |
| `impact_test_map` | Map tests covering a file/function |
| `impact_dependency_graph` | Build import/export dependency graph |

**Example:**
```
code_impact(file="src/core/engine.ts")
→ {
    direct_importers: [{file: "src/api.ts"}, ...],
    transitive_dependents: 23,
    breaking_risk: "high",
    risk_reasons: ["High number of direct importers (12)"],
    suggested_actions: ["Run tests: src/core/engine.test.ts"]
  }
```

### Semantic Search (3)
Find code by meaning, not just keywords.

| Tool | Description |
|------|-------------|
| `semantic_index_build` | Build/rebuild code index |
| `semantic_search` | Search by natural language query |
| `semantic_similar` | Find similar code snippets |

**Example:**
```
semantic_search(query="handle authentication tokens")
→ {results: [{file: "src/auth/jwt.ts", score: 0.87, summary: "Function validateToken"}]}

semantic_similar(file="src/utils/parse.ts", start_line=10, end_line=25)
→ {similar: [{file: "src/utils/format.ts", score: 0.72}]}
```

### Context Sync (4)
Track file changes during conversation.

| Tool | Description |
|------|-------------|
| `context_watch_start` | Start watching file paths |
| `context_watch_stop` | Stop watcher |
| `context_changes` | Get changes since timestamp |
| `context_snapshot` | Get current state of watched files |

**Example:**
```
context_watch_start(paths=["src/"], events=["create", "modify"])
→ {watcher_id: "w-123", watching: ["src/"]}

context_changes(watcher_id="w-123")
→ {events: [{type: "modify", path: "src/index.ts"}], context_stale: false}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_DEV_WORKING_DIR` | Current directory | Base path for operations |
| `MCP_DEV_CHECKPOINT_DIR` | `.mcp-checkpoints/` | Checkpoint storage |
| `MCP_DEV_MAX_CHECKPOINTS` | 50 | Max checkpoints to keep |
| `MCP_DEV_TASK_TIMEOUT` | 10 | Default task timeout (minutes) |

## Architecture

```
mcp-dev-tools/
├── src/
│   ├── index.ts          # Server entry, tool routing
│   ├── config.ts         # Configuration from env
│   ├── state.ts          # In-memory state management
│   └── tools/
│       ├── tasks.ts      # Background task orchestrator
│       ├── checkpoints.ts# Checkpoint & rollback
│       ├── context.ts    # File watching
│       ├── impact.ts     # Dependency analysis
│       └── semantic.ts   # Code search
├── dist/                 # Compiled JS
├── package.json
└── tsconfig.json
```

## Version

- **v1.0.0** - Tier 1 complete (18 tools)
- Stack: TypeScript, MCP SDK, chokidar, simple-git, execa

## License

MIT - Part of PRISM Manufacturing Intelligence
