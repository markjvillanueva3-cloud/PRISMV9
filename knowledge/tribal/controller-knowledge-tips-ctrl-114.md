---
id: "ctrl-114"
title: "Star swiss lathe Fanuc variant with NC Assist and B-axis"
source: "controller:web_research"
confidence: 80
category: "programming"
tags: ["controller", "star", "swiss-lathe", "fanuc-variant", "NC-Assist", "B-axis"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.243Z
---

# Star swiss lathe Fanuc variant with NC Assist and B-axis

Star swiss lathes use Fanuc controllers (typically 31i-B or 18i-TB on older models) with Star-specific customizations. NC Assist is Star's template-driven CNC program editor that generates code from clickable machining templates with minimal input — faster than manual G-code for standard swiss operations. The Fanuc iHMI interface on newer models (15" touchscreen) includes conversational programming, free-figure contour programming, and fixed-phrase insert for building programs block-by-block. Some Star models feature double B-axis programmable units for simultaneous 5-axis control — unusual for swiss lathes. Star Motion Control System coordinates all axes for seamless operations. M-codes above M79 are Star-specific and vary by model — always verify against the machine's M-code table. Use CAM software (GibbsCAM, PartMaker) with Star-specific post processors for complex multi-axis programs.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-116|Tsugami opposed gang tool swiss lathe with Fanuc 32i-B]]
- [[controller-knowledge-tips-ctrl-106|Citizen LFV low-frequency vibration cutting G-code control]]
- [[controller-knowledge-tips-ctrl-107|Citizen detachable guide bushing and programming impact]]
- [[controller-knowledge-tips-ctrl-117|Nakamura-Tome NT Manual Guide i for multitasking programming]]
- [[controller-knowledge-tips-ctrl-118|YCM machining centers with Fanuc — OEM integration notes]]
