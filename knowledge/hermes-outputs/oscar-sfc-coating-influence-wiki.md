# Coating Influence on Specific Cutting Force (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Correction - Master Level

## Description
Tool coatings can significantly affect the specific cutting force (kc) and overall cutting performance.

## Key Effects
- TiAlN / AlCrN: 8–15% reduction in kc on steel compared to uncoated
- DLC: Significant kc reduction on aluminum
- Coating wear gradually increases kc over tool life

## PRISM Implementation
- ToolRegistry stores coating factor per tool
- Applied as multiplier in KienzleForceModelEngine
- Worn coating detection via force trend monitoring

## JM Die Notes
- Measurable force reduction observed on P2–P4 steels with modern TiAlN coatings, especially at higher speeds
- Coating performance degrades noticeably after 40–60% of tool life

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)