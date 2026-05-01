---
name: warn-insecure-deserialize
enabled: true
event: file
pattern: (yaml\.load\((?!.*Loader)|yaml\.unsafe_load\(|marshal\.loads?\(|unserialize\(|ObjectInputStream|readObject\(\))
action: warn
---

**Insecure deserialization detected! (OWASP A08:2021)**

Deserializing untrusted data can lead to remote code execution.

- Use safe loaders (`yaml.safe_load()`, `json_decode()`) and prefer JSON over binary serialization
- Never deserialize data from untrusted sources without validation and allowlisting
