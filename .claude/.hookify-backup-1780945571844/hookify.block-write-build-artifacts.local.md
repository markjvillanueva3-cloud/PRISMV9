# Hookify Rule: Block writing to build artifacts
type: block
event: PreToolUse
tool: Write,Edit

## Pattern
Blocks writing to dist/, build/, node_modules/, or minified/map files.

## Condition
file_path matches dist/|build/|node_modules/ OR file_path endsWith .min.js|.min.css|.map|.d.ts

## Message
TOKEN SAVE: Writing to build artifact or vendor directory. Edit the source files instead.
