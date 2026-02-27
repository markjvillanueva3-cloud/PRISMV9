# PRISM Automation Scripts & Token-Saving Tools

## Quick Start (New Session)

**Option 1: Run batch file**
```
START_SESSION.bat
```

**Option 2: Copy this into Claude (50 tokens)**
```
PRISM Session. Read CURRENT_STATE.json at C:\Users\wompu\Box\PRISM REBUILD\ and continue.
```

---

## Token-Saving Strategy

| Instead of... | Use... | Saves |
|---------------|--------|-------|
| Full project docs | `00_COMPACT_RULES.md` | ~80% |
| Explaining context | `CURRENT_STATE.json` | ~90% |
| Session history | `last_completed` array | ~95% |
| Re-stating rules | `rules_reminder` array | ~70% |

---

## Scripts

### Session Management
| Script | Purpose |
|--------|---------|
| `START_SESSION.bat` | Shows status, gives copy-paste prompt |
| `END_SESSION.bat` | Updates state, commits to git |
| `session_manager.py` | Full session tracking |
| `update_state.py` | Quick state updates |
| `context_generator.py` | Generate minimal context |

### Extraction
| Script | Purpose |
|--------|---------|
| `extract_module.py` | Extract by line ranges |
| `MODULE_TEMPLATE.js` | Template for new modules |
| `INDEX_TEMPLATE.js` | Template for category indexes |

### Verification
| Script | Purpose |
|--------|---------|
| `verify_features.py` | Check 85+ UI features |

### Git
| Script | Purpose |
|--------|---------|
| `setup_git.bat` | Initialize repo with branches |

---

## Quick Commands

```bash
# Check status
python SCRIPTS/update_state.py status

# Mark task complete
python SCRIPTS/update_state.py complete "Extracted materials DB"

# Set next task
python SCRIPTS/update_state.py next "1.A.2" "Extract tool databases"

# Update stats
python SCRIPTS/update_state.py stats databases 10

# Generate context for Claude
python SCRIPTS/context_generator.py --clipboard

# Extract module
python SCRIPTS/extract_module.py monolith.html 45000 45500 output.js
```

---

## File Structure

```
PRISM REBUILD/
├── CURRENT_STATE.json      ← READ THIS FIRST (every session)
├── CLAUDE_MEMORY.json      ← MCP memory reference
├── START_SESSION.bat       ← Run before session
├── END_SESSION.bat         ← Run after session
│
├── _PROJECT_FILES/
│   └── 00_COMPACT_RULES.md ← Minimal rules (load if needed)
│
├── SCRIPTS/
│   ├── session_manager.py
│   ├── update_state.py
│   ├── context_generator.py
│   ├── extract_module.py
│   ├── verify_features.py
│   ├── MODULE_TEMPLATE.js
│   ├── INDEX_TEMPLATE.js
│   └── SESSION_START_TEMPLATES.md
│
└── EXTRACTED/
    ├── machines/CORE/     ← 7 DBs complete
    ├── machines/ENHANCED/ ← 33 mfg complete
    ├── materials/         ← Next
    └── tools/             ← After materials
```

---

## Workflow

1. **Start:** Run `START_SESSION.bat` or paste minimal prompt
2. **Work:** Claude reads state, continues from last point
3. **End:** Run `END_SESSION.bat` to save progress
4. **Repeat:** Each session ~100 tokens to resume vs 5000+
