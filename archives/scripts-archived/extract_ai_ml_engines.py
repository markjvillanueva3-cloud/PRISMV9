"""
Comprehensive extraction of AI/ML engines from monolith.
Priority 1: These directly improve Claude's intelligence capabilities.
"""
import re
import json
from pathlib import Path
from datetime import datetime

# Read monolith
monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
content = monolith_path.read_text(encoding='utf-8')

# AI/ML modules to extract (grouped by category)
AI_ML_MODULES = {
    # Neural Networks & Deep Learning
    'NEURAL_DEEP': [
        'PRISM_RNN_ADVANCED',
        'PRISM_ATTENTION_ADVANCED',
        'PRISM_TRANSFORMER_ENGINE',
        'PRISM_SEQUENCE_MODEL_ENGINE',
        'PRISM_DEEP_LEARNING_PARAMS',
        'PRISM_ACTIVATIONS_ENGINE',
        'PRISM_ADVANCED_DQN',
        'PRISM_PINN_CUTTING',
    ],
    
    # Optimization Algorithms
    'OPTIMIZATION': [
        'PRISM_SWARM_ALGORITHMS',
        'PRISM_CONSTRAINED_OPTIMIZATION_ENHANCED',
        'PRISM_UNCONSTRAINED_OPTIMIZATION',
        'PRISM_HYPEROPT_COMPLETE',
        'PRISM_INTERIOR_POINT_ENGINE',
        'PRISM_TOOLPATH_OPTIMIZATION',
        'PRISM_COMBINATORIAL',
        'PRISM_MFG_OPTIMIZATION_ADVANCED',
    ],
    
    # Probabilistic & Bayesian
    'PROBABILISTIC': [
        'PRISM_MONTE_CARLO',
        'PRISM_UNCERTAINTY',
        'PRISM_BAYESIAN_LEARNING',
        'PRISM_PARTICLE_FILTER',
        'PRISM_PROBABILISTIC_COLLISION',
        'PRISM_KALMAN_ENGINE',
    ],
    
    # Learning Systems
    'LEARNING': [
        'PRISM_UNIFIED_LEARNING_ENGINE',
        'PRISM_CALCULATOR_LEARNING_ENGINE',
        'PRISM_LEARNING_INTEGRATION_BRIDGE',
        'PRISM_LEARNING_FEEDBACK_CONNECTOR',
        'PRISM_LEARNING_RATE_SCHEDULER_ENGINE',
        'PRISM_LR_SCHEDULER',
    ],
    
    # Clustering & Classification
    'CLUSTERING': [
        'PRISM_CLUSTERING_ENHANCED',
        'PRISM_INTENT_CLASSIFIER',
        'PRISM_FEATURE_INTERACTION',
    ],
    
    # Explainability
    'XAI': [
        'PRISM_XAI_ENHANCED',
    ],
}

def extract_module(content, module_name, max_size=150000):
    """Extract a const module from content."""
    pattern = rf'const\s+{module_name}\s*=\s*\{{'
    match = re.search(pattern, content)
    
    if not match:
        return None
    
    start = match.start()
    brace_count = 0
    in_string = False
    string_char = None
    i = start
    
    while i < min(start + max_size, len(content)):
        char = content[i]
        
        # Handle escape sequences
        if i > 0 and content[i-1] == '\\':
            i += 1
            continue
            
        # Handle string boundaries
        if char in ['"', "'"]:
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None
            i += 1
            continue
        
        # Handle template literals
        if char == '`':
            if not in_string:
                in_string = True
                string_char = '`'
            elif string_char == '`':
                in_string = False
                string_char = None
            i += 1
            continue
            
        if in_string:
            i += 1
            continue
            
        # Count braces
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                return content[start:i+1]
        
        i += 1
    
    return None

# Extract all AI/ML modules
results = {}
total_chars = 0
extraction_log = []

print("=" * 70)
print("AI/ML ENGINE EXTRACTION")
print("=" * 70)

for category, modules in AI_ML_MODULES.items():
    print(f"\n{category}:")
    category_chars = 0
    
    for mod in modules:
        extracted = extract_module(content, mod)
        if extracted:
            results[mod] = extracted
            size = len(extracted)
            total_chars += size
            category_chars += size
            extraction_log.append({'module': mod, 'category': category, 'size': size, 'status': 'OK'})
            print(f"  [OK] {mod}: {size:,} chars")
        else:
            extraction_log.append({'module': mod, 'category': category, 'size': 0, 'status': 'NOT_FOUND'})
            print(f"  [--] {mod}: NOT FOUND")
    
    print(f"  Category total: {category_chars:,} chars")

print(f"\n{'=' * 70}")
print(f"EXTRACTION COMPLETE")
print(f"Found: {len([r for r in extraction_log if r['status'] == 'OK'])}/{len(extraction_log)} modules")
print(f"Total: {total_chars:,} characters")

# Save extracted modules
output_dir = Path(r'C:\PRISM\extracted_modules\ai_ml_engines')
output_dir.mkdir(exist_ok=True)

for mod, code in results.items():
    (output_dir / f'{mod}.js').write_text(code, encoding='utf-8')

# Save extraction summary
summary = {
    'extracted_at': datetime.now().isoformat(),
    'category': 'AI_ML_ENGINES',
    'total_modules': len(results),
    'total_chars': total_chars,
    'modules': {k: len(v) for k, v in results.items()},
    'log': extraction_log
}
(output_dir / 'EXTRACTION_SUMMARY.json').write_text(
    json.dumps(summary, indent=2), encoding='utf-8'
)

print(f"\nSaved to: {output_dir}")
