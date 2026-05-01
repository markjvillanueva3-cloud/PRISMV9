import sys
sys.path.insert(0, r'C:\PRISM\mcp-server\src\tools')
from intelligence import INTELLIGENCE_TOOLS

omega_tools = [k for k in INTELLIGENCE_TOOLS.keys() if 'omega' in k]
print(f'Omega tools in INTELLIGENCE_TOOLS: {omega_tools}')
print(f'Total tools: {len(INTELLIGENCE_TOOLS)}')
