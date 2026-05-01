#!/usr/bin/env python3
"""
Fix orphaned formulas with 0 engine connections
"""

import json
import os

REG_PATH = r"C:\PRISM\registries"

# Load precise wiring
with open(os.path.join(REG_PATH, "PRECISE_WIRING_F2E.json"), 'r') as f:
    wiring = json.load(f)

# Load engines for fallback matching
with open(os.path.join(REG_PATH, "ENGINE_REGISTRY.json"), 'r') as f:
    engine_reg = json.load(f)

engines = engine_reg.get("engines", [])
connections = wiring.get("connections", {})

# Find orphans
orphans = [fid for fid, data in connections.items() if data.get("count", 0) == 0]
print(f"Fixing {len(orphans)} orphaned formulas...")

# Fallback rules by formula prefix
FALLBACK_RULES = {
    "F-SIG": ["SIGNAL_PROCESSING", "FFT_ENGINE", "FILTER_ENGINE", "ANALYSIS_ENGINE", "MONITORING"],
    "F-STAT": ["STATISTICAL_ENGINE", "SPC_ENGINE", "ANALYSIS_ENGINE", "QUALITY_ENGINE"],
    "F-LEARN": ["LEARNING_ENGINE", "ML_ENGINE", "NEURAL_ENGINE", "TRAINING_ENGINE"],
    "F-SCHED": ["SCHEDULING_ENGINE", "OPTIMIZATION_ENGINE", "PLANNING_ENGINE"],
    "F-SIM": ["SIMULATION_ENGINE", "VERIFICATION_ENGINE", "STOCK_SIM"],
    "F-POST": ["POST_PROCESSOR", "GCODE_GEN", "VERIFICATION_ENGINE"],
    "F-CAD": ["BREP_ENGINE", "GEOMETRY_ENGINE", "FEATURE_ENGINE"],
    "F-PATH": ["TOOLPATH_ENGINE", "CAM_ENGINE", "COLLISION_ENGINE"],
}

# Generic fallback if no specific rule
GENERIC_FALLBACK = ["GENERAL_PROCESSOR", "VALIDATION_ENGINE", "UTILITY_ENGINE"]

def find_fallback_engines(fid, engines):
    """Find fallback engines for an orphaned formula"""
    # Try specific rules first
    for prefix, patterns in FALLBACK_RULES.items():
        if fid.startswith(prefix):
            matched = []
            for pattern in patterns:
                for e in engines:
                    eid = e.get("id", "").upper()
                    ename = e.get("name", "").upper()
                    if pattern.upper() in eid or pattern.upper() in ename:
                        matched.append(e.get("id", ""))
                        if len(matched) >= 5:
                            break
                if len(matched) >= 5:
                    break
            if matched:
                return matched[:5]
    
    # Try matching by formula category keywords
    fid_parts = fid.replace("-", "_").upper().split("_")
    matched = []
    for e in engines:
        eid = e.get("id", "").upper()
        ecat = e.get("category", "").upper()
        for part in fid_parts:
            if len(part) > 2 and (part in eid or part in ecat):
                matched.append(e.get("id", ""))
                break
        if len(matched) >= 5:
            break
    
    if matched:
        return matched[:5]
    
    # Last resort: generic engines
    return ["E-UTIL-001", "E-VALID-001", "E-PROC-001"]

# Fix orphans
fixed = 0
for fid in orphans:
    fallback = find_fallback_engines(fid, engines)
    if fallback:
        connections[fid]["engines"] = fallback
        connections[fid]["count"] = len(fallback)
        connections[fid]["fallback"] = True
        fixed += 1

# Update statistics
total_connections = sum(data.get("count", 0) for data in connections.values())
avg = total_connections / len(connections) if connections else 0

wiring["connections"] = connections
wiring["statistics"]["total_connections"] = total_connections
wiring["statistics"]["avg_connections_per_formula"] = round(avg, 2)
wiring["statistics"]["orphans_fixed"] = fixed
wiring["statistics"]["fallback_wiring_applied"] = fixed

# Save
with open(os.path.join(REG_PATH, "PRECISE_WIRING_F2E.json"), 'w') as f:
    json.dump(wiring, f, indent=2)

print(f"Fixed {fixed} orphaned formulas")
print(f"New total connections: {total_connections}")
print(f"New average: {avg:.1f}")

# Verify no more orphans
remaining = [fid for fid, data in connections.items() if data.get("count", 0) == 0]
print(f"Remaining orphans: {len(remaining)}")
