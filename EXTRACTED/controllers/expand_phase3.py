#!/usr/bin/env python3
"""
PRISM Alarm Database - Phase 3 Expansion
Target: 2000+ alarms from 1,407 current
Sources: Web research from CNCCookbook, HelmanCNC, Practical Machinist, Official Manuals
"""

import json
import os
from datetime import datetime

BASE_PATH = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers"

# ============================================================
# FANUC SERVO ALARMS (400-series) - Deep expansion
# Source: FANUC Series 0/16/18/21 Maintenance Manual, CNCCookbook
# ============================================================
FANUC_SERVO_ALARMS = [
    {
        "alarm_id": "ALM-FAN-SV400",
        "code": "400",
        "name": "SERVO ALARM: n-TH AXIS OVERLOAD",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Axis overload signal is on. Servo motor drawing excessive current due to mechanical load or electrical fault.",
        "causes": ["Mechanical binding", "Ballscrew damage", "Motor bearing failure", "Drive overheating", "Excessive cutting load"],
        "quick_fix": "Check diagnosis display 720-727 for OVL bit. Reduce load or check mechanical system.",
        "requires_power_cycle": True,
        "source": "FANUC_Series0_Maintenance_Manual_B-61395E"
    },
    {
        "alarm_id": "ALM-FAN-SV401",
        "code": "401",
        "name": "SERVO ALARM: n-TH AXIS VRDY OFF",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Servo amplifier READY signal (DRDY) went off unexpectedly. Amplifier lost ready state.",
        "causes": ["Servo amplifier fault", "Power supply issue", "Emergency stop triggered", "Motor wiring problem", "Drive overtemperature"],
        "quick_fix": "Check amplifier LED display. Verify power connections. Reset amplifier.",
        "requires_power_cycle": True,
        "source": "FANUC_Series0_Maintenance_Manual_B-61395E"
    },
    {
        "alarm_id": "ALM-FAN-SV402",
        "code": "402",
        "name": "SERVO ALARM: SV CARD NOT EXIST",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Axis control card is not provided or not detected by system.",
        "causes": ["Missing servo card", "Card not seated properly", "Card connector fault", "Backplane issue"],
        "quick_fix": "Verify servo card installation. Reseat card connections.",
        "requires_power_cycle": True,
        "source": "FANUC_16i_18i_Maintenance_Manual"
    },
    {
        "alarm_id": "ALM-FAN-SV403",
        "code": "403",
        "name": "SERVO ALARM: CARD/SOFT MISMATCH",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Combination of axis control card and servo software is incompatible.",
        "causes": ["Wrong software version", "Incompatible card type", "Software corruption", "Parameter mismatch"],
        "quick_fix": "Verify card type matches software requirements. Reinstall correct software.",
        "requires_power_cycle": True,
        "source": "FANUC_16i_18i_Maintenance_Manual"
    },
    {
        "alarm_id": "ALM-FAN-SV404",
        "code": "404",
        "name": "SERVO ALARM: n-TH AXIS VRDY ON",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Servo amplifier READY signal still on when it should be off. DRDY on even though MCON went off.",
        "causes": ["Amplifier malfunction", "Control signal fault", "Wiring short", "Card communication error"],
        "quick_fix": "Check axis card to servo amplifier connection. Verify wiring integrity.",
        "requires_power_cycle": True,
        "source": "FANUC_Series0_Maintenance_Manual_B-61395E"
    },
    {
        "alarm_id": "ALM-FAN-SV405",
        "code": "405",
        "name": "SERVO ALARM: ZERO POINT RETURN FAULT",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Position control circuit error during reference position return operation.",
        "causes": ["NC system fault", "Servo system fault", "Encoder signal loss", "Reference mark issue"],
        "quick_fix": "Retry reference position return. Check encoder connections.",
        "requires_power_cycle": False,
        "source": "FANUC_Series0_Maintenance_Manual_B-61395E"
    },
    {
        "alarm_id": "ALM-FAN-SV407",
        "code": "407",
        "name": "SERVO ALARM: EXCESS ERROR",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Difference in synchronous axis position deviation exceeded set value.",
        "causes": ["Synchronization loss", "Mechanical misalignment", "Encoder mismatch", "Gantry axis issue"],
        "quick_fix": "Check synchronous axis alignment. Verify encoder counts match.",
        "requires_power_cycle": False,
        "source": "FANUC_16i_18i_Maintenance_Manual"
    },
    {
        "alarm_id": "ALM-FAN-SV409",
        "code": "409",
        "name": "SERVO ALARM: n AXIS TORQUE ALM",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Abnormal servo motor load detected. Motor torque exceeds threshold during operation.",
        "causes": ["Excessive machining load", "Mechanical binding", "Tool collision", "Improper feeds/speeds"],
        "quick_fix": "Reduce cutting parameters. Check for mechanical interference.",
        "requires_power_cycle": False,
        "source": "FANUC_16i_18i_Maintenance_Manual"
    },
    {
        "alarm_id": "ALM-FAN-SV410",
        "code": "410",
        "name": "SERVO ALARM: n-TH AXIS EXCESS ERROR (STOP)",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Position deviation when axis stopped exceeds parameter setting. Following error too large at rest.",
        "causes": ["Encoder feedback loss", "Motor not holding position", "Brake not engaging", "Gravity load on vertical axis"],
        "quick_fix": "Check parameter 1829 (allowable error). Verify brake operation.",
        "requires_power_cycle": False,
        "source": "FANUC_16i_18i_Maintenance_Manual"
    },
    {
        "alarm_id": "ALM-FAN-SV411",
        "code": "411",
        "name": "SERVO ALARM: n-TH AXIS EXCESS ERROR (MOVE)",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Position deviation when axis moving exceeds parameter setting. Following error too large during motion.",
        "causes": ["Excessive feed rate", "Mechanical resistance", "Servo gain too low", "Motor undersized"],
        "quick_fix": "Check parameter 1828 (allowable error). Reduce feed rate.",
        "requires_power_cycle": False,
        "source": "FANUC_16i_18i_Maintenance_Manual"
    },
    {
        "alarm_id": "ALM-FAN-SV413",
        "code": "413",
        "name": "SERVO ALARM: n-TH AXIS LSI OVERFLOW",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Digital servo LSI overflow error. Internal calculation overflow in servo processor.",
        "causes": ["Parameter error", "Software bug", "Electrical noise", "Memory corruption"],
        "quick_fix": "Power cycle. If persistent, check servo parameters and software.",
        "requires_power_cycle": True,
        "source": "FANUC_16i_18i_Maintenance_Manual"
    },
    {
        "alarm_id": "ALM-FAN-SV414",
        "code": "414",
        "name": "SERVO ALARM: n-TH AXIS DETECTION ERROR",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Detection related error - high current, encoder fault, or drive fault detected.",
        "causes": ["Encoder failure", "Motor winding short", "Drive fault", "Cable damage"],
        "quick_fix": "Check diagnosis 200 row 16 for specific error. Replace faulty component.",
        "requires_power_cycle": True,
        "source": "FANUC_Troubleshooting_MROElectric"
    },
    {
        "alarm_id": "ALM-FAN-SV415",
        "code": "415",
        "name": "SERVO ALARM: n-TH AXIS EXCESS SHIFT",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Excessive position shift detected. Axis position drifted beyond acceptable range.",
        "causes": ["Encoder slip", "Reference position lost", "Mechanical backlash", "Coupling failure"],
        "quick_fix": "Re-establish reference position. Check mechanical couplings.",
        "requires_power_cycle": False,
        "source": "FANUC_16i_18i_Maintenance_Manual"
    },
    {
        "alarm_id": "ALM-FAN-SV416",
        "code": "416",
        "name": "SERVO ALARM: n-TH AXIS DISCONNECTION",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Encoder signal disconnection detected. Feedback cable or encoder fault.",
        "causes": ["Encoder cable damaged", "Encoder failure", "Connector loose", "Signal interference"],
        "quick_fix": "Check encoder cable continuity. Verify connector seating.",
        "requires_power_cycle": True,
        "source": "FANUC_16i_18i_Maintenance_Manual"
    },
    {
        "alarm_id": "ALM-FAN-SV417",
        "code": "417",
        "name": "SERVO ALARM: n-TH AXIS PARAMETER INCORRECT",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Servo parameter setting is incorrect or incompatible with hardware.",
        "causes": ["Wrong motor type parameter", "Encoder resolution mismatch", "Gain parameter error", "Battery backup lost"],
        "quick_fix": "Verify servo parameters match motor specifications. Restore from backup.",
        "requires_power_cycle": True,
        "source": "FANUC_16i_18i_Maintenance_Manual"
    },
    {
        "alarm_id": "ALM-FAN-SV420",
        "code": "420",
        "name": "SERVO ALARM: n AXIS SYNC TORQUE",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Synchronous torque alarm on tandem or gantry axis configuration.",
        "causes": ["Master-slave torque imbalance", "Mechanical binding", "Parameter mismatch", "Encoder issue"],
        "quick_fix": "Check tandem axis torque distribution. Verify mechanical alignment.",
        "requires_power_cycle": False,
        "source": "FANUC_16i_18i_Maintenance_Manual"
    },
    {
        "alarm_id": "ALM-FAN-SV430",
        "code": "430",
        "name": "n AXIS: SV. MOTOR OVERHEAT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Servo motor thermal protection activated. Motor temperature exceeded limit.",
        "causes": ["Continuous high load", "Cooling fan failure", "Blocked ventilation", "Motor bearing wear"],
        "quick_fix": "Allow motor to cool. Check cooling system. Reduce duty cycle.",
        "requires_power_cycle": False,
        "source": "FANUC_Oi-mate_Practical_Machinist"
    },
    {
        "alarm_id": "ALM-FAN-SV436",
        "code": "436",
        "name": "n AXIS: SOFTTHERMAL (OVC)",
        "category": "SERVO",
        "severity": "HIGH",
        "description": "Software thermal protection - overcurrent protection activated in digital servo.",
        "causes": ["Sustained high current draw", "Improper servo tuning", "Mechanical load", "Motor fault"],
        "quick_fix": "Check motor current vs rating. Verify servo parameters.",
        "requires_power_cycle": False,
        "source": "FANUC_Oi-mate_Practical_Machinist"
    }
]

# ============================================================
# HAAS ALARMS - Complete 100-200 series
# Source: Haas Maintenance Manual, HelmanCNC, CNCReplacementParts
# ============================================================
HAAS_ALARMS = [
    {
        "alarm_id": "ALM-HAA-101",
        "code": "101",
        "name": "COMM. FAILURE WITH MOCON/MOCON MEMORY FAULT",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "Communication failure between main control and motion control board, or MOCON memory error.",
        "causes": ["MOCON board failure", "Communication cable fault", "Noise interference", "Memory corruption"],
        "quick_fix": "Power cycle. Check MOCON cable connections. May require board replacement.",
        "requires_power_cycle": True,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-102",
        "code": "102",
        "name": "SERVOS OFF",
        "category": "SERVO",
        "severity": "MEDIUM",
        "description": "Servo motors are off. Tool changer disabled, coolant off, spindle stopped.",
        "causes": ["E-Stop pressed", "Door interlock open", "Motor fault", "Power failure", "Safety circuit open"],
        "quick_fix": "Release E-Stop, close doors, verify air pressure, press RESET.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-103",
        "code": "103",
        "name": "X SERVO ERROR TOO LARGE",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "X-axis position error exceeded parameter 9 X-axis Max Error. Cannot follow commanded position.",
        "causes": ["Mechanical binding", "Ballscrew damage", "Encoder fault", "Motor brake engaged", "Collision"],
        "quick_fix": "Lower rapid override to 25%. Jog axis slowly. Check for binding.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-104",
        "code": "104",
        "name": "Y SERVO ERROR TOO LARGE",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Y-axis position error exceeded parameter limit. Servo cannot follow commanded position.",
        "causes": ["Mechanical binding", "Ballscrew damage", "Encoder fault", "Motor brake engaged", "Collision"],
        "quick_fix": "Lower rapid override. Jog axis slowly. Check for mechanical issues.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-105",
        "code": "105",
        "name": "Z SERVO ERROR TOO LARGE",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Z-axis position error exceeded parameter limit. Following error too large.",
        "causes": ["Counterbalance failure", "Mechanical binding", "Encoder fault", "Brake issue", "Collision"],
        "quick_fix": "Check Z counterbalance. Verify brake releases. Jog carefully.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-106",
        "code": "106",
        "name": "A SERVO ERROR TOO LARGE",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "A-axis (rotary) position error exceeded parameter limit.",
        "causes": ["Rotary table binding", "Encoder fault", "Brake not releasing", "Mechanical obstruction"],
        "quick_fix": "Check rotary table clearance. Verify brake operation.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-107",
        "code": "107",
        "name": "EMERGENCY OFF",
        "category": "SAFETY",
        "severity": "HIGH",
        "description": "Emergency stop button was pressed.",
        "causes": ["Operator pressed E-Stop", "E-Stop circuit fault", "Safety relay tripped"],
        "quick_fix": "Release E-Stop button. Reset machine.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-108",
        "code": "108",
        "name": "X SERVO OVERLOAD",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "X-axis servo motor drawing excessive current. Thermal or current overload.",
        "causes": ["Mechanical resistance", "Motor overheating", "Drive fault", "Excessive load"],
        "quick_fix": "Allow motor to cool. Check for mechanical binding. Reduce load.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-109",
        "code": "109",
        "name": "Y SERVO OVERLOAD",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Y-axis servo motor thermal or current overload.",
        "causes": ["Mechanical resistance", "Motor overheating", "Drive fault", "Excessive load"],
        "quick_fix": "Allow motor to cool. Check for mechanical binding.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-110",
        "code": "110",
        "name": "Z SERVO OVERLOAD",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Z-axis servo motor thermal or current overload.",
        "causes": ["Counterbalance issue", "Motor overheating", "Mechanical binding", "Drive fault"],
        "quick_fix": "Check counterbalance. Allow motor to cool.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-111",
        "code": "111",
        "name": "A SERVO OVERLOAD",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "A-axis servo motor thermal or current overload.",
        "causes": ["Rotary table binding", "Motor overheating", "Excessive workpiece weight"],
        "quick_fix": "Check rotary table load. Allow motor to cool.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-112",
        "code": "112",
        "name": "NO INTERRUPT",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "System interrupt not received. Control timing fault.",
        "causes": ["Control board fault", "Software error", "Hardware timing issue"],
        "quick_fix": "Power cycle. May require service call.",
        "requires_power_cycle": True,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-113M",
        "code": "113",
        "name": "SHUTTLE IN FAULT (Mill)",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Side-mount tool changer shuttle did not reach spindle position in time.",
        "causes": ["Shuttle motor fault", "Clutch wear", "Obstruction", "Sensor fault", "Air pressure low"],
        "quick_fix": "Check parameters 62/63. Verify shuttle motor operation. Clear obstruction.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-113L",
        "code": "113",
        "name": "TURRET UNLOCK FAULT (Lathe)",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Lathe turret did not unlock within allowed time.",
        "causes": ["Air pressure low", "Solenoid fault", "Turret mechanism jam", "Sensor issue"],
        "quick_fix": "Check air pressure. Verify turret solenoid. Clear debris.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-114M",
        "code": "114",
        "name": "SHUTTLE OUT FAULT (Mill)",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Side-mount tool changer shuttle did not retract from spindle.",
        "causes": ["Shuttle motor fault", "Clutch wear", "Tool stuck", "Sensor fault"],
        "quick_fix": "Check shuttle motor. Verify tool release. Check clutch.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-114L",
        "code": "114",
        "name": "TURRET LOCK FAULT (Lathe)",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Turret lock timeout - did not lock within Parameter 63 time.",
        "causes": ["Air pressure low", "Clamp switch fault", "Mechanical binding", "Motor coupling"],
        "quick_fix": "Check air pressure. Adjust clamp switch. Check motor coupling.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-115",
        "code": "115",
        "name": "TURRET ROTATE FAULT",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool turret did not start moving or stop at correct position.",
        "causes": ["Motor fault", "Position sensor failure", "Mechanical jam", "Air pressure"],
        "quick_fix": "Check parameters 62/63. Verify turret motor. Check position sensor.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-116",
        "code": "116",
        "name": "SPINDLE ORIENTATION FAULT",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle failed to orient (M19) within allowed time.",
        "causes": ["Encoder fault", "Spindle drive issue", "Belt slip", "Orientation sensor"],
        "quick_fix": "Check spindle encoder. Verify belt tension. Check orient sensor.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-117",
        "code": "117",
        "name": "SPINDLE HIGH GEAR FAULT",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "High gear engagement failed during gear shift.",
        "causes": ["Gear mechanism jam", "Solenoid fault", "Shift fork wear", "Spindle not stopped"],
        "quick_fix": "Stop spindle. Retry gear change. Check solenoid.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-161",
        "code": "161",
        "name": "X DRIVE FAULT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "X-axis servo amplifier detected fault condition (overcurrent, short, internal error).",
        "causes": ["Amplifier fault", "Motor winding short", "Encoder fault", "Overheating"],
        "quick_fix": "Check amplifier LEDs. Verify motor connections. May need replacement.",
        "requires_power_cycle": True,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-162",
        "code": "162",
        "name": "Y DRIVE FAULT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Y-axis servo amplifier detected fault condition.",
        "causes": ["Amplifier fault", "Motor winding short", "Encoder fault", "Overheating"],
        "quick_fix": "Check amplifier LEDs. Verify motor connections.",
        "requires_power_cycle": True,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-163",
        "code": "163",
        "name": "Z DRIVE FAULT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Z-axis servo amplifier detected fault condition.",
        "causes": ["Amplifier fault", "Motor winding short", "Encoder fault", "Overheating"],
        "quick_fix": "Check amplifier LEDs. Verify motor connections.",
        "requires_power_cycle": True,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-164",
        "code": "164",
        "name": "A DRIVE FAULT",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "A-axis servo amplifier detected fault condition.",
        "causes": ["Amplifier fault", "Motor winding short", "Encoder fault", "Overheating"],
        "quick_fix": "Check amplifier LEDs. Verify motor connections.",
        "requires_power_cycle": True,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-186",
        "code": "186",
        "name": "SPINDLE NOT TURNING",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle is not rotating when G99 (feed per revolution) mode active.",
        "causes": ["Spindle drive fault", "Encoder fault", "Belt broken", "Spindle jam"],
        "quick_fix": "Check spindle drive. Verify encoder. Check belt tension.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    },
    {
        "alarm_id": "ALM-HAA-200",
        "code": "200",
        "name": "VD OVER TEMP",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "Vector drive (spindle drive) over temperature alarm.",
        "causes": ["Drive overheating", "Fan failure", "High ambient temp", "Blocked ventilation"],
        "quick_fix": "Check cooling fans. Allow drive to cool. Verify ventilation.",
        "requires_power_cycle": False,
        "source": "Haas_Maintenance_Manual_96-0284"
    }
]

# ============================================================
# MAZAK PLC/CNC ALARMS - 200-400 series
# Source: Mazak INTEGREX Manual, HelmanCNC, Practical Machinist
# ============================================================
MAZAK_ALARMS = [
    {
        "alarm_id": "ALM-MAZ-200",
        "code": "200",
        "name": "LOW HYDRAULIC PRESSURE",
        "category": "HYDRAULIC",
        "severity": "CRITICAL",
        "description": "Hydraulic pressure below minimum threshold detected by compound oil controller.",
        "causes": ["Low oil level", "Pump failure", "Leak in system", "Filter clogged", "Relief valve stuck"],
        "quick_fix": "Check hydraulic oil level. Verify pump operation. Check for leaks.",
        "requires_power_cycle": False,
        "source": "Mazak_FH6000_PLC_Alarm_List"
    },
    {
        "alarm_id": "ALM-MAZ-208",
        "code": "208",
        "name": "LOW SLIDEWAY LUBRICATING OIL LEVEL",
        "category": "LUBRICATION",
        "severity": "HIGH",
        "description": "Slideway lubricating oil level detected low by sensor SL4.",
        "causes": ["Oil reservoir empty", "Level sensor fault", "Leak in system", "Excessive consumption"],
        "quick_fix": "Refill slideway lube oil. Check for leaks. Verify sensor.",
        "requires_power_cycle": False,
        "source": "Mazak_FH6000_PLC_Alarm_List"
    },
    {
        "alarm_id": "ALM-MAZ-212",
        "code": "212",
        "name": "MAGAZINE DRUM MALFUNCTION",
        "category": "ATC",
        "severity": "CRITICAL",
        "description": "ATC magazine drum position error or movement fault.",
        "causes": ["Position encoder lost", "Motor fault", "Brake not released", "Mechanical jam", "MR-J2 parameter lost"],
        "quick_fix": "Check MR-J2 software parameters. Verify drum encoder. Reset ATC.",
        "requires_power_cycle": True,
        "source": "Mazak_Practical_Machinist_Forums"
    },
    {
        "alarm_id": "ALM-MAZ-215",
        "code": "215",
        "name": "CHUCK SYSTEM MALFUNCTION",
        "category": "WORKHOLDING",
        "severity": "CRITICAL",
        "description": "Erroneous chucking action detected during operation.",
        "causes": ["Chuck sensor fault", "Hydraulic pressure issue", "Jaw movement error", "Safety switch triggered"],
        "quick_fix": "Verify chuck sensor. Check hydraulic pressure. Inspect chuck jaws.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-219",
        "code": "219",
        "name": "MAIN TRANSFORMER OVERHEAT",
        "category": "ELECTRICAL",
        "severity": "CRITICAL",
        "description": "Main transformer temperature exceeded 120°C detected by sensor X10.",
        "causes": ["Overloaded transformer", "Cooling fan failure", "High ambient temp", "Short circuit"],
        "quick_fix": "Stop operation. Check cooling. Allow transformer to cool.",
        "requires_power_cycle": True,
        "source": "Mazak_FH6000_PLC_Alarm_List"
    },
    {
        "alarm_id": "ALM-MAZ-220",
        "code": "220",
        "name": "TURRET POSITION SENSOR MALF",
        "category": "ATC",
        "severity": "CRITICAL",
        "description": "Milling head positioning or B-axis encoder signal invalid.",
        "causes": ["Encoder failure", "Cable damage", "Signal interference", "Connector fault"],
        "quick_fix": "Check encoder connections. Verify encoder operation.",
        "requires_power_cycle": True,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-226",
        "code": "226",
        "name": "TOOL BREAKAGE DETECTED",
        "category": "TOOL",
        "severity": "HIGH",
        "description": "Tool breakage detected during tool breakage detection cycle.",
        "causes": ["Broken tool", "Tool pulled out", "Incorrect tool length", "Detection sensor fault"],
        "quick_fix": "Replace broken tool. Update tool offsets. Check detection sensor.",
        "requires_power_cycle": False,
        "source": "Mazak_FH6000_PLC_Alarm_List"
    },
    {
        "alarm_id": "ALM-MAZ-231",
        "code": "231",
        "name": "TOOL EYE POSITION SENSOR MALF",
        "category": "TOOL",
        "severity": "HIGH",
        "description": "Tool eye extension/retraction sensor (SQ7/SQ8) fault. Both sensors ON or neither ON.",
        "causes": ["Sensor failure", "Sensor misalignment", "Cable fault", "Arm stuck"],
        "quick_fix": "Check tool eye sensors SQ7/SQ8. Verify arm movement.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-250",
        "code": "250",
        "name": "SPINDLE START MISOPERATION",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Spindle rotation command given during mis-chucking condition.",
        "causes": ["Chuck not closed", "Chuck sensor fault", "Safety interlock", "Hydraulic issue"],
        "quick_fix": "Close chuck and verify clamping. Check chuck sensor.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-251",
        "code": "251",
        "name": "MILLING MOTOR ROTATION PROHIB",
        "category": "SPINDLE",
        "severity": "HIGH",
        "description": "Milling spindle rotation prohibited due to safety condition.",
        "causes": ["Chuck not closed", "Turret not indexed", "B-axis not clamped", "Safety interlock"],
        "quick_fix": "Verify all interlocks satisfied. Check chuck and turret position.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-258",
        "code": "258",
        "name": "TNo. MISMATCH",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Tool number mismatch after ATC aborted by E-Stop during tool change.",
        "causes": ["E-Stop during tool change", "ATC position lost", "Tool data corruption"],
        "quick_fix": "Manually verify tool in spindle. Update tool register. Reset ATC.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-260",
        "code": "260",
        "name": "SLIDEWAY LUBRICATION ALARM",
        "category": "LUBRICATION",
        "severity": "HIGH",
        "description": "Slideway lubrication pressure switch SP67 did not turn on in time.",
        "causes": ["Low grease level", "Pump failure", "Blocked line", "Pressure switch fault"],
        "quick_fix": "Check grease level. Verify pump operation. Clear blockage.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-279",
        "code": "279",
        "name": "PARTS CATCHER CYCLE EXCEED TIME",
        "category": "AUXILIARY",
        "severity": "MEDIUM",
        "description": "Parts catcher advance/retract did not complete within timeout.",
        "causes": ["Air pressure low", "Cylinder fault", "Sensor fault", "Mechanical jam"],
        "quick_fix": "Check air pressure. Verify cylinder operation. Check sensors.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-300",
        "code": "300",
        "name": "MAGAZINE SHIFTER POS. MALF",
        "category": "ATC",
        "severity": "CRITICAL",
        "description": "ATC magazine shifter position malfunction. Shifter not in expected position.",
        "causes": ["Position sensor fault", "Mechanical jam", "Motor fault", "Reset during tool change"],
        "quick_fix": "Enable RB16 bit 7 brake release. Manually position shifter. Reset ATC.",
        "requires_power_cycle": True,
        "source": "Mazak_Practical_Machinist_Forums"
    },
    {
        "alarm_id": "ALM-MAZ-301",
        "code": "301",
        "name": "TAIL THRUST CHG INHIBIT",
        "category": "TAILSTOCK",
        "severity": "MEDIUM",
        "description": "Tailstock thrust change command given while in pressing position.",
        "causes": ["Tailstock still pressing", "Sequence error", "Sensor fault"],
        "quick_fix": "Retract tailstock before changing thrust setting.",
        "requires_power_cycle": False,
        "source": "Mazak_SmoothX_Parameter_Book"
    },
    {
        "alarm_id": "ALM-MAZ-302",
        "code": "302",
        "name": "ATC ARM DRIVER MALFUNCTION",
        "category": "ATC",
        "severity": "CRITICAL",
        "description": "ATC arm servo driver (MR-J2) fault or parameter loss.",
        "causes": ["MR-J2 parameter lost", "Battery backup failed", "Driver fault", "Encoder lost"],
        "quick_fix": "Restore MR-J2 parameters via Windows software. Replace battery.",
        "requires_power_cycle": True,
        "source": "Mazak_Fusion_Control_Forums"
    },
    {
        "alarm_id": "ALM-MAZ-320",
        "code": "320",
        "name": "TOOL UNCLAMP IMP. (M-SP ROT)",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Milling head unclamping command given during spindle rotation.",
        "causes": ["Spindle still rotating", "Sequence error", "Orientation not complete"],
        "quick_fix": "Stop milling spindle before unclamping.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-321",
        "code": "321",
        "name": "MODE CHANGE IMPOSSIBLE (DURING ATC CYCLE)",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "Attempted mode change while ATC cycle in progress.",
        "causes": ["ATC cycle active", "Operator error", "Sequence issue"],
        "quick_fix": "Wait for ATC cycle to complete before changing mode.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-322",
        "code": "322",
        "name": "RAPID MODE IMP. (ORIGIN RET UNF)",
        "category": "AXIS",
        "severity": "HIGH",
        "description": "Rapid feed mode selected without completing zero point return after power on.",
        "causes": ["Zero return not performed", "Reference position lost", "Machine not homed"],
        "quick_fix": "Perform zero point return (home) operation on all axes.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-327",
        "code": "327",
        "name": "NOT IN ATC START POSITION",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Machine not in correct position for ATC operation.",
        "causes": ["Axes not at tool change position", "Z not retracted", "B-axis not indexed"],
        "quick_fix": "Move axes to proper ATC position. Check D200/D201 for details.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-361",
        "code": "361",
        "name": "TAIL ALARM",
        "category": "TAILSTOCK",
        "severity": "CRITICAL",
        "description": "Tailstock amplifier overload or excessive error. Tailstock moved during spindle rotation.",
        "causes": ["Amplifier overload", "Position error", "Tailstock moved unexpectedly", "Safety violation"],
        "quick_fix": "Stop spindle. Check tailstock position. Verify amplifier status.",
        "requires_power_cycle": True,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-386",
        "code": "386",
        "name": "ATC STOP",
        "category": "ATC",
        "severity": "MEDIUM",
        "description": "ATC STOP menu key pressed - axis movement stopped during ATC.",
        "causes": ["Operator pressed ATC STOP", "Manual intervention"],
        "quick_fix": "Deselect ATC STOP menu. Resume operation.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-MAZ-390",
        "code": "390",
        "name": "TOOL ON INTERFER ALARM",
        "category": "ATC",
        "severity": "HIGH",
        "description": "Attempt to return tool to pocket that already contains another tool.",
        "causes": ["Tool pocket already occupied", "Tool data error", "Double tool assignment"],
        "quick_fix": "Verify tool pocket status. Correct tool table data.",
        "requires_power_cycle": False,
        "source": "Mazak_INTEGREX_Alarm_Manual"
    }
]

# ============================================================
# SIEMENS SINUMERIK 840D ALARMS
# Source: Siemens Diagnostics Manual, HelmanCNC
# ============================================================
SIEMENS_ALARMS = [
    {
        "alarm_id": "ALM-SIE-10600",
        "code": "10600",
        "name": "AUXILIARY FUNCTION DURING THREAD CUTTING ACTIVE",
        "category": "PROGRAM",
        "severity": "MEDIUM",
        "description": "Auxiliary function (M-code) commanded while thread cutting is active.",
        "causes": ["M-code in thread block", "Program error", "Improper modal state"],
        "quick_fix": "Remove M-code from thread cutting block. Restructure program.",
        "requires_power_cycle": False,
        "source": "Siemens_840D_Diagnostics_Manual"
    },
    {
        "alarm_id": "ALM-SIE-10601",
        "code": "10601",
        "name": "ZERO VELOCITY AT BLOCK END DURING THREAD CUTTING",
        "category": "PROGRAM",
        "severity": "HIGH",
        "description": "Feed rate would be zero at end of thread cutting block.",
        "causes": ["Invalid thread parameters", "Feed calculation error", "Zero end velocity"],
        "quick_fix": "Check thread lead and feedrate. Verify thread parameters.",
        "requires_power_cycle": False,
        "source": "Siemens_840D_Diagnostics_Manual"
    },
    {
        "alarm_id": "ALM-SIE-10604",
        "code": "10604",
        "name": "THREAD LEAD INCREASE TOO HIGH",
        "category": "PROGRAM",
        "severity": "HIGH",
        "description": "Variable lead thread pitch increase rate exceeds limit.",
        "causes": ["Excessive lead change", "Invalid thread parameters", "Acceleration limit"],
        "quick_fix": "Reduce lead change rate. Verify thread parameters.",
        "requires_power_cycle": False,
        "source": "Siemens_840D_Diagnostics_Manual"
    },
    {
        "alarm_id": "ALM-SIE-10620",
        "code": "10620",
        "name": "AXIS AT SOFTWARE LIMIT SWITCH",
        "category": "OVERTRAVEL",
        "severity": "CRITICAL",
        "description": "Axis reached software limit switch position during motion.",
        "causes": ["Program overtravel", "Incorrect offset", "Zero point shift error", "Fixture offset wrong"],
        "quick_fix": "Jog axis away from limit. Check program and offsets.",
        "requires_power_cycle": False,
        "source": "Siemens_840D_Diagnostics_Manual"
    },
    {
        "alarm_id": "ALM-SIE-10621",
        "code": "10621",
        "name": "AXIS RESTS ON SOFTWARE LIMIT SWITCH",
        "category": "OVERTRAVEL",
        "severity": "HIGH",
        "description": "Axis is currently at software limit position.",
        "causes": ["Previous overtravel", "Machine left at limit", "Limit position changed"],
        "quick_fix": "Jog axis in opposite direction away from limit.",
        "requires_power_cycle": False,
        "source": "Siemens_840D_Diagnostics_Manual"
    },
    {
        "alarm_id": "ALM-SIE-10630",
        "code": "10630",
        "name": "AXIS AT WORKING AREA LIMIT",
        "category": "OVERTRAVEL",
        "severity": "HIGH",
        "description": "Axis reached programmed working area limit during motion.",
        "causes": ["G25/G26 limit reached", "Working area too small", "Program error"],
        "quick_fix": "Check working area limits (G25/G26). Modify program.",
        "requires_power_cycle": False,
        "source": "Siemens_840D_Diagnostics_Manual"
    },
    {
        "alarm_id": "ALM-SIE-10650",
        "code": "10650",
        "name": "INCORRECT GANTRY MACHINE DATA",
        "category": "AXIS",
        "severity": "CRITICAL",
        "description": "Gantry axis configuration machine data is invalid.",
        "causes": ["Parameter error", "Gantry misconfigured", "Machine data corruption"],
        "quick_fix": "Verify gantry machine data. Restore correct parameters.",
        "requires_power_cycle": True,
        "source": "Siemens_840D_Diagnostics_Manual"
    },
    {
        "alarm_id": "ALM-SIE-10652",
        "code": "10652",
        "name": "GANTRY WARNING THRESHOLD EXCEEDED",
        "category": "AXIS",
        "severity": "HIGH",
        "description": "Position difference between gantry axes exceeded warning level.",
        "causes": ["Mechanical binding", "Uneven load", "Encoder mismatch", "Synchronization drift"],
        "quick_fix": "Check gantry axis alignment. Verify mechanical system.",
        "requires_power_cycle": False,
        "source": "Siemens_840D_Diagnostics_Manual"
    },
    {
        "alarm_id": "ALM-SIE-10653",
        "code": "10653",
        "name": "GANTRY ERROR THRESHOLD EXCEEDED",
        "category": "AXIS",
        "severity": "CRITICAL",
        "description": "Position difference between gantry axes exceeded error limit. Motion stopped.",
        "causes": ["Severe mechanical issue", "Encoder failure", "Collision", "Synchronization lost"],
        "quick_fix": "Stop machine. Check both gantry axes. Re-synchronize.",
        "requires_power_cycle": True,
        "source": "Siemens_840D_Diagnostics_Manual"
    },
    {
        "alarm_id": "ALM-SIE-21610",
        "code": "21610",
        "name": "SPEED SETPOINT LIMITATION ACTIVE",
        "category": "SPINDLE",
        "severity": "MEDIUM",
        "description": "Spindle speed limited to maximum allowed value.",
        "causes": ["Speed exceeds max", "Gear range limit", "Drive limit", "Safety limit active"],
        "quick_fix": "Reduce commanded speed. Check gear range. Verify limits.",
        "requires_power_cycle": False,
        "source": "Siemens_840D_Diagnostics_Manual"
    },
    {
        "alarm_id": "ALM-SIE-201673",
        "code": "201673",
        "name": "SENSOR MODULE SOFTWARE/HARDWARE INCOMPATIBLE",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Sensor module firmware does not match drive software version.",
        "causes": ["Firmware mismatch", "Wrong sensor module", "Software update incomplete"],
        "quick_fix": "Update sensor module firmware. Verify compatibility.",
        "requires_power_cycle": True,
        "source": "Siemens_Practical_Machinist_Forums"
    },
    {
        "alarm_id": "ALM-SIE-201652",
        "code": "201652",
        "name": "SI CU: ILLEGAL MONITORING CLOCK CYCLE",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Safety integrated control unit monitoring cycle time error.",
        "causes": ["Communication timing fault", "Safety module error", "Configuration error"],
        "quick_fix": "Check safety configuration. Verify communication settings.",
        "requires_power_cycle": True,
        "source": "Siemens_Practical_Machinist_Forums"
    },
    {
        "alarm_id": "ALM-SIE-231885",
        "code": "231885",
        "name": "ENCODER 1 CHANNEL A SIGNAL FAULT",
        "category": "ENCODER",
        "severity": "CRITICAL",
        "description": "Encoder channel A signal lost or invalid.",
        "causes": ["Encoder failure", "Cable damage", "Connector fault", "Signal interference"],
        "quick_fix": "Check encoder cable. Verify encoder operation. Replace if needed.",
        "requires_power_cycle": True,
        "source": "Siemens_Practical_Machinist_Forums"
    },
    {
        "alarm_id": "ALM-SIE-4065",
        "code": "4065",
        "name": "SRAM BACKUP USED",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "SRAM backup data loaded instead of current data. Battery backup time exceeded.",
        "causes": ["Battery depleted", "Power outage too long", "SRAM corruption"],
        "quick_fix": "Verify data integrity. Check battery. Save current data.",
        "requires_power_cycle": False,
        "source": "Siemens_828D_Diagnostics_Manual"
    },
    {
        "alarm_id": "ALM-SIE-300500",
        "code": "300500",
        "name": "P-RAM EXTENSION ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "Error in parameter RAM extension module.",
        "causes": ["Memory module fault", "Address error", "Hardware failure"],
        "quick_fix": "Check memory module. May require hardware replacement.",
        "requires_power_cycle": True,
        "source": "Siemens_840D_Diagnostics_Manual"
    }
]

# ============================================================
# OKUMA OSP ALARMS - A/B/C/D/P Types
# Source: Okuma OSP-P300 Alarm List, HelmanCNC, Okuma Blog
# ============================================================
OKUMA_ALARMS = [
    {
        "alarm_id": "ALM-OKU-A100",
        "code": "A100",
        "name": "DIF OVER (AXIS FOLLOW-UP ERROR)",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Follow-up error exceeded permissible range (16384/2 um) three times in succession.",
        "causes": ["Insufficient slideway lubrication", "Collision", "Encoder fault", "Drive unit fault", "Motor failure"],
        "quick_fix": "Check mechanical system. Verify encoder. Check drive unit.",
        "requires_power_cycle": True,
        "source": "Okuma_OSP5020L_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-OKU-A721",
        "code": "A721",
        "name": "I/O MAPPING ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "I/O mapping not properly configured. Often after option installation on GENOS.",
        "causes": ["Missing I/O mapping DVD", "Option not configured", "Poor electrical connections", "Switch settings wrong"],
        "quick_fix": "Install I/O mapping DVD for GENOS. Verify option configuration.",
        "requires_power_cycle": True,
        "source": "Okuma_Official_Blog_Alarm_Codes"
    },
    {
        "alarm_id": "ALM-OKU-A-SAFEIO",
        "code": "A-SAFEIO",
        "name": "SAFETY IO LINK ERROR",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Problem in safety IO link. Shorted solenoid or switch exposed to coolant.",
        "causes": ["Shorted solenoid", "Coolant contamination", "Switch short", "IO board damage"],
        "quick_fix": "Check safety IO components. Look for coolant intrusion. Check error code for location.",
        "requires_power_cycle": True,
        "source": "Okuma_Official_Blog_Alarm_Codes"
    },
    {
        "alarm_id": "ALM-OKU-A-MCSERR",
        "code": "A-MCSERR",
        "name": "MCS SERIAL LINK ERROR",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Discrepancy in MCS system serial link during control boot-up.",
        "causes": ["Faulty drive unit", "Improper controller ID", "Servo cable issue", "Miswiring"],
        "quick_fix": "Check drive unit. Verify controller ID addresses. Check servo cabling.",
        "requires_power_cycle": True,
        "source": "Okuma_Official_Blog_Alarm_Codes"
    },
    {
        "alarm_id": "ALM-OKU-A-INVFLT",
        "code": "A-INVFLT",
        "name": "INVERTER FAULT",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Inverter control board fault, motor overcurrent, voltage issue, or shorted motor.",
        "causes": ["Defective inverter board", "Motor overcurrent", "Low/high voltage", "Shorted motor"],
        "quick_fix": "Check inverter status. Verify motor windings. Check voltage.",
        "requires_power_cycle": True,
        "source": "Okuma_Official_Blog_Alarm_Codes"
    },
    {
        "alarm_id": "ALM-OKU-A-FANFLT",
        "code": "A-FANFLT",
        "name": "CPU/POWER SUPPLY FAN FAULT",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "CPU fan or power supply fan not operating at specified threshold speed.",
        "causes": ["Fan failure", "Fan not connected", "Fan bearing wear", "Panel computer issue"],
        "quick_fix": "Inspect fans visually. Check connections. Replace slow/stopped fan.",
        "requires_power_cycle": False,
        "source": "Okuma_Official_Blog_Alarm_Codes"
    },
    {
        "alarm_id": "ALM-OKU-A1071",
        "code": "A1071",
        "name": "MEMORY BOARD BATTERY DEPLETED",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "Battery backing up memory board is depleted or low.",
        "causes": ["Battery age", "Battery failure", "Excessive power-off time"],
        "quick_fix": "Replace memory board battery. Save parameters first.",
        "requires_power_cycle": True,
        "source": "Okuma_OSP-P300_Alarm_Manual"
    },
    {
        "alarm_id": "ALM-OKU-APASPD",
        "code": "APA-OSPD",
        "name": "APA OVERSPEED ERROR",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "Axis servo overspeed detected by APA system.",
        "causes": ["Runaway axis", "Encoder fault", "Control system error", "Parameter error"],
        "quick_fix": "Stop machine immediately. Check encoder. Verify parameters.",
        "requires_power_cycle": True,
        "source": "Okuma_MX45_IndustryArena_Forums"
    },
    {
        "alarm_id": "ALM-OKU-MCSEXC",
        "code": "MCS-EXC",
        "name": "MCS EXCEPTION PROCESSING ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "MCS system detected exception condition during processing.",
        "causes": ["Software error", "Hardware fault", "Communication error", "Memory corruption"],
        "quick_fix": "Power cycle. If persistent, check MCS hardware and software.",
        "requires_power_cycle": True,
        "source": "Okuma_MX45_IndustryArena_Forums"
    },
    {
        "alarm_id": "ALM-OKU-MCSENC",
        "code": "MCS-ENC",
        "name": "MCS MAGNETIC ENCODER ALARM",
        "category": "ENCODER",
        "severity": "CRITICAL",
        "description": "Magnetic encoder signal error detected by MCS system.",
        "causes": ["Encoder failure", "Cable damage", "Contamination", "Gap too large"],
        "quick_fix": "Check encoder gap. Clean encoder. Verify cable connections.",
        "requires_power_cycle": True,
        "source": "Okuma_MX45_IndustryArena_Forums"
    },
    {
        "alarm_id": "ALM-OKU-MCSOVR",
        "code": "MCS-OVR",
        "name": "MCS MOTOR OVER-CURRENT ALARM",
        "category": "DRIVE",
        "severity": "CRITICAL",
        "description": "Motor over-current detected by MCS drive system.",
        "causes": ["Motor short", "Cable damage", "Drive fault", "Excessive load"],
        "quick_fix": "Check motor windings. Verify cabling. Reduce load.",
        "requires_power_cycle": True,
        "source": "Okuma_MX45_IndustryArena_Forums"
    }
]

def load_existing_database():
    """Load the existing master alarm database."""
    db_path = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")
    if os.path.exists(db_path):
        with open(db_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"alarms": [], "metadata": {}}

def add_alarms_to_database(database, new_alarms, family):
    """Add new alarms to database, avoiding duplicates."""
    existing_ids = {a.get("alarm_id") for a in database.get("alarms", [])}
    added = 0
    skipped = 0
    
    for alarm in new_alarms:
        if alarm["alarm_id"] not in existing_ids:
            alarm["family"] = family
            database["alarms"].append(alarm)
            existing_ids.add(alarm["alarm_id"])
            added += 1
        else:
            skipped += 1
    
    return added, skipped

def main():
    print("="*60)
    print("PRISM ALARM DATABASE - PHASE 3 EXPANSION")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    # Load existing database
    print("Loading existing database...")
    database = load_existing_database()
    initial_count = len(database.get("alarms", []))
    print(f"Initial count: {initial_count} alarms")
    print()
    
    # Add FANUC servo alarms
    print("Adding FANUC servo alarms (400-series)...")
    added, skipped = add_alarms_to_database(database, FANUC_SERVO_ALARMS, "FANUC")
    print(f"  Added: {added}, Skipped: {skipped}")
    
    # Add HAAS alarms
    print("Adding HAAS alarms (100-200 series)...")
    added, skipped = add_alarms_to_database(database, HAAS_ALARMS, "HAAS")
    print(f"  Added: {added}, Skipped: {skipped}")
    
    # Add MAZAK alarms
    print("Adding MAZAK alarms (200-400 series)...")
    added, skipped = add_alarms_to_database(database, MAZAK_ALARMS, "MAZAK")
    print(f"  Added: {added}, Skipped: {skipped}")
    
    # Add SIEMENS alarms
    print("Adding SIEMENS alarms...")
    added, skipped = add_alarms_to_database(database, SIEMENS_ALARMS, "SIEMENS")
    print(f"  Added: {added}, Skipped: {skipped}")
    
    # Add OKUMA alarms
    print("Adding OKUMA alarms...")
    added, skipped = add_alarms_to_database(database, OKUMA_ALARMS, "OKUMA")
    print(f"  Added: {added}, Skipped: {skipped}")
    
    # Update metadata
    final_count = len(database.get("alarms", []))
    database["metadata"] = {
        "version": "3.1.0-PHASE3",
        "last_updated": datetime.now().isoformat(),
        "total_alarms": final_count,
        "expansion_notes": "Phase 3 - Deep servo/drive alarm expansion",
        "sources": [
            "FANUC_Series0_Maintenance_Manual_B-61395E",
            "FANUC_16i_18i_Maintenance_Manual",
            "Haas_Maintenance_Manual_96-0284",
            "Mazak_INTEGREX_Alarm_Manual",
            "Mazak_FH6000_PLC_Alarm_List",
            "Siemens_840D_Diagnostics_Manual",
            "Okuma_OSP-P300_Alarm_Manual",
            "Practical_Machinist_Forums",
            "CNCCookbook_Alarm_List",
            "HelmanCNC_Alarm_Database"
        ]
    }
    
    # Save updated database
    output_path = os.path.join(BASE_PATH, "MASTER_ALARM_DATABASE_v3.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(database, f, indent=2, ensure_ascii=False)
    
    print()
    print("="*60)
    print("EXPANSION COMPLETE")
    print("="*60)
    print(f"Initial: {initial_count} alarms")
    print(f"Final:   {final_count} alarms")
    print(f"Added:   {final_count - initial_count} new alarms")
    print(f"Output:  {output_path}")
    print()
    
    # Count by family
    family_counts = {}
    for alarm in database.get("alarms", []):
        fam = alarm.get("family", "UNKNOWN")
        family_counts[fam] = family_counts.get(fam, 0) + 1
    
    print("BY FAMILY:")
    for fam, count in sorted(family_counts.items(), key=lambda x: -x[1]):
        print(f"  {fam}: {count}")

if __name__ == "__main__":
    main()
