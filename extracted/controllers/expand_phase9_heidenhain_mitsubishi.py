#!/usr/bin/env python3
"""
PRISM Alarm Database Expansion - Phase 9
HEIDENHAIN TNC Extended + MITSUBISHI M80/M800 Series
Target: 1,735 -> 1,800+ alarms
"""

import json
import os
from datetime import datetime

# Base path
BASE_PATH = r"C:\\PRISM\EXTRACTED\controllers"
DB_FILE = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")

def load_database():
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_database(db):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

def get_existing_ids(db):
    return {alarm['alarm_id'] for alarm in db['alarms']}

# HEIDENHAIN TNC 640/7 Extended Alarms
HEIDENHAIN_EXTENDED = [
    # FN14 Error Messages (1000 series)
    {
        "alarm_id": "ALM-HEIDENHAIN-1000",
        "code": "1000",
        "name": "SPINDLE?",
        "category": "SPINDLE",
        "severity": "MEDIUM",
        "description": "Spindle command missing or spindle not defined",
        "causes": ["Missing spindle command", "Spindle not configured", "Program error"],
        "quick_fix": "Add spindle command or verify spindle configuration",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1001",
        "code": "1001",
        "name": "TOOL AXIS IS MISSING",
        "category": "PROGRAM",
        "severity": "HIGH",
        "description": "Tool axis not programmed or incorrectly defined",
        "causes": ["Missing tool axis", "Incorrect axis configuration", "Program error"],
        "quick_fix": "Add tool axis command or correct program",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1002",
        "code": "1002",
        "name": "TOOL RADIUS TOO SMALL",
        "category": "TOOL",
        "severity": "MEDIUM",
        "description": "Programmed tool radius is smaller than minimum allowed",
        "causes": ["Tool data error", "Wrong tool selected", "Parameter misconfiguration"],
        "quick_fix": "Check tool radius in tool table",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1003",
        "code": "1003",
        "name": "TOOL RADIUS TOO LARGE",
        "category": "TOOL",
        "severity": "MEDIUM",
        "description": "Programmed tool radius exceeds maximum allowed",
        "causes": ["Tool data error", "Contour too small for tool", "Tool selection error"],
        "quick_fix": "Select smaller tool or modify contour",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1004",
        "code": "1004",
        "name": "RANGE EXCEEDED",
        "category": "AXIS",
        "severity": "HIGH",
        "description": "Programmed position exceeds machine travel range",
        "causes": ["Program error", "Incorrect work offset", "Travel limit exceeded"],
        "quick_fix": "Correct programmed position or work offset",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1005",
        "code": "1005",
        "name": "START POSITION INCORRECT",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Invalid start position for cycle or contour",
        "causes": ["Wrong start point", "Position conflict", "Cycle parameter error"],
        "quick_fix": "Correct start position in program",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1006",
        "code": "1006",
        "name": "ROTATION NOT PERMITTED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Rotation command not allowed in current context",
        "causes": ["Conflicting transformation", "Invalid combination", "Program sequence error"],
        "quick_fix": "Remove or relocate ROTATION command",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1007",
        "code": "1007",
        "name": "SCALING FACTOR NOT PERMITTED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Scaling factor command not allowed in current context",
        "causes": ["Conflicting transformation", "Invalid combination", "Scaling limit exceeded"],
        "quick_fix": "Remove or adjust SCALING FACTOR command",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1008",
        "code": "1008",
        "name": "MIRROR IMAGE NOT PERMITTED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Mirror image command not allowed in current context",
        "causes": ["Conflicting transformation", "Invalid axis selection"],
        "quick_fix": "Remove or relocate MIRROR IMAGE command",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1009",
        "code": "1009",
        "name": "DATUM SHIFT NOT PERMITTED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Datum shift command not allowed in current context",
        "causes": ["Transformation conflict", "Invalid sequence"],
        "quick_fix": "Remove or relocate datum shift command",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1010",
        "code": "1010",
        "name": "FEED RATE IS MISSING",
        "category": "PROGRAM",
        "severity": "HIGH",
        "description": "Feed rate not programmed for movement command",
        "causes": ["Missing F command", "Feed rate cleared", "Program error"],
        "quick_fix": "Add feed rate command (F)",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1011",
        "code": "1011",
        "name": "INPUT VALUE INCORRECT",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Entered value is outside allowed range or format",
        "causes": ["Invalid input", "Format error", "Range exceeded"],
        "quick_fix": "Correct input value",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1012",
        "code": "1012",
        "name": "INCORRECT SIGN",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Sign of programmed value is incorrect for context",
        "causes": ["Wrong polarity", "Sign error in calculation"],
        "quick_fix": "Correct sign in program",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1013",
        "code": "1013",
        "name": "ENTERED ANGLE NOT PERMITTED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Programmed angle value not allowed",
        "causes": ["Angle out of range", "Invalid angle format", "Geometric impossibility"],
        "quick_fix": "Correct angle value in program",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1014",
        "code": "1014",
        "name": "TOUCH POINT INACCESSIBLE",
        "category": "PROBING",
        "severity": "MEDIUM",
        "description": "Probing cycle cannot reach designated touch point",
        "causes": ["Position unreachable", "Clearance insufficient", "Geometry conflict"],
        "quick_fix": "Adjust probing position or approach",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1015",
        "code": "1015",
        "name": "TOO MANY POINTS",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Number of programmed points exceeds maximum allowed",
        "causes": ["Spline point limit", "Memory limit", "Contour complexity"],
        "quick_fix": "Reduce number of contour points",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1016",
        "code": "1016",
        "name": "CONTRADICTORY INPUT",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Programmed values are mathematically contradictory",
        "causes": ["Geometric impossibility", "Conflicting parameters", "Calculation error"],
        "quick_fix": "Review and correct contradictory values",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1017",
        "code": "1017",
        "name": "CYCL INCOMPLETE",
        "category": "CYCLE",
        "severity": "HIGH",
        "description": "Fixed cycle definition is incomplete or missing parameters",
        "causes": ["Missing cycle parameters", "Cycle not properly defined"],
        "quick_fix": "Complete cycle definition with required parameters",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1018",
        "code": "1018",
        "name": "PLANE WRONGLY DEFINED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Working plane definition is incorrect",
        "causes": ["Invalid plane selection", "Axis configuration error"],
        "quick_fix": "Correct plane definition",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1019",
        "code": "1019",
        "name": "WRONG AXIS PROGRAMMED",
        "category": "AXIS",
        "severity": "MEDIUM",
        "description": "Programmed axis is invalid for current operation",
        "causes": ["Invalid axis selection", "Axis not configured", "Axis conflict"],
        "quick_fix": "Select correct axis for operation",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1020",
        "code": "1020",
        "name": "WRONG RPM",
        "category": "SPINDLE",
        "severity": "MEDIUM",
        "description": "Spindle RPM value is incorrect for operation",
        "causes": ["RPM out of range", "Invalid spindle speed", "Machine capability exceeded"],
        "quick_fix": "Correct spindle speed command",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1021",
        "code": "1021",
        "name": "RADIUS COMP. UNDEFINED",
        "category": "TOOL",
        "severity": "HIGH",
        "description": "Tool radius compensation not defined before use",
        "causes": ["Missing RL/RR command", "Compensation not activated"],
        "quick_fix": "Add radius compensation command before contour",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-1022",
        "code": "1022",
        "name": "ROUNDING-OFF UNDEFINED",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Rounding radius not defined for corner",
        "causes": ["Missing RND parameter", "Rounding not specified"],
        "quick_fix": "Add rounding parameter",
        "requires_power_cycle": False
    },
    # System Alarms
    {
        "alarm_id": "ALM-HEIDENHAIN-SYS001",
        "code": "SYS001",
        "name": "TNC OPERATING TEMPERATURE EXCEEDED",
        "category": "THERMAL",
        "severity": "CRITICAL",
        "description": "Control operating temperature has exceeded safe limits",
        "causes": ["Insufficient cooling", "Fan failure", "Ambient temperature too high"],
        "quick_fix": "Check heat transfer in electrical cabinet, check fan on logic unit",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-SYS002",
        "code": "SYS002",
        "name": "ZIP FILE CREATE ERROR",
        "category": "FILE",
        "severity": "MEDIUM",
        "description": "TNC was not able to create or close zip file - file may be corrupt",
        "causes": ["Disk full", "File corruption", "Permission error"],
        "quick_fix": "Try again to create zip file, check disk space",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-SYS003",
        "code": "SYS003",
        "name": "NO RESPONSE FROM DRIVE",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "No response received from drive system",
        "causes": ["Drive communication failure", "Drive power off", "Cable fault"],
        "quick_fix": "Check drive power and communication cables",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-SYS004",
        "code": "SYS004",
        "name": "NETWORK DRIVE NOT READY",
        "category": "NETWORK",
        "severity": "MEDIUM",
        "description": "Network drive is no longer ready or no longer reacts",
        "causes": ["Network disconnection", "Server down", "Authentication failure"],
        "quick_fix": "Check network connection and server status",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-SYS005",
        "code": "SYS005",
        "name": "CONFIGURATION FILE WRITE ERROR",
        "category": "FILE",
        "severity": "HIGH",
        "description": "Configuration file cannot be written",
        "causes": ["Write protection", "Disk full", "File locked"],
        "quick_fix": "Check file permissions and disk space",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-SYS006",
        "code": "SYS006",
        "name": "CONFIGURATION FILE NOT FOUND",
        "category": "FILE",
        "severity": "HIGH",
        "description": "Required configuration file cannot be found",
        "causes": ["File deleted", "Wrong path", "Disk error"],
        "quick_fix": "Restore configuration file, inform service agency",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-SYS007",
        "code": "SYS007",
        "name": "EPROM CRC ERROR",
        "category": "HARDWARE",
        "severity": "CRITICAL",
        "description": "CRC sum of EPROMs is incorrect - memory corruption",
        "causes": ["EPROM failure", "Memory corruption", "Hardware fault"],
        "quick_fix": "Contact service agency - EPROM replacement required",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-SYS008",
        "code": "SYS008",
        "name": "NOMINAL SPEED VALUE TOO HIGH",
        "category": "CALCULATION",
        "severity": "HIGH",
        "description": "Calculated nominal speed value is excessively high",
        "causes": ["Calculation overflow", "Parameter error", "Program error"],
        "quick_fix": "Check speed parameters and program",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-HEIDENHAIN-SYS009",
        "code": "SYS009",
        "name": "KEY STUCK DETECTION",
        "category": "INPUT",
        "severity": "MEDIUM",
        "description": "One or more keys were pressed for more than 5 seconds",
        "causes": ["Key stuck", "Keyboard fault", "Debris under key"],
        "quick_fix": "Press SHIFT, CTRL, ALT keys; if problem continues, inform service",
        "requires_power_cycle": False
    }
]


# MITSUBISHI M80/M800 Series Extended Alarms
MITSUBISHI_EXTENDED = [
    # Operation Errors (M01-M99)
    {
        "alarm_id": "ALM-MITSUBISHI-M01-0001",
        "code": "M01-0001",
        "name": "INTERLOCK SIGNAL ACTIVE",
        "category": "INTERLOCK",
        "severity": "MEDIUM",
        "description": "Interlock signal has been input to lock block start",
        "causes": ["Safety interlock active", "Sequence program fault", "External signal"],
        "quick_fix": "Check interlock signal line for broken wires",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-M01-0002",
        "code": "M01-0002",
        "name": "CUTTING INTERLOCK ACTIVE",
        "category": "INTERLOCK",
        "severity": "MEDIUM",
        "description": "Interlock signal to lock cutting block start has been input",
        "causes": ["Cutting interlock signal", "Safety function active"],
        "quick_fix": "Check cutting interlock signal status",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-M01-0005",
        "code": "M01-0005",
        "name": "INTERNAL INTERLOCK AXIS EXISTS",
        "category": "INTERLOCK",
        "severity": "MEDIUM",
        "description": "Internal interlock state has been entered",
        "causes": ["Servo OFF function valid", "Absolute encoder detached", "Manual/auto conflict", "Collision detection active"],
        "quick_fix": "Release servo OFF function, check encoder connection",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-M01-0006",
        "code": "M01-0006",
        "name": "STROKE END ACTIVE",
        "category": "AXIS",
        "severity": "HIGH",
        "description": "Stroke end function has activated - axis in stroke end status",
        "causes": ["Travel limit reached", "Stroke end input signal OFF"],
        "quick_fix": "Move axis away from limit using JOG mode",
        "requires_power_cycle": False
    },
    # Servo/Spindle Alarms (S01/S03/S04)
    {
        "alarm_id": "ALM-MITSUBISHI-S01-10",
        "code": "S01-10",
        "name": "INSUFFICIENT VOLTAGE",
        "category": "POWER",
        "severity": "HIGH",
        "description": "Drop of bus voltage was detected in main circuit",
        "causes": ["Power supply issue", "Main circuit fault", "Regeneration overload"],
        "quick_fix": "Check power supply voltage and connections",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MITSUBISHI-S01-27",
        "code": "S01-27",
        "name": "SUB SIDE ENCODER ERROR 5",
        "category": "ENCODER",
        "severity": "HIGH",
        "description": "Error detected by encoder connected to machine side",
        "causes": ["Encoder fault", "Cable damage", "Encoder type mismatch"],
        "quick_fix": "Check encoder connection and type configuration",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-S01-41",
        "code": "S01-41",
        "name": "FEEDBACK ERROR 3",
        "category": "ENCODER",
        "severity": "HIGH",
        "description": "Missed feedback pulse or Z-phase error in full closed loop",
        "causes": ["Encoder fault", "Cable noise", "Scale contamination"],
        "quick_fix": "Check encoder/scale, verify cable shielding",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-S01-5B",
        "code": "S01-5B",
        "name": "SAFELY LIMITED SPEED MONITORING ERROR",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Commanded speed exceeding safely limited speed detected",
        "causes": ["Speed command too high", "Safety function violation"],
        "quick_fix": "Reduce commanded speed to within safety limits",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-S01-4D",
        "code": "S01-4D",
        "name": "DUAL SIGNAL ERROR",
        "category": "SAFETY",
        "severity": "HIGH",
        "description": "Error detected in signal related to dual signal safety function",
        "causes": ["Safety circuit fault", "Signal mismatch", "Hardware failure"],
        "quick_fix": "Check safety function signals and connections",
        "requires_power_cycle": True
    },
    # Power Supply Alarms (S01-61 to S01-66)
    {
        "alarm_id": "ALM-MITSUBISHI-S01-61",
        "code": "S01-61",
        "name": "POWER SUPPLY OVERCURRENT",
        "category": "POWER",
        "severity": "CRITICAL",
        "description": "Overcurrent protection function in power module has activated",
        "causes": ["Short circuit", "Motor fault", "Amplifier failure"],
        "quick_fix": "Check motor and cable for short circuit",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MITSUBISHI-S01-62",
        "code": "S01-62",
        "name": "POWER SUPPLY FREQUENCY ERROR",
        "category": "POWER",
        "severity": "HIGH",
        "description": "Input power supply frequency exceeded specification range",
        "causes": ["Power supply unstable", "Generator issue", "UPS problem"],
        "quick_fix": "Check input power supply frequency",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-S01-66",
        "code": "S01-66",
        "name": "POWER SUPPLY PROCESS ERROR",
        "category": "POWER",
        "severity": "HIGH",
        "description": "Error occurred in power supply process cycle",
        "causes": ["Power module fault", "Internal error"],
        "quick_fix": "Check power module operation, may require replacement",
        "requires_power_cycle": True
    },
    # Initial Parameter Errors (S02)
    {
        "alarm_id": "ALM-MITSUBISHI-S02-2201",
        "code": "S02-2201",
        "name": "INITIAL PARAMETER ERROR - SERVO",
        "category": "PARAMETER",
        "severity": "HIGH",
        "description": "Servo parameter setting data is illegal at startup",
        "causes": ["Parameter corruption", "Wrong parameter value", "Version mismatch"],
        "quick_fix": "Verify and correct servo parameters",
        "requires_power_cycle": True
    },
    # Stop Codes (T)
    {
        "alarm_id": "ALM-MITSUBISHI-T0101",
        "code": "T0101",
        "name": "SPINDLE STOPPED DURING THREADING",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle stopped during synchronous feed or thread cutting",
        "causes": ["Spindle overload", "Emergency stop", "Power interruption"],
        "quick_fix": "Check spindle drive and restart program",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-T0201",
        "code": "T0201",
        "name": "HANDLE FEED AXIS OUT OF SPEC",
        "category": "AXIS",
        "severity": "MEDIUM",
        "description": "Axis designated at handle feed is out of specifications",
        "causes": ["No axis selected", "Multiple axes allocated to handle"],
        "quick_fix": "Select single valid axis for handle feed",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-T0301",
        "code": "T0301",
        "name": "SPINDLE SPEED EXCEEDED AXIS CLAMP",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle rotation speed exceeded axis clamp speed during threading",
        "causes": ["Speed too high for thread pitch", "Clamp parameter error"],
        "quick_fix": "Reduce spindle speed or adjust clamp parameter",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-T0401",
        "code": "T0401",
        "name": "COLLATION STOP",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Collation stop occurred during block comparison",
        "causes": ["Block mismatch during comparison", "Program verification"],
        "quick_fix": "Execute automatic start to resume operation",
        "requires_power_cycle": False
    },
    # Synchronous Tapping Errors
    {
        "alarm_id": "ALM-MITSUBISHI-M03-0021",
        "code": "M03-0021",
        "name": "TAPPING SPINDLE SELECT ERROR",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Synchronous tapping command with spindle select signals all OFF",
        "causes": ["Spindle not selected", "Signal wiring error"],
        "quick_fix": "Turn ON spindle select signal (SWS) for tapping spindle",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-M03-0022",
        "code": "M03-0022",
        "name": "TAPPING PITCH/THREAD ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Pitch or thread number command incorrect in synchronous tapping",
        "causes": ["Invalid pitch value", "Thread number too large for speed"],
        "quick_fix": "Correct pitch value or reduce spindle speed",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-M03-0023",
        "code": "M03-0023",
        "name": "TAP RETRACT INTERLOCK",
        "category": "INTERLOCK",
        "severity": "MEDIUM",
        "description": "Axis travel command interlocked while tap retract is enabled",
        "causes": ["Tap retract active", "Manual intervention during tapping"],
        "quick_fix": "Perform tap retract before issuing travel command",
        "requires_power_cycle": False
    },
    # Safety Function Errors (S05)
    {
        "alarm_id": "ALM-MITSUBISHI-S05-0001",
        "code": "S05-0001",
        "name": "REGISTER DIAGNOSIS ERROR",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Register diagnosis error detected in safety function",
        "causes": ["Safety function hardware fault", "Memory error"],
        "quick_fix": "Contact service - safety system inspection required",
        "requires_power_cycle": True
    },
    # Encoder Alarms
    {
        "alarm_id": "ALM-MITSUBISHI-ENC-THERMAL",
        "code": "ENC-TH",
        "name": "ENCODER THERMAL ERROR",
        "category": "ENCODER",
        "severity": "HIGH",
        "description": "Encoder thermal error detected (OSA405/TS5690)",
        "causes": ["Encoder overheating", "Ambient temperature too high"],
        "quick_fix": "Check encoder cooling and ambient temperature",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MITSUBISHI-ENC-MEMORY",
        "code": "ENC-MEM",
        "name": "ENCODER MEMORY ERROR",
        "category": "ENCODER",
        "severity": "HIGH",
        "description": "Encoder internal memory error detected",
        "causes": ["Encoder failure", "Memory corruption"],
        "quick_fix": "Replace encoder",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MITSUBISHI-ENC-OVERSPEED",
        "code": "ENC-SPD",
        "name": "ENCODER OVERSPEED",
        "category": "ENCODER",
        "severity": "HIGH",
        "description": "Encoder overspeed condition detected",
        "causes": ["Speed exceeded encoder rating", "Axis runaway"],
        "quick_fix": "Reduce speed, check for mechanical issues",
        "requires_power_cycle": False
    }
]

def main():
    """Main function to expand the alarm database."""
    print("=" * 70)
    print("PRISM ALARM DATABASE EXPANSION - PHASE 9")
    print("HEIDENHAIN TNC Extended + MITSUBISHI M80/M800 Series")
    print("=" * 70)
    
    # Load database
    db = load_database()
    existing_ids = get_existing_ids(db)
    initial_count = len(db['alarms'])
    
    print(f"\nStarting count: {initial_count} alarms")
    print(f"Existing IDs tracked: {len(existing_ids)}")
    
    # Track additions
    added = 0
    skipped = 0
    
    # Process HEIDENHAIN alarms
    print("\n--- Processing HEIDENHAIN TNC Extended Alarms ---")
    for alarm in HEIDENHAIN_EXTENDED:
        if alarm['alarm_id'] not in existing_ids:
            alarm['family'] = 'HEIDENHAIN'
            alarm['source'] = 'HEIDENHAIN TNC 640 NC Error Messages Manual'
            alarm['added_phase'] = 'Phase 9'
            alarm['timestamp'] = datetime.now().isoformat()
            db['alarms'].append(alarm)
            existing_ids.add(alarm['alarm_id'])
            added += 1
            print(f"  + Added: {alarm['alarm_id']} - {alarm['name']}")
        else:
            skipped += 1
            print(f"  - Skipped (exists): {alarm['alarm_id']}")
    
    # Process MITSUBISHI alarms
    print("\n--- Processing MITSUBISHI M80/M800 Extended Alarms ---")
    for alarm in MITSUBISHI_EXTENDED:
        if alarm['alarm_id'] not in existing_ids:
            alarm['family'] = 'MITSUBISHI'
            alarm['source'] = 'MITSUBISHI M800/M80/E80 Series Alarm/Parameter Manual'
            alarm['added_phase'] = 'Phase 9'
            alarm['timestamp'] = datetime.now().isoformat()
            db['alarms'].append(alarm)
            existing_ids.add(alarm['alarm_id'])
            added += 1
            print(f"  + Added: {alarm['alarm_id']} - {alarm['name']}")
        else:
            skipped += 1
            print(f"  - Skipped (exists): {alarm['alarm_id']}")
    
    # Update metadata
    final_count = len(db['alarms'])
    db['metadata']['version'] = '3.7.0-PHASE9'
    db['metadata']['last_updated'] = datetime.now().isoformat()
    db['metadata']['total_alarms'] = final_count
    db['metadata']['expansion_notes'] = 'Phase 9 - HEIDENHAIN TNC Extended + MITSUBISHI M80/M800'
    
    # Add sources
    new_sources = [
        'HEIDENHAIN TNC 640 NC Error Messages Manual',
        'MITSUBISHI M800/M80/E80 Series Alarm/Parameter Manual IB-1501279',
        'HEIDENHAIN TNC7 TNC 640 Programming Guide'
    ]
    for src in new_sources:
        if src not in db['metadata']['sources']:
            db['metadata']['sources'].append(src)
    
    # Save database
    save_database(db)
    
    # Summary
    print("\n" + "=" * 70)
    print("PHASE 9 EXPANSION COMPLETE")
    print("=" * 70)
    print(f"Initial count:   {initial_count}")
    print(f"Added:           {added}")
    print(f"Skipped:         {skipped}")
    print(f"Final count:     {final_count}")
    print(f"Target (2000):   {final_count/2000*100:.1f}%")
    print("=" * 70)
    
    return {
        'initial': initial_count,
        'added': added,
        'skipped': skipped,
        'final': final_count
    }

if __name__ == "__main__":
    result = main()
