#!/usr/bin/env python3
"""
PRISM Prompt MCP Tools v1.0
Session 1.5 Deliverables: prism_prompt_build, prism_template_get

MCP tools for prompt template optimization.
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

# Import components
try:
    from template_optimizer import TemplateOptimizer, OptimizationLevel, BUILTIN_TEMPLATES
    from prompt_builder import PromptBuilder, PromptConfig, PromptSection
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from template_optimizer import TemplateOptimizer, OptimizationLevel, BUILTIN_TEMPLATES
    from prompt_builder import PromptBuilder, PromptConfig, PromptSection


class PromptMCP:
    """MCP tools for prompt template optimization."""
    
    def __init__(self, max_tokens: int = 4000):
        self.optimizer = TemplateOptimizer()
        self.config = PromptConfig(max_tokens=max_tokens)
        self.builder = PromptBuilder(self.config)
        self._init_templates()
    
    def _init_templates(self):
        """Initialize built-in templates."""
        if not self.optimizer.templates:
            for key, data in BUILTIN_TEMPLATES.items():
                self.optimizer.create_template(**data)
    
    def prism_prompt_build(self, task: str, context: str = None,
                           template: str = None,
                           variables: Dict[str, str] = None,
                           constraints: str = None,
                           max_tokens: int = 4000,
                           optimization: str = "moderate") -> Dict[str, Any]:
        """
        Build an optimized prompt for a task.
        
        Args:
            task: Description of the task to perform
            context: Optional context information
            template: Optional template name or ID to use
            variables: Variables for template substitution
            constraints: Custom constraints (defaults to PRISM safety constraints)
            max_tokens: Maximum tokens for prompt (default 4000)
            optimization: Optimization level (none, light, moderate, aggressive, maximum)
            
        Returns:
            Dict with:
            - prompt_id: Unique identifier
            - content: The optimized prompt content
            - tokens: Estimated token count
            - tokens_saved: Tokens saved through optimization
            - sections: Sections included
            - template_used: Template ID if used
            - optimization_level: Level applied
        """
        # Update config
        try:
            opt_level = OptimizationLevel(optimization.lower())
        except ValueError:
            opt_level = OptimizationLevel.MODERATE
        
        self.config.max_tokens = max_tokens
        self.config.optimization_level = opt_level
        self.builder = PromptBuilder(self.config)
        
        # Find template if specified
        template_id = None
        if template:
            # Try as ID first
            t = self.optimizer.get_template(template)
            if not t:
                # Try as name
                t = self.optimizer.get_template_by_name(template)
            if t:
                template_id = t.id
        
        # Build prompt
        result = self.builder.build(
            task=task,
            context=context,
            template_id=template_id,
            variables=variables or {},
            constraints=constraints
        )
        
        return {
            "prompt_id": result.prompt_id,
            "content": result.content,
            "tokens": result.total_tokens,
            "tokens_saved": result.tokens_saved,
            "chars": result.total_chars,
            "sections": result.sections,
            "variables_used": result.variables_used,
            "template_used": result.template_id,
            "optimization_level": opt_level.value,
            "optimization_applied": result.optimization_applied,
            "built_at": result.built_at
        }
    
    def prism_template_get(self, template: str = None,
                           category: str = None,
                           list_all: bool = False,
                           create: bool = False,
                           name: str = None,
                           content: str = None,
                           description: str = None) -> Dict[str, Any]:
        """
        Get, list, or create prompt templates.
        
        Args:
            template: Template name or ID to retrieve
            category: Filter by category when listing
            list_all: List all available templates
            create: Create a new template
            name: Name for new template (required if create=True)
            content: Content for new template (required if create=True)
            description: Description for new template
            
        Returns:
            Dict with template(s) information:
            - If getting single: template details with content
            - If listing: list of template summaries
            - If creating: created template details
        """
        # List all templates
        if list_all:
            templates = self.optimizer.list_templates(category)
            return {
                "templates": [
                    {
                        "id": t.id,
                        "name": t.name,
                        "category": t.category,
                        "description": t.description,
                        "variables": t.variables,
                        "reduction_percent": t.metrics.reduction_percent if t.metrics else 0
                    }
                    for t in templates
                ],
                "count": len(templates),
                "categories": list(set(t.category for t in templates))
            }
        
        # Create new template
        if create:
            if not name or not content:
                return {
                    "error": "name and content required for template creation",
                    "required": ["name", "content"]
                }
            
            t = self.optimizer.create_template(
                name=name,
                content=content,
                category=category or "custom",
                description=description or ""
            )
            
            return {
                "created": True,
                "template": {
                    "id": t.id,
                    "name": t.name,
                    "category": t.category,
                    "description": t.description,
                    "variables": t.variables,
                    "original_chars": t.metrics.original_chars if t.metrics else len(content),
                    "optimized_chars": t.metrics.optimized_chars if t.metrics else len(content),
                    "reduction_percent": t.metrics.reduction_percent if t.metrics else 0
                }
            }
        
        # Get single template
        if template:
            # Try as ID first
            t = self.optimizer.get_template(template)
            if not t:
                # Try as name
                t = self.optimizer.get_template_by_name(template)
            
            if not t:
                return {
                    "error": f"Template not found: {template}",
                    "available": [tpl.name for tpl in self.optimizer.list_templates()][:10]
                }
            
            return {
                "template": {
                    "id": t.id,
                    "name": t.name,
                    "category": t.category,
                    "description": t.description,
                    "variables": t.variables,
                    "content": t.content,
                    "optimized_content": t.optimized_content,
                    "metrics": t.metrics.to_dict() if t.metrics else None,
                    "created_at": t.created_at,
                    "updated_at": t.updated_at
                }
            }
        
        # Default: show stats and available templates
        stats = self.optimizer.get_statistics()
        templates = self.optimizer.list_templates()
        
        return {
            "statistics": stats,
            "templates": [
                {"id": t.id, "name": t.name, "category": t.category}
                for t in templates[:20]
            ],
            "hint": "Use template='name' to get details, list_all=True for full list, create=True to create"
        }
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Generic call interface for MCP integration."""
        params = params or {}
        
        if tool_name == "prism_prompt_build":
            return self.prism_prompt_build(**params)
        elif tool_name == "prism_template_get":
            return self.prism_template_get(**params)
        else:
            return {"error": f"Unknown tool: {tool_name}"}


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Prompt MCP Tools")
    parser.add_argument('--build', type=str, help='Build prompt for task')
    parser.add_argument('--context', type=str, help='Context for prompt')
    parser.add_argument('--template', type=str, help='Template to use/get')
    parser.add_argument('--list', action='store_true', help='List templates')
    parser.add_argument('--create', type=str, help='Create template with name')
    parser.add_argument('--content', type=str, help='Content for new template')
    
    args = parser.parse_args()
    mcp = PromptMCP()
    
    if args.build:
        result = mcp.prism_prompt_build(
            task=args.build,
            context=args.context,
            template=args.template
        )
        print(f"Prompt ID: {result['prompt_id']}")
        print(f"Tokens: {result['tokens']} (saved {result['tokens_saved']})")
        print(f"\n{result['content']}")
    
    elif args.list:
        result = mcp.prism_template_get(list_all=True)
        print(f"Templates ({result['count']}):")
        for t in result['templates']:
            print(f"  {t['id']}: {t['name']} [{t['category']}] -{t['reduction_percent']}%")
    
    elif args.template:
        result = mcp.prism_template_get(template=args.template)
        print(json.dumps(result, indent=2))
    
    elif args.create and args.content:
        result = mcp.prism_template_get(
            create=True,
            name=args.create,
            content=args.content
        )
        print(json.dumps(result, indent=2))
    
    else:
        # Show default stats
        result = mcp.prism_template_get()
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
