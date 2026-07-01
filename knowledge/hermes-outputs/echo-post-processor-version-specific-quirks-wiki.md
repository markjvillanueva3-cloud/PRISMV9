# Version-Specific and Control Quirks (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Practical Knowledge - Master Level

## Description
Handling of version-specific differences, firmware quirks, and control-specific behaviors across different machine controllers.

## Key Areas
- Fanuc version differences (0i, 31i, 32i, etc.)
- Siemens ShopMill vs ISO behavior
- Heidenhain plain text vs ISO quirks
- Haas NGC vs classic control differences
- Okuma OSP version differences
- Mazak Mazatrol vs G-code quirks

## PRISM Implementation
- Version detection and conditional post logic
- Awareness injection of known quirks
- ZULU ensures version-specific rules are applied

## JM Die Notes
- Many crashes and quality issues were caused by ignoring version-specific quirks
- Rule: Always verify control version and firmware before finalizing post processor

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)