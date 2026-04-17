---
name: warn-stock-btf-ratio
enabled: true
event: PreToolUse
action: warn
conditions:
  tool: ["Edit", "Write"]
  content_match: "buy_to_fly.*[1-9][0-9]\\.|btf.*[1-9][0-9]"
  file_match: ".*[Ss]tock.*|.*[Qq]uot.*"
message: "HIGH BUY-TO-FLY RATIO (>10:1): Consider near-net-shape manufacturing (casting, forging, or additive) to reduce material waste and cost."
---
