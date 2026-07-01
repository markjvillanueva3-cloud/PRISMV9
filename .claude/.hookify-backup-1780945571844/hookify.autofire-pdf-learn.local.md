# Hookify Rule: Auto-trigger /pdf-learn
type: autofire
event: UserMessage
skill: pdf-learn

## Pattern
Triggers when user asks to learn from a PDF document.

## Condition
message matches "(pdf|document).*(learn|extract|process|analyz|ingest)" OR "learn from.*(pdf|document|manual)" OR "(extract|get).*(knowledge|info).*(pdf|document)"

## Message
Routing to /pdf-learn for document to PRISM components pipeline.
