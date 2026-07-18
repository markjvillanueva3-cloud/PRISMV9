# TEXT-HYGIENE/U-ASCII-GUARD — [MAIN] [TEXT-HYGIENE]/U-ASCII-GUARD (slot:golf): ENFORCED non-ASCII/smart-punctuation block for code files

**Commit:** `91a1ed36af34` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:15:25-05:00
**Tags:** text-hygiene, u-ascii-guard, auto-distilled

## Subject
[MAIN] [TEXT-HYGIENE]/U-ASCII-GUARD (slot:golf): ENFORCED non-ASCII/smart-punctuation block for code files

## Body
```
[MAIN] [TEXT-HYGIENE]/U-ASCII-GUARD (slot:golf): ENFORCED non-ASCII/smart-punctuation block for code files

Operator: 'we still have issues with em dashes, ascii and text issues.' Root cause:
NO hook prevented INTRODUCTION of smart-substitution unicode (em/en dash, curly
quotes, ellipsis, NBSP, unicode-minus) into code/script files - encoding-guard.mjs
only preserved a BOM (symptom mitigation) AND was itself unwired/orphaned. These
chars break PS 5.1 CP1252 decoding, parsers, diffs, grep (real prior incident:
U-MEMMON-INSTALL-ASCII - em-dash in a .ps1 broke -File scheduled-task register).

ascii-guard.mjs: PreToolUse Edit|Write|MultiEdit hard-BLOCK (deny) on the smart set
in code/script/config extensions ONLY; markdown/wiki/memory prose EXCLUDED (em-dash
renders fine there); legit unicode (mu/degree/pi) NOT blocked; only NEW content
scanned; fail-OPEN on error; knobs PRISM_ASCII_GUARD{,_BYPASS,_ALL}. Block message
names each offender + line:col + ASCII fix -> one-retry self-correction. Pure-ASCII
source (escaped fixtures + self-exempt path). 21/21 inline self-test + 4/4 live
behavioral (deny .ts / allow .md / allow clean / allow self). Wired individual
PreToolUse entry in C:+H: settings (not the contention-prone edit-bundle).
```

## Files touched (2)
- .claude/hooks/ascii-guard.mjs | 246 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 246 insertions(+)

## Lessons surfaced in commit body
- till have issues with em dashes, ascii and text issues.' Root cause:

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 91a1ed36af34`
- Milestone envelope: `mcp-server/data/milestones/TEXT-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._