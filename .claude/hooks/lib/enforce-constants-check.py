#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Canonical Constants Checker
Fires on PostToolUse for Write|Edit to src/engines/*.ts

Checks if the engine file contains inline physics constants
(kc1_1, mc, taylor_C, taylor_n) instead of importing from
src/physics/constants.ts.

BLOCKS if inline constants are detected.
"""
import json
import sys
import os
import re

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    tool_input = input_data.get("tool_input", {})
    tool_response = input_data.get("tool_response", {})
    file_path = (tool_input.get("file_path", "") or
                 (tool_response.get("filePath", "") if isinstance(tool_response, dict) else ""))

    file_path = file_path.replace("\\", "/")

    # Only check engine files
    if "src/engines/" not in file_path:
        print(json.dumps({"continue": True}))
        return
    if not file_path.endswith(".ts") or ".test." in file_path:
        print(json.dumps({"continue": True}))
        return

    # Skip non-physics engines (course management, knowledge, etc.)
    NON_PHYSICS_ENGINES = {
        "CurriculumEngine", "CourseBuilderEngine", "CertificationTrackingEngine",
        "ApprenticeEngine", "ManufacturingKnowledgeGraphEngine", "KnowledgeQueryEngine",
        "CADDrawingKnowledgeEngine", "TribalKnowledgeEngine", "MachiningPlaybookEngine",
        "FeatureStrategyKnowledgeBaseEngine", "LessonRendererEngine",
    }
    basename = os.path.basename(file_path).replace(".ts", "")
    if basename in NON_PHYSICS_ENGINES:
        print(json.dumps({"continue": True}))
        return

    # Read the file content
    real_path = file_path
    if not os.path.exists(real_path):
        # Try Windows path
        real_path = file_path.replace("/", "\\")
    if not os.path.exists(real_path):
        print(json.dumps({"continue": True}))
        return

    try:
        with open(real_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception:
        print(json.dumps({"continue": True}))
        return

    # Check for inline Kienzle constants (common violation)
    violations = []

    # Pattern: kc1_1 or kc1.1 assigned a numeric value (not from import)
    kc_pattern = re.findall(r'kc1[_.]1\s*[:=]\s*(\d{3,4})', content)
    if kc_pattern:
        # Check if it imports from constants.ts
        imports_constants = (
            "constants" in content.lower() and
            ("import" in content or "require" in content) and
            "physics/constants" in content
        )
        if not imports_constants:
            violations.append(
                f"Inline kc1.1 values found: {kc_pattern}. "
                f"Use import from src/physics/constants.ts instead."
            )

    # Pattern: taylor_C or taylor_n assigned values
    taylor_pattern = re.findall(r'taylor_[CcNn]\s*[:=]\s*(\d+\.?\d*)', content)
    if taylor_pattern and "physics/constants" not in content:
        violations.append(
            f"Inline Taylor constants found: {taylor_pattern}. "
            f"Use import from src/physics/constants.ts."
        )

    # Pattern: hardcoded cutting speed ranges without material reference
    vc_hardcoded = re.findall(r'[Vv]c\s*[:=]\s*(\d{2,4})\s*[;,\n]', content)
    if len(vc_hardcoded) > 3 and "MaterialRegistry" not in content and "material" not in content.lower()[:500]:
        violations.append(
            f"Multiple hardcoded Vc values ({len(vc_hardcoded)} found) without MaterialRegistry query. "
            f"Use MaterialRegistry or manufacturer S/F data for material-specific values."
        )

    if violations:
        violation_text = " | ".join(violations)
        msg = (
            f"CANONICAL CONSTANTS VIOLATION in {os.path.basename(file_path)}: {violation_text} "
            f"Physics constants MUST come from src/physics/constants.ts or MaterialRegistry — "
            f"inline values cause conflicts across engines and are impossible to maintain."
        )
        print(json.dumps({
            "decision": "block",
            "reason": msg,
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": msg
            }
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
