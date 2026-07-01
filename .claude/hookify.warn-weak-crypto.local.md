---
name: warn-weak-crypto
enabled: true
event: file
pattern: (md5\(|MD5\.|sha1\(|SHA1\.|createHash\(['"]md5['"]\)|createHash\(['"]sha1['"]\)|hashlib\.md5|hashlib\.sha1|DES\.|RC4\.|Blowfish|ECB|Math\.random\(\)|random\.random\(\))
action: warn
---

**Weak or insecure cryptography detected!**

MD5, SHA1, DES, RC4, and ECB mode are cryptographically broken. `Math.random()` is not cryptographically secure.

- Use bcrypt/argon2 for passwords, SHA-256+ for integrity, AES-256-GCM for encryption
- Use `crypto.randomBytes()`/`secrets.token_hex()` instead of `Math.random()`/`random.random()`
