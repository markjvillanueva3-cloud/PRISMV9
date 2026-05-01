# Hookify Rule: Auto-trigger /hypermill-project-setup
type: autofire
event: UserMessage
skill: hypermill-project-setup

## Pattern
Triggers when user asks about hyperMILL project setup or workflow.

## Condition
message matches "(hypermill|hyper.?mill).*(setup|project|workflow|nc program)" OR "(cam|hypermill).*(model to|setup)"

## Message
Routing to /hypermill-project-setup for model to NC program workflow.
