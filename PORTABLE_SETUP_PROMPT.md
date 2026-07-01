# Portable PRISM Drive — First-Time Setup Prompt

Copy and paste the relevant prompt into Claude Code or Codex when setting up a new machine.

---

## Prompt for Claude Code (PowerShell terminal)

Paste this after running `cd H:\prism && claude`:

```
I just plugged in my portable PRISM drive (H: drive). This is a new machine that needs to be set up for portable development. Please do the following:

1. Run `python H:\prism\sync-sessions.py restore` to restore all my conversation history from the drive
2. Read H:\prism\CLAUDE.md to load the project context
3. Read H:\prism\state\shared\memory\MEMORY.md to load my persistent memory
4. Verify the hooks are working by checking H:\prism\.claude\settings.json exists and has helper paths pointing to H:\prism
5. Run `npx tsc --noEmit` in H:\prism\mcp-server to verify the TypeScript build works
6. Tell me if anything needs manual fixing (auth, Python path, npm install, etc.)

My workflow: I switch between 3 machines daily (this one, home desktop, laptop). The H: drive always has the latest code and chat history. Before unplugging, I run `python H:\prism\sync-sessions.py save`. After plugging in, I run the restore. All PRISM paths use H:\prism.

Set effort to max. Use auto permission mode.
```

---

## Prompt for Codex Desktop App

Paste this into a new Codex conversation:

```
I'm setting up my portable PRISM development drive on this machine. The project lives at H:\prism.

Please help me verify the setup:

1. Check that H:\prism\mcp-server\package.json exists and the project structure is intact
2. Run `python H:\prism\sync-sessions.py restore` to pull in my conversation history from the drive
3. Read H:\prism\CLAUDE.md for the full project context — this is a CNC manufacturing intelligence platform
4. Read H:\prism\state\shared\memory\MEMORY.md for my persistent preferences and project state
5. Check if H:\prism\mcp-server\node_modules exists — if not, run `cd H:\prism\mcp-server && npm ci`
6. Verify Python is available with `python --version`

Key context:
- PRISM = CNC manufacturing intelligence platform (1,302 engines, 79 dispatchers)
- I switch machines daily — the H: drive is my portable development environment
- All paths should reference H:\prism, never C:\PRISM
- Before I unplug: `python H:\prism\sync-sessions.py save`
- After I plug in: `python H:\prism\sync-sessions.py restore`
```

---

## Quick Reference Card

### Every time you sit down at a machine:
```powershell
# Plug in H: drive, then:
python H:\prism\sync-sessions.py restore
cd H:\prism
claude -c          # resume last conversation
# OR
claude --resume    # pick from session list
```

### Every time you're about to unplug:
```powershell
# In any terminal:
python H:\prism\sync-sessions.py save
# Then safely eject H: drive
```

### First time on a brand new PC:
```powershell
# 1. Install prerequisites: Node.js, Python 3.12+, Git, GitHub CLI
# 2. Run the automated setup:
H:\prism\setup-new-pc.bat
# 3. Authenticate:
claude login
gh auth login
# 4. Start working:
cd H:\prism && claude
```
