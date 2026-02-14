"""
PRISM MCP Server - Manus Integration v1.0
==========================================
Integrates Manus AI agent capabilities into PRISM MCP server.
Provides tools for autonomous task execution, web browsing, code sandbox.
"""

import os
import json
import asyncio
import httpx
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime

# ============================================================================
# MANUS CONFIGURATION
# ============================================================================

@dataclass
class ManusConfig:
    """Configuration for Manus MCP integration"""
    api_key: str
    base_url: str = "https://open.manus.ai"
    default_mode: str = "quality"  # quality | speed | balanced
    timeout_seconds: int = 300
    max_retries: int = 3

def get_manus_config() -> Optional[ManusConfig]:
    """Gets Manus configuration from environment"""
    api_key = os.environ.get("MANUS_MCP_API_KEY")
    if not api_key:
        return None
    return ManusConfig(api_key=api_key)

# ============================================================================
# MANUS CLIENT
# ============================================================================

class ManusClient:
    """Client for Manus AI API"""
    
    def __init__(self, config: ManusConfig):
        self.config = config
        self.client = httpx.AsyncClient(
            base_url=config.base_url,
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json"
            },
            timeout=config.timeout_seconds
        )
        
    async def create_task(
        self,
        prompt: str,
        mode: Optional[str] = None,
        attachments: Optional[List[Dict]] = None,
        connectors: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Creates a new task in Manus"""
        payload = {
            "prompt": prompt,
            "mode": mode or self.config.default_mode
        }
        if attachments:
            payload["attachments"] = attachments
        if connectors:
            payload["connectors"] = connectors
            
        response = await self.client.post("/api/v1/tasks", json=payload)
        response.raise_for_status()
        return response.json()
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Gets task status"""
        response = await self.client.get(f"/api/v1/tasks/{task_id}")
        response.raise_for_status()
        return response.json()
    
    async def get_task_result(self, task_id: str) -> Dict[str, Any]:
        """Gets task result"""
        response = await self.client.get(f"/api/v1/tasks/{task_id}/result")
        response.raise_for_status()
        return response.json()
    
    async def cancel_task(self, task_id: str) -> Dict[str, Any]:
        """Cancels a running task"""
        response = await self.client.post(f"/api/v1/tasks/{task_id}/cancel")
        response.raise_for_status()
        return response.json()
    
    async def list_tasks(self, limit: int = 10) -> Dict[str, Any]:
        """Lists recent tasks"""
        response = await self.client.get(f"/api/v1/tasks?limit={limit}")
        response.raise_for_status()
        return response.json()
    
    async def close(self):
        """Closes the client"""
        await self.client.aclose()

# ============================================================================
# MANUS MCP TOOLS
# ============================================================================

# Global client instance
_manus_client: Optional[ManusClient] = None

def get_manus_client() -> Optional[ManusClient]:
    """Gets or creates Manus client"""
    global _manus_client
    if _manus_client is None:
        config = get_manus_config()
        if config:
            _manus_client = ManusClient(config)
    return _manus_client

async def prism_manus_create_task(
    prompt: str,
    mode: str = "quality",
    attachments: Optional[List[Dict]] = None,
    connectors: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Creates a new autonomous task in Manus.
    
    Args:
        prompt: Task description/instructions for Manus
        mode: Execution mode - 'quality' (thorough), 'speed' (fast), 'balanced'
        attachments: Optional file attachments [{filename, url, mime_type, size_bytes}]
        connectors: Optional connectors to enable ['gmail', 'notion', 'slack', etc.]
    
    Returns:
        Task object with id, status, created_at
    """
    client = get_manus_client()
    if not client:
        return {"error": "Manus not configured. Set MANUS_MCP_API_KEY environment variable."}
    
    try:
        result = await client.create_task(prompt, mode, attachments, connectors)
        return {
            "success": True,
            "task_id": result.get("id"),
            "status": result.get("status"),
            "created_at": result.get("created_at"),
            "message": "Task created successfully. Use prism_manus_task_status to monitor progress."
        }
    except Exception as e:
        return {"error": str(e)}

async def prism_manus_task_status(task_id: str) -> Dict[str, Any]:
    """
    Gets status of a Manus task.
    
    Args:
        task_id: ID of the task to check
    
    Returns:
        Task status with progress information
    """
    client = get_manus_client()
    if not client:
        return {"error": "Manus not configured"}
    
    try:
        result = await client.get_task_status(task_id)
        return {
            "task_id": task_id,
            "status": result.get("status"),
            "progress": result.get("progress"),
            "updated_at": result.get("updated_at")
        }
    except Exception as e:
        return {"error": str(e)}

async def prism_manus_task_result(task_id: str) -> Dict[str, Any]:
    """
    Gets result of a completed Manus task.
    
    Args:
        task_id: ID of the completed task
    
    Returns:
        Task result with output, artifacts, logs
    """
    client = get_manus_client()
    if not client:
        return {"error": "Manus not configured"}
    
    try:
        result = await client.get_task_result(task_id)
        return {
            "task_id": task_id,
            "status": "completed",
            "output": result.get("output"),
            "artifacts": result.get("artifacts", []),
            "logs": result.get("logs", [])
        }
    except Exception as e:
        return {"error": str(e)}

async def prism_manus_cancel_task(task_id: str) -> Dict[str, Any]:
    """
    Cancels a running Manus task.
    
    Args:
        task_id: ID of the task to cancel
    
    Returns:
        Cancellation confirmation
    """
    client = get_manus_client()
    if not client:
        return {"error": "Manus not configured"}
    
    try:
        result = await client.cancel_task(task_id)
        return {
            "task_id": task_id,
            "status": "cancelled",
            "message": "Task cancelled successfully"
        }
    except Exception as e:
        return {"error": str(e)}

async def prism_manus_list_tasks(limit: int = 10) -> Dict[str, Any]:
    """
    Lists recent Manus tasks.
    
    Args:
        limit: Maximum number of tasks to return (default 10)
    
    Returns:
        List of recent tasks with status
    """
    client = get_manus_client()
    if not client:
        return {"error": "Manus not configured"}
    
    try:
        result = await client.list_tasks(limit)
        return {
            "tasks": result.get("tasks", []),
            "total": result.get("total", 0)
        }
    except Exception as e:
        return {"error": str(e)}

# ============================================================================
# MANUS WORKFLOW TOOLS
# ============================================================================

async def prism_manus_web_research(
    query: str,
    depth: str = "standard"
) -> Dict[str, Any]:
    """
    Delegates web research to Manus.
    
    Args:
        query: Research query/topic
        depth: Research depth - 'quick', 'standard', 'deep'
    
    Returns:
        Task ID for tracking research progress
    """
    prompt = f"""Conduct web research on the following topic:

Topic: {query}

Research depth: {depth}

Please:
1. Search for relevant information
2. Visit authoritative sources
3. Extract key findings
4. Synthesize into a comprehensive summary
5. Include citations/sources

Format the output as structured research findings."""

    return await prism_manus_create_task(prompt, mode="quality" if depth == "deep" else "balanced")

async def prism_manus_code_sandbox(
    code: str,
    language: str = "python",
    task_description: str = ""
) -> Dict[str, Any]:
    """
    Executes code in Manus sandbox environment.
    
    Args:
        code: Code to execute
        language: Programming language (python, javascript, bash, ruby, perl, r)
        task_description: Optional description of what the code should do
    
    Returns:
        Task ID for tracking execution
    """
    prompt = f"""Execute the following {language} code in a sandbox environment:

```{language}
{code}
```

{f'Task: {task_description}' if task_description else ''}

Please:
1. Execute the code safely
2. Capture all output
3. Report any errors
4. Provide execution summary"""

    return await prism_manus_create_task(prompt, mode="speed")

async def prism_manus_file_operation(
    operation: str,
    path: str,
    content: Optional[str] = None
) -> Dict[str, Any]:
    """
    Performs file operations via Manus.
    
    Args:
        operation: 'read', 'write', 'list', 'search'
        path: File or directory path
        content: Content to write (for write operation)
    
    Returns:
        Task ID for tracking operation
    """
    if operation == "read":
        prompt = f"Read the contents of file: {path}"
    elif operation == "write":
        prompt = f"Write to file {path}:\n\n{content}"
    elif operation == "list":
        prompt = f"List contents of directory: {path}"
    elif operation == "search":
        prompt = f"Search for files matching: {path}"
    else:
        return {"error": f"Unknown operation: {operation}"}
    
    return await prism_manus_create_task(prompt, mode="speed")

# ============================================================================
# DEVELOPMENT HOOKS INTEGRATION
# ============================================================================

async def prism_dev_hook_trigger(
    hook_id: str,
    params: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Triggers a development hook.
    
    Args:
        hook_id: ID of the hook to trigger
        params: Parameters to pass to the hook
    
    Returns:
        Hook execution result
    """
    # Load hook registry
    registry_path = r"C:\PRISM\data\DEVELOPMENT_HOOKS_REGISTRY.json"
    try:
        with open(registry_path, 'r', encoding='utf-8') as f:
            registry = json.load(f)
    except FileNotFoundError:
        return {"error": "Development hooks registry not found. Run development_hooks_generator.py first."}
    
    # Find hook
    hook = None
    for h in registry.get("hooks", []):
        if h["id"] == hook_id:
            hook = h
            break
    
    if not hook:
        return {"error": f"Hook not found: {hook_id}"}
    
    # Execute hook logic based on domain
    result = {
        "hook_id": hook_id,
        "domain": hook["domain"],
        "category": hook["category"],
        "trigger": hook["trigger"],
        "executed_at": datetime.now().isoformat(),
        "params": params or {},
        "status": "executed",
        "side_effects": hook.get("sideEffects", []),
        "next_hooks": hook.get("relatedHooks", [])
    }
    
    return result

async def prism_dev_hook_list(
    domain: Optional[str] = None,
    category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Lists available development hooks.
    
    Args:
        domain: Filter by domain (SKILL, AGENT, SWARM, etc.)
        category: Filter by category within domain
    
    Returns:
        List of matching hooks
    """
    registry_path = r"C:\PRISM\data\DEVELOPMENT_HOOKS_REGISTRY.json"
    try:
        with open(registry_path, 'r', encoding='utf-8') as f:
            registry = json.load(f)
    except FileNotFoundError:
        return {"error": "Development hooks registry not found"}
    
    hooks = registry.get("hooks", [])
    
    if domain:
        hooks = [h for h in hooks if h["domain"] == domain]
    if category:
        hooks = [h for h in hooks if h["category"] == category]
    
    return {
        "total": len(hooks),
        "hooks": [{"id": h["id"], "name": h["name"], "trigger": h["trigger"]} for h in hooks]
    }

async def prism_dev_hook_chain(
    start_hook_id: str,
    params: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes a chain of related hooks.
    
    Args:
        start_hook_id: ID of the first hook in the chain
        params: Initial parameters
    
    Returns:
        Chain execution results
    """
    registry_path = r"C:\PRISM\data\DEVELOPMENT_HOOKS_REGISTRY.json"
    try:
        with open(registry_path, 'r', encoding='utf-8') as f:
            registry = json.load(f)
    except FileNotFoundError:
        return {"error": "Development hooks registry not found"}
    
    hooks_map = {h["id"]: h for h in registry.get("hooks", [])}
    
    if start_hook_id not in hooks_map:
        return {"error": f"Hook not found: {start_hook_id}"}
    
    chain_results = []
    current_hook_id = start_hook_id
    visited = set()
    
    while current_hook_id and current_hook_id not in visited:
        visited.add(current_hook_id)
        hook = hooks_map.get(current_hook_id)
        if not hook:
            break
            
        result = await prism_dev_hook_trigger(current_hook_id, params)
        chain_results.append(result)
        
        # Get next hook in chain
        related = hook.get("relatedHooks", [])
        current_hook_id = related[0] if related else None
    
    return {
        "chain_length": len(chain_results),
        "hooks_executed": [r["hook_id"] for r in chain_results],
        "results": chain_results
    }

# ============================================================================
# MCP TOOL DEFINITIONS FOR SERVER
# ============================================================================

MANUS_MCP_TOOLS = [
    {
        "name": "prism_manus_create_task",
        "description": "Creates a new autonomous task in Manus AI agent",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "description": "Task description/instructions"},
                "mode": {"type": "string", "enum": ["quality", "speed", "balanced"], "default": "quality"},
                "attachments": {"type": "array", "description": "Optional file attachments"},
                "connectors": {"type": "array", "description": "Optional connectors to enable"}
            },
            "required": ["prompt"]
        }
    },
    {
        "name": "prism_manus_task_status",
        "description": "Gets status of a Manus task",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "Task ID to check"}
            },
            "required": ["task_id"]
        }
    },
    {
        "name": "prism_manus_task_result",
        "description": "Gets result of a completed Manus task",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "Task ID to get result for"}
            },
            "required": ["task_id"]
        }
    },
    {
        "name": "prism_manus_cancel_task",
        "description": "Cancels a running Manus task",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "Task ID to cancel"}
            },
            "required": ["task_id"]
        }
    },
    {
        "name": "prism_manus_list_tasks",
        "description": "Lists recent Manus tasks",
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 10, "description": "Max tasks to return"}
            }
        }
    },
    {
        "name": "prism_manus_web_research",
        "description": "Delegates web research to Manus agent",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Research query/topic"},
                "depth": {"type": "string", "enum": ["quick", "standard", "deep"], "default": "standard"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "prism_manus_code_sandbox",
        "description": "Executes code in Manus sandbox environment",
        "inputSchema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Code to execute"},
                "language": {"type": "string", "enum": ["python", "javascript", "bash", "ruby", "perl", "r"], "default": "python"},
                "task_description": {"type": "string", "description": "Optional task description"}
            },
            "required": ["code"]
        }
    },
    {
        "name": "prism_manus_file_operation",
        "description": "Performs file operations via Manus",
        "inputSchema": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["read", "write", "list", "search"]},
                "path": {"type": "string", "description": "File or directory path"},
                "content": {"type": "string", "description": "Content for write operation"}
            },
            "required": ["operation", "path"]
        }
    },
    {
        "name": "prism_dev_hook_trigger",
        "description": "Triggers a development hook",
        "inputSchema": {
            "type": "object",
            "properties": {
                "hook_id": {"type": "string", "description": "Hook ID to trigger"},
                "params": {"type": "object", "description": "Parameters for the hook"}
            },
            "required": ["hook_id"]
        }
    },
    {
        "name": "prism_dev_hook_list",
        "description": "Lists available development hooks",
        "inputSchema": {
            "type": "object",
            "properties": {
                "domain": {"type": "string", "description": "Filter by domain"},
                "category": {"type": "string", "description": "Filter by category"}
            }
        }
    },
    {
        "name": "prism_dev_hook_chain",
        "description": "Executes a chain of related development hooks",
        "inputSchema": {
            "type": "object",
            "properties": {
                "start_hook_id": {"type": "string", "description": "Starting hook ID"},
                "params": {"type": "object", "description": "Initial parameters"}
            },
            "required": ["start_hook_id"]
        }
    }
]

def get_manus_tools() -> List[Dict]:
    """Returns all Manus MCP tool definitions"""
    return MANUS_MCP_TOOLS

# ============================================================================
# EXPORT
# ============================================================================

__all__ = [
    'ManusConfig',
    'ManusClient',
    'get_manus_config',
    'get_manus_client',
    'prism_manus_create_task',
    'prism_manus_task_status',
    'prism_manus_task_result',
    'prism_manus_cancel_task',
    'prism_manus_list_tasks',
    'prism_manus_web_research',
    'prism_manus_code_sandbox',
    'prism_manus_file_operation',
    'prism_dev_hook_trigger',
    'prism_dev_hook_list',
    'prism_dev_hook_chain',
    'get_manus_tools',
    'MANUS_MCP_TOOLS'
]
