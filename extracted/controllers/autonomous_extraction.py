# AUTONOMOUS ALARM EXTRACTION SYSTEM
# Self-validating loop with quality enforcement
# v1.0 - 2026-01-28

import json
import re
from datetime import datetime
from typing import Dict, List, Tuple

class QualityGate:
    """Auto-validates alarms, rejects garbage patterns"""
    
    GARBAGE_PATTERNS = [
        r'^ALARM \d+$',
        r'^ALARM-\d+$', 
        r'^ERROR \d+$',
        r'^FAULT \d+$',
        r'^(SERVO|SPINDLE|ATC|NC|PLC|SYSTEM|PROGRAM|OEM) ALARM \d+$',
        r'^(SERVO|SPINDLE|ATC|NC|PLC|SYSTEM|PROGRAM|OEM) ERROR \d+$',
        r'ALARM \d+$',
        r'ERROR \d+$',
        r'^[A-Z]+ \d+$',
    ]
    
    VALID_CATEGORIES = [
        'SERVO', 'SPINDLE', 'ATC', 'SYSTEM', 'PROGRAM', 'OVERTRAVEL',
        'SAFETY', 'PMC', 'OVERHEAT', 'COMMUNICATION', 'ENCODER',
        'HYDRAULIC', 'PNEUMATIC', 'COOLANT', 'LUBRICATION', 'AXIS',
        'MEMORY', 'PARAMETER', 'MACRO', 'FSSB', 'TOOL', 'TURRET'
    ]
    
    VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
    
    @staticmethod
    def is_garbage(name: str) -> bool:
        name_upper = name.upper().strip()
        for pattern in QualityGate.GARBAGE_PATTERNS:
            if re.match(pattern, name_upper):
                return True
        return False
    
    @staticmethod
    def validate(alarm: Dict) -> Tuple[bool, List[str]]:
        issues = []
        
        # Required fields
        required = ['code', 'name', 'category', 'severity', 'description', 'data_source']
        for field in required:
            if field not in alarm or not alarm[field]:
                issues.append(f"Missing: {field}")
        
        if issues:
            return False, issues
        
        # Garbage name check
        if QualityGate.is_garbage(alarm['name']):
            issues.append(f"GARBAGE PATTERN: {alarm['name']}")
        
        # Description quality
        if len(alarm['description']) < 20:
            issues.append("Description too short (<20 chars)")
        
        if alarm['description'].lower() == alarm['name'].lower():
            issues.append("Description same as name")
        
        # Valid category
        if alarm['category'].upper() not in QualityGate.VALID_CATEGORIES:
            issues.append(f"Invalid category: {alarm['category']}")
        
        # Valid severity  
        if alarm['severity'].upper() not in QualityGate.VALID_SEVERITIES:
            issues.append(f"Invalid severity: {alarm['severity']}")
        
        return len(issues) == 0, issues


def create_alarm(code, name, category, severity, description, causes, quick_fix, source):
    """Create alarm dict with all required fields"""
    return {
        'code': str(code),
        'name': name,
        'category': category.upper(),
        'severity': severity.upper(),
        'description': description,
        'causes': causes if isinstance(causes, list) else [causes],
        'quick_fix': quick_fix,
        'requires_power_cycle': severity.upper() == 'CRITICAL',
        'data_source': source,
        'confidence': 'VERIFIED',
        'extracted_at': datetime.now().isoformat()
    }


# Will be populated by extraction process
EXTRACTION_LOG = {
    'started': datetime.now().isoformat(),
    'controllers': {},
    'total_extracted': 0,
    'total_rejected': 0,
    'rejection_log': []
}

print("Autonomous Extraction System initialized")
print(f"Quality Gate active with {len(QualityGate.GARBAGE_PATTERNS)} rejection patterns")
