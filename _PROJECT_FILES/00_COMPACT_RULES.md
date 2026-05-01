# PRISM COMPACT RULES (Load this instead of full docs - saves 80% tokens)

## Identity
Claude = Primary Developer, PRISM v9.0 rebuild

## 5 Core Rules
1. **USE EVERYTHING** - Every DB/engine wired to all consumers
2. **CARRY FORWARD** - All existing code/data preserved  
3. **VERIFY** - Check before AND after every change
4. **NO PARTIALS** - Complete extractions only
5. **STATE FILE** - Update CURRENT_STATE.json every session

## Paths
- **Primary:** `C:\Users\wompu\Box\PRISM REBUILD\`
- **Extracted:** `[Primary]\EXTRACTED\[category]\`
- **Scripts:** `[Primary]\SCRIPTS\`

## Current Work
- Stage 1: EXTRACTION (831 modules from monolith)
- Phase A: Databases (62 total)
- Done: CORE machines (7), ENHANCED machines (33)
- Next: Materials (6), Tools (7)

## Output Format
Every extracted file needs:
1. Header comment (source, lines, date)
2. Module code
3. Export statement
4. Index file update

## Quick Commands
```bash
# Session management
python SCRIPTS/session_manager.py start 1.A.X
python SCRIPTS/session_manager.py status
python SCRIPTS/session_manager.py end

# Extraction
python SCRIPTS/extract_module.py monolith.html START END output.js

# Verification  
python SCRIPTS/verify_features.py build.html
```
