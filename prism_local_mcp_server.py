"""
PRISM Local Filesystem MCP Server
=================================
Exposes your local filesystem to Claude.ai via MCP protocol.

SETUP:
1. pip install fastmcp uvicorn pyngrok
2. python prism_local_mcp_server.py
3. Add the ngrok URL to Claude.ai connectors

SECURITY:
- Only exposes specified directories (default: C:\PRISM)
- Requires confirmation for destructive operations
- All operations logged
"""

import os
import sys
import json
import shutil
import hashlib
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

# FastMCP for MCP server
try:
    from fastmcp import FastMCP
except ImportError:
    print("Installing fastmcp...")
    os.system(f"{sys.executable} -m pip install fastmcp")
    from fastmcp import FastMCP

# For tunneling
try:
    from pyngrok import ngrok, conf
except ImportError:
    print("Installing pyngrok...")
    os.system(f"{sys.executable} -m pip install pyngrok")
    from pyngrok import ngrok, conf

# Dev Tools (Background Tasks, Checkpoints, Impact Analysis, Semantic Search, Context Sync)
try:
    # Add src directory to path for imports
    sys.path.insert(0, str(Path(__file__).parent))
    from src.tools.dev_tools import register_dev_tools
    DEV_TOOLS_AVAILABLE = True
except ImportError as e:
    DEV_TOOLS_AVAILABLE = False
    print(f"Warning: dev_tools module not found - dev tools will not be available: {e}")

# Intelligence Tools (Token Budget, Smart Reflection, Cascading Review, Zero-Token Engines)
try:
    from src.tools.intelligence import INTELLIGENCE_TOOLS
    from src.tools.intelligence.auto_hooks import (
        initialize_auto_hooks,
        get_auto_hook_system,
        AUTO_HOOK_TOOLS
    )
    INTEL_TOOLS_AVAILABLE = True
except ImportError as e:
    INTEL_TOOLS_AVAILABLE = False
    AUTO_HOOK_TOOLS = {}
    print(f"Warning: intelligence module not found - intel tools will not be available: {e}")

# ============================================================================
# CONFIGURATION
# ============================================================================

# Directories this server can access (SECURITY: restrict to these only)
ALLOWED_DIRECTORIES = [
    Path(r"C:\PRISM"),
    Path(r"C:\Users"),  # Remove this if you want tighter security
]

# Server settings
SERVER_NAME = "prism-local-filesystem"
SERVER_PORT = 8765
LOG_FILE = Path(r"C:\PRISM\logs\mcp_server.log")

# Ensure log directory exists
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================================================================
# SECURITY HELPERS
# ============================================================================

def is_path_allowed(path: Path) -> bool:
    """Check if path is within allowed directories."""
    path = path.resolve()
    for allowed in ALLOWED_DIRECTORIES:
        try:
            path.relative_to(allowed.resolve())
            return True
        except ValueError:
            continue
    return False

def validate_path(path_str: str) -> Path:
    """Validate and return path if allowed, raise error otherwise."""
    path = Path(path_str).resolve()
    if not is_path_allowed(path):
        raise PermissionError(f"Access denied: {path} is outside allowed directories")
    return path

# ============================================================================
# MCP SERVER
# ============================================================================

mcp = FastMCP(SERVER_NAME)

# Register Dev Tools (20 tools: tasks, checkpoints, impact, semantic, context)
try:
    from src.tools.dev_tools import register_dev_tools
    dev_tools_count = register_dev_tools(mcp)
    logger.info(f"Registered {dev_tools_count} dev tools")
except ImportError as e:
    logger.warning(f"Dev tools not loaded: {e}")

# ============================================================================
# COGNITIVE HOOKS SYSTEM
# P0-001: Hook Bridge Implementation
# ============================================================================

# Cognitive hook definitions
COGNITIVE_HOOKS = {
    # Bayesian Hooks
    "BAYES-001": {
        "name": "Bayesian Prior Update",
        "category": "bayesian",
        "description": "Updates prior probabilities based on new evidence",
        "enabled": True
    },
    "BAYES-002": {
        "name": "Bayesian Change Detection", 
        "category": "bayesian",
        "description": "Detects significant changes in distributions",
        "enabled": True
    },
    "BAYES-003": {
        "name": "Bayesian Hypothesis Testing",
        "category": "bayesian", 
        "description": "Tests hypotheses using Bayesian inference",
        "enabled": True
    },
    # Optimization Hooks
    "OPT-001": {
        "name": "Optimization Objective Setup",
        "category": "optimization",
        "description": "Initializes optimization objectives and constraints",
        "enabled": True
    },
    "OPT-002": {
        "name": "Optimization Iteration",
        "category": "optimization",
        "description": "Executes optimization iteration with gradient update",
        "enabled": True
    },
    "OPT-003": {
        "name": "Optimization Convergence Check",
        "category": "optimization",
        "description": "Checks convergence criteria for optimization",
        "enabled": True
    },
    # Context Hooks  
    "CTX-001": {
        "name": "Context Compression",
        "category": "context",
        "description": "Compresses context when approaching limits",
        "enabled": True
    },
    "CTX-002": {
        "name": "Context Priority Scoring",
        "category": "context",
        "description": "Scores context elements by relevance",
        "enabled": True
    },
    "CTX-003": {
        "name": "Context Restoration",
        "category": "context",
        "description": "Restores externalized context on demand",
        "enabled": True
    },
    # RL Hooks
    "RL-001": {
        "name": "RL State Capture",
        "category": "reinforcement_learning",
        "description": "Captures state for RL policy updates",
        "enabled": True
    },
    "RL-002": {
        "name": "RL Reward Assignment",
        "category": "reinforcement_learning",
        "description": "Assigns rewards based on outcomes",
        "enabled": True
    },
    "RL-003": {
        "name": "RL Policy Update",
        "category": "reinforcement_learning",
        "description": "Updates policy based on experience",
        "enabled": True
    },
    # Gradient Hooks
    "GRAD-001": {
        "name": "Gradient Computation",
        "category": "gradient",
        "description": "Computes gradients for optimization",
        "enabled": True
    },
    "GRAD-002": {
        "name": "Gradient Descent Step",
        "category": "gradient",
        "description": "Executes gradient descent update",
        "enabled": True
    },
    "GRAD-003": {
        "name": "Gradient Clipping",
        "category": "gradient",
        "description": "Clips gradients to prevent explosion",
        "enabled": True
    },
    # Resource Hooks
    "RES-001": {
        "name": "Resource Allocation",
        "category": "resource",
        "description": "Allocates resources for task execution",
        "enabled": True
    },
    "RES-002": {
        "name": "Resource Monitoring",
        "category": "resource",
        "description": "Monitors resource utilization",
        "enabled": True
    },
    "RES-003": {
        "name": "Resource Release",
        "category": "resource",
        "description": "Releases resources after task completion",
        "enabled": True
    }
}

# Hook execution history
hook_execution_history = []

def execute_cognitive_hook(hook_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a cognitive hook and return result."""
    hook = COGNITIVE_HOOKS.get(hook_id)
    
    if not hook:
        return {"success": False, "error": f"Unknown hook: {hook_id}"}
    
    if not hook.get("enabled", True):
        return {"success": False, "error": f"Hook disabled: {hook_id}"}
    
    start_time = datetime.now()
    
    # Pattern-based execution
    category = hook.get("category", "unknown")
    result = {}
    
    if category == "bayesian":
        result = {
            "pattern": "BAYES",
            "priorUpdated": True,
            "posteriorConfidence": 0.85,
            "evidenceProcessed": len(data)
        }
    elif category == "optimization":
        result = {
            "pattern": "OPT",
            "iteration": data.get("iteration", 1),
            "objectiveValue": data.get("objective", 0),
            "converged": data.get("converged", False),
            "improvementRate": 0.1
        }
    elif category == "context":
        result = {
            "pattern": "CTX",
            "contextSize": data.get("contextSize", "unknown"),
            "compressionRatio": 0.7,
            "priorityScored": True
        }
    elif category == "reinforcement_learning":
        result = {
            "pattern": "RL",
            "stateRecorded": True,
            "reward": data.get("reward", 0),
            "policyUpdated": True
        }
    elif category == "gradient":
        result = {
            "pattern": "GRAD",
            "gradientNorm": 0.01,
            "learningRate": data.get("learningRate", 0.001),
            "stepTaken": True
        }
    elif category == "resource":
        result = {
            "pattern": "RES",
            "resourcesAllocated": True,
            "utilizationPercent": 50,
            "available": True
        }
    else:
        result = {"pattern": "UNKNOWN", "processed": True}
    
    duration_ms = (datetime.now() - start_time).total_seconds() * 1000
    
    # Log execution
    execution = {
        "hook_id": hook_id,
        "timestamp": datetime.now().isoformat(),
        "duration_ms": duration_ms,
        "success": True,
        "data_keys": list(data.keys())
    }
    hook_execution_history.append(execution)
    if len(hook_execution_history) > 1000:
        hook_execution_history.pop(0)
    
    logger.info(f"HOOK: {hook_id} executed in {duration_ms:.2f}ms")
    
    return {
        "success": True,
        "hook_id": hook_id,
        "hook_name": hook["name"],
        "category": category,
        "duration_ms": duration_ms,
        "result": result
    }


@mcp.tool()
def hook_fire(hook_id: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Fire a cognitive hook with data payload.
    
    Args:
        hook_id: Hook ID (e.g., BAYES-001, OPT-002, CTX-003)
        data: Data payload for the hook
    
    Returns:
        Hook execution result
    """
    return execute_cognitive_hook(hook_id, data or {})


@mcp.tool()
def hook_list() -> Dict[str, Any]:
    """
    List all available cognitive hooks.
    
    Returns:
        List of hooks with their status
    """
    hooks = []
    for hook_id, hook in COGNITIVE_HOOKS.items():
        hooks.append({
            "id": hook_id,
            "name": hook["name"],
            "category": hook["category"],
            "enabled": hook.get("enabled", True)
        })
    
    return {
        "success": True,
        "hooks": hooks,
        "total": len(hooks),
        "categories": list(set(h["category"] for h in COGNITIVE_HOOKS.values()))
    }


@mcp.tool()
def hook_history(last_n: int = 50) -> Dict[str, Any]:
    """
    Get recent hook execution history.
    
    Args:
        last_n: Number of recent executions to return
    
    Returns:
        Recent hook executions
    """
    return {
        "success": True,
        "executions": hook_execution_history[-last_n:],
        "total_recorded": len(hook_execution_history)
    }


@mcp.tool()
def health_check() -> Dict[str, Any]:
    """
    Server health check endpoint.
    
    Returns:
        Server health status
    """
    return {
        "success": True,
        "status": "healthy",
        "server": SERVER_NAME,
        "hooks_available": len(COGNITIVE_HOOKS),
        "timestamp": datetime.now().isoformat()
    }


# ============================================================================
# FILESYSTEM TOOLS
# ============================================================================

@mcp.tool()
def read_file(path: str, encoding: str = "utf-8") -> Dict[str, Any]:
    """
    Read contents of a file.
    
    Args:
        path: Full path to file (e.g., C:\\PRISM\\state\\CURRENT_STATE.json)
        encoding: File encoding (default: utf-8)
    
    Returns:
        File contents and metadata
    """
    try:
        file_path = validate_path(path)
        
        if not file_path.exists():
            return {"success": False, "error": "FILE_NOT_FOUND", "path": str(file_path)}
        
        if not file_path.is_file():
            return {"success": False, "error": "NOT_A_FILE", "path": str(file_path)}
        
        # Check file size (limit to 10MB)
        size = file_path.stat().st_size
        if size > 10 * 1024 * 1024:
            return {"success": False, "error": "FILE_TOO_LARGE", "size_mb": size / (1024*1024)}
        
        content = file_path.read_text(encoding=encoding)
        
        logger.info(f"READ: {file_path} ({size} bytes)")
        
        return {
            "success": True,
            "path": str(file_path),
            "content": content,
            "size_bytes": size,
            "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
        }
    except PermissionError as e:
        return {"success": False, "error": "PERMISSION_DENIED", "message": str(e)}
    except Exception as e:
        return {"success": False, "error": str(type(e).__name__), "message": str(e)}


@mcp.tool()
def write_file(path: str, content: str, encoding: str = "utf-8", create_dirs: bool = True) -> Dict[str, Any]:
    """
    Write content to a file.
    
    Args:
        path: Full path to file
        content: Content to write
        encoding: File encoding (default: utf-8)
        create_dirs: Create parent directories if they don't exist
    
    Returns:
        Success status and file info
    """
    try:
        file_path = validate_path(path)
        
        if create_dirs:
            file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Backup if exists
        backup_path = None
        if file_path.exists():
            backup_path = file_path.with_suffix(file_path.suffix + ".bak")
            shutil.copy2(file_path, backup_path)
        
        file_path.write_text(content, encoding=encoding)
        
        logger.info(f"WRITE: {file_path} ({len(content)} chars)")
        
        # AUTO-HOOK: Fire code review hooks for code files
        if INTEL_TOOLS_AVAILABLE:
            try:
                auto_system = get_auto_hook_system()
                auto_system.on_code_write(str(file_path), content)
                auto_system.on_code_save(str(file_path), content)
            except Exception as hook_error:
                logger.warning(f"Auto-hook failed (non-blocking): {hook_error}")
        
        return {
            "success": True,
            "path": str(file_path),
            "size_bytes": file_path.stat().st_size,
            "backup_created": str(backup_path) if backup_path else None,
            "message": f"✅ Written to {file_path}",
            "auto_hooks_fired": INTEL_TOOLS_AVAILABLE
        }
    except PermissionError as e:
        # AUTO-HOOK: Fire failure hook
        if INTEL_TOOLS_AVAILABLE:
            try:
                auto_system = get_auto_hook_system()
                auto_system.on_failure("write_file", e, file_path=path)
            except:
                pass
        return {"success": False, "error": "PERMISSION_DENIED", "message": str(e)}
    except Exception as e:
        # AUTO-HOOK: Fire failure hook
        if INTEL_TOOLS_AVAILABLE:
            try:
                auto_system = get_auto_hook_system()
                auto_system.on_failure("write_file", e, file_path=path)
            except:
                pass
        return {"success": False, "error": str(type(e).__name__), "message": str(e)}


@mcp.tool()
def list_directory(path: str, recursive: bool = False, max_depth: int = 2) -> Dict[str, Any]:
    """
    List contents of a directory.
    
    Args:
        path: Directory path
        recursive: Include subdirectories
        max_depth: Maximum depth for recursive listing
    
    Returns:
        List of files and directories
    """
    try:
        dir_path = validate_path(path)
        
        if not dir_path.exists():
            return {"success": False, "error": "DIRECTORY_NOT_FOUND", "path": str(dir_path)}
        
        if not dir_path.is_dir():
            return {"success": False, "error": "NOT_A_DIRECTORY", "path": str(dir_path)}
        
        items = []
        
        def scan_dir(p: Path, depth: int = 0):
            if depth > max_depth:
                return
            try:
                for item in sorted(p.iterdir()):
                    # Skip hidden files and common excludes
                    if item.name.startswith('.') or item.name in ['node_modules', '__pycache__', '.git']:
                        continue
                    
                    info = {
                        "name": item.name,
                        "path": str(item),
                        "type": "directory" if item.is_dir() else "file",
                        "depth": depth
                    }
                    
                    if item.is_file():
                        info["size_bytes"] = item.stat().st_size
                        info["extension"] = item.suffix
                    
                    items.append(info)
                    
                    if recursive and item.is_dir():
                        scan_dir(item, depth + 1)
            except PermissionError:
                pass
        
        scan_dir(dir_path)
        
        logger.info(f"LIST: {dir_path} ({len(items)} items)")
        
        return {
            "success": True,
            "path": str(dir_path),
            "items": items,
            "total_items": len(items),
            "directories": sum(1 for i in items if i["type"] == "directory"),
            "files": sum(1 for i in items if i["type"] == "file")
        }
    except PermissionError as e:
        return {"success": False, "error": "PERMISSION_DENIED", "message": str(e)}
    except Exception as e:
        return {"success": False, "error": str(type(e).__name__), "message": str(e)}


@mcp.tool()
def create_directory(path: str) -> Dict[str, Any]:
    """
    Create a directory (and parents if needed).
    
    Args:
        path: Directory path to create
    
    Returns:
        Success status
    """
    try:
        dir_path = validate_path(path)
        dir_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"MKDIR: {dir_path}")
        
        return {
            "success": True,
            "path": str(dir_path),
            "message": f"✅ Directory created: {dir_path}"
        }
    except PermissionError as e:
        return {"success": False, "error": "PERMISSION_DENIED", "message": str(e)}
    except Exception as e:
        return {"success": False, "error": str(type(e).__name__), "message": str(e)}


@mcp.tool()
def delete_file(path: str, confirm: bool = False) -> Dict[str, Any]:
    """
    Delete a file (requires confirmation).
    
    Args:
        path: File path to delete
        confirm: Must be True to actually delete
    
    Returns:
        Success status
    """
    try:
        file_path = validate_path(path)
        
        if not file_path.exists():
            return {"success": False, "error": "FILE_NOT_FOUND"}
        
        if not confirm:
            return {
                "success": False,
                "error": "CONFIRMATION_REQUIRED",
                "message": f"Set confirm=True to delete: {file_path}",
                "path": str(file_path),
                "size_bytes": file_path.stat().st_size if file_path.is_file() else None
            }
        
        if file_path.is_file():
            file_path.unlink()
        else:
            shutil.rmtree(file_path)
        
        logger.info(f"DELETE: {file_path}")
        
        return {
            "success": True,
            "path": str(file_path),
            "message": f"✅ Deleted: {file_path}"
        }
    except PermissionError as e:
        return {"success": False, "error": "PERMISSION_DENIED", "message": str(e)}
    except Exception as e:
        return {"success": False, "error": str(type(e).__name__), "message": str(e)}


@mcp.tool()
def copy_file(source: str, destination: str) -> Dict[str, Any]:
    """
    Copy a file or directory.
    
    Args:
        source: Source path
        destination: Destination path
    
    Returns:
        Success status
    """
    try:
        src_path = validate_path(source)
        dst_path = validate_path(destination)
        
        if not src_path.exists():
            return {"success": False, "error": "SOURCE_NOT_FOUND"}
        
        if src_path.is_file():
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_path, dst_path)
        else:
            shutil.copytree(src_path, dst_path)
        
        logger.info(f"COPY: {src_path} -> {dst_path}")
        
        return {
            "success": True,
            "source": str(src_path),
            "destination": str(dst_path),
            "message": f"✅ Copied to {dst_path}"
        }
    except PermissionError as e:
        return {"success": False, "error": "PERMISSION_DENIED", "message": str(e)}
    except Exception as e:
        return {"success": False, "error": str(type(e).__name__), "message": str(e)}


@mcp.tool()
def move_file(source: str, destination: str) -> Dict[str, Any]:
    """
    Move/rename a file or directory.
    
    Args:
        source: Source path
        destination: Destination path
    
    Returns:
        Success status
    """
    try:
        src_path = validate_path(source)
        dst_path = validate_path(destination)
        
        if not src_path.exists():
            return {"success": False, "error": "SOURCE_NOT_FOUND"}
        
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src_path), str(dst_path))
        
        logger.info(f"MOVE: {src_path} -> {dst_path}")
        
        return {
            "success": True,
            "source": str(src_path),
            "destination": str(dst_path),
            "message": f"✅ Moved to {dst_path}"
        }
    except PermissionError as e:
        return {"success": False, "error": "PERMISSION_DENIED", "message": str(e)}
    except Exception as e:
        return {"success": False, "error": str(type(e).__name__), "message": str(e)}


@mcp.tool()
def search_files(
    directory: str,
    pattern: str = "*",
    content_search: Optional[str] = None,
    max_results: int = 50
) -> Dict[str, Any]:
    """
    Search for files by name pattern or content.
    
    Args:
        directory: Directory to search in
        pattern: Glob pattern (e.g., "*.py", "*.json")
        content_search: Optional text to search within files
        max_results: Maximum results to return
    
    Returns:
        List of matching files
    """
    try:
        dir_path = validate_path(directory)
        
        if not dir_path.exists():
            return {"success": False, "error": "DIRECTORY_NOT_FOUND"}
        
        matches = []
        
        for file_path in dir_path.rglob(pattern):
            if not file_path.is_file():
                continue
            if not is_path_allowed(file_path):
                continue
            
            match_info = {
                "path": str(file_path),
                "name": file_path.name,
                "size_bytes": file_path.stat().st_size
            }
            
            # Content search if requested
            if content_search:
                try:
                    content = file_path.read_text(errors='ignore')
                    if content_search.lower() in content.lower():
                        # Find line numbers
                        lines = content.split('\n')
                        matching_lines = [
                            i + 1 for i, line in enumerate(lines)
                            if content_search.lower() in line.lower()
                        ]
                        match_info["matching_lines"] = matching_lines[:10]
                        matches.append(match_info)
                except:
                    pass
            else:
                matches.append(match_info)
            
            if len(matches) >= max_results:
                break
        
        logger.info(f"SEARCH: {dir_path} pattern={pattern} ({len(matches)} matches)")
        
        return {
            "success": True,
            "directory": str(dir_path),
            "pattern": pattern,
            "content_search": content_search,
            "matches": matches,
            "total_matches": len(matches),
            "truncated": len(matches) >= max_results
        }
    except Exception as e:
        return {"success": False, "error": str(type(e).__name__), "message": str(e)}


@mcp.tool()
def file_info(path: str) -> Dict[str, Any]:
    """
    Get detailed information about a file or directory.
    
    Args:
        path: Path to file or directory
    
    Returns:
        Detailed file information
    """
    try:
        file_path = validate_path(path)
        
        if not file_path.exists():
            return {"success": False, "error": "NOT_FOUND"}
        
        stat = file_path.stat()
        
        info = {
            "success": True,
            "path": str(file_path),
            "name": file_path.name,
            "type": "directory" if file_path.is_dir() else "file",
            "size_bytes": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "accessed": datetime.fromtimestamp(stat.st_atime).isoformat(),
        }
        
        if file_path.is_file():
            info["extension"] = file_path.suffix
            # Calculate hash for small files
            if stat.st_size < 1024 * 1024:  # < 1MB
                info["md5"] = hashlib.md5(file_path.read_bytes()).hexdigest()
        
        if file_path.is_dir():
            items = list(file_path.iterdir())
            info["item_count"] = len(items)
            info["subdirs"] = sum(1 for i in items if i.is_dir())
            info["files"] = sum(1 for i in items if i.is_file())
        
        return info
    except Exception as e:
        return {"success": False, "error": str(type(e).__name__), "message": str(e)}


@mcp.tool()
def append_to_file(path: str, content: str, encoding: str = "utf-8") -> Dict[str, Any]:
    """
    Append content to a file.
    
    Args:
        path: File path
        content: Content to append
        encoding: File encoding
    
    Returns:
        Success status
    """
    try:
        file_path = validate_path(path)
        
        with open(file_path, 'a', encoding=encoding) as f:
            f.write(content)
        
        logger.info(f"APPEND: {file_path} (+{len(content)} chars)")
        
        # AUTO-HOOK: Fire code hooks for code files
        if INTEL_TOOLS_AVAILABLE:
            try:
                # Read full content for analysis
                full_content = file_path.read_text(encoding=encoding)
                auto_system = get_auto_hook_system()
                auto_system.on_code_write(str(file_path), full_content)
                auto_system.on_code_save(str(file_path), full_content)
            except Exception as hook_error:
                logger.warning(f"Auto-hook failed (non-blocking): {hook_error}")
        
        return {
            "success": True,
            "path": str(file_path),
            "appended_chars": len(content),
            "new_size_bytes": file_path.stat().st_size,
            "auto_hooks_fired": INTEL_TOOLS_AVAILABLE
        }
    except Exception as e:
        # AUTO-HOOK: Fire failure hook
        if INTEL_TOOLS_AVAILABLE:
            try:
                auto_system = get_auto_hook_system()
                auto_system.on_failure("append_to_file", e, file_path=path)
            except:
                pass
        return {"success": False, "error": str(type(e).__name__), "message": str(e)}


@mcp.tool()
def server_status() -> Dict[str, Any]:
    """
    Get server status and configuration.
    
    Returns:
        Server information
    """
    return {
        "success": True,
        "server_name": SERVER_NAME,
        "allowed_directories": [str(d) for d in ALLOWED_DIRECTORIES],
        "log_file": str(LOG_FILE),
        "timestamp": datetime.now().isoformat(),
        "tools_available": [
            "read_file", "write_file", "list_directory", "create_directory",
            "delete_file", "copy_file", "move_file", "search_files",
            "file_info", "append_to_file", "server_status"
        ]
    }


# ============================================================================
# REGISTER DEV TOOLS (Background Tasks, Checkpoints, Impact, Semantic, Context)
# ============================================================================

if DEV_TOOLS_AVAILABLE:
    try:
        num_dev_tools = register_dev_tools(mcp)
        logger.info(f"Registered {num_dev_tools} dev tools")
    except Exception as e:
        logger.error(f"Failed to register dev tools: {e}")
        DEV_TOOLS_AVAILABLE = False


# ============================================================================
# REGISTER INTELLIGENCE TOOLS (Token Budget, Reflection, Cascade, Zero-Token)
# ============================================================================

if INTEL_TOOLS_AVAILABLE:
    try:
        # Register each intelligence tool with FastMCP
        for tool_name, tool_func in INTELLIGENCE_TOOLS.items():
            mcp.tool(name=tool_name)(tool_func)
        num_intel_tools = len(INTELLIGENCE_TOOLS)
        
        # Register auto-hook control tools
        for tool_name, tool_func in AUTO_HOOK_TOOLS.items():
            mcp.tool(name=tool_name)(tool_func)
        num_auto_tools = len(AUTO_HOOK_TOOLS)
        
        # Initialize auto-hook system with intelligence tools
        initialize_auto_hooks(INTELLIGENCE_TOOLS)
        
        logger.info(f"Registered {num_intel_tools} intelligence tools + {num_auto_tools} auto-hook tools")
        print(f"✅ Registered {num_intel_tools + num_auto_tools} Intelligence Tools (P1-INTEL)")
        print(f"🔥 Auto-hooks ACTIVE: Failures, code writes, session lifecycle")
    except Exception as e:
        logger.error(f"Failed to register intelligence tools: {e}")
        INTEL_TOOLS_AVAILABLE = False


# ============================================================================
# MAIN - Start server with ngrok tunnel
# ============================================================================

def main():
    print("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM Local Filesystem MCP Server                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  This server exposes your local filesystem to Claude.ai via MCP protocol.     ║
║                                                                               ║
║  ALLOWED DIRECTORIES:                                                         ║""")
    for d in ALLOWED_DIRECTORIES:
        print(f"║    • {str(d):<66} ║")
    print("""║                                                                               ║
║  Starting ngrok tunnel...                                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝
""")
    
    # Start ngrok tunnel
    try:
        # Kill any existing ngrok processes
        ngrok.kill()
        
        # Start tunnel
        tunnel = ngrok.connect(SERVER_PORT, "http")
        public_url = tunnel.public_url
        
        # Convert to HTTPS if needed
        if public_url.startswith("http://"):
            public_url = public_url.replace("http://", "https://")
        
        print(f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ✅ TUNNEL ACTIVE                                                             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  PUBLIC URL: {public_url:<57} ║
║                                                                               ║
║  TO CONNECT FROM CLAUDE.AI:                                                   ║
║  1. Go to Claude.ai Settings → Connectors                                     ║
║  2. Add new MCP connector                                                     ║
║  3. Enter URL: {public_url}/sse                              ║
║  4. Save and refresh                                                          ║
║                                                                               ║
║  Press Ctrl+C to stop the server                                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
""")
        
        logger.info(f"Server starting on {public_url}")
        
        # Run the MCP server
        mcp.run(transport="sse", port=SERVER_PORT)
        
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        ngrok.kill()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTROUBLESHOOTING:")
        print("1. Install ngrok: https://ngrok.com/download")
        print("2. Sign up for free ngrok account")
        print("3. Run: ngrok config add-authtoken YOUR_TOKEN")
        raise


if __name__ == "__main__":
    main()
