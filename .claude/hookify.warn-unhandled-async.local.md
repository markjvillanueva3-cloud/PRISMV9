---
name: warn-unhandled-async
enabled: true
event: file
pattern: (\.then\s*\([^)]*\)\s*(?!\.catch|\.finally|,)|new\s+Promise\s*\(\s*\(resolve\)\s*=>)
action: warn
---

**Potential unhandled async/promise pattern detected**

Unhandled promise rejections crash Node.js and create silent failures in browsers.

- Always add `.catch()` to promise chains and include `reject` parameter in `new Promise()`
- Wrap `await` calls in try/catch to handle errors from async functions
