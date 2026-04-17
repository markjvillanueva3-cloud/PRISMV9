# Framework Auto-Memory Mirror

**Purpose:** Flat mirror of Claude Code's framework auto-memory from
`C:\Users\<user>\.claude\projects\H--prism\memory\`. Memory files are
written by the framework when user/feedback/project/reference facts are
learned. This mirror gives a portable snapshot for cross-PC work.

## Related

- Full user-scope backup (incl. this dir as a subtree):
  `state/shared/claude-user-mirror/projects/H--prism/memory/`
- Claude Desktop config: `state/shared/claude-desktop-mirror/`

## Restoring to another PC

```bash
cp -r /h/prism/state/shared/memory-mirror/*.md \
      /c/Users/<user>/.claude/projects/H--prism/memory/
```

On Windows PowerShell:
```powershell
robocopy 'H:\prism\state\shared\memory-mirror' `
         "$env:USERPROFILE\.claude\projects\H--prism\memory" `
         *.md /XO
```

## Refreshing from current C-drive state

```bash
cp /c/Users/<user>/.claude/projects/H--prism/memory/*.md \
   /h/prism/state/shared/memory-mirror/
```

## When to refresh

Framework auto-writes to the C-drive path on each PC during sessions. Refresh
this mirror:
- Before closing a session where new memories were learned
- During handoff to another PC
- When `MEMORY.md` gets a new entry pointer
