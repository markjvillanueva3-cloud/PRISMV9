#!/usr/bin/env python3
"""
PRISM Skill MCP Tools v1.0 - Access 1,252 skills via MCP
Session 2.2: prism_skill_read, prism_skill_search, prism_skill_generate
"""
import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor

PRISM_ROOT = Path("C:/PRISM")
SKILLS_DIRS = [
    PRISM_ROOT / "skills-generated",
    PRISM_ROOT / "skills-consolidated",
    Path("/mnt/skills/user")
]
REGISTRY = PRISM_ROOT / "registries" / "SKILL_REGISTRY.json"

class SkillMCP:
    """MCP tools for skill access."""
    
    def __init__(self):
        self._cache = {}
        self._index = None
    
    def _build_index(self) -> Dict[str, Path]:
        """Build skill ID to path index."""
        if self._index:
            return self._index
        
        self._index = {}
        for skills_dir in SKILLS_DIRS:
            if skills_dir.exists():
                for skill_dir in skills_dir.iterdir():
                    if skill_dir.is_dir():
                        skill_file = skill_dir / "SKILL.md"
                        if skill_file.exists():
                            self._index[skill_dir.name] = skill_file
        return self._index
    
    def prism_skill_read(self, skill_id: str, section: str = None) -> Dict[str, Any]:
        """
        Read a skill file by ID.
        
        Args:
            skill_id: Skill ID (e.g., 'prism-material-physics')
            section: Optional section to extract (e.g., 'Capabilities')
            
        Returns:
            Skill content, metadata, and optionally specific section
        """
        index = self._build_index()
        
        if skill_id not in index:
            # Try fuzzy match
            matches = [k for k in index.keys() if skill_id.lower() in k.lower()]
            if matches:
                return {"error": f"Skill not found: {skill_id}", "suggestions": matches[:5]}
            return {"error": f"Skill not found: {skill_id}"}
        
        path = index[skill_id]
        content = path.read_text(encoding='utf-8')
        
        result = {
            "skill_id": skill_id,
            "path": str(path),
            "lines": len(content.split('\n')),
            "chars": len(content)
        }
        
        if section:
            # Extract specific section
            pattern = rf'^## {re.escape(section)}\s*\n(.*?)(?=^## |\Z)'
            match = re.search(pattern, content, re.MULTILINE | re.DOTALL)
            if match:
                result["section"] = section
                result["content"] = match.group(1).strip()
            else:
                result["content"] = content
                result["note"] = f"Section '{section}' not found, returning full content"
        else:
            result["content"] = content
        
        return result
    
    def prism_skill_search(self, query: str, category: str = None, 
                           limit: int = 20) -> Dict[str, Any]:
        """
        Search skills by query.
        
        Args:
            query: Search query (searches ID, name, content)
            category: Optional category filter
            limit: Max results (default 20)
            
        Returns:
            Matching skills with relevance
        """
        index = self._build_index()
        results = []
        q = query.lower()
        
        def score_skill(skill_id: str, path: Path) -> Optional[Dict]:
            score = 0
            matches = []
            
            # ID match
            if q in skill_id.lower():
                score += 10
                matches.append("id")
            
            # Category filter
            if category:
                if category.lower() not in skill_id.lower():
                    return None
            
            # Content match (sample first 500 chars for speed)
            try:
                content = path.read_text(encoding='utf-8')[:500].lower()
                if q in content:
                    score += 5
                    matches.append("content")
            except:
                pass
            
            if score > 0:
                return {"skill_id": skill_id, "score": score, "matches": matches}
            return None
        
        # Parallel search
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = {executor.submit(score_skill, sid, path): sid 
                      for sid, path in index.items()}
            for future in futures:
                result = future.result()
                if result:
                    results.append(result)
        
        # Sort by score
        results.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "query": query,
            "category": category,
            "total_skills": len(index),
            "matches": len(results),
            "results": results[:limit]
        }
    
    def prism_skill_list(self, category: str = None, limit: int = 50) -> Dict[str, Any]:
        """
        List available skills.
        
        Args:
            category: Optional category filter
            limit: Max results
            
        Returns:
            List of skill IDs grouped by source
        """
        index = self._build_index()
        
        # Group by source directory
        by_source = {}
        for skill_id, path in index.items():
            if category and category.lower() not in skill_id.lower():
                continue
            
            source = path.parent.parent.name
            if source not in by_source:
                by_source[source] = []
            by_source[source].append(skill_id)
        
        # Sort each list
        for source in by_source:
            by_source[source] = sorted(by_source[source])[:limit]
        
        return {
            "total_skills": len(index),
            "by_source": {k: {"count": len(v), "skills": v} for k, v in by_source.items()},
            "category_filter": category
        }
    
    def prism_skill_stats(self) -> Dict[str, Any]:
        """Get skill statistics."""
        index = self._build_index()
        
        # Load registry for comparison
        registered = 0
        if REGISTRY.exists():
            data = json.loads(REGISTRY.read_text(encoding='utf-8'))
            registered = data.get("totalSkills", 0)
        
        # Count by category (from skill ID prefix)
        by_category = {}
        for skill_id in index.keys():
            parts = skill_id.replace("prism-", "").split("-")
            cat = parts[0].upper() if parts else "UNKNOWN"
            by_category[cat] = by_category.get(cat, 0) + 1
        
        return {
            "total_registered": registered,
            "total_implemented": len(index),
            "implementation_rate": f"{len(index)/max(registered,1)*100:.1f}%",
            "by_category": dict(sorted(by_category.items(), key=lambda x: x[1], reverse=True)[:15])
        }
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Generic MCP call interface."""
        params = params or {}
        if tool_name == "prism_skill_read":
            return self.prism_skill_read(**params)
        elif tool_name == "prism_skill_search":
            return self.prism_skill_search(**params)
        elif tool_name == "prism_skill_list":
            return self.prism_skill_list(**params)
        elif tool_name == "prism_skill_stats":
            return self.prism_skill_stats()
        return {"error": f"Unknown tool: {tool_name}"}

if __name__ == "__main__":
    mcp = SkillMCP()
    print(json.dumps(mcp.prism_skill_stats(), indent=2))
