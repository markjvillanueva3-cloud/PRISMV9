# CLAUDE CODE FOR PRISM - DUMMY PROOF GUIDE
## Copy This to: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CLAUDE_CODE_GUIDE.md

---

# 🚀 ONE-TIME SETUP (Do Once)

## Step 1: Install Claude Code
```bash
# Open terminal/command prompt and run:
npm install -g @anthropic-ai/claude-code
```

## Step 2: Login
```bash
claude login
```
Follow the prompts. Done.

## Step 3: Create Your PRISM Starter File
Save this file as: `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CLAUDE_CODE_START.md`

(I'm creating this for you below)

---

# 📋 EVERY SESSION - JUST DO THIS

## Step 1: Open Terminal in Your PRISM Folder
```bash
cd "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"
```

## Step 2: Start Claude Code
```bash
claude
```

## Step 3: Paste This EXACT Text (Copy-Paste, Don't Type)
```
Read CLAUDE_CODE_START.md and CURRENT_STATE.json, then tell me:
1. What task is in progress (if any)
2. What phase we're in
3. What you recommend we work on

Follow all PRISM protocols in the starter file.
```

## Step 4: Work Normally
Claude Code will have full context. Just tell it what you want to do.

---

# 🆚 KEY DIFFERENCES FROM DESKTOP APP

| Desktop App | Claude Code |
|-------------|-------------|
| "Read file X" → tool call | Just reads it directly |
| Memory remembers you | NO MEMORY - paste starter every time |
| Click buttons | Type commands |
| Web search built-in | No web search |
| Multiple tool calls = slow | Fast direct execution |

---

# ⚠️ GOTCHAS TO AVOID

## ❌ DON'T DO THIS:
- Start Claude Code without pasting the starter
- Assume it remembers anything from last session
- Ask it to search the web (it can't)
- Forget to cd into your PRISM folder first

## ✅ ALWAYS DO THIS:
- Start in your PRISM folder
- Paste the starter text
- Let it read CURRENT_STATE.json
- Tell it to checkpoint before ending

---

# 🛑 ENDING A SESSION

Before you close Claude Code, say:
```
Update CURRENT_STATE.json with what we accomplished and what's next.
```

That's it. Next session picks up where you left off.

---

# 🆘 IF SOMETHING GOES WRONG

## Claude Code won't start:
```bash
npm install -g @anthropic-ai/claude-code
claude login
```

## It doesn't know about PRISM:
You forgot to paste the starter. Say:
```
Read CLAUDE_CODE_START.md and CURRENT_STATE.json
```

## It's doing something wrong:
Say:
```
STOP. Read the PRISM protocols in CLAUDE_CODE_START.md again, specifically [whatever section].
```

---

# 📊 WHEN TO USE WHICH

## Use DESKTOP APP for:
- Planning sessions
- Research (needs web search)
- When you want memory of past conversations
- Brainstorming
- Documentation review

## Use CLAUDE CODE for:
- Heavy coding sessions
- Running Python scripts
- Bulk file operations
- Extractions from monolith
- When desktop app feels slow

---

# 🎯 THAT'S IT!

1. `cd` to PRISM folder
2. Type `claude`
3. Paste the starter
4. Work
5. Update state before closing

Questions? Ask in either app - both can help!
