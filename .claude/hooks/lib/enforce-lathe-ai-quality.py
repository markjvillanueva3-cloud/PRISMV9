#!/usr/bin/env python3
"""
Enforce Lathe AI Quality — Protective hook for lathe AI engines

Validates that lathe AI code follows quality standards:
1. Neural network engines must have proper weight initialization
2. Reasoning engines must include confidence scoring
3. Knowledge engines must cite sources
4. All engines must handle edge cases (empty input, invalid material)

Triggered: PostToolUse on Write/Edit to src/engines/Lathe*.ts
"""

import json
import sys
import re

def check_lathe_ai_quality(file_path: str, content: str) -> tuple[str, str]:
    """Check lathe AI engine quality."""

    issues = []

    # Only check Lathe* engines
    if not re.search(r'Lathe.*Engine\.ts$', file_path):
        return "PASS", ""

    # 1. Neural network engines should have weight initialization
    if re.search(r'(Neural|Learning|Network|Transformer|Attention)', file_path, re.I):
        if 'weights' in content.lower() and not re.search(r'(initialize|init|Xavier|He|random)', content, re.I):
            issues.append("Neural network engine missing weight initialization")

    # 2. Reasoning engines should have confidence scoring
    if re.search(r'(Reasoning|Logic|Inference|Causal)', file_path, re.I):
        if not re.search(r'confidence[:\s]*[\d.]|confidence\s*=', content, re.I):
            issues.append("Reasoning engine missing confidence scoring")

    # 3. Knowledge engines should cite sources
    if re.search(r'(Knowledge|Harvester|Resource)', file_path, re.I):
        if not re.search(r'source[:\s]*["\']|provenance|citation', content, re.I):
            issues.append("Knowledge engine missing source citations")

    # 4. All engines should handle empty input
    if not re.search(r'if\s*\([^)]*(?:!|\.length\s*===?\s*0|null|undefined)', content):
        issues.append("Engine may not handle empty/null input - add validation")

    # 5. All engines should have JSDoc
    if not re.search(r'/\*\*[\s\S]*?\*/', content):
        issues.append("Engine missing JSDoc documentation")

    # 6. Avoid hardcoded physics constants
    if re.search(r'kc1[._]?1\s*[:=]\s*\d{3,4}|taylor.*[=:]\s*\d', content, re.I):
        issues.append("CRITICAL: Hardcoded physics constants - use src/physics/constants.ts")
        return "BLOCK", "Hardcoded physics constants detected. Import from src/physics/constants.ts"

    if issues:
        return "WARN", f"Lathe AI quality issues:\n" + "\n".join(f"  - {i}" for i in issues)

    return "PASS", ""


def main():
    """Main entry point."""
    try:
        event = json.load(sys.stdin)

        tool_name = event.get("tool_name", "")
        tool_input = event.get("tool_input", {})

        # Only check Write/Edit operations
        if tool_name not in ["Write", "Edit"]:
            print(json.dumps({"action": "ALLOW"}))
            return

        file_path = tool_input.get("file_path", "")
        content = tool_input.get("content", "") or tool_input.get("new_string", "")

        # Only check lathe engine files
        if not re.search(r'Lathe.*Engine\.ts$', file_path):
            print(json.dumps({"action": "ALLOW"}))
            return

        action, message = check_lathe_ai_quality(file_path, content)

        if action == "BLOCK":
            print(json.dumps({
                "action": "BLOCK",
                "message": f"[Lathe AI Quality] {message}"
            }))
        elif action == "WARN":
            print(json.dumps({
                "action": "ALLOW",
                "message": f"[Lathe AI Quality] {message}"
            }))
        else:
            print(json.dumps({"action": "ALLOW"}))

    except Exception as e:
        # On error, allow but warn
        print(json.dumps({
            "action": "ALLOW",
            "message": f"[Lathe AI Quality] Hook error: {e}"
        }))


if __name__ == "__main__":
    main()
