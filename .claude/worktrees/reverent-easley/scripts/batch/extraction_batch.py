# PRISM Automation Toolkit - Extraction Batch Processor
# Version: 1.0.0
# Created: 2026-01-23
#
# Batch module extraction from PRISM monolith.
# Part of Toolkit 5: Batch Processing

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS
from core.logger import setup_logger
from core.utils import timestamp, save_json
from batch.batch_processor import BatchProcessor, BatchProgressDisplay

# Try to import extraction tools
try:
    from extraction.monolith_indexer import MonolithIndexer
    from extraction.module_extractor import ModuleExtractor
except ImportError:
    MonolithIndexer = None
    ModuleExtractor = None


# =============================================================================
# EXTRACTION TARGETS BY CATEGORY
# =============================================================================

EXTRACTION_TARGETS = {
    'databases': {
        'materials': [
            'PRISM_MATERIAL_KC_DATABASE', 'PRISM_ENHANCED_MATERIAL_DATABASE',
            'PRISM_EXTENDED_MATERIAL_CUTTING_DB', 'PRISM_JOHNSON_COOK_DATABASE',
            'PRISM_MATERIALS_MASTER', 'PRISM_CONSOLIDATED_MATERIALS'
        ],
        'machines': [
            'PRISM_POST_MACHINE_DATABASE', 'PRISM_LATHE_MACHINE_DB',
            'PRISM_MACHINE_3D_DATABASE', 'PRISM_OKUMA_MACHINE_CAD_DATABASE'
        ],
        'tools': [
            'PRISM_TOOL_DATABASE_V7', 'PRISM_CUTTING_TOOL_DATABASE_V2',
            'PRISM_STEEL_ENDMILL_DB_V2', 'PRISM_TOOL_PROPERTIES_DATABASE'
        ],
    },
    'engines': {
        'physics': [
            'PRISM_CUTTING_MECHANICS_ENGINE', 'PRISM_CUTTING_THERMAL_ENGINE',
            'PRISM_CHATTER_PREDICTION_ENGINE', 'PRISM_TOOL_LIFE_ENGINE'
        ],
        'ai_ml': [
            'PRISM_BAYESIAN_SYSTEM', 'PRISM_NEURAL_NETWORK',
            'PRISM_PSO_OPTIMIZER', 'PRISM_MONTE_CARLO_ENGINE'
        ],
    },
}


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class ExtractionSpec:
    """Specification for a module to extract."""
    module_name: str
    category: str
    subcategory: str = ""
    output_path: Path = None


@dataclass
class ExtractionBatchConfig:
    """Configuration for batch extraction."""
    monolith_path: Path
    output_dir: Path
    index_path: Path = None
    categories: List[str] = None  # None = all
    generate_docs: bool = True
    audit_after: bool = True


@dataclass
class ExtractionResult:
    """Result of extracting a single module."""
    module_name: str
    success: bool
    output_path: str = ""
    line_count: int = 0
    dependencies: List[str] = field(default_factory=list)
    error: str = ""


# =============================================================================
# EXTRACTION BATCH PROCESSOR CLASS
# =============================================================================

class ExtractionBatchProcessor:
    """Batch extraction of modules from PRISM monolith."""
    
    def __init__(self, monolith_path: Path):
        self.monolith_path = monolith_path
        self.logger = setup_logger('extraction_batch')
        self.processor = BatchProcessor("extraction", max_workers=1)
        self._monolith_content: str = None
        self._index: Dict = None
    
    @property
    def monolith_content(self) -> str:
        """Lazy load monolith content."""
        if self._monolith_content is None:
            self.logger.info(f"Loading monolith from {self.monolith_path}")
            self._monolith_content = self.monolith_path.read_text(encoding='utf-8', errors='ignore')
            self.logger.info(f"Loaded {len(self._monolith_content):,} characters")
        return self._monolith_content
    
    def extract_batch(self, config: ExtractionBatchConfig) -> Dict:
        """
        Extract a batch of modules.
        
        Args:
            config: Extraction configuration
            
        Returns:
            Dict with results
        """
        config.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Build extraction list
        specs = self._build_extraction_list(config)
        
        if not specs:
            return {'error': 'No modules to extract'}
        
        self.logger.info(f"Extracting {len(specs)} modules")
        
        # Process batch
        progress = BatchProgressDisplay(len(specs), "Extracting modules")
        
        result = self.processor.process(
            items=specs,
            processor_func=lambda s: self._extract_module(s, config.output_dir),
            id_func=lambda s: s.module_name,
            progress_callback=progress.update
        )
        
        # Generate summary
        summary = self._generate_summary(result, config.output_dir)
        
        return {
            'total': result.total_items,
            'successful': result.successful,
            'failed': result.failed,
            'output_dir': str(config.output_dir),
            'duration': result.duration_seconds,
            'summary_file': summary
        }
    
    def extract_category(self, category: str, subcategory: str = None,
                        output_dir: Path = None) -> Dict:
        """Extract all modules in a category."""
        targets = EXTRACTION_TARGETS.get(category, {})
        
        if subcategory:
            targets = {subcategory: targets.get(subcategory, [])}
        
        specs = []
        for subcat, modules in targets.items():
            for module in modules:
                specs.append(ExtractionSpec(
                    module_name=module,
                    category=category,
                    subcategory=subcat
                ))
        
        if not specs:
            return {'error': f'No modules found for {category}/{subcategory}'}
        
        output_dir = output_dir or Path(f"./extracted/{category}")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        progress = BatchProgressDisplay(len(specs), f"Extracting {category}")
        
        result = self.processor.process(
            items=specs,
            processor_func=lambda s: self._extract_module(s, output_dir),
            id_func=lambda s: s.module_name,
            progress_callback=progress.update
        )
        
        return {
            'category': category,
            'total': result.total_items,
            'successful': result.successful,
            'failed': result.failed
        }
    
    def _build_extraction_list(self, config: ExtractionBatchConfig) -> List[ExtractionSpec]:
        """Build list of modules to extract."""
        specs = []
        
        categories = config.categories or list(EXTRACTION_TARGETS.keys())
        
        for category in categories:
            targets = EXTRACTION_TARGETS.get(category, {})
            for subcategory, modules in targets.items():
                for module in modules:
                    specs.append(ExtractionSpec(
                        module_name=module,
                        category=category,
                        subcategory=subcategory
                    ))
        
        return specs
    
    def _extract_module(self, spec: ExtractionSpec, output_dir: Path) -> ExtractionResult:
        """Extract a single module."""
        result = ExtractionResult(module_name=spec.module_name, success=False)
        
        try:
            # Find module in monolith
            start_line, end_line = self._find_module(spec.module_name)
            
            if start_line is None:
                result.error = "Module not found in monolith"
                return result
            
            # Extract content
            lines = self.monolith_content.split('\n')
            module_lines = lines[start_line:end_line + 1]
            content = '\n'.join(module_lines)
            
            # Detect dependencies
            dependencies = self._detect_dependencies(content)
            
            # Build output path
            subdir = output_dir / spec.category / spec.subcategory
            subdir.mkdir(parents=True, exist_ok=True)
            output_path = subdir / f"{spec.module_name}.js"
            
            # Write with header
            header = self._generate_header(spec, start_line, end_line, dependencies)
            output_path.write_text(header + content, encoding='utf-8')
            
            result.success = True
            result.output_path = str(output_path)
            result.line_count = len(module_lines)
            result.dependencies = dependencies
            
        except Exception as e:
            result.error = str(e)
        
        return result
    
    def _find_module(self, module_name: str) -> Tuple[Optional[int], Optional[int]]:
        """Find module boundaries in monolith."""
        import re
        
        # Search for module definition
        patterns = [
            rf'window\.{module_name}\s*=\s*\{{',
            rf'const\s+{module_name}\s*=\s*\{{',
            rf'let\s+{module_name}\s*=\s*\{{',
            rf'var\s+{module_name}\s*=\s*\{{',
        ]
        
        lines = self.monolith_content.split('\n')
        
        for pattern in patterns:
            for i, line in enumerate(lines):
                if re.search(pattern, line):
                    # Found start, now find end
                    end = self._find_closing_brace(lines, i)
                    return (i, end)
        
        return (None, None)
    
    def _find_closing_brace(self, lines: List[str], start_line: int) -> int:
        """Find closing brace for module."""
        depth = 0
        started = False
        
        for i in range(start_line, min(start_line + 50000, len(lines))):
            line = lines[i]
            for char in line:
                if char == '{':
                    depth += 1
                    started = True
                elif char == '}':
                    depth -= 1
                    if started and depth == 0:
                        return i
        
        return start_line + 100  # Fallback
    
    def _detect_dependencies(self, content: str) -> List[str]:
        """Detect PRISM module dependencies."""
        import re
        
        pattern = r'PRISM_[A-Z0-9_]+'
        matches = set(re.findall(pattern, content))
        
        # Filter out self-references and common non-modules
        exclude = {'PRISM_CONSTANTS', 'PRISM_DEBUG', 'PRISM_LOG'}
        dependencies = [m for m in matches if m not in exclude]
        
        return sorted(dependencies)[:20]  # Limit to 20
    
    def _generate_header(self, spec: ExtractionSpec, 
                        start: int, end: int, deps: List[str]) -> str:
        """Generate extraction header."""
        lines = [
            f"// {spec.module_name}",
            f"// Extracted: {timestamp()}",
            f"// Category: {spec.category}/{spec.subcategory}",
            f"// Source lines: {start + 1}-{end + 1}",
            f"// Dependencies: {', '.join(deps[:5]) if deps else 'None detected'}",
            "//",
            "// AUTO-EXTRACTED FROM PRISM v8.89.002 MONOLITH",
            "// DO NOT EDIT - Re-extract if changes needed",
            "//",
            ""
        ]
        return '\n'.join(lines)
    
    def _generate_summary(self, result, output_dir: Path) -> str:
        """Generate extraction summary file."""
        summary = {
            'timestamp': timestamp(),
            'total_modules': result.total_items,
            'successful': result.successful,
            'failed': result.failed,
            'duration_seconds': result.duration_seconds,
            'modules': {}
        }
        
        for item in result.items:
            if item.result:
                summary['modules'][item.item_id] = {
                    'success': item.result.success,
                    'lines': item.result.line_count,
                    'path': item.result.output_path,
                    'dependencies': item.result.dependencies
                }
            else:
                summary['modules'][item.item_id] = {
                    'success': False,
                    'error': item.error
                }
        
        summary_path = output_dir / 'extraction_summary.json'
        save_json(summary, summary_path)
        return str(summary_path)


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for extraction batch processor."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Extraction Batch Processor')
    parser.add_argument('monolith', help='Path to monolith file')
    parser.add_argument('--category', type=str, help='Category to extract')
    parser.add_argument('--output', type=str, default='./extracted')
    parser.add_argument('--list', action='store_true', help='List available targets')
    
    args = parser.parse_args()
    
    if args.list:
        print("Available extraction targets:")
        for cat, subcats in EXTRACTION_TARGETS.items():
            print(f"\n{cat}:")
            for subcat, modules in subcats.items():
                print(f"  {subcat}: {len(modules)} modules")
        return
    
    extractor = ExtractionBatchProcessor(Path(args.monolith))
    
    if args.category:
        result = extractor.extract_category(args.category, output_dir=Path(args.output))
    else:
        config = ExtractionBatchConfig(
            monolith_path=Path(args.monolith),
            output_dir=Path(args.output)
        )
        result = extractor.extract_batch(config)
    
    print(f"\nExtracted {result.get('successful', 0)}/{result.get('total', 0)} modules")
    print(f"Output: {result.get('output_dir', args.output)}")


if __name__ == "__main__":
    main()
