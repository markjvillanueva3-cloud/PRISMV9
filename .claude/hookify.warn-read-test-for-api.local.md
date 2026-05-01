# Hookify Rule: Warn on reading test files to understand engine API
type: warn
event: PreToolUse
tool: Read

## Pattern
Warns when reading a test file — use contextDigestEngine or find_symbol for API understanding.

## Condition
file_path contains "__tests__/" AND file_path endsWith ".test.ts"

## Message
TOKEN SAVE: Reading test files to understand API? Use contextDigestEngine.digestFile() or Grep for specific method signatures. Tests are verbose and cost 2-5K tokens.
