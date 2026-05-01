#!/usr/bin/env python3
"""Test the MCP server by sending a mock request."""
import subprocess
import json

# Start server
proc = subprocess.Popen(
    ["py", "-3", "-W", "ignore", "C:/PRISM/scripts/prism_mcp_stdio_server.py"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

# Send initialize request
init_request = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "test", "version": "1.0"}
    }
}

json_str = json.dumps(init_request)
message = f"Content-Length: {len(json_str)}\r\n\r\n{json_str}"

print(f"Sending: {message[:80]}...")

try:
    proc.stdin.write(message)
    proc.stdin.flush()
    
    # Read response
    response_header = proc.stdout.readline()
    print(f"Response header: {repr(response_header)}")
    
    if response_header.startswith("Content-Length:"):
        length = int(response_header.split(":")[1].strip())
        proc.stdout.readline()  # empty line
        body = proc.stdout.read(length)
        print(f"Response body: {body}")
    else:
        print(f"Unexpected: {response_header}")
        
except Exception as e:
    print(f"Error: {e}")

# Check stderr
stderr = proc.stderr.read()
if stderr:
    print(f"Stderr: {stderr}")

proc.terminate()
