# PRISM Automation Toolkit - Module Extractor
# Version: 1.0.0
# Created: 2026-01-23
#
# Extracts individual modules from the monolith using the index.
# Handles dependency detection and documentation generation.

import sys
import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS
from core.logger import setup_logger
from core.utils import timestamp, timestamp_filename
from extraction.monolith_indexer import MonolithIndexer, ModuleInfo


# =============================================================================
# EXTRACTION RESULT
# =============================================================================

@dataclass
class ExtractionResult:
    """Result of extracting a module."""
    module_name: str
    success: bool
    output_path: Optional[str] = None
    line_count: int = 0
    dependencies: List[str] = field(default_factory=list)
    exports: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


# =============================================================================
# MODULE EXTRACTOR
# =============================================================================

class ModuleExtractor:
    """
    Extracts modules from the PRISM monolith.
    Uses the index for fast lookup and extracts complete modules.
    """
    
    def __init__(self, monolith_path: Path = None, output_dir: Path = None):
        self.monolith_path = monolith_path or PATHS['monolith']
        self.output_dir = output_dir or PATHS['extracted']
        self.indexer = MonolithIndexer(self.monolith_path)
        self.logger = setup_logger('ModuleExtractor')
        
        # Load monolith content lazily
        self._content = None
        self._lines = None
    
    @property
    def content(self) -> str:
        """Lazy load monolith content."""
        if self._content is None:
            self.logger.info("Loading monolith content...")
            with open(self.monolith_path, 'r', encoding='utf-8', errors='ignore') as f:
                self._content = f.read()
        return self._content
    
    @property
    def lines(self) -> List[str]:
        """Get monolith as list of lines."""
        if self._lines is None:
            self._lines = self.content.split('\n')
        return self._lines
    
    def extract_module(self, module_name: str, output_path: Path = None,
                       include_header: bool = True,
                       detect_dependencies: bool = True) -> ExtractionResult:
        """
        Extract a single module by name.
        
        Args:
            module_name: Exact module name (e.g., 'PRISM_MATERIALS_MASTER')
            output_path: Where to save (default: auto-generate based on category)
            include_header: Add documentation header
            detect_dependencies: Scan for dependencies
        
        Returns:
            ExtractionResult with status and details
        """
        result = ExtractionResult(module_name=module_name, success=False)
        
        # Find module in index
        module_info = self.indexer.find_module(module_name)
        if not module_info:
            result.errors.append(f"Module not found in index: {module_name}")
            # Try to find similar names
            similar = self.indexer.search_modules(module_name.replace('_', '.*'))
            if similar:
                result.errors.append(f"Did you mean: {', '.join(m.name for m in similar[:5])}")
            return result
        
        # Extract lines
        start = module_info.start_line - 1  # 0-indexed
        end = module_info.end_line
        
        try:
            extracted_lines = self.lines[start:end]
        except IndexError:
            result.errors.append(f"Line range out of bounds: {start}-{end}")
            return result
        
        result.line_count = len(extracted_lines)
        
        # Detect dependencies
        if detect_dependencies:
            result.dependencies = self._detect_dependencies(extracted_lines, module_name)
        
        # Detect exports
        result.exports = self._detect_exports(extracted_lines)
        
        # Build output content
        output_content = []
        
        if include_header:
            header = self._generate_header(module_info, result)
            output_content.append(header)
        
        output_content.extend(extracted_lines)
        
        # Determine output path
        if not output_path:
            output_path = self._generate_output_path(module_info)
        
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(output_content))
            
            result.success = True
            result.output_path = str(output_path)
            self.logger.info(f"Extracted {module_name} to {output_path}")
        except Exception as e:
            result.errors.append(f"Failed to write file: {e}")
        
        return result
    
    def extract_by_line_range(self, start_line: int, end_line: int,
                              output_path: Path, module_name: str = "EXTRACTED") -> ExtractionResult:
        """
        Extract by explicit line range (1-indexed).
        Useful when index doesn't have the module.
        """
        result = ExtractionResult(module_name=module_name, success=False)
        
        try:
            extracted_lines = self.lines[start_line - 1:end_line]
            result.line_count = len(extracted_lines)
            
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(extracted_lines))
            
            result.success = True
            result.output_path = str(output_path)
        except Exception as e:
            result.errors.append(str(e))
        
        return result
    
    def extract_category(self, category: str, output_dir: Path = None) -> List[ExtractionResult]:
        """Extract all modules in a category."""
        modules = self.indexer.get_modules_by_category(category)
        
        if not modules:
            self.logger.warning(f"No modules found in category: {category}")
            return []
        
        self.logger.info(f"Extracting {len(modules)} modules from category: {category}")
        
        results = []
        for module_info in modules:
            result = self.extract_module(module_info.name)
            results.append(result)
        
        # Summary
        success_count = sum(1 for r in results if r.success)
        self.logger.info(f"Extracted {success_count}/{len(results)} modules")
        
        return results
    
    def _detect_dependencies(self, lines: List[str], self_name: str) -> List[str]:
        """Detect PRISM modules referenced in the code."""
        dependencies = set()
        
        # Pattern for PRISM module references
        pattern = re.compile(r'\bPRISM_[A-Z0-9_]+\b')
        
        for line in lines:
            matches = pattern.findall(line)
            for match in matches:
                if match != self_name:
                    dependencies.add(match)
        
        return sorted(dependencies)
    
    def _detect_exports(self, lines: List[str]) -> List[str]:
        """Detect what the module exports/provides."""
        exports = set()
        
        # Look for function declarations
        func_pattern = re.compile(r'^\s*(?:async\s+)?function\s+(\w+)')
        
        # Look for property assignments
        prop_pattern = re.compile(r'^\s*(\w+)\s*:\s*(?:function|async|{)')
        
        for line in lines:
            func_match = func_pattern.match(line)
            if func_match:
                exports.add(func_match.group(1))
            
            prop_match = prop_pattern.match(line)
            if prop_match:
                exports.add(prop_match.group(1))
        
        return sorted(exports)[:20]  # Limit to first 20
    
    def _generate_header(self, module_info: ModuleInfo, result: ExtractionResult) -> str:
        """Generate documentation header for extracted module."""
        dep_str = ', '.join(result.dependencies[:10]) if result.dependencies else 'None detected'
        if len(result.dependencies) > 10:
            dep_str += f" (+{len(result.dependencies) - 10} more)"
        
        export_str = ', '.join(result.exports[:10]) if result.exports else 'See code'
        if len(result.exports) > 10:
            export_str += f" (+{len(result.exports) - 10} more)"
        
        return f"""/**
 * PRISM MODULE: {module_info.name}
 * {'=' * 50}
 * 
 * Extracted from: PRISM v8.89.002 Monolith
 * Source lines: {module_info.start_line}-{module_info.end_line}
 * Line count: {module_info.line_count}
 * Category: {module_info.category}
 * Type: {module_info.type}
 * 
 * Extracted: {timestamp()}
 * 
 * Dependencies: {dep_str}
 * Exports: {export_str}
 */

"""
    
    def _generate_output_path(self, module_info: ModuleInfo) -> Path:
        """Generate appropriate output path based on category."""
        category_dirs = {
            'databases': 'databases',
            'engines': 'engines',
            'knowledge_bases': 'knowledge_bases',
            'systems': 'systems',
            'ui': 'ui',
            'learning': 'learning',
            'physics': 'engines/physics',
            'cad_cam': 'engines/cad_cam',
            'post_processor': 'post_processors',
            'materials': 'materials',
            'machines': 'machines',
            'tools': 'tools',
            'other': 'other'
        }
        
        subdir = category_dirs.get(module_info.category, 'other')
        filename = f"{module_info.name}.js"
        
        return self.output_dir / subdir / filename


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for module extractor."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Module Extractor')
    parser.add_argument('module', nargs='?', help='Module name to extract')
    parser.add_argument('-o', '--output', type=str, help='Output file path')
    parser.add_argument('--lines', type=str, metavar='START-END', 
                        help='Extract by line range (e.g., 1000-2000)')
    parser.add_argument('--category', type=str, help='Extract all modules in category')
    parser.add_argument('--list-categories', action='store_true', 
                        help='List available categories')
    parser.add_argument('--no-header', action='store_true', 
                        help='Skip documentation header')
    parser.add_argument('--no-deps', action='store_true',
                        help='Skip dependency detection')
    
    args = parser.parse_args()
    
    extractor = ModuleExtractor()
    
    if args.list_categories:
        extractor.indexer.print_summary()
        return
    
    if args.category:
        results = extractor.extract_category(args.category)
        print(f"\nExtracted {sum(1 for r in results if r.success)} modules")
        return
    
    if args.lines:
        start, end = map(int, args.lines.split('-'))
        output = Path(args.output) if args.output else Path(f'extracted_{start}_{end}.js')
        result = extractor.extract_by_line_range(start, end, output)
    elif args.module:
        output = Path(args.output) if args.output else None
        result = extractor.extract_module(
            args.module,
            output_path=output,
            include_header=not args.no_header,
            detect_dependencies=not args.no_deps
        )
    else:
        parser.print_help()
        return
    
    # Print result
    if result.success:
        print(f"\n✓ Extracted: {result.module_name}")
        print(f"  Output: {result.output_path}")
        print(f"  Lines: {result.line_count}")
        if result.dependencies:
            print(f"  Dependencies: {len(result.dependencies)}")
    else:
        print(f"\n✗ Failed: {result.module_name}")
        for err in result.errors:
            print(f"  Error: {err}")


if __name__ == "__main__":
    main()
