# Claude/Codex Command Bridge

Generated: 2026-04-14T01:10:12.181Z

## Purpose

This is the canonical shared bridge for Claude and Codex command behavior inside PRISM.
It indexes file-backed slash-command specs plus hook-backed command pipelines so both agents can reference the same durable sources instead of relying on one-off prompts or memory.

## Coverage

- Global markdown command specs: 0
- Project markdown command specs: 141
- Hook pipeline entries indexed: 67
- Helper artifacts indexed: 138
- Virtual command pipelines: 1

## Canonical Sources

- Global commands: `C:\Users\Mark Villanueva\.claude\commands`
- Project commands: `H:\PRISM\.claude\commands`
- Hook config: `H:\PRISM\.claude\settings.json`
- Helper scripts: `H:\PRISM\.claude\helpers`
- Registry JSON: `H:\PRISM\state\shared\claude-codex-command-registry.json`

## Mirroring Rules

- Codex can mirror any command indexed as `execution_kind: markdown_macro` by reading the command spec file and following it as instructions.
- Codex can mirror any command indexed as `execution_kind: hook_pipeline` by following the underlying settings and helper scripts.
- Hidden Claude built-ins that are not exposed through command files, settings, or helpers are out of scope until they are surfaced in files.

## Key Shared Commands

- `/chat` → `H:\PRISM\.claude\commands\chat.md`
  Post a shared note that both Claude and Codex can see through the PRISM coordination surfaces.
- `/rgs-sync` → `H:\PRISM\.claude\commands\rgs-sync.md`
  Use this command when Claude or Codex needs to align on roadmap sequencing, execution gating, or the readiness to begin the next SVI-maximization roadmap pass.
- `/compact` → hook pipeline from `H:\PRISM\.claude\settings.json`
  Hook-backed compaction pipeline that snapshots critical state before compaction and restores recovery context on the next compact-aware session start.
- Use the registry JSON for the full command inventory, including repo command packs.

## `/compact` Pipeline

- SessionStart | matcher: `compact` → `node H:/prism/.claude/helpers/milestone-tracker.mjs sync-from-git 2>/dev/null || true`
- SessionStart | matcher: `compact` → `node H:/prism/.claude/helpers/compact-restore.mjs`
- Stop → `node H:/prism/.claude/helpers/compaction-survival.mjs`
- PreCompact → `node H:/prism/.claude/helpers/pre-compact.mjs`

Supporting artifacts:

## Reconnect Protocol

1. Read this bridge file.
2. Read `H:\PRISM\state\shared\claude-codex-command-registry.json` for the full inventory.
3. For markdown commands, open the indexed command spec and mirror it directly.
4. For hook pipelines, follow the indexed settings hooks and helper scripts.
5. If a command is missing from the registry, treat it as a potential built-in and verify before mirroring it.

## Refresh Procedure

Run:

```powershell
node "H:\PRISM\scripts\index\build-command-bridge.mjs"
```

Re-read both outputs after any command, settings, or helper change.

## Limitations

- The registry covers only command behavior exposed through markdown files, project settings, or helper scripts.
- Codex can mirror behavior from these sources, but cannot invoke Claude's private slash-command runtime directly.
- Repo command-pack members may not have a guaranteed one-to-one slash alias; use their relative command key and file path as the canonical reference.
- Refresh this registry after any command, settings, or helper change.

