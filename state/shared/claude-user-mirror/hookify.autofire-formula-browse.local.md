---
name: autofire-formula-browse
enabled: true
event: prompt
pattern: (browse\s+formula|formula\s+(list|search|browse|explore|lookup|find|stats)|which\s+formula|what\s+formulas|F-[A-Z]+-\d+|formula\s+registry|formula\s+domain|formula\s+category|orphan\s+formulas|formula\s+consumers)
action: warn
---

Use `/formula-browse` to explore PRISM's 490+ formulas. Examples: `/formula-browse` (list all by domain), `/formula-browse F-KIENZLE-001` (inspect specific), `/formula-browse domain physics` (by domain), `/formula-browse search deflection` (search), `/formula-browse orphans` (find unconsumed), `/formula-browse stats` (distribution).
