# PRISM Automation Toolkit - Monolith Indexer
# Version: 1.0.0
# Created: 2026-01-23
#
# Creates a searchable index of all modules in the 986K-line monolith.
# Pre-builds an index for fast module lookup without re-scanning.

import sys
import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS, MONOLITH_CONSTANTS
from core.logger import setup_logger, ProgressLogger
from core.utils import save_json, load_json, timestamp


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class ModuleInfo:
    """Information about a single module."""
    name: str
    start_line: int
    end_line: int
    line_count: int
    category: str = ''
    subcategory: str = ''
    type: str = ''  # database, engine, system, etc.
    dependencies: List[str] = field(default_factory=list)
    exports: List[str] = field(default_factory=list)
    description: str = ''
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class MonolithIndex:
    """Complete index of the monolith."""
    version: str
    monolith_path: str
    total_lines: int
    total_modules: int
    created: str
    modules: Dict[str, ModuleInfo] = field(default_factory=dict)
    categories: Dict[str, List[str]] = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            'version': self.version,
            'monolith_path': self.monolith_path,
            'total_lines': self.total_lines,
            'total_modules': self.total_modules,
            'created': self.created,
            'modules': {k: v.to_dict() for k, v in self.modules.items()},
            'categories': self.categories
        }


# =============================================================================
# MODULE PATTERNS
# =============================================================================

# Patterns for detecting different module types
MODULE_PATTERNS = {
    # Window assignments (most common in monolith)
    'window_assign': r'^window\.(PRISM_[A-Z0-9_]+)\s*=\s*\{',
    
    # Const declarations
    'const_declare': r'^const\s+(PRISM_[A-Z0-9_]+)\s*=\s*\{',
    
    # Let declarations
    'let_declare': r'^let\s+(PRISM_[A-Z0-9_]+)\s*=\s*\{',
    
    # Function declarations
    'function_declare': r'^function\s+(PRISM_[A-Z0-9_]+)\s*\(',
    
    # Class declarations
    'class_declare': r'^class\s+(PRISM_[A-Z0-9_]+)\s*',
    
    # IIFE modules
    'iife_module': r'^\(function\s*\(\)\s*\{[\s\S]*?window\.(PRISM_[A-Z0-9_]+)',
}

# Category detection based on module name patterns
CATEGORY_PATTERNS = {
    'databases': [
        r'DATABASE', r'_DB$', r'_DB_', r'CATALOG', r'REGISTRY'
    ],
    'engines': [
        r'ENGINE', r'_ENGINE$', r'CALCULATOR', r'OPTIMIZER', r'ANALYZER',
        r'PREDICTOR', r'GENERATOR', r'PROCESSOR'
    ],
    'knowledge_bases': [
        r'KNOWLEDGE', r'_KB$', r'_KB_'
    ],
    'systems': [
        r'GATEWAY', r'_BUS$', r'_STORE$', r'MANAGER', r'HANDLER',
        r'ORCHESTRATOR', r'COORDINATOR'
    ],
    'ui': [
        r'^UI_', r'_UI$', r'MODAL', r'FORM', r'CHART', r'COMPONENT'
    ],
    'learning': [
        r'LEARNING', r'NEURAL', r'BAYESIAN', r'_ML_', r'TRAINING'
    ],
    'physics': [
        r'THERMAL', r'FORCE', r'STRESS', r'VIBRATION', r'CHATTER',
        r'DEFLECTION', r'DYNAMICS'
    ],
    'cad_cam': [
        r'CAD', r'CAM', r'TOOLPATH', r'GEOMETRY', r'MESH', r'NURBS'
    ],
    'post_processor': [
        r'POST_', r'_POST$', r'GCODE', r'G_CODE'
    ],
    'materials': [
        r'MATERIAL', r'STEEL', r'ALUMINUM', r'METAL'
    ],
    'machines': [
        r'MACHINE', r'LATHE', r'MILL', r'CNC'
    ],
    'tools': [
        r'TOOL', r'CUTTING', r'INSERT', r'ENDMILL'
    ]
}


# =============================================================================
# MONOLITH INDEXER
# =============================================================================

class MonolithIndexer:
    """
    Indexes the PRISM monolith file for fast module lookup.
    Creates a JSON index file that maps module names to line numbers.
    """
    
    def __init__(self, monolith_path: Path = None):
        self.monolith_path = monolith_path or PATHS['monolith']
        self.logger = setup_logger('MonolithIndexer')
        self.index = None
    
    def scan_monolith(self, save_index: bool = True) -> MonolithIndex:
        """
        Scan the entire monolith and build an index.
        This is expensive (~30s for 986K lines) so we save the result.
        """
        self.logger.info(f"Scanning monolith: {self.monolith_path}")
        
        if not self.monolith_path.exists():
            raise FileNotFoundError(f"Monolith not found: {self.monolith_path}")
        
        # Initialize index
        self.index = MonolithIndex(
            version='1.0.0',
            monolith_path=str(self.monolith_path),
            total_lines=0,
            total_modules=0,
            created=timestamp()
        )
        
        # Compile patterns
        patterns = {name: re.compile(pattern, re.MULTILINE) 
                    for name, pattern in MODULE_PATTERNS.items()}
        
        # Read and scan
        with open(self.monolith_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        
        self.index.total_lines = len(lines)
        self.logger.info(f"Total lines: {len(lines)}")
        
        # Track module boundaries
        current_module = None
        brace_depth = 0
        in_module = False
        
        progress = ProgressLogger('Scanning', len(lines) // 10000)
        
        for line_num, line in enumerate(lines, 1):
            # Progress update every 10K lines
            if line_num % 10000 == 0:
                progress.update(f"Line {line_num}")
            
            # Check for module start
            for pattern_name, pattern in patterns.items():
                match = pattern.match(line)
                if match:
                    module_name = match.group(1)
                    
                    # Skip if we already have this module (avoid duplicates)
                    if module_name in self.index.modules:
                        continue
                    
                    # Create module info
                    module_info = ModuleInfo(
                        name=module_name,
                        start_line=line_num,
                        end_line=line_num,  # Will be updated
                        line_count=1,
                        type=self._detect_type(pattern_name),
                        category=self._detect_category(module_name)
                    )
                    
                    self.index.modules[module_name] = module_info
                    current_module = module_name
                    in_module = True
                    brace_depth = line.count('{') - line.count('}')
                    break
            
            # Track module end (brace matching)
            if in_module and current_module:
                brace_depth += line.count('{') - line.count('}')
                
                if brace_depth <= 0:
                    # Module ended
                    self.index.modules[current_module].end_line = line_num
                    self.index.modules[current_module].line_count = (
                        line_num - self.index.modules[current_module].start_line + 1
                    )
                    in_module = False
                    current_module = None
        
        progress.complete()
        
        # Build category index
        self._build_category_index()
        
        self.index.total_modules = len(self.index.modules)
        self.logger.info(f"Indexed {self.index.total_modules} modules")
        
        # Save index
        if save_index:
            index_path = PATHS['scripts'] / 'extraction' / 'monolith_index.json'
            save_json(self.index.to_dict(), index_path)
            self.logger.info(f"Index saved to: {index_path}")
        
        return self.index
    
    def load_index(self, index_path: Path = None) -> MonolithIndex:
        """Load a previously built index."""
        index_path = index_path or PATHS['scripts'] / 'extraction' / 'monolith_index.json'
        
        if not index_path.exists():
            self.logger.warning("No index found, building new index...")
            return self.scan_monolith()
        
        data = load_json(index_path)
        
        # Reconstruct index
        self.index = MonolithIndex(
            version=data['version'],
            monolith_path=data['monolith_path'],
            total_lines=data['total_lines'],
            total_modules=data['total_modules'],
            created=data['created'],
            modules={
                name: ModuleInfo(**info) 
                for name, info in data['modules'].items()
            },
            categories=data['categories']
        )
        
        self.logger.info(f"Loaded index with {self.index.total_modules} modules")
        return self.index
    
    def _detect_type(self, pattern_name: str) -> str:
        """Detect module type from pattern."""
        if 'function' in pattern_name:
            return 'function'
        elif 'class' in pattern_name:
            return 'class'
        elif 'iife' in pattern_name:
            return 'iife'
        else:
            return 'object'
    
    def _detect_category(self, module_name: str) -> str:
        """Detect category from module name."""
        for category, patterns in CATEGORY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, module_name, re.IGNORECASE):
                    return category
        return 'other'
    
    def _build_category_index(self):
        """Build reverse index from category to modules."""
        self.index.categories = {}
        
        for module_name, module_info in self.index.modules.items():
            category = module_info.category
            if category not in self.index.categories:
                self.index.categories[category] = []
            self.index.categories[category].append(module_name)
    
    def find_module(self, name: str) -> Optional[ModuleInfo]:
        """Find a module by exact name."""
        if not self.index:
            self.load_index()
        return self.index.modules.get(name)
    
    def search_modules(self, pattern: str) -> List[ModuleInfo]:
        """Search modules by regex pattern."""
        if not self.index:
            self.load_index()
        
        regex = re.compile(pattern, re.IGNORECASE)
        results = []
        
        for name, info in self.index.modules.items():
            if regex.search(name):
                results.append(info)
        
        return sorted(results, key=lambda x: x.name)
    
    def get_modules_by_category(self, category: str) -> List[ModuleInfo]:
        """Get all modules in a category."""
        if not self.index:
            self.load_index()
        
        module_names = self.index.categories.get(category, [])
        return [self.index.modules[name] for name in module_names]
    
    def print_summary(self):
        """Print index summary."""
        if not self.index:
            self.load_index()
        
        print(f"\n{'='*60}")
        print(f"PRISM MONOLITH INDEX")
        print(f"{'='*60}")
        print(f"Monolith: {self.index.monolith_path}")
        print(f"Total Lines: {self.index.total_lines:,}")
        print(f"Total Modules: {self.index.total_modules}")
        print(f"Created: {self.index.created}")
        print(f"\nModules by Category:")
        for category, modules in sorted(self.index.categories.items()):
            print(f"  {category}: {len(modules)}")


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for monolith indexer."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Monolith Indexer')
    parser.add_argument('--scan', action='store_true', help='Scan monolith and build index')
    parser.add_argument('--find', type=str, metavar='NAME', help='Find module by exact name')
    parser.add_argument('--search', type=str, metavar='PATTERN', help='Search modules by pattern')
    parser.add_argument('--category', type=str, help='List modules in category')
    parser.add_argument('--summary', action='store_true', help='Print index summary')
    
    args = parser.parse_args()
    
    indexer = MonolithIndexer()
    
    if args.scan:
        indexer.scan_monolith()
    elif args.find:
        module = indexer.find_module(args.find)
        if module:
            print(f"\n{module.name}")
            print(f"  Lines: {module.start_line}-{module.end_line} ({module.line_count} lines)")
            print(f"  Category: {module.category}")
            print(f"  Type: {module.type}")
        else:
            print(f"Module not found: {args.find}")
    elif args.search:
        modules = indexer.search_modules(args.search)
        print(f"\nFound {len(modules)} modules matching '{args.search}':")
        for m in modules[:20]:  # Limit output
            print(f"  {m.name} (lines {m.start_line}-{m.end_line})")
        if len(modules) > 20:
            print(f"  ... and {len(modules) - 20} more")
    elif args.category:
        modules = indexer.get_modules_by_category(args.category)
        print(f"\nModules in category '{args.category}': {len(modules)}")
        for m in modules:
            print(f"  {m.name}")
    else:
        indexer.print_summary()


if __name__ == "__main__":
    main()
