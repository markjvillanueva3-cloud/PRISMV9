#!/usr/bin/env python3
"""
PRISM Alarm Database - Phase 4 Expansion
Target: 1,487 → 1,600+ alarms
Focus: HURCO, DOOSAN, HEIDENHAIN, MITSUBISHI, BROTHER, FAGOR, DMG_MORI
Sources: Web research from authoritative manuals and forums
"""

import json
import os
from datetime import datetime

# Base path
BASE_PATH = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers"

# ============================================================================
# HURCO WinMax Alarms (from Hurco Support Knowledge Base)
# ============================================================================
HURCO_ALARMS = [
    {
        "alarm_id": "ALM-HURCO-0111",
        "code": "0111",
        "name": "SERVO FAULT - SPINDLE ALARM",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle axis has indicated a fault from the servo drive amplifier",
        "causes": ["Encoder feedback cable disconnection", "Spindle drive amplifier fault", "Motor winding issue", "Connector loose at motor or drive"],
        "quick_fix": "Check encoder connector at spindle motor, reseat and retry. Verify alarm code on drive amplifier display",
        "requires_power_cycle": True,
        "source": "Hurco WinMax Help Center"
    },
    {
        "alarm_id": "ALM-HURCO-0112",
        "code": "0112",
        "name": "SPINDLE FAULT - WINDING NOT COMPLETED",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Servo drive amplifier did not properly change to Low or High winding configuration",
        "causes": ["Winding relay failure", "Contactor malfunction", "Wiring issue between control and motor", "Drive parameter error"],
        "quick_fix": "Check winding relay operation, verify contactor engagement, check drive parameters",
        "requires_power_cycle": True,
        "source": "Hurco WinMax Help Center"
    },
    {
        "alarm_id": "ALM-HURCO-0113",
        "code": "0113",
        "name": "SPINDLE FAULT - NOT AT SPEED",
        "category": "SPINDLE",
        "severity": "MEDIUM",
        "description": "Spindle speed feedback did not achieve commanded speed within specified time frame",
        "causes": ["Mechanical load too high", "Belt slippage", "Motor weakness", "Drive fault", "Encoder issue"],
        "quick_fix": "Check spindle belt tension, verify no mechanical binding, check motor and drive",
        "requires_power_cycle": False,
        "source": "Hurco WinMax Help Center"
    },
    {
        "alarm_id": "ALM-HURCO-0114",
        "code": "0114",
        "name": "SPINDLE FAULT - ORIENT ERROR",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Proximity sensor or marker not detected during orient sequence, or spindle did not rotate to specified angle",
        "causes": ["Proximity switch failure", "Marker missing or damaged", "Encoder Z-pulse issue", "Orient parameter error"],
        "quick_fix": "Check proximity sensor, verify orient parameters, check encoder marker pulse",
        "requires_power_cycle": False,
        "source": "Hurco WinMax Help Center"
    },
    {
        "alarm_id": "ALM-HURCO-0115",
        "code": "0115",
        "name": "SERVO FAULT - I/R FAULT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "I/R (Isolation/Resistance) fault detected in servo system",
        "causes": ["Motor insulation breakdown", "Cable damage", "Ground fault", "Drive internal fault"],
        "quick_fix": "Check motor insulation resistance, inspect cables for damage, verify grounding",
        "requires_power_cycle": True,
        "source": "Hurco WinMax Help Center"
    },
    {
        "alarm_id": "ALM-HURCO-0116",
        "code": "0116",
        "name": "SERVO DRIVE FAULT ON AXIS",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Servo drive amplifier has indicated a fault condition for specified axis",
        "causes": ["Encoder harness disconnection", "Motor power cable issue", "Drive overload", "Internal drive failure"],
        "quick_fix": "Check alarm on drive display, verify encoder connections, check motor power cables",
        "requires_power_cycle": True,
        "source": "Hurco WinMax Help Center"
    },
    {
        "alarm_id": "ALM-HURCO-0117",
        "code": "0117",
        "name": "SPINDLE OVERLOAD DETECTED",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Maximum load on spindle exceeded rated limit",
        "causes": ["Cutting parameters too aggressive", "Dull tooling", "Workpiece material harder than expected", "Coolant failure"],
        "quick_fix": "Reduce cutting parameters, check tool condition, verify workpiece material",
        "requires_power_cycle": False,
        "source": "Hurco WinMax Help Center"
    },
    {
        "alarm_id": "ALM-HURCO-0118",
        "code": "0118",
        "name": "SPINDLE FAULT - SPEED CHANGE TIMEOUT",
        "category": "SPINDLE",
        "severity": "MEDIUM",
        "description": "Spindle did not reach targeted RPM within allowable time",
        "causes": ["Mechanical binding", "Motor weakness", "Belt slip", "Drive fault", "Load too high"],
        "quick_fix": "Check spindle mechanics, verify belt tension, reduce speed if necessary",
        "requires_power_cycle": False,
        "source": "Hurco WinMax Help Center"
    },
    {
        "alarm_id": "ALM-HURCO-0119",
        "code": "0119",
        "name": "SERVO FAULT - C AXIS",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "C-axis servo fault detected",
        "causes": ["C-axis encoder fault", "Drive amplifier issue", "Motor problem", "Cable disconnection"],
        "quick_fix": "Check C-axis encoder, verify connections, inspect drive amplifier",
        "requires_power_cycle": True,
        "source": "Hurco WinMax Help Center"
    },
    {
        "alarm_id": "ALM-HURCO-ATC01",
        "code": "ATC01",
        "name": "ATC ARM MALFUNCTION",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Automatic tool changer arm failed to complete motion sequence",
        "causes": ["Air pressure low", "Arm motor failure", "Sensor misalignment", "Mechanical interference"],
        "quick_fix": "Check air pressure, verify sensor positions, inspect for tool or debris interference",
        "requires_power_cycle": False,
        "source": "Hurco WinMax Help Center"
    },
    {
        "alarm_id": "ALM-HURCO-ATC02",
        "code": "ATC02",
        "name": "TOOL MAGAZINE POSITION ERROR",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Tool magazine did not reach commanded pocket position",
        "causes": ["Magazine motor fault", "Index sensor failure", "Mechanical obstruction", "Belt/chain issue"],
        "quick_fix": "Check magazine index sensors, verify motor operation, inspect for obstructions",
        "requires_power_cycle": False,
        "source": "Hurco WinMax Help Center"
    },
    {
        "alarm_id": "ALM-HURCO-ATC03",
        "code": "ATC03",
        "name": "TOOL CLAMP/UNCLAMP ERROR",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool clamp or unclamp operation did not complete properly",
        "causes": ["Drawbar spring weak", "Air pressure insufficient", "Collet contaminated", "Sensor failure"],
        "quick_fix": "Check air pressure, clean collet area, verify drawbar spring tension",
        "requires_power_cycle": False,
        "source": "Hurco WinMax Help Center"
    }
]

# ============================================================================
# DOOSAN VMC/Lathe Alarms (from Doosan Maintenance Manual)
# ============================================================================
DOOSAN_ALARMS = [
    {
        "alarm_id": "ALM-DOOSAN-2002",
        "code": "2002",
        "name": "MAIN SPINDLE SERVO ALARM",
        "category": "SPINDLE",
        "severity": "CRITICAL",
        "description": "Error from main spindle drive unit detected",
        "causes": ["Spindle drive amplifier fault", "Motor overheat", "Encoder failure", "Power cable issue"],
        "quick_fix": "Check alarm number on spindle drive display in electrical cabinet, refer to spindle amplifier troubleshooting",
        "requires_power_cycle": True,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2003",
        "code": "2003",
        "name": "CIRCUIT PROTECTOR TRIP",
        "category": "ELECTRICAL",
        "severity": "CRITICAL",
        "description": "Circuit protector in electrical cabinet has tripped",
        "causes": ["Short circuit", "Overload condition", "Defective circuit protector", "Motor fault"],
        "quick_fix": "Identify tripped circuit protector (QF22 etc), check secondary circuit for short, measure contact resistance",
        "requires_power_cycle": True,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2005",
        "code": "2005",
        "name": "HYD. PRESSURE DOWN ALARM",
        "category": "HYDRAULIC",
        "severity": "HIGH",
        "description": "Hydraulic pressure below minimum operating threshold",
        "causes": ["Low hydraulic oil level", "Pump failure", "Leak in system", "Filter clogged", "Relief valve issue"],
        "quick_fix": "Check hydraulic oil level, inspect for leaks, verify pump operation, clean/replace filter",
        "requires_power_cycle": False,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2007",
        "code": "2007",
        "name": "MAIN POWER PHASE & ATC SWITCH ALARM",
        "category": "ELECTRICAL",
        "severity": "CRITICAL",
        "description": "Main power phase error or ATC switch problem detected",
        "causes": ["Phase loss", "Phase sequence wrong", "ATC interlock switch failure", "Power supply issue"],
        "quick_fix": "Check incoming power phases, verify ATC switch operation, check wiring",
        "requires_power_cycle": True,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2008",
        "code": "2008",
        "name": "PSM CONTACT CHECK ERROR",
        "category": "ELECTRICAL",
        "severity": "HIGH",
        "description": "Power supply module contact check failed",
        "causes": ["PSM contactor failure", "Auxiliary contact issue", "Wiring problem", "PSM fault"],
        "quick_fix": "Check PSM contactor operation, verify auxiliary contacts, inspect wiring",
        "requires_power_cycle": True,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2033",
        "code": "2033",
        "name": "AIR PRESSURE DOWN ALARM",
        "category": "PNEUMATIC",
        "severity": "HIGH",
        "description": "Compressed air pressure below minimum operating threshold",
        "causes": ["Air compressor failure", "Leak in system", "Regulator fault", "Filter/dryer clogged"],
        "quick_fix": "Check air pressure at main supply, inspect for leaks, verify compressor operation",
        "requires_power_cycle": False,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2048",
        "code": "2048",
        "name": "SPINDLE STOP SIGNAL ALARM",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Error in spindle stop signal from drive unit",
        "causes": ["Drive communication error", "Spindle brake fault", "Encoder issue", "Motor problem"],
        "quick_fix": "Check drive alarm display, verify spindle motor connections, check feedback cable",
        "requires_power_cycle": True,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2049",
        "code": "2049",
        "name": "SPINDLE SPEED ARRIVAL ALARM",
        "category": "SPINDLE",
        "severity": "MEDIUM",
        "description": "Spindle failed to reach instructed RPM within 20 seconds",
        "causes": ["Motor weakness", "Drive fault", "Belt slippage", "Mechanical load", "Parameter error"],
        "quick_fix": "Check spindle parameters N3700-N4175, verify drive alarm, inspect belt and mechanics",
        "requires_power_cycle": False,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2050",
        "code": "2050",
        "name": "SPINDLE ROTATION MALFUNCTION",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle rotation detected abnormal behavior",
        "causes": ["Encoder fault", "Motor bearing failure", "Drive issue", "Mechanical interference"],
        "quick_fix": "Check spindle encoder, inspect motor bearings, verify drive operation",
        "requires_power_cycle": True,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2051",
        "code": "2051",
        "name": "SPINDLE ORIENTATION OVERTIME",
        "category": "SPINDLE",
        "severity": "MEDIUM",
        "description": "Spindle orientation did not complete within time limit",
        "causes": ["Orient sensor failure", "Encoder Z-pulse issue", "Motor position error", "Parameter error"],
        "quick_fix": "Check orient sensor, verify encoder operation, check orient parameters",
        "requires_power_cycle": False,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2055",
        "code": "2055",
        "name": "SPINDLE TOOL CL/UNCL OVERTIME",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool clamp/unclamp operation exceeded time limit",
        "causes": ["Drawbar cylinder failure", "Air pressure low", "Sensor fault", "Contamination in spindle"],
        "quick_fix": "Check air pressure, inspect tool clamp mechanism, verify sensors",
        "requires_power_cycle": False,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2058",
        "code": "2058",
        "name": "TOOL NO. SELECT KEEP RELAY NOT SET",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Tool number selection keep relay failed to set properly",
        "causes": ["PLC relay failure", "Wiring issue", "Program error", "Magazine position error"],
        "quick_fix": "Check PLC ladder program, verify relay operation, check magazine position",
        "requires_power_cycle": False,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2059",
        "code": "2059",
        "name": "TOOL SEARCH ILLEGAL POSITION",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool magazine search found illegal or unexpected position",
        "causes": ["Magazine index error", "Tool data mismatch", "Sensor failure", "Mechanical jam"],
        "quick_fix": "Verify tool data, check magazine sensors, inspect for mechanical issues",
        "requires_power_cycle": False,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2060",
        "code": "2060",
        "name": "M06 COMMAND ILLEGAL POSITION",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool change command issued when spindle not in legal ATC position",
        "causes": ["Spindle not at Z home", "ATC position sensors misaligned", "Program error", "Interlock failure"],
        "quick_fix": "Move spindle to ATC position, verify position sensors, check program",
        "requires_power_cycle": False,
        "source": "Doosan DNM Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DOOSAN-2260",
        "code": "2260",
        "name": "TOOL MAG. ROTATION OVER TIME",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool magazine rotation exceeded time limit",
        "causes": ["Magazine motor failure", "Mechanical jam", "Index sensor fault", "Belt/chain broken"],
        "quick_fix": "Check magazine motor, inspect for obstructions, verify sensors and drive mechanism",
        "requires_power_cycle": False,
        "source": "Doosan DNM Maintenance Manual"
    }
]

# ============================================================================
# MITSUBISHI M800/M80 Servo/Spindle Alarms (from Alarm/Parameter Manual)
# ============================================================================
MITSUBISHI_ALARMS = [
    {
        "alarm_id": "ALM-MITS-S01-10",
        "code": "S01-10",
        "name": "INSUFFICIENT VOLTAGE",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Bus voltage drop detected in main circuit of drive unit",
        "causes": ["Power supply fluctuation", "Regenerative circuit failure", "Heavy load spike", "Power module fault"],
        "quick_fix": "Check input power stability, verify regenerative resistor, reduce rapid deceleration loads",
        "requires_power_cycle": True,
        "source": "Mitsubishi M800/M80 Alarm Manual"
    },
    {
        "alarm_id": "ALM-MITS-S01-11",
        "code": "S01-11",
        "name": "AXIS SELECTION ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Axis selection rotary switch set incorrectly on drive unit",
        "causes": ["Wrong switch position", "Switch failure", "Duplicate axis number"],
        "quick_fix": "Verify axis selection switch on drive unit, ensure no duplicate axis numbers",
        "requires_power_cycle": True,
        "source": "Mitsubishi M800/M80 Alarm Manual"
    },
    {
        "alarm_id": "ALM-MITS-S01-27",
        "code": "S01-27",
        "name": "SUB SIDE ENCODER ERROR 5",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Error detected by encoder connected to machine side (linear scale/external encoder)",
        "causes": ["Scale contamination", "Cable damage", "Encoder failure", "Environmental interference"],
        "quick_fix": "Clean scale, check cable connections, verify encoder operation, check for electrical noise",
        "requires_power_cycle": True,
        "source": "Mitsubishi M800/M80 Alarm Manual"
    },
    {
        "alarm_id": "ALM-MITS-S01-41",
        "code": "S01-41",
        "name": "FEEDBACK ERROR 3",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Missed feedback pulse or Z-phase error in full closed loop system",
        "causes": ["Encoder failure", "Scale contamination", "Cable damage", "Electrical noise"],
        "quick_fix": "Check encoder/scale condition, verify cable routing, check for electrical interference",
        "requires_power_cycle": True,
        "source": "Mitsubishi M800/M80 Alarm Manual"
    },
    {
        "alarm_id": "ALM-MITS-S01-5B",
        "code": "S01-5B",
        "name": "SAFELY LIMITED SPEED MONITORING ERROR",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Commanded speed exceeding safely limited speed in safety mode",
        "causes": ["Program error exceeding SLS limits", "Parameter mismatch", "Safety function triggered"],
        "quick_fix": "Reduce commanded speed, verify safety parameters, check SLS configuration",
        "requires_power_cycle": True,
        "source": "Mitsubishi M800/M80 Alarm Manual"
    },
    {
        "alarm_id": "ALM-MITS-S01-61",
        "code": "S01-61",
        "name": "POWER MODULE OVERCURRENT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Overcurrent protection in power module activated",
        "causes": ["Motor short circuit", "Drive failure", "Cable damage", "Excessive load"],
        "quick_fix": "Check motor insulation, verify power cables, reduce load if mechanical",
        "requires_power_cycle": True,
        "source": "Mitsubishi M800/M80 Alarm Manual"
    },
    {
        "alarm_id": "ALM-MITS-S01-62",
        "code": "S01-62",
        "name": "FREQUENCY ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Input power supply frequency exceeded specification range",
        "causes": ["Power supply instability", "Generator frequency drift", "UPS issue"],
        "quick_fix": "Check power supply frequency, verify with power company, check generator if applicable",
        "requires_power_cycle": True,
        "source": "Mitsubishi M800/M80 Alarm Manual"
    },
    {
        "alarm_id": "ALM-MITS-S01-66",
        "code": "S01-66",
        "name": "PROCESS ERROR",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Error in drive unit process cycle",
        "causes": ["Drive CPU fault", "Internal communication error", "Memory failure"],
        "quick_fix": "Power cycle drive unit, if persistent replace drive",
        "requires_power_cycle": True,
        "source": "Mitsubishi M800/M80 Alarm Manual"
    },
    {
        "alarm_id": "ALM-MITS-M01-0107",
        "code": "M01-0107",
        "name": "SPINDLE ROTATION SPEED OVER",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle rotation speed exceeded axis clamp speed during thread cutting",
        "causes": ["Thread pitch too fine for RPM", "Incorrect S command", "Parameter error"],
        "quick_fix": "Lower commanded rotation speed, verify thread pitch and RPM relationship",
        "requires_power_cycle": False,
        "source": "Mitsubishi M800/M80 Alarm Manual"
    },
    {
        "alarm_id": "ALM-MITS-M01-0109",
        "code": "M01-0109",
        "name": "BLOCK START INTERLOCK",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Interlock signal input to lock block start",
        "causes": ["Safety interlock active", "Door open", "PLC condition not met"],
        "quick_fix": "Check interlock conditions in sequence program, verify safety guards",
        "requires_power_cycle": False,
        "source": "Mitsubishi M800/M80 Alarm Manual"
    },
    {
        "alarm_id": "ALM-MITS-M01-0110",
        "code": "M01-0110",
        "name": "CUTTING BLOCK START INTERLOCK",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Interlock signal input to lock cutting block start",
        "causes": ["Feed hold active", "Safety condition", "PLC ladder requirement"],
        "quick_fix": "Check interlock signals, verify cutting conditions met in PLC",
        "requires_power_cycle": False,
        "source": "Mitsubishi M800/M80 Alarm Manual"
    }
]

# ============================================================================
# FAGOR 8055/8065 Alarms (from Error Solution Manual)
# ============================================================================
FAGOR_ALARMS = [
    {
        "alarm_id": "ALM-FAGOR-0156",
        "code": "0156",
        "name": "DON'T PROGRAM G33/G95/M19 WITHOUT SPINDLE ENCODER",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Threading, feed per rev, or orient commanded without spindle encoder installed",
        "causes": ["No spindle encoder fitted", "Encoder not configured", "Wrong machine specification"],
        "quick_fix": "Install spindle encoder or remove G33/G95/M19 commands from program",
        "requires_power_cycle": False,
        "source": "Fagor 8055 Error Solution Manual"
    },
    {
        "alarm_id": "ALM-FAGOR-1182",
        "code": "1182",
        "name": "X AXIS FOLLOWING ERROR BEYOND LIMITS",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "X-axis position error exceeded parameter P21/P22 limit",
        "causes": ["Motor failure", "Encoder fault", "Mechanical binding", "Drive failure", "Ball screw issue"],
        "quick_fix": "Verify axis can move freely by hand with power off, check motor and encoder connections",
        "requires_power_cycle": True,
        "source": "Fagor 8055 Error Solution Manual"
    },
    {
        "alarm_id": "ALM-FAGOR-1183",
        "code": "1183",
        "name": "Y AXIS FOLLOWING ERROR BEYOND LIMITS",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Y-axis position error exceeded parameter P21/P22 limit",
        "causes": ["Motor failure", "Encoder fault", "Mechanical binding", "Drive failure", "Ball screw issue"],
        "quick_fix": "Verify axis can move freely by hand with power off, check motor and encoder connections",
        "requires_power_cycle": True,
        "source": "Fagor 8055 Error Solution Manual"
    },
    {
        "alarm_id": "ALM-FAGOR-1184",
        "code": "1184",
        "name": "Z AXIS FOLLOWING ERROR BEYOND LIMITS",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Z-axis position error exceeded parameter P21/P22 limit",
        "causes": ["Motor failure", "Encoder fault", "Mechanical binding", "Drive failure", "Counterweight issue"],
        "quick_fix": "Verify axis can move freely, check counterweight, motor and encoder connections",
        "requires_power_cycle": True,
        "source": "Fagor 8055 Error Solution Manual"
    },
    {
        "alarm_id": "ALM-FAGOR-1100",
        "code": "1100",
        "name": "TRAVEL LIMITS OF SPINDLE 1 EXCEEDED",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle 1 position/speed limits exceeded",
        "causes": ["Speed command too high", "Parameter error", "Motor overspeeding"],
        "quick_fix": "Reduce spindle speed, verify spindle parameters",
        "requires_power_cycle": False,
        "source": "Fagor 8055 Error Solution Manual"
    },
    {
        "alarm_id": "ALM-FAGOR-0094",
        "code": "0094",
        "name": "ASIN/ACOS RANGE EXCEEDED",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Arc sine or arc cosine calculation produced result outside valid range",
        "causes": ["Invalid calculation in program", "Rounding error", "Parameter out of bounds"],
        "quick_fix": "Check program calculation, ensure input values are between -1 and 1",
        "requires_power_cycle": False,
        "source": "Fagor 8055 Error Solution Manual"
    },
    {
        "alarm_id": "ALM-FAGOR-1018",
        "code": "1018",
        "name": "TOOL CHANGE PROGRAMMED WITH SPINDLE RUNNING",
        "category": "ATC",
        "severity": "HIGH",
        "description": "M06 tool change commanded while spindle is still rotating",
        "causes": ["Missing M05 before M06", "Spindle not stopped", "Program sequence error"],
        "quick_fix": "Add M05 spindle stop before M06 tool change command",
        "requires_power_cycle": False,
        "source": "Fagor 8055 Error Solution Manual"
    },
    {
        "alarm_id": "ALM-FAGOR-1039",
        "code": "1039",
        "name": "NO F HAS BEEN PROGRAMMED",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Feed rate command F not programmed before motion command",
        "causes": ["Missing F command", "Modal F cleared", "Program structure error"],
        "quick_fix": "Add F feedrate command to program",
        "requires_power_cycle": False,
        "source": "Fagor 8055 Error Solution Manual"
    },
    {
        "alarm_id": "ALM-FAGOR-1055",
        "code": "1055",
        "name": "NESTING EXCEEDED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Subroutine nesting depth exceeded maximum allowed",
        "causes": ["Too many nested subroutine calls", "Recursive call", "Program structure error"],
        "quick_fix": "Reduce subroutine nesting levels, flatten program structure",
        "requires_power_cycle": False,
        "source": "Fagor 8055 Error Solution Manual"
    },
    {
        "alarm_id": "ALM-FAGOR-1072",
        "code": "1072",
        "name": "TOOL RADIUS COMPENSATION NOT POSSIBLE",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Cutter compensation cannot be applied as programmed",
        "causes": ["Contour too small for tool", "Invalid approach", "Gouging would occur"],
        "quick_fix": "Use smaller tool, modify approach, or reprogram contour",
        "requires_power_cycle": False,
        "source": "Fagor 8055 Error Solution Manual"
    }
]

# ============================================================================
# BROTHER TC-S2 Series Alarms (from forums and manuals)
# ============================================================================
BROTHER_ALARMS = [
    {
        "alarm_id": "ALM-BRO-5058-07",
        "code": "5058.07",
        "name": "DE1 SP. SERVO",
        "category": "SPINDLE",
        "severity": "CRITICAL",
        "description": "Spindle servo error - encoder/feedback communication failure",
        "causes": ["Encoder cable disconnection", "Encoder internal failure", "Connector corrosion", "Motor winding issue"],
        "quick_fix": "Reseat encoder connectors, use contact cleaner, check for broken wires inside encoder housing",
        "requires_power_cycle": True,
        "source": "Practical Machinist Brother TC-S2 Forum"
    },
    {
        "alarm_id": "ALM-BRO-DE1-SERVO",
        "code": "DE1",
        "name": "SERVO ERROR GENERAL",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "General servo system error on Sanyo Denki drive",
        "causes": ["Drive communication fault", "Motor failure", "Encoder issue", "Power supply problem"],
        "quick_fix": "Check drive display for specific error, verify power and communications",
        "requires_power_cycle": True,
        "source": "Brother TC-S2 Maintenance Manual"
    },
    {
        "alarm_id": "ALM-BRO-TM-FWD",
        "code": "TM-FWD",
        "name": "TM FORWARD SENSOR ALARM",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Tool magazine forward sensor not detecting expected position",
        "causes": ["Sensor failure", "Magazine not in position", "Mechanical obstruction"],
        "quick_fix": "Check sensor operation, verify magazine position, inspect for obstructions",
        "requires_power_cycle": False,
        "source": "Brother TC-S2 Maintenance Manual"
    },
    {
        "alarm_id": "ALM-BRO-TM-BWD",
        "code": "TM-BWD",
        "name": "TM BACKWARD SENSOR ALARM",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Tool magazine backward sensor not detecting expected position",
        "causes": ["Sensor failure", "Magazine not in position", "Mechanical obstruction"],
        "quick_fix": "Check sensor operation, verify magazine position, inspect for obstructions",
        "requires_power_cycle": False,
        "source": "Brother TC-S2 Maintenance Manual"
    },
    {
        "alarm_id": "ALM-BRO-SP-UP",
        "code": "SP-UP",
        "name": "SPINDLE UP SENSOR ALARM",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Spindle head up position sensor not detected",
        "causes": ["Sensor failure", "Spindle not at proper height", "Z-axis position error"],
        "quick_fix": "Verify Z-axis position, check spindle head up sensor",
        "requires_power_cycle": False,
        "source": "Brother TC-S2 Maintenance Manual"
    },
    {
        "alarm_id": "ALM-BRO-TM-SERVO",
        "code": "TM-SERVO",
        "name": "TM SERVO ALARM",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool magazine servo motor alarm",
        "causes": ["Magazine motor overload", "Mechanical jam", "Drive fault"],
        "quick_fix": "Check for magazine obstruction, verify motor and drive",
        "requires_power_cycle": True,
        "source": "Brother TC-S2 Maintenance Manual"
    },
    {
        "alarm_id": "ALM-BRO-TOOL-INCORRECT",
        "code": "TOOL-INC",
        "name": "TOOL NUMBER INCORRECT",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Tool number in spindle does not match expected tool",
        "causes": ["Tool data corruption", "Previous ATC error", "Manual tool change without update"],
        "quick_fix": "Verify tool data, perform tool data reset if necessary",
        "requires_power_cycle": False,
        "source": "Brother TC-S2 Maintenance Manual"
    },
    {
        "alarm_id": "ALM-BRO-LOW-BATT",
        "code": "LOW-BATT",
        "name": "LOW BATTERY",
        "category": "SYSTEM",
        "severity": "MEDIUM",
        "description": "Backup battery voltage low - position data at risk",
        "causes": ["Battery depleted", "Battery connection issue"],
        "quick_fix": "Replace backup battery immediately to preserve position data",
        "requires_power_cycle": True,
        "source": "Brother TC-S2 Maintenance Manual"
    }
]

# ============================================================================
# HEIDENHAIN TNC Alarms (from NC Error Messages)
# ============================================================================
HEIDENHAIN_ALARMS = [
    {
        "alarm_id": "ALM-HEID-PROC-CHECK",
        "code": "PROC-0",
        "name": "PROCESSOR CHECK ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "CRC sum error for control data (datum point etc.)",
        "causes": ["Data corruption", "Memory failure", "Battery backup issue"],
        "quick_fix": "Restore data from backup, check battery, may need service",
        "requires_power_cycle": True,
        "source": "HEIDENHAIN NC Error Messages"
    },
    {
        "alarm_id": "ALM-HEID-FE-MEMORY",
        "code": "FE-MEM",
        "name": "MEMORY FULL",
        "category": "SYSTEM",
        "severity": "MEDIUM",
        "description": "Cannot save any more files - memory full",
        "causes": ["Too many programs stored", "Memory fragmentation", "Large programs"],
        "quick_fix": "Delete unnecessary files, archive programs to external storage",
        "requires_power_cycle": False,
        "source": "HEIDENHAIN NC Error Messages"
    },
    {
        "alarm_id": "ALM-HEID-FE-EXISTS",
        "code": "FE-EXISTS",
        "name": "FILE ALREADY EXISTS",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Attempted to create a file that already exists",
        "causes": ["Duplicate filename", "Previous file not deleted"],
        "quick_fix": "Use different filename or delete existing file",
        "requires_power_cycle": False,
        "source": "HEIDENHAIN NC Error Messages"
    },
    {
        "alarm_id": "ALM-HEID-DNC-ERROR",
        "code": "DNC-ERR",
        "name": "DATA TRANSMISSION ERROR",
        "category": "COMMUNICATION",
        "severity": "MEDIUM",
        "description": "Error during data transfer via DNC",
        "causes": ["Cable issue", "Baud rate mismatch", "Protocol error", "Noise interference"],
        "quick_fix": "Check data cable, verify communication settings, retry transfer",
        "requires_power_cycle": False,
        "source": "HEIDENHAIN NC Error Messages"
    },
    {
        "alarm_id": "ALM-HEID-TEMP-HIGH",
        "code": "TEMP-HIGH",
        "name": "TNC OPERATING TEMP EXCEEDED",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "Control unit internal temperature too high",
        "causes": ["Cabinet cooling failure", "Fan blocked", "Ambient temp too high", "Filter clogged"],
        "quick_fix": "Check heat transfer in electrical cabinet, verify fans operating, clean filters",
        "requires_power_cycle": False,
        "source": "HEIDENHAIN NC Error Messages"
    },
    {
        "alarm_id": "ALM-HEID-PLC-ERR",
        "code": "PLC-ERR",
        "name": "PLC ERROR",
        "category": "PLC",
        "severity": "HIGH",
        "description": "Error message from PLC - see machine documentation",
        "causes": ["PLC program error", "I/O fault", "Sequence error", "Machine specific"],
        "quick_fix": "Refer to machine builder documentation, check PLC diagnostics",
        "requires_power_cycle": False,
        "source": "HEIDENHAIN NC Error Messages"
    },
    {
        "alarm_id": "ALM-HEID-FK-REF",
        "code": "FK-REF",
        "name": "FK REFERENCE ERROR",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Invalid free contour (FK) reference in program",
        "causes": ["Invalid reference point", "Program syntax error", "Missing definition"],
        "quick_fix": "Check FK reference definition in program",
        "requires_power_cycle": False,
        "source": "HEIDENHAIN NC Error Messages"
    },
    {
        "alarm_id": "ALM-HEID-LABEL-ERR",
        "code": "LABEL-ERR",
        "name": "CALCULATED LABEL TOO LARGE",
        "category": "PROGRAM",
        "severity": "LOW",
        "description": "Computed label number exceeds valid range",
        "causes": ["Calculation overflow", "Invalid Q-parameter", "Program logic error"],
        "quick_fix": "Edit program to correct label calculation",
        "requires_power_cycle": False,
        "source": "HEIDENHAIN NC Error Messages"
    },
    {
        "alarm_id": "ALM-HEID-SCALE-ERR",
        "code": "SCALE-ERR",
        "name": "SCALING FACTOR TOO LARGE",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Computed scaling factor exceeds allowable range",
        "causes": ["Invalid scale parameter", "Calculation error"],
        "quick_fix": "Reduce scaling factor to valid range",
        "requires_power_cycle": False,
        "source": "HEIDENHAIN NC Error Messages"
    }
]

# ============================================================================
# DMG MORI / Mori Seiki Alarms (from maintenance manuals and forums)
# ============================================================================
DMG_MORI_ALARMS = [
    {
        "alarm_id": "ALM-DMG-EX0491",
        "code": "EX0491",
        "name": "SPINDLE SPEED ABNORMAL",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Programmed spindle RPM differs from actual RPM by excessive margin",
        "causes": ["Encoder failure", "Belt slip", "Motor weakness", "Load variation", "Vibration causing RPM fluctuation"],
        "quick_fix": "Check spindle encoder, verify belt tension, reduce max RPM if bar stock vibration",
        "requires_power_cycle": False,
        "source": "Practical Machinist Mori Forum"
    },
    {
        "alarm_id": "ALM-DMG-EX1257",
        "code": "EX1257",
        "name": "POWER MATE ALARM - MAGAZINE",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Power Mate servo controller alarm for tool magazine",
        "causes": ["Battery depleted losing position", "Zero return needed", "Drive fault"],
        "quick_fix": "Check PMM screen for alarm, perform magazine zero return procedure",
        "requires_power_cycle": True,
        "source": "CNCZone Mori SH-630 Forum"
    },
    {
        "alarm_id": "ALM-DMG-2002",
        "code": "2002",
        "name": "MAIN SPINDLE SERVO ALARM",
        "category": "SPINDLE",
        "severity": "CRITICAL",
        "description": "Spindle drive unit fault",
        "causes": ["Drive amplifier fault", "Motor issue", "Encoder failure", "Power problem"],
        "quick_fix": "Check alarm on spindle drive display, verify motor connections",
        "requires_power_cycle": True,
        "source": "DMG MORI HMC Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DMG-2259",
        "code": "2259",
        "name": "WAIT POT NO. = SPINDLE POT NO.",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool wait position conflicts with spindle pot number",
        "causes": ["ATC sequence error", "Tool data mismatch", "Previous ATC fault"],
        "quick_fix": "Verify tool data, check ATC sequence, may need ATC reset",
        "requires_power_cycle": False,
        "source": "DMG MORI HMC Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DMG-2260",
        "code": "2260",
        "name": "TOOL MAG. ROTATION OVER TIME",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool magazine failed to rotate to position within time limit",
        "causes": ["Magazine motor fault", "Mechanical jam", "Index sensor failure"],
        "quick_fix": "Check magazine motor, inspect for obstructions, verify sensors",
        "requires_power_cycle": False,
        "source": "DMG MORI HMC Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DMG-2264",
        "code": "2264",
        "name": "TOOL MAGAZINE SERVO BATTERY ALARM",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Magazine servo position backup battery depleted",
        "causes": ["Battery exhausted", "Battery connection issue"],
        "quick_fix": "Replace magazine servo battery, may need magazine zero return",
        "requires_power_cycle": True,
        "source": "DMG MORI HMC Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DMG-2270",
        "code": "2270",
        "name": "ATC MAG POT TOOL OUT SW. ALARM",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Tool out switch in magazine pot indicates unexpected state",
        "causes": ["Tool fell out", "Sensor failure", "Tool not fully seated"],
        "quick_fix": "Check tool seating in pocket, verify sensor operation",
        "requires_power_cycle": False,
        "source": "DMG MORI HMC Maintenance Manual"
    },
    {
        "alarm_id": "ALM-DMG-SP-STOP",
        "code": "SP-STOP",
        "name": "SPINDLE STOP ERROR",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle stopped unexpectedly during operation",
        "causes": ["Overload", "Drive fault", "Encoder issue", "Interlock triggered"],
        "quick_fix": "Check spindle drive for alarm, verify no overload condition",
        "requires_power_cycle": False,
        "source": "DMG MORI Maintenance Manual"
    }
]

def load_master_database():
    """Load the current master alarm database"""
    master_path = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")
    with open(master_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_master_database(data):
    """Save the updated master alarm database"""
    master_path = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")
    with open(master_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved: {master_path}")

def add_alarms_to_family(db, family, new_alarms):
    """Add new alarms to a controller family, avoiding duplicates"""
    # Get existing alarm codes for this family
    existing_codes = set()
    for alarm in db["alarms"]:
        if alarm.get("alarm_id", "").startswith(f"ALM-{family}"):
            existing_codes.add(alarm["code"])
    
    added = 0
    skipped = 0
    
    for alarm in new_alarms:
        if alarm["code"] not in existing_codes:
            db["alarms"].append(alarm)
            existing_codes.add(alarm["code"])
            added += 1
        else:
            skipped += 1
    
    return added, skipped

def main():
    print("=" * 60)
    print("PRISM ALARM DATABASE - PHASE 4 EXPANSION")
    print("=" * 60)
    
    # Load current database
    db = load_master_database()
    initial_count = len(db["alarms"])
    print(f"Initial alarm count: {initial_count}")
    
    # Add HURCO alarms
    added, skipped = add_alarms_to_family(db, "HURCO", HURCO_ALARMS)
    print(f"HURCO alarms: Added {added}, Skipped {skipped}")
    
    # Add DOOSAN alarms
    added, skipped = add_alarms_to_family(db, "DOOSAN", DOOSAN_ALARMS)
    print(f"DOOSAN alarms: Added {added}, Skipped {skipped}")
    
    # Add MITSUBISHI alarms
    added, skipped = add_alarms_to_family(db, "MITS", MITSUBISHI_ALARMS)
    print(f"MITSUBISHI alarms: Added {added}, Skipped {skipped}")
    
    # Add FAGOR alarms
    added, skipped = add_alarms_to_family(db, "FAGOR", FAGOR_ALARMS)
    print(f"FAGOR alarms: Added {added}, Skipped {skipped}")
    
    # Add BROTHER alarms
    added, skipped = add_alarms_to_family(db, "BRO", BROTHER_ALARMS)
    print(f"BROTHER alarms: Added {added}, Skipped {skipped}")
    
    # Add HEIDENHAIN alarms
    added, skipped = add_alarms_to_family(db, "HEID", HEIDENHAIN_ALARMS)
    print(f"HEIDENHAIN alarms: Added {added}, Skipped {skipped}")
    
    # Add DMG_MORI alarms
    added, skipped = add_alarms_to_family(db, "DMG", DMG_MORI_ALARMS)
    print(f"DMG MORI alarms: Added {added}, Skipped {skipped}")
    
    # Update metadata
    final_count = len(db["alarms"])
    db["metadata"]["version"] = "3.2.0-PHASE4"
    db["metadata"]["last_updated"] = datetime.now().isoformat()
    db["metadata"]["total_alarms"] = final_count
    db["metadata"]["expansion_notes"] = "Phase 4 - Multi-family expansion (HURCO, DOOSAN, MITSUBISHI, FAGOR, BROTHER, HEIDENHAIN, DMG_MORI)"
    
    # Add new sources
    new_sources = [
        "Hurco WinMax Help Center",
        "Doosan DNM Maintenance Manual",
        "Mitsubishi M800/M80 Alarm Manual",
        "Fagor 8055 Error Solution Manual",
        "Brother TC-S2 Maintenance Manual",
        "HEIDENHAIN NC Error Messages",
        "DMG MORI HMC Maintenance Manual",
        "Practical Machinist Forums"
    ]
    for src in new_sources:
        if src not in db["metadata"]["sources"]:
            db["metadata"]["sources"].append(src)
    
    # Save database
    save_master_database(db)
    
    # Print summary
    print()
    print("=" * 60)
    print("EXPANSION COMPLETE")
    print("=" * 60)
    print(f"Initial: {initial_count} alarms")
    print(f"Final:   {final_count} alarms")
    print(f"Added:   {final_count - initial_count} new alarms")
    
    # Count by family
    family_counts = {}
    for alarm in db["alarms"]:
        aid = alarm.get("alarm_id", "")
        if "-HURCO-" in aid:
            family = "HURCO"
        elif "-DOOSAN-" in aid:
            family = "DOOSAN"
        elif "-MITS-" in aid:
            family = "MITSUBISHI"
        elif "-FAGOR-" in aid:
            family = "FAGOR"
        elif "-BRO-" in aid:
            family = "BROTHER"
        elif "-HEID-" in aid:
            family = "HEIDENHAIN"
        elif "-DMG-" in aid:
            family = "DMG_MORI"
        elif "-FANUC-" in aid or "FANUC" in aid:
            family = "FANUC"
        elif "-HAAS-" in aid:
            family = "HAAS"
        elif "-SIEMENS-" in aid:
            family = "SIEMENS"
        elif "-MAZAK-" in aid:
            family = "MAZAK"
        elif "-OKUMA-" in aid:
            family = "OKUMA"
        else:
            family = "OTHER"
        family_counts[family] = family_counts.get(family, 0) + 1
    
    print()
    print("Family counts:")
    for family in sorted(family_counts.keys()):
        print(f"  {family}: {family_counts[family]}")

if __name__ == "__main__":
    main()
