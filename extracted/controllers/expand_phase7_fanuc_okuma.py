#!/usr/bin/env python3
"""
PRISM Phase 7 Expansion: FANUC 900-series + OKUMA Extended
Target: +50 new alarms
"""
import json
from datetime import datetime

# Phase 7 FANUC 900-series System Alarms
PHASE7_FANUC_ALARMS = [
    {
        "alarm_id": "ALM-FANUC-900",
        "code": "900",
        "name": "ROM PARITY",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "ROM parity error - memory corruption detected in firmware ROM",
        "causes": ["ROM chip failure", "Memory corruption", "Hardware fault"],
        "quick_fix": "Cycle power. If persists, ROM may need replacement. Contact service.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-910",
        "code": "910",
        "name": "SRAM PARITY (BYTE 0)",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "SRAM parity error in byte 0 - parameter/program memory corruption",
        "causes": ["SRAM failure", "Low battery", "Power fluctuation"],
        "quick_fix": "Replace battery. Restore parameters from backup. Contact service.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-911",
        "code": "911",
        "name": "SRAM PARITY (BYTE 1)",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "SRAM parity error in byte 1 - parameter/program memory corruption",
        "causes": ["SRAM failure", "Low battery", "Power fluctuation"],
        "quick_fix": "Replace battery. Restore parameters from backup. Contact service.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-912",
        "code": "912",
        "name": "DRAM PARITY (BYTE 0)",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "DRAM parity error in byte 0 - working memory corruption",
        "causes": ["DRAM failure", "Hardware fault", "Overheating"],
        "quick_fix": "Cycle power. Check for overheating. Replace motherboard if persists.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-913",
        "code": "913",
        "name": "DRAM PARITY (BYTE 1)",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "DRAM parity error in byte 1 - working memory corruption",
        "causes": ["DRAM failure", "Hardware fault", "Overheating"],
        "quick_fix": "Cycle power. Check for overheating. Replace motherboard if persists.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-920",
        "code": "920",
        "name": "SERVO ALARM (1-4 AXIS)",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "System-level servo alarm for axes 1-4, watchdog or RAM parity error",
        "causes": ["Servo amp failure", "Communication fault", "Hardware failure"],
        "quick_fix": "Check servo amp LEDs. Verify cables. Check axis control card.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-921",
        "code": "921",
        "name": "SERVO ALARM (5-8 AXIS)",
        "category": "SERVO",
        "severity": "CRITICAL",
        "description": "System-level servo alarm for axes 5-8, watchdog or RAM parity error",
        "causes": ["Servo amp failure", "Communication fault", "Hardware failure"],
        "quick_fix": "Check servo amp LEDs. Verify cables. Check axis control card.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-926",
        "code": "926",
        "name": "FSSB ALARM",
        "category": "COMMUNICATION",
        "severity": "CRITICAL",
        "description": "FSSB (FANUC Serial Servo Bus) communication failure",
        "causes": ["FSSB cable fault", "Servo amp failure", "Axis control card failure"],
        "quick_fix": "Check FSSB cables. Replace axis control card if needed.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-930",
        "code": "930",
        "name": "CPU INTERRUPT",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "CPU abnormal interrupt - processor malfunction",
        "causes": ["CPU failure", "Motherboard fault", "Software crash"],
        "quick_fix": "Cycle power. Motherboard or CPU card may be faulty.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-935",
        "code": "935",
        "name": "SRAM ECC ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "SRAM ECC (Error Correction Code) error in program storage memory",
        "causes": ["SRAM module failure", "Memory corruption"],
        "quick_fix": "Replace SRAM module. Perform all-clear. Reload programs.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-950",
        "code": "950",
        "name": "PMC SYSTEM ALARM",
        "category": "PMC",
        "severity": "CRITICAL",
        "description": "PMC (Programmable Machine Controller) system error",
        "causes": ["PMC control circuit fault", "Ladder logic error", "PMC RAM failure"],
        "quick_fix": "Check PMC diagnostics. Motherboard PMC circuit may be faulty.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-951",
        "code": "951",
        "name": "PMC WATCH DOG ALARM",
        "category": "PMC",
        "severity": "CRITICAL",
        "description": "PMC watchdog timer expired - PMC not executing",
        "causes": ["PMC hung", "Ladder logic infinite loop", "PMC hardware fault"],
        "quick_fix": "Check ladder program. PMC hardware may need replacement.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-970",
        "code": "970",
        "name": "NMI OCCURRED IN PMCLSI",
        "category": "PMC",
        "severity": "CRITICAL",
        "description": "Non-maskable interrupt in PMC LSI - I/O RAM parity error",
        "causes": ["PMC LSI device fault", "I/O RAM parity", "Motherboard fault"],
        "quick_fix": "Replace motherboard PMC section.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-971",
        "code": "971",
        "name": "NMI OCCURRED IN SLC",
        "category": "COMMUNICATION",
        "severity": "CRITICAL",
        "description": "Non-maskable interrupt from I/O Link disconnection (PMC-SA1)",
        "causes": ["I/O Link disconnection", "Cable fault", "I/O module failure"],
        "quick_fix": "Check I/O Link cables and modules.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-972",
        "code": "972",
        "name": "NMI OCCURRED IN OTHER MODULE",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "Non-maskable interrupt from peripheral module",
        "causes": ["Peripheral module fault", "Option card failure"],
        "quick_fix": "Check peripheral modules. Remove options to isolate fault.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-973",
        "code": "973",
        "name": "NON MASK INTERRUPT",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "General non-maskable interrupt detected",
        "causes": ["Hardware fault", "Unknown error source"],
        "quick_fix": "Cycle power. Hardware fault likely.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-974",
        "code": "974",
        "name": "F-BUS ERROR",
        "category": "COMMUNICATION",
        "severity": "CRITICAL",
        "description": "Error on FANUC bus communication",
        "causes": ["FANUC bus fault", "Module communication error", "Hardware failure"],
        "quick_fix": "Check FANUC bus connections. Motherboard may be faulty.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-975",
        "code": "975",
        "name": "BUS ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "General bus error on motherboard",
        "causes": ["Motherboard fault", "Bus communication failure"],
        "quick_fix": "Motherboard may be faulty. Contact service.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
    {
        "alarm_id": "ALM-FANUC-976",
        "code": "976",
        "name": "L-BUS ERROR",
        "category": "SYSTEM",
        "severity": "CRITICAL",
        "description": "Error on local bus communication",
        "causes": ["Local bus fault", "Motherboard failure"],
        "quick_fix": "Motherboard may be faulty. Contact service.",
        "requires_power_cycle": True,
        "source": "FANUC System Alarm Manual"
    },
]

# OKUMA Extended Alarms
PHASE7_OKUMA_ALARMS = [
    {
        "alarm_id": "ALM-OKUMA-0752",
        "code": "0752",
        "name": "VDU COMMUNICATION ERROR",
        "category": "COMMUNICATION",
        "severity": "HIGH",
        "description": "Communication error with VDU (Video Display Unit)",
        "causes": ["Display cable fault", "VDU board failure", "Connector issue"],
        "quick_fix": "Check display cables. Reseat connectors. Replace VDU if needed.",
        "requires_power_cycle": True,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0753",
        "code": "0753",
        "name": "VDU ERROR",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "VDU (Video Display Unit) internal error",
        "causes": ["VDU hardware fault", "Display processor failure"],
        "quick_fix": "Replace VDU unit.",
        "requires_power_cycle": True,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0754",
        "code": "0754",
        "name": "VDU INITIALIZE FAILED",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "VDU failed to initialize during power-on",
        "causes": ["VDU fault", "Firmware issue", "Hardware failure"],
        "quick_fix": "Cycle power. Replace VDU if persists.",
        "requires_power_cycle": True,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0755",
        "code": "0755",
        "name": "SIO LINK ERROR",
        "category": "COMMUNICATION",
        "severity": "HIGH",
        "description": "Serial I/O link communication error",
        "causes": ["SIO cable fault", "Serial interface failure", "Noise interference"],
        "quick_fix": "Check serial cables. Verify baud rates. Shield from noise.",
        "requires_power_cycle": True,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0756",
        "code": "0756",
        "name": "PSC OPTICAL SCALE ENCODER ERROR",
        "category": "ENCODER",
        "severity": "HIGH",
        "description": "PSC optical scale encoder error detected",
        "causes": ["Scale contamination", "Encoder failure", "Cable damage"],
        "quick_fix": "Clean scale. Check encoder cables. Replace if damaged.",
        "requires_power_cycle": False,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0757",
        "code": "0757",
        "name": "MF-SAFETY ERROR",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Machine function safety system error",
        "causes": ["Safety system fault", "Safety circuit failure"],
        "quick_fix": "Check safety circuits. Do not bypass. Contact service.",
        "requires_power_cycle": True,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0758",
        "code": "0758",
        "name": "SAFETY I/O ERROR",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Safety I/O link communication error",
        "causes": ["Shorted solenoid", "Coolant-contaminated switch", "Safety module fault"],
        "quick_fix": "Check safety I/O devices. Look for shorted components.",
        "requires_power_cycle": True,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0759",
        "code": "0759",
        "name": "SAFETY SERVO LINK ERROR",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Safety servo link communication error",
        "causes": ["Servo link cable", "Safety protocol failure", "MCS fault"],
        "quick_fix": "Check servo link cables. Verify MCS settings.",
        "requires_power_cycle": True,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0782",
        "code": "0782",
        "name": "MAGNETIC ENCODER SPEED DETECTION ERROR",
        "category": "ENCODER",
        "severity": "HIGH",
        "description": "Magnetic encoder cannot detect speed properly",
        "causes": ["Encoder fault", "Speed too high", "Signal interference"],
        "quick_fix": "Check encoder. Reduce speed during diagnostics.",
        "requires_power_cycle": False,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0783",
        "code": "0783",
        "name": "MCS ROTARY ENCODER 5 INIT FAILURE",
        "category": "ENCODER",
        "severity": "HIGH",
        "description": "MCS rotary encoder 5 failed initialization",
        "causes": ["Encoder fault", "Cable issue", "MCS setting error"],
        "quick_fix": "Check encoder 5 cable. Verify MCS configuration.",
        "requires_power_cycle": True,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0784",
        "code": "0784",
        "name": "MCS ROTARY ENCODER 5 ERROR",
        "category": "ENCODER",
        "severity": "HIGH",
        "description": "MCS rotary encoder 5 runtime error",
        "causes": ["Encoder failure", "Signal loss", "Contamination"],
        "quick_fix": "Check encoder. Clean and reseat connections.",
        "requires_power_cycle": False,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0808",
        "code": "0808",
        "name": "SPEED CHANGE RATIO FAILURE",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "Speed change ratio for axis is incorrectly set or out of range",
        "causes": ["Parameter error", "Wrong encoder type", "Configuration mismatch"],
        "quick_fix": "Check speed change ratio parameters. Verify encoder type.",
        "requires_power_cycle": True,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-0813",
        "code": "0813",
        "name": "MCS COMMUNICATION ERROR",
        "category": "COMMUNICATION",
        "severity": "CRITICAL",
        "description": "Communication error with MCS (Machine Control System) during power-up",
        "causes": ["Inverter unit fault", "Improper MCS ID", "Wiring error"],
        "quick_fix": "Check MCS LED indicators (22=normal). Verify ID settings.",
        "requires_power_cycle": True,
        "source": "Okuma OSP-P300 Alarm Manual"
    },
    {
        "alarm_id": "ALM-OKUMA-A-INVFLT",
        "code": "A-INVFLT",
        "name": "INVERTER FAULT",
        "category": "ELECTRICAL",
        "severity": "CRITICAL",
        "description": "Inverter fault - defective control board, motor overcurrent, or voltage issue",
        "causes": ["Inverter control board fault", "Motor overcurrent", "Low/high voltage", "Shorted motor"],
        "quick_fix": "Check inverter. Verify motor connections. May need drive replacement.",
        "requires_power_cycle": True,
        "source": "Okuma Official Blog"
    },
    {
        "alarm_id": "ALM-OKUMA-A-721",
        "code": "A-721",
        "name": "I/O MAPPING ERROR",
        "category": "SYSTEM",
        "severity": "HIGH",
        "description": "I/O mapping error - often after option installation",
        "causes": ["Missing I/O mapping software", "Configuration error", "Option DVD not installed"],
        "quick_fix": "Install I/O mapping software DVD. Re-configure options.",
        "requires_power_cycle": True,
        "source": "Okuma Official Blog"
    },
    {
        "alarm_id": "ALM-OKUMA-A-SAFEIO",
        "code": "A-SAFEIO",
        "name": "SAFETY IO LINK ERROR",
        "category": "SAFETY",
        "severity": "CRITICAL",
        "description": "Safety I/O link problem - shorted solenoid or contaminated switch",
        "causes": ["Shorted solenoid", "Coolant contamination", "Switch short"],
        "quick_fix": "Find and repair shorted component. Check for coolant ingress.",
        "requires_power_cycle": True,
        "source": "Okuma Official Blog"
    },
]

def main():
    db_path = r"C:\\PRISM\EXTRACTED\controllers\MASTER_ALARM_DATABASE_v3.json"
    
    print("=" * 60)
    print("PRISM PHASE 7: FANUC 900-SERIES + OKUMA EXTENDED EXPANSION")
    print("=" * 60)
    
    with open(db_path, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    original_count = db['metadata']['total_alarms']
    print(f"Original alarm count: {original_count}")
    
    existing_ids = {a['alarm_id'] for a in db['alarms']}
    
    added = 0
    for alarm in PHASE7_FANUC_ALARMS:
        if alarm['alarm_id'] not in existing_ids:
            alarm['family'] = 'FANUC'
            alarm['added_date'] = datetime.now().isoformat()
            alarm['phase'] = 'PHASE7_FANUC_900'
            db['alarms'].append(alarm)
            existing_ids.add(alarm['alarm_id'])
            added += 1
            print(f"  Added FANUC: {alarm['alarm_id']} - {alarm['name']}")
        else:
            print(f"  Skipped (dup): {alarm['alarm_id']}")
    
    for alarm in PHASE7_OKUMA_ALARMS:
        if alarm['alarm_id'] not in existing_ids:
            alarm['family'] = 'OKUMA'
            alarm['added_date'] = datetime.now().isoformat()
            alarm['phase'] = 'PHASE7_OKUMA_EXTENDED'
            db['alarms'].append(alarm)
            existing_ids.add(alarm['alarm_id'])
            added += 1
            print(f"  Added OKUMA: {alarm['alarm_id']} - {alarm['name']}")
        else:
            print(f"  Skipped (dup): {alarm['alarm_id']}")
    
    new_count = len(db['alarms'])
    db['metadata']['total_alarms'] = new_count
    db['metadata']['version'] = "3.5.0-PHASE7"
    db['metadata']['last_updated'] = datetime.now().isoformat()
    db['metadata']['expansion_notes'] = "Phase 7 - FANUC 900-series system alarms + OKUMA extended"
    
    if "FANUC System Alarm Manual" not in db['metadata']['sources']:
        db['metadata']['sources'].append("FANUC System Alarm Manual")
    if "Okuma OSP-P300 Alarm Manual" not in db['metadata']['sources']:
        db['metadata']['sources'].append("Okuma OSP-P300 Alarm Manual")
    if "Okuma Official Blog" not in db['metadata']['sources']:
        db['metadata']['sources'].append("Okuma Official Blog")
    
    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print(f"PHASE 7 COMPLETE")
    print(f"Original: {original_count}")
    print(f"Added: {added}")
    print(f"New total: {new_count}")
    print(f"Progress: {new_count/2000*100:.1f}%")
    print("=" * 60)

if __name__ == "__main__":
    main()
