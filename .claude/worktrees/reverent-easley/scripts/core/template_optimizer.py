#!/usr/bin/env python3
"""
PRISM Template Optimizer v1.0
Session 1.5 Deliverable: Optimize prompt templates for token efficiency.

Optimizes templates by:
- Removing redundant whitespace and formatting
- Compressing repeated patterns
- Caching common sections
- Measuring and tracking token savings
"""
import sys
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import re
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
TEMPLATE_DIR = PRISM_ROOT / "templates"
TEMPLATE_CACHE = PRISM_ROOT / "state" / "TEMPLATE_CACHE.json"
OPTIMIZATION_LOG = PRISM_ROOT / "state" / "TEMPLATE_OPTIMIZATION.jsonl"

class OptimizationLevel(Enum):
    """Levels of template optimization."""
    NONE = "none"            # No optimization
    LIGHT = "light"          # Whitespace only
    MODERATE = "moderate"    # + Remove comments, compress
    AGGRESSIVE = "aggressive" # + Abbreviate, restructure
    MAXIMUM = "maximum"      # Maximum compression

@dataclass
class TemplateMetrics:
    """Metrics for a template."""
    original_chars: int
    optimized_chars: int
    original_tokens: int
    optimized_tokens: int
    reduction_chars: int
    reduction_tokens: int
    reduction_percent: float
    optimization_level: OptimizationLevel
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['optimization_level'] = self.optimization_level.value
        return d

@dataclass
class Template:
    """A prompt template with optimization support."""
    id: str
    name: str
    content: str
    variables: List[str]
    category: str = "general"
    description: str = ""
    optimized_content: str = ""
    metrics: Optional[TemplateMetrics] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        if self.metrics:
            d['metrics'] = self.metrics.to_dict()
        return d
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Template':
        metrics = None
        if data.get('metrics'):
            m = data['metrics']
            metrics = TemplateMetrics(
                original_chars=m['original_chars'],
                optimized_chars=m['optimized_chars'],
                original_tokens=m['original_tokens'],
                optimized_tokens=m['optimized_tokens'],
                reduction_chars=m['reduction_chars'],
                reduction_tokens=m['reduction_tokens'],
                reduction_percent=m['reduction_percent'],
                optimization_level=OptimizationLevel(m['optimization_level'])
            )
        return cls(
            id=data['id'],
            name=data['name'],
            content=data['content'],
            variables=data.get('variables', []),
            category=data.get('category', 'general'),
            description=data.get('description', ''),
            optimized_content=data.get('optimized_content', ''),
            metrics=metrics,
            created_at=data.get('created_at', datetime.now().isoformat()),
            updated_at=data.get('updated_at', datetime.now().isoformat())
        )

class TemplateOptimizer:
    """Optimize prompt templates for token efficiency."""
    
    # Optimization patterns
    WHITESPACE_PATTERNS = [
        (r'\n\s*\n\s*\n', '\n\n'),           # Multiple blank lines
        (r'[ \t]+', ' '),                     # Multiple spaces/tabs
        (r'\n[ \t]+', '\n'),                  # Leading whitespace
        (r'[ \t]+\n', '\n'),                  # Trailing whitespace
    ]
    
    COMMENT_PATTERNS = [
        (r'<!--.*?-->', ''),                  # HTML comments
        (r'#.*$', '', re.MULTILINE),          # Python comments
        (r'//.*$', '', re.MULTILINE),         # JS comments
        (r'/\*.*?\*/', '', re.DOTALL),        # Block comments
    ]
    
    # Common abbreviations for aggressive mode
    ABBREVIATIONS = {
        'temperature': 'temp',
        'configuration': 'config',
        'information': 'info',
        'documentation': 'docs',
        'parameters': 'params',
        'reference': 'ref',
        'description': 'desc',
        'implementation': 'impl',
        'specification': 'spec',
        'application': 'app',
    }
    
    # Verbose phrases to compress
    VERBOSE_PHRASES = {
        'in order to': 'to',
        'for the purpose of': 'for',
        'in the event that': 'if',
        'at this point in time': 'now',
        'due to the fact that': 'because',
        'with regard to': 'about',
        'in accordance with': 'per',
        'prior to': 'before',
        'subsequent to': 'after',
        'in addition to': 'also',
        'as a result of': 'from',
        'for example': 'e.g.',
        'that is to say': 'i.e.',
        'and so on': 'etc.',
    }
    
    def __init__(self):
        self._ensure_paths()
        self.templates: Dict[str, Template] = {}
        self.cache: Dict[str, str] = {}
        self._load_cache()
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
        TEMPLATE_CACHE.parent.mkdir(parents=True, exist_ok=True)
    
    def _load_cache(self):
        """Load template cache."""
        if TEMPLATE_CACHE.exists():
            try:
                data = json.loads(TEMPLATE_CACHE.read_text(encoding='utf-8'))
                self.cache = data.get('cache', {})
                for t in data.get('templates', []):
                    template = Template.from_dict(t)
                    self.templates[template.id] = template
            except:
                pass
    
    def _save_cache(self):
        """Save template cache."""
        data = {
            "version": "1.0",
            "updated": datetime.now().isoformat(),
            "cache": self.cache,
            "templates": [t.to_dict() for t in self.templates.values()]
        }
        TEMPLATE_CACHE.write_text(
            json.dumps(data, indent=2, sort_keys=True),
            encoding='utf-8'
        )
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count (approx 4 chars per token)."""
        return len(text) // 4
    
    def _generate_id(self, name: str) -> str:
        """Generate template ID."""
        hash_part = hashlib.md5(name.encode()).hexdigest()[:8]
        return f"TPL-{hash_part}"
    
    def optimize(self, content: str, 
                 level: OptimizationLevel = OptimizationLevel.MODERATE) -> Tuple[str, TemplateMetrics]:
        """
        Optimize template content.
        
        Args:
            content: Template content to optimize
            level: Optimization level
            
        Returns:
            Tuple of (optimized_content, metrics)
        """
        original_chars = len(content)
        original_tokens = self._estimate_tokens(content)
        
        optimized = content
        
        if level == OptimizationLevel.NONE:
            pass
        
        elif level in (OptimizationLevel.LIGHT, OptimizationLevel.MODERATE, 
                       OptimizationLevel.AGGRESSIVE, OptimizationLevel.MAXIMUM):
            # Light: Whitespace optimization
            for pattern, replacement in self.WHITESPACE_PATTERNS:
                if isinstance(replacement, str):
                    optimized = re.sub(pattern, replacement, optimized)
            
            # Strip leading/trailing
            optimized = optimized.strip()
        
        if level in (OptimizationLevel.MODERATE, OptimizationLevel.AGGRESSIVE, 
                     OptimizationLevel.MAXIMUM):
            # Moderate: Remove comments
            for pattern_data in self.COMMENT_PATTERNS:
                if len(pattern_data) == 2:
                    pattern, replacement = pattern_data
                    optimized = re.sub(pattern, replacement, optimized)
                else:
                    pattern, replacement, flags = pattern_data
                    optimized = re.sub(pattern, replacement, optimized, flags=flags)
            
            # Compress verbose phrases
            for verbose, compressed in self.VERBOSE_PHRASES.items():
                optimized = re.sub(
                    r'\b' + re.escape(verbose) + r'\b',
                    compressed,
                    optimized,
                    flags=re.IGNORECASE
                )
        
        if level in (OptimizationLevel.AGGRESSIVE, OptimizationLevel.MAXIMUM):
            # Aggressive: Apply abbreviations
            for full, abbrev in self.ABBREVIATIONS.items():
                optimized = re.sub(
                    r'\b' + re.escape(full) + r'\b',
                    abbrev,
                    optimized,
                    flags=re.IGNORECASE
                )
            
            # Remove redundant articles in lists
            optimized = re.sub(r'\b(the|a|an)\s+(?=\w+[,\n])', '', optimized, flags=re.IGNORECASE)
        
        if level == OptimizationLevel.MAXIMUM:
            # Maximum: Aggressive compression
            # Remove all non-essential punctuation
            optimized = re.sub(r'\.(?=\s*[A-Z])', '', optimized)  # Periods before caps
            
            # Compress numbered lists
            optimized = re.sub(r'^\d+\.\s+', '• ', optimized, flags=re.MULTILINE)
            
            # Remove filler words
            filler_words = ['actually', 'basically', 'certainly', 'definitely', 
                           'essentially', 'generally', 'literally', 'obviously',
                           'particularly', 'really', 'simply', 'specifically']
            for word in filler_words:
                optimized = re.sub(r'\b' + word + r'\b\s*', '', optimized, flags=re.IGNORECASE)
        
        # Final cleanup
        optimized = re.sub(r'\n\s*\n\s*\n', '\n\n', optimized)
        optimized = optimized.strip()
        
        optimized_chars = len(optimized)
        optimized_tokens = self._estimate_tokens(optimized)
        
        reduction_chars = original_chars - optimized_chars
        reduction_tokens = original_tokens - optimized_tokens
        reduction_percent = (reduction_chars / max(original_chars, 1)) * 100
        
        metrics = TemplateMetrics(
            original_chars=original_chars,
            optimized_chars=optimized_chars,
            original_tokens=original_tokens,
            optimized_tokens=optimized_tokens,
            reduction_chars=reduction_chars,
            reduction_tokens=reduction_tokens,
            reduction_percent=round(reduction_percent, 1),
            optimization_level=level
        )
        
        return optimized, metrics
    
    def create_template(self, name: str, content: str, 
                        category: str = "general",
                        description: str = "",
                        optimize_level: OptimizationLevel = OptimizationLevel.MODERATE) -> Template:
        """
        Create and register a new template.
        
        Args:
            name: Template name
            content: Template content with {variable} placeholders
            category: Category for organization
            description: Template description
            optimize_level: Optimization level to apply
            
        Returns:
            Created Template
        """
        template_id = self._generate_id(name)
        
        # Extract variables
        variables = re.findall(r'\{(\w+)\}', content)
        variables = list(set(variables))
        
        # Optimize
        optimized_content, metrics = self.optimize(content, optimize_level)
        
        template = Template(
            id=template_id,
            name=name,
            content=content,
            variables=variables,
            category=category,
            description=description,
            optimized_content=optimized_content,
            metrics=metrics
        )
        
        self.templates[template_id] = template
        self._save_cache()
        self._log_optimization(template)
        
        return template
    
    def get_template(self, template_id: str) -> Optional[Template]:
        """Get template by ID."""
        return self.templates.get(template_id)
    
    def get_template_by_name(self, name: str) -> Optional[Template]:
        """Get template by name."""
        for t in self.templates.values():
            if t.name.lower() == name.lower():
                return t
        return None
    
    def list_templates(self, category: str = None) -> List[Template]:
        """List all templates, optionally filtered by category."""
        templates = list(self.templates.values())
        if category:
            templates = [t for t in templates if t.category == category]
        return templates
    
    def render(self, template_id: str, variables: Dict[str, str],
               use_optimized: bool = True) -> str:
        """
        Render template with variables.
        
        Args:
            template_id: Template ID
            variables: Variable values to substitute
            use_optimized: Use optimized version if available
            
        Returns:
            Rendered template content
        """
        template = self.templates.get(template_id)
        if not template:
            raise ValueError(f"Template not found: {template_id}")
        
        content = template.optimized_content if use_optimized and template.optimized_content else template.content
        
        # Substitute variables
        for var_name, var_value in variables.items():
            content = content.replace(f'{{{var_name}}}', str(var_value))
        
        return content
    
    def _log_optimization(self, template: Template):
        """Log optimization result."""
        if not template.metrics:
            return
        
        entry = {
            "timestamp": datetime.now().isoformat(),
            "template_id": template.id,
            "template_name": template.name,
            "reduction_percent": template.metrics.reduction_percent,
            "tokens_saved": template.metrics.reduction_tokens
        }
        with open(OPTIMIZATION_LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, sort_keys=True) + '\n')
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get optimization statistics."""
        if not self.templates:
            return {"templates": 0}
        
        total_original = sum(t.metrics.original_tokens for t in self.templates.values() if t.metrics)
        total_optimized = sum(t.metrics.optimized_tokens for t in self.templates.values() if t.metrics)
        total_saved = total_original - total_optimized
        
        by_category = {}
        for t in self.templates.values():
            by_category[t.category] = by_category.get(t.category, 0) + 1
        
        return {
            "templates": len(self.templates),
            "by_category": by_category,
            "total_original_tokens": total_original,
            "total_optimized_tokens": total_optimized,
            "total_tokens_saved": total_saved,
            "average_reduction_percent": round(
                sum(t.metrics.reduction_percent for t in self.templates.values() if t.metrics) / 
                max(len([t for t in self.templates.values() if t.metrics]), 1), 1
            )
        }


# Built-in templates
BUILTIN_TEMPLATES = {
    "task_execution": {
        "name": "Task Execution",
        "content": """## Task: {task_name}

### Context
{context}

### Requirements
{requirements}

### Constraints
- Safety: S(x) ≥ 0.70
- Quality: Ω(x) ≥ 0.65
- No placeholders

### Output Format
{output_format}

Execute the task following PRISM protocols.""",
        "category": "execution",
        "description": "Standard task execution template"
    },
    "material_query": {
        "name": "Material Query",
        "content": """Query material database for: {material_name}

Required parameters:
{parameters}

Use prism_material_get or prism_material_search.
Apply Kienzle/Taylor/Johnson-Cook formulas as needed.""",
        "category": "query",
        "description": "Material database query template"
    },
    "error_report": {
        "name": "Error Report",
        "content": """## Error Report

Type: {error_type}
Severity: {severity}
Context: {context}

Message: {message}

### Resolution
{resolution}

Log with prism_error_log for learning.""",
        "category": "error",
        "description": "Error reporting template"
    },
    "session_handoff": {
        "name": "Session Handoff",
        "content": """## Session Handoff

### Completed
{completed_items}

### In Progress
{in_progress}

### Next Actions
{next_actions}

### State Files Updated
- ROADMAP_TRACKER.json
- CURRENT_STATE.json""",
        "category": "session",
        "description": "Session handoff template"
    }
}


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Template Optimizer")
    parser.add_argument('--optimize', type=str, help='File to optimize')
    parser.add_argument('--level', type=str, default='moderate',
                       choices=['none', 'light', 'moderate', 'aggressive', 'maximum'])
    parser.add_argument('--create', type=str, help='Create template with name')
    parser.add_argument('--list', action='store_true', help='List templates')
    parser.add_argument('--stats', action='store_true', help='Show statistics')
    parser.add_argument('--init-builtins', action='store_true', help='Initialize built-in templates')
    
    args = parser.parse_args()
    optimizer = TemplateOptimizer()
    
    if args.init_builtins:
        for key, data in BUILTIN_TEMPLATES.items():
            t = optimizer.create_template(**data)
            print(f"Created: {t.name} ({t.id}) - {t.metrics.reduction_percent}% reduction")
        print(f"\nInitialized {len(BUILTIN_TEMPLATES)} built-in templates")
    
    elif args.optimize:
        content = Path(args.optimize).read_text(encoding='utf-8')
        level = OptimizationLevel(args.level)
        optimized, metrics = optimizer.optimize(content, level)
        
        print(f"Optimization Results ({level.value}):")
        print(f"  Original: {metrics.original_chars} chars, ~{metrics.original_tokens} tokens")
        print(f"  Optimized: {metrics.optimized_chars} chars, ~{metrics.optimized_tokens} tokens")
        print(f"  Reduction: {metrics.reduction_percent}%")
    
    elif args.list:
        templates = optimizer.list_templates()
        print(f"Templates ({len(templates)}):")
        for t in templates:
            reduction = t.metrics.reduction_percent if t.metrics else 0
            print(f"  {t.id}: {t.name} [{t.category}] -{reduction}%")
    
    elif args.stats:
        stats = optimizer.get_statistics()
        print(json.dumps(stats, indent=2))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
