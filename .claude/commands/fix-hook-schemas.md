# /fix-hook-schemas — Audit and repair Claude Code hook-output schema bugs

Runs the two-stage hook audit-and-fix pipeline that keeps the `.claude/hooks/` and `.claude/helpers/` scripts emitting JSON that matches Claude Code's hook schema. Catches bugs that surface in the UI as `Hook JSON output validation failed — (root): Invalid input`.

## What it fixes

Six recurring bug patterns. Regex-based so it scales across the 150+ hooks.

| Pattern | Bug example | Fix |
|---------|-------------|-----|
| `hso_without_continue` | `JSON.stringify({ hookSpecificOutput: {...} })` | add `continue: true,` first |
| `object_literal_hso_without_continue` | `const out = { hookSpecificOutput: {...} }` | inject `continue: true,` |
| `top_level_additional_context` | `JSON.stringify({ additionalContext: "..." })` | wrap under `hookSpecificOutput` with detected event name |
| `inline_additional_context` | `{ continue: true, additionalContext: "..." }` | same wrap |
| `result_top_level` / `message_top_level` / `ok_top_level` | `JSON.stringify({ result: ... })` | rename to `systemMessage` |
| `inline_message_rename` / `inline_result_rename` / `inline_status_rename` | `{ continue: true, message: "..." }` | rename to `systemMessage` |
| `decision_message_rename` / `decision_result_rename` | `{ decision: 'approve', message: "..." }` | rename to `reason` (schema-legal with decision) |

## Steps

### 1. Validate (read-only, identifies bugs)

```bash
"H:/.claude/bin/portable-node" /h/prism/.claude/helpers/validate-hook-outputs.mjs
```

Spawns every hook registered in `~/.claude/settings.json` with sample stdin, validates stdout against Claude Code schema. Tolerates plain-text banners for `SessionStart` / `Stop` / `Notification` (the harness accepts those as success banners). Strict JSON for all other events. Prints `PASS: N / FAIL: M` + per-hook failure reason.

### 2. Auto-fix (idempotent, writes files)

```bash
# Dry-run first
"H:/.claude/bin/portable-node" /h/prism/.claude/helpers/fix-hook-schema.mjs --dry-run

# Execute
"H:/.claude/bin/portable-node" /h/prism/.claude/helpers/fix-hook-schema.mjs
```

Runs each regex pattern against every hook registered in settings.json. Writes changes in-place. Fully reversible via git.

### 3. Re-validate

Run step 1 again. Target is `FAIL: 0`.

### 4. Handle residual bugs manually

Some emits don't match any regex — typically hooks that emit raw state objects (`{invalidated: true, reason, count}`). For those, inspect the hook, identify the emit site, rewrap the payload as:

```js
process.stdout.write(JSON.stringify({
  continue: true,
  hookSpecificOutput: {
    hookEventName: "<event>",       // PreToolUse / PostToolUse / UserPromptSubmit / PreCompact
    additionalContext: "<summary>",
  },
}));
```

For Stop / SessionStart banners: plain text on stdout is tolerated by the harness, but prefer JSON `{continue:true, systemMessage:"..."}` for clarity.

## Legal top-level keys

Per Claude Code hook schema:
- `continue` (boolean) — required unless `decision` is present
- `decision` ("block" | "approve") — required for blocking hooks
- `reason` (string) — partner to `decision`
- `stopReason` (string)
- `systemMessage` (string) — displayed as a session banner
- `suppressOutput` (boolean)
- `hookSpecificOutput` (object with `hookEventName` + event-specific fields)

Anything else fails validation.

## Legal `hookEventName` values

`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SessionStart`, `PreCompact`, `Stop`, `SessionEnd`, `Notification`.

## When to run

- Any time you see `Hook JSON output validation failed` in the UI
- After adding a new hook — add it to settings.json, then run this command
- After bulk hook edits (refactors, renames)
- Before releasing: ensure `FAIL: 0` on a clean session

## Related

- `.claude/helpers/apply-hook-fixes.mjs` — short-circuits noisy advisory hooks (different concern: token economy, not schema correctness)
- `.claude/helpers/find-bare-node.mjs` — hunts for hooks that shell out to bare `node` (PATH-dependent)
