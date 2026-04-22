---
name: security-audit
description: Scan Claude Code settings for security misconfigurations, overly broad permissions, missing sandbox rules, and exposed secrets.
model: sonnet
effort: medium
allowed-tools: Read, Grep, Glob
---

# Security Audit Skill

Perform a comprehensive security audit of Claude Code configuration.

## Steps

1. **Read settings files**: Read both user-level (~/.claude/settings.json) and project-level (.claude/settings.json if present) configuration files.

2. **Check permissions**:
   - Flag any overly broad permission grants like Bash(*) or Write(*) in allow rules
   - Verify deny rules exist for destructive operations (rm -rf, format, del /s /q)
   - Verify deny rules exist for sensitive file writes (.env, *credentials*, *secret*)
   - Check that skipDangerousModePermissionPrompt is documented if enabled

3. **Check sandbox configuration**:
   - Verify sandbox is enabled (sandbox.enabled: true)
   - Check that filesystem allowRead/allowWrite paths are scoped (not ** at root)
   - Check that network allowedDomains is not * or overly broad
   - Flag if sandbox mode is disabled or missing entirely

4. **Check hooks for security**:
   - Verify a secrets-detection hook exists on Write|Edit
   - Check that PreToolUse hooks exist for safety checks
   - Flag any hooks with excessively long timeouts (>30s)
   - Check for hooks that execute remote/untrusted code

5. **Scan for exposed secrets**:
   - Use Grep to search for common secret patterns in .claude/ directory:
     - sk-ant- (Anthropic API keys)
     - ghp_ (GitHub tokens)
     - AKIA (AWS access keys)
     - password=, secret=, token= in config files
   - Exclude .json files that are settings (check .md, .sh, .ts files)

6. **Output a security report**:

Security Audit Report
Score: X/100

Findings:
- [PASS/FAIL] Sandbox enabled and properly scoped
- [PASS/FAIL] Destructive command deny rules present
- [PASS/FAIL] Sensitive file write deny rules present
- [PASS/FAIL] Secrets detection hook active
- [PASS/FAIL] No exposed secrets found
- [PASS/FAIL] Network access properly restricted
- [PASS/FAIL] Hook timeouts reasonable
- [PASS/FAIL] No overly broad permissions

Recommendations:
- (list any issues found with remediation steps)

Scoring: Start at 100, deduct 15 for missing sandbox, 15 for missing deny rules, 15 for exposed secrets, 10 for missing secrets hook, 10 for overly broad permissions, 10 for unrestricted network, 5 for each minor issue.
