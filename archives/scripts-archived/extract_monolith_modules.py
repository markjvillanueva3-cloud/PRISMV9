#!/usr/bin/env python3
"""
PRISM Monolith Module Extractor v1.0
Extracts all AI/ML, formulas, algorithms, and engines from the v8.89 monolith.
Creates an inventory for skill conversion.
"""

import re
import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime

MONOLITH_PATH = Path(r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html")
OUTPUT_DIR = Path(r"C:\PRISM\extracted_modules")
OUTPUT_DIR.mkdir(exist_ok=True)

def extract_modules():
    """Extract all PRISM modules from monolith."""
    print(f"Reading monolith from: {MONOLITH_PATH}")
    
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    print(f"Monolith size: {len(content):,} characters")
    
    # Patterns to find different module types
    patterns = {
        'const_modules': r'const\s+(PRISM_[A-Z0-9_]+)\s*=\s*\{',
        'window_modules': r'window\.(PRISM_[A-Z0-9_]+)\s*=',
        'class_modules': r'class\s+(PRISM_[A-Z0-9_]+)',
        'function_modules': r'function\s+(PRISM_[A-Z0-9_]+)\s*\(',
    }
    
    modules = defaultdict(set)
    
    for pattern_name, pattern in patterns.items():
        matches = re.findall(pattern, content)
        for match in matches:
            modules[pattern_name].add(match)
    
    return modules, content

def categorize_modules(modules):
    """Categorize modules by type."""
    categories = {
        'AI_ML': [],
        'NEURAL_DEEP_LEARNING': [],
        'OPTIMIZATION': [],
        'PHYSICS_FORMULAS': [],
        'SIGNAL_PROCESSING': [],
        'ENGINES': [],
        'DATABASES': [],
        'CALCULATORS': [],
        'UTILITIES': [],
        'OTHER': []
    }
    
    all_modules = set()
    for module_set in modules.values():
        all_modules.update(module_set)
    
    ai_keywords = ['ML', 'AI', 'LEARNING', 'BAYESIAN', 'GAUSSIAN', 'ENSEMBLE', 'CLUSTER', 'REGRESS', 'CLASSIF']
    neural_keywords = ['NEURAL', 'DEEP', 'CNN', 'RNN', 'LSTM', 'TRANSFORMER', 'NETWORK']
    opt_keywords = ['OPTIM', 'PSO', 'ACO', 'GENETIC', 'GRADIENT', 'NEWTON', 'BFGS', 'PARETO', 'NSGA']
    physics_keywords = ['TAYLOR', 'KIENZLE', 'MERCHANT', 'FORCE', 'THERMAL', 'HEAT', 'JOHNSON_COOK', 'VIBRATION', 'CHATTER']
    signal_keywords = ['SIGNAL', 'FFT', 'FILTER', 'BUTTER', 'KALMAN', 'SPECTRAL']
    engine_keywords = ['ENGINE', 'PROCESSOR', 'ANALYZER']
    db_keywords = ['DATABASE', 'DB', 'LOOKUP', 'CATALOG', 'MATERIALS', 'MACHINES', 'TOOLS']
    calc_keywords = ['CALCULATOR', 'CALC', 'COMPUTE']
    
    for module in sorted(all_modules):
        upper = module.upper()
        
        if any(kw in upper for kw in neural_keywords):
            categories['NEURAL_DEEP_LEARNING'].append(module)
        elif any(kw in upper for kw in ai_keywords):
            categories['AI_ML'].append(module)
        elif any(kw in upper for kw in opt_keywords):
            categories['OPTIMIZATION'].append(module)
        elif any(kw in upper for kw in physics_keywords):
            categories['PHYSICS_FORMULAS'].append(module)
        elif any(kw in upper for kw in signal_keywords):
            categories['SIGNAL_PROCESSING'].append(module)
        elif any(kw in upper for kw in engine_keywords):
            categories['ENGINES'].append(module)
        elif any(kw in upper for kw in db_keywords):
            categories['DATABASES'].append(module)
        elif any(kw in upper for kw in calc_keywords):
            categories['CALCULATORS'].append(module)
        elif 'UTIL' in upper or 'HELPER' in upper or 'LOOKUP' in upper:
            categories['UTILITIES'].append(module)
        else:
            categories['OTHER'].append(module)
    
    return categories

def find_formulas(content):
    """Find mathematical formulas and equations."""
    formulas = []
    
    # Look for formula patterns
    formula_patterns = [
        r'//\s*Formula[:\s]+([^\n]+)',
        r'//\s*Equation[:\s]+([^\n]+)',
        r'//\s*([A-Za-z]+\s*=\s*[^/\n]{10,})',
        r'Taylor.*equation',
        r'Kienzle.*formula',
        r'Johnson.?Cook',
        r'Merchant.*angle',
        r'specific cutting force',
        r'tool life',
        r'surface finish',
        r'MRR\s*=',
        r'power\s*=',
        r'force\s*=',
        r'kc\s*=',
        r'Vc\s*=',
    ]
    
    for pattern in formula_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        formulas.extend(matches[:20])  # Limit per pattern
    
    return list(set(formulas))[:100]

def find_algorithms(content):
    """Find algorithm implementations."""
    algorithms = []
    
    # Algorithm patterns
    alg_patterns = [
        (r'PSO|particle swarm', 'Particle Swarm Optimization'),
        (r'ACO|ant colony', 'Ant Colony Optimization'),
        (r'genetic algorithm|GA_', 'Genetic Algorithm'),
        (r'gradient descent|gradientDescent', 'Gradient Descent'),
        (r'simulated annealing', 'Simulated Annealing'),
        (r'Newton.*method|newtonRaphson', 'Newton-Raphson'),
        (r'BFGS|quasi-Newton', 'BFGS Optimization'),
        (r'bayesian|Bayesian', 'Bayesian Inference'),
        (r'monte carlo|monteCarlo', 'Monte Carlo'),
        (r'random forest|randomForest', 'Random Forest'),
        (r'neural network|neuralNetwork', 'Neural Network'),
        (r'k-means|kmeans', 'K-Means Clustering'),
        (r'regression|linearRegression', 'Regression'),
        (r'FFT|fourier', 'Fast Fourier Transform'),
        (r'Kalman|kalmanFilter', 'Kalman Filter'),
        (r'stability lobe|stabilityLobe', 'Stability Lobe Analysis'),
        (r'Taylor.*tool life', 'Taylor Tool Life'),
        (r'Kienzle|specific cutting', 'Kienzle Cutting Force'),
        (r'Merchant.*angle', 'Merchant Shear Angle'),
        (r'NSGA|MOEA|pareto', 'Multi-Objective Optimization'),
    ]
    
    for pattern, name in alg_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            algorithms.append(name)
    
    return list(set(algorithms))

def extract_gateway_routes(content):
    """Extract gateway route definitions."""
    routes = []
    
    # Find route patterns
    route_pattern = r"'([a-z]+\.[a-z.]+)':\s*\{\s*module:\s*'([^']+)'"
    matches = re.findall(route_pattern, content)
    
    for route, module in matches[:200]:
        routes.append({'route': route, 'module': module})
    
    return routes

def main():
    print("=" * 70)
    print("PRISM MONOLITH MODULE EXTRACTOR v1.0")
    print("=" * 70)
    
    # Extract modules
    modules, content = extract_modules()
    
    # Categorize
    categories = categorize_modules(modules)
    
    # Find formulas and algorithms
    formulas = find_formulas(content)
    algorithms = find_algorithms(content)
    
    # Extract gateway routes
    routes = extract_gateway_routes(content)
    
    # Create inventory
    inventory = {
        'version': '1.0',
        'extracted_at': datetime.now().isoformat(),
        'source': str(MONOLITH_PATH),
        'statistics': {
            'total_modules': sum(len(v) for v in modules.values()),
            'unique_modules': len(set().union(*modules.values())),
            'formulas_found': len(formulas),
            'algorithms_found': len(algorithms),
            'gateway_routes': len(routes)
        },
        'modules_by_type': {k: list(v) for k, v in modules.items()},
        'modules_by_category': {k: v for k, v in categories.items() if v},
        'algorithms': algorithms,
        'gateway_routes': routes[:100]
    }
    
    # Print summary
    print(f"\nMODULE EXTRACTION SUMMARY:")
    print(f"  Total modules found: {inventory['statistics']['total_modules']}")
    print(f"  Unique modules: {inventory['statistics']['unique_modules']}")
    print(f"  Formulas found: {len(formulas)}")
    print(f"  Algorithms found: {len(algorithms)}")
    print(f"  Gateway routes: {len(routes)}")
    
    print(f"\nMODULES BY CATEGORY:")
    for cat, mods in categories.items():
        if mods:
            print(f"  {cat}: {len(mods)}")
    
    print(f"\nAI/ML MODULES ({len(categories['AI_ML'])}):")
    for mod in sorted(categories['AI_ML'])[:20]:
        print(f"    - {mod}")
    
    print(f"\nNEURAL/DEEP LEARNING ({len(categories['NEURAL_DEEP_LEARNING'])}):")
    for mod in sorted(categories['NEURAL_DEEP_LEARNING'])[:20]:
        print(f"    - {mod}")
    
    print(f"\nOPTIMIZATION ({len(categories['OPTIMIZATION'])}):")
    for mod in sorted(categories['OPTIMIZATION'])[:20]:
        print(f"    - {mod}")
    
    print(f"\nPHYSICS/FORMULAS ({len(categories['PHYSICS_FORMULAS'])}):")
    for mod in sorted(categories['PHYSICS_FORMULAS'])[:20]:
        print(f"    - {mod}")
    
    print(f"\nALGORITHMS DETECTED:")
    for alg in sorted(algorithms):
        print(f"    - {alg}")
    
    # Save inventory
    output_file = OUTPUT_DIR / 'MONOLITH_MODULE_INVENTORY.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(inventory, f, indent=2)
    print(f"\nInventory saved to: {output_file}")
    
    # Save categorized list
    cat_file = OUTPUT_DIR / 'MODULES_BY_CATEGORY.json'
    with open(cat_file, 'w', encoding='utf-8') as f:
        json.dump(categories, f, indent=2)
    print(f"Categories saved to: {cat_file}")
    
    return inventory

if __name__ == '__main__':
    main()
