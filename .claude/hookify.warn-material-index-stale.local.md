---
name: warn-material-index-stale
enabled: true
event: PreToolUse
action: warn
conditions:
  tool: ["Edit", "Write"]
  content_match: "2024-Q[1-4].*multiplier|as_of.*2024"
  file_match: ".*[Mm]aterial.*[Pp]ric.*"
message: "STALE COMMODITY INDEX: Material pricing indices dated 2024. Update via material_price_adjust action with current LME/COMEX/CRU data before quoting."
---
