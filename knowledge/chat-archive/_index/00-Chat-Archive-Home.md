---
type: chat-archive-home
tags: [chat-archive, MOC, index]
updated: 2026-06-25T21:18:59
---

# 🗂️ Chat Archive — Permanent Memory

> Unified, permanent archive of every Claude Code CLI, Codex, and Claude Desktop session, ingested into this vault. Generated 2026-06-25T21:18:59.

## Totals

| Source | Sessions | Messages |
|---|---:|---:|
| [[MOC-claude-code-cli]] | 14948 | 1257702 |
| [[MOC-claude-desktop]] | 49 | 49 |
| [[MOC-codex]] | 675 | 756372 |
| **TOTAL** | **15672** | **2014123** |

## Maps of Content

- [[MOC-claude-code-cli]]
- [[MOC-codex]]
- [[MOC-claude-desktop]]
- [[Plans-and-Roadmaps]]
- [[Timeline]]

## All sessions (Dataview)

```dataview
TABLE source, date, messages, cwd
FROM "chat-archive"
WHERE type = "chat-session"
SORT date DESC
LIMIT 200
```

_Requires the Dataview plugin. The table above is live; the counts above are a snapshot._
