#!/usr/bin/env python3
"""
PRISM Dependency Mapper (T.2.3)
Maps module dependencies - what each module needs and provides.

Features:
- Scans for PRISM_* references
- Builds dependency graph
- Identifies circular dependencies
- Documents exports/imports per module
"""

import sys
import re
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional, Tuple
from collections import defaultdict
import logging

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.config import PATHS
from core.logger import setup_logger
from core.utils import load_json, save_json

logger = setup_logger(__name__)


@dataclass
class ModuleExport:
    """Something a module provides/exports."""
    name: str
    export_type: str  # 'function', 'class', 'constant', 'object', 'database'
    line_number: int = 0


@dataclass
class ModuleImport:
    """Something a module imports/requires."""
    module_name: str
    items_used: List[str] = field(default_factory=list)
    line_numbers: List[int] = field(default_factory=list)
    access_patterns: List[str] = field(default_factory=list)  # e.g., '.get()', '.calculate()'


@dataclass
class ModuleDependencies:
    """Complete dependency info for a module."""
    module_name: str
    source_file: str
    line_start: int = 0
    line_end: int = 0
    
    # What this module provides
    exports: List[ModuleExport] = field(default_factory=list)
    
    # What this module requires
    imports: List[ModuleImport] = field(default_factory=list)
    
    # Dependency summary
    depends_on: Set[str] = field(default_factory=set)
    depended_by: Set[str] = field(default_factory=set)
    
    @property
    def dependency_count(self) -> int:
        return len(self.depends_on)
    
    @property
    def dependent_count(self) -> int:
        return len(self.depended_by)


@dataclass
class DependencyGraph:
    """Complete dependency graph for all modules."""
    timestamp: str = ""
    source_path: str = ""
    modules: Dict[str, ModuleDependencies] = field(default_factory=dict)
    circular_dependencies: List[List[str]] = field(default_factory=list)
    
    @property
    def module_count(self) -> int:
        return len(self.modules)
    
    def get_dependency_order(self) -> List[str]:
        """Return modules in dependency order (dependencies first)."""
        # Topological sort
        visited = set()
        order = []
        
        def visit(name: str, path: Set[str] = None):
            if path is None:
                path = set()
            if name in path:
                return  # Circular dependency
            if name in visited:
                return
            
            path.add(name)
            if name in self.modules:
                for dep in self.modules[name].depends_on:
                    visit(dep, path.copy())
            visited.add(name)
            order.append(name)
        
        for name in self.modules:
            visit(name)
        
        return order


class DependencyMapper:
    """
    Maps dependencies between PRISM modules.
    
    Scans code for:
    - window.PRISM_* assignments (exports)
    - PRISM_*.method() calls (imports)
    - const PRISM_* definitions
    """
    
    # Patterns for detecting PRISM modules
    PATTERNS = {
        # Exports
        'window_export': re.compile(r'window\.(PRISM_[A-Z0-9_]+)\s*='),
        'const_export': re.compile(r'const\s+(PRISM_[A-Z0-9_]+)\s*='),
        'let_export': re.compile(r'let\s+(PRISM_[A-Z0-9_]+)\s*='),
        
        # Imports/Usage
        'module_call': re.compile(r'(PRISM_[A-Z0-9_]+)\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\('),
        'module_access': re.compile(r'(PRISM_[A-Z0-9_]+)\.([a-zA-Z_][a-zA-Z0-9_]*)'),
        'module_ref': re.compile(r'\b(PRISM_[A-Z0-9_]+)\b'),
        
        # Function definitions
        'function_def': re.compile(r'function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\('),
        'arrow_function': re.compile(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>'),
        'method_def': re.compile(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{'),
    }
    
    def __init__(self):
        self.logger = setup_logger(self.__class__.__name__)
    
    def map_file(self, filepath: Path) -> List[ModuleDependencies]:
        """Map dependencies in a single file."""
        content = filepath.read_text(encoding='utf-8', errors='replace')
        lines = content.split('\n')
        
        modules = []
        current_module = None
        current_start = 0
        
        for line_num, line in enumerate(lines, 1):
            # Check for module definition start
            window_match = self.PATTERNS['window_export'].search(line)
            const_match = self.PATTERNS['const_export'].search(line)
            
            module_name = None
            if window_match:
                module_name = window_match.group(1)
            elif const_match:
                module_name = const_match.group(1)
            
            if module_name:
                # Save previous module if exists
                if current_module:
                    current_module.line_end = line_num - 1
                    modules.append(current_module)
                
                # Start new module
                current_module = ModuleDependencies(
                    module_name=module_name,
                    source_file=str(filepath),
                    line_start=line_num
                )
                current_start = line_num
            
            # Scan for dependencies in current module context
            if current_module:
                self._scan_line_for_imports(line, line_num, current_module)
        
        # Don't forget the last module
        if current_module:
            current_module.line_end = len(lines)
            modules.append(current_module)
        
        # Post-process: remove self-references
        for mod in modules:
            mod.depends_on.discard(mod.module_name)
        
        return modules
    
    def _scan_line_for_imports(self, line: str, line_num: int, module: ModuleDependencies):
        """Scan a line for module imports/usage."""
        # Skip comments
        if line.strip().startswith('//'):
            return
        
        # Find all PRISM_* references
        for match in self.PATTERNS['module_ref'].finditer(line):
            ref_name = match.group(1)
            
            # Skip if it's this module itself
            if ref_name == module.module_name:
                continue
            
            # Add to dependencies
            module.depends_on.add(ref_name)
            
            # Find or create import record
            import_record = None
            for imp in module.imports:
                if imp.module_name == ref_name:
                    import_record = imp
                    break
            
            if not import_record:
                import_record = ModuleImport(module_name=ref_name)
                module.imports.append(import_record)
            
            import_record.line_numbers.append(line_num)
            
            # Check for method calls
            call_match = self.PATTERNS['module_call'].search(line)
            if call_match and call_match.group(1) == ref_name:
                method = call_match.group(2)
                if method not in import_record.items_used:
                    import_record.items_used.append(method)
                import_record.access_patterns.append(f'.{method}()')
    
    def map_directory(self, directory: Path, recursive: bool = True) -> DependencyGraph:
        """Map dependencies for all files in a directory."""
        from datetime import datetime
        
        graph = DependencyGraph(
            timestamp=datetime.now().isoformat(),
            source_path=str(directory)
        )
        
        pattern = '**/*.js' if recursive else '*.js'
        files = list(directory.glob(pattern))
        
        # Also check HTML files (monolith)
        files.extend(directory.glob('**/*.html' if recursive else '*.html'))
        
        self.logger.info(f"Scanning {len(files)} files in {directory}")
        
        for filepath in files:
            try:
                modules = self.map_file(filepath)
                for mod in modules:
                    if mod.module_name in graph.modules:
                        # Merge with existing
                        existing = graph.modules[mod.module_name]
                        existing.depends_on.update(mod.depends_on)
                        existing.imports.extend(mod.imports)
                    else:
                        graph.modules[mod.module_name] = mod
            except Exception as e:
                self.logger.warning(f"Error processing {filepath}: {e}")
        
        # Build reverse dependencies (depended_by)
        for name, mod in graph.modules.items():
            for dep_name in mod.depends_on:
                if dep_name in graph.modules:
                    graph.modules[dep_name].depended_by.add(name)
        
        # Find circular dependencies
        graph.circular_dependencies = self._find_circular(graph)
        
        self.logger.info(f"Mapped {graph.module_count} modules")
        if graph.circular_dependencies:
            self.logger.warning(f"Found {len(graph.circular_dependencies)} circular dependencies")
        
        return graph
    
    def _find_circular(self, graph: DependencyGraph) -> List[List[str]]:
        """Find circular dependency chains."""
        circular = []
        visited = set()
        
        def dfs(node: str, path: List[str]):
            if node in path:
                # Found cycle
                cycle_start = path.index(node)
                cycle = path[cycle_start:] + [node]
                # Normalize cycle (start from alphabetically first)
                min_idx = cycle.index(min(cycle[:-1]))
                normalized = cycle[min_idx:-1] + cycle[:min_idx] + [cycle[min_idx]]
                if normalized not in circular:
                    circular.append(normalized)
                return
            
            if node in visited:
                return
            
            visited.add(node)
            path.append(node)
            
            if node in graph.modules:
                for dep in graph.modules[node].depends_on:
                    dfs(dep, path.copy())
        
        for name in graph.modules:
            dfs(name, [])
        
        return circular
    
    def generate_report(self, graph: DependencyGraph) -> str:
        """Generate dependency report."""
        lines = []
        lines.append("=" * 70)
        lines.append("PRISM DEPENDENCY MAP")
        lines.append("=" * 70)
        lines.append(f"Generated: {graph.timestamp}")
        lines.append(f"Source: {graph.source_path}")
        lines.append(f"Modules Found: {graph.module_count}")
        lines.append("")
        
        # Circular dependencies (CRITICAL)
        if graph.circular_dependencies:
            lines.append("-" * 40)
            lines.append("⚠ CIRCULAR DEPENDENCIES DETECTED")
            lines.append("-" * 40)
            for cycle in graph.circular_dependencies:
                lines.append(f"  {' → '.join(cycle)}")
            lines.append("")
        
        # High-dependency modules (potential God objects)
        high_dep = [(name, mod) for name, mod in graph.modules.items() 
                    if mod.dependency_count > 10]
        if high_dep:
            lines.append("-" * 40)
            lines.append("HIGH DEPENDENCY MODULES (>10 deps)")
            lines.append("-" * 40)
            for name, mod in sorted(high_dep, key=lambda x: -x[1].dependency_count):
                lines.append(f"  {name}: {mod.dependency_count} dependencies")
            lines.append("")
        
        # Core modules (most depended on)
        lines.append("-" * 40)
        lines.append("CORE MODULES (Most Depended On)")
        lines.append("-" * 40)
        core = [(name, mod) for name, mod in graph.modules.items()]
        core.sort(key=lambda x: -x[1].dependent_count)
        for name, mod in core[:20]:
            if mod.dependent_count > 0:
                lines.append(f"  {name}: {mod.dependent_count} dependents")
        lines.append("")
        
        # Leaf modules (no dependencies)
        leaves = [name for name, mod in graph.modules.items() 
                  if mod.dependency_count == 0]
        if leaves:
            lines.append("-" * 40)
            lines.append("LEAF MODULES (No Dependencies)")
            lines.append("-" * 40)
            for name in sorted(leaves):
                lines.append(f"  {name}")
            lines.append("")
        
        # Orphan modules (no dependents)
        orphans = [name for name, mod in graph.modules.items() 
                   if mod.dependent_count == 0 and mod.dependency_count > 0]
        if orphans:
            lines.append("-" * 40)
            lines.append("⚠ ORPHAN MODULES (Nothing Depends On Them)")
            lines.append("-" * 40)
            for name in sorted(orphans):
                lines.append(f"  {name}")
            lines.append("")
        
        # Build order
        lines.append("-" * 40)
        lines.append("SUGGESTED BUILD ORDER")
        lines.append("-" * 40)
        order = graph.get_dependency_order()
        for i, name in enumerate(order[:30], 1):
            lines.append(f"  {i:3}. {name}")
        if len(order) > 30:
            lines.append(f"  ... and {len(order) - 30} more")
        
        lines.append("\n" + "=" * 70)
        lines.append("END OF REPORT")
        lines.append("=" * 70)
        
        return "\n".join(lines)
    
    def save_graph(self, graph: DependencyGraph, output_path: Path):
        """Save dependency graph as JSON."""
        data = {
            'timestamp': graph.timestamp,
            'source_path': graph.source_path,
            'module_count': graph.module_count,
            'circular_dependencies': graph.circular_dependencies,
            'modules': {
                name: {
                    'source_file': mod.source_file,
                    'line_start': mod.line_start,
                    'line_end': mod.line_end,
                    'depends_on': list(mod.depends_on),
                    'depended_by': list(mod.depended_by),
                    'dependency_count': mod.dependency_count,
                    'dependent_count': mod.dependent_count,
                    'imports': [
                        {
                            'module': imp.module_name,
                            'items_used': imp.items_used,
                            'access_patterns': list(set(imp.access_patterns))
                        }
                        for imp in mod.imports
                    ]
                }
                for name, mod in graph.modules.items()
            }
        }
        save_json(data, output_path)


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for dependency mapper."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Dependency Mapper')
    parser.add_argument('path', nargs='?', default='.', help='Directory or file to scan')
    parser.add_argument('--report', type=str, help='Save text report to file')
    parser.add_argument('--json', type=str, help='Save JSON graph to file')
    parser.add_argument('--no-recursive', action='store_true', help="Don't scan subdirectories")
    parser.add_argument('--module', type=str, help='Show dependencies for specific module')
    
    args = parser.parse_args()
    
    mapper = DependencyMapper()
    path = Path(args.path)
    
    if path.is_file():
        # Single file
        modules = mapper.map_file(path)
        for mod in modules:
            print(f"\n{mod.module_name}:")
            print(f"  Depends on: {', '.join(sorted(mod.depends_on)) or 'Nothing'}")
    else:
        # Directory
        graph = mapper.map_directory(path, recursive=not args.no_recursive)
        
        if args.module:
            # Show specific module
            if args.module in graph.modules:
                mod = graph.modules[args.module]
                print(f"\n{mod.module_name}:")
                print(f"  Source: {mod.source_file} (lines {mod.line_start}-{mod.line_end})")
                print(f"  Depends on ({mod.dependency_count}):")
                for dep in sorted(mod.depends_on):
                    print(f"    - {dep}")
                print(f"  Depended by ({mod.dependent_count}):")
                for dep in sorted(mod.depended_by):
                    print(f"    - {dep}")
            else:
                print(f"Module not found: {args.module}")
        else:
            # Full report
            text_report = mapper.generate_report(graph)
            print(text_report)
            
            if args.report:
                with open(args.report, 'w', encoding='utf-8') as f:
                    f.write(text_report)
                print(f"\nText report saved to: {args.report}")
            
            if args.json:
                mapper.save_graph(graph, Path(args.json))
                print(f"JSON graph saved to: {args.json}")


if __name__ == "__main__":
    main()
