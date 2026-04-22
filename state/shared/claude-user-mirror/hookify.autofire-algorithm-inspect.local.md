---
name: autofire-algorithm-inspect
enabled: true
event: prompt
pattern: (inspect\s+algorithm|algorithm\s+(list|detail|info|inspect|explore|metadata)|which\s+algorithm|what\s+algorithms|kienzle|taylor\s+model|johnson.?cook|stability\s+lobe|safety.?critical\s+algorithms|unused\s+algorithms|algorithm\s+domain)
action: warn
---

Use `/algorithm-inspect` to explore PRISM's 51 algorithms. Examples: `/algorithm-inspect` (list all by domain), `/algorithm-inspect KienzleForceModel` (inspect specific), `/algorithm-inspect safety` (safety classifications), `/algorithm-inspect domain thermal` (by domain), `/algorithm-inspect unused` (find orphans).
