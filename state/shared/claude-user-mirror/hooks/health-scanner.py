#!/usr/bin/env python3
"""
System Health Scanner — checks every Claude Code component and outputs dashboard.json
with green/red/yellow status for each item.

Statuses:
  - "ok"      (green)  — component exists, valid syntax, properly registered
  - "warn"    (yellow) — component exists but has issues (e.g., disabled, large file)
  - "error"   (red)    — component missing, broken syntax, or not registered
  - "disabled"(gray)   — intentionally disabled

Run: python3 health-scanner.py
Output: ~/.claude/dashboard.json
"""

import json, os, re, subprocess, sys
from pathlib import Path
from datetime import datetime

CLAUDE_DIR = Path.home() / ".claude"
HOOKS_DIR = CLAUDE_DIR / "hooks"
SETTINGS_FILE = CLAUDE_DIR / "settings.json"
DASHBOARD_FILE = CLAUDE_DIR / "dashboard.json"
MEMORY_DIR = CLAUDE_DIR / "projects" / "C--Windows-System32" / "memory"


def load_settings():
    try:
        return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        return {"_error": str(e)}


def check_hooks(settings):
    """Check each hook script exists, has valid syntax, and is registered in settings."""
    results = []
    registered_scripts = set()

    # Extract all registered hook scripts from settings
    for event_name, entries in settings.get("hooks", {}).items():
        for entry in entries:
            for hook_cfg in entry.get("hooks", []):
                cmd = hook_cfg.get("command", "")
                m = re.search(r'hooks/([a-z0-9_-]+\.sh)', cmd)
                if m:
                    registered_scripts.add(m.group(1))

    # Check each .sh file in hooks/
    for sh in sorted(HOOKS_DIR.glob("*.sh")):
        item = {"name": sh.stem, "file": sh.name, "type": "hook"}
        checks = []

        # 1. File exists (always true if we found it)
        checks.append(("exists", True, "File exists"))

        # 2. Valid bash syntax
        try:
            result = subprocess.run(
                ["bash", "-n", str(sh)], capture_output=True, text=True, timeout=5
            )
            valid = result.returncode == 0
            checks.append(("syntax", valid, result.stderr.strip()[:100] if not valid else "Valid bash"))
        except (subprocess.SubprocessError, OSError):
            checks.append(("syntax", False, "Could not validate syntax"))

        # 3. Registered in settings.json
        is_registered = sh.name in registered_scripts
        checks.append(("registered", is_registered, "In settings.json" if is_registered else "NOT in settings.json"))

        # 4. Has shebang
        try:
            first_line = sh.read_text(encoding="utf-8", errors="replace").split("\n")[0]
            has_shebang = first_line.startswith("#!")
            checks.append(("shebang", has_shebang, first_line[:40] if has_shebang else "Missing shebang"))
        except OSError:
            checks.append(("shebang", False, "Could not read file"))

        # Determine overall status
        all_pass = all(c[1] for c in checks)
        any_fail = any(not c[1] for c in checks)
        item["status"] = "ok" if all_pass else ("error" if any(not c[1] for c in checks[:2]) else "warn")
        item["checks"] = [{"check": c[0], "pass": c[1], "detail": c[2]} for c in checks]
        results.append(item)

    # Check for registered scripts that don't have files
    existing_scripts = {sh.name for sh in HOOKS_DIR.glob("*.sh")}
    for reg in sorted(registered_scripts):
        if reg not in existing_scripts:
            results.append({
                "name": reg.replace(".sh", ""),
                "file": reg,
                "type": "hook",
                "status": "error",
                "checks": [{"check": "exists", "pass": False, "detail": f"Registered but file missing: hooks/{reg}"}],
            })

    return results


def check_hookify_rules():
    """Check each hookify rule file has valid frontmatter and is parseable."""
    results = []
    for md in sorted(CLAUDE_DIR.glob("hookify.*.local.md")):
        item = {"name": md.stem.replace("hookify.", ""), "file": md.name, "type": "hookify_rule"}
        checks = []

        try:
            text = md.read_text(encoding="utf-8", errors="replace")
            checks.append(("exists", True, "File exists"))

            # Check frontmatter
            fm_match = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
            if fm_match:
                checks.append(("frontmatter", True, "Valid frontmatter"))
                fm_text = fm_match.group(1)

                # Check required fields
                has_name = "name:" in fm_text
                has_enabled = "enabled:" in fm_text
                has_event = "event:" in fm_text
                has_pattern = "pattern:" in fm_text or "conditions:" in fm_text

                checks.append(("name_field", has_name, "Has name" if has_name else "Missing name field"))
                checks.append(("enabled_field", has_enabled, "Has enabled" if has_enabled else "Missing enabled field"))
                checks.append(("event_field", has_event, "Has event" if has_event else "Missing event field"))
                checks.append(("pattern_field", has_pattern, "Has pattern/conditions" if has_pattern else "Missing pattern or conditions"))

                # Check if enabled
                is_enabled = "enabled: true" in fm_text or "enabled:true" in fm_text
                if not is_enabled:
                    item["_disabled"] = True

                # Check message body exists
                body = text[fm_match.end():].strip()
                has_body = len(body) > 5
                checks.append(("message_body", has_body, f"Body: {len(body)} chars" if has_body else "Empty or minimal body"))
            else:
                checks.append(("frontmatter", False, "No valid YAML frontmatter found"))

        except OSError as e:
            checks.append(("exists", False, str(e)))

        all_pass = all(c[1] for c in checks)
        is_disabled = item.get("_disabled", False)
        item["status"] = "disabled" if is_disabled else ("ok" if all_pass else "warn")
        item["checks"] = [{"check": c[0], "pass": c[1], "detail": c[2]} for c in checks]
        if "_disabled" in item:
            del item["_disabled"]
        results.append(item)

    return results


def check_plugins(settings):
    """Check each plugin's enabled/disabled status."""
    results = []
    plugins = settings.get("enabledPlugins", {})
    for full_name, enabled in sorted(plugins.items()):
        short_name = full_name.split("@")[0]
        results.append({
            "name": short_name,
            "type": "plugin",
            "status": "ok" if enabled else "disabled",
            "checks": [{"check": "enabled", "pass": enabled, "detail": "Enabled" if enabled else "Disabled in settings"}],
        })
    return results


def check_memory():
    """Check memory files exist and are reasonable size."""
    results = []
    if not MEMORY_DIR.exists():
        results.append({
            "name": "memory_dir",
            "type": "memory",
            "status": "error",
            "checks": [{"check": "exists", "pass": False, "detail": "Memory directory missing"}],
        })
        return results

    for md in sorted(MEMORY_DIR.glob("*.md")):
        item = {"name": md.name, "type": "memory"}
        checks = []
        try:
            text = md.read_text(encoding="utf-8", errors="replace")
            lines = len(text.splitlines())
            size_kb = len(text.encode("utf-8")) / 1024
            checks.append(("exists", True, f"{lines} lines, {size_kb:.1f}KB"))

            # Warn if MEMORY.md exceeds 200 lines (truncation limit)
            if md.name == "MEMORY.md" and lines > 200:
                checks.append(("size", False, f"{lines} lines exceeds 200-line context limit"))
            elif size_kb > 50:
                checks.append(("size", False, f"{size_kb:.1f}KB is large for a memory file"))
            else:
                checks.append(("size", True, "Within limits"))

        except OSError as e:
            checks.append(("exists", False, str(e)))

        all_pass = all(c[1] for c in checks)
        item["status"] = "ok" if all_pass else "warn"
        item["checks"] = [{"check": c[0], "pass": c[1], "detail": c[2]} for c in checks]
        results.append(item)

    return results


def check_settings(settings):
    """Validate settings.json structure."""
    results = []
    item = {"name": "settings.json", "type": "config"}
    checks = []

    if "_error" in settings:
        checks.append(("valid_json", False, settings["_error"]))
        item["status"] = "error"
    else:
        checks.append(("valid_json", True, "Valid JSON"))

        # Check required sections
        has_hooks = "hooks" in settings
        has_plugins = "enabledPlugins" in settings
        checks.append(("hooks_section", has_hooks, "Has hooks config" if has_hooks else "Missing hooks section"))
        checks.append(("plugins_section", has_plugins, "Has plugins config" if has_plugins else "Missing plugins section"))

        # Check critical hook events exist
        hook_events = set(settings.get("hooks", {}).keys())
        critical_events = {"PreToolUse", "PostToolUse", "PermissionRequest", "SessionStart"}
        missing = critical_events - hook_events
        if missing:
            checks.append(("critical_events", False, f"Missing: {', '.join(sorted(missing))}"))
        else:
            checks.append(("critical_events", True, "All critical events registered"))

        all_pass = all(c[1] for c in checks)
        item["status"] = "ok" if all_pass else "warn"

    item["checks"] = [{"check": c[0], "pass": c[1], "detail": c[2]} for c in checks]
    results.append(item)
    return results


def check_shared_lib():
    """Check hooks/lib/common.sh exists and has expected functions."""
    results = []
    common = HOOKS_DIR / "lib" / "common.sh"
    item = {"name": "common.sh", "type": "shared_lib"}
    checks = []

    if common.exists():
        checks.append(("exists", True, "File exists"))
        try:
            text = common.read_text(encoding="utf-8", errors="replace")
            # Check for expected functions
            expected = ["parse_hook_input", "deny", "rewrite", "hint", "approve"]
            found = [fn for fn in expected if fn in text]
            missing = [fn for fn in expected if fn not in text]
            if missing:
                checks.append(("functions", False, f"Missing: {', '.join(missing)}"))
            else:
                checks.append(("functions", True, f"All {len(expected)} functions present"))

            # Syntax check
            result = subprocess.run(["bash", "-n", str(common)], capture_output=True, text=True, timeout=5)
            checks.append(("syntax", result.returncode == 0, "Valid" if result.returncode == 0 else result.stderr[:80]))
        except (OSError, subprocess.SubprocessError) as e:
            checks.append(("readable", False, str(e)))
    else:
        checks.append(("exists", False, "hooks/lib/common.sh missing"))

    all_pass = all(c[1] for c in checks)
    item["status"] = "ok" if all_pass else "error"
    item["checks"] = [{"check": c[0], "pass": c[1], "detail": c[2]} for c in checks]
    results.append(item)
    return results


def check_architecture_json():
    """Check ARCHITECTURE.json is valid and recent."""
    results = []
    arch = CLAUDE_DIR / "ARCHITECTURE.json"
    item = {"name": "ARCHITECTURE.json", "type": "config"}
    checks = []

    if arch.exists():
        checks.append(("exists", True, "File exists"))
        try:
            data = json.loads(arch.read_text(encoding="utf-8"))
            checks.append(("valid_json", True, "Valid JSON"))
            checks.append(("auto_generated", data.get("auto_generated", False),
                          "Auto-managed" if data.get("auto_generated") else "Manual — may be stale"))
        except (json.JSONDecodeError, OSError) as e:
            checks.append(("valid_json", False, str(e)[:80]))
    else:
        checks.append(("exists", False, "ARCHITECTURE.json missing"))

    all_pass = all(c[1] for c in checks)
    item["status"] = "ok" if all_pass else ("error" if not arch.exists() else "warn")
    item["checks"] = [{"check": c[0], "pass": c[1], "detail": c[2]} for c in checks]
    results.append(item)
    return results


def check_git_repo():
    """Check git repo health."""
    results = []
    item = {"name": "git-repo", "type": "git"}
    checks = []

    try:
        # Check if it's a git repo
        result = subprocess.run(
            ["git", "-C", str(CLAUDE_DIR), "rev-parse", "--is-inside-work-tree"],
            capture_output=True, text=True, timeout=5
        )
        is_repo = result.returncode == 0
        checks.append(("is_repo", is_repo, "Git repo" if is_repo else "Not a git repo"))

        if is_repo:
            # Check remote
            result = subprocess.run(
                ["git", "-C", str(CLAUDE_DIR), "remote", "get-url", "origin"],
                capture_output=True, text=True, timeout=5
            )
            has_remote = result.returncode == 0
            checks.append(("remote", has_remote,
                          result.stdout.strip()[:60] if has_remote else "No remote configured"))

            # Check for uncommitted changes
            result = subprocess.run(
                ["git", "-C", str(CLAUDE_DIR), "status", "--porcelain"],
                capture_output=True, text=True, timeout=5
            )
            dirty_count = len([l for l in result.stdout.strip().splitlines() if l.strip()])
            if dirty_count > 0:
                checks.append(("clean", False, f"{dirty_count} uncommitted change(s)"))
            else:
                checks.append(("clean", True, "Working tree clean"))

    except (subprocess.SubprocessError, OSError) as e:
        checks.append(("git_available", False, str(e)[:80]))

    all_pass = all(c[1] for c in checks)
    item["status"] = "ok" if all_pass else "warn"
    item["checks"] = [{"check": c[0], "pass": c[1], "detail": c[2]} for c in checks]
    results.append(item)
    return results


def build_dashboard():
    """Run all health checks and build dashboard.json."""
    settings = load_settings()

    components = []
    components.extend(check_hooks(settings))
    components.extend(check_hookify_rules())
    components.extend(check_plugins(settings))
    components.extend(check_memory())
    components.extend(check_settings(settings))
    components.extend(check_shared_lib())
    components.extend(check_architecture_json())
    components.extend(check_git_repo())

    # Summary counts
    ok = sum(1 for c in components if c["status"] == "ok")
    warn = sum(1 for c in components if c["status"] == "warn")
    error = sum(1 for c in components if c["status"] == "error")
    disabled = sum(1 for c in components if c["status"] == "disabled")
    total = len(components)

    dashboard = {
        "$schema": "claude-system-dashboard/v1",
        "generated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "summary": {
            "total": total,
            "ok": ok,
            "warn": warn,
            "error": error,
            "disabled": disabled,
            "health_pct": round(ok / max(total - disabled, 1) * 100, 1),
        },
        "components": components,
    }

    with open(DASHBOARD_FILE, "w", encoding="utf-8") as f:
        json.dump(dashboard, f, indent=2, ensure_ascii=True)

    return dashboard


def main():
    dashboard = build_dashboard()
    s = dashboard["summary"]
    print(f"Dashboard: {s['ok']} ok, {s['warn']} warn, {s['error']} error, {s['disabled']} disabled ({s['health_pct']}% healthy)")
    return 0 if s["error"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
