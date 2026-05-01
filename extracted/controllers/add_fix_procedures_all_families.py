#!/usr/bin/env python3
"""
PRISM Alarm Database - Add Fix Procedures to All Remaining Families
Adds detailed fix procedures to 11 families (all except FANUC which already has them)
Total: ~2,241 alarms to enhance
"""

import json
from datetime import datetime
from pathlib import Path

# Master database path
DB_PATH = Path(r"C:\\PRISM\EXTRACTED\controllers\MASTER_ALARM_DATABASE_v3.json")

# Fix procedure templates by category
FIX_TEMPLATES = {
    "SERVO": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "30-90 min",
        "safety_precautions": [
            "LOCKOUT/TAGOUT before working on servo system",
            "Verify all axes are stationary before inspection",
            "Discharge capacitors in servo amplifier before touching",
            "Ensure E-STOP is engaged during troubleshooting",
            "Wear appropriate PPE including safety glasses"
        ],
        "required_tools": [
            "Digital multimeter",
            "Oscilloscope for signal analysis",
            "Servo tuning software",
            "Torque wrench for motor/encoder mounts",
            "Insulated tools for electrical work"
        ],
        "troubleshooting_steps": [
            "Record alarm code and axis number",
            "Check servo amplifier status LEDs",
            "Verify encoder cable connections",
            "Measure motor winding resistance",
            "Check for mechanical binding on axis",
            "Review servo parameter settings"
        ],
        "parts_commonly_replaced": [
            "Servo motor",
            "Servo amplifier",
            "Encoder/resolver",
            "Motor cables",
            "Cooling fan"
        ]
    },
    "SPINDLE": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "45-120 min",
        "safety_precautions": [
            "Ensure spindle is completely stopped before inspection",
            "LOCKOUT/TAGOUT main power before servicing",
            "Allow spindle to cool before touching",
            "Verify tool is removed from spindle",
            "Block spindle from rotating during service"
        ],
        "required_tools": [
            "Vibration analyzer",
            "Tachometer",
            "Thermal camera",
            "Spindle alignment tools",
            "Digital multimeter"
        ],
        "troubleshooting_steps": [
            "Record spindle speed and error at time of alarm",
            "Check spindle drive status and error codes",
            "Measure spindle motor temperature",
            "Verify spindle encoder signals",
            "Check belt tension and condition (if belt-driven)",
            "Listen for abnormal bearing noise"
        ],
        "parts_commonly_replaced": [
            "Spindle bearings",
            "Spindle drive",
            "Spindle motor",
            "Belt/pulley (if applicable)",
            "Spindle encoder"
        ]
    },
    "ATC": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "30-60 min",
        "safety_precautions": [
            "Keep hands clear of tool change mechanism",
            "Verify ATC is in safe position before service",
            "LOCKOUT/TAGOUT before mechanical adjustment",
            "Remove tool from spindle before ATC service",
            "Ensure magazine is in safe position"
        ],
        "required_tools": [
            "Timing light",
            "Dial indicator",
            "Proximity sensor tester",
            "Pneumatic pressure gauge",
            "Allen wrench set"
        ],
        "troubleshooting_steps": [
            "Record alarm details and tool position",
            "Verify all ATC sensors are functioning",
            "Check pneumatic/hydraulic pressure",
            "Inspect gripper fingers and arm alignment",
            "Verify tool holder seats are clean",
            "Check magazine indexing accuracy"
        ],
        "parts_commonly_replaced": [
            "Gripper fingers",
            "Proximity sensors",
            "Pneumatic cylinders",
            "Tool change arm bearings",
            "Draw bar springs"
        ]
    },
    "OVERTRAVEL": {
        "skill_level": "OPERATOR",
        "estimated_time": "10-30 min",
        "safety_precautions": [
            "Do not force axis past limit switches",
            "Verify workholding and fixtures are clear",
            "Check for collision before jogging",
            "Use reduced jog speed when recovering",
            "Verify tool length offsets are correct"
        ],
        "required_tools": [
            "Limit switch test equipment",
            "Dial indicator for position verification",
            "Reference manual for limit settings"
        ],
        "troubleshooting_steps": [
            "Identify which axis triggered overtravel",
            "Jog axis away from limit in opposite direction",
            "Verify limit switch operation",
            "Check for stuck limit switch",
            "Review program for excessive travel commands",
            "Verify work coordinates are correct"
        ],
        "parts_commonly_replaced": [
            "Limit switches",
            "Limit switch wiring",
            "Switch actuators"
        ]
    },
    "PROGRAM": {
        "skill_level": "OPERATOR",
        "estimated_time": "15-45 min",
        "safety_precautions": [
            "Verify program in single block before running",
            "Check tool offsets and work coordinates",
            "Ensure correct program is loaded",
            "Review program changes before saving",
            "Backup original program before editing"
        ],
        "required_tools": [
            "Program editor",
            "G-code verification software",
            "Reference manual for G/M codes",
            "Calculator for coordinate verification"
        ],
        "troubleshooting_steps": [
            "Review error message and line number",
            "Check syntax at indicated block",
            "Verify G/M code compatibility with controller",
            "Check for missing or incorrect data",
            "Verify tool and offset numbers exist",
            "Test in dry run mode"
        ],
        "parts_commonly_replaced": []
    },
    "SYSTEM": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "30-120 min",
        "safety_precautions": [
            "Back up all parameters before changes",
            "Document all error codes",
            "Ensure proper shutdown procedure",
            "Check battery voltage before memory clear",
            "Verify no personnel in work envelope"
        ],
        "required_tools": [
            "Diagnostic software",
            "Backup media",
            "Multimeter",
            "Laptop with service software",
            "Parameter printout"
        ],
        "troubleshooting_steps": [
            "Record all error codes and parameters",
            "Check system battery voltage",
            "Verify all connections are secure",
            "Review recent parameter changes",
            "Check for overheating conditions",
            "Power cycle if safe to do so"
        ],
        "parts_commonly_replaced": [
            "Control board",
            "Power supply",
            "Battery",
            "Cooling fan",
            "Memory module"
        ]
    },
    "SAFETY": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "30-60 min",
        "safety_precautions": [
            "DO NOT bypass safety systems",
            "Verify all safety devices function correctly",
            "Test E-STOP from all stations",
            "Document all safety system changes",
            "Follow OSHA/local safety regulations"
        ],
        "required_tools": [
            "Safety relay tester",
            "Door interlock tester",
            "Light curtain alignment tool",
            "Safety system diagnostic software"
        ],
        "troubleshooting_steps": [
            "Identify which safety device triggered",
            "Verify door/guard interlocks are engaged",
            "Check E-STOP circuit continuity",
            "Test safety relay operation",
            "Verify light curtain alignment",
            "Check safety mat connections"
        ],
        "parts_commonly_replaced": [
            "Safety relays",
            "Door interlock switches",
            "E-STOP buttons",
            "Light curtain sensors",
            "Safety mats"
        ]
    },
    "COMMUNICATION": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "20-60 min",
        "safety_precautions": [
            "Document network settings before changes",
            "Backup communication parameters",
            "Verify cable routing away from power lines",
            "Use shielded cables in noisy environments"
        ],
        "required_tools": [
            "Network cable tester",
            "RS232/422/485 breakout box",
            "Oscilloscope for signal analysis",
            "Protocol analyzer"
        ],
        "troubleshooting_steps": [
            "Verify cable connections at both ends",
            "Check communication parameter settings",
            "Test with different cable",
            "Verify baud rate and protocol match",
            "Check for electrical noise interference",
            "Test direct connection eliminating switches"
        ],
        "parts_commonly_replaced": [
            "Communication cables",
            "Serial port interface",
            "Network interface card",
            "Communication modules"
        ]
    },
    "ENCODER": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "45-90 min",
        "safety_precautions": [
            "LOCKOUT/TAGOUT before encoder service",
            "Do not drop or impact encoder",
            "Handle encoder coupling carefully",
            "Verify axis cannot move during service",
            "Mark encoder position before removal"
        ],
        "required_tools": [
            "Oscilloscope",
            "Encoder test equipment",
            "Alignment tools",
            "Torque wrench",
            "Dial indicator"
        ],
        "troubleshooting_steps": [
            "Check encoder cable continuity",
            "Verify encoder signal levels",
            "Inspect encoder for contamination",
            "Check encoder mounting and coupling",
            "Measure encoder supply voltage",
            "Test with known good encoder if available"
        ],
        "parts_commonly_replaced": [
            "Rotary encoder",
            "Linear scale",
            "Encoder cable",
            "Encoder coupling",
            "Scale reader head"
        ]
    },
    "HYDRAULIC": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "30-90 min",
        "safety_precautions": [
            "Relieve hydraulic pressure before service",
            "Wear safety glasses and gloves",
            "Clean up any hydraulic fluid spills immediately",
            "Do not search for leaks with hands",
            "Dispose of hydraulic fluid properly"
        ],
        "required_tools": [
            "Hydraulic pressure gauge",
            "Temperature probe",
            "Hydraulic fluid test kit",
            "Leak detection equipment"
        ],
        "troubleshooting_steps": [
            "Check hydraulic fluid level",
            "Verify hydraulic pressure",
            "Check for leaks in lines and fittings",
            "Inspect hydraulic filter condition",
            "Check pump operation",
            "Verify solenoid valve operation"
        ],
        "parts_commonly_replaced": [
            "Hydraulic pump",
            "Hydraulic filter",
            "Solenoid valves",
            "Hydraulic hoses",
            "Seals and O-rings"
        ]
    },
    "LUBRICATION": {
        "skill_level": "OPERATOR",
        "estimated_time": "15-45 min",
        "safety_precautions": [
            "Use correct lubricant type",
            "Clean fill port before adding lubricant",
            "Do not overfill reservoir",
            "Clean up any lubricant spills",
            "Wear gloves when handling lubricants"
        ],
        "required_tools": [
            "Lubricant dispenser",
            "Level gauge",
            "Filter wrench",
            "Grease gun"
        ],
        "troubleshooting_steps": [
            "Check lubricant reservoir level",
            "Verify pump operation",
            "Check distribution lines for blockage",
            "Inspect filter condition",
            "Verify lubrication intervals",
            "Check pressure switch operation"
        ],
        "parts_commonly_replaced": [
            "Lubrication pump",
            "Distribution block",
            "Tubing and fittings",
            "Filter elements",
            "Pressure switches"
        ]
    },
    "COOLANT": {
        "skill_level": "OPERATOR",
        "estimated_time": "15-30 min",
        "safety_precautions": [
            "Wear gloves and eye protection",
            "Maintain proper coolant concentration",
            "Clean up coolant spills immediately",
            "Dispose of coolant per regulations",
            "Check for bacteria/fungus growth"
        ],
        "required_tools": [
            "Refractometer",
            "pH test strips",
            "Coolant concentration tester",
            "Pressure gauge"
        ],
        "troubleshooting_steps": [
            "Check coolant level in tank",
            "Verify coolant pump operation",
            "Check coolant filter/strainer",
            "Verify nozzle flow and direction",
            "Test coolant concentration",
            "Check for coolant leaks"
        ],
        "parts_commonly_replaced": [
            "Coolant pump",
            "Coolant filter",
            "Nozzles and lines",
            "Level sensors",
            "Coolant tank"
        ]
    },
    "TEMPERATURE": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "30-60 min",
        "safety_precautions": [
            "Allow components to cool before handling",
            "Check ambient temperature conditions",
            "Verify cooling system operation first",
            "Do not block cooling air flow",
            "Use thermal camera safely"
        ],
        "required_tools": [
            "Thermal camera",
            "Digital thermometer",
            "Airflow meter",
            "Temperature data logger"
        ],
        "troubleshooting_steps": [
            "Measure component temperatures",
            "Check cooling fan operation",
            "Verify air filter condition",
            "Check chiller operation (if equipped)",
            "Verify ambient temperature is within spec",
            "Look for blocked ventilation"
        ],
        "parts_commonly_replaced": [
            "Cooling fans",
            "Heat exchangers",
            "Air filters",
            "Thermal sensors",
            "Chiller components"
        ]
    },
    "AXIS": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "30-90 min",
        "safety_precautions": [
            "LOCKOUT/TAGOUT before axis service",
            "Block axis from unexpected movement",
            "Verify all personnel clear of work envelope",
            "Support heavy components during removal",
            "Use proper lifting techniques"
        ],
        "required_tools": [
            "Dial indicator",
            "Laser alignment system",
            "Ballbar test equipment",
            "Torque wrench",
            "Precision levels"
        ],
        "troubleshooting_steps": [
            "Check for mechanical binding",
            "Verify ballscrew condition",
            "Check linear guide lubrication",
            "Measure axis backlash",
            "Verify servo motor operation",
            "Check coupling tightness"
        ],
        "parts_commonly_replaced": [
            "Ballscrew assembly",
            "Linear guides",
            "Way wipers",
            "Axis coupling",
            "Ballscrew support bearings"
        ]
    },
    "PLC": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "30-90 min",
        "safety_precautions": [
            "Back up PLC program before changes",
            "Document all I/O states",
            "Use proper ESD precautions",
            "Verify PLC mode before editing",
            "Test changes thoroughly before production"
        ],
        "required_tools": [
            "PLC programming software",
            "I/O test equipment",
            "Signal tracer",
            "PLC diagnostic cable"
        ],
        "troubleshooting_steps": [
            "Check PLC status indicators",
            "Monitor I/O states",
            "Review PLC fault history",
            "Check PLC power supply",
            "Verify communication with NC",
            "Review ladder logic for issues"
        ],
        "parts_commonly_replaced": [
            "I/O modules",
            "PLC CPU",
            "Power supply",
            "Communication modules",
            "Battery backup"
        ]
    },
    "MEMORY": {
        "skill_level": "SERVICE_ENGINEER",
        "estimated_time": "30-60 min",
        "safety_precautions": [
            "Back up all data before service",
            "Use ESD protection",
            "Document all parameter settings",
            "Verify battery status",
            "Have spare battery ready"
        ],
        "required_tools": [
            "Memory card reader",
            "Backup software",
            "ESD wrist strap",
            "Memory test equipment"
        ],
        "troubleshooting_steps": [
            "Back up all programs and parameters",
            "Check memory card seating",
            "Verify battery voltage",
            "Run memory diagnostic",
            "Check for corrupted files",
            "Clear memory and reload if needed"
        ],
        "parts_commonly_replaced": [
            "Memory card",
            "Battery",
            "Memory module",
            "Control board"
        ]
    }
}

# Default template for unmapped categories
DEFAULT_TEMPLATE = {
    "skill_level": "SERVICE_ENGINEER",
    "estimated_time": "30-60 min",
    "safety_precautions": [
        "Follow machine safety protocols",
        "LOCKOUT/TAGOUT as required",
        "Wear appropriate PPE",
        "Document all changes made"
    ],
    "required_tools": [
        "Digital multimeter",
        "Service manual",
        "Diagnostic software",
        "Basic hand tools"
    ],
    "troubleshooting_steps": [
        "Record alarm code and conditions",
        "Review alarm description",
        "Check related components",
        "Consult service manual",
        "Contact manufacturer if needed"
    ],
    "parts_commonly_replaced": [
        "Consult service manual"
    ]
}

# Verification steps (common to all)
VERIFICATION_STEPS = [
    "Clear alarm and verify it does not return",
    "Test machine operation in manual mode",
    "Run test program in single block",
    "Verify normal operation under load",
    "Document repairs and parts replaced"
]

def get_template_for_category(category):
    """Get the appropriate fix procedure template for an alarm category."""
    category_upper = category.upper() if category else "UNKNOWN"
    
    # Map category to template
    category_map = {
        "SERVO": "SERVO",
        "SPINDLE": "SPINDLE",
        "ATC": "ATC",
        "TOOL_CHANGER": "ATC",
        "TOOL_CHANGE": "ATC",
        "MAGAZINE": "ATC",
        "OVERTRAVEL": "OVERTRAVEL",
        "PROGRAM": "PROGRAM",
        "SYNTAX": "PROGRAM",
        "SYSTEM": "SYSTEM",
        "SAFETY": "SAFETY",
        "E-STOP": "SAFETY",
        "EMERGENCY": "SAFETY",
        "DOOR": "SAFETY",
        "INTERLOCK": "SAFETY",
        "COMMUNICATION": "COMMUNICATION",
        "NETWORK": "COMMUNICATION",
        "ETHERNET": "COMMUNICATION",
        "SERIAL": "COMMUNICATION",
        "ENCODER": "ENCODER",
        "SCALE": "ENCODER",
        "HYDRAULIC": "HYDRAULIC",
        "LUBRICATION": "LUBRICATION",
        "OIL": "LUBRICATION",
        "COOLANT": "COOLANT",
        "TEMPERATURE": "TEMPERATURE",
        "THERMAL": "TEMPERATURE",
        "OVERTEMP": "TEMPERATURE",
        "OVERHEAT": "TEMPERATURE",
        "AXIS": "AXIS",
        "PLC": "PLC",
        "LADDER": "PLC",
        "I/O": "PLC",
        "MEMORY": "MEMORY",
        "BATTERY": "MEMORY",
        "RAM": "MEMORY",
        "ROM": "MEMORY"
    }
    
    template_key = category_map.get(category_upper, None)
    
    # Also check partial matches
    if not template_key:
        for key, value in category_map.items():
            if key in category_upper:
                template_key = value
                break
    
    return FIX_TEMPLATES.get(template_key, DEFAULT_TEMPLATE)

def get_related_alarms(alarm, all_alarms, family):
    """Find related alarms based on category and code patterns."""
    related = []
    code = alarm.get("code", "")
    category = alarm.get("category", "")
    
    # Find alarms in same category with similar codes
    for other in all_alarms:
        if other.get("family") != family:
            continue
        other_code = other.get("code", "")
        other_category = other.get("category", "")
        
        # Skip self
        if other_code == code:
            continue
            
        # Same category
        if other_category == category:
            # Sequential codes
            try:
                code_num = int(''.join(filter(str.isdigit, code)))
                other_num = int(''.join(filter(str.isdigit, other_code)))
                if abs(code_num - other_num) <= 5:
                    related.append(other_code)
            except:
                pass
        
        # Limit to 5 related alarms
        if len(related) >= 5:
            break
    
    return related[:5]

def enhance_alarm_with_fix_procedure(alarm, all_alarms):
    """Add fix procedure to a single alarm."""
    # Skip if already has fix_procedure
    if "fix_procedure" in alarm:
        return alarm
    
    category = alarm.get("category", "SYSTEM")
    family = alarm.get("family", "UNKNOWN")
    severity = alarm.get("severity", "MEDIUM")
    
    # Get appropriate template
    template = get_template_for_category(category)
    
    # Adjust skill level based on severity
    skill_level = template["skill_level"]
    if severity in ["LOW", "INFO"]:
        skill_level = "OPERATOR"
    elif severity == "CRITICAL":
        skill_level = "SERVICE_ENGINEER"
    
    # Build detailed troubleshooting based on alarm specifics
    detailed = []
    name = alarm.get("name", "").upper()
    description = alarm.get("description", "")
    causes = alarm.get("causes", [])
    
    # Add cause-specific troubleshooting
    for cause in causes[:3]:
        detailed.append(f"Check: {cause}")
    
    # Add generic category-specific steps
    detailed.extend([
        f"Review {category} system documentation",
        "Check all related connections",
        "Verify system parameters",
        "Contact service if issue persists"
    ])
    
    # Create fix procedure
    fix_procedure = {
        "skill_level": skill_level,
        "estimated_time": template["estimated_time"],
        "safety_precautions": template["safety_precautions"].copy(),
        "required_tools": template["required_tools"].copy(),
        "troubleshooting_steps": template["troubleshooting_steps"].copy(),
        "detailed_troubleshooting": detailed,
        "parts_commonly_replaced": template["parts_commonly_replaced"].copy(),
        "verification_steps": VERIFICATION_STEPS.copy()
    }
    
    # Add fix procedure to alarm
    alarm["fix_procedure"] = fix_procedure
    
    # Add related alarms
    alarm["related_alarms"] = get_related_alarms(alarm, all_alarms, family)
    
    return alarm

def main():
    print("=" * 70)
    print("PRISM Alarm Database - Fix Procedure Enhancement")
    print("=" * 70)
    
    # Load database
    print(f"\nLoading database from: {DB_PATH}")
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    alarms = db.get("alarms", [])
    total_alarms = len(alarms)
    print(f"Total alarms in database: {total_alarms}")
    
    # Count alarms needing fix procedures
    needs_fix = [a for a in alarms if "fix_procedure" not in a]
    already_has = total_alarms - len(needs_fix)
    print(f"Already have fix procedures: {already_has}")
    print(f"Need fix procedures: {len(needs_fix)}")
    
    # Track by family
    by_family = {}
    for alarm in needs_fix:
        family = alarm.get("family", "UNKNOWN")
        by_family[family] = by_family.get(family, 0) + 1
    
    print("\nBy family needing enhancement:")
    for family, count in sorted(by_family.items()):
        print(f"  {family}: {count}")
    
    # Enhance all alarms
    print(f"\nEnhancing {len(needs_fix)} alarms...")
    enhanced_count = 0
    
    for i, alarm in enumerate(alarms):
        if "fix_procedure" not in alarm:
            enhance_alarm_with_fix_procedure(alarm, alarms)
            enhanced_count += 1
            
            # Progress indicator every 100
            if enhanced_count % 100 == 0:
                print(f"  Progress: {enhanced_count}/{len(needs_fix)}")
    
    print(f"\nEnhanced {enhanced_count} alarms with fix procedures")
    
    # Update metadata
    db["metadata"]["fix_procedures_version"] = "2.0.0-COMPLETE"
    db["metadata"]["fix_procedures_complete"] = {
        "date": datetime.now().isoformat(),
        "alarms_enhanced": enhanced_count,
        "total_with_procedures": total_alarms,
        "coverage_rate": "100%"
    }
    
    # Save updated database
    print(f"\nSaving enhanced database...")
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)
    
    print(f"✓ Database saved to: {DB_PATH}")
    
    # Final statistics
    print("\n" + "=" * 70)
    print("FIX PROCEDURE ENHANCEMENT COMPLETE")
    print("=" * 70)
    print(f"Total alarms: {total_alarms}")
    print(f"Now with fix procedures: {total_alarms}")
    print(f"Coverage: 100%")
    print(f"Categories covered: {len(FIX_TEMPLATES)}")
    print("=" * 70)

if __name__ == "__main__":
    main()
