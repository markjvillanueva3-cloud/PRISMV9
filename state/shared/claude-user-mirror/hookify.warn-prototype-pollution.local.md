---
name: warn-prototype-pollution
enabled: false
event: file
pattern: (Object\.assign\s*\(\s*\{\},?\s*(req\.|request\.|params\.|body\.|query\.)|\.merge\s*\([^,]*,\s*(req\.|request\.|input|data)|__proto__|constructor\s*\[\s*['"]prototype['"]\]|\[['"]__proto__['"]\])
action: warn
---

**Possible prototype pollution vulnerability detected!**

Merging user-controlled objects can modify `Object.prototype`, affecting all objects in the runtime.

- Destructure only expected fields or use a schema validator; never blindly merge user input
- Block `__proto__`, `constructor`, `prototype` keys in dynamic property assignment
