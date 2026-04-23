#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Output Validation
Fires on PostToolUse for Write|Edit to src/engines/*.ts.

After engine code is written, checks if the engine has a compute/calculate/run method
and verifies the output structure includes:
1. Numeric results (not just strings/booleans)
2. Units on physical quantities (mm, m/min, N, W, μm — not naked numbers)
3. Confidence/uncertainty indicators
4. Warnings array for edge cases
5. Multiple material/operation coverage (not single hardcoded path)

This catches "looks like it works" code that actually only handles one scenario.
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

    lines = len(content.split('\n'))
    if lines < 100:
        print(json.dumps({"continue": True}))
        return

    engine_name = os.path.basename(file_path)
    findings = []

    # Check: does return type include units?
    has_units = bool(re.search(r'_mm|_m_min|_mmin|_N|_W|_um|_kW|_MPa|_HRC|_degrees|_percent|_rpm|_rev', content))
    has_physics_output = bool(re.search(r'force|speed|feed|power|torque|temperature|roughness|deflection|pressure', content, re.IGNORECASE))
    if has_physics_output and not has_units:
        findings.append("NO UNITS ON OUTPUT: Physics quantities returned without unit suffixes (_mm, _N, _m_min). Naked numbers are ambiguous — is force in N or kN? Is speed in m/min or mm/min?")

    # Check: does output have warnings array?
    has_warnings = bool(re.search(r'warnings\s*[:\[]|warnings\s*=\s*\[', content))
    has_return = bool(re.search(r'return\s*\{', content))
    if has_return and not has_warnings and lines > 200:
        findings.append("NO WARNINGS ARRAY: Engine >200 lines with no warnings[] in output. Edge cases, limit violations, and recommendations should be communicated to the user.")

    # Check: does engine handle multiple scenarios or just one path?
    switch_count = len(re.findall(r'case\s+["\']|if\s*\(.*(?:===|==)\s*["\']', content))
    if switch_count < 2 and lines > 300 and has_physics_output:
        findings.append("SINGLE-PATH LOGIC: Engine >300 lines with <2 conditional branches for different scenarios. Real manufacturing has multiple operation types, material groups, and machine configurations.")

    # Check: does engine have a validation/sanity check on output?
    has_output_check = bool(re.search(r'if\s*\(.*(?:result|output|computed|calculated).*(?:[<>]=?|===)\s*\d|isNaN|isFinite|sanity|validate.*output', content, re.IGNORECASE))
    if not has_output_check and has_physics_output and lines > 200:
        findings.append("NO OUTPUT VALIDATION: Physics engine doesn't sanity-check its own output. A force of -500N or speed of 99999 m/min should trigger a warning, not be returned silently.")

    if findings:
        finding_text = " | ".join(findings)
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"OUTPUT QUALITY for {engine_name}: {finding_text}"
            }
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
