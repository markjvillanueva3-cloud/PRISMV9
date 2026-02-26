# ALARM EXTRACTION QUALITY ENFORCEMENT SYSTEM
# Prevents garbage data by architectural design

import json
import re
from typing import Dict, List, Tuple, Optional
from datetime import datetime

class AlarmQualityGate:
    """
    MANDATORY quality gate that REJECTS alarms before they enter the database.
    Every alarm must pass ALL checks or it's rejected.
    """
    
    # Patterns that indicate GARBAGE data - instant rejection
    GARBAGE_PATTERNS = [
        r'^ALARM \d+$',
        r'^ALARM-\d+$',
        r'^ERROR \d+$',
        r'^FAULT \d+$',
        r'^(SERVO|SPINDLE|ATC|NC|PLC|SYSTEM|PROGRAM|OEM|EXTERNAL) ALARM \d+$',
        r'^(SERVO|SPINDLE|ATC|NC|PLC|SYSTEM|PROGRAM|OEM|EXTERNAL) ERROR \d+$',
        r'ALARM \d+$',  # Ends with generic pattern
        r'ERROR \d+$',
        r'^[A-Z]+ \d+$',  # Single word + number only
    ]
    
    # Required fields - missing any = rejection
    REQUIRED_FIELDS = [
        'code',
        'name', 
        'category',
        'severity',
        'description',
        'causes',
        'quick_fix',
        'data_source'  # CRITICAL: Must cite where data came from
    ]
    
    # Valid categories
    VALID_CATEGORIES = [
        'SERVO', 'SPINDLE', 'ATC', 'SYSTEM', 'PROGRAM', 'OVERTRAVEL',
        'SAFETY', 'PMC', 'OVERHEAT', 'COMMUNICATION', 'ENCODER',
        'HYDRAULIC', 'PNEUMATIC', 'COOLANT', 'LUBRICATION', 'AXIS'
    ]
    
    # Valid severities
    VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
    
    # Minimum description length (characters)
    MIN_DESCRIPTION_LENGTH = 20
    
    # Minimum causes count
    MIN_CAUSES_COUNT = 1
    
    def __init__(self):
        self.rejected = []
        self.accepted = []
        self.rejection_reasons = {}
    
    def is_garbage_name(self, name: str) -> bool:
        """Check if alarm name matches garbage patterns"""
        name_upper = name.upper().strip()
        for pattern in self.GARBAGE_PATTERNS:
            if re.match(pattern, name_upper):
                return True
        return False
    
    def is_garbage_description(self, description: str, name: str) -> bool:
        """Check if description is just a restatement or too short"""
        desc_lower = description.lower().strip()
        name_lower = name.lower().strip()
        
        # Description same as name = lazy/generated
        if desc_lower == name_lower:
            return True
        
        # Description too short
        if len(description) < self.MIN_DESCRIPTION_LENGTH:
            return True
        
        # Description is just "X alarm Y" pattern
        if re.match(r'^[a-z]+ alarm \d+$', desc_lower):
            return True
            
        return False
    
    def validate_alarm(self, alarm: Dict) -> Tuple[bool, List[str]]:
        """
        Validate a single alarm against ALL quality rules.
        Returns (is_valid, list_of_issues)
        """
        issues = []
        
        # Check required fields
        for field in self.REQUIRED_FIELDS:
            if field not in alarm or not alarm[field]:
                issues.append(f"Missing required field: {field}")
        
        if issues:  # If missing required fields, can't continue
            return False, issues
        
        # Check for garbage name pattern
        if self.is_garbage_name(alarm['name']):
            issues.append(f"GARBAGE PATTERN: Name '{alarm['name']}' matches placeholder pattern")
        
        # Check for garbage description
        if self.is_garbage_description(alarm['description'], alarm['name']):
            issues.append(f"GARBAGE DESCRIPTION: Too short or same as name")
        
        # Validate category
        if alarm['category'].upper() not in self.VALID_CATEGORIES:
            issues.append(f"Invalid category: {alarm['category']}")
        
        # Validate severity
        if alarm['severity'].upper() not in self.VALID_SEVERITIES:
            issues.append(f"Invalid severity: {alarm['severity']}")
        
        # Check causes is a list with content
        if not isinstance(alarm['causes'], list) or len(alarm['causes']) < self.MIN_CAUSES_COUNT:
            issues.append(f"Causes must be list with at least {self.MIN_CAUSES_COUNT} item(s)")
        
        # Check data_source is meaningful (not empty or generic)
        source = alarm.get('data_source', '')
        if not source or source in ['unknown', 'generated', 'auto']:
            issues.append("data_source must cite actual documentation")
        
        return len(issues) == 0, issues
    
    def process_batch(self, alarms: List[Dict], family: str) -> Dict:
        """
        Process a batch of alarms through the quality gate.
        Returns statistics and filtered results.
        """
        accepted = []
        rejected = []
        
        for alarm in alarms:
            is_valid, issues = self.validate_alarm(alarm)
            
            if is_valid:
                alarm['quality_verified'] = True
                alarm['verified_at'] = datetime.now().isoformat()
                accepted.append(alarm)
            else:
                rejected.append({
                    'alarm': alarm,
                    'issues': issues
                })
        
        return {
            'family': family,
            'input_count': len(alarms),
            'accepted_count': len(accepted),
            'rejected_count': len(rejected),
            'acceptance_rate': len(accepted) / len(alarms) * 100 if alarms else 0,
            'accepted_alarms': accepted,
            'rejected_alarms': rejected
        }


class SourceRequirement:
    """
    Enforces that every alarm must cite a specific source.
    Prevents agents from inventing data.
    """
    
    VALID_SOURCE_TYPES = [
        'manufacturer_manual',      # Page number required
        'manufacturer_website',     # URL required
        'service_documentation',    # Document name required
        'technical_bulletin',       # Bulletin number required
        'verified_third_party'      # Site name + URL required
    ]
    
    @staticmethod
    def validate_source(source_info: Dict) -> Tuple[bool, str]:
        """
        Validate that source citation is complete and verifiable.
        """
        if not source_info:
            return False, "No source information provided"
        
        source_type = source_info.get('type', '')
        if source_type not in SourceRequirement.VALID_SOURCE_TYPES:
            return False, f"Invalid source type: {source_type}"
        
        # Each source type has specific requirements
        if source_type == 'manufacturer_manual':
            if not source_info.get('manual_name') or not source_info.get('page'):
                return False, "Manual source requires manual_name and page number"
                
        elif source_type == 'manufacturer_website':
            if not source_info.get('url'):
                return False, "Website source requires URL"
                
        elif source_type == 'verified_third_party':
            if not source_info.get('site_name') or not source_info.get('url'):
                return False, "Third party source requires site_name and url"
        
        return True, "Valid source"


# EXTRACTION RULES FOR AGENTS
AGENT_EXTRACTION_RULES = """
=============================================================================
MANDATORY EXTRACTION RULES - VIOLATION = IMMEDIATE REJECTION
=============================================================================

1. NEVER generate placeholder alarms like "ALARM 1", "ALARM 2", etc.
   - If you can't find real data, return NOTHING
   - Empty result is better than garbage

2. EVERY alarm MUST have:
   - code: Real manufacturer alarm code
   - name: Actual alarm name from documentation
   - description: Meaningful description (min 20 chars, NOT same as name)
   - causes: List of actual causes (min 1)
   - quick_fix: Real troubleshooting step
   - data_source: WHERE you found this (manual name, URL, page number)

3. SOURCE CITATION REQUIRED:
   - "FANUC Series 0i Maintenance Manual, p.245"
   - "https://www.haascnc.com/service/alarm-xxx"
   - "Siemens SINUMERIK 840D Diagnostics Manual, Alarm 25010"
   
4. If documentation is unavailable for a controller:
   - STOP and report "insufficient documentation"
   - Do NOT fill gaps with invented data
   
5. QUALITY over QUANTITY:
   - 50 verified alarms > 500 garbage alarms
   - Target accuracy, not count

=============================================================================
"""


def create_quality_enforced_extraction_task(family: str, target_count: int) -> Dict:
    """
    Create an extraction task with built-in quality enforcement.
    """
    return {
        'task_type': 'alarm_extraction',
        'controller_family': family,
        'target_count': target_count,
        'quality_requirements': {
            'min_acceptance_rate': 0.95,  # 95% must pass quality gate
            'garbage_pattern_tolerance': 0,  # ZERO garbage allowed
            'source_citation_required': True,
            'min_description_length': 20,
            'min_causes_per_alarm': 1
        },
        'extraction_rules': AGENT_EXTRACTION_RULES,
        'validation_gate': 'AlarmQualityGate',
        'on_quality_failure': 'REJECT_BATCH',  # Reject entire batch if quality fails
        'created': datetime.now().isoformat()
    }


if __name__ == '__main__':
    # Demo: Test the quality gate
    print("=" * 70)
    print("ALARM QUALITY GATE - DEMONSTRATION")
    print("=" * 70)
    print()
    
    gate = AlarmQualityGate()
    
    # Test cases
    test_alarms = [
        # GOOD alarm - should pass
        {
            'code': '0401',
            'name': 'SERVO ALARM: VRDY OFF',
            'category': 'SERVO',
            'severity': 'CRITICAL',
            'description': 'Servo amplifier not ready - drive ready signal lost from amplifier',
            'causes': ['Amplifier fault', 'Power supply issue', 'Cable fault'],
            'quick_fix': 'Check servo amplifier status LEDs and power connections',
            'data_source': 'FANUC Series 0i Maintenance Manual, Chapter 5, p.245'
        },
        # BAD alarm - garbage name pattern
        {
            'code': '1234',
            'name': 'ALARM 1234',
            'category': 'SYSTEM',
            'severity': 'HIGH',
            'description': 'System alarm 1234',
            'causes': ['Unknown'],
            'quick_fix': 'Contact service',
            'data_source': 'generated'
        },
        # BAD alarm - description too short
        {
            'code': '500',
            'name': 'OVERTRAVEL X+',
            'category': 'OVERTRAVEL',
            'severity': 'CRITICAL',
            'description': 'X+ limit',  # Too short!
            'causes': ['Limit hit'],
            'quick_fix': 'Jog back',
            'data_source': 'manual'
        },
        # BAD alarm - missing required field
        {
            'code': '999',
            'name': 'SOME ALARM',
            'category': 'SYSTEM',
            'severity': 'HIGH',
            'description': 'This alarm indicates something happened in the system',
            # Missing: causes, quick_fix, data_source
        }
    ]
    
    print("Testing quality gate with sample alarms:")
    print("-" * 70)
    
    for i, alarm in enumerate(test_alarms):
        is_valid, issues = gate.validate_alarm(alarm)
        status = "✅ ACCEPTED" if is_valid else "❌ REJECTED"
        print(f"\nAlarm {i+1}: {alarm.get('name', 'N/A')}")
        print(f"  Status: {status}")
        if issues:
            for issue in issues:
                print(f"  Issue: {issue}")
    
    print()
    print("=" * 70)
    print("Quality gate demonstration complete.")
    print("This gate MUST be applied to ALL swarm extraction output.")
    print("=" * 70)
