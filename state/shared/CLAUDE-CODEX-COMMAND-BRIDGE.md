# Claude/Codex Command Bridge

Generated: 2026-05-12T16:37:56.069Z

## Purpose

This is the canonical shared bridge for Claude and Codex command behavior inside PRISM.
It indexes file-backed slash-command specs plus hook-backed command pipelines so both agents can reference the same durable sources instead of relying on one-off prompts or memory.

## Coverage

- Global markdown command specs: 391
- Project markdown command specs: 252
- Hook pipeline entries indexed: 147
- Helper artifacts indexed: 310
- Virtual command pipelines: 0

## Canonical Sources

- Global commands: `C:\Users\Mark Villanueva\.claude\commands`
- Project commands: `H:\prism\.claude\commands`
- Hook config: `H:\prism\.claude\settings.json`
- Helper scripts: `H:\prism\.claude\helpers`
- Registry JSON: `H:\prism\state\shared\claude-codex-command-registry.json`

## Mirroring Rules

- Codex can mirror any command indexed as `execution_kind: markdown_macro` by reading the command spec file and following it as instructions.
- Codex can mirror any command indexed as `execution_kind: hook_pipeline` by following the underlying settings and helper scripts.
- Hidden Claude built-ins that are not exposed through command files, settings, or helpers are out of scope until they are surfaced in files.

## Key Shared Commands

- `/startup` → `C:\Users\Mark Villanueva\.claude\commands\startup.md`
  You are initializing a PRISM development session. Run through this checklist to establish context, detect issues, and present the work surface. Execute all steps — do not ask questions until the summary is ready.
- `/chat` → `H:\prism\.claude\commands\chat.md`
  Post a shared note that both Claude and Codex can see through the PRISM coordination surfaces.
- `/rgs-sync` → `H:\prism\.claude\commands\rgs-sync.md`
  Use this command when Claude or Codex needs to align on roadmap sequencing, execution gating, or the readiness to begin the next SVI-maximization roadmap pass.
- Use the registry JSON for the full command inventory, including repo command packs.

## Reconnect Protocol

1. Read this bridge file.
2. Read `H:\prism\state\shared\claude-codex-command-registry.json` for the full inventory.
3. For markdown commands, open the indexed command spec and mirror it directly.
4. For hook pipelines, follow the indexed settings hooks and helper scripts.
5. If a command is missing from the registry, treat it as a potential built-in and verify before mirroring it.

## Refresh Procedure

Run:

```powershell
node "H:\prism\scripts\index\build-command-bridge.mjs"
```

Re-read both outputs after any command, settings, or helper change.

## Limitations

- The registry covers only command behavior exposed through markdown files, project settings, or helper scripts.
- Codex can mirror behavior from these sources, but cannot invoke Claude's private slash-command runtime directly.
- Repo command-pack members may not have a guaranteed one-to-one slash alias; use their relative command key and file path as the canonical reference.
- Refresh this registry after any command, settings, or helper change.

