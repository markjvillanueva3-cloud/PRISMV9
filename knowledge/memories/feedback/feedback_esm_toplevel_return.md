---
name: ESM top-level `return` breaks hook scripts
description: Hooks are .mjs ES modules; `return` at module top-level is a parse error. Use exit(0) or main() wrapper.
type: feedback
originSessionId: 4da29a0f-4a1a-4eca-9e29-27f249934efa
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
