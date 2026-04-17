---
name: autofire-drill-calc
enabled: true
event: prompt
pattern: (drill(ing)?\s+(speed|feed|param|calc|rpm|peck|deep\s+hole|breakthrough)|peck\s+(drill|cycle|depth)|tap\s+drill\s+size|drilling\s+(in|for|into)\s+\w+|what\s+(speed|feed|rpm)\s+for\s+drill|L\/D\s+ratio\s+drill|deep\s+hole\s+drill)
action: warn
---

Use `/drill-calc` for quick drilling calculations. Examples: `/drill-calc 10 50 steel` (Ø10mm, 50mm deep in steel), `/drill-calc tap M10x1.5` (tap drill size + params), `/drill-calc deep 8 80 titanium` (deep hole focus), `/drill-calc chart stainless` (speed/feed chart for all drill sizes).
