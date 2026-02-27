#!/usr/bin/env python3
"""
PRISM Alarm Database Expansion - Phase 10
DOOSAN MX/TT Series + Additional Controller Families
Target: 1,791 -> 1,860+ alarms
"""

import json
import os
from datetime import datetime

# Base path
BASE_PATH = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers"
DB_FILE = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")

def load_database():
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_database(db):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

def get_existing_ids(db):
    return {alarm['alarm_id'] for alarm in db['alarms']}

# DOOSAN MX/TT/PUMA Series Extended Alarms
DOOSAN_EXTENDED = [
    # Emergency/Overtravel (2001-2010)
    {
        "alarm_id": "ALM-DOOSAN-2001",
        "code": "2001",
        "name": "EMERGENCY STOP OR OVERTRAVEL DETECTED",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Emergency button pressed or overtravel of axes detected",
        "causes": ["E-stop button pressed", "Axis travel limit exceeded", "Safety switch triggered"],
        "quick_fix": "Release emergency button and reset limit switch for overtravel check",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2002",
        "code": "2002",
        "name": "MAIN SPINDLE/SERVO UNIT ALARM",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Alarm detected in main spindle motor or servo unit",
        "causes": ["Spindle drive fault", "Servo amplifier error", "Motor overload"],
        "quick_fix": "Check alarm display on servo unit, power off and on",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-DOOSAN-2003",
        "code": "2003",
        "name": "CONTROL POWER CIRCUIT OVERCURRENT",
        "category": "POWER",
        "severity": "CRITICAL",
        "description": "Abnormally large current detected in control power circuit",
        "causes": ["Short circuit", "Power supply fault", "Wiring damage"],
        "quick_fix": "Check for control power short circuit",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-DOOSAN-2004",
        "code": "2004",
        "name": "HYD PUMP MOTOR OVERLOAD",
        "category": "HYDRAULIC",
        "severity": "HIGH",
        "description": "Hydraulic pump motor overload detected",
        "causes": ["Motor overload", "Hydraulic system blockage", "Pump failure"],
        "quick_fix": "Check overload value on thermal relay and motor",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2005",
        "code": "2005",
        "name": "HYDRAULIC PRESSURE DOWN",
        "category": "HYDRAULIC",
        "severity": "HIGH",
        "description": "Hydraulic system pressure has dropped below threshold",
        "causes": ["Pressure switch fault", "Hydraulic leak", "Pump failure"],
        "quick_fix": "Check hydraulic pressure switch, value, and leakage",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2007",
        "code": "2007",
        "name": "SPINDLE ROTATION ABNORMAL",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle rotation detected as abnormal",
        "causes": ["Encoder error", "Drive fault", "Mechanical issue"],
        "quick_fix": "Check spindle drive and encoder",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2009",
        "code": "2009",
        "name": "REVOLVING SPINDLE EMERGENCY STOP",
        "category": "SPINDLE",
        "severity": "CRITICAL",
        "description": "Emergency stop activated on revolving spindle",
        "causes": ["E-stop triggered", "Safety interlock", "Spindle fault"],
        "quick_fix": "Check spindle safety system",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2010",
        "code": "2010",
        "name": "INVERTER FAULT ALARM",
        "category": "DRIVE",
        "severity": "HIGH",
        "description": "Fault detected in inverter drive system",
        "causes": ["Inverter failure", "Overload", "Thermal protection"],
        "quick_fix": "Check inverter status and parameters",
        "requires_power_cycle": True
    },
    # Relay/PSM Alarms (2011-2020)
    {
        "alarm_id": "ALM-DOOSAN-2011",
        "code": "2011",
        "name": "KEEP RELAY SETTING ALARM",
        "category": "ELECTRICAL",
        "severity": "HIGH",
        "description": "Keep relay K5 setting error",
        "causes": ["Relay configuration error", "Wiring fault"],
        "quick_fix": "Check keep relay K5 configuration",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-DOOSAN-2016",
        "code": "2016",
        "name": "PSM POWER RUNNING ALARM",
        "category": "POWER",
        "severity": "HIGH",
        "description": "Power supply module running alarm",
        "causes": ["Magnetic contactor fault", "PSM error"],
        "quick_fix": "Check auxiliary contact on magnetic contactor KM10/KM110",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-DOOSAN-2019",
        "code": "2019",
        "name": "MILLING SPINDLE ORIENTATION OVERTIME",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Milling spindle orientation exceeded time limit",
        "causes": ["Encoder fault", "Spindle mechanical issue", "Parameter error"],
        "quick_fix": "Check spindle encoder and orientation parameters",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2020",
        "code": "2020",
        "name": "COOLANT/LUB PUMP MOTOR OVERLOAD",
        "category": "AUXILIARY",
        "severity": "MEDIUM",
        "description": "Coolant, lubrication pump motor overload or Q11 for servo turret",
        "causes": ["Motor overload", "Pump blockage", "Filter clogged"],
        "quick_fix": "Check coolant/lub pump motor and filters",
        "requires_power_cycle": False
    },
    # Tool/Spindle Alarms (2021-2030)
    {
        "alarm_id": "ALM-DOOSAN-2021",
        "code": "2021",
        "name": "TORQUE SKIP DATA ERROR",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Error in torque skip data configuration",
        "causes": ["Parameter error", "Program data error"],
        "quick_fix": "Verify torque skip parameters",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2022",
        "code": "2022",
        "name": "SPINDLE ORIENTATION CONFIRM NOT DETECTED",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle orientation confirmation not detected within 10 seconds",
        "causes": ["Encoder fault", "Parameter error", "Mechanical issue"],
        "quick_fix": "Check orientation parameter and readjust",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2023",
        "code": "2023",
        "name": "ORIENTATION INDEX COMMAND ALARM",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Error in spindle orientation index command",
        "causes": ["Invalid command", "Parameter misconfiguration"],
        "quick_fix": "Check orientation index command and parameters",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2024",
        "code": "2024",
        "name": "TOOL INDEX OVERTIME",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool indexing operation exceeded time limit",
        "causes": ["ATC jam", "Turret motor fault", "Sensor failure"],
        "quick_fix": "Check ATC mechanism and sensors",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2025",
        "code": "2025",
        "name": "TOOL NUMBER COMMAND ALARM",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Invalid tool number commanded",
        "causes": ["Tool number out of range", "Program error"],
        "quick_fix": "Verify tool number is valid for machine configuration",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2027",
        "code": "2027",
        "name": "SPINDLE SPEED ARRIVAL NOT DETECTED",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle speed arrival not detected within 7 seconds",
        "causes": ["Spindle drive fault", "Load too high", "Encoder error"],
        "quick_fix": "Check spindle servo unit",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2028",
        "code": "2028",
        "name": "SPINDLE ROTATION CONDITION NOT READY",
        "category": "SPINDLE",
        "severity": "MEDIUM",
        "description": "Spindle rotation prerequisites not satisfied",
        "causes": ["Interlock active", "Safety condition not met"],
        "quick_fix": "Check spindle rotation conditions",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2029",
        "code": "2029",
        "name": "SPLASH GUARD DOOR OPEN",
        "category": "SAFETY",
        "severity": "MEDIUM",
        "description": "Splash guard door detected as open",
        "causes": ["Door not closed", "Limit switch fault"],
        "quick_fix": "Close splash guard door, check limit switches",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2030",
        "code": "2030",
        "name": "M17/M18 COMMAND IN ILLEGAL MODE",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "M17 or M18 commanded in invalid mode",
        "causes": ["Wrong mode selected", "Program sequence error"],
        "quick_fix": "Confirm MDI mode before M17/M18 command",
        "requires_power_cycle": False
    },
    # Cycle/Operation Alarms (2049-2070)
    {
        "alarm_id": "ALM-DOOSAN-2049",
        "code": "2049",
        "name": "SPINDLE SPEED ARRIVAL SIGNAL ERROR",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Error in spindle speed arrival signal detection",
        "causes": ["Signal wiring fault", "PLC ladder issue", "Encoder error"],
        "quick_fix": "Check spindle speed arrival signal path",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2051",
        "code": "2051",
        "name": "SPINDLE ORIENTATION OVERTIME",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle orientation operation exceeded time limit",
        "causes": ["Encoder fault", "Motor issue", "Parameter error"],
        "quick_fix": "Check orientation system and parameters",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2052",
        "code": "2052",
        "name": "SPINDLE MAXIMUM RPM SETTING ERROR",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Error in maximum spindle RPM setting",
        "causes": ["Parameter error", "Invalid speed command"],
        "quick_fix": "Verify spindle maximum RPM parameter",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2054",
        "code": "2054",
        "name": "ILLEGAL CONDITION IN SPINDLE ROTATION",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle rotation commanded in illegal condition",
        "causes": ["Safety interlock", "Mode conflict", "Gear position error"],
        "quick_fix": "Check spindle rotation prerequisites",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2056",
        "code": "2056",
        "name": "GEAR SHIFT OVERTIME ALARM",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle gear shift operation exceeded time limit",
        "causes": ["Gear mechanism jam", "Hydraulic fault", "Sensor failure"],
        "quick_fix": "Check gear shift mechanism and hydraulics",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2057",
        "code": "2057",
        "name": "SPINDLE TOOL CLAMP/UNCLAMP CHANGE ALARM",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Error in spindle tool clamp or unclamp operation",
        "causes": ["Clamping mechanism fault", "Air pressure low", "Sensor error"],
        "quick_fix": "Check tool clamp mechanism and air pressure",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2058",
        "code": "2058",
        "name": "TOOL NUMBER SELECT KEEP RELAY NOT SET",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Tool number selection keep relay not properly set",
        "causes": ["Relay configuration error", "PLC fault"],
        "quick_fix": "Check tool number select relay configuration",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2068",
        "code": "2068",
        "name": "DRY RUN STATUS",
        "category": "OPERATION",
        "severity": "LOW",
        "description": "Machine is in dry run status",
        "causes": ["Dry run mode active"],
        "quick_fix": "Press CYCLE START to reset this alarm",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2069",
        "code": "2069",
        "name": "COOLANT FILTER CHANGE ALARM",
        "category": "MAINTENANCE",
        "severity": "LOW",
        "description": "Coolant filter requires replacement",
        "causes": ["Filter clogged", "Maintenance interval reached"],
        "quick_fix": "Replace coolant filter",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2070",
        "code": "2070",
        "name": "SPINDLE COMMAND ABNORMAL",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle command must be changed after spindle stop",
        "causes": ["Command sequence error", "Program error"],
        "quick_fix": "Issue spindle stop (M05/M35/M65) before changing command",
        "requires_power_cycle": False
    },
    # Advanced Operation Alarms (2089-2100)
    {
        "alarm_id": "ALM-DOOSAN-2088",
        "code": "2088",
        "name": "CANCEL RIGID TAPPING MODE TO SWITCH SPINDLE",
        "category": "SPINDLE",
        "severity": "MEDIUM",
        "description": "Must cancel rigid tapping mode before switching spindle",
        "causes": ["Rigid tapping active during spindle switch attempt"],
        "quick_fix": "Cancel rigid tapping mode before switching spindle",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2089",
        "code": "2089",
        "name": "B-AXIS NOT CLAMPED",
        "category": "AXIS",
        "severity": "HIGH",
        "description": "B-axis is not clamped for operation",
        "causes": ["B-axis clamp not engaged", "Clamp sensor fault"],
        "quick_fix": "Ensure B-axis is clamped using M106, M110 or M112",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2090",
        "code": "2090",
        "name": "PROGRAM RESTART TOGGLE SWITCH ON STATE",
        "category": "OPERATION",
        "severity": "LOW",
        "description": "Program restart toggle switch is in ON state",
        "causes": ["Restart function active"],
        "quick_fix": "Toggle program restart switch off if not needed",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2091",
        "code": "2091",
        "name": "SERVO TURRET BATTERY LOW",
        "category": "POWER",
        "severity": "MEDIUM",
        "description": "Servo turret amplifier battery is low",
        "causes": ["Battery aging", "Battery drain"],
        "quick_fix": "Replace battery in amplifier module within 2 weeks",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2095",
        "code": "2095",
        "name": "RIGID TAPPING/ORIENTATION INVALID ON G96",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "M19, M119, or M29 is invalid during G96 (CSS) mode",
        "causes": ["Program error", "Mode conflict"],
        "quick_fix": "Modify program to remove rigid tapping during G96 mode",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2096",
        "code": "2096",
        "name": "SPINDLE OVERRIDE OR FEEDRATE 0%",
        "category": "OPERATION",
        "severity": "LOW",
        "description": "Spindle override or feedrate is set to 0%",
        "causes": ["Override dial at zero"],
        "quick_fix": "Increase spindle override or feedrate above 0%",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2097",
        "code": "2097",
        "name": "MACHINE LOCK ON STATUS",
        "category": "OPERATION",
        "severity": "LOW",
        "description": "Machine lock function is active",
        "causes": ["Machine lock intentionally enabled"],
        "quick_fix": "Disable machine lock to allow operation",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2098",
        "code": "2098",
        "name": "M00 OR M01 COMMAND",
        "category": "PROGRAM",
        "severity": "INFO",
        "description": "Program stop (M00) or optional stop (M01) executed",
        "causes": ["Normal program stop command"],
        "quick_fix": "Press CYCLE START to continue",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2099",
        "code": "2099",
        "name": "M02 OR M30 COMMAND",
        "category": "PROGRAM",
        "severity": "INFO",
        "description": "Program end (M02) or end and rewind (M30) executed",
        "causes": ["Normal program end"],
        "quick_fix": "Restart program if needed",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2100",
        "code": "2100",
        "name": "SERVICE MODE ACTIVE",
        "category": "OPERATION",
        "severity": "LOW",
        "description": "Machine is in service mode - door open operation allowed",
        "causes": ["Service mode intentionally enabled"],
        "quick_fix": "Note: Spindle will not start unless door closed",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2101",
        "code": "2101",
        "name": "SPINDLE TOOL UNCLAMP ALARM",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Error in spindle tool unclamp operation",
        "causes": ["Unclamp mechanism fault", "Air pressure low", "Tool stuck"],
        "quick_fix": "Check tool unclamp mechanism and air pressure",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DOOSAN-2102",
        "code": "2102",
        "name": "MAIN POWER PHASE ERROR",
        "category": "POWER",
        "severity": "CRITICAL",
        "description": "Main power phase sequence or loss detected",
        "causes": ["Phase loss", "Phase sequence wrong", "Power supply fault"],
        "quick_fix": "Check main power supply phases",
        "requires_power_cycle": True
    }
]

# BROTHER Extended Alarms (Additional to existing)
BROTHER_EXTENDED = [
    {
        "alarm_id": "ALM-BROTHER-E1001",
        "code": "E1001",
        "name": "NC SYSTEM ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "NC system internal error detected",
        "causes": ["Memory error", "CPU fault", "Software error"],
        "quick_fix": "Power cycle machine, contact service if persistent",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-BROTHER-E1010",
        "code": "E1010",
        "name": "SERVO COMMUNICATION ERROR",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Communication error between NC and servo amplifier",
        "causes": ["Communication cable fault", "Amplifier error", "Noise interference"],
        "quick_fix": "Check servo communication cables and connections",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-BROTHER-E1020",
        "code": "E1020",
        "name": "SPINDLE AMPLIFIER ERROR",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Error detected in spindle amplifier",
        "causes": ["Amplifier overload", "Thermal protection", "Hardware fault"],
        "quick_fix": "Check spindle amplifier LEDs and parameters",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-BROTHER-E2001",
        "code": "E2001",
        "name": "ATC ARM POSITION ERROR",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool changer arm not in correct position",
        "causes": ["Arm jam", "Sensor misalignment", "Motor fault"],
        "quick_fix": "Check ATC arm mechanism and sensors",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-BROTHER-E2010",
        "code": "E2010",
        "name": "MAGAZINE INDEX ERROR",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool magazine indexing error",
        "causes": ["Index motor fault", "Sensor failure", "Magazine jam"],
        "quick_fix": "Check magazine indexing mechanism",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-BROTHER-E3001",
        "code": "E3001",
        "name": "AXIS OVERLOAD",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Servo axis overload condition detected",
        "causes": ["Mechanical obstruction", "Servo motor fault", "Load too high"],
        "quick_fix": "Check for mechanical interference, reduce load",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-BROTHER-E3010",
        "code": "E3010",
        "name": "ENCODER COMMUNICATION ERROR",
        "category": "ENCODER",
        "severity": "HIGH",
        "description": "Error in encoder communication",
        "causes": ["Encoder cable fault", "Encoder failure", "Noise interference"],
        "quick_fix": "Check encoder cables and connections",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-BROTHER-E4001",
        "code": "E4001",
        "name": "HYDRAULIC PRESSURE LOW",
        "category": "HYDRAULIC",
        "severity": "HIGH",
        "description": "Hydraulic system pressure below minimum",
        "causes": ["Pump failure", "Leak", "Filter clogged"],
        "quick_fix": "Check hydraulic system pressure and oil level",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-BROTHER-E5001",
        "code": "E5001",
        "name": "COOLANT LEVEL LOW",
        "category": "AUXILIARY",
        "severity": "LOW",
        "description": "Coolant tank level below minimum",
        "causes": ["Normal consumption", "Leak"],
        "quick_fix": "Add coolant to tank",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-BROTHER-E6001",
        "code": "E6001",
        "name": "DOOR OPEN DURING OPERATION",
        "category": "SAFETY",
        "severity": "HIGH",
        "description": "Safety door opened during automatic operation",
        "causes": ["Door opened", "Door sensor fault"],
        "quick_fix": "Close door, restart operation",
        "requires_power_cycle": False
    }
]

# DMG MORI Extended Alarms (Additional)
DMG_MORI_EXTENDED = [
    {
        "alarm_id": "ALM-DMGMORI-AL1001",
        "code": "AL1001",
        "name": "CELOS SYSTEM ERROR",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "CELOS operating system error detected",
        "causes": ["Software crash", "Memory error", "Communication failure"],
        "quick_fix": "Restart CELOS system, power cycle if needed",
        "requires_power_cycle": True
    },
    {
        "alarm_id": "ALM-DMGMORI-AL2001",
        "code": "AL2001",
        "name": "LINEAR SCALE ERROR",
        "category": "ENCODER",
        "severity": "HIGH",
        "description": "Linear scale reading error on axis",
        "causes": ["Scale contamination", "Scale damage", "Reader head fault"],
        "quick_fix": "Clean linear scale, check reader head",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DMGMORI-AL2010",
        "code": "AL2010",
        "name": "B-AXIS TORQUE MOTOR OVERTEMP",
        "category": "THERMAL",
        "severity": "HIGH",
        "description": "B-axis direct drive torque motor overtemperature",
        "causes": ["Continuous heavy cutting", "Cooling system fault"],
        "quick_fix": "Allow motor to cool, check cooling system",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DMGMORI-AL3001",
        "code": "AL3001",
        "name": "TOOL MAGAZINE FULL",
        "category": "ATC",
        "severity": "LOW",
        "description": "Tool magazine has no empty positions",
        "causes": ["All pockets occupied"],
        "quick_fix": "Remove unused tools from magazine",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DMGMORI-AL3010",
        "code": "AL3010",
        "name": "HSK TOOL CLAMP PRESSURE LOW",
        "category": "ATC",
        "severity": "HIGH",
        "description": "HSK tool holder clamping pressure insufficient",
        "causes": ["Hydraulic pressure low", "Clamp spring weak", "Seal leak"],
        "quick_fix": "Check hydraulic pressure and clamping mechanism",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DMGMORI-AL4001",
        "code": "AL4001",
        "name": "CHIP CONVEYOR JAM",
        "category": "AUXILIARY",
        "severity": "MEDIUM",
        "description": "Chip conveyor motor overload or jam detected",
        "causes": ["Chip buildup", "Motor overload", "Conveyor jam"],
        "quick_fix": "Clear chip jam, check conveyor mechanism",
        "requires_power_cycle": False
    },
    {
        "alarm_id": "ALM-DMGMORI-AL5001",
        "code": "AL5001",
        "name": "THROUGH-SPINDLE COOLANT LOW",
        "category": "COOLANT",
        "severity": "MEDIUM",
        "description": "Through-spindle coolant pressure or level low",
        "causes": ["Coolant level low", "Pump fault", "Filter clogged"],
        "quick_fix": "Check coolant level and pump operation",
        "requires_power_cycle": False
    }
]

def main():
    """Main function to expand the alarm database."""
    print("=" * 70)
    print("PRISM ALARM DATABASE EXPANSION - PHASE 10")
    print("DOOSAN MX/TT + BROTHER + DMG MORI Extended")
    print("=" * 70)
    
    # Load database
    db = load_database()
    existing_ids = get_existing_ids(db)
    initial_count = len(db['alarms'])
    
    print(f"\nStarting count: {initial_count} alarms")
    print(f"Existing IDs tracked: {len(existing_ids)}")
    
    added = 0
    skipped = 0
    
    # Process DOOSAN alarms
    print("\n--- Processing DOOSAN MX/TT/PUMA Extended Alarms ---")
    for alarm in DOOSAN_EXTENDED:
        if alarm['alarm_id'] not in existing_ids:
            alarm['family'] = 'DOOSAN'
            alarm['source'] = 'DOOSAN MX/TT Series Alarm Manual'
            alarm['added_phase'] = 'Phase 10'
            alarm['timestamp'] = datetime.now().isoformat()
            db['alarms'].append(alarm)
            existing_ids.add(alarm['alarm_id'])
            added += 1
            print(f"  + Added: {alarm['alarm_id']} - {alarm['name']}")
        else:
            skipped += 1
            print(f"  - Skipped (exists): {alarm['alarm_id']}")
    
    # Process BROTHER alarms
    print("\n--- Processing BROTHER Extended Alarms ---")
    for alarm in BROTHER_EXTENDED:
        if alarm['alarm_id'] not in existing_ids:
            alarm['family'] = 'BROTHER'
            alarm['source'] = 'BROTHER CNC Maintenance Manual'
            alarm['added_phase'] = 'Phase 10'
            alarm['timestamp'] = datetime.now().isoformat()
            db['alarms'].append(alarm)
            existing_ids.add(alarm['alarm_id'])
            added += 1
            print(f"  + Added: {alarm['alarm_id']} - {alarm['name']}")
        else:
            skipped += 1
            print(f"  - Skipped (exists): {alarm['alarm_id']}")
    
    # Process DMG MORI alarms
    print("\n--- Processing DMG MORI Extended Alarms ---")
    for alarm in DMG_MORI_EXTENDED:
        if alarm['alarm_id'] not in existing_ids:
            alarm['family'] = 'DMG_MORI'
            alarm['source'] = 'DMG MORI CELOS Alarm Manual'
            alarm['added_phase'] = 'Phase 10'
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
    db['metadata']['version'] = '3.8.0-PHASE10'
    db['metadata']['last_updated'] = datetime.now().isoformat()
    db['metadata']['total_alarms'] = final_count
    db['metadata']['expansion_notes'] = 'Phase 10 - DOOSAN MX/TT + BROTHER + DMG MORI Extended'
    
    new_sources = [
        'DOOSAN MX Series Alarm List',
        'DOOSAN TT Series Maintenance Manual',
        'BROTHER CNC Maintenance Manual',
        'DMG MORI CELOS Alarm Reference'
    ]
    for src in new_sources:
        if src not in db['metadata']['sources']:
            db['metadata']['sources'].append(src)
    
    save_database(db)
    
    print("\n" + "=" * 70)
    print("PHASE 10 EXPANSION COMPLETE")
    print("=" * 70)
    print(f"Initial count:   {initial_count}")
    print(f"Added:           {added}")
    print(f"Skipped:         {skipped}")
    print(f"Final count:     {final_count}")
    print(f"Target (2000):   {final_count/2000*100:.1f}%")
    print("=" * 70)
    
    return {'initial': initial_count, 'added': added, 'skipped': skipped, 'final': final_count}

if __name__ == "__main__":
    result = main()
