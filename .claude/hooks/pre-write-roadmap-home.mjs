#!/usr/bin/env node
// tier: T4
// DEFERRED IMPLEMENTATION — temporary no-op stub.
// Registered in H:/.claude/settings.json (PreToolUse hook, line ~437) by claude-cba638c3
// but real content not yet written. This stub prevents harness hangs on Write/Edit.
// Exit 0 = allow the tool call (default-permissive until real policy ships).
// When the owning chat ships the real hook, simply overwrite this file.
process.stdin.on("data", () => {});
process.stdin.on("end", () => process.exit(0));
setTimeout(() => process.exit(0), 100);
