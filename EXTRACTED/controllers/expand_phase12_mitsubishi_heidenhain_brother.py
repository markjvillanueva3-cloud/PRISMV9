#!/usr/bin/env python3
"""
PHASE 12: MITSUBISHI Servo/Spindle + HEIDENHAIN Extended + BROTHER Extended
Target: +60-100 alarms (to reach 2000)
Sources: MITSUBISHI M800/M80 Alarm Manual, HEIDENHAIN TNC Error Messages, BROTHER CNC Manuals
"""

import json
import os
from datetime import datetime

# Path to master database
MASTER_DB_PATH = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers\MASTER_ALARM_DATABASE_v3.json"

def load_database():
    with open(MASTER_DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_database(db):
    with open(MASTER_DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)
    print(f"Database saved to {MASTER_DB_PATH}")

def get_existing_ids(db):
    return {alarm['alarm_id'] for alarm in db['alarms']}

# MITSUBISHI M800/M80 SERVO/SPINDLE ALARMS
MITSUBISHI_SERVO_ALARMS = [
    {
        "code": "S01-10",
        "name": "INSUFFICIENT BUS VOLTAGE",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Drop of bus voltage detected in main circuit",
        "causes": ["Power supply interruption", "Low input voltage", "Power module fault"],
        "quick_fix": "Check power supply voltage and connections",
        "requires_power_cycle": True
    },
    {
        "code": "S01-16",
        "name": "SERVO EMERGENCY STOP",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Emergency stop signal detected by servo system",
        "causes": ["E-stop activated", "Safety circuit open", "Interlock tripped"],
        "quick_fix": "Release E-stop, check safety circuits and interlocks",
        "requires_power_cycle": False
    },
    {
        "code": "S01-20",
        "name": "MOTOR ENCODER NO SIGNAL",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "No signals detected in A,B,Z phase of motor encoder",
        "causes": ["Encoder cable fault", "Encoder failure", "Connector issue"],
        "quick_fix": "Check encoder cable and connectors, replace encoder if needed",
        "requires_power_cycle": True
    },
    {
        "code": "S01-21",
        "name": "LINEAR SCALE NO SIGNAL",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "No signals detected from linear scale encoder",
        "causes": ["Scale head fault", "Cable damage", "Scale contamination"],
        "quick_fix": "Clean scale, check cable, verify scale head operation",
        "requires_power_cycle": True
    },
    {
        "code": "S01-22",
        "name": "LSI OPERATION ERROR",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "LSI operation error detected in drive unit",
        "causes": ["Drive unit failure", "Internal circuit fault"],
        "quick_fix": "Replace drive unit or servo amplifier",
        "requires_power_cycle": True
    },
    {
        "code": "S01-23",
        "name": "EXCESSIVE SPEED ERROR 1",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Speed command and feedback difference exceeded 50 rpm for too long",
        "causes": ["Mechanical binding", "Load too high", "Servo gain mismatch"],
        "quick_fix": "Check mechanical system, reduce load, tune servo parameters",
        "requires_power_cycle": False
    },
    {
        "code": "S01-24",
        "name": "MOTOR GROUNDING FAULT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Motor power cable is in contact with frame ground",
        "causes": ["Cable insulation damage", "Motor winding fault", "Connector short"],
        "quick_fix": "Inspect motor cables, check motor winding insulation",
        "requires_power_cycle": True
    },
    {
        "code": "S01-25",
        "name": "ABSOLUTE POSITION DATA LOST",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Absolute position lost due to low battery voltage",
        "causes": ["Backup battery depleted", "Battery circuit fault"],
        "quick_fix": "Replace backup battery, re-establish absolute position",
        "requires_power_cycle": True
    },
    {
        "code": "S01-35",
        "name": "NC COMMAND ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Travel command data from CNC was excessive",
        "causes": ["Program error", "NC communication fault", "Command overflow"],
        "quick_fix": "Check program, verify NC communication integrity",
        "requires_power_cycle": False
    },
    {
        "code": "S01-36",
        "name": "NC-DRV COMMUNICATION ERROR",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Communication with CNC was interrupted",
        "causes": ["Cable fault", "NC board failure", "Drive fault"],
        "quick_fix": "Check communication cables, verify NC and drive operation",
        "requires_power_cycle": True
    },
    {
        "code": "S01-37",
        "name": "INITIAL PARAMETER ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Incorrect parameter detected during power on initialization",
        "causes": ["Parameter corruption", "Wrong parameter settings"],
        "quick_fix": "Re-enter servo parameters, verify all settings",
        "requires_power_cycle": True
    },
    {
        "code": "S01-3A",
        "name": "OVERCURRENT DETECTED",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Excessive current detected in motor drive circuit",
        "causes": ["Motor short", "Drive fault", "Excessive load"],
        "quick_fix": "Check motor and cables, reduce load, replace drive if needed",
        "requires_power_cycle": True
    },
    {
        "code": "S01-3B",
        "name": "POWER MODULE OVERHEAT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Thermal protection activated in power module",
        "causes": ["Overload condition", "Cooling failure", "High ambient temperature"],
        "quick_fix": "Allow cooling, check ventilation, reduce load",
        "requires_power_cycle": False
    },
    {
        "code": "S01-3C",
        "name": "REGENERATION CIRCUIT ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Error in regenerative transistor or resistor",
        "causes": ["Regen resistor open", "Transistor fault", "Excessive regen energy"],
        "quick_fix": "Check regeneration resistor and circuit",
        "requires_power_cycle": True
    },
    {
        "code": "S01-3D",
        "name": "SPINDLE SPEED BLOCKED",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle motor failed to exceed 45 rpm at max torque",
        "causes": ["Mechanical jam", "Spindle brake engaged", "Motor fault"],
        "quick_fix": "Check spindle mechanical system, verify brake released",
        "requires_power_cycle": False
    },
    {
        "code": "S01-3E",
        "name": "SPINDLE SPEED OVERRUN",
        "category": "SPINDLE",
        "severity": "CRITICAL",
        "description": "Spindle motor speed exceeded command or parameter limit",
        "causes": ["Control fault", "Runaway condition", "Parameter error"],
        "quick_fix": "Check spindle control parameters, verify no runaway",
        "requires_power_cycle": True
    },
    {
        "code": "S01-61",
        "name": "POWER MODULE OVERCURRENT",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Overcurrent protection activated in power module",
        "causes": ["Short circuit", "Motor fault", "Excessive load"],
        "quick_fix": "Check motor and cables, inspect power module",
        "requires_power_cycle": True
    },
    {
        "code": "S01-62",
        "name": "POWER SUPPLY FREQUENCY ERROR",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "Input power supply frequency out of specification range",
        "causes": ["Generator issue", "Power grid instability", "Wrong power source"],
        "quick_fix": "Verify power supply frequency is within spec (50/60 Hz)",
        "requires_power_cycle": True
    },
    {
        "code": "S02-2201",
        "name": "SERVO PARAMETER INITIAL ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Servo parameter setting data is illegal",
        "causes": ["Parameter corruption", "Invalid parameter value"],
        "quick_fix": "Re-enter servo parameters, restore from backup",
        "requires_power_cycle": True
    },
    {
        "code": "S05-5B",
        "name": "SAFE LIMITED SPEED MONITORING ERROR",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Speed exceeding safety limited speed detected",
        "causes": ["Program exceeded safe speed", "Safety function malfunction"],
        "quick_fix": "Check safe speed settings, verify safety function operation",
        "requires_power_cycle": False
    }
]

# HEIDENHAIN TNC EXTENDED ALARMS
HEIDENHAIN_EXTENDED_ALARMS = [
    {
        "code": "FE0001",
        "name": "PROCESSOR CHECK ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "CRC sum for control data is incorrect",
        "causes": ["Memory error", "Data corruption", "Hardware fault"],
        "quick_fix": "Restart control, restore data backup if needed",
        "requires_power_cycle": True
    },
    {
        "code": "FE1000",
        "name": "AXIS POSITION ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Position feedback error detected on axis",
        "causes": ["Encoder fault", "Following error", "Mechanical issue"],
        "quick_fix": "Check encoder, verify axis can move freely",
        "requires_power_cycle": False
    },
    {
        "code": "FE1100",
        "name": "AXIS OVERLOAD",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Axis drive overload detected",
        "causes": ["Mechanical binding", "Excessive feed rate", "Collision"],
        "quick_fix": "Check for mechanical interference, reduce feed rate",
        "requires_power_cycle": False
    },
    {
        "code": "FE1200",
        "name": "AXIS ENCODER ERROR",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Error in axis encoder signal",
        "causes": ["Encoder cable fault", "Encoder contamination", "Hardware failure"],
        "quick_fix": "Check encoder cable and connections, clean or replace encoder",
        "requires_power_cycle": True
    },
    {
        "code": "FE2000",
        "name": "SPINDLE ORIENTATION ERROR",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle failed to complete orientation",
        "causes": ["Encoder fault", "Orientation sensor fault", "Mechanical issue"],
        "quick_fix": "Check spindle encoder and orientation sensor",
        "requires_power_cycle": False
    },
    {
        "code": "FE2100",
        "name": "SPINDLE SPEED ERROR",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle speed not within tolerance",
        "causes": ["Drive fault", "Encoder error", "Load issue"],
        "quick_fix": "Check spindle drive and encoder operation",
        "requires_power_cycle": False
    },
    {
        "code": "FE3000",
        "name": "PLC ERROR",
        "category": "PLC",
        "severity": "HIGH",
        "description": "Error in PLC program or communication",
        "causes": ["PLC program error", "Communication fault", "I/O fault"],
        "quick_fix": "Check PLC diagnostics and I/O status",
        "requires_power_cycle": False
    },
    {
        "code": "FE3100",
        "name": "SAFETY RELAY ERROR",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Error in safety relay circuit",
        "causes": ["Relay fault", "Wiring fault", "Safety circuit open"],
        "quick_fix": "Check safety relay and circuit wiring",
        "requires_power_cycle": True
    },
    {
        "code": "FE4000",
        "name": "TOOL MEASUREMENT ERROR",
        "category": "TOOL",
        "severity": "MEDIUM",
        "description": "Error during tool measurement cycle",
        "causes": ["Touch probe fault", "Tool not found", "Incorrect approach"],
        "quick_fix": "Check touch probe operation, verify tool is in spindle",
        "requires_power_cycle": False
    },
    {
        "code": "FE4100",
        "name": "TOOL TABLE ERROR",
        "category": "TOOL",
        "severity": "MEDIUM",
        "description": "Error reading or writing tool table",
        "causes": ["Data corruption", "Memory error", "File system error"],
        "quick_fix": "Restore tool table from backup, check memory",
        "requires_power_cycle": False
    },
    {
        "code": "FE5000",
        "name": "PROGRAM SYNTAX ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Syntax error detected in NC program",
        "causes": ["Invalid code", "Missing parameter", "Wrong format"],
        "quick_fix": "Check program at indicated block for syntax errors",
        "requires_power_cycle": False
    },
    {
        "code": "FE5100",
        "name": "PROGRAM BLOCK TOO LONG",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "NC program block exceeds maximum length",
        "causes": ["Too many commands in one block", "Long comment"],
        "quick_fix": "Split block into multiple shorter blocks",
        "requires_power_cycle": False
    },
    {
        "code": "FE6000",
        "name": "EXTERNAL COMMUNICATION ERROR",
        "category": "COMMUNICATION",
        "severity": "HIGH",
        "description": "Error in external communication interface",
        "causes": ["Network fault", "DNC error", "Ethernet issue"],
        "quick_fix": "Check network connection and communication settings",
        "requires_power_cycle": False
    },
    {
        "code": "FE7000",
        "name": "MACHINE PARAMETER ERROR",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "Invalid machine parameter detected",
        "causes": ["Parameter out of range", "Conflicting parameters"],
        "quick_fix": "Check machine parameters, restore from backup if needed",
        "requires_power_cycle": True
    }
]

# BROTHER CNC EXTENDED ALARMS
BROTHER_EXTENDED_ALARMS = [
    {
        "code": "E1110",
        "name": "SERVO AMPLIFIER ERROR",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "C-axis servo amplifier error detected",
        "causes": ["Amplifier fault", "Motor fault", "Cable issue"],
        "quick_fix": "Check servo amplifier and motor connections",
        "requires_power_cycle": True
    },
    {
        "code": "E1120",
        "name": "SERVO OVERCURRENT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Overcurrent detected in servo system",
        "causes": ["Motor short", "Amplifier fault", "Overload"],
        "quick_fix": "Check motor and cables, reduce cutting load",
        "requires_power_cycle": True
    },
    {
        "code": "E1200",
        "name": "SPINDLE SPEED ERROR",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle speed deviation exceeded tolerance",
        "causes": ["Drive fault", "Heavy cutting load", "Belt slip"],
        "quick_fix": "Check spindle drive, reduce cutting load, check belt tension",
        "requires_power_cycle": False
    },
    {
        "code": "E1210",
        "name": "SPINDLE OVERCURRENT",
        "category": "SPINDLE",
        "severity": "CRITICAL",
        "description": "Spindle motor overcurrent detected",
        "causes": ["Overload", "Motor fault", "Drive fault"],
        "quick_fix": "Reduce spindle load, check motor and drive",
        "requires_power_cycle": True
    },
    {
        "code": "E2000",
        "name": "ATC MAGAZINE POSITION ERROR",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool magazine position not detected correctly",
        "causes": ["Position sensor fault", "Magazine jammed", "Servo error"],
        "quick_fix": "Check magazine sensors, manually position magazine",
        "requires_power_cycle": False
    },
    {
        "code": "E2010",
        "name": "ATC ARM POSITION ERROR",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool change arm position error",
        "causes": ["Arm sensor fault", "Mechanical interference", "Servo error"],
        "quick_fix": "Check arm sensors and mechanical path",
        "requires_power_cycle": False
    },
    {
        "code": "E2020",
        "name": "ATC TOOL CLAMP ERROR",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool clamp/unclamp operation failed",
        "causes": ["Low air pressure", "Drawbar fault", "Sensor fault"],
        "quick_fix": "Check air pressure, drawbar mechanism, and sensors",
        "requires_power_cycle": False
    },
    {
        "code": "E2030",
        "name": "ATC TOOL NUMBER MISMATCH",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Tool number in spindle does not match expected",
        "causes": ["Wrong tool loaded", "Tool table error", "Sensor error"],
        "quick_fix": "Verify tool numbers, update tool table",
        "requires_power_cycle": False
    },
    {
        "code": "E3000",
        "name": "AIR PRESSURE LOW",
        "category": "PNEUMATIC",
        "severity": "HIGH",
        "description": "Shop air pressure below minimum requirement",
        "causes": ["Compressor fault", "Air leak", "Regulator fault"],
        "quick_fix": "Check air supply, fix leaks, verify compressor operation",
        "requires_power_cycle": False
    },
    {
        "code": "E3100",
        "name": "LUBRICATION SYSTEM ALARM",
        "category": "LUBRICATION",
        "severity": "HIGH",
        "description": "Automatic lubrication system fault",
        "causes": ["Lube level low", "Pump fault", "Blocked line"],
        "quick_fix": "Check lube level, verify pump operation, inspect lines",
        "requires_power_cycle": False
    },
    {
        "code": "E4000",
        "name": "OVERTRAVEL X-AXIS",
        "category": "SAFETY",
        "severity": "HIGH",
        "description": "X-axis exceeded software or hardware travel limit",
        "causes": ["Program error", "Wrong work offset", "Manual jog past limit"],
        "quick_fix": "Jog axis away from limit in opposite direction",
        "requires_power_cycle": False
    },
    {
        "code": "E4001",
        "name": "OVERTRAVEL Y-AXIS",
        "category": "SAFETY",
        "severity": "HIGH",
        "description": "Y-axis exceeded software or hardware travel limit",
        "causes": ["Program error", "Wrong work offset", "Manual jog past limit"],
        "quick_fix": "Jog axis away from limit in opposite direction",
        "requires_power_cycle": False
    },
    {
        "code": "E4002",
        "name": "OVERTRAVEL Z-AXIS",
        "category": "SAFETY",
        "severity": "HIGH",
        "description": "Z-axis exceeded software or hardware travel limit",
        "causes": ["Program error", "Wrong tool length", "Manual jog past limit"],
        "quick_fix": "Jog axis away from limit in opposite direction",
        "requires_power_cycle": False
    },
    {
        "code": "E5000",
        "name": "INVERTER THERMAL ALARM",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "Inverter drive thermal protection activated",
        "causes": ["Overload", "Cooling failure", "High ambient temperature"],
        "quick_fix": "Allow cooling, check ventilation, reduce load",
        "requires_power_cycle": False
    },
    {
        "code": "E5100",
        "name": "VACUUM SYSTEM ALARM",
        "category": "WORKHOLDING",
        "severity": "MEDIUM",
        "description": "Vacuum workholding pressure insufficient",
        "causes": ["Vacuum leak", "Pump fault", "Workpiece not seated"],
        "quick_fix": "Check vacuum seals, verify workpiece placement",
        "requires_power_cycle": False
    },
    {
        "code": "E6000",
        "name": "COOLANT PUMP ALARM",
        "category": "COOLANT",
        "severity": "MEDIUM",
        "description": "Coolant pump fault or low coolant level",
        "causes": ["Low coolant", "Pump motor fault", "Thermal overload"],
        "quick_fix": "Check coolant level, verify pump operation",
        "requires_power_cycle": False
    }
]

def create_alarm_entry(alarm_data, family, source, phase):
    timestamp = datetime.now().isoformat()
    return {
        "alarm_id": f"ALM-{family}-{alarm_data['code']}",
        "code": alarm_data["code"],
        "name": alarm_data["name"],
        "category": alarm_data["category"],
        "severity": alarm_data["severity"],
        "description": alarm_data["description"],
        "causes": alarm_data["causes"],
        "quick_fix": alarm_data["quick_fix"],
        "requires_power_cycle": alarm_data["requires_power_cycle"],
        "family": family,
        "source": source,
        "added_phase": phase,
        "timestamp": timestamp
    }

def main():
    print("=" * 70)
    print("PHASE 12: MITSUBISHI Servo/Spindle + HEIDENHAIN + BROTHER Extended")
    print("=" * 70)
    
    db = load_database()
    existing_ids = get_existing_ids(db)
    initial_count = len(db['alarms'])
    print(f"Current alarm count: {initial_count}")
    
    added = 0
    skipped = 0
    
    # Add MITSUBISHI servo/spindle alarms
    print("\n--- Adding MITSUBISHI M800/M80 Servo/Spindle Alarms ---")
    for alarm in MITSUBISHI_SERVO_ALARMS:
        entry = create_alarm_entry(
            alarm, "MITSUBISHI",
            "MITSUBISHI M800/M80/E80 Series Alarm/Parameter Manual IB-1501279",
            "Phase 12"
        )
        if entry['alarm_id'] not in existing_ids:
            db['alarms'].append(entry)
            existing_ids.add(entry['alarm_id'])
            added += 1
            print(f"  + {entry['alarm_id']}: {entry['name']}")
        else:
            skipped += 1
            print(f"  SKIP (exists): {entry['alarm_id']}")
    
    # Add HEIDENHAIN extended alarms
    print("\n--- Adding HEIDENHAIN TNC Extended Alarms ---")
    for alarm in HEIDENHAIN_EXTENDED_ALARMS:
        entry = create_alarm_entry(
            alarm, "HEIDENHAIN",
            "HEIDENHAIN TNC 640 NC Error Messages Manual",
            "Phase 12"
        )
        if entry['alarm_id'] not in existing_ids:
            db['alarms'].append(entry)
            existing_ids.add(entry['alarm_id'])
            added += 1
            print(f"  + {entry['alarm_id']}: {entry['name']}")
        else:
            skipped += 1
            print(f"  SKIP (exists): {entry['alarm_id']}")
    
    # Add BROTHER extended alarms
    print("\n--- Adding BROTHER CNC Extended Alarms ---")
    for alarm in BROTHER_EXTENDED_ALARMS:
        entry = create_alarm_entry(
            alarm, "BROTHER",
            "BROTHER CNC TC-S2/TC-324 Maintenance Manual",
            "Phase 12"
        )
        if entry['alarm_id'] not in existing_ids:
            db['alarms'].append(entry)
            existing_ids.add(entry['alarm_id'])
            added += 1
            print(f"  + {entry['alarm_id']}: {entry['name']}")
        else:
            skipped += 1
            print(f"  SKIP (exists): {entry['alarm_id']}")
    
    # Update metadata
    final_count = len(db['alarms'])
    db['metadata']['version'] = "3.10.0-PHASE12"
    db['metadata']['last_updated'] = datetime.now().isoformat()
    db['metadata']['total_alarms'] = final_count
    db['metadata']['expansion_notes'] = "Phase 12 - MITSUBISHI Servo/Spindle + HEIDENHAIN Extended + BROTHER Extended"
    
    # Add new sources
    new_sources = [
        "MITSUBISHI M800/M80/E80 Series Alarm/Parameter Manual IB-1501279",
        "MITSUBISHI MDS-A/MDS-B/MDS-C1 Servo Alarm Code Reference",
        "HEIDENHAIN TNC 640 NC Error Messages Manual",
        "BROTHER CNC TC-S2/TC-324 Maintenance Manual"
    ]
    for src in new_sources:
        if src not in db['metadata']['sources']:
            db['metadata']['sources'].append(src)
    
    save_database(db)
    
    # Summary
    print("\n" + "=" * 70)
    print("PHASE 12 COMPLETE")
    print("=" * 70)
    print(f"Initial count: {initial_count}")
    print(f"Added: {added}")
    print(f"Skipped (duplicates): {skipped}")
    print(f"Final count: {final_count}")
    target = 2000
    print(f"Progress: {final_count}/{target} ({final_count/target*100:.1f}%)")
    if final_count >= target:
        print(">>> TARGET ACHIEVED! 2000+ ALARMS <<<")
    else:
        print(f">>> {target - final_count} alarms remaining to reach target <<<")
    print("=" * 70)

if __name__ == "__main__":
    main()
