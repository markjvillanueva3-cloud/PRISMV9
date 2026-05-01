---
name: warn-xss-innerhtml
enabled: true
event: file
pattern: (innerHTML\s*=|outerHTML\s*=|document\.write\(|\.insertAdjacentHTML\(|v-html\s*=)
action: warn
---

**Possible XSS vulnerability -- raw HTML injection detected! (OWASP A03:2021)**

Setting innerHTML or using raw HTML injection with user-controlled data enables cross-site scripting.

- Use `textContent` instead of `innerHTML` for text; use framework auto-escaping (JSX `{data}`, Vue `{{ }}`)
- If raw HTML is required, always sanitize with DOMPurify or sanitize-html first
