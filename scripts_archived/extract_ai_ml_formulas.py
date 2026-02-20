#!/usr/bin/env python3
"""
PRISM Deep AI/ML/Formula Extractor v2.0
Extracts complete implementations from the v8.89 monolith.
"""

import re
import json
from pathlib import Path
from datetime import datetime
from collections import defaultdict

MONOLITH_PATH = Path(r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html")
OUTPUT_DIR = Path(r"C:\PRISM\extracted_modules")
OUTPUT_DIR.mkdir(exist_ok=True)

# Target modules for detailed extraction
TARGET_CATEGORIES = {
    'OPTIMIZATION': [
        'PRISM_OPTIMIZATION_ALGORITHMS',
        'PRISM_PHASE1_OPTIMIZERS',
        'PRISM_ADVANCED_OPTIMIZATION_ENGINE',
        'PRISM_MULTI_OBJECTIVE_OPTIMIZER',
        'PRISM_METAHEURISTIC_OPTIMIZATION',
        'PRISM_CONSTRAINED_OPTIMIZATION',
        'PRISM_COMBINATORIAL_OPTIMIZER',
        'PRISM_ADVANCED_FEED_OPTIMIZER',
        'PRISM_RAPIDS_OPTIMIZER',
    ],
    'NEURAL_DEEP_LEARNING': [
        'PRISM_NEURAL_ENGINE_ENHANCED',
        'PRISM_NEURAL_NETWORK',
        'PRISM_DEEP_LEARNING_PARAMS',
        'PRISM_PHASE3_DEEP_LEARNING',
        'PRISM_PHASE3_GRAPH_NEURAL',
        'PRISM_TRANSFORMER_ENGINE',
        'PRISM_TRANSFORMER_DECODER',
        'PRISM_RNN_ADVANCED',
        'PRISM_SWARM_NEURAL_HYBRID',
    ],
    'MACHINE_LEARNING': [
        'PRISM_BAYESIAN_ENGINE',
        'PRISM_GAUSSIAN_PROCESS',
        'PRISM_ENSEMBLE_ALGORITHMS',
        'PRISM_ALGORITHM_SELECTOR',
        'PRISM_ACTIVE_LEARNING',
        'PRISM_ACTIVE_LEARNING_COMPLETE',
        'PRISM_CAM_LEARNING_ENGINE',
        'PRISM_LEARNING_ENGINE',
        'PRISM_LEARNING_PERSISTENCE_ENGINE',
        'PRISM_MACHINE_3D_LEARNING_ENGINE',
        'PRISM_AXIS_BEHAVIOR_LEARNING_ENGINE',
        'PRISM_CONTACT_CONSTRAINT_LEARNING_ENGINE',
        'PRISM_COMPLEX_CAD_LEARNING_ENGINE',
    ],
    'PHYSICS_FORMULAS': [
        'PRISM_TAYLOR_LOOKUP',
        'PRISM_TAYLOR_ADVANCED',
        'PRISM_TAYLOR_COMPLETE',
        'PRISM_TAYLOR_TOOL_LIFE',
        'PRISM_FORCE_LOOKUP',
        'PRISM_KIENZLE',
        'PRISM_JOHNSON_COOK_DATABASE',
        'PRISM_CUTTING_MECHANICS_ENGINE',
        'PRISM_CUTTING_THERMAL_ENGINE',
        'PRISM_HEAT_TRANSFER_ENGINE',
        'PRISM_THERMAL_EXPANSION_ENGINE',
        'PRISM_PHYSICS_ENGINE',
        'PRISM_CHATTER_PREDICTION_ENGINE',
        'PRISM_VIBRATION_ANALYSIS_ENGINE',
        'PRISM_SURFACE_FINISH_ENGINE',
        'PRISM_TOOL_LIFE_ENGINE',
    ],
    'SIGNAL_PROCESSING': [
        'PRISM_SIGNAL_ALGORITHMS',
        'PRISM_PHASE1_SIGNAL',
        'PRISM_FFT_PREDICTIVE_CHATTER',
        'PRISM_WAVELET_CHATTER',
        'PRISM_NUMERICAL_ENGINE',
    ],
    'AI_INFRASTRUCTURE': [
        'PRISM_AI_ORCHESTRATION_ENGINE',
        'PRISM_AI_BACKGROUND_COORDINATOR',
        'PRISM_AI_BACKGROUND_ORCHESTRATOR',
        'PRISM_AI_COMPLETE_SYSTEM',
        'PRISM_AI_DATABASE_CONNECTOR',
        'PRISM_INTELLIGENT_DECISION_ENGINE',
        'PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE',
    ],
    'REINFORCEMENT_LEARNING': [
        'PRISM_RL_ALGORITHMS',
        'PRISM_PHASE6_DEEPLEARNING',
    ],
}

def extract_module_code(content, module_name):
    """Extract the full code block for a module."""
    # Pattern to find module definition
    patterns = [
        rf'const\s+{module_name}\s*=\s*\{{',
        rf'window\.{module_name}\s*=\s*\{{',
        rf'class\s+{module_name}\s*\{{',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            start = match.start()
            # Find the matching closing brace
            brace_count = 0
            in_string = False
            string_char = None
            end = start
            
            for i, char in enumerate(content[start:start+50000]):  # Limit search
                if not in_string:
                    if char in '"\'`':
                        in_string = True
                        string_char = char
                    elif char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end = start + i + 1
                            break
                else:
                    if char == string_char and content[start+i-1:start+i] != '\\':
                        in_string = False
            
            if end > start:
                code = content[start:end]
                # Trim to reasonable size
                if len(code) > 30000:
                    code = code[:30000] + '\n// ... [TRUNCATED - Full module available in monolith]'
                return code
    
    return None

def find_formulas_in_code(code):
    """Extract mathematical formulas from code."""
    formulas = []
    
    # Common formula patterns
    formula_patterns = [
        (r'//\s*Formula:\s*([^\n]+)', 'comment'),
        (r'//\s*([A-Za-z]+\s*=\s*[^/\n]{5,})', 'equation'),
        (r'Taylor.*V\s*\*\s*T', 'Taylor'),
        (r'kc\s*=\s*kc1\.1\s*\*', 'Kienzle'),
        (r'sigma\s*=\s*A\s*\+\s*B', 'Johnson-Cook'),
        (r'MRR\s*=', 'MRR'),
        (r'power\s*=.*force.*velocity', 'Power'),
        (r'deflection\s*=.*length.*force', 'Deflection'),
        (r'Ra\s*=.*feed', 'Surface Roughness'),
        (r'stability.*lobe', 'Stability Lobe'),
    ]
    
    for pattern, formula_type in formula_patterns:
        matches = re.findall(pattern, code, re.IGNORECASE)
        for match in matches[:5]:
            formulas.append({
                'type': formula_type,
                'content': match if isinstance(match, str) else match[0]
            })
    
    return formulas

def find_algorithms_in_code(code):
    """Identify algorithms implemented in code."""
    algorithms = []
    
    algorithm_signatures = [
        ('PSO|particleSwarm|swarmOptimiz', 'Particle Swarm Optimization'),
        ('ACO|antColony|pheromone', 'Ant Colony Optimization'),
        ('genetic|GA_|crossover|mutation|fitness', 'Genetic Algorithm'),
        ('gradientDescent|gradient.*step', 'Gradient Descent'),
        ('simulatedAnnealing|temperature.*cool', 'Simulated Annealing'),
        ('newtonRaphson|jacobian', 'Newton-Raphson'),
        ('BFGS|hessian.*approx', 'BFGS Quasi-Newton'),
        ('bayesian|posterior|prior|likelihood', 'Bayesian Inference'),
        ('monteCarlo|randomSampl', 'Monte Carlo'),
        ('randomForest|decisionTree|ensemble', 'Random Forest/Ensemble'),
        ('neuralNetwork|activation|backprop', 'Neural Network'),
        ('kmeans|centroid|cluster', 'K-Means Clustering'),
        ('regression|leastSquares', 'Regression'),
        ('FFT|fourier|spectrum', 'Fast Fourier Transform'),
        ('kalman|stateEstim', 'Kalman Filter'),
        ('stabilityLobe|chatterFreq', 'Stability Lobe Analysis'),
        ('NSGA|pareto|domination', 'Multi-Objective NSGA'),
        ('convolution|pooling|CNN', 'Convolutional Neural Network'),
        ('LSTM|recurrent|GRU', 'Recurrent Neural Network'),
        ('transformer|attention|selfAttention', 'Transformer'),
        ('reinforcement|reward|policy', 'Reinforcement Learning'),
    ]
    
    for pattern, algo_name in algorithm_signatures:
        if re.search(pattern, code, re.IGNORECASE):
            algorithms.append(algo_name)
    
    return list(set(algorithms))

def extract_gateway_routes(content):
    """Extract all gateway routes for AI/ML modules."""
    routes = {}
    
    # Find route definitions
    route_pattern = r"'([a-z]+\.[a-z._]+)':\s*\{\s*module:\s*'([^']+)'"
    matches = re.findall(route_pattern, content)
    
    ai_keywords = ['ai', 'ml', 'neural', 'opt', 'learn', 'predict', 'bayesian', 'signal', 'rl']
    
    for route, module in matches:
        if any(kw in route.lower() for kw in ai_keywords):
            routes[route] = module
    
    return routes

def main():
    print("=" * 70)
    print("PRISM DEEP AI/ML/FORMULA EXTRACTOR v2.0")
    print("=" * 70)
    
    print(f"\nReading monolith from: {MONOLITH_PATH}")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    print(f"Monolith size: {len(content):,} characters")
    
    # Extract modules by category
    extraction_results = {}
    total_extracted = 0
    total_formulas = 0
    total_algorithms = set()
    
    for category, modules in TARGET_CATEGORIES.items():
        print(f"\n--- Extracting {category} ---")
        extraction_results[category] = {}
        
        for module_name in modules:
            code = extract_module_code(content, module_name)
            
            if code:
                formulas = find_formulas_in_code(code)
                algorithms = find_algorithms_in_code(code)
                total_algorithms.update(algorithms)
                
                extraction_results[category][module_name] = {
                    'found': True,
                    'code_length': len(code),
                    'formulas': formulas,
                    'algorithms': algorithms,
                    'code_preview': code[:500] + '...' if len(code) > 500 else code
                }
                total_extracted += 1
                total_formulas += len(formulas)
                print(f"  [OK] {module_name}: {len(code):,} chars, {len(formulas)} formulas, {len(algorithms)} algorithms")
            else:
                extraction_results[category][module_name] = {
                    'found': False,
                    'code_length': 0,
                    'formulas': [],
                    'algorithms': []
                }
                print(f"  [--] {module_name}: NOT FOUND")
    
    # Extract gateway routes
    print("\n--- Extracting Gateway Routes ---")
    gateway_routes = extract_gateway_routes(content)
    print(f"  Found {len(gateway_routes)} AI/ML related gateway routes")
    
    # Create summary
    summary = {
        'version': '2.0',
        'extracted_at': datetime.now().isoformat(),
        'source': str(MONOLITH_PATH),
        'statistics': {
            'total_modules_extracted': total_extracted,
            'total_formulas_found': total_formulas,
            'total_algorithms_found': len(total_algorithms),
            'gateway_routes': len(gateway_routes)
        },
        'algorithms_detected': sorted(list(total_algorithms)),
        'extraction_by_category': {
            cat: {
                'total': len(mods),
                'found': sum(1 for m in mods.values() if m.get('found', False)),
                'modules': list(mods.keys())
            }
            for cat, mods in extraction_results.items()
        },
        'gateway_routes': gateway_routes
    }
    
    # Print summary
    print("\n" + "=" * 70)
    print("EXTRACTION SUMMARY")
    print("=" * 70)
    print(f"\nTotal Modules Extracted: {total_extracted}")
    print(f"Total Formulas Found: {total_formulas}")
    print(f"Total Algorithms Detected: {len(total_algorithms)}")
    print(f"Gateway Routes: {len(gateway_routes)}")
    
    print("\nBy Category:")
    for cat, stats in summary['extraction_by_category'].items():
        print(f"  {cat}: {stats['found']}/{stats['total']} modules")
    
    print("\nAlgorithms Detected:")
    for algo in sorted(total_algorithms):
        print(f"  - {algo}")
    
    print("\nSample Gateway Routes:")
    for route, module in list(gateway_routes.items())[:15]:
        print(f"  {route} -> {module}")
    
    # Save results
    output_file = OUTPUT_DIR / 'AI_ML_FORMULA_EXTRACTION.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)
    print(f"\nSummary saved to: {output_file}")
    
    # Save detailed extraction
    detail_file = OUTPUT_DIR / 'AI_ML_DETAILED_EXTRACTION.json'
    with open(detail_file, 'w', encoding='utf-8') as f:
        json.dump(extraction_results, f, indent=2, default=str)
    print(f"Detailed extraction saved to: {detail_file}")
    
    return summary, extraction_results

if __name__ == '__main__':
    main()
