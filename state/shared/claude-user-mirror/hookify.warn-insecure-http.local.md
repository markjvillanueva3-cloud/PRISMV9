---
name: warn-insecure-http
enabled: true
event: file
pattern: (http://(?!localhost|127\.0\.0\.1|0\.0\.0\.0|::1)|verify\s*=\s*False|rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|InsecureRequestWarning|CURLOPT_SSL_VERIFYPEER.*false)
action: warn
---

**Insecure network configuration detected!**

Using plain HTTP or disabling TLS verification exposes data to interception and MITM attacks.

- Use HTTPS and keep TLS verification enabled; fix certs instead of disabling checks
- Exception: `http://localhost` and `http://127.0.0.1` are fine for local dev
