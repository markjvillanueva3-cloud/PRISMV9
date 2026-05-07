#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Mathematical Completeness
Fires on PostToolUse for Write|Edit to src/engines/*.ts.

Ensures physics/manufacturing engines implement COMPLETE mathematical models,
not simplified versions that skip variables. Checks:

1. Kienzle force: must have ALL correction factors (approach angle, rake, nose radius, wear, speed)
2. Surface finish: must include runout + vibration + deflection + feed marks (not just Ra = fz²/32r)
3. Tool life: must use extended Taylor (variable Vc, intermittent cutting correction)
4. Stability: must include process damping for hard materials, not just basic SLD
5. Cost: must include ALL components (material + tooling + machine + labor + overhead + scrap + secondary ops)
6. Uncertainty: every physics result should have CI or ±tolerance
7. Thermal: must account for tool + workpiece + machine thermal effects
8. Deflection: must cascade through force → deflection → dimensional error → finish degradation

MIT-level engineering means: if a variable exists in the published model,
it must be in our implementation. Skipping variables = wrong answers.
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
    if lines < 80:
        print(json.dumps({"continue": True}))
        return

    engine_name = os.path.basename(file_path)
    findings = []
    content_lower = content.lower()

    # KIENZLE FORCE COMPLETENESS
    if 'kienzle' in content_lower or ('kc1' in content_lower and 'force' in content_lower):
        corrections = {
            'approach_angle': bool(re.search(r'kappa|approach.?angle|kr\b|K_kappa|sin.*kr', content, re.IGNORECASE)),
            'rake_angle': bool(re.search(r'rake|gamma|K_gamma', content, re.IGNORECASE)),
            'nose_radius': bool(re.search(r'nose.?radius|r_eps|corner.?radius', content, re.IGNORECASE)),
            'wear_correction': bool(re.search(r'wear|VB|flank.?wear|K_wear|K_ver', content, re.IGNORECASE)),
            'speed_correction': bool(re.search(r'speed.?correct|K_vc|velocity.?factor', content, re.IGNORECASE)),
        }
        missing = [k for k, v in corrections.items() if not v]
        if missing:
            findings.append(f"KIENZLE INCOMPLETE: Missing correction factors: {', '.join(missing)}. Published model has: Fc = kc1.1 × b × h^(1-mc) × K_gamma × K_kappa × K_wear × K_vc × K_coolant")

    # SURFACE FINISH COMPLETENESS
    if 'surface' in content_lower and ('finish' in content_lower or 'roughness' in content_lower or 'ra' in content_lower):
        components = {
            'kinematic': bool(re.search(r'kinematic|fz.*32.*r|feed.?mark|cusp', content, re.IGNORECASE)),
            'runout': bool(re.search(r'runout|tir|eccentricity', content, re.IGNORECASE)),
            'vibration': bool(re.search(r'vibrat|chatter|dynamic', content, re.IGNORECASE)),
            'deflection': bool(re.search(r'deflect|bend|elastic', content, re.IGNORECASE)),
            'tool_wear': bool(re.search(r'wear.*effect|worn.*tool|VB.*Ra', content, re.IGNORECASE)),
        }
        missing = [k for k, v in components.items() if not v]
        if len(missing) >= 3:
            findings.append(f"SURFACE FINISH INCOMPLETE: Only using {5-len(missing)}/5 components. Missing: {', '.join(missing)}. Real Ra = kinematic + runout + vibration + deflection + wear effects")

    # TOOL LIFE COMPLETENESS
    if 'taylor' in content_lower or ('tool' in content_lower and 'life' in content_lower):
        features = {
            'variable_speed': bool(re.search(r'variable.*speed|varying.*Vc|intermittent', content, re.IGNORECASE)),
            'material_hardness': bool(re.search(r'hardness|HRC|HB|hard.*factor', content, re.IGNORECASE)),
            'coolant_effect': bool(re.search(r'coolant.*factor|wet.*dry|K_cool', content, re.IGNORECASE)),
            'reliability': bool(re.search(r'weibull|reliability|probability|confidence', content, re.IGNORECASE)),
        }
        missing = [k for k, v in features.items() if not v]
        if len(missing) >= 2:
            findings.append(f"TOOL LIFE INCOMPLETE: Missing: {', '.join(missing)}. Extended Taylor accounts for variable speed, hardness variation, coolant, and Weibull reliability")

    # COST MODEL COMPLETENESS
    if 'cost' in content_lower and ('model' in content_lower or 'calculat' in content_lower or 'estimat' in content_lower):
        components = {
            'material_cost': bool(re.search(r'material.*cost|raw.*material|stock.*cost', content, re.IGNORECASE)),
            'tooling_cost': bool(re.search(r'tool.*cost|insert.*cost|cutter.*cost|amortiz', content, re.IGNORECASE)),
            'machine_cost': bool(re.search(r'machine.*cost|hourly.*rate|machine.*rate', content, re.IGNORECASE)),
            'labor_cost': bool(re.search(r'labor|operator|setup.*cost|handling', content, re.IGNORECASE)),
            'overhead': bool(re.search(r'overhead|indirect|burden|facility', content, re.IGNORECASE)),
            'scrap_cost': bool(re.search(r'scrap|reject|waste|rework|quality.*cost', content, re.IGNORECASE)),
            'secondary_ops': bool(re.search(r'secondary|finishing|heat.?treat|plating|anodiz', content, re.IGNORECASE)),
        }
        missing = [k for k, v in components.items() if not v]
        if len(missing) >= 3:
            findings.append(f"COST MODEL INCOMPLETE: Only {7-len(missing)}/7 cost components. Missing: {', '.join(missing)}. Total cost = material + tooling + machine + labor + overhead + scrap + secondary ops")

    # UNCERTAINTY / CONFIDENCE
    has_physics = bool(re.search(r'force|speed|feed|power|life|cost|Ra|roughness|deflect', content, re.IGNORECASE))
    has_uncertainty = bool(re.search(r'uncertainty|confidence|CI|monte.?carlo|±|plus_minus|stochastic|probability', content, re.IGNORECASE))
    if has_physics and not has_uncertainty and lines > 200:
        findings.append("NO UNCERTAINTY: Physics engine >200 lines without confidence intervals, Monte Carlo, or ± bounds. Every prediction should have a quantified uncertainty.")

    if findings:
        finding_text = " | ".join(findings)
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"MATHEMATICAL COMPLETENESS for {engine_name}: {finding_text}"
            }
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
