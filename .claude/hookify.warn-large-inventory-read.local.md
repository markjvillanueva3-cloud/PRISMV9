---
name: warn-large-inventory-read
enabled: true
event: all
pattern: "boot or "
action: warn
---
TOKEN SAVE: Consider reading `data/quick-ref.json` (35 lines) instead of this large file. Use /boot or /status for compact system info. Only read full inventory for deep audits.
