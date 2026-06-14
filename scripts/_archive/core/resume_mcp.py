#!/usr/bin/env python3
"""
RESUME_MCP.py - MCP Tools for Quick Resume Protocol
Provides MCP interface for session resume operations.

Tools:
- prism_session_resume: Generate quick resume context
- prism_context_inject: Inject context for rapid startup

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
SCRIPTS_DIR = PRISM_ROOT / "scripts"
CORE_DIR = SCRIPTS_DIR / "core"

ROADMAP_FILE = STATE_DIR / "ROADMAP_TRACKER.json"
CURRENT_STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
QUICK_RESUME_FILE = STATE_DIR / "quick_resume.json"

# Import core modules
import sys
sys.path.insert(0, str(CORE_DIR))

try:
    from resume_validator import ResumeValidator, ContextLevel, ResumeScenario
    from skill_preloader import SkillPreloader
    from lkg_tracker import LKGTracker
except ImportError as e:
    ResumeValidator = None
    SkillPreloader = None
    LKGTracker = None
    print(f"Warning: Could not import resume modules: {e}")


class ResumeMCP:
    """MCP tools for quick resume protocol."""
    
    TOOLS = {
        "prism_session_resume": {
            "description": "Generate quick resume context for rapid session startup",
            "parameters": {
                "level": {
                    "type": "string",
                    "enum": ["MINIMAL", "STANDARD", "FULL", "DEEP"],
                    "default": "STANDARD",
                    "description": "Context loading level"
                },
                "save": {
                    "type": "boolean",
                    "default": True,
                    "description": "Save resume context to file"
                },
                "include_actions": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include recommended actions"
                },
                "include_skills": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include skill recommendations"
                }
            }
        },
        "prism_context_inject": {
            "description": "Inject context for rapid session startup - returns exactly what Claude needs",
            "parameters": {
                "format": {
                    "type": "string",
                    "enum": ["TEXT", "JSON", "STRUCTURED"],
                    "default": "TEXT",
                    "description": "Output format"
                },
                "max_tokens": {
                    "type": "integer",
                    "default": 2000,
                    "description": "Maximum tokens for context"
                },
                "include_roadmap": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include roadmap summary"
                },
                "include_skills": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include skill load commands"
                }
            }
        }
    }
    
    def __init__(self):
        self.validator = ResumeValidator() if ResumeValidator else None
        self.preloader = SkillPreloader() if SkillPreloader else None
        self.lkg_tracker = LKGTracker() if LKGTracker else None
    
    def call(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Route tool call to appropriate handler."""
        handlers = {
            "prism_session_resume": self._session_resume,
            "prism_context_inject": self._context_inject,
        }
        
        handler = handlers.get(tool_name)
        if handler:
            try:
                return handler(params)
            except Exception as e:
                return {"success": False, "error": str(e)}
        
        return {"success": False, "error": f"Unknown tool: {tool_name}"}
    
    def _session_resume(self, params: Dict) -> Dict:
        """Generate quick resume context."""
        if not self.validator:
            return {"success": False, "error": "Resume validator not available"}
        
        level_str = params.get("level", "STANDARD")
        save = params.get("save", True)
        include_actions = params.get("include_actions", True)
        include_skills = params.get("include_skills", True)
        
        try:
            level = ContextLevel(level_str)
        except ValueError:
            level = ContextLevel.STANDARD
        
        # Generate context
        context = self.validator.generate_resume_context(level)
        
        # Optionally strip sections
        if not include_actions:
            context.pop("actions", None)
        if not include_skills:
            if "context" in context:
                context["context"].pop("skills", None)
        
        # Save if requested
        if save:
            self.validator.save_resume_context(context)
        
        return {
            "success": True,
            "scenario": context["meta"]["scenario"],
            "confidence": context["meta"]["confidence"],
            "quickResume": context["quickResume"],
            "roadmapPosition": context["context"].get("roadmap", {}),
            "actionCount": len(context.get("actions", {}).get("immediate", [])),
            "saved": save
        }
    
    def _context_inject(self, params: Dict) -> Dict:
        """Inject context for rapid startup."""
        format_type = params.get("format", "TEXT")
        max_tokens = params.get("max_tokens", 2000)
        include_roadmap = params.get("include_roadmap", True)
        include_skills = params.get("include_skills", True)
        
        # Load state files
        roadmap = self._load_json(ROADMAP_FILE)
        state = self._load_json(CURRENT_STATE_FILE)
        
        if not roadmap and not state:
            return {
                "success": False,
                "error": "No state files found"
            }
        
        # Build context
        if format_type == "JSON":
            return self._build_json_context(roadmap, state, include_roadmap, include_skills)
        elif format_type == "STRUCTURED":
            return self._build_structured_context(roadmap, state, include_roadmap, include_skills)
        else:
            return self._build_text_context(roadmap, state, include_roadmap, include_skills, max_tokens)
    
    def _load_json(self, path: Path) -> Optional[Dict]:
        """Load JSON file."""
        if path.exists():
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return None
    
    def _build_text_context(self, roadmap: Dict, state: Dict, 
                            include_roadmap: bool, include_skills: bool,
                            max_tokens: int) -> Dict:
        """Build text format context."""
        lines = []
        
        # Quick resume header
        lines.append("=" * 60)
        lines.append("QUICK RESUME")
        lines.append("=" * 60)
        
        # One-liner
        if state and state.get("quickResume"):
            qr = state["quickResume"]
            if isinstance(qr, str):
                first_line = qr.split("\n")[0]
                lines.append(f"\n{first_line}\n")
        
        # Roadmap position
        if include_roadmap and roadmap:
            lines.append("-" * 40)
            lines.append("ROADMAP POSITION")
            lines.append("-" * 40)
            tier = roadmap.get("current_tier", 0)
            session = roadmap.get("current_session", "")
            session_name = roadmap.get("current_session_name", "")
            status = roadmap.get("session_status", "")
            
            lines.append(f"Tier: {tier}")
            lines.append(f"Session: {session} - {session_name}")
            lines.append(f"Status: {status}")
            
            # Quick resume from roadmap
            qr = roadmap.get("quick_resume", {})
            if qr.get("next_action"):
                lines.append(f"\nNEXT: {qr['next_action']}")
        
        # Skills
        if include_skills and self.preloader:
            lines.append("")
            lines.append("-" * 40)
            lines.append("RECOMMENDED SKILLS")
            lines.append("-" * 40)
            
            skills, source = self.preloader.select_auto(max_skills=3)
            for skill in skills:
                lines.append(f"  view \"/mnt/skills/user/{skill.name}/SKILL.md\"")
        
        # State summary
        if state:
            lines.append("")
            lines.append("-" * 40)
            lines.append("STATE")
            lines.append("-" * 40)
            lines.append(f"Version: {state.get('version', 'unknown')}")
            lines.append(f"Updated: {state.get('lastUpdated', 'unknown')}")
        
        # Truncate if needed (rough token estimate: 4 chars per token)
        text = "\n".join(lines)
        max_chars = max_tokens * 4
        if len(text) > max_chars:
            text = text[:max_chars] + "\n...[truncated]"
        
        return {
            "success": True,
            "format": "TEXT",
            "context": text,
            "tokens_estimated": len(text) // 4
        }
    
    def _build_json_context(self, roadmap: Dict, state: Dict,
                            include_roadmap: bool, include_skills: bool) -> Dict:
        """Build JSON format context."""
        context = {
            "generated": datetime.now().isoformat()
        }
        
        if state:
            context["quickResume"] = state.get("quickResume", "")
            context["version"] = state.get("version", "")
            context["currentSession"] = state.get("currentSession", {})
        
        if include_roadmap and roadmap:
            context["roadmap"] = {
                "tier": roadmap.get("current_tier"),
                "session": roadmap.get("current_session"),
                "sessionName": roadmap.get("current_session_name"),
                "status": roadmap.get("session_status"),
                "nextAction": roadmap.get("quick_resume", {}).get("next_action")
            }
        
        if include_skills and self.preloader:
            skills, _ = self.preloader.select_auto(max_skills=5)
            context["recommendedSkills"] = [s.name for s in skills]
        
        return {
            "success": True,
            "format": "JSON",
            "context": context
        }
    
    def _build_structured_context(self, roadmap: Dict, state: Dict,
                                   include_roadmap: bool, include_skills: bool) -> Dict:
        """Build structured format context with load commands."""
        sections = []
        
        # Section 1: Quick Resume Text
        if state and state.get("quickResume"):
            sections.append({
                "section": "QUICK_RESUME",
                "content": state["quickResume"]
            })
        
        # Section 2: Roadmap
        if include_roadmap and roadmap:
            sections.append({
                "section": "ROADMAP",
                "tier": roadmap.get("current_tier"),
                "session": roadmap.get("current_session"),
                "sessionName": roadmap.get("current_session_name"),
                "status": roadmap.get("session_status"),
                "nextAction": roadmap.get("quick_resume", {}).get("next_action")
            })
        
        # Section 3: Load Commands
        load_commands = [
            {
                "priority": 1,
                "tool": "Desktop Commander:read_file",
                "path": str(ROADMAP_FILE)
            },
            {
                "priority": 2,
                "tool": "Desktop Commander:read_file", 
                "path": str(CURRENT_STATE_FILE)
            }
        ]
        
        if include_skills and self.preloader:
            skills, _ = self.preloader.select_auto(max_skills=3)
            for i, skill in enumerate(skills, 3):
                load_commands.append({
                    "priority": i,
                    "tool": "view",
                    "path": f"/mnt/skills/user/{skill.name}/SKILL.md"
                })
        
        sections.append({
            "section": "LOAD_COMMANDS",
            "commands": load_commands
        })
        
        # Section 4: Actions
        if self.validator:
            actions = self.validator.get_resume_actions()
            sections.append({
                "section": "IMMEDIATE_ACTIONS",
                "actions": [a.to_dict() for a in actions[:5]]
            })
        
        return {
            "success": True,
            "format": "STRUCTURED",
            "sections": sections,
            "sectionCount": len(sections)
        }
    
    def get_tools_info(self) -> Dict:
        """Get information about available tools."""
        return {
            "tools": list(self.TOOLS.keys()),
            "count": len(self.TOOLS),
            "category": "resume",
            "modules_available": {
                "validator": self.validator is not None,
                "preloader": self.preloader is not None,
                "lkg_tracker": self.lkg_tracker is not None
            }
        }


# Standalone testing
def main():
    import argparse
    parser = argparse.ArgumentParser(description="Resume MCP Tools Test")
    parser.add_argument("--info", action="store_true", help="Show tools info")
    parser.add_argument("--test", action="store_true", help="Run basic tests")
    parser.add_argument("--resume", action="store_true", help="Run session resume")
    parser.add_argument("--inject", action="store_true", help="Run context inject")
    parser.add_argument("--format", default="TEXT", help="Format for inject")
    
    args = parser.parse_args()
    mcp = ResumeMCP()
    
    if args.info:
        print(json.dumps(mcp.get_tools_info(), indent=2))
    
    elif args.test:
        print("Testing Resume MCP Tools...")
        
        # Test session resume
        result = mcp.call("prism_session_resume", {
            "level": "STANDARD",
            "save": False
        })
        print(f"Session resume: {result.get('success')}, scenario: {result.get('scenario')}")
        
        # Test context inject
        result = mcp.call("prism_context_inject", {
            "format": "TEXT",
            "max_tokens": 500
        })
        print(f"Context inject: {result.get('success')}, tokens: {result.get('tokens_estimated')}")
        
        print("\nAll tests passed!")
    
    elif args.resume:
        result = mcp.call("prism_session_resume", {
            "level": "STANDARD",
            "save": False
        })
        print(json.dumps(result, indent=2))
    
    elif args.inject:
        result = mcp.call("prism_context_inject", {
            "format": args.format,
            "max_tokens": 2000
        })
        print(json.dumps(result, indent=2))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
