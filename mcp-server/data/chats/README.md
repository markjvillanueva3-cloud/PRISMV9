# PRISM Chat Storage System
## Simple, Persistent, Queryable

### Structure
```
C:\PRISM\mcp-server\data\chats\
├── sessions/
│   ├── session-29-2026-02-04.md    # Full session transcript
│   ├── session-30-2026-02-05.md
│   └── ...
├── summaries/
│   ├── session-29-summary.md        # Key decisions, outcomes
│   └── ...
└── index.json                       # Quick lookup of all sessions
```

### How It Works
1. **During Session**: Append key exchanges to session file
2. **End of Session**: Generate summary
3. **Start of Session**: Read recent summaries for context
4. **Mid-Session**: Query specific topics from history

### Token Efficiency
- Full transcript: ~10,000 tokens (expensive)
- Summary only: ~500 tokens (cheap)
- Specific query: ~200 tokens (very cheap)

### Tools Needed (use existing Desktop Commander)
- Write: `Desktop Commander:write_file` (append mode)
- Read: `Desktop Commander:read_file`
- Search: `Desktop Commander:start_search`

### Protocol
1. Every 5-10 exchanges → Save to session file
2. After major decision → Add to summary
3. Session start → Load last 3 summaries
4. When confused → Search chat history
