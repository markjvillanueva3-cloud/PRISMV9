#!/usr/bin/env python3
"""Resolve data through PRISM's 4-layer hierarchy."""

import json
import os
import argparse
from pathlib import Path

LOCAL_ROOT = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"
MACHINES_BASE = os.path.join(LOCAL_ROOT, "EXTRACTED", "databases", "machines")

LAYERS = ['LEARNED', 'USER', 'ENHANCED', 'CORE']
CONFIDENCE_THRESHOLD = 0.8

def load_layer_data(layer, module_pattern=None):
    """Load all data from a layer."""
    layer_path = os.path.join(MACHINES_BASE, layer)
    data = {}
    
    if not os.path.exists(layer_path):
        return data
    
    for file in Path(layer_path).glob('*.js'):
        if module_pattern and module_pattern not in file.name:
            continue
        # Simple extraction - in production would properly parse JS
        try:
            content = file.read_text(encoding='utf-8', errors='ignore')
            # Extract machine entries (simplified)
            data[file.stem] = {'content': content, 'path': str(file)}
        except Exception as e:
            print(f"Warning: Could not load {file}: {e}")
    
    return data

def resolve_property(machine_id, property_name):
    """Resolve a property value through the layer hierarchy."""
    resolution_path = []
    
    for layer in LAYERS:
        layer_path = os.path.join(MACHINES_BASE, layer)
        if not os.path.exists(layer_path):
            continue
        
        # Search for machine in layer
        for file in Path(layer_path).glob('*.js'):
            content = file.read_text(encoding='utf-8', errors='ignore')
            if machine_id in content:
                # Check for property (simplified search)
                if property_name in content:
                    resolution_path.append({
                        'layer': layer,
                        'file': file.name,
                        'found': True
                    })
                    
                    # For LEARNED, check confidence
                    if layer == 'LEARNED':
                        if 'confidence' in content:
                            # Would parse actual confidence value
                            resolution_path[-1]['note'] = 'Confidence check needed'
                    
                    return {
                        'resolved_from': layer,
                        'path': resolution_path,
                        'machine': machine_id,
                        'property': property_name
                    }
    
    return {
        'resolved_from': None,
        'path': resolution_path,
        'machine': machine_id,
        'property': property_name,
        'error': 'Property not found in any layer'
    }

def validate_layers():
    """Validate layer structure and rules."""
    issues = []
    
    for layer in LAYERS:
        layer_path = os.path.join(MACHINES_BASE, layer)
        if not os.path.exists(layer_path):
            if layer in ['CORE', 'ENHANCED']:
                issues.append(f"Missing required layer: {layer}")
            continue
        
        files = list(Path(layer_path).glob('*.js'))
        print(f"  {layer}: {len(files)} files")
    
    return issues

def main():
    parser = argparse.ArgumentParser(description='Resolve PRISM hierarchy')
    parser.add_argument('--machine', type=str, help='Machine ID to resolve')
    parser.add_argument('--property', type=str, help='Property to resolve')
    parser.add_argument('--validate', action='store_true', help='Validate layer structure')
    parser.add_argument('--list-layers', action='store_true', help='List all layers')
    args = parser.parse_args()
    
    print("\n[PRISM HIERARCHY MANAGER]\n")
    
    if args.list_layers or (not args.machine and not args.validate):
        print("Layer structure:")
        issues = validate_layers()
        if issues:
            print("\nIssues found:")
            for i in issues:
                print(f"  ⚠ {i}")
        return 0
    
    if args.validate:
        print("Validating layers...")
        issues = validate_layers()
        if issues:
            print(f"\n✗ {len(issues)} issues found")
            return 1
        print("\n✓ All layers valid")
        return 0
    
    if args.machine and args.property:
        print(f"Resolving {args.machine}.{args.property}...")
        result = resolve_property(args.machine, args.property)
        
        print(f"\nResult:")
        print(f"  Resolved from: {result.get('resolved_from', 'NOT FOUND')}")
        print(f"  Resolution path:")
        for step in result.get('path', []):
            print(f"    - {step['layer']}: {step['file']}")
        
        if result.get('error'):
            print(f"  Error: {result['error']}")
            return 1
        return 0
    
    parser.print_help()
    return 1

if __name__ == "__main__":
    exit(main())
