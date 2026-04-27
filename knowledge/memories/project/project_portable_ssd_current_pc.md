---
name: Portable SSD Current PC State
description: Setup state of the new PC connected via portable SSD (H:\) as of 2026-03-30
type: project
source: prism-memory
synced: 2026-04-27T00:20:43.157Z
aliases: project_portable_ssd_current_pc
---


## New PC Setup — 2026-03-30

**SSD mounted as:** H:\
**Home:** C:\Users\Mark Villanueva
**C:\PRISM:** Synced from SSD, build:fast passes

### Installed
- Node.js v24.13.0
- Git 2.52.0
- GitHub CLI 2.67.0 (authenticated)
- Claude Code 2.1.87 (authenticated, Max sub)
- npm globals (claude, claude-flow)
- mcp-server node_modules + dist (build passes)
- web node_modules installed

### Still Missing
- Python 3.12 (needed for cad-engine + cad-converter MCP)
- Tesseract OCR (needed for blueprint-read)
- ffmpeg (needed for video processing)
- No package manager (winget/choco/scoop) available

**Why:** User migrating to more powerful PCs for dev work.
**How to apply:** When cad-engine or OCR features are needed, remind about missing Python/Tesseract.


## Related
[[skills/choco|/choco]] • [[skills/scoop|/scoop]]