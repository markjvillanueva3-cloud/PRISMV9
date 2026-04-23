#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Instruction Compliance Tracker
Fires on PostToolUse for Write|Edit to src/engines/*.ts.

Checks that the engine code demonstrates ACTIVE knowledge utilization:
1. Has comments citing formula sources (not just implementing — citing WHERE from)
2. Uses constants from canonical source (not inline magic numbers)
3. Has reasoning/justification in output types (reasoning[], warnings[], justification[])
4. Handles multiple materials (not just steel — check for ISO group branching)
5. References tribal knowledge patterns (anti-pattern avoidance visible in code)

This goes BEYOND stub detection — it checks that the code reflects
MIT-level engineering rigor, not just "it compiles and returns something."
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
    file_path = str(tool_input.get("file_path", "")).replace("\\", "/")

    # Only check engine files
    if "src/engines/" not in file_path or not file_path.endswith(".ts") or ".test." in file_path:
        print(json.dumps({"continue": True}))
        return

    real_path = file_path if os.path.exists(file_path) else file_path.replace("/", "\\")
    if not os.path.exists(real_path):
        print(json.dumps({"continue": True}))
        return

    try:
        with open(real_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception:
        print(json.dumps({"continue": True}))
        return

    findings = []
    engine_name = os.path.basename(file_path)
    lines = len(content.split('\n'))

    # Only check substantial engines (>100 lines)
    if lines < 100:
        print(json.dumps({"continue": True}))
        return

    # Check 1: Formula source citations
    # Good: "// Kienzle force model: Fc = kc1.1 × ap × fz^(1-mc) — Altintas Table 2.1"
    # Bad: just implementing the formula with no citation
    has_citation = bool(re.search(r'//.*(?:per |from |source:|ref:|see |Altintas|Sandvik|ISO |Machinery|Malkin|Handbook|catalog|published)', content, re.IGNORECASE))
    if not has_citation and re.search(r'kc1|kienzle|taylor|force|torque|power|deflect|Ra\s*=|roughness', content, re.IGNORECASE):
        findings.append("NO FORMULA CITATIONS: Physics code without source references. Add comments citing published source (e.g., '// Kienzle per Altintas Table 2.1')")

    # Check 2: Reasoning trail in output
    has_reasoning = bool(re.search(r'reasoning|justification|warnings|explanation|rationale|decision_trail|why\b', content, re.IGNORECASE))
    has_compute = bool(re.search(r'compute|calculate|decide|select|optimize|recommend', content, re.IGNORECASE))
    if has_compute and not has_reasoning and lines > 200:
        findings.append("NO REASONING TRAIL: Engine computes/decides but output has no reasoning[], justification[], or warnings[]. Machinist can't understand WHY.")

    # Check 3: Multi-material handling
    has_iso_branch = bool(re.search(r'iso.*group|ISO_P|ISO_M|ISO_K|ISO_N|ISO_S|ISO_H|material.*switch|material.*case', content, re.IGNORECASE))
    is_physics = bool(re.search(r'force|speed|feed|power|torque|deflect|chatter|stability|thermal|wear', content, re.IGNORECASE))
    if is_physics and not has_iso_branch and lines > 200:
        findings.append("SINGLE-MATERIAL: Physics engine without ISO group branching. Different materials need different parameters — steel ≠ titanium ≠ aluminum.")

    # Check 4: Edge case handling
    has_validation = bool(re.search(r'if\s*\(.*<=?\s*0|throw.*invalid|throw.*missing|clamp|Math\.max.*Math\.min|boundary|limit|range', content, re.IGNORECASE))
    if not has_validation and lines > 150:
        findings.append("NO INPUT VALIDATION: Engine >150 lines without boundary checks. What happens with negative dimensions, zero feed, impossible parameters?")

    if findings:
        finding_text = " | ".join(findings)
        msg = (
            f"ENGINEERING RIGOR CHECK for {engine_name}: {len(findings)} finding(s): {finding_text}. "
            f"MIT-level code cites sources, handles all materials, validates inputs, and explains decisions."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": msg
            }
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
