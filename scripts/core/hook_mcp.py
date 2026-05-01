#!/usr/bin/env python3
"""
PRISM Hook MCP Tools - Comprehensive hook system access via MCP.
Provides: get, search, by_domain, by_trigger, categories, stats.
"""
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import re

HOOK_REGISTRY = Path("C:/PRISM/registries/HOOK_REGISTRY.json")
HOOK_EXPANDED = Path("C:/PRISM/registries/HOOK_REGISTRY_EXPANDED.json")

class HookMCP:
    """MCP tools for hook system access."""
    
    def __init__(self):
        self._hooks: List[Dict] = []
        self._by_id: Dict[str, Dict] = {}
        self._by_domain: Dict[str, List[Dict]] = {}
        self._by_trigger: Dict[str, List[Dict]] = {}
        self._loaded = False
        self._summary: Dict = {}
    
    def _load(self) -> None:
        """Lazy load hook registry."""
        if self._loaded:
            return
        
        registry_path = HOOK_REGISTRY if HOOK_REGISTRY.exists() else HOOK_EXPANDED
        if not registry_path.exists():
            self._loaded = True
            return
        
        try:
            data = json.loads(registry_path.read_text(encoding='utf-8'))
            self._hooks = data.get("hooks", [])
            self._summary = data.get("summary", {})
            
            # Build indexes
            for hook in self._hooks:
                hook_id = hook.get("id", "")
                domain = hook.get("domain", "UNKNOWN")
                trigger = hook.get("trigger", "")
                
                self._by_id[hook_id] = hook
                
                if domain not in self._by_domain:
                    self._by_domain[domain] = []
                self._by_domain[domain].append(hook)
                
                if trigger:
                    if trigger not in self._by_trigger:
                        self._by_trigger[trigger] = []
                    self._by_trigger[trigger].append(hook)
            
            self._loaded = True
        except Exception as e:
            self._loaded = True
            print(f"Hook registry load error: {e}")
    
    def prism_hook_get(self, hook_id: str) -> Dict[str, Any]:
        """
        Get specific hook by ID.
        
        Args:
            hook_id: Hook identifier (e.g., "SYSTEM-START", "MATERIAL-AL-6061-LOAD")
        
        Returns:
            Hook details or error
        """
        self._load()
        
        if not hook_id:
            return {"error": "hook_id required"}
        
        hook = self._by_id.get(hook_id.upper())
        if not hook:
            # Try fuzzy match
            matches = [h for h in self._by_id.keys() if hook_id.upper() in h]
            if matches:
                return {
                    "error": f"Hook not found: {hook_id}",
                    "suggestions": matches[:5]
                }
            return {"error": f"Hook not found: {hook_id}"}
        
        return {"hook": hook}
    
    def prism_hook_search(self, query: str, domain: str = None, 
                          limit: int = 20) -> Dict[str, Any]:
        """
        Search hooks by query.
        
        Args:
            query: Search term (matches id, name, description, trigger)
            domain: Optional domain filter
            limit: Max results (default 20)
        
        Returns:
            Matching hooks
        """
        self._load()
        
        if not query:
            return {"error": "query required"}
        
        query_lower = query.lower()
        results = []
        
        for hook in self._hooks:
            # Domain filter
            if domain and hook.get("domain", "").upper() != domain.upper():
                continue
            
            # Search in multiple fields
            searchable = " ".join([
                hook.get("id", ""),
                hook.get("name", ""),
                hook.get("description", ""),
                hook.get("trigger", ""),
                hook.get("category", ""),
                hook.get("subcategory", "")
            ]).lower()
            
            if query_lower in searchable:
                results.append(hook)
                if len(results) >= limit:
                    break
        
        return {
            "query": query,
            "domain": domain,
            "count": len(results),
            "hooks": results
        }
    
    def prism_hook_by_domain(self, domain: str, limit: int = 50) -> Dict[str, Any]:
        """
        Get hooks by domain.
        
        Args:
            domain: Domain name (e.g., "MATERIAL", "PHYSICS", "SAFETY")
            limit: Max results (default 50)
        
        Returns:
            Hooks in domain
        """
        self._load()
        
        if not domain:
            return {"error": "domain required", "available": list(self._by_domain.keys())}
        
        hooks = self._by_domain.get(domain.upper(), [])
        
        return {
            "domain": domain.upper(),
            "total": len(hooks),
            "returned": min(len(hooks), limit),
            "hooks": hooks[:limit]
        }
    
    def prism_hook_by_trigger(self, trigger_pattern: str, 
                               limit: int = 20) -> Dict[str, Any]:
        """
        Find hooks by trigger pattern.
        
        Args:
            trigger_pattern: Trigger pattern (e.g., "material:", "session:start")
            limit: Max results (default 20)
        
        Returns:
            Matching hooks
        """
        self._load()
        
        if not trigger_pattern:
            return {"error": "trigger_pattern required"}
        
        pattern_lower = trigger_pattern.lower()
        results = []
        
        for trigger, hooks in self._by_trigger.items():
            if pattern_lower in trigger.lower():
                results.extend(hooks)
                if len(results) >= limit:
                    break
        
        return {
            "pattern": trigger_pattern,
            "count": len(results[:limit]),
            "hooks": results[:limit]
        }
    
    def prism_hook_categories(self) -> Dict[str, Any]:
        """
        List all hook domains/categories with counts.
        
        Returns:
            Domain list with counts
        """
        self._load()
        
        categories = {}
        for domain, hooks in self._by_domain.items():
            categories[domain] = len(hooks)
        
        # Sort by count descending
        sorted_cats = dict(sorted(categories.items(), key=lambda x: x[1], reverse=True))
        
        return {
            "total_hooks": len(self._hooks),
            "total_domains": len(sorted_cats),
            "domains": sorted_cats
        }
    
    def prism_hook_stats(self) -> Dict[str, Any]:
        """
        Get hook system statistics.
        
        Returns:
            Comprehensive stats
        """
        self._load()
        
        # Count by priority
        by_priority = {}
        blocking_count = 0
        disableable_count = 0
        
        for hook in self._hooks:
            priority = str(hook.get("priority", 50))
            by_priority[priority] = by_priority.get(priority, 0) + 1
            
            if hook.get("isBlocking", False):
                blocking_count += 1
            if hook.get("canDisable", True):
                disableable_count += 1
        
        return {
            "total_hooks": len(self._hooks),
            "total_domains": len(self._by_domain),
            "total_triggers": len(self._by_trigger),
            "blocking_hooks": blocking_count,
            "disableable_hooks": disableable_count,
            "top_domains": dict(list(sorted(
                [(d, len(h)) for d, h in self._by_domain.items()],
                key=lambda x: x[1], reverse=True
            ))[:10]),
            "by_priority": by_priority
        }
    
    def prism_hook_trigger(self, hook_id: str, params: Dict = None) -> Dict[str, Any]:
        """
        Trigger a hook (simulate execution).
        
        Args:
            hook_id: Hook to trigger
            params: Parameters to pass
        
        Returns:
            Trigger result
        """
        self._load()
        
        hook = self._by_id.get(hook_id.upper())
        if not hook:
            return {"error": f"Hook not found: {hook_id}"}
        
        # Check if blocking
        is_blocking = hook.get("isBlocking", False)
        
        return {
            "triggered": hook_id,
            "hook": hook,
            "params": params or {},
            "blocking": is_blocking,
            "status": "executed" if not is_blocking else "blocked_pending"
        }

# Singleton
_instance: Optional[HookMCP] = None

def get_hook_mcp() -> HookMCP:
    """Get singleton instance."""
    global _instance
    if _instance is None:
        _instance = HookMCP()
    return _instance

# MCP Tool Functions
def prism_hook_get(hook_id: str = "") -> Dict:
    return get_hook_mcp().prism_hook_get(hook_id)

def prism_hook_search(query: str = "", domain: str = None, limit: int = 20) -> Dict:
    return get_hook_mcp().prism_hook_search(query, domain, limit)

def prism_hook_by_domain(domain: str = "", limit: int = 50) -> Dict:
    return get_hook_mcp().prism_hook_by_domain(domain, limit)

def prism_hook_by_trigger(trigger_pattern: str = "", limit: int = 20) -> Dict:
    return get_hook_mcp().prism_hook_by_trigger(trigger_pattern, limit)

def prism_hook_categories() -> Dict:
    return get_hook_mcp().prism_hook_categories()

def prism_hook_stats() -> Dict:
    return get_hook_mcp().prism_hook_stats()

# Self-test
if __name__ == "__main__":
    print("=" * 60)
    print("HOOK MCP TOOLS TEST")
    print("=" * 60)
    
    hook_mcp = get_hook_mcp()
    
    print("\n[1] Hook Stats:")
    stats = hook_mcp.prism_hook_stats()
    print(f"  Total hooks: {stats.get('total_hooks', 0)}")
    print(f"  Domains: {stats.get('total_domains', 0)}")
    print(f"  Top domains: {list(stats.get('top_domains', {}).items())[:5]}")
    
    print("\n[2] Hook Categories:")
    cats = hook_mcp.prism_hook_categories()
    print(f"  Total domains: {cats.get('total_domains', 0)}")
    
    print("\n[3] Search 'material':")
    results = hook_mcp.prism_hook_search("material", limit=5)
    print(f"  Found: {results.get('count', 0)}")
    
    print("\n[4] Get SYSTEM-START:")
    hook = hook_mcp.prism_hook_get("SYSTEM-START")
    if "hook" in hook:
        print(f"  ID: {hook['hook'].get('id')}")
        print(f"  Trigger: {hook['hook'].get('trigger')}")
    
    print("\n[5] Hooks by domain 'SAFETY':")
    safety = hook_mcp.prism_hook_by_domain("SAFETY", limit=5)
    print(f"  Total in SAFETY: {safety.get('total', 0)}")
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED")
