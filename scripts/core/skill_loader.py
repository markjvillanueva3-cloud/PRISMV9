#!/usr/bin/env python3
"""
PRISM Skill Loader v1.0
Session 2.2 Deliverable: Load and search skill files from /mnt/skills/user.

Features:
- List all available skills
- Read skill content with optional section extraction
- Search across skill content
- Parse skill metadata (name, description, sections)
- Cache skill content for performance
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
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from collections import defaultdict

# Paths - both possible locations
SKILLS_MNT = Path("/mnt/skills/user")
SKILLS_LOCAL = Path("C:/PRISM/skills-consolidated")

@dataclass
class SkillMetadata:
    """Metadata extracted from a skill file."""
    id: str
    name: str
    path: str
    size_bytes: int
    description: str = ""
    sections: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class SkillSection:
    """A section within a skill file."""
    heading: str
    level: int
    content: str
    start_line: int
    end_line: int
    
    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class SkillSearchResult:
    """Search result from skill content."""
    skill_id: str
    skill_name: str
    matches: List[Dict]  # {line_number, content, context}
    relevance: float
    
    def to_dict(self) -> Dict:
        return asdict(self)

class SkillLoader:
    """Load and search PRISM skill files."""
    
    # Common section patterns
    SECTION_KEYWORDS = [
        "overview", "usage", "example", "parameters", "returns",
        "api", "workflow", "pattern", "formula", "reference",
        "quick", "start", "summary", "trigger", "output"
    ]
    
    def __init__(self, cache_content: bool = True):
        self.skills_path = self._find_skills_path()
        self.cache_content = cache_content
        self._skill_cache: Dict[str, str] = {}
        self._metadata_cache: Dict[str, SkillMetadata] = {}
        self._index_built = False
    
    def _find_skills_path(self) -> Path:
        """Find the skills directory."""
        if SKILLS_MNT.exists():
            return SKILLS_MNT
        elif SKILLS_LOCAL.exists():
            return SKILLS_LOCAL
        else:
            # Return mnt path as default (may need to be created)
            return SKILLS_MNT
    
    def _get_skill_dirs(self) -> List[Path]:
        """Get all skill directories."""
        if not self.skills_path.exists():
            return []
        
        return sorted([
            d for d in self.skills_path.iterdir()
            if d.is_dir() and d.name.startswith("prism-")
        ])
    
    def _parse_skill_file(self, skill_path: Path) -> Tuple[str, SkillMetadata]:
        """Parse a skill file and extract metadata."""
        skill_file = skill_path / "SKILL.md"
        if not skill_file.exists():
            return None, None
        
        skill_id = skill_path.name
        
        try:
            content = skill_file.read_text(encoding='utf-8')
        except Exception as e:
            return skill_id, SkillMetadata(
                id=skill_id,
                name=skill_id,
                path=str(skill_file),
                size_bytes=0,
                description=f"Error reading: {e}"
            )
        
        # Cache content
        if self.cache_content:
            self._skill_cache[skill_id] = content
        
        # Extract name from first heading
        name_match = re.search(r'^#\s+(.+?)$', content, re.MULTILINE)
        name = name_match.group(1).strip() if name_match else skill_id
        
        # Extract description (first paragraph after heading)
        desc_match = re.search(r'^#.*?\n\n(.+?)(?=\n\n|\n#|$)', content, re.DOTALL)
        description = desc_match.group(1).strip()[:500] if desc_match else ""
        
        # Extract sections
        sections = re.findall(r'^#{1,3}\s+(.+?)$', content, re.MULTILINE)
        
        # Extract tags from content
        tags = []
        for keyword in self.SECTION_KEYWORDS:
            if keyword.lower() in content.lower():
                tags.append(keyword)
        
        # Add category tags based on skill name
        if "material" in skill_id:
            tags.append("material")
        if "physics" in skill_id:
            tags.append("physics")
        if "session" in skill_id:
            tags.append("session")
        if "sp-" in skill_id:
            tags.append("workflow")
        if "programming" in skill_id:
            tags.append("cnc")
        
        metadata = SkillMetadata(
            id=skill_id,
            name=name,
            path=str(skill_file),
            size_bytes=len(content.encode('utf-8')),
            description=description,
            sections=sections[:20],  # Limit sections
            tags=list(set(tags))
        )
        
        self._metadata_cache[skill_id] = metadata
        return skill_id, metadata
    
    def _build_index(self):
        """Build index of all skills."""
        if self._index_built:
            return
        
        for skill_dir in self._get_skill_dirs():
            self._parse_skill_file(skill_dir)
        
        self._index_built = True
    
    def _ensure_index(self):
        """Ensure index is built."""
        if not self._index_built:
            self._build_index()
    
    def _get_content(self, skill_id: str) -> Optional[str]:
        """Get skill content, using cache if available."""
        if skill_id in self._skill_cache:
            return self._skill_cache[skill_id]
        
        skill_file = self.skills_path / skill_id / "SKILL.md"
        if not skill_file.exists():
            return None
        
        try:
            content = skill_file.read_text(encoding='utf-8')
            if self.cache_content:
                self._skill_cache[skill_id] = content
            return content
        except:
            return None
    
    def _extract_sections(self, content: str) -> List[SkillSection]:
        """Extract sections from skill content."""
        sections = []
        lines = content.split('\n')
        
        current_section = None
        current_content = []
        current_start = 0
        
        for i, line in enumerate(lines):
            heading_match = re.match(r'^(#{1,4})\s+(.+?)$', line)
            
            if heading_match:
                # Save previous section
                if current_section:
                    sections.append(SkillSection(
                        heading=current_section['heading'],
                        level=current_section['level'],
                        content='\n'.join(current_content).strip(),
                        start_line=current_start,
                        end_line=i - 1
                    ))
                
                # Start new section
                current_section = {
                    'heading': heading_match.group(2).strip(),
                    'level': len(heading_match.group(1))
                }
                current_content = []
                current_start = i
            else:
                current_content.append(line)
        
        # Save last section
        if current_section:
            sections.append(SkillSection(
                heading=current_section['heading'],
                level=current_section['level'],
                content='\n'.join(current_content).strip(),
                start_line=current_start,
                end_line=len(lines) - 1
            ))
        
        return sections
    
    # ===== PUBLIC API =====
    
    def list_skills(self, filter_tag: str = None) -> List[SkillMetadata]:
        """
        List all available skills.
        
        Args:
            filter_tag: Optional tag to filter by
            
        Returns:
            List of SkillMetadata
        """
        self._ensure_index()
        
        skills = list(self._metadata_cache.values())
        
        if filter_tag:
            skills = [s for s in skills if filter_tag.lower() in [t.lower() for t in s.tags]]
        
        return sorted(skills, key=lambda s: s.id)
    
    def get_skill(self, skill_id: str) -> Optional[SkillMetadata]:
        """Get metadata for a specific skill."""
        self._ensure_index()
        return self._metadata_cache.get(skill_id)
    
    def read_skill(self, skill_id: str, 
                   section: str = None,
                   max_chars: int = None) -> Dict[str, Any]:
        """
        Read skill content.
        
        Args:
            skill_id: Skill ID (e.g., "prism-quick-start")
            section: Optional section heading to extract
            max_chars: Optional max characters to return
            
        Returns:
            Dict with content, metadata, and optionally sections
        """
        self._ensure_index()
        
        metadata = self._metadata_cache.get(skill_id)
        if not metadata:
            # Try partial match
            matches = [s for s in self._metadata_cache.keys() if skill_id.lower() in s.lower()]
            if matches:
                return {
                    "error": f"Skill not found: {skill_id}",
                    "suggestions": matches[:5]
                }
            return {"error": f"Skill not found: {skill_id}"}
        
        content = self._get_content(skill_id)
        if not content:
            return {"error": f"Could not read skill content: {skill_id}"}
        
        # Extract specific section if requested
        if section:
            sections = self._extract_sections(content)
            for sec in sections:
                if section.lower() in sec.heading.lower():
                    return {
                        "skill_id": skill_id,
                        "metadata": metadata.to_dict(),
                        "section": sec.to_dict(),
                        "content": sec.content[:max_chars] if max_chars else sec.content
                    }
            
            return {
                "skill_id": skill_id,
                "metadata": metadata.to_dict(),
                "error": f"Section not found: {section}",
                "available_sections": [s.heading for s in sections]
            }
        
        # Return full content
        result_content = content[:max_chars] if max_chars else content
        truncated = max_chars and len(content) > max_chars
        
        return {
            "skill_id": skill_id,
            "metadata": metadata.to_dict(),
            "content": result_content,
            "truncated": truncated,
            "total_chars": len(content)
        }
    
    def search_skills(self, query: str, 
                      limit: int = 10,
                      search_content: bool = True) -> List[SkillSearchResult]:
        """
        Search across all skills.
        
        Args:
            query: Search query
            limit: Maximum results
            search_content: Search within content (not just metadata)
            
        Returns:
            List of SkillSearchResult
        """
        self._ensure_index()
        
        results = []
        query_lower = query.lower()
        query_words = query_lower.split()
        
        for skill_id, metadata in self._metadata_cache.items():
            matches = []
            relevance = 0.0
            
            # Search in metadata
            if query_lower in skill_id.lower():
                relevance += 1.0
                matches.append({"field": "id", "match": skill_id})
            
            if query_lower in metadata.name.lower():
                relevance += 0.8
                matches.append({"field": "name", "match": metadata.name})
            
            if query_lower in metadata.description.lower():
                relevance += 0.5
                matches.append({"field": "description", "match": metadata.description[:100]})
            
            # Search in tags
            for tag in metadata.tags:
                if query_lower in tag.lower():
                    relevance += 0.3
                    matches.append({"field": "tag", "match": tag})
            
            # Search in content
            if search_content:
                content = self._get_content(skill_id)
                if content:
                    lines = content.split('\n')
                    content_matches = 0
                    
                    for i, line in enumerate(lines):
                        if query_lower in line.lower():
                            content_matches += 1
                            if len(matches) < 5:  # Limit content matches
                                context_start = max(0, i - 1)
                                context_end = min(len(lines), i + 2)
                                context = '\n'.join(lines[context_start:context_end])
                                matches.append({
                                    "field": "content",
                                    "line_number": i + 1,
                                    "content": line[:200],
                                    "context": context[:300]
                                })
                    
                    if content_matches > 0:
                        relevance += min(content_matches * 0.1, 0.5)
            
            if relevance > 0:
                results.append(SkillSearchResult(
                    skill_id=skill_id,
                    skill_name=metadata.name,
                    matches=matches,
                    relevance=round(relevance, 2)
                ))
        
        # Sort by relevance
        results.sort(key=lambda r: r.relevance, reverse=True)
        
        return results[:limit]
    
    def get_skill_sections(self, skill_id: str) -> List[SkillSection]:
        """Get all sections from a skill."""
        content = self._get_content(skill_id)
        if not content:
            return []
        
        return self._extract_sections(content)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get skill statistics."""
        self._ensure_index()
        
        total_size = sum(m.size_bytes for m in self._metadata_cache.values())
        
        # Count by tag
        tag_counts = defaultdict(int)
        for metadata in self._metadata_cache.values():
            for tag in metadata.tags:
                tag_counts[tag] += 1
        
        return {
            "total_skills": len(self._metadata_cache),
            "total_size_bytes": total_size,
            "total_size_kb": round(total_size / 1024, 1),
            "skills_path": str(self.skills_path),
            "cached_content": len(self._skill_cache),
            "by_tag": dict(sorted(tag_counts.items(), key=lambda x: x[1], reverse=True))
        }


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Skill Loader")
    parser.add_argument('--list', action='store_true', help='List all skills')
    parser.add_argument('--read', type=str, help='Read skill by ID')
    parser.add_argument('--search', type=str, help='Search skills')
    parser.add_argument('--section', type=str, help='Section to extract (with --read)')
    parser.add_argument('--stats', action='store_true', help='Show statistics')
    
    args = parser.parse_args()
    loader = SkillLoader()
    
    if args.list:
        skills = loader.list_skills()
        print(f"Found {len(skills)} skills:")
        for s in skills:
            print(f"  {s.id}: {s.name} ({s.size_bytes} bytes)")
    
    elif args.read:
        result = loader.read_skill(args.read, section=args.section, max_chars=2000)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.search:
        results = loader.search_skills(args.search)
        print(f"Found {len(results)} results:")
        for r in results:
            print(f"  [{r.relevance}] {r.skill_id}: {r.skill_name}")
            for m in r.matches[:2]:
                print(f"    - {m.get('field')}: {str(m.get('match', m.get('content', '')))[:60]}")
    
    elif args.stats:
        stats = loader.get_statistics()
        print(json.dumps(stats, indent=2))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
