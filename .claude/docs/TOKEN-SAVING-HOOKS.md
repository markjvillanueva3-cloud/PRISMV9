# Token-Saving Hook Infrastructure

## Active Hooks (63 total, 18 token-optimized)

### PreToolUse Hooks

| Hook | Matcher | Purpose | Est. Savings |
|------|---------|---------|--------------|
| `read-optimizer.mjs` | Read | Index surface hints, large file warnings | 5-15% per read |
| `read-once-cache.mjs` | Read | Blocks re-reads of unchanged files | 100% on duplicates |
| `search-optimizer.mjs` | Glob\|Grep | Reference-first + duplicate detection (60s cache) | 20-40% per search + 100% on duplicates |
| `rtk-reminder.mjs` | Bash | Suggests RTK prefix for verbose commands | 30-90% on rtk-supported commands |

### PostToolUse Hooks

| Hook | Matcher | Purpose | Est. Savings |
|------|---------|---------|--------------|
| `posttooluse-compressor.mjs` | Bash\|Read | Large output warnings, summarization hints | 10-30% guidance |
| `dsl-output-compressor.mjs` | Bash\|Read | DSL abbreviation compression (353 terms) | 5-15% on PRISM terms |
| `loop-detector.mjs` | Bash\|Read | Warns on 3+ identical consecutive calls | Prevents 500-2000 token loops |
| `tsc-error-dedup.mjs` | Bash\|Read | Condenses TSC output to top error codes | 80-90% on TSC failures |
| `context-pressure-tracker.mjs` | Bash\|Read | Warns when context pressure is high | Prevents context overflow |
| `git-output-condenser.mjs` | Bash\|Read | Condenses git status/log/diff output | 30-50% on git commands |
| `vitest-output-condenser.mjs` | Bash\|Read | Condenses test output to failures only | 90%+ on test suites |
| `npm-output-condenser.mjs` | Bash\|Read | Condenses npm/pnpm install output | 70-90% on package installs |
| `path-shortener.mjs` | Bash\|Read | Compresses H:\prism\... paths | 5-15% on path-heavy output |
| `read-once-cache.mjs` (post) | Read | Records file mtime for duplicate detection | Enables 100% duplicate blocking |
| `write-success-compressor.mjs` | Edit\|Write | Condenses file operation confirmations | 20-40% on write success messages |

### UserPromptSubmit Hooks

| Hook | Purpose | Est. Savings |
|------|---------|--------------|
| `shortcode-injector.mjs` | Expands DSL shortcodes in user prompts | 10-20% on PRISM references |

## How They Work

### Read-Once Cache (`read-once-cache.mjs`)
- **PreToolUse**: Checks if file was read before AND hasn't changed
- **PostToolUse**: Records file path + mtime after successful read
- **Exempt files**: HANDOFF.md, CURRENT_POSITION.md, settings.json, etc.
- **Cache limit**: 200 files max (LRU eviction)

### Search Optimizer (`search-optimizer.mjs`)
- Injects reference-first protocol on first broad search
- Provides pattern-specific hints (e.g., "READ ENGINE_DIGEST.md")
- 4-hour session TTL for injection flag
- Saves 10K+ tokens vs repo-wide searches

### Loop Detector (`loop-detector.mjs`)
- Tracks last 20 tool calls with MD5 fingerprints
- Warns after 3+ identical consecutive calls
- Prevents wasteful retry loops

### TSC Error Dedup (`tsc-error-dedup.mjs`)
- Groups errors by TS error code
- Shows top 5 codes with counts and file counts
- Condenses 5000+ char output to ~200 chars

### DSL Compressor (`dsl-output-compressor.mjs`)
- 65 manufacturing term abbreviations (Vc, SS, MIL, etc.)
- Only compresses outputs > 2000 chars
- Shows legend reference for decompression

### Git Output Condenser (`git-output-condenser.mjs`)
- Parses git status/log/diff/show output
- Status: extracts S/M/? prefix + filenames only
- Log: compact hash + subject format (first 10 commits)
- Diff: file summary with +/-line counts
- Triggers on >500 char git output

### Vitest Output Condenser (`vitest-output-condenser.mjs`)
- Detects vitest/jest/npm test commands
- All passed: single-line summary with count + duration
- Failures: shows count + first 5 failure messages
- Triggers on >1000 char test output

### Shortcode Injector (`shortcode-injector.mjs`)
- Expands DSL shortcodes like `E####`, `D##`, `A##` in prompts
- Resolves via codeSystemIndexEngine for full paths
- Reduces user typing and ensures accurate references

### RTK Reminder (`rtk-reminder.mjs`)
- Detects commands that benefit from RTK prefix (git, npm, vitest, tsc, gh, docker, etc.)
- Suggests `rtk <command>` for 30-90% token savings
- Non-blocking hint, doesn't prevent command execution

### npm Output Condenser (`npm-output-condenser.mjs`)
- Detects npm/pnpm/yarn install/add/ci commands
- Extracts: packages added/removed/changed, duration, warnings, errors
- Shows compact summary: `PKG INSTALL: +150, -2, ~5 in 12.5s`
- Triggers on >500 char output

### Path Shortener (`path-shortener.mjs`)
- Compresses PRISM paths: `H:\prism\mcp-server\src\` → `src/`
- Handles Windows and Unix-style paths
- Triggers on >200 char output with PRISM paths
- Only applies when savings exceed 5%

### Write Success Compressor (`write-success-compressor.mjs`)
- Condenses verbose file operation confirmations
- `"The file X has been updated successfully..."` → `✓ src/X updated`
- Shortens file paths using same rules as path-shortener

## Token Savings Projection

| Category | Without Hooks | With Hooks | Savings |
|----------|---------------|------------|---------|
| Duplicate file reads | 0% blocked | 100% blocked | ~2000 tokens/session |
| Duplicate searches | 0% blocked | 100% blocked (60s) | ~1500 tokens/session |
| Search waste | Repo-wide scans | Digest-first | ~3000 tokens/session |
| RTK suggestions | No reminders | Auto-suggest on verbose cmds | ~2000 tokens/session |
| TSC failure output | Raw 5K chars | Condensed 200 chars | ~1500 tokens/build fail |
| Test output | Raw 10K+ chars | Summary only | ~2500 tokens/test run |
| npm/pnpm output | Raw 2K+ chars | Compact summary | ~800 tokens/install |
| Git output | Raw 2K+ chars | Compact format | ~500 tokens/git command |
| Path compression | Full paths | Relative paths | ~300 tokens/path-heavy output |
| Write confirmations | Verbose messages | Terse confirmations | ~200 tokens/edit |
| Loop detection | Unchecked | Warned at 3x | ~1000 tokens/avoided |
| Large output | Raw dump | Compression hints | ~500 tokens/large read |

**Total: 12,000-20,000 tokens saved per session**

## Configuration

All hooks in `H:/.claude/settings.json` under:
- `hooks.PreToolUse[Read]` - read optimizer + read-once
- `hooks.PreToolUse[Glob|Grep]` - search optimizer
- `hooks.PostToolUse[Bash|Read]` - compressors + loop detector + tsc-dedup
- `hooks.PostToolUse[Read]` - read-once post-record

## Helper Utilities

Additional utilities in `H:/prism/.claude/helpers/`:

| Helper | Purpose |
|--------|---------|
| `hook-cache.mjs` | Shared cache directory utilities |
| `context-economy-v2.mjs` | Task-aware budget tracking |
| `token-savings-report.mjs` | CLI report generator |
| `output-compression-guide.mjs` | Compression guidance |

## Process Cleanup Hooks

| Hook | Type | Trigger | Purpose |
|------|------|---------|---------|
| `agent-pid-tracker.mjs` | PostToolUse Agent | Every agent spawn | Tracks PIDs for cleanup |
| `node-orphan-cleaner.mjs` | Stop | Session end | Kills orphan Node processes |

### How Orphan Cleanup Works
1. **agent-pid-tracker** records PIDs of spawned agent processes in state file
2. **node-orphan-cleaner** runs on session Stop:
   - Kills all tracked PIDs that are still running
   - Finds PRISM/Claude-related node processes older than 5 minutes
   - Uses `wmic` to get process details, `taskkill` to terminate
   - State file: `state/shared/node-orphan-cleaner.state.json`

### Safety Guards
- Never kills current session or parent process
- Skips legitimate long-running processes (MCP server, Ollama, daemons)
- Only targets processes with PRISM/Claude patterns in command line
- 5-minute age threshold prevents killing fresh processes

## Maintenance

- Cache files in: `H:/prism/.claude/cache/`
- Read-once registry: `read-once-registry.json`
- Search cache: `search-cache.json` (60s TTL, max 50 entries)
- Tool history: `tool-history` (plain text)
- Ref-first flag: `ref-first-injected.flag`

Run `node H:/prism/.claude/helpers/token-savings-report.mjs` for live stats.
