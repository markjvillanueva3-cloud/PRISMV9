#!/usr/bin/env python3
"""
PHASE 11: SIEMENS Extended (12000-series + SINAMICS Drive) + MAZAK Extended
Target: +60-80 alarms
Sources: SIEMENS 840D Diagnostics Manual, SINAMICS S120 Fault Codes, MAZAK MATRIX Alarm Manual
"""

import json
import os
from datetime import datetime

# Path to master database
MASTER_DB_PATH = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers\MASTER_ALARM_DATABASE_v3.json"

def load_database():
    """Load current master database"""
    with open(MASTER_DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_database(db):
    """Save updated database"""
    with open(MASTER_DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)
    print(f"Database saved to {MASTER_DB_PATH}")

def get_existing_ids(db):
    """Get set of existing alarm IDs"""
    return {alarm['alarm_id'] for alarm in db['alarms']}

# SIEMENS 12000-SERIES: Address/Programming Alarms
SIEMENS_12000_ALARMS = [
    {
        "code": "12000",
        "name": "ADDRESS PROGRAMMED REPEATEDLY",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Same address has been programmed multiple times in one block",
        "causes": ["Duplicate address in NC block", "Copy/paste error"],
        "quick_fix": "Remove duplicate address from block, check program syntax",
        "requires_power_cycle": False
    },
    {
        "code": "12010",
        "name": "ADDRESS TYPE PROGRAMMED TOO OFTEN",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Address type appears more times than allowed in block",
        "causes": ["Multiple axis addresses of same type", "Programming syntax error"],
        "quick_fix": "Reduce address repetitions, verify block structure",
        "requires_power_cycle": False
    },
    {
        "code": "12020",
        "name": "ILLEGAL ADDRESS MODIFICATION",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Address contains illegal modification or extension",
        "causes": ["Invalid address extension", "Unsupported address modifier"],
        "quick_fix": "Correct address syntax, remove invalid modifiers",
        "requires_power_cycle": False
    },
    {
        "code": "12030",
        "name": "INVALID PARAMETER OR DATA TYPE",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Parameter or data type is invalid for this command",
        "causes": ["Wrong data type used", "Parameter out of range"],
        "quick_fix": "Check parameter types in programming manual, correct syntax",
        "requires_power_cycle": False
    },
    {
        "code": "12040",
        "name": "EXPRESSION NOT OF DATA TYPE AXIS",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Expression does not resolve to AXIS data type as required",
        "causes": ["Variable type mismatch", "Non-axis expression in axis position"],
        "quick_fix": "Use correct axis identifier or variable type",
        "requires_power_cycle": False
    },
    {
        "code": "12050",
        "name": "DIN ADDRESS NOT CONFIGURED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "DIN address used in program is not configured in machine data",
        "causes": ["MD 10712 NC_USER_CODE_CONF_NAME_TAB not set", "Unconfigured DIN address"],
        "quick_fix": "Configure DIN address in machine data MD 10712 or use standard address",
        "requires_power_cycle": True
    },
    {
        "code": "12060",
        "name": "SAME G GROUP PROGRAMMED REPEATEDLY",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Multiple G codes from the same G group in one block",
        "causes": ["Conflicting G codes", "G17 and G18 in same block"],
        "quick_fix": "Remove duplicate G group codes, keep only one per group",
        "requires_power_cycle": False
    },
    {
        "code": "12070",
        "name": "TOO MANY SYNTAX-DEFINING G FUNCTIONS",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Block contains more syntax-defining G codes than allowed",
        "causes": ["Too many G codes requiring different syntax", "Complex block structure"],
        "quick_fix": "Split block into multiple blocks with fewer G codes each",
        "requires_power_cycle": False
    },
    {
        "code": "12080",
        "name": "FRAME PARAMETERS REPEATED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Frame parameters defined multiple times",
        "causes": ["Duplicate TRANS/ROT/SCALE", "Conflicting frame definitions"],
        "quick_fix": "Use single frame definition per block",
        "requires_power_cycle": False
    },
    {
        "code": "12090",
        "name": "SYNTAX ERROR IN TEXT",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Text contains syntax error or invalid characters",
        "causes": ["Invalid characters in string", "Missing quotes"],
        "quick_fix": "Check text syntax, ensure proper quotes around strings",
        "requires_power_cycle": False
    },
    {
        "code": "12610",
        "name": "SINGLE CHARACTER ACCESS WITH CALL-BY-REFERENCE NOT ALLOWED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Cannot access single character with call-by-reference parameter",
        "causes": ["String manipulation error", "Invalid reference parameter"],
        "quick_fix": "Use different method for character access",
        "requires_power_cycle": False
    },
    {
        "code": "12620",
        "name": "VARIABLE SINGLE CHARACTER ACCESS NOT ALLOWED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Cannot access this variable as single character",
        "causes": ["Variable type does not support character access"],
        "quick_fix": "Convert variable to string before character access",
        "requires_power_cycle": False
    },
    {
        "code": "12630",
        "name": "SKIP ID/LABEL IN CONTROL STRUCTURE NOT ALLOWED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "GOTO or label jump not permitted within control structure",
        "causes": ["GOTO inside IF/WHILE/FOR", "Invalid jump target"],
        "quick_fix": "Restructure program logic without jumping into control structures",
        "requires_power_cycle": False
    },
    {
        "code": "12640",
        "name": "INVALID NESTING OF CONTROL STRUCTURES",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Control structures (IF/WHILE/FOR) improperly nested",
        "causes": ["Missing ENDIF/ENDWHILE", "Overlapping control blocks"],
        "quick_fix": "Verify all control structures are properly closed and nested",
        "requires_power_cycle": False
    },
    {
        "code": "12641",
        "name": "MAXIMUM NESTING DEPTH EXCEEDED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Control structure nesting exceeds maximum allowed depth",
        "causes": ["Too many nested IF/WHILE/FOR", "Complex program logic"],
        "quick_fix": "Simplify program structure, reduce nesting levels",
        "requires_power_cycle": False
    }
]

# SINAMICS S120 DRIVE ALARMS
SINAMICS_DRIVE_ALARMS = [
    {
        "code": "F06010",
        "name": "POWER SUPPLY ERROR",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Error detected in drive power supply section",
        "causes": ["Power module failure", "Supply voltage issue", "Internal fault"],
        "quick_fix": "Check power supply connections and voltage, replace power module if needed",
        "requires_power_cycle": True
    },
    {
        "code": "F06300",
        "name": "MAINS VOLTAGE TOO HIGH",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "Input mains voltage exceeds permissible limit",
        "causes": ["Overvoltage condition", "Unstable power grid", "Wrong voltage setting"],
        "quick_fix": "Verify supply voltage is within spec, check transformer taps",
        "requires_power_cycle": True
    },
    {
        "code": "F07011",
        "name": "MOTOR OVERTEMPERATURE",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "Motor temperature exceeded fault threshold p0605",
        "causes": ["Motor overload", "Cooling failure", "Ambient temperature high"],
        "quick_fix": "Allow motor to cool, check ventilation, verify load parameters",
        "requires_power_cycle": False
    },
    {
        "code": "F07410",
        "name": "CURRENT MEASUREMENT ERROR",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Error in actual current measurement circuit",
        "causes": ["Current sensor failure", "Wiring fault", "Power module issue"],
        "quick_fix": "Check motor cables and connections, replace power module",
        "requires_power_cycle": True
    },
    {
        "code": "F07412",
        "name": "MOTOR SHAFT MOVEMENT UNEXPECTED",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "Motor shaft movement detected when not expected",
        "causes": ["Encoder fault", "External force on motor", "Parameter mismatch"],
        "quick_fix": "Check encoder connections, verify motor is mechanically free",
        "requires_power_cycle": True
    },
    {
        "code": "F07413",
        "name": "MOTOR SHAFT ANGLE DIFFERENCE >45°",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "Motor shaft position differs from expected by more than 45 degrees",
        "causes": ["Encoder fault", "Coupling slippage", "Commutation angle error"],
        "quick_fix": "Re-commission motor, check encoder mounting and coupling",
        "requires_power_cycle": True
    },
    {
        "code": "F07452",
        "name": "POSITION SETPOINT/ACTUAL DIFFERENCE",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "Difference between position setpoint and actual value exceeds tolerance",
        "causes": ["Following error", "Drive overload", "Encoder fault"],
        "quick_fix": "Check mechanical system, verify encoder, tune position loop",
        "requires_power_cycle": False
    },
    {
        "code": "F07453",
        "name": "POSITION ACTUAL VALUE PROCESSING ERROR",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "Error processing actual position value from encoder",
        "causes": ["Encoder communication error", "Signal interference", "Hardware fault"],
        "quick_fix": "Check encoder cable shielding, verify encoder operation",
        "requires_power_cycle": True
    },
    {
        "code": "F07490",
        "name": "DRIVE ON INHIBITING STATE",
        "category": "DRIVE",
        "severity": "MEDIUM",
        "description": "Drive is in ON inhibiting state and cannot be enabled",
        "causes": ["Interlock active", "Safety function engaged", "Fault condition"],
        "quick_fix": "Check interlocks and enable signals, clear pending faults",
        "requires_power_cycle": False
    },
    {
        "code": "F07900",
        "name": "MOTOR STALL - TORQUE LIMIT TIMEOUT",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "Motor at torque limit below speed threshold longer than p2177",
        "causes": ["Mechanical jam", "Overload", "Undersized motor"],
        "quick_fix": "Check for mechanical binding, reduce load, verify sizing",
        "requires_power_cycle": False
    },
    {
        "code": "F07901",
        "name": "MOTOR OVERSPEED",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Maximum allowable motor speed exceeded",
        "causes": ["Speed command too high", "Runaway condition", "Encoder fault"],
        "quick_fix": "Check speed limits, verify encoder, check for regeneration",
        "requires_power_cycle": True
    },
    {
        "code": "F07902",
        "name": "MOTOR STANDSTILL",
        "category": "DRIVE",
        "severity": "MEDIUM",
        "description": "Motor has stopped unexpectedly",
        "causes": ["Mechanical jam", "Load exceeded capability", "Control error"],
        "quick_fix": "Check mechanical system, verify motor has torque capability",
        "requires_power_cycle": False
    },
    {
        "code": "F30002",
        "name": "DC LINK OVERVOLTAGE",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "DC link voltage exceeded maximum safe level",
        "causes": ["Regeneration during braking", "Mains overvoltage", "Braking resistor fault"],
        "quick_fix": "Check braking resistor, verify ramp times, check mains voltage",
        "requires_power_cycle": True
    },
    {
        "code": "F30003",
        "name": "DC LINK UNDERVOLTAGE",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "DC link voltage below minimum operating level",
        "causes": ["Mains undervoltage", "Power supply fault", "Excessive load"],
        "quick_fix": "Check mains supply, verify power module operation",
        "requires_power_cycle": True
    },
    {
        "code": "F30004",
        "name": "POWER MODULE HEATSINK OVERTEMPERATURE",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Power module heatsink temperature exceeded limit",
        "causes": ["Overload condition", "Cooling failure", "High ambient"],
        "quick_fix": "Allow cooling, check fans and ventilation, reduce load",
        "requires_power_cycle": False
    },
    {
        "code": "F30024",
        "name": "FAN FAILURE",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "Cooling fan has failed or is not operating correctly",
        "causes": ["Fan motor failure", "Power supply to fan", "Fan blocked"],
        "quick_fix": "Replace fan, reset operating hours counter p3961=0",
        "requires_power_cycle": False
    },
    {
        "code": "F30035",
        "name": "INTERNAL HARDWARE FAULT",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Internal software error or serious hardware fault detected",
        "causes": ["Control module failure", "Memory error", "Hardware defect"],
        "quick_fix": "Hardware reset required, replace control module if persists",
        "requires_power_cycle": True
    },
    {
        "code": "F30600",
        "name": "DRIVE-CLIQ COMMUNICATION ERROR",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Communication error with DRIVE-CLiQ component",
        "causes": ["Cable fault", "Component failure", "Topology error"],
        "quick_fix": "Check DRIVE-CLiQ cables, verify topology, power cycle component",
        "requires_power_cycle": True
    }
]

# MAZAK EXTENDED ALARMS (500-999 series)
MAZAK_EXTENDED_ALARMS = [
    {
        "code": "500",
        "name": "EXTERNAL I/O DATA ERROR",
        "category": "I/O",
        "severity": "HIGH",
        "description": "Error in external I/O data communication",
        "causes": ["I/O board failure", "Communication cable", "External device fault"],
        "quick_fix": "Check I/O connections, verify external device operation",
        "requires_power_cycle": True
    },
    {
        "code": "501",
        "name": "PLC INPUT DATA ERROR",
        "category": "I/O",
        "severity": "HIGH",
        "description": "PLC input data contains error or is out of range",
        "causes": ["PLC communication fault", "Data corruption", "Sequence error"],
        "quick_fix": "Reset NC system, check PLC program and sequence",
        "requires_power_cycle": True
    },
    {
        "code": "510",
        "name": "SERIAL COMMUNICATION DATA ERROR",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "Error in serial communication data transmission",
        "causes": ["Baud rate mismatch", "Cable fault", "Noise interference"],
        "quick_fix": "Verify communication parameters, check cable connections",
        "requires_power_cycle": False
    },
    {
        "code": "520",
        "name": "DNC/RS-232 BUFFER OVERFLOW",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "Data buffer overflowed during DNC operation",
        "causes": ["Data transmission too fast", "Processing delay", "Buffer size exceeded"],
        "quick_fix": "Reduce transfer rate, add dwell commands in program",
        "requires_power_cycle": False
    },
    {
        "code": "600",
        "name": "MAZATROL UNIT NUMBER ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Invalid unit number in MAZATROL program",
        "causes": ["Unit number out of range", "Missing unit", "Sequence error"],
        "quick_fix": "Check unit numbers in program, ensure sequential ordering",
        "requires_power_cycle": False
    },
    {
        "code": "601",
        "name": "MAZATROL COMMON UNIT MISSING",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Required common unit not found in program",
        "causes": ["Common unit deleted", "Program corruption", "Missing setup"],
        "quick_fix": "Add common unit to program with required setup data",
        "requires_power_cycle": False
    },
    {
        "code": "610",
        "name": "TOOL DATA NOT REGISTERED",
        "category": "TOOL",
        "severity": "MEDIUM",
        "description": "Tool called in program is not registered in tool data",
        "causes": ["Tool not registered", "Wrong tool number", "Tool data deleted"],
        "quick_fix": "Register tool in TOOL DATA screen before running program",
        "requires_power_cycle": False
    },
    {
        "code": "611",
        "name": "TOOL LENGTH DATA ERROR",
        "category": "TOOL",
        "severity": "MEDIUM",
        "description": "Tool length offset data contains error or out of range",
        "causes": ["Invalid tool length value", "Data corruption"],
        "quick_fix": "Re-measure tool and enter correct length data",
        "requires_power_cycle": False
    },
    {
        "code": "620",
        "name": "WORKPIECE COORDINATE ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Workpiece coordinate system data contains error",
        "causes": ["Invalid coordinate value", "Origin not set", "Data corruption"],
        "quick_fix": "Re-set workpiece origin, verify coordinate values",
        "requires_power_cycle": False
    },
    {
        "code": "700",
        "name": "MAZATROL SEQUENCE NUMBER ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Invalid sequence number in MAZATROL program",
        "causes": ["Duplicate sequence", "Gap in sequence", "Invalid format"],
        "quick_fix": "Correct sequence numbering in program",
        "requires_power_cycle": False
    },
    {
        "code": "710",
        "name": "PROCESS UNIT ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Error in MAZATROL process unit definition",
        "causes": ["Invalid process parameters", "Missing required data"],
        "quick_fix": "Review process unit settings and correct parameters",
        "requires_power_cycle": False
    },
    {
        "code": "720",
        "name": "SHAPE UNIT ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Error in MAZATROL shape unit definition",
        "causes": ["Invalid geometry", "Shape cannot be calculated"],
        "quick_fix": "Review shape definition, ensure valid geometry",
        "requires_power_cycle": False
    },
    {
        "code": "800",
        "name": "EIA/ISO G CODE ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Invalid or unsupported G code in EIA/ISO program",
        "causes": ["G code not supported", "Wrong format", "Syntax error"],
        "quick_fix": "Check G code validity for this control, correct syntax",
        "requires_power_cycle": False
    },
    {
        "code": "810",
        "name": "EIA/ISO M CODE ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Invalid or unsupported M code in EIA/ISO program",
        "causes": ["M code not supported", "PLC function not available"],
        "quick_fix": "Verify M code is valid for this machine configuration",
        "requires_power_cycle": False
    },
    {
        "code": "820",
        "name": "EIA/ISO CANNED CYCLE ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Error in canned cycle definition or parameters",
        "causes": ["Missing parameters", "Invalid cycle sequence"],
        "quick_fix": "Review canned cycle parameters and format",
        "requires_power_cycle": False
    },
    {
        "code": "900",
        "name": "EIA/ISO SUBPROGRAM ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Error calling or executing subprogram",
        "causes": ["Subprogram not found", "Nesting too deep", "Missing M99"],
        "quick_fix": "Verify subprogram exists and has proper return command",
        "requires_power_cycle": False
    },
    {
        "code": "910",
        "name": "EIA/ISO MACRO ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Error in macro variable or calculation",
        "causes": ["Divide by zero", "Variable out of range", "Syntax error"],
        "quick_fix": "Check macro calculations and variable assignments",
        "requires_power_cycle": False
    },
    {
        "code": "2100",
        "name": "INTERFERENCE CHECK ALARM",
        "category": "COLLISION",
        "severity": "CRITICAL",
        "description": "Potential collision detected by interference check function",
        "causes": ["Tool path interference", "Fixture collision", "Geometry conflict"],
        "quick_fix": "Review tool path, verify fixture setup, modify program",
        "requires_power_cycle": False
    },
    {
        "code": "2110",
        "name": "SPINDLE HEAD INTERFERENCE",
        "category": "COLLISION",
        "severity": "CRITICAL",
        "description": "Spindle head may collide with workpiece or fixture",
        "causes": ["Z-axis too deep", "Fixture too tall", "Wrong work offset"],
        "quick_fix": "Review Z-axis limits, adjust clearance heights",
        "requires_power_cycle": False
    },
    {
        "code": "2120",
        "name": "TURRET INTERFERENCE",
        "category": "COLLISION",
        "severity": "CRITICAL",
        "description": "Turret may collide during rotation or movement",
        "causes": ["Tool extends too far", "Turret clearance insufficient"],
        "quick_fix": "Review turret clearance, check tool lengths",
        "requires_power_cycle": False
    }
]

def create_alarm_entry(alarm_data, family, source, phase):
    """Create standardized alarm entry"""
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
    print("PHASE 11: SIEMENS Extended + SINAMICS Drive + MAZAK Extended")
    print("=" * 70)
    
    # Load database
    db = load_database()
    existing_ids = get_existing_ids(db)
    initial_count = len(db['alarms'])
    print(f"Current alarm count: {initial_count}")
    
    added = 0
    skipped = 0
    
    # Add SIEMENS 12000-series alarms
    print("\n--- Adding SIEMENS 12000-series Programming Alarms ---")
    for alarm in SIEMENS_12000_ALARMS:
        entry = create_alarm_entry(
            alarm, "SIEMENS",
            "SIEMENS SINUMERIK 840D sl Diagnostics Manual V4.7",
            "Phase 11"
        )
        if entry['alarm_id'] not in existing_ids:
            db['alarms'].append(entry)
            existing_ids.add(entry['alarm_id'])
            added += 1
            print(f"  + {entry['alarm_id']}: {entry['name']}")
        else:
            skipped += 1
            print(f"  SKIP (exists): {entry['alarm_id']}")
    
    # Add SINAMICS drive alarms
    print("\n--- Adding SINAMICS S120 Drive Alarms ---")
    for alarm in SINAMICS_DRIVE_ALARMS:
        entry = create_alarm_entry(
            alarm, "SIEMENS",
            "SINAMICS S120 Fault Codes Manual",
            "Phase 11"
        )
        if entry['alarm_id'] not in existing_ids:
            db['alarms'].append(entry)
            existing_ids.add(entry['alarm_id'])
            added += 1
            print(f"  + {entry['alarm_id']}: {entry['name']}")
        else:
            skipped += 1
            print(f"  SKIP (exists): {entry['alarm_id']}")
    
    # Add MAZAK extended alarms
    print("\n--- Adding MAZAK Extended Alarms ---")
    for alarm in MAZAK_EXTENDED_ALARMS:
        entry = create_alarm_entry(
            alarm, "MAZAK",
            "MAZAK MAZATROL MATRIX Alarm Manual",
            "Phase 11"
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
    db['metadata']['version'] = "3.9.0-PHASE11"
    db['metadata']['last_updated'] = datetime.now().isoformat()
    db['metadata']['total_alarms'] = final_count
    db['metadata']['expansion_notes'] = "Phase 11 - SIEMENS 12000-series + SINAMICS S120 + MAZAK Extended"
    
    # Add new sources
    new_sources = [
        "SIEMENS SINUMERIK 840D sl Diagnostics Manual V4.7 SP2",
        "SINAMICS S120 Fault Codes Manual",
        "MAZAK MAZATROL MATRIX Alarm Manual",
        "MRO Electric SINAMICS Diagnostics Blog"
    ]
    for src in new_sources:
        if src not in db['metadata']['sources']:
            db['metadata']['sources'].append(src)
    
    # Save database
    save_database(db)
    
    # Summary
    print("\n" + "=" * 70)
    print("PHASE 11 COMPLETE")
    print("=" * 70)
    print(f"Initial count: {initial_count}")
    print(f"Added: {added}")
    print(f"Skipped (duplicates): {skipped}")
    print(f"Final count: {final_count}")
    print(f"Progress: {final_count}/2000 ({final_count/20:.1f}%)")
    print("=" * 70)

if __name__ == "__main__":
    main()
