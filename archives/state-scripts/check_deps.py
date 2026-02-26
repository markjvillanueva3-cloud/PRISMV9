try:
    import chromadb
    print("chromadb OK")
except ImportError:
    print("chromadb NOT INSTALLED")

try:
    import sentence_transformers
    print("sentence_transformers OK")
except ImportError:
    print("sentence_transformers NOT INSTALLED")
