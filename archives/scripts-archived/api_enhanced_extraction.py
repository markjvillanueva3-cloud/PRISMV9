"""
API-Enhanced Extraction for Failed Modules
Uses Claude API to intelligently extract modules that failed regex-based extraction.
"""
import os
import json
import re
import requests
from pathlib import Path
from datetime import datetime
import time

API_KEY = os.environ.get('ANTHROPIC_API_KEY')
MODEL = "claude-sonnet-4-20250514"
OUTPUT_DIR = Path(r'C:\PRISM\extracted_modules\complete_extraction')

def get_failed_modules():
    """Get list of modules that failed extraction."""
    summary_file = OUTPUT_DIR / 'EXTRACTION_SUMMARY.json'
    if summary_file.exists():
        summary = json.loads(summary_file.read_text(encoding='utf-8'))
        return [f['module'] for f in summary.get('failed_modules', []) if isinstance(f, dict)]
    return []

def get_module_context(monolith: str, module_name: str, context_size: int = 15000) -> str:
    """Extract context around where a module should be."""
    # Try to find any mention of the module
    patterns = [
        rf'const\s+{re.escape(module_name)}\s*=',
        rf'{re.escape(module_name)}\s*:',
        rf'"{re.escape(module_name)}"',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, monolith)
        if match:
            start = max(0, match.start() - 500)
            end = min(len(monolith), match.start() + context_size)
            return monolith[start:end]
    
    return None

def api_extract_module(module_name: str, context: str) -> dict:
    """Use Claude API to extract a module from context."""
    if not API_KEY:
        return {'success': False, 'error': 'No API key'}
    
    headers = {
        'x-api-key': API_KEY,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01'
    }
    
    payload = {
        'model': MODEL,
        'max_tokens': 8192,
        'messages': [{
            'role': 'user',
            'content': f"""Extract the COMPLETE JavaScript const module named '{module_name}' from this code.

RULES:
1. Start with exactly: const {module_name} = {{
2. Include ALL content until the matching closing }}
3. Return ONLY the raw JavaScript - no markdown, no explanation
4. If you cannot find the complete module, respond with: MODULE_NOT_FOUND

CODE CONTEXT:
{context}"""
        }]
    }
    
    try:
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers=headers,
            json=payload,
            timeout=120
        )
        
        if response.status_code == 200:
            data = response.json()
            text = data['content'][0]['text']
            
            if 'MODULE_NOT_FOUND' in text:
                return {'success': False, 'error': 'Module not found by API'}
            
            # Validate it looks like a module
            if text.strip().startswith(f'const {module_name}'):
                return {'success': True, 'code': text.strip()}
            else:
                return {'success': False, 'error': 'Invalid response format'}
        else:
            return {'success': False, 'error': f'API error: {response.status_code}'}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}

def main():
    print("=" * 70)
    print("API-ENHANCED EXTRACTION FOR FAILED MODULES")
    print("=" * 70)
    
    # Load monolith
    print("\nLoading monolith...")
    monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
    monolith = monolith_path.read_text(encoding='utf-8')
    print(f"  Size: {len(monolith):,} chars")
    
    # Get failed modules
    failed_modules = get_failed_modules()
    print(f"\nFailed modules to retry: {len(failed_modules)}")
    
    if not failed_modules:
        # Try to find from inventory
        inv = json.loads(Path(r'C:\PRISM\extracted_modules\MONOLITH_MODULE_INVENTORY.json').read_text(encoding='utf-8'))
        all_modules = set(inv['modules_by_type'].get('const_modules', []))
        
        # Get extracted
        extracted = set()
        for f in OUTPUT_DIR.glob('*.js'):
            extracted.add(f.stem)
        
        failed_modules = list(all_modules - extracted)
        print(f"  Found {len(failed_modules)} unextracted modules from inventory")
    
    # Process each failed module
    recovered = []
    still_failed = []
    
    for i, mod in enumerate(failed_modules):
        print(f"\n[{i+1}/{len(failed_modules)}] {mod}")
        
        # Get context
        context = get_module_context(monolith, mod)
        if not context:
            print(f"  No context found")
            still_failed.append({'module': mod, 'error': 'No context'})
            continue
        
        # API extraction
        result = api_extract_module(mod, context)
        
        if result['success']:
            # Save module
            (OUTPUT_DIR / f'{mod}.js').write_text(result['code'], encoding='utf-8')
            recovered.append({'module': mod, 'size': len(result['code'])})
            print(f"  RECOVERED: {len(result['code']):,} chars")
        else:
            still_failed.append({'module': mod, 'error': result['error']})
            print(f"  FAILED: {result['error']}")
        
        # Rate limiting
        time.sleep(0.5)
    
    # Summary
    print("\n" + "=" * 70)
    print("API EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"Recovered: {len(recovered)}")
    print(f"Still failed: {len(still_failed)}")
    
    # Update summary
    summary_file = OUTPUT_DIR / 'EXTRACTION_SUMMARY.json'
    if summary_file.exists():
        summary = json.loads(summary_file.read_text(encoding='utf-8'))
    else:
        summary = {}
    
    summary['api_recovery'] = {
        'attempted': len(failed_modules),
        'recovered': len(recovered),
        'still_failed': len(still_failed),
        'recovered_modules': recovered,
        'failed_modules': still_failed
    }
    
    summary_file.write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(f"\nUpdated summary: {summary_file}")

if __name__ == '__main__':
    main()
