# Hookify Rule: Auto-trigger /secondary-ops
type: autofire
event: UserMessage
skill: secondary-ops

## Pattern
Triggers when user asks about secondary operations.

## Condition
message matches "(anodiz|heat treat|plat|NDT|grind|tumbl|deburr|passivat|black oxide|nickel|chrome|zinc).*(spec|price|cost|vendor|compat)" OR "(secondary|finishing) (op|process)"

## Message
Routing to /secondary-ops for secondary operation lookup.
