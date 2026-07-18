---
name: warn-nosql-injection
enabled: false
event: file
pattern: (\.(find|findOne|updateOne|updateMany|deleteOne|deleteMany|aggregate)\s*\(\s*\{[^}]*(\breq\.|request\.|params\.|query\.|body\.|\$where|\$regex)|\.(find|update|delete)\s*\(.*\$\{)
action: warn
---

**Possible NoSQL injection detected!**

Unsanitized user input in MongoDB/NoSQL queries allows attackers to bypass auth and exfiltrate data.

- Cast inputs to expected types (`String()`, `Number()`) and use sanitization middleware
- Never use `$where` with user input; validate query structure with a schema
