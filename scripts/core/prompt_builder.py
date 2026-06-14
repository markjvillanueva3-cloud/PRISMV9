#!/usr/bin/env python3
"""
PRISM Prompt Builder v1.0
Session 1.5 Deliverable: Build optimized prompts from templates and context.

Builds prompts by:
- Combining templates with context
- Applying optimizations
- Managing token budgets
- Tracking effectiveness
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
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum

# Import template optimizer
try:
    from template_optimizer import TemplateOptimizer, Template, OptimizationLevel, BUILTIN_TEMPLATES
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from template_optimizer import TemplateOptimizer, Template, OptimizationLevel, BUILTIN_TEMPLATES

# Paths
PRISM_ROOT = Path("C:/PRISM")
PROMPT_LOG = PRISM_ROOT / "state" / "PROMPT_BUILD_LOG.jsonl"
PROMPT_STATS = PRISM_ROOT / "state" / "PROMPT_STATS.json"

class PromptSection(Enum):
    """Sections of a prompt."""
    SYSTEM = "system"
    CONTEXT = "context"
    TASK = "task"
    CONSTRAINTS = "constraints"
    EXAMPLES = "examples"
    OUTPUT = "output"
    CUSTOM = "custom"

@dataclass
class BuiltPrompt:
    """A built prompt ready for use."""
    prompt_id: str
    template_id: Optional[str]
    content: str
    
    # Metrics
    total_chars: int
    total_tokens: int
    
    # Sections included
    sections: List[str]
    variables_used: List[str]
    
    # Optimization
    optimization_applied: bool
    tokens_saved: int
    
    # Metadata
    built_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class PromptConfig:
    """Configuration for prompt building."""
    max_tokens: int = 4000
    optimization_level: OptimizationLevel = OptimizationLevel.MODERATE
    include_sections: List[PromptSection] = field(default_factory=lambda: [
        PromptSection.SYSTEM, PromptSection.CONTEXT, 
        PromptSection.TASK, PromptSection.CONSTRAINTS
    ])
    preserve_code_blocks: bool = True
    preserve_examples: bool = True
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['optimization_level'] = self.optimization_level.value
        d['include_sections'] = [s.value for s in self.include_sections]
        return d

class PromptBuilder:
    """Build optimized prompts from templates and context."""
    
    # Section headers for organization
    SECTION_HEADERS = {
        PromptSection.SYSTEM: "## System",
        PromptSection.CONTEXT: "## Context",
        PromptSection.TASK: "## Task",
        PromptSection.CONSTRAINTS: "## Constraints",
        PromptSection.EXAMPLES: "## Examples",
        PromptSection.OUTPUT: "## Output Format",
        PromptSection.CUSTOM: "## Additional",
    }
    
    # Default constraints for PRISM
    DEFAULT_CONSTRAINTS = """- Safety: S(x) ≥ 0.70 (HARD BLOCK)
- Quality: Ω(x) ≥ 0.65
- No placeholders or TODOs
- Evidence level ≥ L3 for claims
- Follow PRISM protocols"""
    
    def __init__(self, config: PromptConfig = None):
        self._ensure_paths()
        self.config = config or PromptConfig()
        self.optimizer = TemplateOptimizer()
        self.prompt_count = 0
        self._load_stats()
        self._init_builtin_templates()
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        PROMPT_LOG.parent.mkdir(parents=True, exist_ok=True)
    
    def _load_stats(self):
        """Load prompt statistics."""
        if PROMPT_STATS.exists():
            try:
                data = json.loads(PROMPT_STATS.read_text(encoding='utf-8'))
                self.prompt_count = data.get('total_prompts', 0)
            except:
                pass
    
    def _save_stats(self, tokens_saved: int):
        """Save prompt statistics."""
        stats = {"total_prompts": 0, "total_tokens_saved": 0}
        if PROMPT_STATS.exists():
            try:
                stats = json.loads(PROMPT_STATS.read_text(encoding='utf-8'))
            except:
                pass
        
        stats['total_prompts'] = stats.get('total_prompts', 0) + 1
        stats['total_tokens_saved'] = stats.get('total_tokens_saved', 0) + tokens_saved
        stats['last_updated'] = datetime.now().isoformat()
        
        PROMPT_STATS.write_text(
            json.dumps(stats, indent=2, sort_keys=True),
            encoding='utf-8'
        )
    
    def _init_builtin_templates(self):
        """Initialize built-in templates if not present."""
        if not self.optimizer.templates:
            for key, data in BUILTIN_TEMPLATES.items():
                self.optimizer.create_template(**data)
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count."""
        return len(text) // 4
    
    def _generate_prompt_id(self) -> str:
        """Generate unique prompt ID."""
        self.prompt_count += 1
        return f"PRM-{self.prompt_count:06d}"
    
    def build(self, task: str, context: str = None,
              template_id: str = None,
              variables: Dict[str, str] = None,
              constraints: str = None,
              examples: str = None,
              output_format: str = None,
              custom_sections: Dict[str, str] = None) -> BuiltPrompt:
        """
        Build an optimized prompt.
        
        Args:
            task: The task description
            context: Optional context information
            template_id: Optional template to use
            variables: Variables for template substitution
            constraints: Custom constraints (or use defaults)
            examples: Optional examples
            output_format: Optional output format specification
            custom_sections: Additional custom sections
            
        Returns:
            BuiltPrompt with optimized content
        """
        prompt_id = self._generate_prompt_id()
        sections_content = []
        sections_used = []
        variables_used = list(variables.keys()) if variables else []
        
        # Start with template if provided
        base_content = ""
        if template_id:
            template = self.optimizer.get_template(template_id)
            if template:
                base_content = self.optimizer.render(
                    template_id, 
                    variables or {},
                    use_optimized=True
                )
                variables_used.extend(template.variables)
        
        # Build sections based on config
        for section in self.config.include_sections:
            section_content = None
            
            if section == PromptSection.SYSTEM:
                section_content = self._build_system_section()
            
            elif section == PromptSection.CONTEXT and context:
                section_content = f"{self.SECTION_HEADERS[section]}\n{context}"
            
            elif section == PromptSection.TASK:
                section_content = f"{self.SECTION_HEADERS[section]}\n{task}"
            
            elif section == PromptSection.CONSTRAINTS:
                constraint_text = constraints or self.DEFAULT_CONSTRAINTS
                section_content = f"{self.SECTION_HEADERS[section]}\n{constraint_text}"
            
            elif section == PromptSection.EXAMPLES and examples:
                section_content = f"{self.SECTION_HEADERS[section]}\n{examples}"
            
            elif section == PromptSection.OUTPUT and output_format:
                section_content = f"{self.SECTION_HEADERS[section]}\n{output_format}"
            
            if section_content:
                sections_content.append(section_content)
                sections_used.append(section.value)
        
        # Add custom sections
        if custom_sections:
            for name, content in custom_sections.items():
                sections_content.append(f"## {name}\n{content}")
                sections_used.append(f"custom:{name}")
        
        # Combine all content
        if base_content:
            full_content = base_content + "\n\n" + "\n\n".join(sections_content)
        else:
            full_content = "\n\n".join(sections_content)
        
        # Optimize
        original_tokens = self._estimate_tokens(full_content)
        optimized_content, metrics = self.optimizer.optimize(
            full_content, 
            self.config.optimization_level
        )
        
        # Preserve code blocks if configured
        if self.config.preserve_code_blocks:
            optimized_content = self._restore_code_blocks(full_content, optimized_content)
        
        # Check token budget
        final_tokens = self._estimate_tokens(optimized_content)
        if final_tokens > self.config.max_tokens:
            optimized_content = self._truncate_to_budget(optimized_content, self.config.max_tokens)
            final_tokens = self._estimate_tokens(optimized_content)
        
        tokens_saved = original_tokens - final_tokens
        
        result = BuiltPrompt(
            prompt_id=prompt_id,
            template_id=template_id,
            content=optimized_content,
            total_chars=len(optimized_content),
            total_tokens=final_tokens,
            sections=sections_used,
            variables_used=list(set(variables_used)),
            optimization_applied=True,
            tokens_saved=tokens_saved
        )
        
        # Log and save stats
        self._log_prompt(result)
        self._save_stats(tokens_saved)
        
        return result
    
    def _build_system_section(self) -> str:
        """Build system section."""
        return """## System
PRISM Manufacturing Intelligence
- Safety-critical CNC control
- Mathematical certainty required
- Follow GSD_CORE protocols"""
    
    def _restore_code_blocks(self, original: str, optimized: str) -> str:
        """Restore code blocks from original to optimized."""
        # Extract code blocks from original
        code_blocks = re.findall(r'```[\s\S]*?```', original)
        
        if not code_blocks:
            return optimized
        
        # Find code block placeholders or restore
        for block in code_blocks:
            # If block was mangled, try to restore
            block_start = block[:50]
            if block_start not in optimized:
                # Find where to insert (after task or context)
                insert_pos = optimized.find("## Constraints")
                if insert_pos > 0:
                    optimized = optimized[:insert_pos] + block + "\n\n" + optimized[insert_pos:]
        
        return optimized
    
    def _truncate_to_budget(self, content: str, max_tokens: int) -> str:
        """Truncate content to fit token budget."""
        max_chars = max_tokens * 4
        
        if len(content) <= max_chars:
            return content
        
        # Truncate but preserve structure
        truncated = content[:max_chars]
        
        # Find last complete section
        last_section = truncated.rfind("\n## ")
        if last_section > max_chars * 0.5:
            truncated = truncated[:last_section]
        
        truncated += "\n\n[Truncated for token budget]"
        
        return truncated
    
    def build_from_template(self, template_name: str,
                           variables: Dict[str, str]) -> BuiltPrompt:
        """
        Build prompt from named template.
        
        Args:
            template_name: Name of template
            variables: Variables to substitute
            
        Returns:
            BuiltPrompt
        """
        template = self.optimizer.get_template_by_name(template_name)
        if not template:
            raise ValueError(f"Template not found: {template_name}")
        
        return self.build(
            task=variables.get('task', variables.get('task_name', 'Execute task')),
            context=variables.get('context'),
            template_id=template.id,
            variables=variables
        )
    
    def quick_prompt(self, task: str, context: str = None) -> str:
        """
        Quick prompt building - returns just the content.
        
        Args:
            task: Task description
            context: Optional context
            
        Returns:
            Optimized prompt content string
        """
        result = self.build(task=task, context=context)
        return result.content
    
    def _log_prompt(self, prompt: BuiltPrompt):
        """Log prompt build."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "prompt_id": prompt.prompt_id,
            "template_id": prompt.template_id,
            "tokens": prompt.total_tokens,
            "tokens_saved": prompt.tokens_saved,
            "sections": prompt.sections
        }
        with open(PROMPT_LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, sort_keys=True) + '\n')
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get prompt building statistics."""
        stats = {"prompts_built": 0, "total_tokens_saved": 0}
        
        if PROMPT_STATS.exists():
            try:
                stats = json.loads(PROMPT_STATS.read_text(encoding='utf-8'))
            except:
                pass
        
        # Add template stats
        stats['template_stats'] = self.optimizer.get_statistics()
        
        # Calculate average savings
        if stats.get('total_prompts', 0) > 0:
            stats['average_tokens_saved'] = round(
                stats.get('total_tokens_saved', 0) / stats['total_prompts'], 1
            )
        
        return stats


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Prompt Builder")
    parser.add_argument('--task', type=str, help='Task description')
    parser.add_argument('--context', type=str, help='Context (or file path)')
    parser.add_argument('--template', type=str, help='Template name')
    parser.add_argument('--max-tokens', type=int, default=4000, help='Max tokens')
    parser.add_argument('--stats', action='store_true', help='Show statistics')
    parser.add_argument('--quick', type=str, help='Quick prompt for task')
    
    args = parser.parse_args()
    
    config = PromptConfig(max_tokens=args.max_tokens)
    builder = PromptBuilder(config)
    
    if args.stats:
        stats = builder.get_statistics()
        print(json.dumps(stats, indent=2))
    
    elif args.quick:
        content = builder.quick_prompt(args.quick)
        print(content)
        print(f"\n[Tokens: ~{len(content)//4}]")
    
    elif args.task:
        context = None
        if args.context:
            if Path(args.context).exists():
                context = Path(args.context).read_text(encoding='utf-8')
            else:
                context = args.context
        
        if args.template:
            result = builder.build_from_template(args.template, {
                'task': args.task,
                'context': context or ''
            })
        else:
            result = builder.build(task=args.task, context=context)
        
        print(result.content)
        print(f"\n[Prompt ID: {result.prompt_id}]")
        print(f"[Tokens: {result.total_tokens}, Saved: {result.tokens_saved}]")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
