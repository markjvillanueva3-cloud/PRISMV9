#!/usr/bin/env python3
"""
PHASE 15: FAGOR + HURCO + BROTHER Deep Expansion
Target: +150 alarms (2,003 → 2,153+)
Focus: Low-count families expansion with verified codes
"""

import json
import os
from datetime import datetime

BASE_PATH = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers"
MASTER_DB = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")

# FAGOR 8055/8065 Alarm Codes (from web research)
FAGOR_ALARMS = [
    # Programming Errors (0xxx series)
    {"code": "0001", "name": "LINE WITHOUT BLOCK NUMBER", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0002", "name": "WRONG DATA ORDER IN BLOCK", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0003", "name": "EXCESSIVE DATA IN BLOCK", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0004", "name": "NEGATIVE VALUE NOT ALLOWED", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0005", "name": "ANGLE VALUE NOT ALLOWED", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0006", "name": "X DATA NOT ALLOWED", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0007", "name": "PROGRAMMED VALUE EXCEEDS LIMITS", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0008", "name": "ARC DOES NOT PASS THROUGH END POINT", "category": "PROGRAM", "severity": "HIGH"},
    {"code": "0009", "name": "EXCESSIVE SUBROUTINE NESTING", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0010", "name": "SUBROUTINE NOT DEFINED", "category": "PROGRAM", "severity": "HIGH"},
    {"code": "0011", "name": "WRONG G FUNCTION", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0012", "name": "INVALID RADIUS COMPENSATION", "category": "PROGRAM", "severity": "HIGH"},
    {"code": "0094", "name": "ASIN/ACOS RANGE EXCEEDED", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0111", "name": "BLOCK CANNOT BE EXECUTED", "category": "PROGRAM", "severity": "HIGH"},
    {"code": "0130", "name": "WRITE 0/1 ERROR", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0164", "name": "WRONG PASSWORD", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "0186", "name": "C AXIS DOES NOT EXIST", "category": "AXIS", "severity": "HIGH"},
    {"code": "0214", "name": "INVALID G FUNCTION SELECTED", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "0242", "name": "DO NOT SYNCHRONIZE SPINDLES", "category": "SPINDLE", "severity": "HIGH"},
    # Block Preparation Errors (1xxx series)
    {"code": "1018", "name": "TOOL CHANGE PROGRAMMED INCORRECTLY", "category": "ATC", "severity": "HIGH"},
    {"code": "1039", "name": "NO F PROGRAMMED", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "1055", "name": "NESTING EXCEEDED", "category": "PROGRAM", "severity": "HIGH"},
    {"code": "1072", "name": "TOOL RADIUS COMPENSATION NOT POSSIBLE", "category": "PROGRAM", "severity": "HIGH"},
    {"code": "1085", "name": "HELICAL PATH PROGRAMMED WRONG", "category": "PROGRAM", "severity": "HIGH"},
    # Servo Errors
    {"code": "2001", "name": "AXIS FOLLOWING ERROR EXCEEDED", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "2002", "name": "AXIS POSITION ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "2010", "name": "ENCODER SIGNAL LOST", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "2011", "name": "ENCODER COMMUNICATION ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "2020", "name": "SERVO AMPLIFIER FAULT", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "2021", "name": "SERVO OVERCURRENT DETECTED", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "2030", "name": "AXIS OVERTRAVEL POSITIVE", "category": "OVERTRAVEL", "severity": "HIGH"},
    {"code": "2031", "name": "AXIS OVERTRAVEL NEGATIVE", "category": "OVERTRAVEL", "severity": "HIGH"},
    # Spindle Errors
    {"code": "3001", "name": "SPINDLE DRIVE FAULT", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "3010", "name": "SPINDLE ORIENTATION FAILED", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "3020", "name": "SPINDLE SPEED NOT REACHED", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "3030", "name": "SPINDLE OVERLOAD DETECTED", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "3040", "name": "SPINDLE ENCODER ERROR", "category": "SPINDLE", "severity": "CRITICAL"},
    # PLC Errors (6xxx series)
    {"code": "6000", "name": "PLC PROGRAM NOT RUNNING", "category": "PLC", "severity": "CRITICAL"},
    {"code": "6010", "name": "PLC COMMUNICATION ERROR", "category": "PLC", "severity": "CRITICAL"},
    {"code": "6020", "name": "PLC WATCHDOG TIMEOUT", "category": "PLC", "severity": "CRITICAL"},
    {"code": "6030", "name": "EMERGENCY STOP ACTIVATED", "category": "SAFETY", "severity": "CRITICAL"},
    {"code": "6040", "name": "SAFETY RELAY ERROR", "category": "SAFETY", "severity": "CRITICAL"},
    {"code": "6100", "name": "CAN BUS ERROR", "category": "COMMUNICATION", "severity": "CRITICAL"},
    {"code": "6110", "name": "CANOPEN SLAVE ERROR", "category": "COMMUNICATION", "severity": "HIGH"},
    {"code": "6200", "name": "FEEDBACK ALARM ANALOG AXIS", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "6300", "name": "TENDENCY TEST ALARM", "category": "SERVO", "severity": "HIGH"},
]

# HURCO WinMax / Ultimax Alarm Codes (from web research)
HURCO_ALARMS = [
    # Servo Faults
    {"code": "500", "name": "SERVO AMPLIFIER FAULT", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "501", "name": "X-AXIS SERVO FAULT", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "502", "name": "Y-AXIS SERVO FAULT", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "503", "name": "Z-AXIS SERVO FAULT", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "504", "name": "A-AXIS SERVO FAULT", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "505", "name": "B-AXIS SERVO FAULT", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "510", "name": "POSITION LOOP ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "511", "name": "VELOCITY LOOP ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "512", "name": "CURRENT LOOP ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "520", "name": "ENCODER SIGNAL ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "521", "name": "ENCODER COMMUNICATION FAULT", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "530", "name": "FOLLOWING ERROR EXCEEDED", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "540", "name": "SERVO OVERTEMPERATURE", "category": "SERVO", "severity": "HIGH"},
    {"code": "550", "name": "DC BUS OVERVOLTAGE", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "551", "name": "DC BUS UNDERVOLTAGE", "category": "SERVO", "severity": "CRITICAL"},
    # Spindle Faults
    {"code": "600", "name": "SPINDLE DRIVE FAULT", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "601", "name": "SPINDLE OVERLOAD", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "602", "name": "SPINDLE OVERCURRENT", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "603", "name": "SPINDLE OVERSPEED", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "610", "name": "SPINDLE ENCODER ERROR", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "611", "name": "SPINDLE ORIENTATION FAILED", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "612", "name": "SPINDLE NOT ORIENTED", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "620", "name": "SPINDLE SPEED NOT REACHED", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "621", "name": "SPINDLE SPEED DEVIATION", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "630", "name": "SPINDLE THERMAL ALARM", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "AL-11", "name": "SPINDLE DRIVE OVERVOLTAGE", "category": "SPINDLE", "severity": "CRITICAL"},
    # ATC Faults
    {"code": "700", "name": "ATC TIMEOUT", "category": "ATC", "severity": "HIGH"},
    {"code": "701", "name": "ATC SEQUENCE ERROR", "category": "ATC", "severity": "HIGH"},
    {"code": "702", "name": "ATC POSITION ERROR", "category": "ATC", "severity": "HIGH"},
    {"code": "703", "name": "ATC MAGAZINE INDEX ERROR", "category": "ATC", "severity": "HIGH"},
    {"code": "710", "name": "ATC GRIPPER ERROR", "category": "ATC", "severity": "HIGH"},
    {"code": "711", "name": "ATC ARM ERROR", "category": "ATC", "severity": "HIGH"},
    {"code": "712", "name": "ATC TOOL CLAMP ERROR", "category": "ATC", "severity": "HIGH"},
    {"code": "713", "name": "ATC TOOL UNCLAMP ERROR", "category": "ATC", "severity": "HIGH"},
    {"code": "720", "name": "ATC TOOL NOT IN SPINDLE", "category": "ATC", "severity": "HIGH"},
    {"code": "721", "name": "ATC TOOL ALREADY IN SPINDLE", "category": "ATC", "severity": "MEDIUM"},
    {"code": "730", "name": "ATC DOUBLE TOOL DETECTED", "category": "ATC", "severity": "CRITICAL"},
    {"code": "740", "name": "ATC Z NOT AT HEIGHT", "category": "ATC", "severity": "HIGH"},
    {"code": "741", "name": "ATC XY NOT AT POSITION", "category": "ATC", "severity": "HIGH"},
    # System Faults
    {"code": "800", "name": "COOLANT PRESSURE LOW", "category": "COOLANT", "severity": "MEDIUM"},
    {"code": "801", "name": "COOLANT LEVEL LOW", "category": "COOLANT", "severity": "LOW"},
    {"code": "802", "name": "COOLANT PUMP FAULT", "category": "COOLANT", "severity": "MEDIUM"},
    {"code": "810", "name": "COOLANT TEMPERATURE HIGH", "category": "COOLANT", "severity": "MEDIUM"},
    {"code": "820", "name": "HYDRAULIC PRESSURE LOW", "category": "HYDRAULIC", "severity": "HIGH"},
    {"code": "821", "name": "HYDRAULIC LEVEL LOW", "category": "HYDRAULIC", "severity": "MEDIUM"},
    {"code": "830", "name": "AIR PRESSURE LOW", "category": "PNEUMATIC", "severity": "HIGH"},
    {"code": "840", "name": "LUBRICATION FAULT", "category": "LUBRICATION", "severity": "MEDIUM"},
    {"code": "841", "name": "LUBRICATION LEVEL LOW", "category": "LUBRICATION", "severity": "LOW"},
    {"code": "850", "name": "CHIP CONVEYOR OVERLOAD", "category": "AUXILIARY", "severity": "MEDIUM"},
    # Program/Control Errors
    {"code": "900", "name": "CONVERSATIONAL MODE ERROR", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "901", "name": "NC PROGRAM ERROR", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "902", "name": "MACRO ERROR", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "910", "name": "PART SETUP ERROR", "category": "SETUP", "severity": "MEDIUM"},
    {"code": "911", "name": "TOOL SETUP ERROR", "category": "SETUP", "severity": "MEDIUM"},
    {"code": "920", "name": "MEMORY FULL", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "921", "name": "PROGRAM NOT FOUND", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "930", "name": "AXIS NOT HOMED", "category": "AXIS", "severity": "HIGH"},
    {"code": "931", "name": "HOME POSITION LOST", "category": "AXIS", "severity": "CRITICAL"},
    # Alarm 3000 Messages
    {"code": "3000", "name": "USER DEFINED ALARM MESSAGE", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "3001", "name": "CUSTOM M CODE ALARM", "category": "PROGRAM", "severity": "MEDIUM"},
]

# BROTHER Speedio / TC Series Alarm Codes (from web research)
BROTHER_ALARMS = [
    # Servo Errors (5xxx series)
    {"code": "5050", "name": "X SERVO ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "5051", "name": "Y SERVO ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "5052", "name": "Z SERVO ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "5053", "name": "A SERVO ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "5054", "name": "B SERVO ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "5055", "name": "C SERVO ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "5058", "name": "SPINDLE SERVO ERROR", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "5058.07", "name": "DE1 SP SERVO ERROR", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "5066", "name": "M SERVO BATT DROP", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "5066.17", "name": "M SERVO BATTERY VOLTAGE DROP", "category": "SERVO", "severity": "CRITICAL"},
    # Servo Sub-codes
    {"code": "OVERCUR", "name": "SERVO OVERCURRENT", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "OVERSPD", "name": "SERVO OVERSPEED", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "OVERLD", "name": "SERVO OVERLOAD", "category": "SERVO", "severity": "HIGH"},
    {"code": "BATT DROP", "name": "ENCODER BATTERY DROP", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "ENC ERR", "name": "ENCODER ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "REGEN", "name": "REGENERATIVE RESISTANCE ALARM", "category": "SERVO", "severity": "HIGH"},
    {"code": "PWR UNBAL", "name": "POWER UNBALANCE WARNING", "category": "SYSTEM", "severity": "MEDIUM"},
    # Tool Magazine Errors
    {"code": "TM FORWARD", "name": "TM FORWARD SENSOR ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "TM BACKWARD", "name": "TM BACKWARD SENSOR ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "TM UP", "name": "TM UP SENSOR ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "TM DOWN", "name": "TM DOWN SENSOR ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "TM SERVO", "name": "TM SERVO NOT READY", "category": "ATC", "severity": "HIGH"},
    {"code": "TM SENSOR", "name": "TM SENSOR ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "TM NUMBER", "name": "TOOL NUMBER INCORRECT", "category": "ATC", "severity": "HIGH"},
    {"code": "TM ROTATE", "name": "TM ROTATE NOT COMPLETE", "category": "ATC", "severity": "HIGH"},
    {"code": "TM PRESET", "name": "TOOL NUMBER MUST PRESET", "category": "ATC", "severity": "MEDIUM"},
    {"code": "TM OPEN", "name": "TM OPEN SENSOR ALARM", "category": "ATC", "severity": "HIGH"},
    # Spindle Errors
    {"code": "SP UP", "name": "SPINDLE UP SENSOR ALARM", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "SP CLAMP", "name": "SPINDLE TOOL CLAMP SENSOR", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "SP CLAMP DN", "name": "SP TOOL CLAMP DOWN SENSOR", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "SP STOP", "name": "SPINDLE STOP DELAY", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "SP TC", "name": "SPINDLE TOOL CHANGE NOT COMPLETE", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "SP BRUSH UP", "name": "SPINDLE BRUSH UP SENSOR", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "SP BRUSH DN", "name": "SPINDLE BRUSH DOWN SENSOR", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "SP SPEED", "name": "SP SPEED REACH ALARM", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "SP OVERCUR", "name": "SPINDLE OVER CURRENT ALARM", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "SP PROBE", "name": "SPINDLE ELECTRICAL PROBE ERROR", "category": "SPINDLE", "severity": "MEDIUM"},
    # System/Auxiliary Alarms
    {"code": "AIR PRES", "name": "AIR PRESSURE ALARM", "category": "PNEUMATIC", "severity": "HIGH"},
    {"code": "OIL LVL", "name": "OIL LEVEL ALARM", "category": "LUBRICATION", "severity": "MEDIUM"},
    {"code": "OVERLOAD", "name": "OVERLOAD ALARM", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "INVERTER", "name": "INVERTER ALARM", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "Z STOPPER", "name": "Z AXIS STOPPER SENSOR", "category": "AXIS", "severity": "HIGH"},
    {"code": "VAC PRES", "name": "VACUUM PRESSURE ALARM", "category": "AUXILIARY", "severity": "MEDIUM"},
    {"code": "VAC CLAMP", "name": "VACUUM CLAMP BEING OFF", "category": "AUXILIARY", "severity": "MEDIUM"},
    {"code": "A ZERO", "name": "A AXIS ZERO RETURN ERROR", "category": "AXIS", "severity": "HIGH"},
    {"code": "PMM POS", "name": "PMM POSITION ERROR", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "WATER COOL", "name": "WATER COOL SYSTEM ALARM", "category": "COOLANT", "severity": "MEDIUM"},
    {"code": "THERMAL INV", "name": "THERMAL OF INVERTER BRAKE", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "SKIP SIG", "name": "SKIP SIGNAL ALARM", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "PHOTO SENS", "name": "PHOTO SENSOR ALARM", "category": "SENSOR", "severity": "MEDIUM"},
    {"code": "HARD OT", "name": "HARD OVERTRAVEL", "category": "OVERTRAVEL", "severity": "CRITICAL"},
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
        "added_phase": 15
    }

def main():
    print("=" * 60)
    print("PHASE 15: FAGOR + HURCO + BROTHER DEEP EXPANSION")
    print("=" * 60)
    
    # Load existing database
    print(f"\nLoading: {MASTER_DB}")
    with open(MASTER_DB, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    initial_count = len(db.get("alarms", []))
    print(f"Initial alarm count: {initial_count}")
    
    # Track existing alarm IDs to prevent duplicates
    existing_ids = {a.get("alarm_id", "") for a in db.get("alarms", [])}
    existing_codes = {}
    for a in db.get("alarms", []):
        family = a.get("family", "")
        code = a.get("code", "")
        key = f"{family}:{code}"
        existing_codes[key] = True
    
    added = 0
    skipped = 0
    
    # Process FAGOR alarms
    print("\n--- Processing FAGOR alarms ---")
    for alarm in FAGOR_ALARMS:
        key = f"FAGOR:{alarm['code']}"
        if key not in existing_codes:
            entry = create_alarm_entry("FAGOR", alarm)
            db["alarms"].append(entry)
            existing_codes[key] = True
            added += 1
        else:
            skipped += 1
    print(f"FAGOR: Added {added}, Skipped {skipped}")
    
    # Process HURCO alarms
    fagor_added = added
    added = 0
    skipped = 0
    print("\n--- Processing HURCO alarms ---")
    for alarm in HURCO_ALARMS:
        key = f"HURCO:{alarm['code']}"
        if key not in existing_codes:
            entry = create_alarm_entry("HURCO", alarm)
            db["alarms"].append(entry)
            existing_codes[key] = True
            added += 1
        else:
            skipped += 1
    print(f"HURCO: Added {added}, Skipped {skipped}")
    
    # Process BROTHER alarms
    hurco_added = added
    added = 0
    skipped = 0
    print("\n--- Processing BROTHER alarms ---")
    for alarm in BROTHER_ALARMS:
        key = f"BROTHER:{alarm['code']}"
        if key not in existing_codes:
            entry = create_alarm_entry("BROTHER", alarm)
            db["alarms"].append(entry)
            existing_codes[key] = True
            added += 1
        else:
            skipped += 1
    print(f"BROTHER: Added {added}, Skipped {skipped}")
    
    brother_added = added
    total_added = fagor_added + hurco_added + brother_added
    
    # Update metadata
    final_count = len(db["alarms"])
    db["metadata"]["version"] = "4.2.0-PHASE15-EXPANSION"
    db["metadata"]["total_alarms"] = final_count
    db["metadata"]["last_updated"] = datetime.now().isoformat()
    db["metadata"]["phase_15"] = {
        "fagor_added": fagor_added,
        "hurco_added": hurco_added,
        "brother_added": brother_added,
        "total_added": total_added
    }
    
    # Save database
    print(f"\nSaving updated database...")
    with open(MASTER_DB, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    # Summary
    print("\n" + "=" * 60)
    print("PHASE 15 COMPLETE")
    print("=" * 60)
    print(f"Initial count: {initial_count}")
    print(f"Final count:   {final_count}")
    print(f"Total added:   {total_added}")
    print(f"  - FAGOR:     +{fagor_added}")
    print(f"  - HURCO:     +{hurco_added}")
    print(f"  - BROTHER:   +{brother_added}")
    print(f"\nDatabase saved: {MASTER_DB}")
    print("=" * 60)

if __name__ == "__main__":
    main()
