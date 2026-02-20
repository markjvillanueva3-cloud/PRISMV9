#!/usr/bin/env python3
"""
PRISM Recovery MCP Tools v1.0
MCP tools for compaction detection, transcript reading, and state reconstruction.

Part of Tier 0 (SURVIVAL) - Session 0.1: Compaction Recovery System

Tools:
1. prism_compaction_detect - Detect context compaction
2. prism_transcript_read - Read and parse transcripts
3. prism_state_reconstruct - Reconstruct state from sources

Usage:
    from recovery_mcp import RecoveryMCP
    recovery = RecoveryMCP()
    result = recovery.prism_compaction_detect({})
"""
import os
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from core.compaction_detector import CompactionDetector
    from core.state_reconstructor import StateReconstructor
    from core.resume_detector import ResumeDetector
    from core.recovery_scorer import RecoveryScorer
except ImportError:
    # Fallback for direct execution
    CompactionDetector = None
    StateReconstructor = None
    ResumeDetector = None
    RecoveryScorer = None


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
TRANSCRIPTS_DIR = Path("/mnt/transcripts")
STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
ROADMAP_FILE = STATE_DIR / "ROADMAP_TRACKER.json"


# ═══════════════════════════════════════════════════════════════════════════
# RECOVERY MCP CLASS
# ═══════════════════════════════════════════════════════════════════════════

class RecoveryMCP:
    """
    MCP tools for recovery operations.
    
    Provides 3 tools:
    - prism_compaction_detect: Detect if context was compacted
    - prism_transcript_read: Read and parse transcript files
    - prism_state_reconstruct: Reconstruct state from available sources
    """
    
    TOOLS = {
        "prism_compaction_detect": {
            "description": "Detect if context has been compacted",
            "params": {
                "state_file": "Optional path to state file"
            }
        },
        "prism_transcript_read": {
            "description": "Read and parse transcript files",
            "params": {
                "path": "Optional specific transcript path",
                "max_files": "Max files to read (default 3)",
                "extract_state": "Extract state info (default true)"
            }
        },
        "prism_state_reconstruct": {
            "description": "Reconstruct state from available sources",
            "params": {
                "force": "Force reconstruction even if state exists",
                "save": "Save reconstructed state to file",
                "max_transcripts": "Max transcripts to parse (default 5)"
            }
        }
    }
    
    def __init__(self):
        """Initialize recovery MCP tools."""
        pass
    
    def list_tools(self) -> List[str]:
        """List available recovery tools."""
        return list(self.TOOLS.keys())
    
    def get_tool_info(self, tool_name: str) -> Dict[str, Any]:
        """Get information about a tool."""
        return self.TOOLS.get(tool_name, {"error": "Tool not found"})
    
    def call(self, tool_name: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Call a recovery MCP tool.
        
        Args:
            tool_name: Name of the tool
            params: Tool parameters
            
        Returns:
            Tool result
        """
        params = params or {}
        
        tool_methods = {
            "prism_compaction_detect": self.prism_compaction_detect,
            "prism_transcript_read": self.prism_transcript_read,
            "prism_state_reconstruct": self.prism_state_reconstruct
        }
        
        if tool_name not in tool_methods:
            return {"error": f"Unknown tool: {tool_name}"}
        
        try:
            return tool_methods[tool_name](params)
        except Exception as e:
            return {"error": str(e), "tool": tool_name}
    
    # ═══════════════════════════════════════════════════════════════════════
    # TOOL IMPLEMENTATIONS
    # ═══════════════════════════════════════════════════════════════════════
    
    def prism_compaction_detect(self, params: Dict) -> Dict[str, Any]:
        """
        Detect if context has been compacted.
        
        MCP Tool: prism_compaction_detect
        
        Checks for compaction using multiple indicators:
        - Transcript markers ([Conversation compacted])
        - State consistency
        - Checkpoint freshness
        - Context references
        
        Returns:
            {
                "is_compacted": bool,
                "compaction_type": str,
                "confidence": float,
                "recommendation": str,
                "indicators": [...]
            }
        """
        state_file = params.get('state_file')
        
        if CompactionDetector:
            # Use full detector
            detector = CompactionDetector(
                state_file=Path(state_file) if state_file else STATE_FILE
            )
            result = detector.detect()
            return result.to_dict()
        else:
            # Fallback: basic detection
            return self._basic_compaction_detect(state_file)
    
    def _basic_compaction_detect(self, state_file: Optional[str]) -> Dict[str, Any]:
        """Fallback compaction detection."""
        indicators = []
        is_compacted = False
        
        # Check state file
        sf = Path(state_file) if state_file else STATE_FILE
        if sf.exists():
            try:
                with open(sf, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                
                # Check for reconstruction flag
                if state.get('reconstructed'):
                    is_compacted = True
                    indicators.append("State was previously reconstructed")
                
                # Check quickResume
                if not state.get('quickResume'):
                    indicators.append("Missing quickResume")
                    
            except Exception as e:
                indicators.append(f"State file error: {e}")
                is_compacted = True
        else:
            indicators.append("State file not found")
            is_compacted = True
        
        # Check transcripts
        if TRANSCRIPTS_DIR.exists():
            transcripts = sorted(
                TRANSCRIPTS_DIR.glob("*.txt"),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            
            if transcripts:
                try:
                    content = transcripts[0].read_text(encoding='utf-8', errors='replace')
                    if '[Conversation compacted]' in content or '[Context compacted]' in content:
                        is_compacted = True
                        indicators.append(f"Compaction marker in {transcripts[0].name}")
                except Exception:
                    pass
        
        confidence = 0.7 if is_compacted else 0.3
        
        return {
            "is_compacted": is_compacted,
            "compaction_type": "detected" if is_compacted else "none",
            "confidence": confidence,
            "recommendation": "Run prism_state_reconstruct" if is_compacted else "Continue normally",
            "indicators": indicators,
            "detected_at": datetime.now().isoformat()
        }
    
    def prism_transcript_read(self, params: Dict) -> Dict[str, Any]:
        """
        Read and parse transcript files.
        
        MCP Tool: prism_transcript_read
        
        Reads transcript files and optionally extracts state information.
        
        Args:
            path: Specific transcript path
            max_files: Maximum files to read (default 3)
            extract_state: Extract state info (default true)
            
        Returns:
            {
                "transcripts": [...],
                "extracted_state": {...},
                "total_files": int
            }
        """
        specific_path = params.get('path')
        max_files = params.get('max_files', 3)
        extract_state = params.get('extract_state', True)
        
        result = {
            "transcripts": [],
            "extracted_state": {},
            "total_files": 0
        }
        
        if specific_path:
            # Read specific file
            path = Path(specific_path)
            if path.exists():
                content = path.read_text(encoding='utf-8', errors='replace')
                result["transcripts"].append({
                    "path": str(path),
                    "name": path.name,
                    "size": len(content),
                    "preview": content[:1000] + "..." if len(content) > 1000 else content
                })
                result["total_files"] = 1
                
                if extract_state:
                    result["extracted_state"] = self._extract_state_from_content(content)
        else:
            # Read from transcripts directory
            if TRANSCRIPTS_DIR.exists():
                transcripts = sorted(
                    TRANSCRIPTS_DIR.glob("*.txt"),
                    key=lambda p: p.stat().st_mtime,
                    reverse=True
                )[:max_files]
                
                result["total_files"] = len(list(TRANSCRIPTS_DIR.glob("*.txt")))
                
                combined_state = {}
                for t in transcripts:
                    try:
                        content = t.read_text(encoding='utf-8', errors='replace')
                        result["transcripts"].append({
                            "path": str(t),
                            "name": t.name,
                            "size": len(content),
                            "modified": datetime.fromtimestamp(t.stat().st_mtime).isoformat(),
                            "preview": content[:500] + "..." if len(content) > 500 else content
                        })
                        
                        if extract_state:
                            extracted = self._extract_state_from_content(content)
                            combined_state.update(extracted)
                            
                    except Exception as e:
                        result["transcripts"].append({
                            "path": str(t),
                            "name": t.name,
                            "error": str(e)
                        })
                
                if extract_state:
                    result["extracted_state"] = combined_state
        
        return result
    
    def _extract_state_from_content(self, content: str) -> Dict[str, Any]:
        """Extract state information from transcript content."""
        import re
        
        extracted = {}
        
        # Extract JSON blocks
        json_pattern = r'```json\s*([\s\S]*?)\s*```'
        for match in re.findall(json_pattern, content):
            try:
                data = json.loads(match)
                if isinstance(data, dict):
                    if any(k in data for k in ['currentSession', 'quickResume', 'task']):
                        extracted.update(data)
            except json.JSONDecodeError:
                pass
        
        # Extract key patterns
        patterns = {
            'session': r'Session (\d+\.\d+)',
            'phase': r'Phase (\d+)',
            'step': r'Step (\d+)',
            'status': r'Status:\s*(\w+)',
        }
        
        for key, pattern in patterns.items():
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                extracted[f'last_{key}'] = matches[-1]
        
        # Extract completions
        completions = re.findall(r'(?:COMPLETE|DONE):\s*([^\n]+)', content, re.IGNORECASE)
        if completions:
            extracted['completions'] = completions[-5:]  # Last 5
        
        return extracted
    
    def prism_state_reconstruct(self, params: Dict) -> Dict[str, Any]:
        """
        Reconstruct state from available sources.
        
        MCP Tool: prism_state_reconstruct
        
        Reconstructs CURRENT_STATE.json from:
        1. Existing state file (if valid)
        2. Checkpoint files
        3. Transcript parsing
        4. Roadmap defaults
        
        Args:
            force: Force reconstruction even if state exists
            save: Save reconstructed state to file
            max_transcripts: Max transcripts to parse
            
        Returns:
            {
                "success": bool,
                "reconstructed_state": {...},
                "confidence": float,
                "sources": [...],
                "saved_to": str (if save=true)
            }
        """
        force = params.get('force', False)
        save = params.get('save', False)
        max_transcripts = params.get('max_transcripts', 5)
        
        if StateReconstructor:
            # Use full reconstructor
            reconstructor = StateReconstructor()
            result = reconstructor.reconstruct(
                force=force,
                max_transcripts=max_transcripts
            )
            
            output = result.to_dict()
            
            if save and result.success:
                save_path = reconstructor.save(result.reconstructed_state)
                output['saved_to'] = str(save_path)
            
            return output
        else:
            # Fallback: basic reconstruction
            return self._basic_reconstruct(force, save, max_transcripts)
    
    def _basic_reconstruct(self, force: bool, save: bool, 
                           max_transcripts: int) -> Dict[str, Any]:
        """Fallback state reconstruction."""
        sources = []
        state = {}
        
        # Try existing state
        if not force and STATE_FILE.exists():
            try:
                with open(STATE_FILE, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                sources.append({"type": "state_file", "path": str(STATE_FILE)})
                
                if state.get('quickResume') and state.get('currentSession'):
                    return {
                        "success": True,
                        "reconstructed_state": state,
                        "confidence": 1.0,
                        "sources": sources,
                        "message": "Existing state is valid"
                    }
            except Exception:
                pass
        
        # Try roadmap
        if ROADMAP_FILE.exists():
            try:
                with open(ROADMAP_FILE, 'r', encoding='utf-8') as f:
                    roadmap = json.load(f)
                
                state['currentSession'] = {
                    'id': f"SESSION-{roadmap.get('current_session', '0.1')}",
                    'sessionNumber': roadmap.get('current_session', '0.1'),
                    'sessionName': roadmap.get('current_session_name', 'Unknown'),
                    'status': 'RECONSTRUCTED'
                }
                sources.append({"type": "roadmap", "path": str(ROADMAP_FILE)})
                
            except Exception:
                pass
        
        # Try transcripts
        if TRANSCRIPTS_DIR.exists():
            transcripts = sorted(
                TRANSCRIPTS_DIR.glob("*.txt"),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )[:max_transcripts]
            
            for t in transcripts:
                try:
                    content = t.read_text(encoding='utf-8', errors='replace')
                    extracted = self._extract_state_from_content(content)
                    state.update(extracted)
                    sources.append({"type": "transcript", "path": str(t)})
                except Exception:
                    pass
        
        # Fill required fields
        state.setdefault('quickResume', 'State reconstructed. Verify before continuing.')
        state.setdefault('lastUpdated', datetime.now().isoformat())
        state.setdefault('version', '0.0.1-reconstructed')
        state['reconstructed'] = True
        state['reconstructedAt'] = datetime.now().isoformat()
        
        confidence = min(0.8, len(sources) * 0.25)
        
        result = {
            "success": confidence > 0.3,
            "reconstructed_state": state,
            "confidence": confidence,
            "sources": sources
        }
        
        if save and result["success"]:
            STATE_DIR.mkdir(parents=True, exist_ok=True)
            with open(STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump(state, f, indent=2)
            result['saved_to'] = str(STATE_FILE)
        
        return result


# ═══════════════════════════════════════════════════════════════════════════
# INTEGRATION HELPER
# ═══════════════════════════════════════════════════════════════════════════

def integrate_with_mcp_server():
    """
    Helper to integrate recovery tools with main MCP server.
    
    Add to PRISMMCPServer.__init__:
        from recovery_mcp import RecoveryMCP
        self.recovery = RecoveryMCP()
    
    Add to PRISMMCPServer.call():
        if tool_name.startswith("prism_compaction") or \
           tool_name.startswith("prism_transcript") or \
           tool_name.startswith("prism_state_reconstruct"):
            return self.recovery.call(tool_name, params)
    """
    return {
        "tools_to_add": [
            "prism_compaction_detect",
            "prism_transcript_read", 
            "prism_state_reconstruct"
        ],
        "category": "recovery",
        "integration_code": '''
# In PRISMMCPServer.__init__:
from recovery_mcp import RecoveryMCP
self.recovery = RecoveryMCP()

# In PRISMMCPServer.call():
recovery_tools = ["prism_compaction_detect", "prism_transcript_read", "prism_state_reconstruct"]
if tool_name in recovery_tools:
    return self.recovery.call(tool_name, params)
'''
    }


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """Recovery MCP CLI."""
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM Recovery MCP Tools")
    parser.add_argument("tool", nargs="?", 
                       choices=["detect", "transcript", "reconstruct", "list"],
                       default="list", help="Tool to run")
    parser.add_argument("--force", action="store_true", help="Force operation")
    parser.add_argument("--save", action="store_true", help="Save results")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    recovery = RecoveryMCP()
    
    if args.tool == "list":
        print("\n=== PRISM Recovery MCP Tools ===\n")
        for tool, info in RecoveryMCP.TOOLS.items():
            print(f"• {tool}")
            print(f"  {info['description']}")
            print(f"  Params: {info['params']}\n")
        return
    
    tool_map = {
        "detect": "prism_compaction_detect",
        "transcript": "prism_transcript_read",
        "reconstruct": "prism_state_reconstruct"
    }
    
    params = {"force": args.force, "save": args.save}
    result = recovery.call(tool_map[args.tool], params)
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"\n=== {tool_map[args.tool]} ===\n")
        for key, value in result.items():
            if isinstance(value, (dict, list)):
                print(f"{key}: {json.dumps(value, indent=2)[:500]}")
            else:
                print(f"{key}: {value}")


if __name__ == "__main__":
    main()
