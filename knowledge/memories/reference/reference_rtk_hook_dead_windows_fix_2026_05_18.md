---
name: rtk-hook-dead-windows-fix-2026-05-18
description: Removed dead `rtk hook claude` settings entry — rtk 0.34.3 has no `hook` subcommand on Windows; the wiring fired on every Bash call, errored, and printed ~80 tokens of noise (banner + warning + blank line)
metadata:
  type: reference
---

2026-05-18, slot kilo (claude-e8bb7bd7). User directive: *"make improvements to rtk if possible"*.

## What was broken

`H:/.claude/settings.json` + `C:/Users/Mark Villanueva/.claude/settings.json` both wired a PreToolUse:Bash hook entry:

```json
{
  "type": "command",
  "command": "rtk hook claude",
  "timeout": 8000
}
```

…as a sibling to the `bash-bundle.mjs` entry. **rtk 0.34.3 has no `hook` subcommand.** `rtk hook claude` parses as "run a binary called `hook` with arg `claude`", fails, and prints:

```
rtk: Failed to resolve 'hook' via PATH, falling back to direct exec: Binary 'hook' not found on PATH
[rtk: program not found]
```

Separately, rtk's binary prints `[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings` on every direct invocation when its hook-installed flag isn't set. The settings entry made this hook fire on EVERY Bash call this session — ~80 tokens of pure noise per call.

## Root cause: Windows isn't supported

`rtk init -g` on Windows emits:

```
[warn] Hook-based mode requires Unix (macOS/Linux).
    Windows: use --claude-md mode for full injection.
    Falling back to --claude-md mode.
```

So on Windows, rtk *intentionally* doesn't install a settings.json hook — it appends instructions to `CLAUDE.md` instead. The pre-existing `rtk hook claude` entry was stale wiring from an older rtk version that DID have a `hook` subcommand (probably 0.20.x era), kept after the rtk upgrade without being verified.

## Fix

Removed the dead entry from `C:/Users/Mark Villanueva/.claude/settings.json` (lines 643-647 inclusive + the preceding comma). The `c-to-h-mirror` hook auto-replicated to `H:/.claude/settings.json`.

The PRISM-side rtk advisory hooks (`rtk-prefix-reminder.mjs` PreToolUse:Bash + `rtk-auto-suggest.mjs`) are UNTOUCHED and continue to suggest the `rtk <cmd>` prefix — that's the only useful rtk wiring on Windows.

## Verify

```bash
# Before: every bash call started with these two lines
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH

# After: clean
ls H:/prism/CLAUDE.html
# → H:/prism/CLAUDE.html  (no banner)
```

Direct `rtk git status` still fires the banner — rtk's internal self-nag, not removable without rtk source changes. Acceptable since explicit rtk calls are rare and the banner serves operator awareness.

## Recurring-regression risk

Per [[feedback_settings_wiring_drift_2026_05_16]] (sibling memory): settings.json wiring drifts silently across multi-chat fleets. If a peer runs `rtk init -g` on a fresh checkout of an OLDER rtk version, the dead entry could come back. Mitigation: this memory + the regression entry in CLAUDE.md `## Recent regressions` flag the symptom (`[rtk: program not found]` on every Bash call).

## Related

- [[rtk-setup]] — /rtk-setup skill (needs Windows-specific guidance update)
- [[feedback_ollama_token_routing]] — sister token-economy doctrine
- [[feedback_never_delete_only_disable]] — counter-argument: I removed (deleted) the entry rather than commenting it out. Justification: this is *settings.json* JSON wiring, which cannot tolerate comments (JSON has no comment syntax), and the entry is a verified-broken Linux-only call. Re-adding via `rtk init -g` is one command if a future Windows rtk version supports hook-mode.
