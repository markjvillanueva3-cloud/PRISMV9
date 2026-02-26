# PRISM TRACKING PROTOCOL v2.0
## MANDATORY RULES FOR EVERY RESPONSE

---

## 🚨 START OF EVERY RESPONSE
```
1. Read C:\PRISM\state\ACTION_TRACKER.md
2. Read latest chat summary: C:\PRISM\mcp-server\data\chats\summaries\
3. Check: What did I ALREADY do?
4. Ask: What's the NEXT logical step?
```

## 🔧 AFTER EVERY TOOL CALL
```
1. Update ACTION_TRACKER.md "LAST 5 ACTIONS" table
2. Move oldest action out (keep only 5)
3. Add new action with result summary
```

## ⏰ EVERY 5 TOOL CALLS
```
1. Call prism_todo_update
2. Update progress percentage
3. Mark completed steps
```

## 🛑 BEFORE RUNNING ANY TOOL
```
1. Check ACTION_TRACKER.md - did I already run this?
2. If yes: Use the existing result, don't re-run
3. If no: Proceed with the call
```

---

## 💾 CHAT STORAGE (NEW)

### During Session
- Every 5-10 major exchanges → Append to session file
- After important decisions → Add to summary

### End of Session
```
1. Update session file: C:\PRISM\mcp-server\data\chats\sessions\session-N.md
2. Update summary: C:\PRISM\mcp-server\data\chats\summaries\session-N-summary.md
3. Update index: C:\PRISM\mcp-server\data\chats\index.json
```

### Start of Session
```
1. Read ACTION_TRACKER.md → Last 5 actions
2. Read latest summary → What happened last time
3. Read PRIORITY_ROADMAP.json → Current task
4. Continue from where we left off
```

### If Context Compacts
```
1. Read chat summary (300 tokens) → Quick refresh
2. If need details → Read session transcript
3. Resume with full context restored
```

---

## FILE LOCATIONS (AUTHORITATIVE)

| File | Purpose | When |
|------|---------|------|
| ACTION_TRACKER.md | Last 5 actions | Every tool call |
| todo.md | Task progress | Every 5 calls |
| PRIORITY_ROADMAP.json | Roadmap | Session start |
| CURRENT_STATE.json | Full state | Session start/end |
| chats/summaries/*.md | Session summaries | Session start |
| chats/sessions/*.md | Full transcripts | When needed |
| chats/index.json | Topic lookup | Find specific info |

---

## ❌ NEVER DO
- Run same tool twice without checking tracker
- Say "Now doing X" when X is already done
- Read roadmaps from C:\PRISM\docs\ (OUTDATED)
- Forget to update chat storage at session end

## ✅ ALWAYS DO
- Read ACTION_TRACKER before any claim
- Update tracker after every action
- Save important exchanges to chat storage
- Use summaries for quick context restore

---

## INTEGRATION

Works WITH (not replaces):
- prism_gsd_core → Session instructions
- prism_todo_update → Task progress
- prism_quick_resume → Context reload
- prism_cognitive_check → Quality gates
- prism_autopilot → Automated workflows

---

## VERIFICATION CHECKLIST

At end of each response:
- [ ] Last 5 actions documented in tracker?
- [ ] Todo updated if 5+ calls made?
- [ ] Important decisions logged to chat?
- [ ] No duplicate tool calls?

---
v2.0 | Created: 2026-02-04 | Includes: Tracking + Chat Storage
