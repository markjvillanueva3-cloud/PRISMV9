"""Test Anthropic API connection for PRISM"""
import anthropic
import os
import sys

def test_api():
    key = os.environ.get('ANTHROPIC_API_KEY', '')
    
    if not key:
        print("ERROR: ANTHROPIC_API_KEY not found in environment")
        return False
    
    print(f"API Key: {key[:20]}...{key[-10:]}")
    print(f"Key length: {len(key)} chars")
    
    try:
        client = anthropic.Anthropic(api_key=key)
        
        # Quick test call with Sonnet (reliable model)
        print("\nTesting API connection...")
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=50,
            messages=[{"role": "user", "content": "Say 'PRISM READY' in exactly 2 words"}]
        )
        
        print("")
        print("=" * 50)
        print("API CONNECTION SUCCESSFUL!")
        print("=" * 50)
        print(f"Response: {message.content[0].text}")
        print(f"Model: claude-sonnet-4-20250514")
        print(f"Input tokens: {message.usage.input_tokens}")
        print(f"Output tokens: {message.usage.output_tokens}")
        
        # Cost calculation (Sonnet: $3/M input, $15/M output)
        cost = (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000
        print(f"Est. cost: ${cost:.6f}")
        return True
        
    except anthropic.AuthenticationError as e:
        print(f"\nAUTHENTICATION ERROR: {e}")
        print("Check your API key is valid")
        return False
    except anthropic.RateLimitError as e:
        print(f"\nRATE LIMIT: {e}")
        print("API works but rate limited - wait and retry")
        return True  # Key works, just limited
    except anthropic.NotFoundError as e:
        print(f"\nMODEL NOT FOUND: {e}")
        print("Trying alternative model...")
        return test_alternative_model(client)
    except Exception as e:
        print(f"\nAPI ERROR: {type(e).__name__}: {e}")
        return False

def test_alternative_model(client):
    """Try alternative model names"""
    models = [
        "claude-3-5-sonnet-20241022",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
    ]
    
    for model in models:
        try:
            print(f"  Trying {model}...")
            message = client.messages.create(
                model=model,
                max_tokens=50,
                messages=[{"role": "user", "content": "Say 'PRISM READY'"}]
            )
            print(f"  SUCCESS with {model}!")
            print(f"  Response: {message.content[0].text}")
            return True
        except:
            continue
    
    print("  No working model found")
    return False

if __name__ == "__main__":
    success = test_api()
    sys.exit(0 if success else 1)
