# Hookify Rule: Auto-trigger /spindle-optimize
type: autofire
event: UserMessage
skill: spindle-optimize

## Pattern
Triggers when user asks about spindle speed optimization or harmonics.

## Condition
message matches "(spindle|rpm).*(optim|harmonic|sweet spot|best|vibrat)" OR "(chatter|resonan|harmonic).*rpm" OR "optimal rpm"

## Message
Routing to /spindle-optimize for harmonic-aware RPM selection.
