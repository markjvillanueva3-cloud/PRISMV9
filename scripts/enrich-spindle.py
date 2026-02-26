#!/usr/bin/env python3
"""P2-U02: Machine Spindle Enrichment Script"""
import json, glob, os

SPINDLE_DEFAULTS = {
    "vertical_machining_center": {"max_rpm": 10000, "min_rpm": 50, "power_continuous": 11, "power_30min": 15, "torque_max": 120, "torque_continuous": 70, "spindle_nose": "BT40", "coolant_through": True, "coolant_pressure": 20},
    "3axis_vmc": {"max_rpm": 10000, "min_rpm": 50, "power_continuous": 11, "power_30min": 15, "torque_max": 120, "torque_continuous": 70, "spindle_nose": "BT40", "coolant_through": True, "coolant_pressure": 20},
    "vmc": {"max_rpm": 10000, "min_rpm": 50, "power_continuous": 11, "power_30min": 15, "torque_max": 120, "torque_continuous": 70, "spindle_nose": "BT40", "coolant_through": True, "coolant_pressure": 20},
    "horizontal_machining_center": {"max_rpm": 10000, "min_rpm": 30, "power_continuous": 15, "power_30min": 18.5, "torque_max": 200, "torque_continuous": 120, "spindle_nose": "BT40", "coolant_through": True, "coolant_pressure": 70},
    "hmc": {"max_rpm": 10000, "min_rpm": 30, "power_continuous": 15, "power_30min": 18.5, "torque_max": 200, "torque_continuous": 120, "spindle_nose": "BT40", "coolant_through": True, "coolant_pressure": 70},
    "5axis_machining_center": {"max_rpm": 12000, "min_rpm": 50, "power_continuous": 18.5, "power_30min": 22, "torque_max": 150, "torque_continuous": 90, "spindle_nose": "HSK-A63", "coolant_through": True, "coolant_pressure": 40},
    "5axis_trunnion": {"max_rpm": 12000, "min_rpm": 50, "power_continuous": 18.5, "power_30min": 22, "torque_max": 150, "torque_continuous": 90, "spindle_nose": "HSK-A63", "coolant_through": True, "coolant_pressure": 40},
    "5axis": {"max_rpm": 12000, "min_rpm": 50, "power_continuous": 18.5, "power_30min": 22, "torque_max": 150, "torque_continuous": 90, "spindle_nose": "HSK-A63", "coolant_through": True, "coolant_pressure": 40},
    "5axis_mill_turn": {"max_rpm": 12000, "min_rpm": 10, "power_continuous": 22, "power_30min": 26, "torque_max": 200, "torque_continuous": 130, "spindle_nose": "HSK-A63", "coolant_through": True, "coolant_pressure": 70},
    "turning_center": {"max_rpm": 4500, "min_rpm": 20, "power_continuous": 15, "power_30min": 18.5, "torque_max": 350, "torque_continuous": 200, "spindle_nose": "A2-6", "coolant_through": False, "coolant_pressure": 0},
    "lathe": {"max_rpm": 4500, "min_rpm": 20, "power_continuous": 15, "power_30min": 18.5, "torque_max": 350, "torque_continuous": 200, "spindle_nose": "A2-6", "coolant_through": False, "coolant_pressure": 0},
    "2_axis_slant_bed": {"max_rpm": 4500, "min_rpm": 20, "power_continuous": 15, "power_30min": 18.5, "torque_max": 350, "torque_continuous": 200, "spindle_nose": "A2-6", "coolant_through": False, "coolant_pressure": 0},
    "mill_turn_center": {"max_rpm": 5000, "min_rpm": 10, "power_continuous": 18.5, "power_30min": 22, "torque_max": 450, "torque_continuous": 280, "spindle_nose": "A2-6", "coolant_through": True, "coolant_pressure": 20},
    "swiss_lathe": {"max_rpm": 10000, "min_rpm": 50, "power_continuous": 3.7, "power_30min": 5.5, "torque_max": 16, "torque_continuous": 10, "spindle_nose": "5C", "coolant_through": True, "coolant_pressure": 40},
    "drill_tap": {"max_rpm": 15000, "min_rpm": 100, "power_continuous": 7.5, "power_30min": 11, "torque_max": 40, "torque_continuous": 22, "spindle_nose": "BT30", "coolant_through": True, "coolant_pressure": 20},
}

def match_type(mt):
    n = mt.lower().replace("-", "_").replace(" ", "_")
    if n in SPINDLE_DEFAULTS:
        return SPINDLE_DEFAULTS[n]
    for k, v in SPINDLE_DEFAULTS.items():
        if k in n or n in k:
            return v
    if "5axis" in n or "5_axis" in n:
        return SPINDLE_DEFAULTS["5axis_machining_center"]
    if "vmc" in n or "vertical" in n:
        return SPINDLE_DEFAULTS["vertical_machining_center"]
    if "hmc" in n or ("horizontal" in n and "machining" in n):
        return SPINDLE_DEFAULTS["horizontal_machining_center"]
    if "lathe" in n or "turning" in n or "slant" in n:
        return SPINDLE_DEFAULTS["turning_center"]
    if "swiss" in n:
        return SPINDLE_DEFAULTS["swiss_lathe"]
    if "mill_turn" in n or "multitask" in n:
        return SPINDLE_DEFAULTS["mill_turn_center"]
    if "drill" in n and "tap" in n:
        return SPINDLE_DEFAULTS["drill_tap"]
    return None

machine_dir = "C:/PRISM/extracted/machines"
total = 0
enriched = 0
already_had = 0
no_match = 0
flat_normalized = 0
files_modified = 0

for layer in ["CORE", "ENHANCED", "LEVEL5", "CONSOLIDATED"]:
    layer_dir = os.path.join(machine_dir, layer)
    if not os.path.isdir(layer_dir):
        continue
    for f in sorted(glob.glob(os.path.join(layer_dir, "*.json"))):
        try:
            with open(f, "r") as fh:
                data = json.load(fh)

            modified = False
            if isinstance(data, dict):
                if "machines" in data:
                    machines = data["machines"]
                elif "entries" in data:
                    machines = data["entries"]
                else:
                    machines = [data]
            elif isinstance(data, list):
                machines = data
            else:
                continue

            for m in machines:
                if not isinstance(m, dict):
                    continue
                total += 1

                mt = m.get("type", m.get("machine_type", ""))
                sp = m.get("spindle", {})
                if not isinstance(sp, dict):
                    sp = {}

                # Normalize flat fields into nested spindle
                flat_fields = {
                    "spindle_max_rpm": "max_rpm",
                    "spindle_power_kw": "power_continuous",
                    "spindle_torque_nm": "torque_max",
                    "spindle_taper": "spindle_nose",
                    "maxSpindleSpeed": "max_rpm",
                }
                for flat_key, nested_key in flat_fields.items():
                    if flat_key in m and m[flat_key] and not sp.get(nested_key):
                        sp[nested_key] = m[flat_key]
                        flat_normalized += 1
                        modified = True

                # Pull from spindleMotor (camelCase)
                sm = m.get("spindleMotor")
                if sm and not sp.get("power_continuous"):
                    if isinstance(sm, dict):
                        if sm.get("power_kw"):
                            sp["power_continuous"] = sm["power_kw"]
                        if sm.get("max_rpm"):
                            sp["max_rpm"] = sm["max_rpm"]
                        if sm.get("torque_nm"):
                            sp["torque_max"] = sm["torque_nm"]
                        flat_normalized += 1
                        modified = True
                    elif isinstance(sm, (int, float)):
                        sp["power_continuous"] = sm
                        flat_normalized += 1
                        modified = True

                if m.get("spindleNose") and not sp.get("spindle_nose"):
                    sp["spindle_nose"] = m["spindleNose"]
                    modified = True
                if m.get("spindleBore") and not sp.get("bore_diameter"):
                    sp["bore_diameter"] = m["spindleBore"]
                    modified = True

                # Apply defaults if core fields still missing
                if not sp.get("max_rpm") or sp.get("max_rpm", 0) <= 0:
                    defaults = match_type(mt) if mt else None
                    if defaults:
                        for k, v in defaults.items():
                            if not sp.get(k):
                                sp[k] = v
                        sp["_enriched"] = "default"
                        enriched += 1
                        modified = True
                    else:
                        no_match += 1
                else:
                    already_had += 1
                    defaults = match_type(mt) if mt else None
                    if defaults:
                        for k in ["power_continuous", "power_30min", "torque_max", "torque_continuous", "spindle_nose", "coolant_through"]:
                            if not sp.get(k) and defaults.get(k):
                                sp[k] = defaults[k]
                                modified = True

                # Compute torque from power if missing: T = (P * 9549) / n
                if sp.get("power_continuous") and sp.get("max_rpm") and not sp.get("torque_max"):
                    sp["torque_max"] = round((sp["power_continuous"] * 9549) / sp["max_rpm"], 1)
                    modified = True

                m["spindle"] = sp

            if modified:
                with open(f, "w") as fh:
                    json.dump(data, fh, indent=2)
                files_modified += 1
        except Exception as e:
            print(f"ERROR {os.path.basename(f)}: {e}")

print("=== P2-U02: MACHINE SPINDLE ENRICHMENT COMPLETE ===")
print(f"Total machines: {total}")
print(f"Already had spindle rpm: {already_had}")
print(f"Enriched from defaults: {enriched}")
print(f"Flat fields normalized: {flat_normalized}")
print(f"No type match: {no_match}")
print(f"Files modified: {files_modified}")
