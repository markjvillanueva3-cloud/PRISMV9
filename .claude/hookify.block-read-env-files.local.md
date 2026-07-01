---
name: block-read-env-files
enabled: true
event: all
action: block
---
SECURITY + TOKEN SAVE: .env files contain secrets. Never read credentials into context. Use environment variable references instead.
