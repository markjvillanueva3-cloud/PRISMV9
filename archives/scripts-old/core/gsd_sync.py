#!/usr/bin/env python3
"""
GSD_SYNC.py - Automatic GSD_CORE synchronization with MCP tools
Keeps GSD documentation in sync with actual MCP server capabilities.

Usage:
    python gsd_sync.py                    # Sync and show changes
    python gsd_sync.py --apply            # Apply changes to GSD_CORE
    python gsd_sync.py --watch            # Watch MCP files for changes
    python gsd_sync.py --pre-commit       # Pre-commit hook mode
    python gsd_sync.py --post-mcp         # Run after MCP server changes

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import os
import re
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, field

# Paths
PRISM_ROOT = Path("C:/PRISM")
SCRIPTS_DIR = PRISM_ROOT / "scripts"
CORE_DIR = SCRIPTS_DIR / "core"
DOCS_DIR = PRISM_ROOT / "docs"
STATE_DIR = PRISM_ROOT / "state"

# GSD locations (check multiple possible locations)
GSD_PATHS = [
    DOCS_DIR / "GSD_CORE_v4.md",
    DOCS_DIR / "GSD_CORE.md",
    Path("/mnt/project/GSD_CORE_PROJECT_FILE.md"),
]

# MCP server files to scan
MCP_FILES = [
    SCRIPTS_DIR / "prism_mcp_server.py",
    SCRIPTS_DIR / "recovery_mcp.py",
    CORE_DIR / "recovery_mcp.py",
]

# Sync state file
SYNC_STATE_FILE = STATE_DIR / "gsd_sync_state.json"


@dataclass
class MCPTool:
    """Represents an MCP tool definition."""
    name: str
    category: str
    description: str = ""
    source_file: str = ""
    line_number: int = 0


@dataclass
class GSDSection:
    """Represents a section in GSD_CORE."""
    name: str
    content: str
    start_line: int
    end_line: int


@dataclass
class SyncResult:
    """Result of a sync operation."""
    mcp_tools_found: int = 0
    mcp_tools_by_category: Dict[str, int] = field(default_factory=dict)
    gsd_tools_count: int = 0
    tools_added: List[str] = field(default_factory=list)
    tools_removed: List[str] = field(default_factory=list)
    changes_needed: bool = False
    new_gsd_content: str = ""
    diff_summary: str = ""


class MCPScanner:
    """Scans MCP server files to extract tool definitions."""
    
    # Patterns to find MCP tool definitions
    TOOL_PATTERNS = [
        # Pattern: "tool_name": { or 'tool_name': {
        r'["\']?(prism_\w+)["\']?\s*:\s*\{',
        # Pattern: def prism_tool_name(
        r'def\s+(prism_\w+)\s*\(',
        # Pattern: "name": "prism_tool"
        r'["\']name["\']\s*:\s*["\']([prism_\w+])["\']',
        # Pattern: tool registration
        r'register_tool\s*\(\s*["\'](\w+)["\']',
    ]
    
    # Category patterns
    CATEGORY_PATTERNS = {
        'recovery': r'(compaction|transcript|reconstruct|recover)',
        'state': r'(state|checkpoint|snapshot)',
        'orchestration': r'(orchestrat|dispatch|route|swarm|team)',
        'data_query': r'(material|machine|alarm|tool_db|query)',
        'physics': r'(kienzle|taylor|johnson|physics|thermal|force)',
        'validation': r'(valid|quality|omega|safety|check)',
        'session': r'(session|resume|handoff|context)',
    }
    
    def __init__(self):
        self.tools: Dict[str, MCPTool] = {}
        self.file_hashes: Dict[str, str] = {}
    
    def scan_file(self, filepath: Path) -> List[MCPTool]:
        """Scan a single file for MCP tool definitions."""
        if not filepath.exists():
            return []
        
        tools = []
        content = filepath.read_text(encoding='utf-8', errors='ignore')
        lines = content.split('\n')
        
        # Calculate file hash for change detection
        self.file_hashes[str(filepath)] = hashlib.md5(content.encode()).hexdigest()
        
        for i, line in enumerate(lines, 1):
            for pattern in self.TOOL_PATTERNS:
                matches = re.findall(pattern, line)
                for match in matches:
                    tool_name = match if isinstance(match, str) else match[0]
                    if tool_name.startswith('prism_') and tool_name not in self.tools:
                        category = self._detect_category(tool_name, content)
                        tool = MCPTool(
                            name=tool_name,
                            category=category,
                            source_file=filepath.name,
                            line_number=i
                        )
                        tools.append(tool)
                        self.tools[tool_name] = tool
        
        return tools
    
    def scan_all(self) -> Dict[str, MCPTool]:
        """Scan all MCP files and return discovered tools."""
        self.tools = {}
        
        for mcp_file in MCP_FILES:
            if mcp_file.exists():
                self.scan_file(mcp_file)
        
        # Also scan for any other *_mcp.py files
        for scripts_path in [SCRIPTS_DIR, CORE_DIR]:
            if scripts_path.exists():
                for f in scripts_path.glob("*_mcp.py"):
                    if f not in MCP_FILES:
                        self.scan_file(f)
        
        return self.tools
    
    def _detect_category(self, tool_name: str, context: str = "") -> str:
        """Detect tool category from name and context."""
        name_lower = tool_name.lower()
        
        for category, pattern in self.CATEGORY_PATTERNS.items():
            if re.search(pattern, name_lower):
                return category
        
        return "general"
    
    def get_tools_by_category(self) -> Dict[str, List[MCPTool]]:
        """Group tools by category."""
        by_category: Dict[str, List[MCPTool]] = {}
        
        for tool in self.tools.values():
            if tool.category not in by_category:
                by_category[tool.category] = []
            by_category[tool.category].append(tool)
        
        return by_category


class GSDParser:
    """Parses and modifies GSD_CORE documents."""
    
    def __init__(self, gsd_path: Optional[Path] = None):
        self.gsd_path = gsd_path or self._find_gsd()
        self.content = ""
        self.sections: Dict[str, GSDSection] = {}
        
        if self.gsd_path and self.gsd_path.exists():
            self.content = self.gsd_path.read_text(encoding='utf-8')
            self._parse_sections()
    
    def _find_gsd(self) -> Optional[Path]:
        """Find the GSD_CORE file."""
        for path in GSD_PATHS:
            if path.exists():
                return path
        return None
    
    def _parse_sections(self):
        """Parse GSD content into sections."""
        lines = self.content.split('\n')
        current_section = None
        section_start = 0
        section_content = []
        
        for i, line in enumerate(lines):
            # Detect section headers (## or ---)
            if line.startswith('## ') or (line.startswith('---') and i > 0):
                if current_section:
                    self.sections[current_section] = GSDSection(
                        name=current_section,
                        content='\n'.join(section_content),
                        start_line=section_start,
                        end_line=i - 1
                    )
                
                if line.startswith('## '):
                    current_section = line[3:].strip()
                    section_start = i
                    section_content = [line]
                else:
                    current_section = None
                    section_content = []
            elif current_section:
                section_content.append(line)
        
        # Save last section
        if current_section:
            self.sections[current_section] = GSDSection(
                name=current_section,
                content='\n'.join(section_content),
                start_line=section_start,
                end_line=len(lines) - 1
            )
    
    def extract_tool_count(self) -> int:
        """Extract current MCP tool count from GSD."""
        # Look for patterns like "54 tools" or "MCP: 54"
        patterns = [
            r'MCP:\s*(\d+)\s*tools',
            r'(\d+)\s*tools\s*in\s*prism_mcp',
            r'MCP\s*\(\s*(\d+)\s*\)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, self.content, re.IGNORECASE)
            if match:
                return int(match.group(1))
        
        return 0
    
    def update_tool_count(self, new_count: int) -> str:
        """Update the MCP tool count in GSD content."""
        updated = self.content
        
        # Update various patterns
        replacements = [
            (r'MCP:\s*\d+\s*tools', f'MCP: {new_count} tools'),
            (r'(\d+)\s*tools\s*in\s*prism_mcp', f'{new_count} tools in prism_mcp'),
            (r'MCP\s*\(\s*\d+\s*\)', f'MCP ({new_count})'),
        ]
        
        for pattern, replacement in replacements:
            updated = re.sub(pattern, replacement, updated, flags=re.IGNORECASE)
        
        return updated
    
    def add_recovery_protocol(self) -> str:
        """Add recovery MCP tools to ON EVERY MESSAGE section."""
        # Find ON EVERY MESSAGE section and add recovery check
        recovery_block = """
## COMPACTION RECOVERY (Auto-triggered)

```
IF transcript exists at /mnt/transcripts/:
  1. prism_compaction_detect  → Check if compacted
  2. prism_transcript_read    → Extract state from transcript  
  3. prism_state_reconstruct  → Rebuild CURRENT_STATE.json
```
"""
        
        # Insert after ON EVERY MESSAGE section if not already present
        if 'COMPACTION RECOVERY' not in self.content:
            # Find insertion point (after ON EVERY MESSAGE)
            insert_pos = self.content.find('## MCP-FIRST')
            if insert_pos > 0:
                return self.content[:insert_pos] + recovery_block + '\n' + self.content[insert_pos:]
        
        return self.content


class GSDSync:
    """Main synchronization engine."""
    
    def __init__(self):
        self.scanner = MCPScanner()
        self.parser = GSDParser()
        self.state = self._load_state()
    
    def _load_state(self) -> Dict:
        """Load previous sync state."""
        if SYNC_STATE_FILE.exists():
            return json.loads(SYNC_STATE_FILE.read_text())
        return {"last_sync": None, "file_hashes": {}, "tool_count": 0}
    
    def _save_state(self, result: SyncResult):
        """Save sync state for change detection."""
        SYNC_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        
        state = {
            "last_sync": datetime.now().isoformat(),
            "file_hashes": self.scanner.file_hashes,
            "tool_count": result.mcp_tools_found,
            "tools_by_category": result.mcp_tools_by_category,
        }
        
        SYNC_STATE_FILE.write_text(json.dumps(state, indent=2))
    
    def check_changes(self) -> bool:
        """Check if MCP files have changed since last sync."""
        self.scanner.scan_all()
        
        for filepath, new_hash in self.scanner.file_hashes.items():
            old_hash = self.state.get("file_hashes", {}).get(filepath)
            if old_hash != new_hash:
                return True
        
        return False
    
    def sync(self, apply: bool = False) -> SyncResult:
        """Perform sync operation."""
        result = SyncResult()
        
        # Scan MCP tools
        tools = self.scanner.scan_all()
        result.mcp_tools_found = len(tools)
        
        # Group by category
        by_category = self.scanner.get_tools_by_category()
        result.mcp_tools_by_category = {cat: len(tools) for cat, tools in by_category.items()}
        
        # Get current GSD state
        result.gsd_tools_count = self.parser.extract_tool_count()
        
        # Detect changes
        old_tools = set(self.state.get("tools", []))
        new_tools = set(tools.keys())
        
        result.tools_added = list(new_tools - old_tools)
        result.tools_removed = list(old_tools - new_tools)
        result.changes_needed = (
            result.mcp_tools_found != result.gsd_tools_count or
            len(result.tools_added) > 0 or
            len(result.tools_removed) > 0
        )
        
        # Generate updated GSD content
        if result.changes_needed:
            updated = self.parser.update_tool_count(result.mcp_tools_found)
            updated = GSDParser(self.parser.gsd_path)
            updated.content = self.parser.update_tool_count(result.mcp_tools_found)
            result.new_gsd_content = updated.add_recovery_protocol()
            
            # Generate diff summary
            result.diff_summary = self._generate_diff_summary(result)
        
        # Apply changes if requested
        if apply and result.changes_needed and self.parser.gsd_path:
            self.parser.gsd_path.write_text(result.new_gsd_content)
            print(f"✓ Updated {self.parser.gsd_path}")
        
        # Save state
        self._save_state(result)
        
        return result
    
    def _generate_diff_summary(self, result: SyncResult) -> str:
        """Generate human-readable diff summary."""
        lines = ["GSD_SYNC Changes Detected:", ""]
        
        if result.gsd_tools_count != result.mcp_tools_found:
            lines.append(f"  Tool count: {result.gsd_tools_count} → {result.mcp_tools_found}")
        
        if result.tools_added:
            lines.append(f"  Added ({len(result.tools_added)}):")
            for tool in result.tools_added[:10]:  # Show first 10
                lines.append(f"    + {tool}")
            if len(result.tools_added) > 10:
                lines.append(f"    ... and {len(result.tools_added) - 10} more")
        
        if result.tools_removed:
            lines.append(f"  Removed ({len(result.tools_removed)}):")
            for tool in result.tools_removed[:10]:
                lines.append(f"    - {tool}")
        
        lines.append("")
        lines.append("  Categories:")
        for cat, count in sorted(result.mcp_tools_by_category.items()):
            lines.append(f"    {cat}: {count}")
        
        return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Sync GSD_CORE with MCP server tools"
    )
    parser.add_argument('--apply', action='store_true',
                        help='Apply changes to GSD_CORE')
    parser.add_argument('--watch', action='store_true',
                        help='Watch for changes and auto-sync')
    parser.add_argument('--pre-commit', action='store_true',
                        help='Pre-commit hook mode (fail if out of sync)')
    parser.add_argument('--post-mcp', action='store_true',
                        help='Post-MCP-change mode (always sync)')
    parser.add_argument('--json', action='store_true',
                        help='Output as JSON')
    
    args = parser.parse_args()
    
    sync = GSDSync()
    
    if args.watch:
        print("Watching for MCP changes... (Ctrl+C to stop)")
        import time
        while True:
            if sync.check_changes():
                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Changes detected!")
                result = sync.sync(apply=True)
                print(result.diff_summary)
            time.sleep(5)
    
    elif args.pre_commit:
        result = sync.sync(apply=False)
        if result.changes_needed:
            print("ERROR: GSD_CORE out of sync with MCP server!")
            print(result.diff_summary)
            print("\nRun 'python gsd_sync.py --apply' to fix.")
            exit(1)
        else:
            print("✓ GSD_CORE is in sync")
            exit(0)
    
    elif args.post_mcp:
        result = sync.sync(apply=True)
        print(f"✓ Synced: {result.mcp_tools_found} MCP tools")
        if result.tools_added:
            print(f"  Added: {', '.join(result.tools_added)}")
    
    else:
        result = sync.sync(apply=args.apply)
        
        if args.json:
            output = {
                "mcp_tools": result.mcp_tools_found,
                "gsd_tools": result.gsd_tools_count,
                "by_category": result.mcp_tools_by_category,
                "changes_needed": result.changes_needed,
                "added": result.tools_added,
                "removed": result.tools_removed,
            }
            print(json.dumps(output, indent=2))
        else:
            print(f"MCP Tools Found: {result.mcp_tools_found}")
            print(f"GSD Tool Count:  {result.gsd_tools_count}")
            print(f"Changes Needed:  {'Yes' if result.changes_needed else 'No'}")
            
            if result.changes_needed:
                print("\n" + result.diff_summary)
                if not args.apply:
                    print("\nRun with --apply to update GSD_CORE")


if __name__ == "__main__":
    main()
