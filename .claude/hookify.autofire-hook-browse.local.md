---
name: autofire-hook-browse
enabled: true
event: prompt
pattern: (browse\s+(?:prism\s+)?hooks|prism\s+hook\s+(list|search|browse|explore|inspect)|which\s+(?:prism\s+)?hooks|what\s+(?:prism\s+)?hooks|blocking\s+hooks|hook\s+modules|hook\s+phases|enforcement\s+hooks|safety\s+hooks|manufacturing\s+hooks|cognitive\s+hooks|hook\s+statistics|220\s+hooks)
action: warn
---

Use `/hook-browse` to explore PRISM's 220 internal hooks (17 modules). Examples: `/hook-browse` (list all by module), `/hook-browse blocking` (list execution blockers), `/hook-browse critical` (critical priority), `/hook-browse module enforcement` (by module), `/hook-browse search spindle` (search), `/hook-browse stats` (distribution).
