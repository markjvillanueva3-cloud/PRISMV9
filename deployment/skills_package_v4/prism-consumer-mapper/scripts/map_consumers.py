#!/usr/bin/env python3
"""Map all consumers for a PRISM module - generates wiring specifications."""

import json
import argparse
from datetime import datetime

# Complete consumer matrix for major databases
CONSUMER_MATRIX = {
    'PRISM_MATERIALS_MASTER': {
        'minConsumers': 15,
        'consumers': [
            {'name': 'PRISM_SPEED_FEED_CALCULATOR', 'fields': ['base_speed', 'machinability', 'hardness'], 'route': '/api/speed-feed'},
            {'name': 'PRISM_FORCE_CALCULATOR', 'fields': ['kc1_1', 'mc', 'yield_strength'], 'route': '/api/force'},
            {'name': 'PRISM_THERMAL_ENGINE', 'fields': ['conductivity', 'specific_heat', 'melting_point'], 'route': '/api/thermal'},
            {'name': 'PRISM_TOOL_LIFE_ENGINE', 'fields': ['taylor_n', 'taylor_C', 'abrasiveness'], 'route': '/api/tool-life'},
            {'name': 'PRISM_SURFACE_FINISH_ENGINE', 'fields': ['elasticity', 'built_up_edge_tendency'], 'route': '/api/surface'},
            {'name': 'PRISM_CHATTER_PREDICTION', 'fields': ['damping_ratio', 'elastic_modulus'], 'route': '/api/chatter'},
            {'name': 'PRISM_CHIP_FORMATION_ENGINE', 'fields': ['strain_hardening', 'chip_type'], 'route': '/api/chip'},
            {'name': 'PRISM_COOLANT_SELECTOR', 'fields': ['reactivity', 'coolant_compatibility'], 'route': '/api/coolant'},
            {'name': 'PRISM_COATING_OPTIMIZER', 'fields': ['chemical_affinity', 'temperature_limit'], 'route': '/api/coating'},
            {'name': 'PRISM_COST_ESTIMATOR', 'fields': ['material_cost', 'density'], 'route': '/api/cost'},
            {'name': 'PRISM_CYCLE_TIME_PREDICTOR', 'fields': ['all_cutting_params'], 'route': '/api/cycle-time'},
            {'name': 'PRISM_QUOTING_ENGINE', 'fields': ['material_cost', 'machinability'], 'route': '/api/quote'},
            {'name': 'PRISM_AI_LEARNING_PIPELINE', 'fields': ['ALL'], 'route': '/api/ai/learn'},
            {'name': 'PRISM_BAYESIAN_OPTIMIZER', 'fields': ['uncertainty_params'], 'route': '/api/ai/bayesian'},
            {'name': 'PRISM_EXPLAINABLE_AI', 'fields': ['ALL'], 'route': '/api/ai/explain'}
        ]
    },
    'PRISM_MACHINES_DATABASE': {
        'minConsumers': 12,
        'consumers': [
            {'name': 'PRISM_SPEED_FEED_CALCULATOR', 'fields': ['rpm_max', 'feed_max', 'power'], 'route': '/api/speed-feed'},
            {'name': 'PRISM_COLLISION_ENGINE', 'fields': ['work_envelope', 'axis_limits'], 'route': '/api/collision'},
            {'name': 'PRISM_POST_PROCESSOR_GENERATOR', 'fields': ['controller', 'capabilities'], 'route': '/api/post'},
            {'name': 'PRISM_CHATTER_PREDICTION', 'fields': ['spindle_stiffness', 'natural_freq'], 'route': '/api/chatter'},
            {'name': 'PRISM_CYCLE_TIME_PREDICTOR', 'fields': ['rapid_rates', 'accel_decel'], 'route': '/api/cycle-time'},
            {'name': 'PRISM_COST_ESTIMATOR', 'fields': ['hourly_rate', 'efficiency'], 'route': '/api/cost'},
            {'name': 'PRISM_SCHEDULING_ENGINE', 'fields': ['availability', 'capabilities'], 'route': '/api/schedule'},
            {'name': 'PRISM_QUOTING_ENGINE', 'fields': ['hourly_rate', 'setup_time'], 'route': '/api/quote'},
            {'name': 'PRISM_CAPABILITY_MATCHER', 'fields': ['ALL_capability_fields'], 'route': '/api/capability'},
            {'name': 'PRISM_3D_VISUALIZATION', 'fields': ['kinematics', 'geometry'], 'route': '/api/viz'},
            {'name': 'PRISM_AI_LEARNING_PIPELINE', 'fields': ['ALL'], 'route': '/api/ai/learn'},
            {'name': 'PRISM_EXPLAINABLE_AI', 'fields': ['ALL'], 'route': '/api/ai/explain'}
        ]
    },
    'PRISM_TOOLS_DATABASE': {
        'minConsumers': 10,
        'consumers': [
            {'name': 'PRISM_SPEED_FEED_CALCULATOR', 'fields': ['geometry', 'coating', 'grade'], 'route': '/api/speed-feed'},
            {'name': 'PRISM_FORCE_CALCULATOR', 'fields': ['rake_angle', 'edge_radius'], 'route': '/api/force'},
            {'name': 'PRISM_TOOL_LIFE_ENGINE', 'fields': ['substrate', 'coating', 'geometry'], 'route': '/api/tool-life'},
            {'name': 'PRISM_DEFLECTION_ENGINE', 'fields': ['length', 'diameter', 'material'], 'route': '/api/deflection'},
            {'name': 'PRISM_COLLISION_ENGINE', 'fields': ['3D_model', 'holder_assembly'], 'route': '/api/collision'},
            {'name': 'PRISM_COST_ESTIMATOR', 'fields': ['tool_cost', 'expected_life'], 'route': '/api/cost'},
            {'name': 'PRISM_INVENTORY_ENGINE', 'fields': ['stock_level', 'reorder_point'], 'route': '/api/inventory'},
            {'name': 'PRISM_TOOLPATH_ENGINE', 'fields': ['cutting_geometry', 'chip_load'], 'route': '/api/toolpath'},
            {'name': 'PRISM_AI_LEARNING_PIPELINE', 'fields': ['ALL'], 'route': '/api/ai/learn'},
            {'name': 'PRISM_EXPLAINABLE_AI', 'fields': ['ALL'], 'route': '/api/ai/explain'}
        ]
    }
}

# Default for unmapped databases
DEFAULT_CONSUMERS = {
    'minConsumers': 8,
    'consumers': [
        {'name': 'PRISM_AI_LEARNING_PIPELINE', 'fields': ['ALL'], 'route': '/api/ai/learn'},
        {'name': 'PRISM_EXPLAINABLE_AI', 'fields': ['ALL'], 'route': '/api/ai/explain'},
        {'name': 'PRISM_COST_ESTIMATOR', 'fields': ['cost_fields'], 'route': '/api/cost'},
        {'name': 'PRISM_QUOTING_ENGINE', 'fields': ['quote_fields'], 'route': '/api/quote'}
    ]
}

def get_consumer_mapping(module_name):
    """Get consumer mapping for a module."""
    return CONSUMER_MATRIX.get(module_name, DEFAULT_CONSUMERS)

def generate_wiring_code(module_name, mapping):
    """Generate JavaScript wiring code."""
    consumers_js = []
    for c in mapping['consumers']:
        consumers_js.append(f"""    {{
      name: '{c['name']}',
      fields: {json.dumps(c['fields'])},
      gateway_route: '{c['route']}',
      priority: 'REQUIRED'
    }}""")
    
    code = f"""// Auto-generated wiring for {module_name}
// Generated: {datetime.now().isoformat()}

const {module_name}_WIRING = {{
  module: '{module_name}',
  minConsumers: {mapping['minConsumers']},
  consumers: [
{',\n'.join(consumers_js)}
  ],
  verification: {{
    verified: false,
    verifiedAt: null,
    verifiedBy: null
  }}
}};

// Export for integration
if (typeof module !== 'undefined') {{
  module.exports = {module_name}_WIRING;
}}
"""
    return code

def main():
    parser = argparse.ArgumentParser(description='Map consumers for PRISM module')
    parser.add_argument('--module', type=str, required=True, help='Module name')
    parser.add_argument('--output', type=str, help='Output file for wiring code')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    args = parser.parse_args()
    
    mapping = get_consumer_mapping(args.module)
    
    print(f"\n[PRISM CONSUMER MAPPER]")
    print(f"Module: {args.module}")
    print(f"Required consumers: {mapping['minConsumers']}")
    print(f"Defined consumers: {len(mapping['consumers'])}")
    
    print(f"\nConsumer mapping:")
    for c in mapping['consumers']:
        fields = ', '.join(c['fields'][:3])
        if len(c['fields']) > 3:
            fields += '...'
        print(f"  → {c['name']}: [{fields}]")
    
    if args.json:
        print(f"\n{json.dumps(mapping, indent=2)}")
    
    if args.output:
        code = generate_wiring_code(args.module, mapping)
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"\n✓ Wiring code saved to: {args.output}")
    
    return 0

if __name__ == "__main__":
    exit(main())
