#!/usr/bin/env python3
"""
PRISM Resource MCP Tools v1.0
Session 2.1 Deliverable: MCP wrappers for all registries.

MCP tools:
- prism_resource_get: Get resource by ID
- prism_resource_search: Search across all resources
- prism_resource_list: List resources by type/category
- prism_registry_get: Get raw registry data
"""
import sys
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List

# Import resource accessor
try:
    from resource_accessor import ResourceAccessor, ResourceType, Resource, SearchResult
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from resource_accessor import ResourceAccessor, ResourceType, Resource, SearchResult


class ResourceMCP:
    """MCP tools for resource access."""
    
    def __init__(self):
        self.accessor = ResourceAccessor(lazy_load=True)
    
    def prism_resource_get(self, resource_id: str,
                           include_related: bool = False) -> Dict[str, Any]:
        """
        Get a resource by ID.
        
        Args:
            resource_id: Resource ID to retrieve
            include_related: Include related resources
            
        Returns:
            Dict with:
            - found: Whether resource was found
            - resource: Resource details (if found)
            - related: Related resources (if requested)
        """
        if not resource_id:
            return {"error": "resource_id required"}
        
        resource = self.accessor.get(resource_id)
        
        if not resource:
            # Try search if exact match fails
            results = self.accessor.search(resource_id, limit=5)
            if results:
                return {
                    "found": False,
                    "error": f"Resource not found: {resource_id}",
                    "suggestions": [
                        {"id": r.resource.id, "name": r.resource.name, "type": r.resource.type.value}
                        for r in results
                    ]
                }
            return {"found": False, "error": f"Resource not found: {resource_id}"}
        
        result = {
            "found": True,
            "resource": resource.to_dict()
        }
        
        if include_related:
            related = self.accessor.find_related(resource_id)
            result["related"] = [r.to_dict() for r in related[:10]]
        
        return result
    
    def prism_resource_search(self, query: str,
                              types: List[str] = None,
                              category: str = None,
                              limit: int = 20) -> Dict[str, Any]:
        """
        Search across all PRISM resources.
        
        Args:
            query: Search query (searches id, name, description, tags)
            types: Filter by resource types (skill, agent, hook, formula, engine, etc.)
            category: Filter by category
            limit: Maximum results (default 20, max 100)
            
        Returns:
            Dict with:
            - query: Original query
            - count: Number of results
            - results: List of matching resources with relevance scores
        """
        if not query:
            return {"error": "query required"}
        
        # Convert type strings to enums
        type_enums = None
        if types:
            type_enums = []
            for t in types:
                try:
                    type_enums.append(ResourceType(t.lower()))
                except ValueError:
                    pass
        
        # Search
        results = self.accessor.search(query, type_enums, min(limit, 100))
        
        # Filter by category if specified
        if category:
            results = [r for r in results if category.lower() in r.resource.category.lower()]
        
        return {
            "query": query,
            "filters": {
                "types": types,
                "category": category
            },
            "count": len(results),
            "results": [
                {
                    "id": r.resource.id,
                    "name": r.resource.name,
                    "type": r.resource.type.value,
                    "category": r.resource.category,
                    "description": r.resource.description[:200] if r.resource.description else "",
                    "relevance": round(r.relevance, 2),
                    "match_fields": r.match_fields
                }
                for r in results
            ]
        }
    
    def prism_resource_list(self, resource_type: str = None,
                            category: str = None,
                            limit: int = 50) -> Dict[str, Any]:
        """
        List resources by type or category.
        
        Args:
            resource_type: Filter by type (skill, agent, hook, formula, engine, database, script)
            category: Filter by category
            limit: Maximum results (default 50)
            
        Returns:
            Dict with:
            - filter: Applied filters
            - count: Number of results
            - resources: List of resources
            - statistics: Type and category counts
        """
        # Get statistics first
        stats = self.accessor.get_statistics()
        
        resources = []
        
        if resource_type:
            try:
                res_type = ResourceType(resource_type.lower())
                resources = self.accessor.get_by_type(res_type)
            except ValueError:
                return {
                    "error": f"Invalid resource_type: {resource_type}",
                    "valid_types": [t.value for t in ResourceType]
                }
        elif category:
            resources = self.accessor.get_by_category(category)
        else:
            # Return all types summary
            return {
                "statistics": stats,
                "hint": "Use resource_type or category to filter resources",
                "valid_types": [t.value for t in ResourceType]
            }
        
        return {
            "filter": {
                "resource_type": resource_type,
                "category": category
            },
            "count": len(resources),
            "resources": [
                {
                    "id": r.id,
                    "name": r.name,
                    "type": r.type.value,
                    "category": r.category,
                    "description": r.description[:100] if r.description else ""
                }
                for r in resources[:limit]
            ],
            "total_available": len(resources),
            "statistics": stats
        }
    
    def prism_registry_get(self, registry: str,
                           section: str = None) -> Dict[str, Any]:
        """
        Get raw registry data.
        
        Args:
            registry: Registry name (skill, agent, hook, formula, engine, database, script, wiring, capability, synergy)
            section: Optional section/key to extract
            
        Returns:
            Dict with registry data or section
        """
        if not registry:
            return {
                "error": "registry required",
                "available_registries": [t.value for t in ResourceType]
            }
        
        try:
            res_type = ResourceType(registry.lower())
        except ValueError:
            return {
                "error": f"Invalid registry: {registry}",
                "available_registries": [t.value for t in ResourceType]
            }
        
        data = self.accessor.get_registry(res_type)
        
        if not data:
            return {
                "error": f"Registry not found or empty: {registry}",
                "note": "Registry may not have been loaded"
            }
        
        if section:
            section_data = data.get(section)
            if section_data:
                return {
                    "registry": registry,
                    "section": section,
                    "data": section_data
                }
            else:
                return {
                    "error": f"Section not found: {section}",
                    "available_sections": list(data.keys())[:20]
                }
        
        # Return summary for large registries
        if isinstance(data, dict) and len(json.dumps(data)) > 10000:
            return {
                "registry": registry,
                "keys": list(data.keys()),
                "summary": {k: type(v).__name__ for k, v in data.items()},
                "hint": "Use section parameter to get specific section"
            }
        
        return {
            "registry": registry,
            "data": data
        }
    
    def prism_resource_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive resource statistics.
        
        Returns:
            Dict with counts by type, category, and overall totals
        """
        return self.accessor.get_statistics()
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Generic call interface for MCP integration."""
        params = params or {}
        
        if tool_name == "prism_resource_get":
            return self.prism_resource_get(**params)
        elif tool_name == "prism_resource_search":
            return self.prism_resource_search(**params)
        elif tool_name == "prism_resource_list":
            return self.prism_resource_list(**params)
        elif tool_name == "prism_registry_get":
            return self.prism_registry_get(**params)
        elif tool_name == "prism_resource_stats":
            return self.prism_resource_stats()
        else:
            return {"error": f"Unknown tool: {tool_name}"}


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Resource MCP Tools")
    parser.add_argument('--stats', action='store_true', help='Show statistics')
    parser.add_argument('--search', type=str, help='Search resources')
    parser.add_argument('--get', type=str, help='Get resource by ID')
    parser.add_argument('--list', type=str, help='List resources by type')
    parser.add_argument('--registry', type=str, help='Get registry data')
    
    args = parser.parse_args()
    mcp = ResourceMCP()
    
    if args.stats:
        result = mcp.prism_resource_stats()
        print(json.dumps(result, indent=2))
    
    elif args.search:
        result = mcp.prism_resource_search(args.search)
        print(f"Found {result['count']} results:")
        for r in result['results'][:10]:
            print(f"  [{r['type']}] {r['id']}: {r['name']} ({r['relevance']})")
    
    elif args.get:
        result = mcp.prism_resource_get(args.get, include_related=True)
        print(json.dumps(result, indent=2))
    
    elif args.list:
        result = mcp.prism_resource_list(args.list)
        print(json.dumps(result, indent=2))
    
    elif args.registry:
        result = mcp.prism_registry_get(args.registry)
        print(json.dumps(result, indent=2))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
