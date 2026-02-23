#!/usr/bin/env python3
"""
PRISM Cache MCP Tools v1.0
Session 1.1 Deliverables: prism_cache_validate, prism_json_sort

Provides MCP tools for KV-cache stability validation and JSON key sorting.
"""
import sys
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import json
import re
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# Paths
PRISM_ROOT = Path("C:/PRISM")
GSD_CORE_PATH = PRISM_ROOT / "docs" / "GSD_CORE_v4.md"
CACHE_LOG_PATH = PRISM_ROOT / "state" / "CACHE_METRICS.json"

# Dynamic content patterns (from cache_checker.py)
DYNAMIC_PATTERNS = [
    (r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', 'ISO timestamp'),
    (r'\d{4}-\d{2}-\d{2}', 'Date'),
    (r'SESSION-\w+-\d+', 'Session ID'),
    (r'SESSION-\d{8}-\d{6}', 'Session timestamp ID'),
    (r'v\d+\.\d+\.\d+', 'Version number'),
    (r'\d+ (skills|agents|hooks|formulas|resources|tools)', 'Dynamic count'),
    (r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)', 'Day name'),
    (r'(January|February|March|April|May|June|July|August|September|October|November|December) \d+', 'Month date'),
    (r'Last updated:.*', 'Update timestamp'),
    (r'"lastUpdated":\s*"[^"]+"', 'JSON timestamp field'),
    (r'COMPLETE ✓', 'Completion marker'),
    (r'← CURRENT', 'Current marker'),
]


class CacheMCP:
    """MCP tools for KV-cache validation and JSON sorting."""
    
    def __init__(self):
        self._ensure_paths()
    
    def _ensure_paths(self):
        """Ensure required directories exist."""
        CACHE_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    def prism_cache_validate(self, file_path: str = None, content: str = None, 
                             prefix_lines: int = 50) -> Dict[str, Any]:
        """
        Validate content for KV-cache stability.
        
        Args:
            file_path: Path to file to validate (optional if content provided)
            content: Direct content to validate (optional if file_path provided)
            prefix_lines: Number of lines to consider as prefix (default: 50)
            
        Returns:
            Dict with validation results including issues, hash, and score
        """
        # Get content
        if content is None:
            if file_path is None:
                file_path = str(GSD_CORE_PATH)
            
            path = Path(file_path)
            if not path.exists():
                return {"error": f"File not found: {file_path}", "valid": False}
            
            try:
                content = path.read_text(encoding='utf-8')
            except Exception as e:
                return {"error": f"Could not read file: {e}", "valid": False}
        
        # Split into prefix and suffix
        lines = content.split('\n')
        prefix = '\n'.join(lines[:prefix_lines])
        suffix = '\n'.join(lines[prefix_lines:]) if len(lines) > prefix_lines else ""
        
        # Check for dynamic content in prefix
        issues = []
        for pattern, name in DYNAMIC_PATTERNS:
            matches = list(re.finditer(pattern, prefix, re.IGNORECASE))
            for match in matches:
                # Find line number
                line_num = prefix[:match.start()].count('\n') + 1
                issues.append({
                    "type": name,
                    "pattern": pattern,
                    "line": line_num,
                    "match": match.group()[:50],
                    "severity": "HIGH" if name in ['ISO timestamp', 'Dynamic count', 'Completion marker'] else "MEDIUM"
                })
        
        # Compute prefix hash
        prefix_hash = hashlib.sha256(prefix.encode('utf-8')).hexdigest()[:16]
        
        # Calculate stability score
        high_issues = len([i for i in issues if i['severity'] == 'HIGH'])
        medium_issues = len([i for i in issues if i['severity'] == 'MEDIUM'])
        total_lines = len(lines)
        affected_lines = len(set(i['line'] for i in issues))
        
        stability_score = max(0, 100 - (high_issues * 5) - (medium_issues * 2))
        cache_potential = (total_lines - affected_lines) / total_lines * 100 if total_lines > 0 else 0
        
        result = {
            "valid": len(issues) == 0,
            "file": file_path,
            "total_lines": total_lines,
            "prefix_lines": min(prefix_lines, total_lines),
            "suffix_lines": max(0, total_lines - prefix_lines),
            "prefix_hash": prefix_hash,
            "issues_count": len(issues),
            "issues": issues[:20],  # Limit to first 20
            "high_severity": high_issues,
            "medium_severity": medium_issues,
            "stability_score": stability_score,
            "cache_potential": f"{cache_potential:.1f}%",
            "recommendation": self._get_recommendation(issues),
            "checked_at": datetime.now().isoformat()
        }
        
        # Log validation
        self._log_validation(result)
        
        return result
    
    def _get_recommendation(self, issues: List[Dict]) -> str:
        """Generate recommendation based on issues."""
        if not issues:
            return "✅ No issues found. Content is cache-stable."
        
        high = [i for i in issues if i['severity'] == 'HIGH']
        if high:
            return f"⚠️ {len(high)} high-severity issues. Move dynamic content to end of file or replace with static references."
        
        return f"ℹ️ {len(issues)} minor issues. Consider moving timestamps and counts to dynamic section."
    
    def _log_validation(self, result: Dict):
        """Log validation result."""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "file": result.get("file", "unknown"),
                "valid": result.get("valid", False),
                "issues": result.get("issues_count", 0),
                "hash": result.get("prefix_hash", "")
            }
            
            log_file = PRISM_ROOT / "state" / "CACHE_VALIDATIONS.jsonl"
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry, sort_keys=True) + '\n')
        except:
            pass  # Don't fail on logging errors
    
    def prism_json_sort(self, file_path: str = None, content: str = None,
                        write: bool = False, indent: int = 2) -> Dict[str, Any]:
        """
        Sort JSON keys alphabetically for cache stability.
        
        Args:
            file_path: Path to JSON file (optional if content provided)
            content: JSON string to sort (optional if file_path provided)
            write: If True, write sorted content back to file
            indent: Indentation level (default: 2)
            
        Returns:
            Dict with sorted content and comparison
        """
        original_content = None
        
        # Get content
        if content is None:
            if file_path is None:
                return {"error": "Either file_path or content required", "sorted": False}
            
            path = Path(file_path)
            if not path.exists():
                return {"error": f"File not found: {file_path}", "sorted": False}
            
            try:
                original_content = path.read_text(encoding='utf-8')
                content = original_content
            except Exception as e:
                return {"error": f"Could not read file: {e}", "sorted": False}
        else:
            original_content = content
        
        # Parse JSON
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON: {e}", "sorted": False}
        
        # Sort and serialize
        sorted_content = json.dumps(data, indent=indent, sort_keys=True, ensure_ascii=False)
        
        # Compare
        was_sorted = original_content.strip() == sorted_content.strip()
        
        result = {
            "sorted": True,
            "was_already_sorted": was_sorted,
            "file": file_path,
            "original_length": len(original_content),
            "sorted_length": len(sorted_content),
            "changes_made": not was_sorted,
        }
        
        # Write back if requested
        if write and file_path and not was_sorted:
            try:
                Path(file_path).write_text(sorted_content, encoding='utf-8')
                result["written"] = True
                result["message"] = f"Sorted and saved to {file_path}"
            except Exception as e:
                result["written"] = False
                result["error"] = f"Could not write file: {e}"
        else:
            result["written"] = False
            if was_sorted:
                result["message"] = "File was already sorted"
            else:
                result["sorted_content"] = sorted_content[:500] + "..." if len(sorted_content) > 500 else sorted_content
        
        return result
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Generic call interface for MCP integration."""
        params = params or {}
        
        if tool_name == "prism_cache_validate":
            return self.prism_cache_validate(**params)
        elif tool_name == "prism_json_sort":
            return self.prism_json_sort(**params)
        else:
            return {"error": f"Unknown tool: {tool_name}"}


# CLI for testing
def main():
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Cache MCP Tools")
    parser.add_argument('--validate', type=str, help='Validate file for cache stability')
    parser.add_argument('--sort', type=str, help='Sort JSON file keys')
    parser.add_argument('--write', action='store_true', help='Write sorted output back to file')
    
    args = parser.parse_args()
    mcp = CacheMCP()
    
    if args.validate:
        result = mcp.prism_cache_validate(file_path=args.validate)
        print(json.dumps(result, indent=2))
    
    elif args.sort:
        result = mcp.prism_json_sort(file_path=args.sort, write=args.write)
        print(json.dumps(result, indent=2))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
