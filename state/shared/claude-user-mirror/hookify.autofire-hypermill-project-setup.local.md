# Hookify Rule: Auto-trigger /hypermill-project-setup
type: autofire
event: UserMessage
skill: hypermill-project-setup

## Pattern
Triggers when user asks about hyperMILL project setup or model-to-NC workflow.

## Condition
message matches "hypermill.*(setup|project|workflow)" OR "hypermill.*(model|cad).*(nc|program)" OR "(set up|create).*(hypermill|hm)" OR "hypermill new project"

## Message
Routing to /hypermill-project-setup for model-to-NC program workflow.
