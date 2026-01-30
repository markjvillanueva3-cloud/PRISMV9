#!/usr/bin/env python3
"""Verify module utilization requirements before import - BLOCKS if not met."""

import json
import argparse
import sys

# Minimum consumer requirements by module
REQUIREMENTS = {
    'PRISM_MATERIALS_MASTER': {
        'minConsumers': 15,
        'required': [
            'PRISM_SPEED_FEED_CALCULATOR',
            'PRISM_FORCE_CALCULATOR',
            'PRISM_THERMAL_ENGINE',
            'PRISM_TOOL_LIFE_ENGINE',
            'PRISM_SURFACE_FINISH_ENGINE',
            'PRISM_CHATTER_PREDICTION',
            'PRISM_CHIP_FORMATION_ENGINE',
            'PRISM_COOLANT_SELECTOR',
            'PRISM_COATING_OPTIMIZER',
            'PRISM_COST_ESTIMATOR',
            'PRISM_CYCLE_TIME_PREDICTOR',
            'PRISM_QUOTING_ENGINE',
            'PRISM_AI_LEARNING_PIPELINE',
            'PRISM_BAYESIAN_OPTIMIZER',
            'PRISM_EXPLAINABLE_AI'
        ]
    },
    'PRISM_MACHINES_DATABASE': {
        'minConsumers': 12,
        'required': [
            'PRISM_SPEED_FEED_CALCULATOR',
            'PRISM_COLLISION_ENGINE',
            'PRISM_POST_PROCESSOR_GENERATOR',
            'PRISM_CHATTER_PREDICTION',
            'PRISM_CYCLE_TIME_PREDICTOR',
            'PRISM_COST_ESTIMATOR',
            'PRISM_SCHEDULING_ENGINE',
            'PRISM_QUOTING_ENGINE',
            'PRISM_CAPABILITY_MATCHER',
            'PRISM_3D_VISUALIZATION',
            'PRISM_AI_LEARNING_PIPELINE',
            'PRISM_EXPLAINABLE_AI'
        ]
    },
    'PRISM_TOOLS_DATABASE': {
        'minConsumers': 10,
        'required': [
            'PRISM_SPEED_FEED_CALCULATOR',
            'PRISM_FORCE_CALCULATOR',
            'PRISM_TOOL_LIFE_ENGINE',
            'PRISM_DEFLECTION_ENGINE',
            'PRISM_COLLISION_ENGINE',
            'PRISM_COST_ESTIMATOR',
            'PRISM_INVENTORY_ENGINE',
            'PRISM_TOOLPATH_ENGINE',
            'PRISM_AI_LEARNING_PIPELINE',
            'PRISM_EXPLAINABLE_AI'
        ]
    }
}

# Default for other databases
DEFAULT_MIN_CONSUMERS = 8

def verify_module(module_name, consumers):
    """Verify module meets utilization requirements. Returns (approved, errors)."""
    errors = []
    
    req = REQUIREMENTS.get(module_name, {'minConsumers': DEFAULT_MIN_CONSUMERS, 'required': []})
    
    # Check minimum consumer count
    if len(consumers) < req['minConsumers']:
        errors.append(f"BLOCKED: {module_name} requires {req['minConsumers']} consumers, only {len(consumers)} provided")
    
    # Check required consumers
    for required in req['required']:
        if required not in consumers:
            errors.append(f"BLOCKED: {module_name} MUST be consumed by {required}")
    
    return len(errors) == 0, errors

def main():
    parser = argparse.ArgumentParser(description='Verify module utilization before import')
    parser.add_argument('--module', type=str, required=True, help='Module name')
    parser.add_argument('--consumers', type=str, help='Comma-separated consumer list OR consumer count')
    parser.add_argument('--force', action='store_true', help='Show requirements even if blocked')
    args = parser.parse_args()
    
    # Parse consumers
    if args.consumers:
        if args.consumers.isdigit():
            # Just a count - generate placeholder consumers
            consumers = [f'CONSUMER_{i}' for i in range(int(args.consumers))]
        else:
            consumers = [c.strip() for c in args.consumers.split(',')]
    else:
        consumers = []
    
    print(f"\n[PRISM UTILIZATION VERIFIER]")
    print(f"Module: {args.module}")
    print(f"Consumers provided: {len(consumers)}")
    
    approved, errors = verify_module(args.module, consumers)
    
    if approved:
        print(f"\n✓ APPROVED: {args.module} meets utilization requirements")
        print(f"  Consumers: {len(consumers)}/{REQUIREMENTS.get(args.module, {}).get('minConsumers', DEFAULT_MIN_CONSUMERS)}")
        return 0
    else:
        print(f"\n✗ BLOCKED: Module cannot be imported")
        for error in errors:
            print(f"  - {error}")
        
        # Show requirements
        req = REQUIREMENTS.get(args.module, {})
        if req.get('required'):
            print(f"\nRequired consumers for {args.module}:")
            for r in req['required']:
                status = '✓' if r in consumers else '✗'
                print(f"  {status} {r}")
        
        return 1

if __name__ == "__main__":
    sys.exit(main())
