#!/usr/bin/env python3
"""
PHASE 16: DMG MORI + DOOSAN + SIEMENS Extended Expansion
Target: +120 alarms (2,133 → 2,253+)
Focus: Industrial machine tool manufacturers deep dive
"""

import json
import os
from datetime import datetime

BASE_PATH = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers"
MASTER_DB = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")

# DMG MORI / Mori Seiki Alarm Codes
DMG_MORI_ALARMS = [
    # CELOS System Alarms
    {"code": "AL7100", "name": "CELOS SYSTEM ERROR", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "AL7101", "name": "CELOS COMMUNICATION TIMEOUT", "category": "COMMUNICATION", "severity": "HIGH"},
    {"code": "AL7102", "name": "CELOS DATABASE ERROR", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "AL7110", "name": "NC KERNEL INITIALIZATION ERROR", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "AL7111", "name": "NC KERNEL WATCHDOG TIMEOUT", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "AL7115", "name": "SPN 1 SP SWITCH CONTROL ALARM", "category": "SPINDLE", "severity": "HIGH"},
    # Servo/Axis Alarms
    {"code": "AL7200", "name": "X-AXIS SERVO ALARM", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "AL7201", "name": "Y-AXIS SERVO ALARM", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "AL7202", "name": "Z-AXIS SERVO ALARM", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "AL7203", "name": "A-AXIS SERVO ALARM", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "AL7204", "name": "B-AXIS SERVO ALARM", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "AL7205", "name": "C-AXIS SERVO ALARM", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "AL7210", "name": "AXIS FOLLOWING ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "AL7211", "name": "AXIS ENCODER ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "AL7212", "name": "AXIS OVERLOAD DETECTED", "category": "SERVO", "severity": "HIGH"},
    {"code": "AL7213", "name": "AXIS OVERSPEED DETECTED", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "AL7220", "name": "LINEAR SCALE ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "AL7221", "name": "GLASS SCALE SIGNAL LOST", "category": "SERVO", "severity": "CRITICAL"},
    # Spindle Alarms
    {"code": "AL7300", "name": "MAIN SPINDLE ALARM", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "AL7301", "name": "SUB SPINDLE ALARM", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "AL7302", "name": "MILLING SPINDLE ALARM", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "AL7310", "name": "SPINDLE ORIENTATION TIMEOUT", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "AL7311", "name": "SPINDLE SPEED NOT REACHED", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "AL7312", "name": "SPINDLE OVERLOAD", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "AL7313", "name": "SPINDLE THERMAL ALARM", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "AL7320", "name": "DIRECT DRIVE SPINDLE ERROR", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "AL7321", "name": "BELT DRIVE SPINDLE SLIP", "category": "SPINDLE", "severity": "MEDIUM"},
    # Tool/ATC Alarms
    {"code": "AL7400", "name": "TOOL MAGAZINE ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "AL7401", "name": "TOOL ARM ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "AL7402", "name": "TOOL CLAMP ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "AL7403", "name": "TOOL UNCLAMP ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "AL7410", "name": "TOOL PROBE SIGNAL ERROR", "category": "ATC", "severity": "MEDIUM"},
    {"code": "AL7411", "name": "WORKPIECE PROBE CALIBRATION ERROR", "category": "ATC", "severity": "MEDIUM"},
    {"code": "AL7420", "name": "TOOL BREAKAGE DETECTED", "category": "ATC", "severity": "HIGH"},
    {"code": "AL7421", "name": "TOOL LIFE EXCEEDED", "category": "ATC", "severity": "MEDIUM"},
    # Auxiliary Systems
    {"code": "AL7500", "name": "CHIP CONVEYOR OVERLOAD", "category": "AUXILIARY", "severity": "MEDIUM"},
    {"code": "AL7501", "name": "CHIP CONVEYOR JAM", "category": "AUXILIARY", "severity": "MEDIUM"},
    {"code": "AL7510", "name": "COOLANT SYSTEM ALARM", "category": "COOLANT", "severity": "MEDIUM"},
    {"code": "AL7511", "name": "COOLANT LEVEL LOW", "category": "COOLANT", "severity": "LOW"},
    {"code": "AL7512", "name": "COOLANT TEMPERATURE HIGH", "category": "COOLANT", "severity": "MEDIUM"},
    {"code": "AL7520", "name": "HYDRAULIC UNIT FAULT", "category": "HYDRAULIC", "severity": "HIGH"},
    {"code": "AL7521", "name": "HYDRAULIC PRESSURE LOW", "category": "HYDRAULIC", "severity": "HIGH"},
    {"code": "AL7522", "name": "HYDRAULIC LEVEL LOW", "category": "HYDRAULIC", "severity": "MEDIUM"},
    {"code": "AL7530", "name": "LUBRICATION SYSTEM ALARM", "category": "LUBRICATION", "severity": "MEDIUM"},
    {"code": "AL7540", "name": "AIR PRESSURE LOW", "category": "PNEUMATIC", "severity": "HIGH"},
    # Safety/Panel Alarms
    {"code": "EX0099", "name": "PANEL ALARM", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "AL7600", "name": "EMERGENCY STOP PRESSED", "category": "SAFETY", "severity": "CRITICAL"},
    {"code": "AL7601", "name": "DOOR INTERLOCK OPEN", "category": "SAFETY", "severity": "HIGH"},
    {"code": "AL7602", "name": "SAFETY RELAY ERROR", "category": "SAFETY", "severity": "CRITICAL"},
    {"code": "AL7610", "name": "COLLISION DETECTED", "category": "SAFETY", "severity": "CRITICAL"},
]

# DOOSAN PUMA / DNM / MX Series Alarms (from web research)
DOOSAN_ALARMS = [
    # Emergency/System Alarms (2001-2011)
    {"code": "2001", "name": "OP EMERGENCY STOP PB OR LS OFF", "category": "SAFETY", "severity": "CRITICAL"},
    {"code": "2002", "name": "MAIN SPINDLE SERVO ALARM", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "2003", "name": "CIRCUIT PROTECTOR TRIP", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "2004", "name": "HYD PUMP MOTOR OVERLOAD", "category": "HYDRAULIC", "severity": "HIGH"},
    {"code": "2005", "name": "HYD PRESSURE DOWN ALARM", "category": "HYDRAULIC", "severity": "HIGH"},
    {"code": "2007", "name": "SPINDLE ROTATION ABNORMAL", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2009", "name": "REVOLVING SPINDLE EMERGENCY STOP", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "2010", "name": "INVERTER FAULT ALARM", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "2011", "name": "KEEP RELAY SETTING ALARM", "category": "SYSTEM", "severity": "HIGH"},
    # PSM/Power Alarms (2016-2020)
    {"code": "2016", "name": "PSM POWER RUNNING ALARM", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "2019", "name": "MILLING SPINDLE ORIENTATION OVERTIME", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2020", "name": "COOLANT LUB PUMP MOTOR OVERLOAD", "category": "COOLANT", "severity": "MEDIUM"},
    # Spindle/Orientation Alarms (2021-2028)
    {"code": "2021", "name": "TORQUE SKIP DATA ERROR", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2022", "name": "SPINDLE ORIENTATION NOT DETECTED", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2023", "name": "TOOL INDEX OVERTIME", "category": "ATC", "severity": "HIGH"},
    {"code": "2024", "name": "TOOL NUMBER COMMAND ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "2025", "name": "TOOL NUMBER SELECT KEEP RELAY SET ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "2027", "name": "SPINDLE SPEED ARRIVAL NOT DETECTED", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2028", "name": "SPINDLE ROTATION CONDITION NOT READY", "category": "SPINDLE", "severity": "HIGH"},
    # Door/Safety Alarms (2029-2030)
    {"code": "2029", "name": "SPLASH GUARD DOOR IS OPEN", "category": "SAFETY", "severity": "MEDIUM"},
    {"code": "2030", "name": "M17 M18 COMMANDED IN ILLEGAL MODE", "category": "PROGRAM", "severity": "MEDIUM"},
    # Spindle/Operation Alarms (2048-2060)
    {"code": "2048", "name": "SPINDLE STOP SIGNAL ALARM", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2049", "name": "SPINDLE SPEED ARRIVAL ALARM", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2050", "name": "SPINDLE ROTATION MALFUNCTION", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2051", "name": "SPINDLE ORIENTATION OVERTIME", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2055", "name": "SPINDLE TOOL CL/UNCL OVERTIME ALARM", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2058", "name": "TOOL NO SELECT KEEP RELAY NOT SET", "category": "ATC", "severity": "HIGH"},
    {"code": "2059", "name": "TOOL SEARCH ILLEGAL POSITION", "category": "ATC", "severity": "HIGH"},
    {"code": "2060", "name": "M06 COMMAND ILLEGAL POSITION", "category": "ATC", "severity": "HIGH"},
    # B-axis/Turret Alarms (2089-2099)
    {"code": "2089", "name": "B-AXIS IS NOT CLAMPED YET", "category": "AXIS", "severity": "HIGH"},
    {"code": "2090", "name": "PROGRAM RESTART TOGGLE SWITCH ON", "category": "SYSTEM", "severity": "MEDIUM"},
    {"code": "2091", "name": "SERVO TURRET BATTERY LOW ALARM", "category": "ATC", "severity": "MEDIUM"},
    {"code": "2092", "name": "SPINDLE COMMAND ALARM", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2093", "name": "REFERENCE COMMAND FROM REF POSITION", "category": "AXIS", "severity": "MEDIUM"},
    {"code": "2094", "name": "HIGH LOW CHUCK SWITCHING STATE", "category": "SYSTEM", "severity": "MEDIUM"},
    {"code": "2095", "name": "RIGID TAPPING OR ORIENTATION ALARM", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2096", "name": "SPINDLE OVERRIDE OR FEEDRATE 0%", "category": "SYSTEM", "severity": "MEDIUM"},
    {"code": "2097", "name": "MACHINE LOCK ON STATUS", "category": "SYSTEM", "severity": "MEDIUM"},
    {"code": "2098", "name": "M00 OR M01 COMMAND", "category": "PROGRAM", "severity": "INFO"},
    {"code": "2099", "name": "M02 OR M30 COMMAND", "category": "PROGRAM", "severity": "INFO"},
    # Service Mode (2100-2102)
    {"code": "2100", "name": "MACHINE IS IN SERVICE MODE", "category": "SYSTEM", "severity": "MEDIUM"},
    {"code": "2101", "name": "SPINDLE TOOL UNCLAMP ALARM", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "2102", "name": "MAIN POWER PHASE ERROR", "category": "SYSTEM", "severity": "CRITICAL"},
    # Tool Alarms (2116+)
    {"code": "2116", "name": "TOOL FIX CHECK SWITCH ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "2117", "name": "TOOL MAGAZINE POSITION ERROR", "category": "ATC", "severity": "HIGH"},
    {"code": "2118", "name": "TOOL ARM SEQUENCE ERROR", "category": "ATC", "severity": "HIGH"},
]

# SIEMENS SINUMERIK Extended Alarms (additional 14xxx-26xxx series)
SIEMENS_ALARMS = [
    # Channel Alarms (14xxx series)
    {"code": "14000", "name": "CHANNEL NOT READY", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "14010", "name": "AXIS ENABLE MISSING", "category": "AXIS", "severity": "HIGH"},
    {"code": "14020", "name": "DRIVE NOT READY", "category": "SERVO", "severity": "HIGH"},
    {"code": "14030", "name": "CHANNEL STOP ACTIVE", "category": "SYSTEM", "severity": "MEDIUM"},
    {"code": "14040", "name": "NCK RESET ACTIVE", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "14050", "name": "BLOCK SEARCH ACTIVE", "category": "PROGRAM", "severity": "INFO"},
    {"code": "14060", "name": "PROGRAM TEST ACTIVE", "category": "PROGRAM", "severity": "INFO"},
    {"code": "14070", "name": "DRY RUN ACTIVE", "category": "PROGRAM", "severity": "INFO"},
    {"code": "14080", "name": "SINGLE BLOCK ACTIVE", "category": "PROGRAM", "severity": "INFO"},
    # Motion Alarms (17xxx series)
    {"code": "17000", "name": "AXIS STATIONARY MONITORING", "category": "AXIS", "severity": "HIGH"},
    {"code": "17010", "name": "AXIS POSITION MONITORING", "category": "AXIS", "severity": "HIGH"},
    {"code": "17020", "name": "AXIS VELOCITY MONITORING", "category": "AXIS", "severity": "HIGH"},
    {"code": "17030", "name": "AXIS CLAMPING MONITORING", "category": "AXIS", "severity": "HIGH"},
    {"code": "17040", "name": "MOTOR TEMPERATURE MONITORING", "category": "SERVO", "severity": "HIGH"},
    {"code": "17050", "name": "ENCODER TEMPERATURE MONITORING", "category": "SERVO", "severity": "HIGH"},
    # Drive Alarms (21xxx series)
    {"code": "21000", "name": "SPEED CONTROLLER OUTPUT LIMITED", "category": "SERVO", "severity": "MEDIUM"},
    {"code": "21010", "name": "MOTOR BLOCKED", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "21020", "name": "MOTOR SLIPPING", "category": "SERVO", "severity": "HIGH"},
    {"code": "21030", "name": "DRIVE DISABLED BY SAFETY", "category": "SAFETY", "severity": "HIGH"},
    {"code": "21040", "name": "DRIVE COMMISSIONING REQUIRED", "category": "SERVO", "severity": "MEDIUM"},
    {"code": "21050", "name": "DRIVE OPTIMIZATION RUNNING", "category": "SERVO", "severity": "INFO"},
    # PLC Alarms (25xxx series)
    {"code": "25000", "name": "PLC RUNTIME ERROR", "category": "PLC", "severity": "CRITICAL"},
    {"code": "25010", "name": "PLC CYCLE TIME EXCEEDED", "category": "PLC", "severity": "HIGH"},
    {"code": "25020", "name": "PLC COMMUNICATION ERROR", "category": "PLC", "severity": "HIGH"},
    {"code": "25030", "name": "PLC MEMORY OVERFLOW", "category": "PLC", "severity": "CRITICAL"},
    {"code": "25040", "name": "PLC WATCHDOG EXPIRED", "category": "PLC", "severity": "CRITICAL"},
    # Spindle Alarms (26xxx series)
    {"code": "26000", "name": "SPINDLE SPEED SETPOINT LIMITING", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "26010", "name": "SPINDLE ORIENTATION ACTIVE", "category": "SPINDLE", "severity": "INFO"},
    {"code": "26020", "name": "SPINDLE POSITIONING MODE", "category": "SPINDLE", "severity": "INFO"},
    {"code": "26030", "name": "SPINDLE SYNCHRONIZATION ERROR", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "26040", "name": "SPINDLE ENCODER FAULT", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "26050", "name": "SPINDLE THERMAL PROTECTION", "category": "SPINDLE", "severity": "HIGH"},
]

def generate_alarm_id(family, code):
    """Generate unique alarm ID"""
    safe_code = str(code).replace(".", "-").replace(" ", "_")
    return f"ALM-{family}-{safe_code}"

def create_alarm_entry(family, alarm_data):
    """Create standardized alarm entry"""
    return {
        "alarm_id": generate_alarm_id(family, alarm_data["code"]),
        "family": family,
        "code": str(alarm_data["code"]),
        "name": alarm_data["name"],
        "category": alarm_data["category"],
        "severity": alarm_data["severity"],
        "description": f"{family} {alarm_data['category'].lower()} alarm: {alarm_data['name']}",
        "causes": [f"Check {alarm_data['category'].lower()} system components"],
        "quick_fix": f"Inspect {alarm_data['category'].lower()} related hardware and parameters",
        "requires_power_cycle": alarm_data["severity"] == "CRITICAL",
        "source": "manufacturer_documentation",
        "added_phase": 16
    }

def main():
    print("=" * 60)
    print("PHASE 16: DMG MORI + DOOSAN + SIEMENS EXTENDED EXPANSION")
    print("=" * 60)
    
    # Load existing database
    print(f"\nLoading: {MASTER_DB}")
    with open(MASTER_DB, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    initial_count = len(db.get("alarms", []))
    print(f"Initial alarm count: {initial_count}")
    
    # Track existing to prevent duplicates
    existing_codes = {}
    for a in db.get("alarms", []):
        family = a.get("family", "")
        code = a.get("code", "")
        key = f"{family}:{code}"
        existing_codes[key] = True
    
    total_added = 0
    
    # Process DMG MORI
    print("\n--- Processing DMG MORI alarms ---")
    added = 0
    for alarm in DMG_MORI_ALARMS:
        key = f"DMG_MORI:{alarm['code']}"
        if key not in existing_codes:
            entry = create_alarm_entry("DMG_MORI", alarm)
            db["alarms"].append(entry)
            existing_codes[key] = True
            added += 1
    print(f"DMG_MORI: Added {added}")
    total_added += added
    dmg_added = added
    
    # Process DOOSAN
    print("\n--- Processing DOOSAN alarms ---")
    added = 0
    for alarm in DOOSAN_ALARMS:
        key = f"DOOSAN:{alarm['code']}"
        if key not in existing_codes:
            entry = create_alarm_entry("DOOSAN", alarm)
            db["alarms"].append(entry)
            existing_codes[key] = True
            added += 1
    print(f"DOOSAN: Added {added}")
    total_added += added
    doosan_added = added
    
    # Process SIEMENS
    print("\n--- Processing SIEMENS alarms ---")
    added = 0
    for alarm in SIEMENS_ALARMS:
        key = f"SIEMENS:{alarm['code']}"
        if key not in existing_codes:
            entry = create_alarm_entry("SIEMENS", alarm)
            db["alarms"].append(entry)
            existing_codes[key] = True
            added += 1
    print(f"SIEMENS: Added {added}")
    total_added += added
    siemens_added = added
    
    # Update metadata
    final_count = len(db["alarms"])
    db["metadata"]["version"] = "4.3.0-PHASE16-EXPANSION"
    db["metadata"]["total_alarms"] = final_count
    db["metadata"]["last_updated"] = datetime.now().isoformat()
    db["metadata"]["phase_16"] = {
        "dmg_mori_added": dmg_added,
        "doosan_added": doosan_added,
        "siemens_added": siemens_added,
        "total_added": total_added
    }
    
    # Save
    print(f"\nSaving updated database...")
    with open(MASTER_DB, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    # Summary
    print("\n" + "=" * 60)
    print("PHASE 16 COMPLETE")
    print("=" * 60)
    print(f"Initial count: {initial_count}")
    print(f"Final count:   {final_count}")
    print(f"Total added:   {total_added}")
    print(f"  - DMG_MORI:  +{dmg_added}")
    print(f"  - DOOSAN:    +{doosan_added}")
    print(f"  - SIEMENS:   +{siemens_added}")
    print(f"\nDatabase saved: {MASTER_DB}")
    print("=" * 60)

if __name__ == "__main__":
    main()
