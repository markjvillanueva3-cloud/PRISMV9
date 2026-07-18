#!/usr/bin/env python3
"""
PRISM Alarm Database - Fix Procedures Enhancement Phase 2
Target: ALL remaining families (SIEMENS, MAZAK, OKUMA, HAAS, HEIDENHAIN, 
        MITSUBISHI, BROTHER, DMG_MORI, HURCO, DOOSAN, FAGOR)
"""

import json
import os
from datetime import datetime

BASE_PATH = r"C:\\PRISM\EXTRACTED\controllers"
MASTER_DB = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")

# Universal fix templates by category
FIX_TEMPLATES = {
    "SYSTEM": {
        "skill_level": "SERVICE_ENGINEER", "estimated_time": "30-60 min",
        "safety_precautions": ["Ensure machine is in safe state", "Back up all parameters", "Verify no personnel in envelope"],
        "required_tools": ["Laptop with diagnostic software", "Backup media", "Multimeter"],
        "general_steps": ["Record error codes", "Check battery voltage", "Verify connections", "Review parameters", "Power cycle if safe"]
    },
    "SERVO": {
        "skill_level": "TECHNICIAN", "estimated_time": "45-90 min",
        "safety_precautions": ["Lock out/tag out", "Discharge capacitors", "Verify axis is secure"],
        "required_tools": ["Multimeter", "Oscilloscope", "Servo tuning software"],
        "general_steps": ["Check amplifier LEDs", "Verify encoder connections", "Measure motor resistance", "Check mechanical binding"]
    },
    "SPINDLE": {
        "skill_level": "TECHNICIAN", "estimated_time": "30-60 min",
        "safety_precautions": ["Ensure spindle stopped", "Lock out power", "Check belt/coupling"],
        "required_tools": ["Tachometer", "Vibration analyzer", "Multimeter", "Belt tension gauge"],
        "general_steps": ["Check drive LEDs", "Verify encoder signals", "Check belt tension", "Measure temperature"]
    },
    "PROGRAM": {
        "skill_level": "OPERATOR", "estimated_time": "15-30 min",
        "safety_precautions": ["Verify in single block", "Check offsets", "Ensure correct program"],
        "required_tools": ["Program editor", "Reference manual"],
        "general_steps": ["Review error line", "Check syntax", "Verify G/M codes", "Test in dry run"]
    },
    "OVERTRAVEL": {
        "skill_level": "OPERATOR", "estimated_time": "10-20 min",
        "safety_precautions": ["Move axis slowly", "Verify limits", "Check for obstructions"],
        "required_tools": ["MPG", "Reference manual"],
        "general_steps": ["Identify axis", "Use overtravel release", "Jog away from limit", "Check program coordinates"]
    },
    "ATC": {
        "skill_level": "TECHNICIAN", "estimated_time": "30-60 min",
        "safety_precautions": ["Ensure spindle empty", "Keep hands clear", "Verify air pressure"],
        "required_tools": ["Diagnostic mode", "Air pressure gauge", "Lubricant"],
        "general_steps": ["Check position sensors", "Verify magazine alignment", "Check gripper", "Verify clamp cylinders"]
    },
    "SAFETY": {
        "skill_level": "SERVICE_ENGINEER", "estimated_time": "30-90 min",
        "safety_precautions": ["Do not bypass safety", "Verify functions after repair", "Document changes"],
        "required_tools": ["Safety diagnostic tools", "Multimeter", "Door switch tester"],
        "general_steps": ["Check E-stop circuit", "Verify door interlocks", "Test safety relays", "Check light curtains"]
    },
    "ENCODER": {
        "skill_level": "TECHNICIAN", "estimated_time": "45-90 min",
        "safety_precautions": ["Lock out axis", "Handle cables carefully", "Avoid static"],
        "required_tools": ["Oscilloscope", "Encoder tester", "Multimeter"],
        "general_steps": ["Check cable connections", "Verify signals", "Check for damage", "Verify battery voltage"]
    },
    "AXIS": {
        "skill_level": "TECHNICIAN", "estimated_time": "30-60 min",
        "safety_precautions": ["Secure axis mechanically", "Verify no personnel in path"],
        "required_tools": ["Dial indicator", "Laser alignment", "Multimeter", "MPG"],
        "general_steps": ["Check mechanical binding", "Verify ball screw", "Check servo status", "Verify encoder"]
    },
    "COMMUNICATION": {
        "skill_level": "TECHNICIAN", "estimated_time": "20-45 min",
        "safety_precautions": ["Do not disconnect while powered", "Verify settings", "Back up parameters"],
        "required_tools": ["Network tester", "RS232 breakout", "Laptop"],
        "general_steps": ["Check cables", "Verify parameters", "Test continuity", "Check for EMI"]
    },
    "OVERHEAT": {
        "skill_level": "TECHNICIAN", "estimated_time": "30-60 min",
        "safety_precautions": ["Allow to cool first", "Verify cooling system", "Check fire hazards"],
        "required_tools": ["IR thermometer", "Multimeter", "Air filter"],
        "general_steps": ["Check fans", "Clean filters", "Verify coolant", "Check ambient temp"]
    },
    "PMC": {
        "skill_level": "SERVICE_ENGINEER", "estimated_time": "45-90 min",
        "safety_precautions": ["Back up program first", "Test in simulation", "Document changes"],
        "required_tools": ["PMC programmer", "Laptop", "Backup media"],
        "general_steps": ["Check PMC status", "Review ladder logic", "Verify I/O", "Check timers/counters"]
    },
    "PLC": {
        "skill_level": "SERVICE_ENGINEER", "estimated_time": "45-90 min",
        "safety_precautions": ["Back up program", "Test carefully", "Document all changes"],
        "required_tools": ["PLC programmer", "Laptop", "Backup media"],
        "general_steps": ["Check PLC status", "Review program logic", "Verify I/O", "Check scan time"]
    },
    "AUXILIARY": {
        "skill_level": "TECHNICIAN", "estimated_time": "20-45 min",
        "safety_precautions": ["Release pressure first", "Check fluid levels", "Wear PPE"],
        "required_tools": ["Pressure gauges", "Multimeter", "Fluid test kit"],
        "general_steps": ["Check fluid levels", "Verify pump", "Check for leaks", "Clean filters"]
    },
    "NC": {
        "skill_level": "TECHNICIAN", "estimated_time": "30-60 min",
        "safety_precautions": ["Back up parameters", "Verify machine state"],
        "required_tools": ["Diagnostic software", "Backup media", "Reference manual"],
        "general_steps": ["Check NC status", "Review error details", "Verify parameters", "Check memory"]
    },
    "PROBE": {
        "skill_level": "TECHNICIAN", "estimated_time": "30-45 min",
        "safety_precautions": ["Verify probe retracted", "Check stylus condition"],
        "required_tools": ["Probe calibration kit", "Multimeter", "Cleaning supplies"],
        "general_steps": ["Check probe battery", "Verify signal", "Calibrate if needed", "Check stylus"]
    },
    "LATHE": {
        "skill_level": "TECHNICIAN", "estimated_time": "30-60 min",
        "safety_precautions": ["Ensure chuck is clear", "Verify no material in spindle"],
        "required_tools": ["Dial indicator", "Multimeter", "Lathe diagnostic tools"],
        "general_steps": ["Check turret position", "Verify tailstock", "Check chuck operation", "Verify spindle"]
    },
    "MACHINE": {
        "skill_level": "TECHNICIAN", "estimated_time": "30-60 min",
        "safety_precautions": ["Machine in safe state", "Verify all guards in place"],
        "required_tools": ["Diagnostic software", "Multimeter", "Reference manual"],
        "general_steps": ["Check machine status", "Review error", "Verify components", "Test operation"]
    },
    "HYDRAULIC": {
        "skill_level": "TECHNICIAN", "estimated_time": "30-60 min",
        "safety_precautions": ["Release pressure", "Wear PPE", "Check for leaks"],
        "required_tools": ["Pressure gauge", "Multimeter", "Fluid test kit"],
        "general_steps": ["Check pressure", "Verify pump", "Check fluid level", "Look for leaks"]
    },
    "PNEUMATIC": {
        "skill_level": "TECHNICIAN", "estimated_time": "20-45 min",
        "safety_precautions": ["Release air pressure", "Verify regulators", "Check moisture"],
        "required_tools": ["Pressure gauge", "Multimeter", "Leak detector"],
        "general_steps": ["Check pressure", "Verify air supply", "Check for leaks", "Clean filters"]
    },
    "LUBRICATION": {
        "skill_level": "OPERATOR", "estimated_time": "15-30 min",
        "safety_precautions": ["Use correct lubricant", "Clean up spills", "Wear PPE"],
        "required_tools": ["Lubricant", "Pressure gauge", "Cleaning supplies"],
        "general_steps": ["Check oil level", "Verify pump", "Check distribution", "Clean filters"]
    },
    "MEMORY": {
        "skill_level": "SERVICE_ENGINEER", "estimated_time": "30-60 min",
        "safety_precautions": ["Back up all data", "Handle cards carefully"],
        "required_tools": ["Backup media", "Memory card reader", "Diagnostic software"],
        "general_steps": ["Check memory status", "Verify data integrity", "Test memory", "Replace if faulty"]
    },
    "PARAMETER": {
        "skill_level": "SERVICE_ENGINEER", "estimated_time": "30-60 min",
        "safety_precautions": ["Back up parameters first", "Document changes"],
        "required_tools": ["Backup media", "Reference manual", "Diagnostic software"],
        "general_steps": ["Review parameter", "Compare to backup", "Verify range", "Restore if needed"]
    },
    "TOOL": {
        "skill_level": "OPERATOR", "estimated_time": "15-30 min",
        "safety_precautions": ["Ensure spindle stopped", "Handle tools carefully"],
        "required_tools": ["Tool presetter", "Cleaning supplies", "Reference manual"],
        "general_steps": ["Check tool condition", "Verify offset", "Check tool holder", "Re-measure if needed"]
    },
    "MILLTURN": {
        "skill_level": "TECHNICIAN", "estimated_time": "30-60 min",
        "safety_precautions": ["Verify both spindles stopped", "Check turret position"],
        "required_tools": ["Diagnostic software", "Multimeter", "Reference manual"],
        "general_steps": ["Check mode status", "Verify axis config", "Check spindle handoff", "Review parameters"]
    }
}

# Controller-specific troubleshooting hints
CONTROLLER_HINTS = {
    "SIEMENS": {
        "diagnostic_tool": "SINUMERIK Operate / STEP 7",
        "common_issues": ["NC/PLC communication", "Drive optimization", "Safety integrated"],
        "reset_procedure": "Press NC RESET or cycle power after clearing fault"
    },
    "MAZAK": {
        "diagnostic_tool": "MAZATROL Maintenance screen",
        "common_issues": ["Conversational programming errors", "ATC magazine indexing", "Turret clamping"],
        "reset_procedure": "Press RESET on control panel, check alarm history"
    },
