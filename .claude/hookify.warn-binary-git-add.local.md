---
name: warn-binary-git-add
enabled: true
event: bash
pattern: git\s+add\s+.*\.(zip|tar|gz|bz2|7z|rar|exe|dll|so|dylib|bin|iso|img|dmg|msi|whl|jar|war|ear|pdf|mp4|mov|avi|mp3|wav|sqlite|db|pack|wasm)(\s|$)
action: warn
---

**Large binary file being staged for git!**

Binary files permanently bloat git history and cannot be efficiently diffed or merged.

- Add to `.gitignore` if not needed in the repo, or use Git LFS for binaries that must be versioned
- Store large assets in external storage (S3, CDN, release artifacts)
