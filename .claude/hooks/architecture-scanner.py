#!/usr/bin/env python3
"""
ARCHITECTURE.json Auto-Population Scanner
Scans all Claude Code system components and regenerates ARCHITECTURE.json.

Triggered by: posttooluse-unified.sh when hookify rules, hooks, or settings change.
Can also be run standalone: python3 architecture-scanner.py
"""

import json, os, re, glob, sys
from pathlib import Path
from datetime import datetime

CLAUDE_DIR = Path.home() / ".claude"
HOOKS_DIR = CLAUDE_DIR / "hooks"
SETTINGS_FILE = CLAUDE_DIR / "settings.json"
ARCH_FILE = CLAUDE_DIR / "ARCHITECTURE.json"
MEMORY_DIR = CLAUDE_DIR / "projects" / "C--Windows-System32" / "memory"


def scan_hooks():
    """Scan hooks/ directory and settings.json for registered hooks."""
    hooks = {}
    archived = []

    # Scan active hook files
    for sh in sorted(HOOKS_DIR.glob("*.sh")):
        name = sh.stem
        hooks[name] = {"file": f"hooks/{sh.name}"}

    # Scan archived
    arch_dir = HOOKS_DIR / "archived"
    if arch_dir.exists():
        archived = [f.name for f in sorted(arch_dir.glob("*.sh"))]

    # Enrich from settings.json
    settings = load_settings()
    if settings:
        for event_name, entries in settings.get("hooks", {}).items():
            for entry in entries:
                for hook_cfg in entry.get("hooks", []):
                    cmd = hook_cfg.get("command", "")
                    timeout = hook_cfg.get("timeout", 5)
                    matcher = entry.get("matcher", "")
                    # Extract hook script name from command
                    m = re.search(r'hooks/([a-z0-9_-]+)\.sh', cmd)
                    if m:
                        hname = m.group(1)
                        if hname in hooks:
                            hooks[hname]["event"] = event_name
                            hooks[hname]["timeout"] = timeout
                            if matcher:
                                hooks[hname]["matcher"] = matcher

    # Scan shared lib
    shared_lib = {}
    common_sh = HOOKS_DIR / "lib" / "common.sh"
    if common_sh.exists():
        text = common_sh.read_text(encoding="utf-8", errors="replace")
        funcs = re.findall(r'^(?:function\s+)?(\w+)\s*\(\)', text, re.MULTILINE)
        shared_lib = {
            "file": "hooks/lib/common.sh",
            "functions": funcs or ["parse_hook_input", "deny", "rewrite", "hint", "approve"],
        }

    events_covered = sorted(set(h.get("event", "") for h in hooks.values() if h.get("event")))

    return {
        "active": len(hooks),
        "events_covered": events_covered,
        "list": hooks,
        "shared_lib": shared_lib,
        "archived": {"dir": "hooks/archived/", "files": archived},
    }


def scan_hookify_rules():
    """Scan all hookify.*.local.md files and categorize them."""
    rules = []
    for md in sorted(CLAUDE_DIR.glob("hookify.*.local.md")):
        text = md.read_text(encoding="utf-8", errors="replace")
        fm = parse_frontmatter(text)
        if fm:
            fm["_file"] = md.name
            rules.append(fm)

    # Categorize
    categories = {
        "blocking": {"count": 0, "event": "bash", "action": "block", "rules": []},
        "security": {"count": 0, "event": "file", "action": "warn", "rules": []},
        "code_quality": {"count": 0, "event": "file", "action": "warn", "rules": []},
        "runtime_safety": {"count": 0, "event": "mixed", "action": "warn", "rules": []},
        "token_efficiency": {"count": 0, "event": "mixed", "action": "warn", "rules": []},
        "extra_security": {"count": 0, "event": "file", "action": "warn", "rules": []},
        "auto_fire_skills": {"count": 0, "event": "prompt", "action": "warn", "rules": []},
    }

    for r in rules:
        name = r.get("name", "")
        action = r.get("action", "warn")
        event = r.get("event", "all")

        if action == "block":
            cat = "blocking"
        elif name.startswith("autofire-"):
            cat = "auto_fire_skills"
        elif name in _SECURITY_RULES:
            cat = "security"
        elif name in _CODE_QUALITY_RULES:
            cat = "code_quality"
        elif name in _RUNTIME_SAFETY_RULES:
            cat = "runtime_safety"
        elif name in _TOKEN_RULES:
            cat = "token_efficiency"
        else:
            cat = "extra_security"  # fallback for security-ish rules

        categories[cat]["rules"].append(name)
        categories[cat]["count"] += 1

    # Remove empty categories
    categories = {k: v for k, v in categories.items() if v["count"] > 0}

    enabled = sum(1 for r in rules if r.get("enabled", True))
    disabled = len(rules) - enabled

    return {
        "total": len(rules),
        "enabled": enabled,
        "disabled": disabled,
        "engine_location": "~/.claude/plugins/cache/claude-plugins-official/hookify/",
        "rule_location": "~/.claude/hookify.*.local.md",
        "categories": categories,
    }


# Known rule categorization (maintained as a constant for accuracy)
_SECURITY_RULES = {
    "warn-hardcoded-secrets", "warn-sensitive-files", "warn-sql-injection",
    "warn-xss-innerhtml", "warn-eval-exec", "warn-insecure-deserialize",
    "warn-insecure-http", "warn-path-traversal", "warn-cors-wildcard",
    "warn-weak-crypto", "warn-nosql-injection", "warn-prototype-pollution",
    "warn-env-leak", "warn-xxe-injection",
}
_CODE_QUALITY_RULES = {
    "warn-debug-code", "warn-commented-code", "warn-todo-fixme",
    "warn-lint-suppression", "warn-unsafe-regex",
}
_RUNTIME_SAFETY_RULES = {
    "warn-error-swallowing", "warn-memory-leak", "warn-race-condition",
    "warn-unhandled-async", "warn-wildcard-install",
}
_TOKEN_RULES = {
    "warn-large-file-read", "warn-broad-search", "warn-binary-git-add",
    "warn-chmod-permissions",
}


def scan_plugins():
    """Parse settings.json for enabled/disabled plugins."""
    settings = load_settings()
    if not settings:
        return {}

    plugins = settings.get("enabledPlugins", {})
    enabled = {k.split("@")[0]: True for k, v in plugins.items() if v}
    disabled = [k.split("@")[0] for k, v in plugins.items() if not v]

    # Group enabled plugins by function
    groups = {
        "development": [],
        "code_quality": [],
        "feature_building": [],
        "intelligence": [],
        "automation": [],
        "testing": [],
        "management": [],
    }

    group_map = {
        "agent-sdk-dev": "development", "typescript-lsp": "development",
        "github": "development", "commit-commands": "development",
        "code-review": "code_quality", "code-simplifier": "code_quality",
        "pr-review-toolkit": "code_quality", "qodo-skills": "code_quality",
        "feature-dev": "feature_building", "frontend-design": "feature_building",
        "skill-creator": "feature_building",
        "context7": "intelligence", "greptile": "intelligence", "serena": "intelligence",
        "hookify": "automation", "ralph-loop": "automation", "superpowers": "automation",
        "playwright": "testing",
        "claude-md-management": "management", "claude-code-setup": "management",
    }

    for pname in enabled:
        grp = group_map.get(pname, "development")
        if grp in groups:
            groups[grp].append(pname)

    # Remove empty groups
    groups = {k: sorted(v) for k, v in groups.items() if v}

    return {"enabled": groups, "disabled": sorted(disabled)}


def scan_memory():
    """Scan memory directory for files and their sizes."""
    files = {}
    if MEMORY_DIR.exists():
        for md in sorted(MEMORY_DIR.glob("*.md")):
            try:
                lines = len(md.read_text(encoding="utf-8", errors="replace").splitlines())
            except (OSError, UnicodeDecodeError):
                lines = 0
            files[md.name] = {
                "lines": lines,
                "loaded": "every session" if md.name in ("MEMORY.md", "debugging-patterns.md") else "on demand",
            }
    return {
        "auto_memory_dir": "~/.claude/projects/C--Windows-System32/memory/",
        "files": files,
    }


def scan_git():
    """Get git repo info."""
    info = {
        "name": "claude-hooks",
        "branch": "master",
        "tracks": ["hooks/", "hookify rules", "settings.json", "settings.local.json",
                    "memory/", "ARCHITECTURE.json", "hooks/lib/", "hooks/archived/"],
    }
    # Try to get remote URL
    try:
        import subprocess
        result = subprocess.run(
            ["git", "-C", str(CLAUDE_DIR), "remote", "get-url", "origin"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            url = result.stdout.strip()
            # Extract owner/repo from URL
            m = re.search(r'github\.com[:/](.+?)(?:\.git)?$', url)
            if m:
                info["remote"] = f"github.com/{m.group(1)}"
                info["visibility"] = "private"

        # Get commit count
        result = subprocess.run(
            ["git", "-C", str(CLAUDE_DIR), "rev-list", "--count", "HEAD"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            info["commits"] = int(result.stdout.strip())
    except (OSError, subprocess.SubprocessError, ValueError):
        pass

    return info


def build_system_map(hooks_data, rules_data, plugins_data):
    """Generate ASCII system map from scanned data."""
    hook_count = hooks_data.get("active", 0)
    rule_count = rules_data.get("total", 0)
    block_count = rules_data.get("categories", {}).get("blocking", {}).get("count", 0)
    warn_count = rule_count - block_count - rules_data.get("categories", {}).get("auto_fire_skills", {}).get("count", 0)
    autofire_count = rules_data.get("categories", {}).get("auto_fire_skills", {}).get("count", 0)

    # Count enabled plugins
    enabled_plugins = []
    for group_list in plugins_data.get("enabled", {}).values():
        enabled_plugins.extend(group_list)
    plugin_count = len(enabled_plugins)

    # Build plugin display lines (max 80 chars per inner line)
    plugin_names = sorted(enabled_plugins)
    plugin_lines = []
    current_line = ""
    for p in plugin_names:
        addition = f"{p} . " if current_line else p
        if len(current_line) + len(addition) > 78:
            plugin_lines.append(current_line.rstrip(" ."))
            current_line = p
        else:
            current_line += (f" . {p}" if current_line else p)
    if current_line:
        plugin_lines.append(current_line.rstrip(" ."))

    lines = [
        "+--------------------------------- CLAUDE CODE SYSTEM ---------------------------------+",
        "|                                                                                      |",
        f"|  USER PROMPT --> [UserPromptSubmit] --> {autofire_count} autofire hookify rules --> skill suggestion    |",
        "|       |                                                                              |",
        "|       v                                                                              |",
        f"|  TOOL CALL --> [PreToolUse] --> pretooluse-unified.sh --> deny/rewrite/hint           |",
        "|       |              |         (bash builtins, ~290ms)                                |",
        "|       |              +---> pretooluse-linting.sh (Edit/Write only)                    |",
        f"|       |              +---> hookify block rules ({block_count} rules)                             |",
        "|       v                                                                              |",
        f"|  TOOL EXEC --> [PostToolUse] --> posttooluse-unified.sh --> syntax/quality/compress   |",
        f"|       |              +---> hookify warn rules ({warn_count} rules)                            |",
        "|       v                                                                              |",
        "|  PERMISSION --> [PermissionRequest] --> auto-approve.sh --> fast-path safe ops        |",
        "|                                                                                      |",
        "|  CONFIG EDIT --> [ConfigChange] --> configchange-guard.sh --> protect settings         |",
        "|  STOPPING --> [Stop] --> stop-completion-check.sh --> verify work complete             |",
        "|  TASK DONE --> [TaskCompleted] --> task-completed-chain.sh --> next milestone           |",
        "|  SESSION --> [SessionStart] --> session-start-unified.sh --> load context              |",
        "|  COMPACT --> [PreCompact] --> precompact-save.sh --> save state for restoration        |",
        "|                                                                                      |",
        f"|  +-- PLUGINS ({plugin_count} active) " + "-" * (60 - len(str(plugin_count))) + "+        |",
    ]

    for pl in plugin_lines:
        padded = pl.ljust(76)
        lines.append(f"|  | {padded} |        |")

    lines.append("|  +" + "-" * 78 + "+        |")
    lines.append("|                                                                                      |")
    lines.append("+--------------------------------------------------------------------------------------+")

    return lines


def parse_frontmatter(text):
    """Parse YAML frontmatter from markdown text."""
    m = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if not m:
        return None
    fm = {}
    for line in m.group(1).splitlines():
        line = line.strip()
        if ":" in line and not line.startswith("-") and not line.startswith("#"):
            key, _, val = line.partition(":")
            val = val.strip().strip('"').strip("'")
            if val.lower() == "true":
                val = True
            elif val.lower() == "false":
                val = False
            fm[key.strip()] = val
    return fm


def load_settings():
    """Load settings.json."""
    try:
        return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def build_architecture():
    """Build the complete ARCHITECTURE.json."""
    hooks_data = scan_hooks()
    rules_data = scan_hookify_rules()
    plugins_data = scan_plugins()
    memory_data = scan_memory()
    git_data = scan_git()
    system_map = build_system_map(hooks_data, rules_data, plugins_data)

    arch = {
        "$schema": "claude-system-architecture/v1",
        "version": "1.1.0",
        "generated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "auto_generated": True,
        "description": "Auto-generated by architecture-scanner.py — hooks, rules, plugins, MCP servers, skills, memory, permissions, integrations",
        "system_map": {"ascii": system_map},
        "hooks": hooks_data,
        "hookify_rules": rules_data,
        "plugins": plugins_data,
        "mcp_servers": {
            "context7": {
                "purpose": "Library documentation and code examples on demand",
                "tools": ["resolve-library-id", "query-docs"],
            },
            "greptile": {
                "purpose": "PR review, custom context, code intelligence across repos",
                "tools": ["list_pull_requests", "get_merge_request", "list_merge_request_comments",
                          "search_greptile_comments", "list_custom_context", "trigger_code_review"],
            },
            "serena": {
                "purpose": "Code intelligence - symbol finding, pattern search, file navigation",
                "tools": ["find_symbol", "read_file", "search_for_pattern", "get_symbols_overview", "list_dir"],
            },
            "playwright": {
                "purpose": "Browser automation - screenshots, navigation, form filling, testing",
                "tools": ["browser_navigate", "browser_snapshot", "browser_click", "browser_type",
                          "browser_take_screenshot", "browser_evaluate"],
            },
        },
        "skills": {
            "user_invocable": {
                "workflow": ["/commit", "/smart", "/hookify", "/hookify:list", "/hookify:configure"],
                "review": ["/review-pr", "/code-review", "/code-simplifier"],
                "development": ["/feature-dev", "/frontend-design"],
                "management": ["/claude-md-improver", "/ralph-loop"],
                "creation": ["/skill-creator"],
            },
            "auto_fired": {
                "description": f"{rules_data.get('categories', {}).get('auto_fire_skills', {}).get('count', 0)} hookify rules detect user intent in prompts and suggest skills",
                "rules": rules_data.get("categories", {}).get("auto_fire_skills", {}).get("rules", []),
            },
        },
        "memory": memory_data,
        "git_repo": git_data,
        "performance": {
            "optimizations_applied": [
                "17 grep forks -> bash [[ =~ ]] builtins (65% faster pretooluse)",
                "3 PostToolUse hooks -> 1 (eliminated redundant JSON parsing)",
                "Rule messages trimmed 70% (saves tokens on every rule fire)",
                "Memory files compressed 65% (saves tokens every session)",
                "Small responses (<4KB) skip posttooluse entirely",
                "TSC checks debounced to 30s intervals",
                "File re-read dedup via /tmp/ trackers (60s TTL)",
                "WebSearch dedup via /tmp/ trackers (60s TTL)",
                "ARCHITECTURE.json auto-regenerated on change (not manually maintained)",
            ],
        },
        "error_prevention_hierarchy": [
            {"level": 1, "name": "Type systems & static analysis", "when": "compile time"},
            {"level": 2, "name": f"Hookify rules ({rules_data.get('total', 0)} rules)", "when": "edit time"},
            {"level": 3, "name": f"Shell hooks ({hooks_data.get('active', 0)} hooks)", "when": "tool-use time"},
            {"level": 4, "name": "Pre-commit hooks", "when": "before commit"},
            {"level": 5, "name": "CI/CD checks", "when": "before merge"},
            {"level": 6, "name": "Runtime monitoring", "when": "production"},
        ],
    }

    return arch


def main():
    """Generate or update ARCHITECTURE.json."""
    arch = build_architecture()

    # Write with UTF-8 encoding (no BOM)
    with open(ARCH_FILE, "w", encoding="utf-8") as f:
        json.dump(arch, f, indent=2, ensure_ascii=True)

    total_hooks = arch["hooks"]["active"]
    total_rules = arch["hookify_rules"]["total"]
    total_plugins = sum(len(v) for v in arch["plugins"].get("enabled", {}).values())

    print(f"ARCHITECTURE.json updated: {total_hooks} hooks, {total_rules} rules, {total_plugins} plugins")
    return 0


if __name__ == "__main__":
    sys.exit(main())
