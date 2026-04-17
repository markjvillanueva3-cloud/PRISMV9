---
name: autofire-hook-profile
enabled: true
event: prompt
pattern: (hook\s+(overhead|performance|cost|profil|analyz)|profil\w*\s+hooks|which\s+hooks\s+(are|cost|fire)|heaviest\s+hooks|hook\s+token\s+(cost|usage)|optimize\s+hooks)
action: warn
---

Use `/hook-profile` for hook overhead analysis. Invoke with the Skill tool: `skill: "hook-profile"`. It profiles all 9 hook scripts and 46+ hookify rules, estimates per-session token overhead, ranks heaviest hooks, and suggests optimizations. Quick view: `/hook-profile heavy`.
