#!/usr/bin/env python3
"""
PRISM Diff-Based Updates - CORE.8
Surgical file edits using JSONPath - 99% token savings on updates.

Features:
- JSONPath-based precise updates
- Atomic batch operations
- Preview mode (dry run)
- Anti-regression hooks
- Automatic backup before modify

Usage:
    # Update a single value
    python diff_based_updates.py --file data.json --path "$.materials[0].kc1_1" --value 1823
    
    # Delete an entry
    python diff_based_updates.py --file data.json --path "$.materials[?(@.id=='OLD')]" --delete
    
    # Preview changes
    python diff_based_updates.py --file data.json --path "$.x" --value 10 --preview
    
    # Batch operations from file
    python diff_based_updates.py --file data.json --batch operations.json

Author: Claude (PRISM Developer)
Created: 2026-02-01
"""

import os
import json
import re
import copy
import hashlib
import shutil
from pathlib import Path
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime
import argparse


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class DiffOperation:
    """A single diff operation."""
    operation: str  # update, insert, delete, append, move
    path: str  # JSONPath
    value: Any = None  # For update, insert, append
    from_path: str = None  # For move


@dataclass
class DiffResult:
    """Result of diff operations."""
    success: bool
    changes_applied: int
    old_hash: str
    new_hash: str
    backup_path: Optional[str] = None
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class DiffPreview:
    """Preview of what changes would be made."""
    operations: List[Dict]
    old_values: List[Any]
    new_values: List[Any]
    size_change: int  # Bytes
    would_succeed: bool
    warnings: List[str] = field(default_factory=list)


# =============================================================================
# JSONPATH IMPLEMENTATION
# =============================================================================

class JSONPathParser:
    """
    Simple JSONPath parser for common patterns.
    
    Supports:
    - $.key - Root key access
    - $.key.subkey - Nested access
    - $.array[0] - Array index
    - $.array[*] - All array elements
    - $.array[-1] - Last element
    - $.array[?(@.id=='x')] - Filter expression
    - $.key1.key2[0].key3 - Combined paths
    """
    
    def parse(self, path: str) -> List[Union[str, int, dict]]:
        """
        Parse JSONPath into segments.
        
        Returns list of:
        - str: key name
        - int: array index
        - dict: filter expression
        """
        if not path.startswith('$'):
            raise ValueError(f"JSONPath must start with $: {path}")
        
        path = path[1:]  # Remove $
        if path.startswith('.'):
            path = path[1:]  # Remove leading dot
        
        segments = []
        i = 0
        
        while i < len(path):
            # Array access or filter
            if path[i] == '[':
                end = self._find_matching_bracket(path, i)
                bracket_content = path[i+1:end]
                
                if bracket_content == '*':
                    segments.append({'type': 'wildcard'})
                elif bracket_content.startswith('?'):
                    # Filter expression
                    expr = bracket_content[1:].strip()
                    if expr.startswith('(') and expr.endswith(')'):
                        expr = expr[1:-1]
                    segments.append({'type': 'filter', 'expr': expr})
                elif bracket_content.startswith('-'):
                    # Negative index
                    segments.append(int(bracket_content))
                else:
                    try:
                        segments.append(int(bracket_content))
                    except ValueError:
                        # Quoted key
                        key = bracket_content.strip("'\"")
                        segments.append(key)
                
                i = end + 1
            
            # Dot notation
            elif path[i] == '.':
                i += 1
            
            # Key
            else:
                # Find end of key
                end = i
                while end < len(path) and path[end] not in '.[]':
                    end += 1
                
                key = path[i:end]
                if key:
                    segments.append(key)
                i = end
        
        return segments
    
    def _find_matching_bracket(self, path: str, start: int) -> int:
        """Find matching closing bracket."""
        depth = 0
        for i in range(start, len(path)):
            if path[i] == '[':
                depth += 1
            elif path[i] == ']':
                depth -= 1
                if depth == 0:
                    return i
        raise ValueError(f"Unmatched bracket in path: {path}")
    
    def get(self, data: Any, path: str) -> Tuple[Any, bool]:
        """
        Get value at path.
        
        Returns:
            (value, found) tuple
        """
        segments = self.parse(path)
        return self._get_recursive(data, segments)
    
    def _get_recursive(self, data: Any, segments: List) -> Tuple[Any, bool]:
        """Recursively get value."""
        if not segments:
            return data, True
        
        segment = segments[0]
        rest = segments[1:]
        
        if isinstance(segment, str):
            if isinstance(data, dict) and segment in data:
                return self._get_recursive(data[segment], rest)
            return None, False
        
        elif isinstance(segment, int):
            if isinstance(data, list):
                idx = segment if segment >= 0 else len(data) + segment
                if 0 <= idx < len(data):
                    return self._get_recursive(data[idx], rest)
            return None, False
        
        elif isinstance(segment, dict):
            if segment['type'] == 'wildcard':
                # Return all elements
                if isinstance(data, list):
                    results = []
                    for item in data:
                        val, found = self._get_recursive(item, rest)
                        if found:
                            results.append(val)
                    return results, True
                return None, False
            
            elif segment['type'] == 'filter':
                # Apply filter
                if isinstance(data, list):
                    for item in data:
                        if self._matches_filter(item, segment['expr']):
                            return self._get_recursive(item, rest)
                return None, False
        
        return None, False
    
    def _matches_filter(self, item: Any, expr: str) -> bool:
        """Check if item matches filter expression."""
        # Parse simple expressions like @.id=='value' or @.count>5
        match = re.match(r"@\.(\w+)\s*(==|!=|>|<|>=|<=)\s*['\"]?([^'\"]+)['\"]?", expr)
        if not match:
            return False
        
        field, op, value = match.groups()
        
        if not isinstance(item, dict) or field not in item:
            return False
        
        item_value = item[field]
        
        # Try numeric comparison
        try:
            value = float(value) if '.' in value else int(value)
        except ValueError:
            pass
        
        if op == '==':
            return item_value == value
        elif op == '!=':
            return item_value != value
        elif op == '>':
            return item_value > value
        elif op == '<':
            return item_value < value
        elif op == '>=':
            return item_value >= value
        elif op == '<=':
            return item_value <= value
        
        return False
    
    def set(self, data: Any, path: str, value: Any) -> bool:
        """
        Set value at path.
        
        Returns:
            True if successful
        """
        segments = self.parse(path)
        return self._set_recursive(data, segments, value)
    
    def _set_recursive(self, data: Any, segments: List, value: Any) -> bool:
        """Recursively set value."""
        if len(segments) == 1:
            segment = segments[0]
            
            if isinstance(segment, str):
                if isinstance(data, dict):
                    data[segment] = value
                    return True
            
            elif isinstance(segment, int):
                if isinstance(data, list):
                    idx = segment if segment >= 0 else len(data) + segment
                    if 0 <= idx < len(data):
                        data[idx] = value
                        return True
            
            elif isinstance(segment, dict) and segment['type'] == 'filter':
                if isinstance(data, list):
                    for i, item in enumerate(data):
                        if self._matches_filter(item, segment['expr']):
                            data[i] = value
                            return True
            
            return False
        
        segment = segments[0]
        rest = segments[1:]
        
        if isinstance(segment, str):
            if isinstance(data, dict) and segment in data:
                return self._set_recursive(data[segment], rest, value)
        
        elif isinstance(segment, int):
            if isinstance(data, list):
                idx = segment if segment >= 0 else len(data) + segment
                if 0 <= idx < len(data):
                    return self._set_recursive(data[idx], rest, value)
        
        elif isinstance(segment, dict) and segment['type'] == 'filter':
            if isinstance(data, list):
                for item in data:
                    if self._matches_filter(item, segment['expr']):
                        return self._set_recursive(item, rest, value)
        
        return False
    
    def delete(self, data: Any, path: str) -> bool:
        """
        Delete value at path.
        
        Returns:
            True if successful
        """
        segments = self.parse(path)
        return self._delete_recursive(data, segments)
    
    def _delete_recursive(self, data: Any, segments: List) -> bool:
        """Recursively delete value."""
        if len(segments) == 1:
            segment = segments[0]
            
            if isinstance(segment, str):
                if isinstance(data, dict) and segment in data:
                    del data[segment]
                    return True
            
            elif isinstance(segment, int):
                if isinstance(data, list):
                    idx = segment if segment >= 0 else len(data) + segment
                    if 0 <= idx < len(data):
                        data.pop(idx)
                        return True
            
            elif isinstance(segment, dict) and segment['type'] == 'filter':
                if isinstance(data, list):
                    for i, item in enumerate(data):
                        if self._matches_filter(item, segment['expr']):
                            data.pop(i)
                            return True
            
            return False
        
        segment = segments[0]
        rest = segments[1:]
        
        if isinstance(segment, str):
            if isinstance(data, dict) and segment in data:
                return self._delete_recursive(data[segment], rest)
        
        elif isinstance(segment, int):
            if isinstance(data, list):
                idx = segment if segment >= 0 else len(data) + segment
                if 0 <= idx < len(data):
                    return self._delete_recursive(data[idx], rest)
        
        elif isinstance(segment, dict) and segment['type'] == 'filter':
            if isinstance(data, list):
                for item in data:
                    if self._matches_filter(item, segment['expr']):
                        return self._delete_recursive(item, rest)
        
        return False
    
    def append(self, data: Any, path: str, value: Any) -> bool:
        """
        Append value to array at path.
        
        Returns:
            True if successful
        """
        target, found = self.get(data, path)
        if found and isinstance(target, list):
            target.append(value)
            return True
        return False


# =============================================================================
# DIFF ENGINE
# =============================================================================

class DiffBasedUpdater:
    """
    Apply surgical updates to JSON files.
    
    Features:
    - JSONPath-based targeting
    - Atomic batch operations
    - Automatic backup
    - Anti-regression hooks
    """
    
    def __init__(self, backup_dir: str = None):
        """
        Initialize diff updater.
        
        Args:
            backup_dir: Directory for backups (default: .backups in file dir)
        """
        self.backup_dir = backup_dir
        self.parser = JSONPathParser()
    
    def _create_backup(self, file_path: Path) -> str:
        """Create backup of file before modification."""
        backup_dir = self.backup_dir or (file_path.parent / ".backups")
        backup_dir = Path(backup_dir)
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{file_path.stem}_{timestamp}{file_path.suffix}"
        backup_path = backup_dir / backup_name
        
        shutil.copy2(file_path, backup_path)
        return str(backup_path)
    
    def _compute_hash(self, data: Any) -> str:
        """Compute hash of data."""
        json_str = json.dumps(data, sort_keys=True)
        return hashlib.md5(json_str.encode()).hexdigest()
    
    def _count_items(self, data: Any) -> int:
        """Count items in data for anti-regression."""
        if isinstance(data, dict):
            return sum(self._count_items(v) for v in data.values()) + len(data)
        elif isinstance(data, list):
            return sum(self._count_items(v) for v in data) + len(data)
        else:
            return 1
    
    def apply_diff(self, file_path: str, operations: List[DiffOperation],
                   preview: bool = False, backup: bool = True) -> Union[DiffResult, DiffPreview]:
        """
        Apply diff operations to a JSON file.
        
        Args:
            file_path: Path to JSON file
            operations: List of diff operations
            preview: If True, return preview without applying
            backup: If True, create backup before modify
            
        Returns:
            DiffResult or DiffPreview
        """
        file_path = Path(file_path)
        
        # Load file
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        old_hash = self._compute_hash(data)
        old_count = self._count_items(data)
        
        # Preview mode
        if preview:
            return self._preview_operations(data, operations, old_count)
        
        # Apply operations
        working = copy.deepcopy(data)
        changes = 0
        errors = []
        warnings = []
        
        for op in operations:
            try:
                success = self._apply_operation(working, op)
                if success:
                    changes += 1
                else:
                    errors.append(f"Failed to apply {op.operation} at {op.path}")
            except Exception as e:
                errors.append(f"Error applying {op.operation} at {op.path}: {e}")
        
        # Anti-regression check
        new_count = self._count_items(working)
        if new_count < old_count * 0.8:
            warnings.append(
                f"ANTI-REGRESSION WARNING: Item count dropped from {old_count} to {new_count} "
                f"({(1 - new_count/old_count)*100:.1f}% reduction)"
            )
        
        new_hash = self._compute_hash(working)
        
        # Create backup
        backup_path = None
        if backup and changes > 0:
            backup_path = self._create_backup(file_path)
        
        # Write changes
        if changes > 0 and not errors:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(working, f, indent=2)
        
        return DiffResult(
            success=len(errors) == 0,
            changes_applied=changes,
            old_hash=old_hash,
            new_hash=new_hash,
            backup_path=backup_path,
            errors=errors,
            warnings=warnings
        )
    
    def _apply_operation(self, data: Any, op: DiffOperation) -> bool:
        """Apply a single operation."""
        if op.operation == "update":
            return self.parser.set(data, op.path, op.value)
        
        elif op.operation == "insert":
            # Insert at path (create if needed)
            return self.parser.set(data, op.path, op.value)
        
        elif op.operation == "delete":
            return self.parser.delete(data, op.path)
        
        elif op.operation == "append":
            return self.parser.append(data, op.path, op.value)
        
        elif op.operation == "move":
            value, found = self.parser.get(data, op.from_path)
            if found:
                self.parser.delete(data, op.from_path)
                return self.parser.set(data, op.path, value)
            return False
        
        return False
    
    def _preview_operations(self, data: Any, operations: List[DiffOperation],
                           old_count: int) -> DiffPreview:
        """Preview what operations would do."""
        working = copy.deepcopy(data)
        old_values = []
        new_values = []
        op_details = []
        warnings = []
        would_succeed = True
        
        for op in operations:
            old_val, found = self.parser.get(working, op.path)
            old_values.append(old_val if found else None)
            
            try:
                success = self._apply_operation(working, op)
                if success:
                    new_val, _ = self.parser.get(working, op.path)
                    new_values.append(new_val)
                    op_details.append({
                        "operation": op.operation,
                        "path": op.path,
                        "status": "would_succeed"
                    })
                else:
                    new_values.append(None)
                    op_details.append({
                        "operation": op.operation,
                        "path": op.path,
                        "status": "would_fail"
                    })
                    would_succeed = False
            except Exception as e:
                new_values.append(None)
                op_details.append({
                    "operation": op.operation,
                    "path": op.path,
                    "status": f"error: {e}"
                })
                would_succeed = False
        
        # Check anti-regression
        new_count = self._count_items(working)
        if new_count < old_count * 0.8:
            warnings.append(
                f"ANTI-REGRESSION WARNING: Would reduce items from {old_count} to {new_count}"
            )
        
        old_size = len(json.dumps(data))
        new_size = len(json.dumps(working))
        
        return DiffPreview(
            operations=op_details,
            old_values=old_values,
            new_values=new_values,
            size_change=new_size - old_size,
            would_succeed=would_succeed,
            warnings=warnings
        )
    
    def batch_from_file(self, file_path: str, ops_file: str,
                        preview: bool = False) -> Union[DiffResult, DiffPreview]:
        """
        Apply batch operations from a JSON file.
        
        Operations file format:
        [
            {"operation": "update", "path": "$.x", "value": 10},
            {"operation": "delete", "path": "$.y"},
            {"operation": "append", "path": "$.list", "value": {"new": "item"}}
        ]
        """
        with open(ops_file, 'r', encoding='utf-8') as f:
            ops_data = json.load(f)
        
        operations = []
        for op in ops_data:
            operations.append(DiffOperation(
                operation=op.get("operation", "update"),
                path=op.get("path", ""),
                value=op.get("value"),
                from_path=op.get("from_path")
            ))
        
        return self.apply_diff(file_path, operations, preview)


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """Command-line interface for diff-based updates."""
    parser = argparse.ArgumentParser(
        description="PRISM Diff-Based Updates - Surgical JSON edits"
    )
    
    parser.add_argument(
        "--file", "-f", required=True,
        help="JSON file to modify"
    )
    
    parser.add_argument(
        "--path", "-p",
        help="JSONPath to target"
    )
    
    parser.add_argument(
        "--value", "-v",
        help="Value to set (JSON format)"
    )
    
    parser.add_argument(
        "--delete", "-d", action="store_true",
        help="Delete at path instead of update"
    )
    
    parser.add_argument(
        "--append", "-a", action="store_true",
        help="Append to array at path"
    )
    
    parser.add_argument(
        "--batch", "-b",
        help="File containing batch operations"
    )
    
    parser.add_argument(
        "--preview", action="store_true",
        help="Preview changes without applying"
    )
    
    parser.add_argument(
        "--no-backup", action="store_true",
        help="Don't create backup"
    )
    
    parser.add_argument(
        "--get", action="store_true",
        help="Get value at path (read-only)"
    )
    
    parser.add_argument(
        "--test", action="store_true",
        help="Run self-test"
    )
    
    args = parser.parse_args()
    
    if args.test:
        run_tests()
        return
    
    updater = DiffBasedUpdater()
    
    # Get mode (read-only)
    if args.get:
        if not args.path:
            print("--get requires --path")
            return
        
        with open(args.file, 'r') as f:
            data = json.load(f)
        
        value, found = updater.parser.get(data, args.path)
        if found:
            print(json.dumps(value, indent=2))
        else:
            print(f"Path not found: {args.path}")
        return
    
    # Batch mode
    if args.batch:
        result = updater.batch_from_file(args.file, args.batch, args.preview)
        
        if isinstance(result, DiffPreview):
            print("\n=== Preview ===")
            for i, op in enumerate(result.operations):
                print(f"{i+1}. {op['operation']} at {op['path']}: {op['status']}")
                if result.old_values[i] is not None:
                    old_str = json.dumps(result.old_values[i])[:50]
                    print(f"   Old: {old_str}...")
                if result.new_values[i] is not None:
                    new_str = json.dumps(result.new_values[i])[:50]
                    print(f"   New: {new_str}...")
            print(f"\nSize change: {result.size_change:+d} bytes")
            print(f"Would succeed: {result.would_succeed}")
            for w in result.warnings:
                print(f"WARNING: {w}")
        else:
            print("\n=== Result ===")
            print(f"Success: {result.success}")
            print(f"Changes applied: {result.changes_applied}")
            if result.backup_path:
                print(f"Backup: {result.backup_path}")
            for e in result.errors:
                print(f"ERROR: {e}")
            for w in result.warnings:
                print(f"WARNING: {w}")
        return
    
    # Single operation mode
    if not args.path:
        parser.print_help()
        return
    
    # Determine operation
    if args.delete:
        operation = "delete"
        value = None
    elif args.append:
        operation = "append"
        value = json.loads(args.value) if args.value else None
    else:
        operation = "update"
        value = json.loads(args.value) if args.value else None
    
    ops = [DiffOperation(operation=operation, path=args.path, value=value)]
    result = updater.apply_diff(args.file, ops, args.preview, not args.no_backup)
    
    if isinstance(result, DiffPreview):
        print("\n=== Preview ===")
        print(f"Operation: {operation} at {args.path}")
        print(f"Old value: {json.dumps(result.old_values[0])[:100]}")
        print(f"New value: {json.dumps(result.new_values[0])[:100]}")
        print(f"Would succeed: {result.would_succeed}")
    else:
        print("\n=== Result ===")
        print(f"Success: {result.success}")
        print(f"Changes: {result.changes_applied}")
        if result.backup_path:
            print(f"Backup: {result.backup_path}")
        for w in result.warnings:
            print(f"WARNING: {w}")


def run_tests():
    """Run self-tests."""
    print("=" * 60)
    print("PRISM Diff-Based Updates - Self Test")
    print("=" * 60)
    
    import tempfile
    
    # Test JSONPath parser
    print("\n1. Testing JSONPath parser...")
    parser = JSONPathParser()
    
    # Test parse
    segments = parser.parse("$.materials[0].kc1_1")
    assert segments == ["materials", 0, "kc1_1"], f"Unexpected: {segments}"
    
    segments = parser.parse("$.array[?(@.id=='test')]")
    assert len(segments) == 2
    assert segments[1]['type'] == 'filter'
    print("   ✓ Path parsing working")
    
    # Test get
    data = {
        "materials": [
            {"id": "1045", "kc1_1": 1823, "mc": 0.26},
            {"id": "316L", "kc1_1": 2100, "mc": 0.28}
        ],
        "config": {"version": "1.0"}
    }
    
    value, found = parser.get(data, "$.materials[0].kc1_1")
    assert found and value == 1823
    
    value, found = parser.get(data, "$.materials[?(@.id=='316L')].mc")
    assert found and value == 0.28
    
    value, found = parser.get(data, "$.config.version")
    assert found and value == "1.0"
    print("   ✓ Get working")
    
    # Test set
    parser.set(data, "$.materials[0].kc1_1", 1850)
    assert data["materials"][0]["kc1_1"] == 1850
    
    parser.set(data, "$.materials[?(@.id=='316L')].mc", 0.30)
    assert data["materials"][1]["mc"] == 0.30
    print("   ✓ Set working")
    
    # Test delete
    data["temp"] = "to_delete"
    parser.delete(data, "$.temp")
    assert "temp" not in data
    print("   ✓ Delete working")
    
    # Test append
    parser.append(data, "$.materials", {"id": "NEW", "kc1_1": 2000})
    assert len(data["materials"]) == 3
    print("   ✓ Append working")
    
    # Test DiffBasedUpdater
    print("\n2. Testing DiffBasedUpdater...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        test_file = Path(temp_dir) / "test.json"
        test_data = {
            "items": [
                {"id": 1, "value": 10},
                {"id": 2, "value": 20}
            ],
            "count": 2
        }
        
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        updater = DiffBasedUpdater(backup_dir=temp_dir)
        
        # Test preview
        ops = [DiffOperation("update", "$.count", 3)]
        preview = updater.apply_diff(str(test_file), ops, preview=True)
        assert preview.would_succeed
        assert preview.old_values[0] == 2
        assert preview.new_values[0] == 3
        print("   ✓ Preview working")
        
        # Test actual update
        result = updater.apply_diff(str(test_file), ops, preview=False)
        assert result.success
        assert result.changes_applied == 1
        assert result.backup_path is not None
        
        with open(test_file, 'r') as f:
            updated = json.load(f)
        assert updated["count"] == 3
        print("   ✓ Update working")
        
        # Test batch
        batch_ops = [
            DiffOperation("update", "$.items[0].value", 100),
            DiffOperation("append", "$.items", {"id": 3, "value": 30}),
            DiffOperation("update", "$.count", 3)
        ]
        result = updater.apply_diff(str(test_file), batch_ops, preview=False)
        assert result.success
        assert result.changes_applied == 3
        
        with open(test_file, 'r') as f:
            updated = json.load(f)
        assert updated["items"][0]["value"] == 100
        assert len(updated["items"]) == 3
        print("   ✓ Batch operations working")
        
        # Test anti-regression warning
        print("\n3. Testing anti-regression...")
        
        # Create file with many items
        big_data = {"items": [{"id": i} for i in range(100)]}
        big_file = Path(temp_dir) / "big.json"
        with open(big_file, 'w') as f:
            json.dump(big_data, f)
        
        # Delete most items
        delete_ops = [DiffOperation("update", "$.items", [{"id": 0}])]
        result = updater.apply_diff(str(big_file), delete_ops, preview=False)
        assert len(result.warnings) > 0
        assert "ANTI-REGRESSION" in result.warnings[0]
        print("   ✓ Anti-regression warning triggered")
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED ✓")
    print("=" * 60)


if __name__ == "__main__":
    main()
