#!/usr/bin/env python3
"""
PRISM Phase 6 Expansion: HAAS Extended Series
Target: +60 new HAAS alarms
"""
import json
from datetime import datetime

# Phase 6 HAAS Extended Alarms
PHASE6_HAAS_ALARMS = [
    # Program/Code Alarms (321-344)
    {
        "alarm_id": "ALM-HAAS-321",
        "code": "321",
        "name": "AUTO OFF ALARM",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Occurs in debug mode only when auto-off timer expires",
        "causes": ["Debug mode timeout", "Machine idle too long in debug"],
        "quick_fix": "Press RESET to clear. Only occurs during debug operations.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-322",
        "code": "322",
        "name": "SUB PROG WITHOUT M99",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Subprogram called without M99 return code at end",
        "causes": ["Missing M99 at end of subprogram", "Subprogram file corrupted"],
        "quick_fix": "Add M99 code to end of program called as subroutine. Check program structure.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-323",
        "code": "323",
        "name": "ATM CRC ERROR",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "Advanced Tool Management variables lost, possibly due to low battery",
        "causes": ["Low battery", "Memory corruption", "Power loss during save"],
        "quick_fix": "Check for low battery alarm. Replace battery if needed. Re-enter ATM data.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-324",
        "code": "324",
        "name": "DELAY TIME RANGE ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "P code in G04 exceeds 999.999 seconds or invalid M95 time format",
        "causes": ["P code >= 1000 seconds", "Invalid M95 time format", "Decimal point error"],
        "quick_fix": "Reduce dwell time to under 1000 seconds. Check P code format.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-325",
        "code": "325",
        "name": "QUEUE FULL",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "Motion command queue overflow - internal processor error",
        "causes": ["Software fault", "Processor overload", "Buffer overflow"],
        "quick_fix": "Cycle power on machine. If recurring, contact dealer.",
        "requires_power_cycle": True,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-326",
        "code": "326",
        "name": "G04 WITHOUT P CODE",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Dwell command G04 programmed without P value for time",
        "causes": ["Missing P code", "P code syntax error"],
        "quick_fix": "Add Pn.n for seconds or Pn for milliseconds to G04 command.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-327",
        "code": "327",
        "name": "NO LOOP FOR M CODE EXCEPT M97, 98",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "L code specified with M code that doesn't support looping",
        "causes": ["L code used with incompatible M code", "Syntax error"],
        "quick_fix": "Remove L code from line. L code only valid with M97, M98.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-328",
        "code": "328",
        "name": "INVALID TOOL NUMBER",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool number exceeds maximum defined in Parameter 65",
        "causes": ["Tool number > Parameter 65 value", "Typo in tool call"],
        "quick_fix": "Verify tool number is between 1 and Parameter 65 limit.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-329",
        "code": "329",
        "name": "UNDEFINED M CODE",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "M code not recognized by control",
        "causes": ["Invalid M code", "Typo", "Optional M code not enabled"],
        "quick_fix": "Check M code validity. Verify options are enabled if required.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-330",
        "code": "330",
        "name": "UNDEFINED MACRO CALL",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Macro program called but not defined",
        "causes": ["Macro not loaded", "Wrong macro number", "File missing"],
        "quick_fix": "Load macro program. Verify macro number is correct.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-331",
        "code": "331",
        "name": "RANGE ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Value in program exceeds allowable range",
        "causes": ["Coordinate exceeds limits", "Feed rate too high", "Parameter out of range"],
        "quick_fix": "Check program values against machine limits.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-332",
        "code": "332",
        "name": "H AND T NOT MATCHED",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Height offset H code doesn't match tool number T",
        "causes": ["H offset different from T number", "Setting 15 enforcing match"],
        "quick_fix": "Match H offset number to T tool number, or disable Setting 15.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-333",
        "code": "333",
        "name": "X AXIS DISABLED",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "X axis servo disabled - cannot execute X motion",
        "causes": ["Servo fault", "X axis not homed", "Drive disabled"],
        "quick_fix": "Clear alarms, re-enable servos, home X axis.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-334",
        "code": "334",
        "name": "Y AXIS DISABLED",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Y axis servo disabled - cannot execute Y motion",
        "causes": ["Servo fault", "Y axis not homed", "Drive disabled"],
        "quick_fix": "Clear alarms, re-enable servos, home Y axis.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-337",
        "code": "337",
        "name": "GOTO OR P LINE NOT FOUND",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "GOTO command references line number that doesn't exist",
        "causes": ["Invalid line number", "Line deleted", "N number error"],
        "quick_fix": "Verify target N number exists in program.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-341",
        "code": "341",
        "name": "CUTTER COMP END WITH G02 OR G03",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Attempted to cancel cutter compensation on arc move",
        "causes": ["G40 with G02/G03", "Improper comp cancellation"],
        "quick_fix": "Cancel cutter comp (G40) on linear move before arc.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-342",
        "code": "342",
        "name": "CUTTER COMP PATH TOO SMALL",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Move distance too small for cutter compensation offset",
        "causes": ["Move smaller than tool radius", "Geometry violation"],
        "quick_fix": "Increase move distance or reduce tool offset.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-344",
        "code": "344",
        "name": "CUTTER COMP WITH G18 AND G19",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Cutter compensation attempted in XZ or YZ plane (Mill)",
        "causes": ["G18/G19 active with G41/G42", "Wrong plane selection"],
        "quick_fix": "Select G17 (XY plane) before cutter compensation.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    
    # RS-232 / File Alarms (400-415)
    {
        "alarm_id": "ALM-HAAS-400",
        "code": "400",
        "name": "SKIP SIGNAL DURING RESTART",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Skip signal active during program restart operation",
        "causes": ["Skip switch still triggered", "Probe still in contact"],
        "quick_fix": "Clear skip condition before restart. Check probe status.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-401",
        "code": "401",
        "name": "INVALID TANGENT IN GROUP 1",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Invalid tangent calculation for corner rounding or chamfering",
        "causes": ["Geometry doesn't allow corner rounding", "Arc too tight"],
        "quick_fix": "Check geometry allows tangent calculation. Modify corner values.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-402",
        "code": "402",
        "name": "POSSIBLE CORRUPTED FILE",
        "category": "PROGRAM",
        "severity": "HIGH",
        "description": "Program file appears to be corrupted",
        "causes": ["Transfer error", "Memory corruption", "Power loss during save"],
        "quick_fix": "Re-load program from backup. Check file integrity.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-403",
        "code": "403",
        "name": "TOO MANY PROGS",
        "category": "SYSTEM",
        "severity": "MEDIUM",
        "description": "Maximum number of programs in memory exceeded",
        "causes": ["Too many files stored", "Memory full"],
        "quick_fix": "Delete unused programs to make room.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-404",
        "code": "404",
        "name": "RS-232 NO PROG NAME",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "Program received via RS-232 has no O number",
        "causes": ["Missing O number in file", "Transfer started mid-file"],
        "quick_fix": "Add O number to program file header.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-405",
        "code": "405",
        "name": "RS-232 ILLEGAL PROG NAME",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "Program O number is invalid format",
        "causes": ["O number too long", "Invalid characters", "Reserved number"],
        "quick_fix": "Use valid O number format (O0001-O9999).",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-406",
        "code": "406",
        "name": "RS-232 MISSING CODE",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "Expected G/M/X/Y/Z code missing in received data",
        "causes": ["Incomplete line received", "Transmission error", "Baud rate mismatch"],
        "quick_fix": "Check RS-232 settings. Re-send program.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-407",
        "code": "407",
        "name": "RS-232 INVALID CODE",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "Unrecognized code received via RS-232",
        "causes": ["Corrupted data", "Wrong parity", "Noise on line"],
        "quick_fix": "Check cabling and RS-232 settings. Shield cables from noise.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-408",
        "code": "408",
        "name": "RS-232 NUMBER RANGE ERROR",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "Numeric value in received data out of range",
        "causes": ["Coordinate exceeds limits", "Invalid parameter value"],
        "quick_fix": "Check program values are within machine limits.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
]

# Continue with more alarms...
PHASE6_HAAS_ALARMS_PART2 = [
    # RS-232 Continued
    {
        "alarm_id": "ALM-HAAS-409",
        "code": "409",
        "name": "FILE INVALID N CODE",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "N code (sequence number) invalid in file",
        "causes": ["N number too large", "Invalid format"],
        "quick_fix": "Check N number format in program.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-410",
        "code": "410",
        "name": "FILE INVALID V CODE",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "V code invalid in file transfer",
        "causes": ["V value out of range", "Invalid V syntax"],
        "quick_fix": "Check V code format and range.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-411",
        "code": "411",
        "name": "RS-232 EMPTY PROG",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "Received program file is empty",
        "causes": ["Empty file sent", "Transfer aborted", "Connection lost"],
        "quick_fix": "Verify source file has content. Re-send.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-412",
        "code": "412",
        "name": "RS-232 UNEXPECTED END OF INPUT",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "File ended without proper termination",
        "causes": ["Missing % or M30", "Transfer interrupted", "Truncated file"],
        "quick_fix": "Check file has proper end code. Re-send complete file.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-413",
        "code": "413",
        "name": "RS-232 LOAD INSUFFICIENT MEMORY",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "Not enough memory to load incoming program",
        "causes": ["Program too large", "Memory full", "Too many programs"],
        "quick_fix": "Delete unused programs. Check program size.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-414",
        "code": "414",
        "name": "RS-232 BUFFER OVERFLOW",
        "category": "COMMUNICATION",
        "severity": "HIGH",
        "description": "Receive buffer overflowed during RS-232 transfer",
        "causes": ["Baud rate too fast", "No handshaking", "Sender too fast"],
        "quick_fix": "Enable XON/XOFF handshaking. Reduce baud rate.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-415",
        "code": "415",
        "name": "RS-232 OVERRUN",
        "category": "COMMUNICATION",
        "severity": "HIGH",
        "description": "UART overrun - data arriving faster than can be processed",
        "causes": ["Baud rate mismatch", "No flow control", "Hardware fault"],
        "quick_fix": "Check baud rate settings. Enable hardware flow control.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    
    # Macro Expression Alarms (517-525)
    {
        "alarm_id": "ALM-HAAS-517",
        "code": "517",
        "name": "EXPRSN NOT ALLOWED WITH N OR O",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Expression not allowed with N or O codes",
        "causes": ["Macro expression used with N/O number", "Syntax error"],
        "quick_fix": "Remove expression from N or O code line.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-518",
        "code": "518",
        "name": "ILLEGAL MACRO EXPRESSION REFERENCE",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Invalid variable reference in macro expression",
        "causes": ["Invalid variable number", "Undefined variable", "Nesting error"],
        "quick_fix": "Check variable number is valid (100-199, 500-999).",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-522",
        "code": "522",
        "name": "ILLEGAL ASSIGNMENT VAR OR VALUE",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Cannot assign value to specified variable",
        "causes": ["Read-only variable", "System variable", "Invalid value"],
        "quick_fix": "Use writable variable. Check value format.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-523",
        "code": "523",
        "name": "CONDITIONAL REQUIRED PRIOR TO THEN",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "IF statement missing conditional before THEN",
        "causes": ["Syntax error in IF statement", "Missing condition"],
        "quick_fix": "Add proper IF [condition] THEN syntax.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-525",
        "code": "525",
        "name": "VAR REF ILLEGAL DURING MOVEMENT",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Variable reference not allowed during axis motion",
        "causes": ["Reading position during move", "Realtime variable access"],
        "quick_fix": "Move variable read outside motion block.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    
    # Phasing Alarms (217-222)
    {
        "alarm_id": "ALM-HAAS-217",
        "code": "217",
        "name": "X PHASING ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Error in phasing initialization of X axis brushless motor",
        "causes": ["Bad encoder", "Cabling error", "Motor fault"],
        "quick_fix": "Check encoder and cabling. Contact dealer if persists.",
        "requires_power_cycle": True,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-218",
        "code": "218",
        "name": "Y PHASING ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Error in phasing initialization of Y axis brushless motor",
        "causes": ["Bad encoder", "Cabling error", "Motor fault"],
        "quick_fix": "Check encoder and cabling. Contact dealer if persists.",
        "requires_power_cycle": True,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-219",
        "code": "219",
        "name": "Z PHASING ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Error in phasing initialization of Z axis brushless motor",
        "causes": ["Bad encoder", "Cabling error", "Motor fault"],
        "quick_fix": "Check encoder and cabling. Contact dealer if persists.",
        "requires_power_cycle": True,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-220",
        "code": "220",
        "name": "A PHASING ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Error in phasing initialization of A axis brushless motor",
        "causes": ["Bad encoder", "Cabling error", "Motor fault"],
        "quick_fix": "Check encoder and cabling. Contact dealer if persists.",
        "requires_power_cycle": True,
        "source": "Haas Maintenance Manual 96-0284"
    },
    
    # Amplifier Alarms (986-994)
    {
        "alarm_id": "ALM-HAAS-986",
        "code": "986",
        "name": "CALIBRATION FAILED",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "Amplifier failed to self-calibrate within 30 seconds",
        "causes": ["Amplifier fault", "Motor issue", "Encoder problem"],
        "quick_fix": "Cycle power. Check motor and encoder connections.",
        "requires_power_cycle": True,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-991",
        "code": "991",
        "name": "AMPLIFIER OVER TEMPERATURE",
        "category": "THERMAL",
        "severity": "CRITICAL",
        "description": "Amplifier temperature sensor indicates over 90°C near power transistors",
        "causes": ["Extended overload", "Blocked airflow", "Fan failure", "Ambient temp high"],
        "quick_fix": "Allow cooling. Check fans and airflow. Reduce load.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-992",
        "code": "992",
        "name": "AMPLIFIER OVER CURRENT",
        "category": "ELECTRICAL",
        "severity": "CRITICAL",
        "description": "Amplifier detected excessive current going to motor",
        "causes": ["Stalled motor", "High motor load", "Short circuit", "Binding"],
        "quick_fix": "Check for mechanical binding. Inspect motor cables for shorts.",
        "requires_power_cycle": True,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-993",
        "code": "993",
        "name": "AMPLIFIER SHORT CIRCUIT",
        "category": "ELECTRICAL",
        "severity": "CRITICAL",
        "description": "Motor leads shorted to each other or to 320V return",
        "causes": ["Cable damage", "Motor winding short", "Connection fault"],
        "quick_fix": "Inspect motor cables for damage. Check connections.",
        "requires_power_cycle": True,
        "source": "Haas Maintenance Manual 96-0284"
    },
    {
        "alarm_id": "ALM-HAAS-994",
        "code": "994",
        "name": "AMPLIFIER OVERLOAD",
        "category": "ELECTRICAL",
        "severity": "HIGH",
        "description": "Amplifier detected high load for extended period",
        "causes": ["Heavy cutting load", "Dull tools", "Binding", "Excessive feedrate"],
        "quick_fix": "Reduce load. Check for mechanical issues. Sharpen tools.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
    
    # ATC/Carousel Alarms
    {
        "alarm_id": "ALM-HAAS-858",
        "code": "858",
        "name": "ATC CAROUSEL MOTOR ELECTRICAL FAULT",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool carousel motor has electrical fault",
        "causes": ["Motor failure", "Drive fault", "Wiring issue", "Relay failure"],
        "quick_fix": "Check relays K9-K12. Test motor power. Check fuses.",
        "requires_power_cycle": True,
        "source": "Haas I/O PCB Troubleshooting Guide"
    },
    
    # Communication Alarms
    {
        "alarm_id": "ALM-HAAS-791",
        "code": "791",
        "name": "COMM FAILURE WITH MOCON2",
        "category": "COMMUNICATION",
        "severity": "CRITICAL",
        "description": "Communication lost with MOCON2 processor board",
        "causes": ["Board failure", "Cable issue", "Noise interference"],
        "quick_fix": "Check cable connections. Cycle power. Contact dealer.",
        "requires_power_cycle": True,
        "source": "Haas Maintenance Manual 96-0284"
    },
    
    # APC Alarms
    {
        "alarm_id": "ALM-HAAS-918",
        "code": "918",
        "name": "APC LOAD-SWITCH MISSED PAL 1",
        "category": "APC",
        "severity": "HIGH",
        "description": "Automatic pallet changer load switch missed pallet 1 position",
        "causes": ["Sensor fault", "Alignment issue", "Hydraulic problem"],
        "quick_fix": "Check pallet sensors. Verify alignment. Test hydraulics.",
        "requires_power_cycle": False,
        "source": "Haas Maintenance Manual 96-0284"
    },
]

def main():
    db_path = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers\MASTER_ALARM_DATABASE_v3.json"
    
    print("=" * 60)
    print("PRISM PHASE 6: HAAS EXTENDED SERIES EXPANSION")
    print("=" * 60)
    
    # Load database
    with open(db_path, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    original_count = db['metadata']['total_alarms']
    print(f"Original alarm count: {original_count}")
    
    # Combine all alarms
    all_new_alarms = PHASE6_HAAS_ALARMS + PHASE6_HAAS_ALARMS_PART2
    
    # Get existing alarm IDs
    existing_ids = {a['alarm_id'] for a in db['alarms']}
    
    # Add new alarms (with deduplication)
    added = 0
    for alarm in all_new_alarms:
        if alarm['alarm_id'] not in existing_ids:
            alarm['family'] = 'HAAS'
            alarm['added_date'] = datetime.now().isoformat()
            alarm['phase'] = 'PHASE6_HAAS_EXTENDED'
            db['alarms'].append(alarm)
            existing_ids.add(alarm['alarm_id'])
            added += 1
            print(f"  Added: {alarm['alarm_id']} - {alarm['name']}")
        else:
            print(f"  Skipped (duplicate): {alarm['alarm_id']}")
    
    # Update metadata
    new_count = len(db['alarms'])
    db['metadata']['total_alarms'] = new_count
    db['metadata']['version'] = "3.4.0-PHASE6"
    db['metadata']['last_updated'] = datetime.now().isoformat()
    db['metadata']['expansion_notes'] = "Phase 6 - HAAS extended series (program, RS-232, macro, amplifier, phasing)"
    
    if "Haas Maintenance Manual 96-0284" not in db['metadata']['sources']:
        db['metadata']['sources'].append("Haas Maintenance Manual 96-0284")
    if "Haas I/O PCB Troubleshooting Guide" not in db['metadata']['sources']:
        db['metadata']['sources'].append("Haas I/O PCB Troubleshooting Guide")
    
    # Save database
    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print(f"PHASE 6 COMPLETE")
    print(f"Original: {original_count}")
    print(f"Added: {added}")
    print(f"New total: {new_count}")
    print(f"Progress: {new_count/2000*100:.1f}%")
    print("=" * 60)

if __name__ == "__main__":
    main()
