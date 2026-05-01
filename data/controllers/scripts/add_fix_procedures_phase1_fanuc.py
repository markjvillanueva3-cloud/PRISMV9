#!/usr/bin/env python3
"""
PRISM Alarm Database - Fix Procedures Enhancement Phase 1
Target: FANUC alarms (~245 alarms)
Adds detailed troubleshooting, tools, skill levels, safety precautions
"""

import json
import os
from datetime import datetime

# Paths
BASE_PATH = r"C:\\PRISM\EXTRACTED\controllers"
MASTER_DB = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")
OUTPUT_DB = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")

# Fix procedure templates by category
FIX_TEMPLATES = {
    "SYSTEM": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "30-60 min",
        "safety_precautions": [
            "Ensure machine is in safe state before power cycling",
            "Back up all parameters before making changes",
            "Verify no personnel in machine work envelope"
        ],
        "required_tools": ["Laptop with FANUC diagnostic software", "Backup media", "Multimeter"],
        "general_steps": [
            "Record all error codes and parameters",
            "Check system battery voltage",
            "Verify all connections are secure",
            "Review recent parameter changes",
            "Power cycle if safe to do so"
        ]
    },
    "SERVO": {
        "skill_level": "TECHNICIAN",
        "estimated_time": "45-90 min",
        "safety_precautions": [
            "Lock out/tag out before working on servo system",
            "Discharge capacitors before touching drive components",
            "Verify axis is mechanically secure before enabling"
        ],
        "required_tools": ["Multimeter", "Oscilloscope", "Servo tuning software", "Torque wrench"],
        "general_steps": [
            "Check servo amplifier LED status",
            "Verify encoder connections and signals",
            "Measure motor winding resistance",
            "Check for mechanical binding or load issues",
            "Review servo parameters and tuning"
        ]
    },
    "SPINDLE": {
        "skill_level": "TECHNICIAN",
        "estimated_time": "30-60 min",
        "safety_precautions": [
            "Ensure spindle is completely stopped",
            "Lock out power before working on spindle drive",
            "Verify belt/coupling is secure before running"
        ],
        "required_tools": ["Tachometer", "Vibration analyzer", "Multimeter", "Belt tension gauge"],
        "general_steps": [
            "Check spindle drive status LEDs",
            "Verify encoder/sensor signals",
            "Check belt tension and condition",
            "Measure motor temperature",
            "Review spindle parameters"
        ]
    },
    "PROGRAM": {
        "skill_level": "OPERATOR",
        "estimated_time": "15-30 min",
        "safety_precautions": [
            "Verify program in single block before running",
            "Check tool offsets and work coordinates",
            "Ensure correct program is loaded"
        ],
        "required_tools": ["Program editor", "Verification software", "Reference manual"],
        "general_steps": [
            "Review error message and line number",
            "Check syntax at indicated block",
            "Verify G/M code compatibility",
            "Check for missing or incorrect data",
            "Test in dry run mode"
        ]
    },
    "OVERTRAVEL": {
        "skill_level": "OPERATOR",
        "estimated_time": "10-20 min",
        "safety_precautions": [
            "Move axis slowly when releasing overtravel",
            "Verify travel limits before resuming operation",
            "Check for mechanical obstructions"
        ],
        "required_tools": ["Manual pulse generator (MPG)", "Reference manual"],
        "general_steps": [
            "Identify which axis triggered overtravel",
            "Press and hold overtravel release button",
            "Jog axis away from limit switch",
            "Verify limit switch operation",
            "Check program for coordinate errors"
        ]
    },
    "ATC": {
        "skill_level": "TECHNICIAN",
        "estimated_time": "30-60 min",
        "safety_precautions": [
            "Ensure spindle is empty before ATC troubleshooting",
            "Keep hands clear of magazine and arm",
            "Verify air pressure before cycling ATC"
        ],
        "required_tools": ["ATC diagnostic mode", "Air pressure gauge", "Lubricant", "Cleaning supplies"],
        "general_steps": [
            "Check ATC position sensors",
            "Verify magazine alignment",
            "Check gripper/arm operation",
            "Verify tool clamp/unclamp cylinders",
            "Clean and lubricate as needed"
        ]
    },
    "SAFETY": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "30-90 min",
        "safety_precautions": [
            "Do not bypass safety systems",
            "Verify all safety functions after repair",
            "Document all safety-related changes"
        ],
        "required_tools": ["Safety system diagnostic tools", "Multimeter", "Door switch tester"],
        "general_steps": [
            "Check emergency stop circuit continuity",
            "Verify door interlock switches",
            "Test safety relay operation",
            "Check light curtain alignment",
            "Verify dual check safety parameters"
        ]
    },
    "ENCODER": {
        "skill_level": "TECHNICIAN",
        "estimated_time": "45-90 min",
        "safety_precautions": [
            "Lock out axis before disconnecting encoder",
            "Handle encoder cables carefully",
            "Avoid static discharge when working with encoders"
        ],
        "required_tools": ["Oscilloscope", "Encoder tester", "Multimeter", "Cable tester"],
        "general_steps": [
            "Check encoder cable connections",
            "Verify encoder signals with oscilloscope",
            "Check for cable damage or interference",
            "Verify encoder battery voltage",
            "Replace encoder if signals are degraded"
        ]
    },
    "AXIS": {
        "skill_level": "TECHNICIAN",
        "estimated_time": "30-60 min",
        "safety_precautions": [
            "Secure axis mechanically before troubleshooting",
            "Verify no personnel in travel path",
            "Use caution with heavy axis components"
        ],
        "required_tools": ["Dial indicator", "Laser alignment", "Multimeter", "Manual pulse generator"],
        "general_steps": [
            "Check for mechanical binding",
            "Verify ball screw and guideway condition",
            "Check servo amplifier status",
            "Verify encoder feedback",
            "Review axis parameters"
        ]
    },
    "COMMUNICATION": {
        "skill_level": "TECHNICIAN",
        "estimated_time": "20-45 min",
        "safety_precautions": [
            "Do not disconnect cables while powered",
            "Verify network settings before changes",
            "Back up communication parameters"
        ],
        "required_tools": ["Network tester", "RS232 breakout box", "Laptop", "Cable tester"],
        "general_steps": [
            "Check cable connections",
            "Verify communication parameters",
            "Test cable continuity",
            "Check for EMI interference",
            "Verify network settings"
        ]
    },
    "OVERHEAT": {
        "skill_level": "TECHNICIAN",
        "estimated_time": "30-60 min",
        "safety_precautions": [
            "Allow components to cool before touching",
            "Verify cooling system operation",
            "Check for fire hazards"
        ],
        "required_tools": ["Infrared thermometer", "Multimeter", "Air filter", "Cleaning supplies"],
        "general_steps": [
            "Check cooling fan operation",
            "Clean air filters and heat sinks",
            "Verify coolant flow and level",
            "Check ambient temperature",
            "Review load conditions"
        ]
    },
    "PMC": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "45-90 min",
        "safety_precautions": [
            "Back up PMC program before changes",
            "Test changes in simulation first",
            "Document all modifications"
        ],
        "required_tools": ["PMC programmer", "Laptop with FANUC software", "Backup media"],
        "general_steps": [
            "Check PMC status and signals",
            "Review ladder logic",
            "Verify I/O connections",
            "Check for timer/counter issues",
            "Review recent changes"
        ]
    },
    "AUXILIARY": {
        "skill_level": "TECHNICIAN",
        "estimated_time": "20-45 min",
        "safety_precautions": [
            "Verify hydraulic/pneumatic pressure is released",
            "Check fluid levels before operation",
            "Wear appropriate PPE for fluid handling"
        ],
        "required_tools": ["Pressure gauges", "Multimeter", "Fluid test kit", "Lubricant"],
        "general_steps": [
            "Check fluid levels and pressure",
            "Verify pump operation",
            "Check for leaks",
            "Clean filters",
            "Verify sensor operation"
        ]
    }
}

# Specific FANUC alarm fix procedures
FANUC_SPECIFIC_FIXES = {
    "000": {
        "detailed_troubleshooting": [
            "This is a notification alarm, not an error",
            "Parameter or program changes require power cycle to take effect",
            "Verify all changes were saved before power cycling",
            "After power cycle, confirm changes are applied"
        ],
        "parts_commonly_replaced": [],
        "related_alarms": ["PS0000", "SV0000"]
    },
    "001": {
        "detailed_troubleshooting": [
            "Check if program was transferred correctly",
            "Verify RS232/Ethernet cable connection",
            "Check communication parameters (baud rate, parity)",
            "Re-transfer program and verify checksum",
            "If using tape reader, clean read head"
        ],
        "parts_commonly_replaced": ["Communication cable", "RS232 port"],
        "related_alarms": ["002", "085", "086"]
    },
    "SV0401": {
        "detailed_troubleshooting": [
            "Check servo amplifier LED status for error codes",
            "Verify power supply to amplifier",
            "Check motor connections",
            "Measure motor winding resistance",
            "Check for mechanical binding",
            "Review FSSB configuration"
        ],
        "parts_commonly_replaced": ["Servo amplifier", "Servo motor", "Power supply"],
        "related_alarms": ["SV0402", "SV0403", "SV0404"]
    }
}

def get_category_template(category):
    """Get the fix procedure template for a category."""
    category_upper = category.upper()
    if category_upper in FIX_TEMPLATES:
        return FIX_TEMPLATES[category_upper]
    return {
        "skill_level": "TECHNICIAN",
        "estimated_time": "30-60 min",
        "safety_precautions": ["Follow all safety procedures", "Lock out/tag out as required"],
        "required_tools": ["Multimeter", "Reference manual", "Diagnostic tools"],
        "general_steps": ["Record alarm code", "Check related components", "Verify connections"]
    }

def generate_detailed_troubleshooting(alarm):
    """Generate troubleshooting steps based on alarm details."""
    steps = []
    name = alarm.get("name", "").lower()
    category = alarm.get("category", "")
    
    if "servo" in name or "axis" in name:
        steps.extend([
            "Check servo amplifier LED status for error codes",
            "Verify motor connections are secure",
            "Check encoder cable and connections",
            "Measure motor winding resistance for shorts"
        ])
    elif "spindle" in name:
        steps.extend([
            "Check spindle drive status LEDs",
            "Verify spindle motor connections",
            "Check spindle encoder signals",
            "Verify belt tension and condition"
        ])
    elif "overtravel" in name or "limit" in name:
        steps.extend([
            "Identify which axis triggered the limit",
            "Check limit switch operation",
            "Review program for coordinate errors",
            "Verify soft limit settings"
        ])
    elif "encoder" in name:
        steps.extend([
            "Check encoder cable connections",
            "Verify encoder signals with oscilloscope",
            "Check encoder battery voltage",
            "Look for cable damage or EMI"
        ])
    else:
        steps = [
            f"Review {category} system documentation",
            "Check all related connections",
            "Verify system parameters",
            "Contact service if issue persists"
        ]
    return steps

def generate_common_parts(category):
    """Generate commonly replaced parts list based on category."""
    parts_map = {
        "SERVO": ["Servo amplifier", "Servo motor", "Encoder", "Encoder cable"],
        "SPINDLE": ["Spindle drive", "Spindle motor", "Spindle encoder", "Belt"],
        "ENCODER": ["Encoder", "Encoder cable", "Encoder battery"],
        "ATC": ["Proximity sensors", "Solenoid valves", "Gripper fingers"],
        "SYSTEM": ["Control board", "Power supply", "Battery"],
        "SAFETY": ["Safety relay", "Door switch", "E-stop button"]
    }
    return parts_map.get(category.upper(), ["Contact service for parts list"])

def enhance_alarm_with_fix_procedures(alarm):
    """Add detailed fix procedures to an alarm."""
    if alarm.get("family") != "FANUC" and alarm.get("controller_family") != "FANUC":
        return alarm
    
    category = alarm.get("category", "SYSTEM")
    code = alarm.get("code", "")
    template = get_category_template(category)
    
    alarm["fix_procedure"] = {
        "skill_level": template["skill_level"],
        "estimated_time": template["estimated_time"],
        "safety_precautions": template["safety_precautions"],
        "required_tools": template["required_tools"],
        "troubleshooting_steps": template["general_steps"].copy()
    }
    
    if code in FANUC_SPECIFIC_FIXES:
        specific = FANUC_SPECIFIC_FIXES[code]
        alarm["fix_procedure"]["detailed_troubleshooting"] = specific.get("detailed_troubleshooting", [])
        alarm["fix_procedure"]["parts_commonly_replaced"] = specific.get("parts_commonly_replaced", [])
        alarm["related_alarms"] = specific.get("related_alarms", [])
    else:
        alarm["fix_procedure"]["detailed_troubleshooting"] = generate_detailed_troubleshooting(alarm)
        alarm["fix_procedure"]["parts_commonly_replaced"] = generate_common_parts(category)
        alarm["related_alarms"] = []
    
    alarm["fix_procedure"]["verification_steps"] = [
        "Clear alarm and verify it does not return",
        "Test machine operation in manual mode",
        "Run test program in single block",
        "Verify normal operation under load"
    ]
    return alarm

def main():
    print("=" * 70)
    print("PRISM Alarm Database - Fix Procedures Enhancement Phase 1")
    print("Target: FANUC alarms")
    print("=" * 70)
    
    # Load database
    print("\nLoading master database...")
    with open(MASTER_DB, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    alarms = db.get("alarms", [])
    total = len(alarms)
    print(f"Total alarms in database: {total}")
    
    # Count FANUC alarms
    fanuc_count = sum(1 for a in alarms if a.get("family") == "FANUC" or a.get("controller_family") == "FANUC")
    print(f"FANUC alarms to enhance: {fanuc_count}")
    
    # Enhance alarms
    enhanced = 0
    for alarm in alarms:
        if alarm.get("family") == "FANUC" or alarm.get("controller_family") == "FANUC":
            enhance_alarm_with_fix_procedures(alarm)
            enhanced += 1
    
    print(f"\nEnhanced {enhanced} FANUC alarms with fix procedures")
    
    # Update metadata
    db["metadata"]["fix_procedures_version"] = "1.0.0"
    db["metadata"]["fix_procedures_phase1"] = {
        "family": "FANUC",
        "alarms_enhanced": enhanced,
        "date": datetime.now().isoformat(),
        "fields_added": [
            "fix_procedure.skill_level",
            "fix_procedure.estimated_time",
            "fix_procedure.safety_precautions",
            "fix_procedure.required_tools",
            "fix_procedure.troubleshooting_steps",
            "fix_procedure.detailed_troubleshooting",
            "fix_procedure.parts_commonly_replaced",
            "fix_procedure.verification_steps",
            "related_alarms"
        ]
    }
    db["metadata"]["last_updated"] = datetime.now().isoformat()
    
    # Save database
    print("\nSaving enhanced database...")
    with open(OUTPUT_DB, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    print(f"\nDatabase saved to: {OUTPUT_DB}")
    print("\n" + "=" * 70)
    print("PHASE 1 COMPLETE - FANUC FIX PROCEDURES ADDED")
    print("=" * 70)
    
    return enhanced

if __name__ == "__main__":
    main()
