#!/usr/bin/env python3
"""
PRISM Resource Accessor v1.0
Session 2.1 Deliverable: Unified access to all PRISM registries and resources.

Provides:
- Unified loading of all registries
- Cross-resource search
- Resource relationships and wiring
- Integration with existing skill files
- MCP-ready interface
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
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum
from collections import defaultdict

# Paths
PRISM_ROOT = Path("C:/PRISM")
REGISTRY_DIR = PRISM_ROOT / "registries"
SKILLS_DIR = PRISM_ROOT / "skills-consolidated"
SKILLS_MNT = Path("/mnt/skills/user")
STATE_DIR = PRISM_ROOT / "state"

class ResourceType(Enum):
    """Types of PRISM resources."""
    SKILL = "skill"
    AGENT = "agent"
    HOOK = "hook"
    FORMULA = "formula"
    ENGINE = "engine"
    DATABASE = "database"
    SCRIPT = "script"
    WIRING = "wiring"
    CAPABILITY = "capability"
    SYNERGY = "synergy"

@dataclass
class Resource:
    """A PRISM resource."""
    id: str
    name: str
    type: ResourceType
    description: str = ""
    category: str = ""
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['type'] = self.type.value
        return d
    
    def matches(self, query: str) -> bool:
        """Check if resource matches search query."""
        q = query.lower()
        return (q in self.id.lower() or 
                q in self.name.lower() or 
                q in self.description.lower() or
                q in self.category.lower() or
                any(q in t.lower() for t in self.tags))

@dataclass
class SearchResult:
    """Search result with relevance."""
    resource: Resource
    relevance: float
    match_fields: List[str]
    
    def to_dict(self) -> Dict:
        return {
            "resource": self.resource.to_dict(),
            "relevance": self.relevance,
            "match_fields": self.match_fields
        }

class ResourceAccessor:
    """Unified access to all PRISM resources."""
    
    # Core registry files
    CORE_REGISTRIES = {
        ResourceType.SKILL: "SKILL_REGISTRY.json",
        ResourceType.AGENT: "AGENT_REGISTRY.json",
        ResourceType.HOOK: "HOOK_REGISTRY.json",
        ResourceType.FORMULA: "FORMULA_REGISTRY.json",
        ResourceType.ENGINE: "ENGINE_REGISTRY.json",
        ResourceType.DATABASE: "DATABASE_REGISTRY.json",
        ResourceType.SCRIPT: "SCRIPT_REGISTRY.json",
        ResourceType.WIRING: "WIRING_REGISTRY.json",
        ResourceType.CAPABILITY: "CAPABILITY_MATRIX.json",
        ResourceType.SYNERGY: "SYNERGY_MATRIX.json",
    }
    
    # Additional registries to load
    ADDITIONAL_REGISTRIES = [
        "RESOURCE_REGISTRY.json",
        "MCP_RESOURCE_REGISTRY.json",
        "EXTERNAL_RESOURCES_REGISTRY.json",
    ]
    
    def __init__(self, lazy_load: bool = True):
        self.registries: Dict[ResourceType, Dict] = {}
        self.resources: Dict[str, Resource] = {}
        self.by_type: Dict[ResourceType, List[Resource]] = defaultdict(list)
        self.by_category: Dict[str, List[Resource]] = defaultdict(list)
        self.loaded = False
        
        if not lazy_load:
            self.load_all()
    
    def _ensure_loaded(self):
        """Ensure registries are loaded."""
        if not self.loaded:
            self.load_all()
    
    def load_all(self):
        """Load all registries."""
        # Load core registries
        for res_type, filename in self.CORE_REGISTRIES.items():
            self._load_registry(res_type, filename)
        
        # Load additional registries
        for filename in self.ADDITIONAL_REGISTRIES:
            self._load_additional_registry(filename)
        
        # Load skill files from /mnt/skills/user
        self._load_skill_files()
        
        self.loaded = True
    
    def _load_registry(self, res_type: ResourceType, filename: str):
        """Load a core registry."""
        path = REGISTRY_DIR / filename
        if not path.exists():
            return
        
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
            self.registries[res_type] = data
            
            # Extract resources based on registry type
            self._extract_resources(res_type, data)
        except Exception as e:
            print(f"Warning: Failed to load {filename}: {e}")
    
    def _load_additional_registry(self, filename: str):
        """Load an additional registry."""
        path = REGISTRY_DIR / filename
        if not path.exists():
            return
        
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
            # Merge into main resource pool
            if isinstance(data, dict):
                for key, value in data.items():
                    if isinstance(value, dict) and 'type' in value:
                        res = self._create_resource_from_dict(key, value)
                        if res:
                            self._add_resource(res)
        except:
            pass
    
    def _load_skill_files(self):
        """Load skill definitions from /mnt/skills/user."""
        if SKILLS_MNT.exists():
            for skill_dir in SKILLS_MNT.glob("prism-*"):
                skill_file = skill_dir / "SKILL.md"
                if skill_file.exists():
                    self._parse_skill_file(skill_dir.name, skill_file)
    
    def _parse_skill_file(self, skill_id: str, path: Path):
        """Parse a SKILL.md file."""
        try:
            content = path.read_text(encoding='utf-8')
            
            # Extract name from first heading
            name_match = re.search(r'^#\s+(.+?)$', content, re.MULTILINE)
            name = name_match.group(1) if name_match else skill_id
            
            # Extract description
            desc_match = re.search(r'^#.*?\n\n(.+?)(?=\n#|\n\n#|$)', content, re.DOTALL)
            desc = desc_match.group(1).strip()[:200] if desc_match else ""
            
            res = Resource(
                id=skill_id,
                name=name,
                type=ResourceType.SKILL,
                description=desc,
                category="skill_file",
                tags=["mnt", "fast-load"],
                metadata={"path": str(path), "source": "mnt_skills"}
            )
            self._add_resource(res)
        except:
            pass
    
    def _extract_resources(self, res_type: ResourceType, data: Dict):
        """Extract resources from registry data."""
        if res_type == ResourceType.SKILL:
            self._extract_skills(data)
        elif res_type == ResourceType.AGENT:
            self._extract_agents(data)
        elif res_type == ResourceType.HOOK:
            self._extract_hooks(data)
        elif res_type == ResourceType.FORMULA:
            self._extract_formulas(data)
        elif res_type == ResourceType.ENGINE:
            self._extract_engines(data)
        elif res_type == ResourceType.DATABASE:
            self._extract_databases(data)
        elif res_type == ResourceType.SCRIPT:
            self._extract_scripts(data)
        elif res_type == ResourceType.WIRING:
            self._extract_wirings(data)
        elif res_type == ResourceType.CAPABILITY:
            self._extract_capabilities(data)
        elif res_type == ResourceType.SYNERGY:
            self._extract_synergies(data)
    
    def _extract_skills(self, data: Dict):
        """Extract skills from registry."""
        skills = data.get('skills', data.get('items', []))
        if isinstance(skills, dict):
            skills = list(skills.values())
        
        for item in skills:
            if isinstance(item, dict):
                res = Resource(
                    id=item.get('id', item.get('name', '')),
                    name=item.get('name', item.get('id', '')),
                    type=ResourceType.SKILL,
                    description=item.get('description', ''),
                    category=item.get('category', 'general'),
                    tags=item.get('tags', []),
                    metadata=item
                )
                self._add_resource(res)
    
    def _extract_agents(self, data: Dict):
        """Extract agents from registry."""
        agents = data.get('agents', data.get('items', []))
        if isinstance(agents, dict):
            agents = list(agents.values())
        
        for item in agents:
            if isinstance(item, dict):
                res = Resource(
                    id=item.get('id', item.get('name', '')),
                    name=item.get('name', item.get('id', '')),
                    type=ResourceType.AGENT,
                    description=item.get('description', ''),
                    category=item.get('tier', item.get('category', 'general')),
                    tags=item.get('tags', []),
                    metadata=item
                )
                self._add_resource(res)
    
    def _extract_hooks(self, data: Dict):
        """Extract hooks from registry."""
        hooks = data.get('hooks', data.get('items', []))
        if isinstance(hooks, dict):
            for cat, items in hooks.items():
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, dict):
                            res = Resource(
                                id=item.get('id', item.get('name', '')),
                                name=item.get('name', item.get('id', '')),
                                type=ResourceType.HOOK,
                                description=item.get('description', ''),
                                category=cat,
                                tags=item.get('tags', []),
                                metadata=item
                            )
                            self._add_resource(res)
        elif isinstance(hooks, list):
            for item in hooks:
                if isinstance(item, dict):
                    res = Resource(
                        id=item.get('id', item.get('name', '')),
                        name=item.get('name', item.get('id', '')),
                        type=ResourceType.HOOK,
                        description=item.get('description', ''),
                        category=item.get('category', 'general'),
                        tags=item.get('tags', []),
                        metadata=item
                    )
                    self._add_resource(res)
    
    def _extract_formulas(self, data: Dict):
        """Extract formulas from registry."""
        formulas = data.get('formulas', data.get('items', []))
        if isinstance(formulas, dict):
            for domain, items in formulas.items():
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, dict):
                            res = Resource(
                                id=item.get('id', item.get('name', '')),
                                name=item.get('name', item.get('id', '')),
                                type=ResourceType.FORMULA,
                                description=item.get('description', item.get('formula', '')),
                                category=domain,
                                tags=item.get('tags', []),
                                metadata=item
                            )
                            self._add_resource(res)
        elif isinstance(formulas, list):
            for item in formulas:
                if isinstance(item, dict):
                    res = Resource(
                        id=item.get('id', item.get('name', '')),
                        name=item.get('name', item.get('id', '')),
                        type=ResourceType.FORMULA,
                        description=item.get('description', item.get('formula', '')),
                        category=item.get('domain', item.get('category', 'general')),
                        tags=item.get('tags', []),
                        metadata=item
                    )
                    self._add_resource(res)
    
    def _extract_engines(self, data: Dict):
        """Extract engines from registry."""
        engines = data.get('engines', data.get('items', []))
        if isinstance(engines, dict):
            engines = list(engines.values())
        
        for item in engines:
            if isinstance(item, dict):
                res = Resource(
                    id=item.get('id', item.get('name', '')),
                    name=item.get('name', item.get('id', '')),
                    type=ResourceType.ENGINE,
                    description=item.get('description', ''),
                    category=item.get('category', 'general'),
                    tags=item.get('tags', []),
                    metadata=item
                )
                self._add_resource(res)
    
    def _extract_databases(self, data: Dict):
        """Extract databases from registry."""
        dbs = data.get('databases', data.get('items', []))
        if isinstance(dbs, dict):
            dbs = list(dbs.values())
        
        for item in dbs:
            if isinstance(item, dict):
                res = Resource(
                    id=item.get('id', item.get('name', '')),
                    name=item.get('name', item.get('id', '')),
                    type=ResourceType.DATABASE,
                    description=item.get('description', ''),
                    category=item.get('category', 'general'),
                    tags=item.get('tags', []),
                    metadata=item
                )
                self._add_resource(res)
    
    def _extract_scripts(self, data: Dict):
        """Extract scripts from registry."""
        scripts = data.get('scripts', data.get('items', []))
        if isinstance(scripts, dict):
            scripts = list(scripts.values())
        
        for item in scripts:
            if isinstance(item, dict):
                res = Resource(
                    id=item.get('id', item.get('name', '')),
                    name=item.get('name', item.get('id', '')),
                    type=ResourceType.SCRIPT,
                    description=item.get('description', ''),
                    category=item.get('category', 'general'),
                    tags=item.get('tags', []),
                    metadata=item
                )
                self._add_resource(res)
    
    def _extract_wirings(self, data: Dict):
        """Extract wirings from registry."""
        wirings = data.get('wirings', data.get('connections', []))
        if isinstance(wirings, list):
            for item in wirings:
                if isinstance(item, dict):
                    res = Resource(
                        id=item.get('id', f"wiring_{len(self.by_type[ResourceType.WIRING])}"),
                        name=item.get('name', item.get('source', '') + '->' + item.get('target', '')),
                        type=ResourceType.WIRING,
                        description=item.get('description', ''),
                        category=item.get('type', 'connection'),
                        tags=item.get('tags', []),
                        metadata=item
                    )
                    self._add_resource(res)
    
    def _extract_capabilities(self, data: Dict):
        """Extract capabilities from matrix."""
        caps = data.get('capabilities', data.get('matrix', {}))
        if isinstance(caps, dict):
            for cap_id, cap_data in caps.items():
                if isinstance(cap_data, dict):
                    res = Resource(
                        id=cap_id,
                        name=cap_data.get('name', cap_id),
                        type=ResourceType.CAPABILITY,
                        description=cap_data.get('description', ''),
                        category=cap_data.get('category', 'general'),
                        tags=cap_data.get('tags', []),
                        metadata=cap_data
                    )
                    self._add_resource(res)
    
    def _extract_synergies(self, data: Dict):
        """Extract synergies from matrix."""
        synergies = data.get('synergies', data.get('matrix', {}))
        if isinstance(synergies, dict):
            for syn_id, syn_data in synergies.items():
                if isinstance(syn_data, dict):
                    res = Resource(
                        id=syn_id,
                        name=syn_data.get('name', syn_id),
                        type=ResourceType.SYNERGY,
                        description=syn_data.get('description', ''),
                        category=syn_data.get('category', 'general'),
                        tags=syn_data.get('tags', []),
                        metadata=syn_data
                    )
                    self._add_resource(res)
    
    def _create_resource_from_dict(self, key: str, data: Dict) -> Optional[Resource]:
        """Create a resource from a dictionary."""
        try:
            res_type = ResourceType(data.get('type', 'skill'))
        except ValueError:
            res_type = ResourceType.SKILL
        
        return Resource(
            id=key,
            name=data.get('name', key),
            type=res_type,
            description=data.get('description', ''),
            category=data.get('category', 'general'),
            tags=data.get('tags', []),
            metadata=data
        )
    
    def _add_resource(self, resource: Resource):
        """Add a resource to the index."""
        if resource.id and resource.id not in self.resources:
            self.resources[resource.id] = resource
            self.by_type[resource.type].append(resource)
            self.by_category[resource.category].append(resource)
    
    # ===== PUBLIC API =====
    
    def get(self, resource_id: str) -> Optional[Resource]:
        """Get a resource by ID."""
        self._ensure_loaded()
        return self.resources.get(resource_id)
    
    def get_by_type(self, res_type: ResourceType) -> List[Resource]:
        """Get all resources of a type."""
        self._ensure_loaded()
        return self.by_type.get(res_type, [])
    
    def get_by_category(self, category: str) -> List[Resource]:
        """Get all resources in a category."""
        self._ensure_loaded()
        return self.by_category.get(category, [])
    
    def search(self, query: str, types: List[ResourceType] = None,
               limit: int = 20) -> List[SearchResult]:
        """
        Search across all resources.
        
        Args:
            query: Search query
            types: Optional filter by resource types
            limit: Maximum results
            
        Returns:
            List of SearchResults sorted by relevance
        """
        self._ensure_loaded()
        
        results = []
        q = query.lower()
        
        for resource in self.resources.values():
            # Filter by type if specified
            if types and resource.type not in types:
                continue
            
            # Calculate relevance
            relevance = 0.0
            match_fields = []
            
            # ID match (highest)
            if q in resource.id.lower():
                relevance += 1.0
                match_fields.append("id")
            
            # Name match
            if q in resource.name.lower():
                relevance += 0.8
                match_fields.append("name")
            
            # Description match
            if q in resource.description.lower():
                relevance += 0.5
                match_fields.append("description")
            
            # Category match
            if q in resource.category.lower():
                relevance += 0.3
                match_fields.append("category")
            
            # Tag match
            if any(q in t.lower() for t in resource.tags):
                relevance += 0.4
                match_fields.append("tags")
            
            if relevance > 0:
                results.append(SearchResult(resource, relevance, match_fields))
        
        # Sort by relevance
        results.sort(key=lambda r: r.relevance, reverse=True)
        
        return results[:limit]
    
    def list_types(self) -> Dict[str, int]:
        """List all resource types with counts."""
        self._ensure_loaded()
        return {t.value: len(resources) for t, resources in self.by_type.items()}
    
    def list_categories(self) -> Dict[str, int]:
        """List all categories with counts."""
        self._ensure_loaded()
        return {c: len(resources) for c, resources in self.by_category.items()}
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get resource statistics."""
        self._ensure_loaded()
        
        return {
            "total_resources": len(self.resources),
            "by_type": self.list_types(),
            "by_category": {k: v for k, v in sorted(
                self.list_categories().items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:20]},
            "registries_loaded": len(self.registries),
            "loaded": self.loaded
        }
    
    def get_registry(self, res_type: ResourceType) -> Optional[Dict]:
        """Get raw registry data for a type."""
        self._ensure_loaded()
        return self.registries.get(res_type)
    
    def find_related(self, resource_id: str) -> List[Resource]:
        """Find resources related to a given resource."""
        self._ensure_loaded()
        
        resource = self.get(resource_id)
        if not resource:
            return []
        
        related = []
        
        # Find by same category
        for r in self.by_category.get(resource.category, []):
            if r.id != resource_id:
                related.append(r)
        
        # Find by matching tags
        for tag in resource.tags:
            for r in self.resources.values():
                if r.id != resource_id and tag in r.tags and r not in related:
                    related.append(r)
        
        return related[:20]


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Resource Accessor")
    parser.add_argument('--stats', action='store_true', help='Show statistics')
    parser.add_argument('--search', type=str, help='Search resources')
    parser.add_argument('--type', type=str, help='Filter by type')
    parser.add_argument('--get', type=str, help='Get resource by ID')
    parser.add_argument('--list', type=str, help='List resources by type')
    
    args = parser.parse_args()
    accessor = ResourceAccessor(lazy_load=False)
    
    if args.stats:
        stats = accessor.get_statistics()
        print(json.dumps(stats, indent=2))
    
    elif args.search:
        types = [ResourceType(args.type)] if args.type else None
        results = accessor.search(args.search, types)
        print(f"Found {len(results)} results:")
        for r in results:
            print(f"  [{r.resource.type.value}] {r.resource.id}: {r.resource.name} ({r.relevance:.2f})")
    
    elif args.get:
        resource = accessor.get(args.get)
        if resource:
            print(json.dumps(resource.to_dict(), indent=2))
        else:
            print(f"Resource not found: {args.get}")
    
    elif args.list:
        try:
            res_type = ResourceType(args.list)
            resources = accessor.get_by_type(res_type)
            print(f"{res_type.value} resources ({len(resources)}):")
            for r in resources[:30]:
                print(f"  {r.id}: {r.name}")
        except ValueError:
            print(f"Invalid type: {args.list}")
            print(f"Valid types: {[t.value for t in ResourceType]}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
