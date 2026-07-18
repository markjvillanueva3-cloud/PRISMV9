---
name: warn-unit-mismatch
enabled: true
event: all
pattern: "(?:SFM|IPM|IPR).*(?:mm(?:\/|_|\s)|um)|(?:m\/min|mm\/rev|mm\/min).*(?:inch|in\/|SFM)"
action: warn
---
[!] UNIT MISMATCH - Mixed metric and imperial units detected in machining parameters. This can cause order-of-magnitude errors in cutting forces and tool life. Use `/unit-convert toggle` to convert all parameters to a consistent unit system.
