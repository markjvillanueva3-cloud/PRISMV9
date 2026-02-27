#!/usr/bin/env python3
"""
PRISM Alarm Database - Phase 5 Expansion
Target: 1,556 → 1,700+ alarms
Focus: FANUC (FSSB/overtravel/heat), SIEMENS (PLC/SRAM/battery), Additional families
Sources: Web research from authoritative manuals
"""

import json
import os
from datetime import datetime

BASE_PATH = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers"

# ============================================================================
# FANUC FSSB/Communication/Overtravel/Heat Alarms
# ============================================================================
FANUC_FSSB_ALARMS = [
    {
        "alarm_id": "ALM-FANUC-460",
        "code": "460",
        "name": "n AXIS: FSSB DISCONNECT",
        "category": "COMMUNICATION",
        "severity": "CRITICAL",
        "description": "FSSB (FANUC Serial Servo Bus) communication disconnected from axis",
        "causes": ["Fiber optic cable damaged", "Amplifier power off", "FSSB board failure", "Loose optical connector"],
        "quick_fix": "Check fiber optic cables, verify amplifier power, reseat optical connectors",
        "requires_power_cycle": True,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-461",
        "code": "461",
        "name": "n AXIS: ILLEGAL AMP INTERFACE",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Illegal amplifier interface detected - amplifier type mismatch",
        "causes": ["Wrong amplifier model", "Parameter mismatch", "Firmware incompatibility"],
        "quick_fix": "Verify amplifier model matches parameters, check axis configuration",
        "requires_power_cycle": True,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-462",
        "code": "462",
        "name": "n AXIS: SEND CNC DATA FAILED",
        "category": "COMMUNICATION",
        "severity": "CRITICAL",
        "description": "Failed to send data from CNC to servo amplifier",
        "causes": ["FSSB communication error", "Amplifier fault", "Noise interference"],
        "quick_fix": "Check FSSB connections, verify grounding, inspect cable routing",
        "requires_power_cycle": True,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-463",
        "code": "463",
        "name": "n AXIS: SEND SLAVE DATA FAILED",
        "category": "COMMUNICATION",
        "severity": "CRITICAL",
        "description": "Failed to send data to slave device on FSSB",
        "causes": ["Slave device not responding", "Communication timeout", "Cable issue"],
        "quick_fix": "Check slave device power and connections, verify FSSB chain",
        "requires_power_cycle": True,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-464",
        "code": "464",
        "name": "n AXIS: WRITE ID DATA FAILED",
        "category": "COMMUNICATION",
        "severity": "HIGH",
        "description": "Failed to write identification data to servo amplifier",
        "causes": ["Amplifier memory error", "Communication issue", "Parameter error"],
        "quick_fix": "Retry after power cycle, may need amplifier replacement if persistent",
        "requires_power_cycle": True,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-465",
        "code": "465",
        "name": "n AXIS: READ ID DATA FAILED",
        "category": "COMMUNICATION",
        "severity": "HIGH",
        "description": "Failed to read identification data from servo amplifier",
        "causes": ["Amplifier ID chip failure", "Communication error", "Connector issue"],
        "quick_fix": "Check connections, power cycle, may need amplifier service",
        "requires_power_cycle": True,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-466",
        "code": "466",
        "name": "n AXIS: MOTOR/AMP COMBINATION",
        "category": "CONFIGURATION",
        "severity": "CRITICAL",
        "description": "Motor and amplifier combination mismatch",
        "causes": ["Wrong motor installed", "Amplifier rating mismatch", "Parameter error"],
        "quick_fix": "Verify motor model matches amplifier rating, check axis parameters",
        "requires_power_cycle": True,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-467",
        "code": "467",
        "name": "n AXIS: ILLEGAL SETTING OF AXIS",
        "category": "CONFIGURATION",
        "severity": "HIGH",
        "description": "Illegal axis setting in parameters",
        "causes": ["Invalid axis number", "Duplicate axis assignment", "Parameter conflict"],
        "quick_fix": "Check axis parameters, verify no duplicate assignments",
        "requires_power_cycle": True,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-468",
        "code": "468",
        "name": "n AXIS: HI HRV SETTING ERROR (AMP)",
        "category": "CONFIGURATION",
        "severity": "HIGH",
        "description": "High-response vector control setting error in amplifier",
        "causes": ["HRV parameter mismatch", "Amplifier not supporting HRV", "Configuration error"],
        "quick_fix": "Verify HRV settings, check amplifier supports high-response mode",
        "requires_power_cycle": True,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-500",
        "code": "500",
        "name": "OVER TRAVEL: +n",
        "category": "OVERTRAVEL",
        "severity": "HIGH",
        "description": "Positive overtravel limit exceeded on axis n",
        "causes": ["Axis moved past software limit", "Hardware limit switch triggered", "Reference position lost"],
        "quick_fix": "Jog axis in negative direction, verify reference position, check limit switches",
        "requires_power_cycle": False,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-501",
        "code": "501",
        "name": "OVER TRAVEL: -n",
        "category": "OVERTRAVEL",
        "severity": "HIGH",
        "description": "Negative overtravel limit exceeded on axis n",
        "causes": ["Axis moved past software limit", "Hardware limit switch triggered", "Reference position lost"],
        "quick_fix": "Jog axis in positive direction, verify reference position, check limit switches",
        "requires_power_cycle": False,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-700",
        "code": "700",
        "name": "OVERHEAT: CONTROL UNIT",
        "category": "THERMAL",
        "severity": "CRITICAL",
        "description": "CNC control unit internal temperature too high",
        "causes": ["Cooling fan failure", "Filter clogged", "Ambient temp high", "Cabinet ventilation blocked"],
        "quick_fix": "Check cooling fans, clean filters, verify cabinet ventilation",
        "requires_power_cycle": False,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-701",
        "code": "701",
        "name": "OVERHEAT: FAN MOTOR",
        "category": "THERMAL",
        "severity": "HIGH",
        "description": "Cooling fan motor overheating or not running",
        "causes": ["Fan motor bearing failure", "Fan blocked", "Fan motor failure"],
        "quick_fix": "Replace cooling fan, check for obstructions",
        "requires_power_cycle": False,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-704",
        "code": "704",
        "name": "OVERHEAT: SPINDLE",
        "category": "THERMAL",
        "severity": "HIGH",
        "description": "Spindle motor or drive overheating",
        "causes": ["Excessive load", "Cooling failure", "Bearing wear", "Ambient temp high"],
        "quick_fix": "Reduce load, check spindle cooling, allow motor to cool",
        "requires_power_cycle": False,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-740",
        "code": "740",
        "name": "RIGID TAP ALARM: EXCESS ERROR",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Rigid tapping position error exceeded during tapping cycle",
        "causes": ["Tap binding", "Spindle encoder error", "Parameter mismatch", "Tool breakage"],
        "quick_fix": "Check tap condition, verify rigid tap parameters, inspect encoder",
        "requires_power_cycle": False,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-750",
        "code": "750",
        "name": "SPINDLE SERIAL LINK START FAULT",
        "category": "COMMUNICATION",
        "severity": "CRITICAL",
        "description": "Serial communication startup with spindle amplifier failed",
        "causes": ["Spindle amplifier not ready", "Communication cable issue", "Amplifier fault"],
        "quick_fix": "Check spindle amplifier power and connections, verify communication cable",
        "requires_power_cycle": True,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-600",
        "code": "600",
        "name": "n AXIS: INV. DC LINK OVER CURRENT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "DC link overcurrent detected in inverter for axis n",
        "causes": ["Motor short circuit", "Amplifier failure", "Excessive load spike"],
        "quick_fix": "Check motor insulation, verify power cables, may need amplifier replacement",
        "requires_power_cycle": True,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-601",
        "code": "601",
        "name": "n AXIS: INV. RADIATOR FAN FAILURE",
        "category": "THERMAL",
        "severity": "HIGH",
        "description": "Inverter radiator cooling fan failure for axis n",
        "causes": ["Fan motor failure", "Fan blocked", "Thermal sensor failure"],
        "quick_fix": "Check and replace cooling fan on amplifier",
        "requires_power_cycle": False,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-602",
        "code": "602",
        "name": "n AXIS: INV. OVERHEAT",
        "category": "THERMAL",
        "severity": "CRITICAL",
        "description": "Inverter/amplifier overheating for axis n",
        "causes": ["Cooling failure", "Excessive duty cycle", "Ambient temp high", "Fan failure"],
        "quick_fix": "Allow amplifier to cool, check cooling system, reduce duty cycle",
        "requires_power_cycle": False,
        "source": "FANUC 0i/0i-Mate Alarm Manual"
    }
]

# ============================================================================
# SIEMENS SINUMERIK 840D PLC/SRAM/Battery Alarms
# ============================================================================
SIEMENS_840D_ALARMS = [
    {
        "alarm_id": "ALM-SIEMENS-2000",
        "code": "2000",
        "name": "PLC CYCLIC TIMEOUT",
        "category": "PLC",
        "severity": "CRITICAL",
        "description": "PLC did not give sign of life within defined time (MD10100)",
        "causes": ["PLC user program loop", "PLC stop", "CPU overload", "Communication failure"],
        "quick_fix": "Analyze ISTACK for PLC error, check monitoring time MD10100, restart control",
        "requires_power_cycle": True,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-2001",
        "code": "2001",
        "name": "PLC RUNNINGUP TIMEOUT",
        "category": "PLC",
        "severity": "CRITICAL",
        "description": "PLC did not complete startup within timeout period",
        "causes": ["PLC program error", "First OB1 cycle too long", "Hardware failure"],
        "quick_fix": "Check PLC startup, adjust PLC_RUNNINGUP_TIMEOUT, verify hardware",
        "requires_power_cycle": True,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-2100",
        "code": "2100",
        "name": "NCK BATTERY PREWARNING",
        "category": "BATTERY",
        "severity": "MEDIUM",
        "description": "NCK battery voltage at prewarning threshold (2.7-2.9V)",
        "causes": ["Battery aging", "Excessive discharge"],
        "quick_fix": "Replace battery within 6 weeks - data still safe but declining",
        "requires_power_cycle": False,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-2101",
        "code": "2101",
        "name": "NCK BATTERY ALARM",
        "category": "BATTERY",
        "severity": "CRITICAL",
        "description": "NCK battery voltage below alarm limit (2.4-2.6V) during operation",
        "causes": ["Battery depleted", "Battery connection issue"],
        "quick_fix": "Replace battery immediately without power interruption to prevent data loss",
        "requires_power_cycle": False,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-2102",
        "code": "2102",
        "name": "NCK BATTERY ALARM AT POWER-UP",
        "category": "BATTERY",
        "severity": "CRITICAL",
        "description": "NCK battery voltage below limit detected at startup - data may be lost",
        "causes": ["Battery depleted during power off", "Battery removed"],
        "quick_fix": "Replace battery, reinitialize system, restore data from backup",
        "requires_power_cycle": True,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-2110",
        "code": "2110",
        "name": "NC MODULE TEMPERATURE",
        "category": "THERMAL",
        "severity": "HIGH",
        "description": "Temperature sensor reached response threshold (60°C)",
        "causes": ["Cooling failure", "Ambient temp high", "Cabinet ventilation blocked"],
        "quick_fix": "Reduce temperature by 7°C to reset, check cooling system",
        "requires_power_cycle": False,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-2120",
        "code": "2120",
        "name": "NC MODULE FAN FAILURE",
        "category": "THERMAL",
        "severity": "HIGH",
        "description": "Fan speed monitoring responded - fan below 7500 rpm",
        "causes": ["Fan motor failure", "Fan blocked", "Fan aging"],
        "quick_fix": "Replace fan/battery module, module may auto-shutdown to prevent damage",
        "requires_power_cycle": False,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-2130",
        "code": "2130",
        "name": "5V/24V ENCODER OR 15V D/A UNDERVOLTAGE",
        "category": "ELECTRICAL",
        "severity": "CRITICAL",
        "description": "Power supply failure to encoder (5V/24V) or D/A converter (±15V)",
        "causes": ["Power supply failure", "Short circuit", "Module failure"],
        "quick_fix": "Check power supply module, verify no short circuits",
        "requires_power_cycle": True,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-2140",
        "code": "2140",
        "name": "SRAM CLEAR FORCED AT NEXT POWER ON",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "Initialization switch set to general reset - SRAM will be cleared",
        "causes": ["Service switch in reset position", "Intentional reset requested"],
        "quick_fix": "Change initialization switch position before restart if reset not intended",
        "requires_power_cycle": False,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-3000",
        "code": "3000",
        "name": "EMERGENCY STOP",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Emergency stop request on NCK/PLC interface DB10 DBX56.1",
        "causes": ["E-stop button pressed", "E-stop cam approached", "Safety relay triggered"],
        "quick_fix": "Remove E-stop cause, acknowledge via DB10 DBX56.2",
        "requires_power_cycle": False,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-4065",
        "code": "4065",
        "name": "SRAM BACKUP USED",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "SRAM inconsistency detected - backup copy used, recent changes lost",
        "causes": ["Backup time exceeded", "Abnormal shutdown", "Battery failure during power off"],
        "quick_fix": "Manually update tool/workpiece data to current machine status",
        "requires_power_cycle": False,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-14820",
        "code": "14820",
        "name": "NEGATIVE MAX SPINDLE SPEED PROGRAMMED",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Negative value programmed for maximum spindle speed with CSS",
        "causes": ["Program error in G96/G97", "Negative S value"],
        "quick_fix": "Correct program to use positive spindle speed value",
        "requires_power_cycle": False,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    },
    {
        "alarm_id": "ALM-SIEMENS-300500",
        "code": "300500",
        "name": "P-RAM EXTENSION ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "Error in P-RAM extension module",
        "causes": ["Memory module failure", "Connection issue", "Hardware fault"],
        "quick_fix": "Check P-RAM module connection, may need replacement",
        "requires_power_cycle": True,
        "source": "SIEMENS SINUMERIK 840D Diagnostics Manual"
    }
]

# ============================================================================
# Additional OKUMA OSP Alarms
# ============================================================================
OKUMA_OSP_ALARMS = [
    {
        "alarm_id": "ALM-OKUMA-A100",
        "code": "A100",
        "name": "DIF OVER - FOLLOW-UP ERROR",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Servo follow-up error exceeded limit",
        "causes": ["Mechanical binding", "Motor failure", "Encoder fault", "Drive issue"],
        "quick_fix": "Check axis mechanics, verify motor and encoder, inspect drive",
        "requires_power_cycle": True,
        "source": "Okuma OSP Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-A721",
        "code": "A721",
        "name": "I/O MAPPING ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "I/O mapping configuration error - often DVD drive issue on GENOS",
        "causes": ["USB/DVD device conflict", "I/O configuration error", "Hardware change"],
        "quick_fix": "Remove USB devices, check I/O configuration, rebuild mapping",
        "requires_power_cycle": True,
        "source": "Okuma Official Blog"
    },
    {
        "alarm_id": "ALM-OKUMA-A-SAFEIO",
        "code": "A-SAFEIO",
        "name": "SAFETY IO LINK ERROR",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Safety I/O communication link error",
        "causes": ["Safety module failure", "Cable disconnection", "Communication timeout"],
        "quick_fix": "Check safety I/O connections, verify safety module operation",
        "requires_power_cycle": True,
        "source": "Okuma OSP Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-A-MCSERR",
        "code": "A-MCSERR",
        "name": "MCS SERIAL LINK ERROR",
        "category": "COMMUNICATION",
        "severity": "CRITICAL",
        "description": "MCS (Motion Control System) serial communication error",
        "causes": ["MCS cable damage", "MCS unit failure", "Noise interference"],
        "quick_fix": "Check MCS communication cables, verify MCS unit power",
        "requires_power_cycle": True,
        "source": "Okuma OSP Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-A-INVFLT",
        "code": "A-INVFLT",
        "name": "INVERTER FAULT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Inverter/drive unit fault detected",
        "causes": ["Drive internal fault", "Overcurrent", "Overvoltage", "Communication error"],
        "quick_fix": "Check drive display for specific alarm, may need drive replacement",
        "requires_power_cycle": True,
        "source": "Okuma OSP Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-A-FANFLT",
        "code": "A-FANFLT",
        "name": "CPU/POWER SUPPLY FAN FAULT",
        "category": "THERMAL",
        "severity": "HIGH",
        "description": "Cooling fan fault on CPU or power supply unit",
        "causes": ["Fan motor failure", "Fan blocked", "Thermal sensor fault"],
        "quick_fix": "Replace faulty fan, clean filter, check for obstructions",
        "requires_power_cycle": False,
        "source": "Okuma OSP Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-A1071",
        "code": "A1071",
        "name": "MEMORY BOARD BATTERY DEPLETED",
        "category": "BATTERY",
        "severity": "HIGH",
        "description": "Backup battery on memory board voltage low",
        "causes": ["Battery aging", "Battery failure"],
        "quick_fix": "Replace memory board battery before data loss occurs",
        "requires_power_cycle": False,
        "source": "Okuma OSP Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-MCS-EXC",
        "code": "MCS-EXC",
        "name": "MCS EXCEPTION PROCESSING",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "MCS encountered exception processing error",
        "causes": ["MCS firmware error", "Hardware fault", "Communication breakdown"],
        "quick_fix": "Power cycle, check MCS unit, may need service",
        "requires_power_cycle": True,
        "source": "Okuma OSP Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-MCS-ENC",
        "code": "MCS-ENC",
        "name": "MCS MAGNETIC ENCODER ALARM",
        "category": "ENCODER",
        "severity": "CRITICAL",
        "description": "MCS detected magnetic encoder fault",
        "causes": ["Encoder contamination", "Encoder failure", "Cable issue", "Magnetic interference"],
        "quick_fix": "Clean encoder, check cables, verify encoder operation",
        "requires_power_cycle": True,
        "source": "Okuma OSP Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-MCS-OVR",
        "code": "MCS-OVR",
        "name": "MCS MOTOR OVER-CURRENT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "MCS detected motor overcurrent condition",
        "causes": ["Motor short", "Mechanical binding", "Drive fault", "Excessive load"],
        "quick_fix": "Check motor insulation, verify axis free movement, reduce load",
        "requires_power_cycle": True,
        "source": "Okuma OSP Alarm Manual"
    }
]

# ============================================================================
# Additional MAZAK Alarms
# ============================================================================
MAZAK_ADDITIONAL_ALARMS = [
    {
        "alarm_id": "ALM-MAZAK-001",
        "code": "001",
        "name": "NC SYSTEM ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "General NC system error - internal fault",
        "causes": ["CPU error", "Memory failure", "Software fault"],
        "quick_fix": "Power cycle, note exact error details for service",
        "requires_power_cycle": True,
        "source": "Mazak Alarm Manual"
    },
    {
        "alarm_id": "ALM-MAZAK-002",
        "code": "002",
        "name": "ROM PARITY ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "ROM memory parity check failed",
        "causes": ["ROM chip failure", "Memory corruption"],
        "quick_fix": "May need ROM replacement or firmware reload",
        "requires_power_cycle": True,
        "source": "Mazak Alarm Manual"
    },
    {
        "alarm_id": "ALM-MAZAK-100",
        "code": "100",
        "name": "ILLEGAL COMMAND",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Illegal or unsupported NC command in program",
        "causes": ["Invalid G/M code", "Wrong format", "Unsupported function"],
        "quick_fix": "Check program syntax, verify command is supported",
        "requires_power_cycle": False,
        "source": "Mazak Alarm Manual"
    },
    {
        "alarm_id": "ALM-MAZAK-101",
        "code": "101",
        "name": "ILLEGAL ADDRESS",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Invalid address letter in program block",
        "causes": ["Typo in program", "Unsupported address", "Wrong format"],
        "quick_fix": "Check address letters in program block",
        "requires_power_cycle": False,
        "source": "Mazak Alarm Manual"
    },
    {
        "alarm_id": "ALM-MAZAK-400",
        "code": "400",
        "name": "ATC SYSTEM ERROR",
        "category": "ATC",
        "severity": "CRITICAL",
        "description": "Automatic tool changer system error",
        "causes": ["ATC mechanism failure", "Sensor error", "Sequence interrupted"],
        "quick_fix": "Check ATC mechanism, verify sensors, may need ATC reset",
        "requires_power_cycle": False,
        "source": "Mazak Alarm Manual"
    },
    {
        "alarm_id": "ALM-MAZAK-401",
        "code": "401",
        "name": "ATC ARM POSITION ERROR",
        "category": "ATC",
        "severity": "HIGH",
        "description": "ATC arm not in correct position",
        "causes": ["Arm motor fault", "Position sensor failure", "Mechanical interference"],
        "quick_fix": "Check arm position sensors, inspect for obstructions",
        "requires_power_cycle": False,
        "source": "Mazak Alarm Manual"
    },
    {
        "alarm_id": "ALM-MAZAK-1000",
        "code": "1000",
        "name": "SERVO SYSTEM ERROR - X",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Servo system error on X axis",
        "causes": ["Drive fault", "Motor issue", "Encoder error", "Communication failure"],
        "quick_fix": "Check X-axis drive display, verify motor and encoder",
        "requires_power_cycle": True,
        "source": "Mazak Alarm Manual"
    },
    {
        "alarm_id": "ALM-MAZAK-1001",
        "code": "1001",
        "name": "SERVO SYSTEM ERROR - Y",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Servo system error on Y axis",
        "causes": ["Drive fault", "Motor issue", "Encoder error", "Communication failure"],
        "quick_fix": "Check Y-axis drive display, verify motor and encoder",
        "requires_power_cycle": True,
        "source": "Mazak Alarm Manual"
    },
    {
        "alarm_id": "ALM-MAZAK-1002",
        "code": "1002",
        "name": "SERVO SYSTEM ERROR - Z",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Servo system error on Z axis",
        "causes": ["Drive fault", "Motor issue", "Encoder error", "Communication failure"],
        "quick_fix": "Check Z-axis drive display, verify motor and encoder",
        "requires_power_cycle": True,
        "source": "Mazak Alarm Manual"
    }
]

def load_master_database():
    master_path = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")
    with open(master_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_master_database(data):
    master_path = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")
    with open(master_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved: {master_path}")

def add_alarms(db, new_alarms, prefix):
    """Add new alarms avoiding duplicates based on alarm_id"""
    existing_ids = {a.get("alarm_id", "") for a in db["alarms"]}
    
    added = 0
    skipped = 0
    
    for alarm in new_alarms:
        if alarm["alarm_id"] not in existing_ids:
            db["alarms"].append(alarm)
            existing_ids.add(alarm["alarm_id"])
            added += 1
        else:
            skipped += 1
    
    return added, skipped

def main():
    print("=" * 60)
    print("PRISM ALARM DATABASE - PHASE 5 EXPANSION")
    print("=" * 60)
    
    db = load_master_database()
    initial_count = len(db["alarms"])
    print(f"Initial alarm count: {initial_count}")
    
    # Add FANUC FSSB/overtravel/heat alarms
    added, skipped = add_alarms(db, FANUC_FSSB_ALARMS, "FANUC")
    print(f"FANUC FSSB/OT/Heat alarms: Added {added}, Skipped {skipped}")
    
    # Add SIEMENS 840D alarms
    added, skipped = add_alarms(db, SIEMENS_840D_ALARMS, "SIEMENS")
    print(f"SIEMENS 840D alarms: Added {added}, Skipped {skipped}")
    
    # Add OKUMA OSP alarms
    added, skipped = add_alarms(db, OKUMA_OSP_ALARMS, "OKUMA")
    print(f"OKUMA OSP alarms: Added {added}, Skipped {skipped}")
    
    # Add MAZAK additional alarms
    added, skipped = add_alarms(db, MAZAK_ADDITIONAL_ALARMS, "MAZAK")
    print(f"MAZAK additional alarms: Added {added}, Skipped {skipped}")
    
    # Update metadata
    final_count = len(db["alarms"])
    db["metadata"]["version"] = "3.3.0-PHASE5"
    db["metadata"]["last_updated"] = datetime.now().isoformat()
    db["metadata"]["total_alarms"] = final_count
    db["metadata"]["expansion_notes"] = "Phase 5 - FANUC FSSB/thermal, SIEMENS PLC/battery, OKUMA OSP, MAZAK expanded"
    
    # Add new sources
    new_sources = [
        "FANUC 0i/0i-Mate Alarm Manual",
        "SIEMENS SINUMERIK 840D Diagnostics Manual",
        "Okuma Official Blog",
        "Mazak System Alarm Manual"
    ]
    for src in new_sources:
        if src not in db["metadata"]["sources"]:
            db["metadata"]["sources"].append(src)
    
    save_master_database(db)
    
    print()
    print("=" * 60)
    print("EXPANSION COMPLETE")
    print("=" * 60)
    print(f"Initial: {initial_count} alarms")
    print(f"Final:   {final_count} alarms")
    print(f"Added:   {final_count - initial_count} new alarms")

if __name__ == "__main__":
    main()
