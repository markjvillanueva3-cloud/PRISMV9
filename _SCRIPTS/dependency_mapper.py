#!/usr/bin/env python3
"""
PRISM Dependency Mapper v1.0
Generates dependency graphs showing relationships between modules.

Usage:
    python dependency_mapper.py <extracted_dir>              - Generate dependency report
    python dependency_mapper.py <extracted_dir> --mermaid   - Output as Mermaid diagram
    python dependency_mapper.py <extracted_dir> --json      - Output as JSON
    python dependency_mapper.py <file> --single             - Analyze single file
"""

import os
import sys
import re
import json
from pathlib import Path
from datetime import datetime
from collections import defaultdict

def find_imports(content, file_type='js'):
    """Extract imports/requires from file content"""
    imports = []
    
    if file_type in ['js', 'jsx', 'ts', 'tsx']:
        # ES6 imports
        es6_pattern = r'import\s+(?:{[^}]+}|[\w*]+)\s+from\s+[\'"]([^\'"]+)[\'"]'
        imports.extend(re.findall(es6_pattern, content))
        
        # CommonJS require
        cjs_pattern = r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'
        imports.extend(re.findall(cjs_pattern, content))
        
        # Dynamic imports
        dyn_pattern = r'import\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'
        imports.extend(re.findall(dyn_pattern, content))
    
    elif file_type == 'py':
        # Python imports
        import_pattern = r'(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))'
        matches = re.findall(import_pattern, content)
        for m in matches:
            imports.append(m[0] or m[1])
    
    return imports

def find_exports(content, file_type='js'):
    """Extract exports from file content"""
    exports = []
    
    if file_type in ['js', 'jsx', 'ts', 'tsx']:
        # ES6 exports
        es6_pattern = r'export\s+(?:default\s+)?(?:const|let|var|function|class)\s+(\w+)'
        exports.extend(re.findall(es6_pattern, content))
        
        # module.exports
        cjs_pattern = r'module\.exports\s*=\s*(?:\{([^}]+)\}|(\w+))'
        matches = re.findall(cjs_pattern, content)
        for m in matches:
            if m[0]:
                # Extract names from object
                names = re.findall(r'\b(\w+)\b(?:\s*:\s*\w+)?', m[0])
                exports.extend(names)
            elif m[1]:
                exports.append(m[1])
        
        # exports.name
        named_pattern = r'exports\.(\w+)\s*='
        exports.extend(re.findall(named_pattern, content))
    
    return list(set(exports))

def find_references(content, known_modules):
    """Find references to known modules"""
    references = []
    
    for module in known_modules:
        # Look for various patterns
        patterns = [
            rf'\b{module}\b',
            rf'\b{module.replace("_", "")}\b',
            rf'\b{module.lower()}\b',
        ]
        
        for pattern in patterns:
            if re.search(pattern, content):
                references.append(module)
                break
    
    return list(set(references))

def analyze_file(file_path):
    """Analyze a single file for dependencies"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except:
        return None
    
    ext = file_path.suffix.lstrip('.')
    
    return {
        'path': str(file_path),
        'name': file_path.stem,
        'imports': find_imports(content, ext),
        'exports': find_exports(content, ext),
        'lines': len(content.split('\n')),
        'size_kb': round(os.path.getsize(file_path) / 1024, 2)
    }

def build_dependency_graph(extracted_dir):
    """Build complete dependency graph"""
    path = Path(extracted_dir)
    modules = {}
    
    # First pass: collect all modules
    for ext in ['*.js', '*.jsx', '*.ts', '*.tsx', '*.py']:
        for file_path in path.rglob(ext):
            if any(skip in str(file_path) for skip in ['node_modules', '.git', '__pycache__']):
                continue
            
            analysis = analyze_file(file_path)
            if analysis:
                rel_path = str(file_path.relative_to(path))
                modules[rel_path] = analysis
    
    # Second pass: resolve dependencies
    module_names = {m['name'] for m in modules.values()}
    
    for rel_path, mod in modules.items():
        # Find internal dependencies
        mod['internal_deps'] = []
        
        for imp in mod['imports']:
            # Normalize import path
            imp_name = Path(imp).stem
            
            # Check if it matches any known module
            for other_path, other_mod in modules.items():
                if other_mod['name'] == imp_name or imp_name in other_path:
                    mod['internal_deps'].append(other_path)
                    break
        
        # Find who depends on this module
        mod['dependents'] = []
        for other_path, other_mod in modules.items():
            if rel_path in other_mod.get('internal_deps', []):
                mod['dependents'].append(other_path)
    
    return modules

def find_circular_dependencies(modules):
    """Find circular dependency chains"""
    circular = []
    
    def find_cycles(start, current, visited, path):
        if current in visited:
            if current == start and len(path) > 1:
                circular.append(path[:])
            return
        
        visited.add(current)
        path.append(current)
        
        for dep in modules.get(current, {}).get('internal_deps', []):
            find_cycles(start, dep, visited.copy(), path[:])
    
    for mod_path in modules:
        find_cycles(mod_path, mod_path, set(), [])
    
    # Remove duplicates
    unique_circular = []
    seen = set()
    for cycle in circular:
        key = tuple(sorted(cycle))
        if key not in seen:
            seen.add(key)
            unique_circular.append(cycle)
    
    return unique_circular

def generate_mermaid(modules, max_nodes=50):
    """Generate Mermaid diagram"""
    diagram = ["graph TD"]
    
    # Limit to most connected modules
    by_connections = sorted(
        modules.items(),
        key=lambda x: len(x[1].get('internal_deps', [])) + len(x[1].get('dependents', [])),
        reverse=True
    )[:max_nodes]
    
    included = {path for path, _ in by_connections}
    
    for path, mod in by_connections:
        node_id = mod['name'].replace('-', '_').replace('.', '_')
        diagram.append(f"    {node_id}[{mod['name']}]")
        
        for dep in mod.get('internal_deps', []):
            if dep in included:
                dep_mod = modules[dep]
                dep_id = dep_mod['name'].replace('-', '_').replace('.', '_')
                diagram.append(f"    {node_id} --> {dep_id}")
    
    return '\n'.join(diagram)

def generate_report(modules, extracted_dir):
    """Generate dependency report"""
    total = len(modules)
    total_deps = sum(len(m.get('internal_deps', [])) for m in modules.values())
    avg_deps = total_deps / total if total > 0 else 0
    
    # Find modules with most dependencies
    most_deps = sorted(
        modules.items(),
        key=lambda x: len(x[1].get('internal_deps', [])),
        reverse=True
    )[:10]
    
    # Find most depended upon
    most_dependents = sorted(
        modules.items(),
        key=lambda x: len(x[1].get('dependents', [])),
        reverse=True
    )[:10]
    
    # Find orphans (no dependencies, no dependents)
    orphans = [
        (path, mod) for path, mod in modules.items()
        if not mod.get('internal_deps') and not mod.get('dependents')
    ]
    
    # Find circular dependencies
    circular = find_circular_dependencies(modules)
    
    report = f"""
╔══════════════════════════════════════════════════════════════╗
║              PRISM DEPENDENCY MAP REPORT                      ║
╠══════════════════════════════════════════════════════════════╣
║  Directory: {extracted_dir[:47]:<47} ║
║  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                            ║
╠══════════════════════════════════════════════════════════════╣
║  SUMMARY                                                      ║
║  ────────────────────────────────────────────────────────────║
║  Total Modules:      {total:4d}                                      ║
║  Total Dependencies: {total_deps:4d}                                      ║
║  Avg Deps/Module:    {avg_deps:4.1f}                                      ║
║  Orphan Modules:     {len(orphans):4d}                                      ║
║  Circular Deps:      {len(circular):4d}                                      ║
╠══════════════════════════════════════════════════════════════╣
║  MOST DEPENDENCIES (highest coupling)                         ║
║  ────────────────────────────────────────────────────────────║
"""
    
    for path, mod in most_deps[:7]:
        name = mod['name'][:35]
        deps = len(mod.get('internal_deps', []))
        report += f"║  {deps:3d} deps  {name:<48} ║\n"
    
    report += """╠══════════════════════════════════════════════════════════════╣
║  MOST DEPENDED UPON (critical modules)                        ║
║  ────────────────────────────────────────────────────────────║
"""
    
    for path, mod in most_dependents[:7]:
        name = mod['name'][:35]
        dependents = len(mod.get('dependents', []))
        report += f"║  {dependents:3d} users {name:<48} ║\n"
    
    if circular:
        report += """╠══════════════════════════════════════════════════════════════╣
║  ⚠️  CIRCULAR DEPENDENCIES                                    ║
║  ────────────────────────────────────────────────────────────║
"""
        for cycle in circular[:5]:
            cycle_str = ' → '.join([Path(p).stem for p in cycle[:4]])
            if len(cycle) > 4:
                cycle_str += f' → ... ({len(cycle)} total)'
            report += f"║  🔄 {cycle_str[:56]:<56} ║\n"
    
    if orphans:
        report += """╠══════════════════════════════════════════════════════════════╣
║  ORPHAN MODULES (no connections)                              ║
║  ────────────────────────────────────────────────────────────║
"""
        for path, mod in orphans[:10]:
            name = mod['name'][:55]
            report += f"║  • {name:<56} ║\n"
    
    report += "╚══════════════════════════════════════════════════════════════╝\n"
    
    return report

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    target = sys.argv[1]
    
    if '--single' in sys.argv and os.path.isfile(target):
        analysis = analyze_file(Path(target))
        if analysis:
            print(json.dumps(analysis, indent=2))
    
    elif os.path.isdir(target):
        modules = build_dependency_graph(target)
        
        if '--mermaid' in sys.argv:
            print(generate_mermaid(modules))
        elif '--json' in sys.argv:
            print(json.dumps(modules, indent=2))
        else:
            print(generate_report(modules, target))
    
    else:
        print(f"Error: {target} not found")
        sys.exit(1)
