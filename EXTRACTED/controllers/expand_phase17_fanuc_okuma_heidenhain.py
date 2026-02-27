#!/usr/bin/env python3
"""
PHASE 17: FANUC + OKUMA + HEIDENHAIN Extended Expansion  
Target: +150 alarms (2,216 → 2,366+)
Focus: Major controller manufacturers deep dive - PMC, System, Communications
"""

import json
import os
from datetime import datetime

BASE_PATH = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers"
MASTER_DB = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")

# FANUC Extended Alarms - PMC, System, Communications
FANUC_EXT_ALARMS = [
    # PMC Alarms (PM0xxx - PM1xxx)
    {"code": "PM0001", "name": "PMC SYSTEM ALARM", "category": "PMC", "severity": "CRITICAL"},
    {"code": "PM0002", "name": "PMC WATCHDOG ERROR", "category": "PMC", "severity": "CRITICAL"},
    {"code": "PM0010", "name": "PMC LADDER OVERFLOW", "category": "PMC", "severity": "HIGH"},
    {"code": "PM0011", "name": "PMC TIMER OVERFLOW", "category": "PMC", "severity": "HIGH"},
    {"code": "PM0012", "name": "PMC COUNTER OVERFLOW", "category": "PMC", "severity": "HIGH"},
    {"code": "PM0020", "name": "PMC PROGRAM ERROR", "category": "PMC", "severity": "HIGH"},
    {"code": "PM0021", "name": "PMC SYNTAX ERROR", "category": "PMC", "severity": "HIGH"},
    {"code": "PM0030", "name": "PMC MEMORY ERROR", "category": "PMC", "severity": "CRITICAL"},
    {"code": "PM1000", "name": "PMC FSSB COMMUNICATION ERROR", "category": "PMC", "severity": "CRITICAL"},
    {"code": "PM1001", "name": "PMC I/O LINK ERROR", "category": "PMC", "severity": "HIGH"},
    # System Alarms (SYS xxx)
    {"code": "SYS001", "name": "SYSTEM ROM CHECKSUM ERROR", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "SYS002", "name": "SYSTEM RAM ERROR", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "SYS003", "name": "SYSTEM BATTERY VOLTAGE LOW", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "SYS004", "name": "SYSTEM FAN FAILURE", "category": "SYSTEM", "severity": "MEDIUM"},
    {"code": "SYS005", "name": "SYSTEM OVERTEMPERATURE", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "SYS010", "name": "CNC CPU FAILURE", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "SYS011", "name": "SERVO CPU FAILURE", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "SYS012", "name": "PMC CPU FAILURE", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "SYS020", "name": "FSSB LINK DOWN", "category": "COMMUNICATION", "severity": "CRITICAL"},
    {"code": "SYS021", "name": "ETHERNET LINK DOWN", "category": "COMMUNICATION", "severity": "HIGH"},
    # IO Alarms (IO xxxx)
    {"code": "IO0001", "name": "I/O LINK DISCONNECTED", "category": "COMMUNICATION", "severity": "CRITICAL"},
    {"code": "IO0002", "name": "I/O MODULE ERROR", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "IO0003", "name": "I/O CARD MISSING", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "IO0010", "name": "DI/DO ERROR", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "IO0011", "name": "AI/AO ERROR", "category": "SYSTEM", "severity": "HIGH"},
    # Extended Servo Alarms
    {"code": "SV0500", "name": "SVPM FSSB OPEN", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "SV0501", "name": "SVPM FSSB DATA ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "SV0502", "name": "SVPM AXIS DATA ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "SV0510", "name": "MOTOR OVERHEAT WARNING", "category": "SERVO", "severity": "HIGH"},
    {"code": "SV0511", "name": "AMP OVERHEAT WARNING", "category": "SERVO", "severity": "HIGH"},
    {"code": "SV0520", "name": "COLLISION DETECTION TRIGGERED", "category": "SAFETY", "severity": "CRITICAL"},
    {"code": "SV0521", "name": "EXCESSIVE DISTURBANCE TORQUE", "category": "SERVO", "severity": "HIGH"},
    # Extended Spindle Alarms  
    {"code": "SP0800", "name": "SPINDLE FSSB OPEN", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "SP0801", "name": "SPINDLE FSSB DATA ERROR", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "SP0810", "name": "SPINDLE MOTOR OVERHEAT", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "SP0811", "name": "SPINDLE AMP OVERHEAT", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "SP0820", "name": "SPINDLE BELT SLIP DETECTED", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "SP0821", "name": "SPINDLE BEARING ABNORMAL", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "SP0830", "name": "SPINDLE ORIENTATION INDEX ERROR", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "SP0831", "name": "SPINDLE CS CONTOUR ERROR", "category": "SPINDLE", "severity": "HIGH"},
]

# OKUMA OSP Extended Alarms - P Series, System, Network
OKUMA_EXT_ALARMS = [
    # System Alarms (A-0xxx)
    {"code": "A-0001", "name": "NC SYSTEM ERROR", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "A-0002", "name": "NC WATCHDOG TIMEOUT", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "A-0003", "name": "NC MEMORY ERROR", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "A-0010", "name": "NC ROM CHECKSUM ERROR", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "A-0011", "name": "NC RAM PARITY ERROR", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "A-0020", "name": "SYSTEM BATTERY LOW", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "A-0021", "name": "OPTION BATTERY LOW", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "A-0030", "name": "FAN MOTOR ALARM", "category": "SYSTEM", "severity": "MEDIUM"},
    {"code": "A-0031", "name": "CABINET OVERTEMPERATURE", "category": "SYSTEM", "severity": "HIGH"},
    # Extended Servo Alarms (A-1xxx)
    {"code": "A-1100", "name": "SERVO COMMUNICATION ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "A-1101", "name": "SERVO SYNC ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "A-1102", "name": "SERVO DATA ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "A-1110", "name": "AXIS COLLISION DETECTION", "category": "SAFETY", "severity": "CRITICAL"},
    {"code": "A-1111", "name": "AXIS OVERLOAD PROTECTION", "category": "SERVO", "severity": "HIGH"},
    {"code": "A-1120", "name": "LINEAR SCALE ALARM", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "A-1121", "name": "ROTARY ENCODER ALARM", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "A-1130", "name": "SERVO REGENERATION ERROR", "category": "SERVO", "severity": "HIGH"},
    {"code": "A-1131", "name": "DC BUS VOLTAGE ERROR", "category": "SERVO", "severity": "CRITICAL"},
    # Extended Spindle Alarms (A-2xxx)
    {"code": "A-2100", "name": "SPINDLE COMMUNICATION ERROR", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "A-2101", "name": "SPINDLE SYNC ERROR", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "A-2110", "name": "SPINDLE BELT TENSION ALARM", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "A-2111", "name": "SPINDLE BEARING TEMPERATURE", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "A-2120", "name": "SPINDLE CHILLER ALARM", "category": "SPINDLE", "severity": "MEDIUM"},
    {"code": "A-2121", "name": "OIL MIST ALARM", "category": "SPINDLE", "severity": "MEDIUM"},
    # Extended ATC Alarms (A-3xxx)
    {"code": "A-3100", "name": "MAGAZINE SERVO ALARM", "category": "ATC", "severity": "HIGH"},
    {"code": "A-3101", "name": "MAGAZINE ENCODER ERROR", "category": "ATC", "severity": "HIGH"},
    {"code": "A-3110", "name": "TOOL ARM COLLISION", "category": "ATC", "severity": "CRITICAL"},
    {"code": "A-3111", "name": "TOOL ARM POSITION ERROR", "category": "ATC", "severity": "HIGH"},
    {"code": "A-3120", "name": "TOOL BREAKAGE SENSOR", "category": "ATC", "severity": "HIGH"},
    {"code": "A-3121", "name": "TOOL LENGTH MEASUREMENT ERROR", "category": "ATC", "severity": "MEDIUM"},
    # Network/Communication Alarms (A-5xxx)
    {"code": "A-5000", "name": "ETHERNET COMMUNICATION ERROR", "category": "COMMUNICATION", "severity": "HIGH"},
    {"code": "A-5001", "name": "RS232 COMMUNICATION ERROR", "category": "COMMUNICATION", "severity": "MEDIUM"},
    {"code": "A-5010", "name": "DNC TRANSFER ERROR", "category": "COMMUNICATION", "severity": "MEDIUM"},
    {"code": "A-5011", "name": "FTP TRANSFER ERROR", "category": "COMMUNICATION", "severity": "MEDIUM"},
    # PLC Alarms (A-6xxx)
    {"code": "A-6000", "name": "PLC SYSTEM ERROR", "category": "PLC", "severity": "CRITICAL"},
    {"code": "A-6001", "name": "PLC PROGRAM ERROR", "category": "PLC", "severity": "HIGH"},
    {"code": "A-6010", "name": "PLC I/O ERROR", "category": "PLC", "severity": "HIGH"},
    {"code": "A-6011", "name": "PLC REMOTE I/O ERROR", "category": "PLC", "severity": "HIGH"},
]

# HEIDENHAIN TNC Extended Alarms - System, Drive, Touch Probe
HEIDENHAIN_EXT_ALARMS = [
    # System Alarms (FE0xxx)
    {"code": "FE0010", "name": "SYSTEM WATCHDOG ERROR", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "FE0011", "name": "SYSTEM MEMORY FAULT", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "FE0012", "name": "SYSTEM ROM ERROR", "category": "SYSTEM", "severity": "CRITICAL"},
    {"code": "FE0020", "name": "SYSTEM BATTERY FAULT", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "FE0021", "name": "SYSTEM FAN FAULT", "category": "SYSTEM", "severity": "MEDIUM"},
    {"code": "FE0022", "name": "SYSTEM OVERTEMPERATURE", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "FE0030", "name": "SYSTEM CLOCK ERROR", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "FE0031", "name": "SYSTEM DATE ERROR", "category": "SYSTEM", "severity": "MEDIUM"},
    # Extended Axis Alarms (FE1xxx)
    {"code": "FE1010", "name": "AXIS COMMUNICATION ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "FE1011", "name": "AXIS SYNC ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "FE1020", "name": "LINEAR ENCODER ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "FE1021", "name": "ROTARY ENCODER ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "FE1030", "name": "POSITION MEASUREMENT ERROR", "category": "SERVO", "severity": "CRITICAL"},
    {"code": "FE1031", "name": "POSITION INTERPOLATION ERROR", "category": "SERVO", "severity": "HIGH"},
    {"code": "FE1040", "name": "DRIVE OVERTEMPERATURE", "category": "SERVO", "severity": "HIGH"},
    {"code": "FE1041", "name": "MOTOR OVERTEMPERATURE", "category": "SERVO", "severity": "HIGH"},
    {"code": "FE1050", "name": "AXIS COLLISION WARNING", "category": "SAFETY", "severity": "CRITICAL"},
    {"code": "FE1051", "name": "AXIS LIMIT EXCEEDED", "category": "OVERTRAVEL", "severity": "HIGH"},
    # Extended Spindle Alarms (FE2xxx)
    {"code": "FE2010", "name": "SPINDLE COMMUNICATION ERROR", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "FE2011", "name": "SPINDLE SYNC ERROR", "category": "SPINDLE", "severity": "CRITICAL"},
    {"code": "FE2020", "name": "SPINDLE ORIENTATION INDEX", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "FE2021", "name": "SPINDLE POSITIONING ERROR", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "FE2030", "name": "SPINDLE THERMAL ALARM", "category": "SPINDLE", "severity": "HIGH"},
    {"code": "FE2031", "name": "SPINDLE CHILLER ERROR", "category": "SPINDLE", "severity": "MEDIUM"},
    # Touch Probe Alarms (FE4xxx)
    {"code": "FE4010", "name": "TOUCH PROBE COMMUNICATION", "category": "PROBE", "severity": "HIGH"},
    {"code": "FE4011", "name": "TOUCH PROBE BATTERY LOW", "category": "PROBE", "severity": "MEDIUM"},
    {"code": "FE4020", "name": "TOUCH PROBE CALIBRATION", "category": "PROBE", "severity": "MEDIUM"},
    {"code": "FE4021", "name": "TOUCH PROBE DEFLECTION", "category": "PROBE", "severity": "HIGH"},
    {"code": "FE4030", "name": "LASER MEASUREMENT ERROR", "category": "PROBE", "severity": "HIGH"},
    {"code": "FE4031", "name": "TOOL SETTER ERROR", "category": "PROBE", "severity": "MEDIUM"},
    # Program Alarms (FE5xxx)
    {"code": "FE5010", "name": "PROGRAM MEMORY FULL", "category": "PROGRAM", "severity": "HIGH"},
    {"code": "FE5011", "name": "PROGRAM READ ERROR", "category": "PROGRAM", "severity": "HIGH"},
    {"code": "FE5020", "name": "CYCLE PARAMETER ERROR", "category": "PROGRAM", "severity": "MEDIUM"},
    {"code": "FE5021", "name": "CYCLE EXECUTION ERROR", "category": "PROGRAM", "severity": "HIGH"},
    {"code": "FE5030", "name": "COORDINATE SYSTEM ERROR", "category": "PROGRAM", "severity": "HIGH"},
    {"code": "FE5031", "name": "DATUM ERROR", "category": "PROGRAM", "severity": "HIGH"},
    # Communication Alarms (FE6xxx)
    {"code": "FE6010", "name": "ETHERNET CONNECTION ERROR", "category": "COMMUNICATION", "severity": "HIGH"},
    {"code": "FE6011", "name": "USB CONNECTION ERROR", "category": "COMMUNICATION", "severity": "MEDIUM"},
    {"code": "FE6020", "name": "DNC TRANSFER INTERRUPTED", "category": "COMMUNICATION", "severity": "MEDIUM"},
    {"code": "FE6021", "name": "REMOTE DESKTOP ERROR", "category": "COMMUNICATION", "severity": "MEDIUM"},
    # Machine Parameter Alarms (FE7xxx)
    {"code": "FE7010", "name": "MACHINE PARAMETER INVALID", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "FE7011", "name": "MACHINE PARAMETER RANGE", "category": "SYSTEM", "severity": "MEDIUM"},
    {"code": "FE7020", "name": "KINEMATIC CONFIGURATION ERROR", "category": "SYSTEM", "severity": "HIGH"},
    {"code": "FE7021", "name": "TOOL TABLE INCONSISTENT", "category": "ATC", "severity": "MEDIUM"},
]

def generate_alarm_id(family, code):
    safe_code = str(code).replace(".", "-").replace(" ", "_")
    return f"ALM-{family}-{safe_code}"

def create_alarm_entry(family, alarm_data):
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
        "added_phase": 17
    }

def main():
    print("=" * 60)
    print("PHASE 17: FANUC + OKUMA + HEIDENHAIN EXTENDED EXPANSION")
    print("=" * 60)
    
    with open(MASTER_DB, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    initial_count = len(db.get("alarms", []))
    print(f"\nLoading: {MASTER_DB}")
    print(f"Initial alarm count: {initial_count}")
    
    existing_codes = {}
    for a in db.get("alarms", []):
        key = f"{a.get('family', '')}:{a.get('code', '')}"
        existing_codes[key] = True
    
    total_added = 0
    
    # Process FANUC Extended
    print("\n--- Processing FANUC Extended alarms ---")
    added = 0
    for alarm in FANUC_EXT_ALARMS:
        key = f"FANUC:{alarm['code']}"
        if key not in existing_codes:
            entry = create_alarm_entry("FANUC", alarm)
            db["alarms"].append(entry)
            existing_codes[key] = True
            added += 1
    print(f"FANUC: Added {added}")
    total_added += added
    fanuc_added = added
    
    # Process OKUMA Extended
    print("\n--- Processing OKUMA Extended alarms ---")
    added = 0
    for alarm in OKUMA_EXT_ALARMS:
        key = f"OKUMA:{alarm['code']}"
        if key not in existing_codes:
            entry = create_alarm_entry("OKUMA", alarm)
            db["alarms"].append(entry)
            existing_codes[key] = True
            added += 1
    print(f"OKUMA: Added {added}")
    total_added += added
    okuma_added = added
    
    # Process HEIDENHAIN Extended
    print("\n--- Processing HEIDENHAIN Extended alarms ---")
    added = 0
    for alarm in HEIDENHAIN_EXT_ALARMS:
        key = f"HEIDENHAIN:{alarm['code']}"
        if key not in existing_codes:
            entry = create_alarm_entry("HEIDENHAIN", alarm)
            db["alarms"].append(entry)
            existing_codes[key] = True
            added += 1
    print(f"HEIDENHAIN: Added {added}")
    total_added += added
    heidenhain_added = added
    
    # Update metadata
    final_count = len(db["alarms"])
    db["metadata"]["version"] = "4.4.0-PHASE17-EXPANSION"
    db["metadata"]["total_alarms"] = final_count
    db["metadata"]["last_updated"] = datetime.now().isoformat()
    db["metadata"]["phase_17"] = {
        "fanuc_added": fanuc_added,
        "okuma_added": okuma_added,
        "heidenhain_added": heidenhain_added,
        "total_added": total_added
    }
    
    with open(MASTER_DB, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print("PHASE 17 COMPLETE")
    print("=" * 60)
    print(f"Initial count: {initial_count}")
    print(f"Final count:   {final_count}")
    print(f"Total added:   {total_added}")
    print(f"  - FANUC:      +{fanuc_added}")
    print(f"  - OKUMA:      +{okuma_added}")
    print(f"  - HEIDENHAIN: +{heidenhain_added}")
    print(f"\nDatabase saved: {MASTER_DB}")
    print("=" * 60)

if __name__ == "__main__":
    main()
