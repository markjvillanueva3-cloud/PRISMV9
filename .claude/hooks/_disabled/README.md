# Disabled hooks — preserved on disk, unwired from settings.json

Per [[feedback_never_delete_only_disable]] and SESSIONSTART-HOOK-AUDIT-2026-05-19
Wave 4: when a hook is verified inactive (creds unset, MCP server absent, etc.),
move the `.mjs` file here and remove its entry from `H:/.claude/settings.json`.
Do NOT `git rm` — the source is preserved so it can be re-enabled in one move
when the dependency is configured.

## Inventory

### `linear-roadmap-sync.mjs` — disabled 2026-05-19 (slot:echo, U-WAVE4a)
- **Status when disabled:** Linear MCP server NOT present in any `.mcp.json`
  (only `prism-mcp-server` + `claude-flow` configured globally and at H:).
  `LINEAR_PROJECT="PRISM"` is set in `H:/.claude/settings.json` but unused
  because no Linear server backs it. Hook never injected anything to the chat
  even before disable — it emits legacy `{decision:"approve", reason:"..."}`
  shape, NOT `hookSpecificOutput.additionalContext`, so its "context" was
  always invisible to the conversation.
- **To re-enable:**
  1. Add a `linear` entry to `~/.claude/.mcp.json` `mcpServers`.
  2. Move file back: `git mv .claude/hooks/_disabled/linear-roadmap-sync.mjs .claude/hooks/`.
  3. Restore the two settings.json entries (one SessionStart, one Stop) — see
     this commit's diff for the exact JSON shape.
  4. **Before re-enabling, fix the JSON-output shape**: convert to
     `hookSpecificOutput.additionalContext` so the chat actually sees the
     Linear status. Current `decision/reason` output is a no-op for chat
     visibility.

### `supabase-state-sync.mjs` — disabled 2026-05-19 (slot:echo, U-WAVE4a)
- **Status when disabled:** `SUPABASE_PROJECT_URL=""` and
  `SUPABASE_ANON_KEY=""` in `H:/.claude/settings.json` (verified empty).
  Hook gates everything behind `isSupabaseConfigured()` which requires both
  env vars set. Identical no-op JSON-shape bug as Linear.
- **To re-enable:**
  1. Create Supabase project with tables `prism_state, prism_claims, prism_sessions`.
  2. Set `SUPABASE_PROJECT_URL` + `SUPABASE_ANON_KEY` in `H:/.claude/settings.json`.
  3. Move file back: `git mv .claude/hooks/_disabled/supabase-state-sync.mjs .claude/hooks/`.
  4. Restore the two settings.json entries (one SessionStart, one Stop).
  5. **Before re-enabling, fix the JSON-output shape** (same bug as Linear)
     AND implement the actual pull/push logic — the current code only reports
     "would sync" status; it never makes HTTP calls.

## How "disabled" works

The Claude harness reads `settings.json` for the hook chain and never scans
the filesystem to discover hooks. Removing an entry from `settings.json` and
leaving the `.mjs` file on disk is the canonical "off" state. The
`_disabled/` subdirectory makes the inventory of intentionally-inactive
hooks visible without git-archaeology, and the `_` prefix keeps it sorted
to the top of any `ls`.
