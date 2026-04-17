---
name: warn-cors-wildcard
enabled: true
event: file
pattern: (Access-Control-Allow-Origin.*\*|cors\(\s*\)|origin:\s*(['"]?\*['"]?|true)|allowedOrigins.*\*|CORS_ALLOW_ALL|CORS_ORIGIN_ALLOW_ALL\s*=\s*True)
action: warn
---

**Wildcard CORS configuration detected!**

`Access-Control-Allow-Origin: *` allows any website to make requests to your API.

- Specify allowed origins explicitly instead of using wildcards
- Exception: truly public APIs with no auth or static CDN assets. Never use `*` with `credentials: true`
