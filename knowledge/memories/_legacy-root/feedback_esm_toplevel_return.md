---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_esm_toplevel_return.md
source_filename: feedback_esm_toplevel_return.md
content_hash: 71325b87122ec30dcd1721eadb6bb8cc01dc50dad74cd0dc7e5acf8983f7493f
mirror_ts: 2026-05-05T13:00:09.435Z
mirror_engine: ObsidianMemorySyncEngine
---
In `.claude/hooks/*.mjs`, any `return` statement at module top level (outside a
function body) causes `SyntaxError: Illegal return statement` and the whole
hook fails to load. This is common when refactoring IIFEs or copy-pasting
function bodies.

**Why:** .mjs files are parsed as ES modules — top-level `return` is banned by
the spec. .js files in Claude Code's project may be CommonJS and tolerate it,
but every hook in this project is .mjs.

**How to apply:** If a helper like `deny()`/`warn()` already calls
`exit(0)` internally, drop the `return` keyword from callers. Either
`deny(...); exit(0);` or just `deny(...);` (since exit is imported from
"node:process" and never returns). If the hook needs early termination for
control flow, wrap the logic in `function main() { ... }` and call `main()`
at the bottom. Verify with `node -c path/to/hook.mjs` before wiring into
settings.json.
