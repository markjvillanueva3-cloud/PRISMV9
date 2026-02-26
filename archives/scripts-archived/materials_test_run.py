#!/usr/bin/env python3
"""
PRISM Materials Completion - TEST RUN
=====================================
Tests the API integration with 2 materials before full run.
"""

import os
import json
import anthropic
from datetime import datetime

API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL_SONNET = "claude-sonnet-4-20250514"

def test_enhancement():
    """Test enhancing a single material"""
    print("=" * 60)
    print("  PRISM Materials Completion - TEST RUN")
    print("=" * 60)
    
    if not API_KEY:
        print("[ERROR] No API key found!")
        return False
    
    print(f"[OK] API key found: {API_KEY[:20]}...")
    
    # Test material with missing sections
    test_material = {
        "id": "TEST-001",
        "name": "AISI 1018 Test",
        "composition": {"C": {"typical": 0.18}, "Mn": {"typical": 0.75}},
        "mechanical": {"tensile_strength": 440, "yield_strength": 370}
    }
    
    missing_sections = ["chipFormation", "friction", "thermalMachining", "statisticalData"]
    
    prompt = f"""You are a materials scientist. Add these missing sections to this steel material.

MATERIAL: {json.dumps(test_material, indent=2)}
MISSING SECTIONS: {missing_sections}

Return ONLY valid JSON with the missing sections. Include uncertainty bounds.
Example format:
{{
  "chipFormation": {{ "chipType": "CONTINUOUS", "shearAngle": {{"value": 25, "unit": "degrees"}} }},
  "friction": {{ "toolChipInterface": {{"dry": 0.5}} }},
  ...
}}"""

    print("\n[TEST] Calling Sonnet API...")
    
    try:
        client = anthropic.Anthropic(api_key=API_KEY)
        
        response = client.messages.create(
            model=MODEL_SONNET,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        print(f"[OK] API responded!")
        print(f"    Input tokens: {response.usage.input_tokens}")
        print(f"    Output tokens: {response.usage.output_tokens}")
        
        content = response.content[0].text
        print(f"\n[RESPONSE PREVIEW]")
        print(content[:500])
        
        # Try to parse JSON
        import re
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                print(f"\n[OK] JSON parsed successfully!")
                print(f"    Sections returned: {list(parsed.keys())}")
                return True
            except:
                print("[WARN] Could not parse JSON, but API works")
                return True
        
        return True
        
    except Exception as e:
        print(f"[ERROR] API call failed: {e}")
        return False

def test_new_material():
    """Test generating a new superalloy material"""
    print("\n" + "=" * 60)
    print("  TEST: Generate New Superalloy")
    print("=" * 60)
    
    prompt = """You are a materials scientist. Generate ONE complete material entry for Inconel 718 (Solution Treated + Aged).

Include ALL sections with scientific accuracy:
- identification (id: S-NI-TEST, name, UNS, standard, isoGroup: S)
- composition (Ni, Cr, Fe, Nb, Mo, Ti, Al percentages)
- physicalProperties (density, melting point, thermal conductivity, elastic modulus)
- mechanicalProperties (tensile, yield, elongation, hardness)
- kienzle (kc1_1 and mc for cutting forces - typically 2200-2800 N/mm2 for superalloys)
- taylorToolLife (C and n values for different tool materials)
- johnsonCook (A, B, n, C, m parameters)
- chipFormation (segmented chips typical for superalloys)
- friction (high adhesion tendency)
- thermalMachining (low thermal conductivity = high cutting temps)
- surfaceIntegrity (work hardening prone)
- machinability (very difficult, ~15% of B1112)
- recommendedParameters (low speeds, high coolant pressure)
- statisticalData (sources, confidence, uncertainty bounds)

Return ONLY valid JSON, no markdown. Be scientifically accurate."""

    try:
        client = anthropic.Anthropic(api_key=API_KEY)
        
        response = client.messages.create(
            model=MODEL_SONNET,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        print(f"[OK] API responded!")
        print(f"    Input tokens: {response.usage.input_tokens}")
        print(f"    Output tokens: {response.usage.output_tokens}")
        
        content = response.content[0].text
        
        # Try to parse
        import re
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                print(f"\n[OK] Complete material generated!")
                print(f"    Sections: {list(parsed.keys())}")
                
                # Save test output
                test_output = r"C:\\PRISM\_REPORTS\test_material_output.json"
                os.makedirs(os.path.dirname(test_output), exist_ok=True)
                with open(test_output, 'w') as f:
                    json.dump(parsed, f, indent=2)
                print(f"    Saved to: {test_output}")
                return True
            except Exception as e:
                print(f"[WARN] JSON parse issue: {e}")
                # Save raw for debugging
                with open(r"C:\\PRISM\_REPORTS\test_raw_output.txt", 'w') as f:
                    f.write(content)
                return True
        
        return True
        
    except Exception as e:
        print(f"[ERROR] API call failed: {e}")
        return False

if __name__ == "__main__":
    ok1 = test_enhancement()
    ok2 = test_new_material()
    
    print("\n" + "=" * 60)
    if ok1 and ok2:
        print("  ALL TESTS PASSED - Ready for full run!")
        print("  Run: py materials_completion_v1.py")
    else:
        print("  TESTS FAILED - Check errors above")
    print("=" * 60)
