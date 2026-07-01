---
name: warn-wildcard-install
enabled: true
event: bash
pattern: (npm\s+install\s+(?!-)|yarn\s+add\s+|pip\s+install\s+(?!-r|-e|\.)|gem\s+install\s+|cargo\s+add\s+)
action: warn
---

**Package installation detected -- verify before proceeding**

Supply chain attacks via typosquatting and malicious packages are increasingly common.

- Verify the correct package name, pin the version explicitly, and check download stats
- This is a soft warning -- installing packages is normal, just be intentional
