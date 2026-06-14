# PRISM Automation Toolkit - Utility Functions
# Version: 1.0.0
# Created: 2026-01-23

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


def load_json(filepath: Union[str, Path]) -> Dict:
    """Load JSON file with error handling."""
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"File not found: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(data: Dict, filepath: Union[str, Path], indent: int = 2) -> None:
    """Save dictionary to JSON file."""
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)


def load_js_object(filepath: Union[str, Path]) -> Optional[Dict]:
    """
    Load a JavaScript object from a .js file.
    Handles common PRISM patterns like:
    - const PRISM_XXX = { ... }
    - window.PRISM_XXX = { ... }
    - export const PRISM_XXX = { ... }
    
    Returns the parsed object or None if parsing fails.
    """
    filepath = Path(filepath)
    if not filepath.exists():
        return None
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Try to extract JSON-like object
    # This is a simplified parser - complex JS won't work
    try:
        # Find object start (after = { or : {)
        match = re.search(r'=\s*(\{[\s\S]*\})\s*;?\s*$', content)
        if match:
            obj_str = match.group(1)
            # Basic JS to JSON conversion
            obj_str = re.sub(r'(\w+):', r'"\1":', obj_str)  # Quote keys
            obj_str = re.sub(r',\s*}', '}', obj_str)  # Remove trailing commas
            obj_str = re.sub(r',\s*]', ']', obj_str)
            return json.loads(obj_str)
    except:
        pass
    
    return None


def find_files(directory: Union[str, Path], pattern: str = "*.js", recursive: bool = True) -> List[Path]:
    """Find files matching a pattern in a directory."""
    directory = Path(directory)
    if not directory.exists():
        return []
    
    if recursive:
        return list(directory.rglob(pattern))
    else:
        return list(directory.glob(pattern))


def extract_material_ids(filepath: Union[str, Path]) -> List[str]:
    """
    Extract material IDs from a PRISM material file.
    Looks for patterns like:
    - id: 'P-CS-001'
    - "id": "P-CS-001"
    """
    filepath = Path(filepath)
    if not filepath.exists():
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all material IDs
    pattern = r'["\']?id["\']?\s*:\s*["\']([A-Z]-[A-Z]{2}-\d{3})["\']'
    matches = re.findall(pattern, content)
    return list(set(matches))  # Remove duplicates


def is_valid_material_id(material_id: str) -> bool:
    """Check if a material ID follows PRISM format: X-XX-NNN"""
    pattern = r'^[A-Z]-[A-Z]{2}-\d{3}$'
    return bool(re.match(pattern, material_id))


def get_iso_group(material_id: str) -> Optional[str]:
    """Get ISO material group from material ID."""
    if not is_valid_material_id(material_id):
        return None
    return material_id[0]  # First character (P, M, K, N, S, H)


def get_category_code(material_id: str) -> Optional[str]:
    """Get category code from material ID (e.g., P-CS from P-CS-001)."""
    if not is_valid_material_id(material_id):
        return None
    return material_id[:4]  # First 4 characters (X-XX)


def timestamp() -> str:
    """Get current timestamp in ISO format."""
    return datetime.now().isoformat()


def timestamp_filename() -> str:
    """Get timestamp suitable for filenames."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safe division that returns default if denominator is zero."""
    if denominator == 0:
        return default
    return numerator / denominator


def in_range(value: float, min_val: float, max_val: float) -> bool:
    """Check if value is within range (inclusive)."""
    return min_val <= value <= max_val


def format_number(value: float, precision: int = 2) -> str:
    """Format number with specified precision, handling special cases."""
    if value is None:
        return "N/A"
    if isinstance(value, int):
        return str(value)
    return f"{value:.{precision}f}"


def format_percentage(value: float, precision: int = 1) -> str:
    """Format a ratio (0-1) as a percentage string."""
    return f"{value * 100:.{precision}f}%"


def truncate_string(s: str, max_length: int = 50, suffix: str = "...") -> str:
    """Truncate string to max length with suffix."""
    if len(s) <= max_length:
        return s
    return s[:max_length - len(suffix)] + suffix


def count_lines(filepath: Union[str, Path]) -> int:
    """Count lines in a file."""
    filepath = Path(filepath)
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        return sum(1 for _ in f)


def file_size_str(filepath: Union[str, Path]) -> str:
    """Get human-readable file size."""
    filepath = Path(filepath)
    if not filepath.exists():
        return "0 B"
    
    size = filepath.stat().st_size
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


def backup_file(filepath: Union[str, Path], backup_dir: Union[str, Path] = None) -> Path:
    """Create a timestamped backup of a file."""
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"Cannot backup non-existent file: {filepath}")
    
    if backup_dir:
        backup_path = Path(backup_dir)
    else:
        backup_path = filepath.parent / "backups"
    
    backup_path.mkdir(parents=True, exist_ok=True)
    
    backup_name = f"{filepath.stem}_{timestamp_filename()}{filepath.suffix}"
    backup_file = backup_path / backup_name
    
    import shutil
    shutil.copy2(filepath, backup_file)
    
    return backup_file


class Timer:
    """Simple timer context manager."""
    
    def __init__(self, name: str = "Operation"):
        self.name = name
        self.start_time = None
        self.elapsed = None
    
    def __enter__(self):
        self.start_time = datetime.now()
        return self
    
    def __exit__(self, *args):
        self.elapsed = (datetime.now() - self.start_time).total_seconds()
        print(f"{self.name} completed in {self.elapsed:.2f}s")


def flatten_dict(d: Dict, parent_key: str = '', sep: str = '.') -> Dict:
    """Flatten a nested dictionary."""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def deep_get(d: Dict, keys: str, default: Any = None) -> Any:
    """
    Get a value from a nested dictionary using dot notation.
    Example: deep_get(data, 'mechanical.yield_strength')
    """
    keys_list = keys.split('.')
    result = d
    for key in keys_list:
        if isinstance(result, dict) and key in result:
            result = result[key]
        else:
            return default
    return result
