"""
PRISM Agents Module
===================
Comprehensive agent definitions with full system prompts.
"""

from .agent_definitions import (
    PRISM_CORE_CONTEXT,
    ALARM_DATABASE_CONTEXT,
    MATERIAL_DATABASE_CONTEXT,
    AGENT_SYSTEM_PROMPTS,
    get_agent_system_prompt,
    get_agent_definition,
    list_agents_with_prompts,
)

__all__ = [
    'PRISM_CORE_CONTEXT',
    'ALARM_DATABASE_CONTEXT',
    'MATERIAL_DATABASE_CONTEXT',
    'AGENT_SYSTEM_PROMPTS',
    'get_agent_system_prompt',
    'get_agent_definition',
    'list_agents_with_prompts',
]
