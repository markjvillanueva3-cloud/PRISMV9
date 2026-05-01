# Hookify Rule: Warn on recursive glob without extension filter
type: warn
event: PreToolUse
tool: Glob

## Pattern
Warns when glob uses ** recursion without file extension filter.

## Condition
pattern is "**/*" without extension (no ".ts", ".js", ".md" etc in pattern) AND no path restriction

## Message
TOKEN SAVE: Recursive glob without extension filter matches all files. Add an extension like **/*.ts or restrict the path.
