# Hookify Rule: Auto-trigger /token-ledger
type: autofire
event: UserMessage
skill: token-ledger

## Pattern
Triggers when user asks about token spending or cost breakdown.

## Condition
message matches "token (ledger|spend|cost|breakdown)" OR "how much.*(spent|cost|token)" OR "token ledger" OR "spending breakdown" OR "cost per tool"

## Message
Routing to /token-ledger for session token accounting.
