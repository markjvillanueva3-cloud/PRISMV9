#!/usr/bin/env python3
"""
PRISM Alarm Database Expansion - Phase 8
SIEMENS SINUMERIK 840D Extended Series + MAZAK Additional Alarms
Target: 1,682 -> 1,750+ alarms
"""

import json
import os
from datetime import datetime

# Base path
BASE_PATH = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers"
DB_FILE = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")

def load_database():
    """Load the current alarm database."""
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_database(db):
    """Save the updated database."""
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

def get_existing_ids(db):
    """Get set of existing alarm IDs."""
    return {alarm['alarm_id'] for alarm in db['alarms']}

# SIEMENS SINUMERIK 840D Extended Alarms (PLC, Battery, Temperature, Transformation)
SIEMENS_EXTENDED = [
    # PLC Communication Alarms (2000 series)
    {
        "alarm_id": "ALM-SIEMENS-2000",
        "code": "2000",
        "name": "PLC SIGN-OF-LIFE MONITORING",
        "category": "PLC",
        "severity": "CRITICAL",
        "description": "The PLC must give a sign of life within a defined time, or the alarm is triggered",
        "causes": ["PLC communication failure", "PLC processor failure", "PLC watchdog timeout", "Communication bus error"],
        "quick_fix": "Check PLC processor status and communication bus",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-SIEMENS-2001",
        "code": "2001",
        "name": "PLC HAS NOT STARTED UP",
        "category": "PLC",
        "severity": "CRITICAL",
        "description": "The PLC must give at least 1 sign of life within startup time",
        "causes": ["PLC boot failure", "PLC program missing", "PLC hardware failure", "PLC configuration error"],
        "quick_fix": "Check PLC boot sequence and program integrity",
        "requires_power_cycle": True
    },
    # Battery/Power Alarms (2100 series)
    {
        "alarm_id": "ALM-SIEMENS-2100",
        "code": "2100",
        "name": "NCK BATTERY WARNING THRESHOLD REACHED",
        "category": "POWER",
        "severity": "MEDIUM",
        "description": "Undervoltage monitor of NCK battery has reached prewarning threshold",
        "causes": ["Battery aging", "Battery low charge", "Battery approaching end of life"],
        "quick_fix": "Schedule battery replacement soon",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-SIEMENS-2101",
        "code": "2101",
        "name": "NCK BATTERY ALARM - CYCLIC",
        "category": "POWER",
        "severity": "HIGH",
        "description": "Undervoltage monitoring of NCK battery responded during cyclic operation",
        "causes": ["Battery critically low", "Battery failure", "Battery connection issue"],
        "quick_fix": "Replace battery immediately to prevent data loss",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-SIEMENS-2102",
        "code": "2102",
        "name": "NCK BATTERY ALARM - POWER UP",
        "category": "POWER",
        "severity": "CRITICAL",
        "description": "Undervoltage monitoring of NCK battery detected during system power-up",
        "causes": ["Battery dead", "Battery removed", "Battery connection fault"],
        "quick_fix": "Replace battery and reinitialize system - data may be lost",
        "requires_power_cycle": True
    },
    # Temperature Alarms (2110 series)
    {
        "alarm_id": "ALM-SIEMENS-2110",
        "code": "2110",
        "name": "NCK TEMPERATURE ALARM",
        "category": "THERMAL",
        "severity": "HIGH",
        "description": "Temperature sensor has reached response threshold",
        "causes": ["Overheating NCK module", "Insufficient cooling", "Fan failure", "Ambient temperature too high"],
        "quick_fix": "Check cooling system, clean filters, verify ambient temperature",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-SIEMENS-2120",
        "code": "2120",
        "name": "NCK FAN ALARM",
        "category": "THERMAL",
        "severity": "HIGH",
        "description": "Fan speed monitoring at NC module has responded",
        "causes": ["Fan failure", "Fan blocked", "Fan bearing worn", "Fan cable disconnected"],
        "quick_fix": "Replace fan module to prevent thermal damage",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-SIEMENS-2130",
        "code": "2130",
        "name": "5V/24V ENCODER OR 15V D/A CONVERTER UNDERVOLTAGE",
        "category": "POWER",
        "severity": "HIGH",
        "description": "Failure in power supply to encoder (5V/24V) or D/A converter (+/-15V)",
        "causes": ["Power supply failure", "Short circuit", "Overload", "Cable damage"],
        "quick_fix": "Check power supply module and encoder cables",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-SIEMENS-2140",
        "code": "2140",
        "name": "SRAM CLEAR FORCED AT NEXT POWER ON",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "Service switch position forces SRAM to be cleared at next Power On (general reset active)",
        "causes": ["Service switch in reset position", "Intentional system reset", "Maintenance operation"],
        "quick_fix": "Verify service switch position before power cycle",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-SIEMENS-2190",
        "code": "2190",
        "name": "HARDWARE PLUG-IN MODULE FOR DIGITIZER MISSING",
        "category": "HARDWARE",
        "severity": "HIGH",
        "description": "Hardware plug-in module for communication with digitizer is missing",
        "causes": ["Module not installed", "Module removed", "Module connection failure"],
        "quick_fix": "Install or reseat digitizer communication module",
        "requires_power_cycle": True
    },
    # Channel/Transformation Alarms (4300 series)
    {
        "alarm_id": "ALM-SIEMENS-4334",
        "code": "4334",
        "name": "ORIENTABLE TOOLHOLDER FINE CORRECTION TOO LARGE",
        "category": "TRANSFORMATION",
        "severity": "MEDIUM",
        "description": "Amount of fine correction in parameter of orientable toolholder is too large",
        "causes": ["Excessive correction value", "Parameter misconfiguration", "Calibration error"],
        "quick_fix": "Reduce fine correction parameter value",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-SIEMENS-4336",
        "code": "4336",
        "name": "ORIENTABLE TOOLHOLDER DOES NOT EXIST",
        "category": "TRANSFORMATION",
        "severity": "HIGH",
        "description": "Orientable toolholder number for orientation transformation does not exist",
        "causes": ["Invalid toolholder number", "Toolholder not configured", "Data corruption"],
        "quick_fix": "Configure orientable toolholder or correct program",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-SIEMENS-4338",
        "code": "4338",
        "name": "INVALID TRANSFORMATION TYPE IN TOOLHOLDER",
        "category": "TRANSFORMATION",
        "severity": "HIGH",
        "description": "Invalid transformation type specified in toolholder for orientation transformer",
        "causes": ["Incorrect transformation type", "Unsupported transformation", "Configuration error"],
        "quick_fix": "Correct transformation type in toolholder configuration",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-SIEMENS-4340",
        "code": "4340",
        "name": "INVALID TRANSFORMATION TYPE IN BLOCK",
        "category": "TRANSFORMATION",
        "severity": "HIGH",
        "description": "Invalid transformation type specified in transformation number within block",
        "causes": ["Invalid G-code", "Unsupported transformation command", "Program error"],
        "quick_fix": "Correct transformation command in program",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-SIEMENS-4341",
        "code": "4341",
        "name": "NO DATA SET AVAILABLE FOR TRANSFORMATION",
        "category": "TRANSFORMATION",
        "severity": "HIGH",
        "description": "No data set available for the specified transformation number",
        "causes": ["Transformation data missing", "Data not configured", "Data corruption"],
        "quick_fix": "Configure transformation data set",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-SIEMENS-4342",
        "code": "4342",
        "name": "INVALID MACHINE DATA FOR 5-AXIS TRANSFORMATION",
        "category": "TRANSFORMATION",
        "severity": "HIGH",
        "description": "Invalid machine data for general 5-axis transformation",
        "causes": ["Incorrect MD configuration", "Missing 5-axis parameters", "Kinematic error"],
        "quick_fix": "Review and correct 5-axis machine data configuration",
        "requires_power_cycle": True
    },
    # SRAM Backup Alarms (4065)
    {
        "alarm_id": "ALM-SIEMENS-4065",
        "code": "4065",
        "name": "SRAM BACKUP USED",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "SRAM backup was used due to backup time exceeded or data corruption",
        "causes": ["Power interruption during save", "Battery failure", "Backup time exceeded", "SRAM corruption"],
        "quick_fix": "Verify data integrity, reinitialize if needed",
        "requires_power_cycle": True
    },
    # NC/Axis Configuration Alarms (10000 series)
    {
        "alarm_id": "ALM-SIEMENS-10000",
        "code": "10000",
        "name": "AXCONF_MACHAX_NAME_TAB CONFLICT",
        "category": "CONFIGURATION",
        "severity": "HIGH",
        "description": "Machine data 10000 axis configuration name table conflict detected",
        "causes": ["Duplicate axis names", "Invalid axis configuration", "MD conflict"],
        "quick_fix": "Correct MD10000 AXCONF_MACHAX_NAME_TAB configuration",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-SIEMENS-20080",
        "code": "20080",
        "name": "AXCONF_CHANAX_NAME_TAB CONFLICT",
        "category": "CONFIGURATION",
        "severity": "HIGH",
        "description": "Machine data 20080 channel axis name table conflict detected",
        "causes": ["Duplicate channel axis names", "Invalid channel configuration", "MD conflict"],
        "quick_fix": "Correct MD20080 AXCONF_CHANAX_NAME_TAB configuration",
        "requires_power_cycle": True
    },
    # Drive/SINAMICS Alarms (300000 series)
    {
        "alarm_id": "ALM-SIEMENS-300500",
        "code": "300500",
        "name": "DRIVE P-RAM ADDRESS ERROR",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Error in P:-RAM - incorrect address when program memory accessed",
        "causes": ["Memory corruption", "Hardware failure", "Address conflict"],
        "quick_fix": "Replace drive module, contact Siemens support",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-SIEMENS-F034",
        "code": "F034",
        "name": "DRIVE SYSTEM ERROR F034",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Internal drive system error - software/hardware fault",
        "causes": ["Drive firmware error", "Hardware malfunction", "Communication failure"],
        "quick_fix": "Power cycle, if persistent replace control module",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-SIEMENS-F035",
        "code": "F035",
        "name": "DRIVE SYSTEM ERROR F035",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Internal drive system error - replaced V1.x EPROM error",
        "causes": ["Drive firmware error", "Control module failure"],
        "quick_fix": "Replace control module or upgrade firmware",
        "requires_power_cycle": True
    }
]

# MAZAK Extended Alarms (CNC Control, Screen Operation, I/O, MAZATROL)
MAZAK_EXTENDED = [
    # System/Drive Alarms (1000 series)
    {
        "alarm_id": "ALM-MAZAK-1000",
        "code": "1000",
        "name": "SYSTEM HARDWARE ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "Trouble has occurred in the hardware",
        "causes": ["NC hardware failure", "Board malfunction", "Memory error"],
        "quick_fix": "Contact Mazak Technical Center",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MAZAK-1025",
        "code": "1025",
        "name": "SPINDLE SAFETY SPEED OPERATION ERROR",
        "category": "SPINDLE",
        "severity": "CRITICAL",
        "description": "Trouble occurred for spindle in safety-speed operation mode",
        "causes": ["Spindle amplifier error", "Encoder failure", "Safety circuit fault"],
        "quick_fix": "Contact Mazak Technical Center with alarm details",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MAZAK-1026",
        "code": "1026",
        "name": "SERVO POWER-OFF LEVEL ABNORMAL",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "The servo (power-off level) is abnormal",
        "causes": ["Servo amplifier failure", "Power supply issue", "Drive circuit fault"],
        "quick_fix": "Replace servo amplifier",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MAZAK-1027",
        "code": "1027",
        "name": "SERVO PARAMETER TRANSFER ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Parameters transferred from NC to servo amplifier during power-on are incorrect",
        "causes": ["Parameter corruption", "Communication error", "Amplifier mismatch"],
        "quick_fix": "Re-set servo parameters through service menu",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MAZAK-1028",
        "code": "1028",
        "name": "SERVO NC RESET LEVEL ABNORMAL",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "The servo (NC reset level) is abnormal",
        "causes": ["Servo amplifier internal error", "Communication failure"],
        "quick_fix": "Contact Mazak Technical Center",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MAZAK-1029",
        "code": "1029",
        "name": "SERVO AMPLIFIER POWER-OFF LEVEL ABNORMAL",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "The servo (amplifier power-off level) is abnormal",
        "causes": ["Amplifier failure", "Power circuit fault"],
        "quick_fix": "Replace servo amplifier",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MAZAK-1030",
        "code": "1030",
        "name": "SPINDLE POWER-OFF LEVEL ABNORMAL",
        "category": "SPINDLE",
        "severity": "CRITICAL",
        "description": "The spindle (power-off level) is abnormal",
        "causes": ["Spindle amplifier failure", "Power supply issue"],
        "quick_fix": "Contact Mazak Technical Center",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MAZAK-1031",
        "code": "1031",
        "name": "SPINDLE PARAMETER TRANSFER ERROR",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Parameters transferred from NC to spindle amplifier during power-on are incorrect",
        "causes": ["Parameter mismatch", "Communication error", "Amplifier configuration"],
        "quick_fix": "Re-configure spindle parameters",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MAZAK-1032",
        "code": "1032",
        "name": "SPINDLE NC RESET LEVEL ABNORMAL",
        "category": "SPINDLE",
        "severity": "CRITICAL",
        "description": "The spindle (NC reset level) is abnormal",
        "causes": ["Spindle amplifier internal error", "Communication failure"],
        "quick_fix": "Contact Mazak Technical Center",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MAZAK-1033",
        "code": "1033",
        "name": "SPINDLE AMPLIFIER POWER-OFF LEVEL ABNORMAL",
        "category": "SPINDLE",
        "severity": "CRITICAL",
        "description": "The spindle (amplifier power-off level) is abnormal",
        "causes": ["Amplifier failure", "Internal circuit fault"],
        "quick_fix": "Replace spindle amplifier",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MAZAK-1034",
        "code": "1034",
        "name": "MR-JT-C2 E2ROM WRITE ERROR",
        "category": "COMMUNICATION",
        "severity": "HIGH",
        "description": "Error during communication with MR-JT-C2, parameters cannot be written to E2ROM",
        "causes": ["MR-JT-C2 amplifier failure", "E2ROM wear-out", "Communication error"],
        "quick_fix": "Replace MR-JT-C2 amplifier",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-MAZAK-1035",
        "code": "1035",
        "name": "NC BATTERY LOW VOLTAGE",
        "category": "POWER",
        "severity": "HIGH",
        "description": "Battery for retaining parameters and programs has reached minimum voltage or run down",
        "causes": ["Battery aging", "Battery failure", "Battery not charging"],
        "quick_fix": "Recharge or replace NC backup battery, verify data integrity",
        "requires_power_cycle": False
    },
    # CNC Machine Control Alarms (1100 series)
    {
        "alarm_id": "ALM-MAZAK-1100",
        "code": "1100",
        "name": "SOFTWARE LIMIT EXCEEDED - PLUS DIRECTION",
        "category": "AXIS",
        "severity": "HIGH",
        "description": "Tool tip overstepped software limit in plus direction during automatic operation",
        "causes": ["Program error", "Incorrect work offset", "Parameter misconfiguration"],
        "quick_fix": "Correct program or adjust software limit parameters",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1101",
        "code": "1101",
        "name": "SOFTWARE LIMIT EXCEEDED - MINUS DIRECTION",
        "category": "AXIS",
        "severity": "HIGH",
        "description": "Tool tip overstepped software limit in minus direction during automatic operation",
        "causes": ["Program error", "Incorrect work offset", "Parameter misconfiguration"],
        "quick_fix": "Correct program or adjust software limit parameters",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1102",
        "code": "1102",
        "name": "SERVO-OFF FUNCTION ACTIVE",
        "category": "SERVO",
        "severity": "MEDIUM",
        "description": "Servo-off function is activated preventing axis movement",
        "causes": ["Intentional servo disable", "Safety interlock active"],
        "quick_fix": "Deactivate servo-off function",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1103",
        "code": "1103",
        "name": "MODE SELECTION ERROR",
        "category": "OPERATION",
        "severity": "MEDIUM",
        "description": "Incorrect mode selection or mode selector switch malfunction",
        "causes": ["Wrong mode selected", "Switch failure", "Wiring fault"],
        "quick_fix": "Contact Mazak Technical Center",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1104",
        "code": "1104",
        "name": "CUTTING FEED OVERRIDE AT ZERO",
        "category": "OPERATION",
        "severity": "LOW",
        "description": "Cutting-feed override value is set to 0 on machine operating panel",
        "causes": ["Override dial at 0%", "Short circuit in signal line"],
        "quick_fix": "Set cutting-feed override to value greater than 0",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1105",
        "code": "1105",
        "name": "MANUAL FEEDRATE AT ZERO",
        "category": "OPERATION",
        "severity": "LOW",
        "description": "Manual feedrate set to 0 during cutting feed or dry-run in automatic mode",
        "causes": ["Manual feedrate dial at 0", "Signal line short circuit"],
        "quick_fix": "Set manual feedrate to value greater than 0",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1106",
        "code": "1106",
        "name": "SPINDLE DID NOT START",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle rotation did not start when command issued during automatic operation",
        "causes": ["Spindle amplifier error", "Encoder failure", "Drive belt slip"],
        "quick_fix": "Check spindle amplifier and encoder operation",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1107",
        "code": "1107",
        "name": "SPINDLE SPEED LIMIT EXCEEDED",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "The spindle-speed limit has been exceeded",
        "causes": ["Commanded speed too high", "Amplifier error", "Parameter misconfiguration"],
        "quick_fix": "Reduce spindle speed, check amplifier operation",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1108",
        "code": "1108",
        "name": "BLOCK START INTERLOCK",
        "category": "INTERLOCK",
        "severity": "MEDIUM",
        "description": "Interlock signal to lock start of program block has been input",
        "causes": ["Safety interlock active", "Sequence program fault", "External interlock"],
        "quick_fix": "Check sequence program for normal functioning",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1109",
        "code": "1109",
        "name": "CUTTING BLOCK START INTERLOCK",
        "category": "INTERLOCK",
        "severity": "MEDIUM",
        "description": "Interlock signal to lock start of cutting program block has been input",
        "causes": ["Cutting interlock active", "Sequence program fault"],
        "quick_fix": "Check sequence program for normal functioning",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1110",
        "code": "1110",
        "name": "DYNAMIC COMPENSATION EXCEEDED",
        "category": "AXIS",
        "severity": "HIGH",
        "description": "Dynamic compensation amount exceeded 3 mm (0.12 in.)",
        "causes": ["Excessive dynamic compensation", "Sensor error", "Parameter issue"],
        "quick_fix": "Check dynamic compensation parameters and sensor",
        "requires_power_cycle": False
    },
    # Barrier/Interference Alarms
    {
        "alarm_id": "ALM-MAZAK-1111",
        "code": "1111",
        "name": "TOOL ENTERED CHUCK BARRIER",
        "category": "COLLISION",
        "severity": "CRITICAL",
        "description": "Tool entered the chuck barrier zone",
        "causes": ["Program error", "Incorrect barrier parameters", "Work offset error"],
        "quick_fix": "Modify barrier parameters or correct program",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1112",
        "code": "1112",
        "name": "TOOL ENTERED TAIL BARRIER",
        "category": "COLLISION",
        "severity": "CRITICAL",
        "description": "Tool entered the tailstock barrier zone",
        "causes": ["Program error", "Barrier parameter error", "Tool data error"],
        "quick_fix": "Correct machining program or review tool and barrier data",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1113",
        "code": "1113",
        "name": "WORKPIECE INTERFERENCE - DUAL SPINDLE",
        "category": "COLLISION",
        "severity": "CRITICAL",
        "description": "Interference between No. 1 and No. 2 turning spindle workpieces",
        "causes": ["Program error", "Barrier parameter error", "Synchronization error"],
        "quick_fix": "Correct machining program or review barrier parameters",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1114",
        "code": "1114",
        "name": "TANDEM DRIVING OPTION NOT PRESENT",
        "category": "OPTION",
        "severity": "HIGH",
        "description": "Attempted tandem driving without tandem driving option",
        "causes": ["Option not installed", "Option not enabled", "Configuration error"],
        "quick_fix": "Enable tandem driving option or modify program",
        "requires_power_cycle": False
    },
    # Screen Operation Alarms (1400 series)
    {
        "alarm_id": "ALM-MAZAK-1401",
        "code": "1401",
        "name": "INVALID INPUT DATA FORMAT",
        "category": "OPERATION",
        "severity": "LOW",
        "description": "Format of input data is not available",
        "causes": ["Incorrect data entry", "Invalid characters", "Format mismatch"],
        "quick_fix": "Enter data in correct format",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1402",
        "code": "1402",
        "name": "PROGRAM LAYOUT DATA LIMIT EXCEEDED",
        "category": "MEMORY",
        "severity": "MEDIUM",
        "description": "1000 sets of program layout data already stored - cannot add more",
        "causes": ["Memory full", "Too many programs stored"],
        "quick_fix": "Delete unnecessary programs or save to external storage",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1403",
        "code": "1403",
        "name": "PROGRAM NUMBER NOT FOUND",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Attempted to select program with unregistered work number",
        "causes": ["Program not exist", "Wrong program number", "Program deleted"],
        "quick_fix": "Select program with registered work number",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1404",
        "code": "1404",
        "name": "PROGRAM LOCK ENABLED",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "PROGRAM LOCK/ENABLE switch is set to LOCK position",
        "causes": ["Lock switch enabled", "Edit protection active"],
        "quick_fix": "Set PROGRAM LOCK/ENABLE switch to ENABLE",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1405",
        "code": "1405",
        "name": "TOOL NAME ORDER WITH TOOL IN SPINDLE",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Attempted TOOL NAME ORDER operation while tool remains in spindle",
        "causes": ["Tool still mounted", "Operation sequence error"],
        "quick_fix": "Remove tool from spindle, then retry operation",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1406",
        "code": "1406",
        "name": "STRING NOT FOUND IN PROGRAM",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Designated number or character string does not exist in program",
        "causes": ["Search string not present", "Incorrect search term"],
        "quick_fix": "Designate existing number or character string",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1407",
        "code": "1407",
        "name": "PROGRAM MEMORY DATA DESTROYED",
        "category": "MEMORY",
        "severity": "HIGH",
        "description": "Memory contents in machining-program data storage area have been destroyed",
        "causes": ["Memory corruption", "Power loss during save", "Hardware failure"],
        "quick_fix": "Delete corrupted program and reload",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1408",
        "code": "1408",
        "name": "PROGRAM INSERTION NOT POSSIBLE",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Cannot insert data before common program unit",
        "causes": ["Cursor position error", "Edit restriction"],
        "quick_fix": "Move cursor to valid insertion position",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1409",
        "code": "1409",
        "name": "PROGRAM DELETION NOT POSSIBLE",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Cannot delete common unit or % during MAZATROL program editing",
        "causes": ["Protected element", "Edit restriction"],
        "quick_fix": "Cannot delete common unit - edit other parts of program",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1410",
        "code": "1410",
        "name": "PROGRAM DATA CORRUPTED - POWER LOSS",
        "category": "PROGRAM",
        "severity": "HIGH",
        "description": "Program may be corrupted due to power loss during editing",
        "causes": ["Power interruption", "Emergency stop during save"],
        "quick_fix": "Check program for incorrect data and correct errors",
        "requires_power_cycle": False
    },
    # 3D/Visual Alarms
    {
        "alarm_id": "ALM-MAZAK-1420",
        "code": "1420",
        "name": "3D REMODELING FAILED",
        "category": "DISPLAY",
        "severity": "MEDIUM",
        "description": "3D remodeling of workpiece, fixture, or tool has failed",
        "causes": ["Invalid model data", "Incompatible geometry", "Data error"],
        "quick_fix": "Modify entered data or confirm model validity",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1421",
        "code": "1421",
        "name": "LONG BORING BAR ASSIGNMENT ERROR",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Long boring bar assigned to section not defined as special pocket",
        "causes": ["Incorrect pocket assignment", "Configuration error"],
        "quick_fix": "Assign long boring bar to designated special pocket",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1422",
        "code": "1422",
        "name": "TOOL SETUP AUTO-SETTING NOT SUPPORTED",
        "category": "TOOL",
        "severity": "LOW",
        "description": "Tool setup auto-setting attempted on unsupported tool type",
        "causes": ["Magazine tool selected", "No. 1 spindle tool selected"],
        "quick_fix": "Use auto-setting only for No. 2 turning spindle turret tools",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1423",
        "code": "1423",
        "name": "PROGRAM MISMATCH DURING WORKPIECE TRANSFER",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Machine-operating program differs from selected program during workpiece transfer",
        "causes": ["Different programs selected", "Program switch during operation"],
        "quick_fix": "Match machine-operating and selected programs",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1424",
        "code": "1424",
        "name": "TOOL MODEL NOT SELECTED",
        "category": "TOOL",
        "severity": "LOW",
        "description": "Tool model to be copied/erased/renamed is not selected",
        "causes": ["No tool model selected", "Selection cleared"],
        "quick_fix": "Select appropriate tool model before operation",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-MAZAK-1425",
        "code": "1425",
        "name": "TOOL MODEL NAME ALREADY REGISTERED",
        "category": "TOOL",
        "severity": "LOW",
        "description": "Specified tool model name is already registered",
        "causes": ["Duplicate name", "Copy to existing name"],
        "quick_fix": "Specify unregistered name for new tool model",
        "requires_power_cycle": False
    }
]

def main():
    """Main function to expand the alarm database."""
    print("=" * 70)
    print("PRISM ALARM DATABASE EXPANSION - PHASE 8")
    print("SIEMENS 840D Extended + MAZAK Additional Alarms")
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
    
    # Process SIEMENS alarms
    print("\n--- Processing SIEMENS SINUMERIK 840D Extended Alarms ---")
    for alarm in SIEMENS_EXTENDED:
        if alarm['alarm_id'] not in existing_ids:
            alarm['family'] = 'SIEMENS'
            alarm['source'] = 'SIEMENS SINUMERIK 840D sl Diagnostics Manual'
            alarm['added_phase'] = 'Phase 8'
            alarm['timestamp'] = datetime.now().isoformat()
            db['alarms'].append(alarm)
            existing_ids.add(alarm['alarm_id'])
            added += 1
            print(f"  + Added: {alarm['alarm_id']} - {alarm['name']}")
        else:
            skipped += 1
            print(f"  - Skipped (exists): {alarm['alarm_id']}")
    
    # Process MAZAK alarms
    print("\n--- Processing MAZAK Extended Alarms ---")
    for alarm in MAZAK_EXTENDED:
        if alarm['alarm_id'] not in existing_ids:
            alarm['family'] = 'MAZAK'
            alarm['source'] = 'MAZATROL MATRIX Alarm Manual'
            alarm['added_phase'] = 'Phase 8'
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
    db['metadata']['version'] = '3.6.0-PHASE8'
    db['metadata']['last_updated'] = datetime.now().isoformat()
    db['metadata']['total_alarms'] = final_count
    db['metadata']['expansion_notes'] = 'Phase 8 - SIEMENS 840D Extended + MAZAK Additional Alarms'
    
    # Add sources
    new_sources = [
        'SIEMENS SINUMERIK 840D sl Diagnostics Manual V4.7',
        'MAZATROL MATRIX Alarm Manual',
        'MRO Electric SINUMERIK Diagnostics Blog'
    ]
    for src in new_sources:
        if src not in db['metadata']['sources']:
            db['metadata']['sources'].append(src)
    
    # Save database
    save_database(db)
    
    # Summary
    print("\n" + "=" * 70)
    print("PHASE 8 EXPANSION COMPLETE")
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
