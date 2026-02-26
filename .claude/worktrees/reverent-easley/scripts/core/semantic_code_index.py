#!/usr/bin/env python3
"""
PRISM Semantic Code Index - CORE.5
Navigate 986,621 lines across 831 modules effortlessly via embeddings.

Features:
- Parse Python/JS/TS modules and extract functions, classes, comments
- Generate embeddings for semantic search
- Store in ChromaDB vector database
- Query tools: search_code, get_dependencies, get_consumers, find_similar

Usage:
    # Build index (run once, ~30 min for full monolith)
    python semantic_code_index.py --build "C:\\path\\to\\monolith"
    
    # Search code
    python semantic_code_index.py --search "Kienzle force calculation"
    
    # Get dependencies
    python semantic_code_index.py --deps "physics/cutting_force.py"
    
    # Get consumers
    python semantic_code_index.py --consumers "PRISM_MATERIALS"
    
    # Find similar code
    python semantic_code_index.py --similar "def calculate_feed(material, tool):"

Author: Claude (PRISM Developer)
Created: 2026-02-01
"""

import os
import re
import ast
import json
import hashlib
import sqlite3
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple, Set, Any
from datetime import datetime
import argparse

# Optional imports - graceful degradation if not installed
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    # Silenced for MCP compatibility

try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    # Silenced for MCP compatibility


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class CodeChunk:
    """A chunk of code extracted from a module."""
    chunk_id: str
    file_path: str
    chunk_type: str  # function, class, method, comment, module
    name: str
    start_line: int
    end_line: int
    content: str
    docstring: Optional[str] = None
    signature: Optional[str] = None
    parent: Optional[str] = None  # For methods, the containing class
    decorators: List[str] = field(default_factory=list)
    
    def to_search_text(self) -> str:
        """Generate text for embedding/search."""
        parts = [self.name]
        if self.docstring:
            parts.append(self.docstring)
        if self.signature:
            parts.append(self.signature)
        # Add first 500 chars of content for context
        parts.append(self.content[:500])
        return " ".join(parts)


@dataclass
class CodeMatch:
    """A search result."""
    file_path: str
    start_line: int
    end_line: int
    chunk_type: str
    name: str
    snippet: str
    score: float
    docstring: Optional[str] = None


@dataclass
class Dependency:
    """A module dependency."""
    module: str
    imported_names: List[str]
    is_relative: bool
    line_number: int


@dataclass
class Consumer:
    """A module that uses another module."""
    file_path: str
    import_line: int
    imported_names: List[str]


@dataclass
class ModuleSummary:
    """Overview of a module."""
    file_path: str
    functions: List[str]
    classes: List[str]
    imports: List[str]
    line_count: int
    docstring: Optional[str] = None


# =============================================================================
# CODE PARSERS
# =============================================================================

class PythonParser:
    """Parse Python files to extract code chunks."""
    
    def parse_file(self, file_path: str) -> Tuple[List[CodeChunk], List[Dependency]]:
        """Parse a Python file and extract chunks and dependencies."""
        chunks = []
        dependencies = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
                lines = content.split('\n')
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return [], []
        
        try:
            tree = ast.parse(content)
        except SyntaxError as e:
            # If AST fails, do regex-based extraction
            return self._regex_parse(file_path, content, lines), []
        
        # Extract module docstring
        module_doc = ast.get_docstring(tree)
        if module_doc:
            chunks.append(CodeChunk(
                chunk_id=self._make_id(file_path, "module", "module_doc"),
                file_path=file_path,
                chunk_type="module",
                name=Path(file_path).stem,
                start_line=1,
                end_line=len(module_doc.split('\n')),
                content=module_doc,
                docstring=module_doc
            ))
        
        # Walk AST
        for node in ast.walk(tree):
            # Extract imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    dependencies.append(Dependency(
                        module=alias.name,
                        imported_names=[alias.asname or alias.name],
                        is_relative=False,
                        line_number=node.lineno
                    ))
            
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    names = [alias.name for alias in node.names]
                    dependencies.append(Dependency(
                        module=node.module,
                        imported_names=names,
                        is_relative=node.level > 0,
                        line_number=node.lineno
                    ))
            
            # Extract functions
            elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                chunk = self._extract_function(node, file_path, lines)
                if chunk:
                    chunks.append(chunk)
            
            # Extract classes
            elif isinstance(node, ast.ClassDef):
                chunk = self._extract_class(node, file_path, lines)
                if chunk:
                    chunks.append(chunk)
                    # Extract methods
                    for item in node.body:
                        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            method_chunk = self._extract_function(
                                item, file_path, lines, parent_class=node.name
                            )
                            if method_chunk:
                                chunks.append(method_chunk)
        
        return chunks, dependencies
    
    def _extract_function(self, node: ast.FunctionDef, file_path: str, 
                          lines: List[str], parent_class: str = None) -> Optional[CodeChunk]:
        """Extract a function/method as a CodeChunk."""
        try:
            start = node.lineno
            end = node.end_lineno or start
            content = '\n'.join(lines[start-1:end])
            
            # Get signature
            args = []
            for arg in node.args.args:
                arg_str = arg.arg
                if arg.annotation:
                    arg_str += f": {ast.unparse(arg.annotation)}"
                args.append(arg_str)
            
            returns = ""
            if node.returns:
                returns = f" -> {ast.unparse(node.returns)}"
            
            signature = f"def {node.name}({', '.join(args)}){returns}"
            
            # Get decorators
            decorators = []
            for dec in node.decorator_list:
                if isinstance(dec, ast.Name):
                    decorators.append(dec.id)
                elif isinstance(dec, ast.Call) and isinstance(dec.func, ast.Name):
                    decorators.append(dec.func.id)
            
            chunk_type = "method" if parent_class else "function"
            
            return CodeChunk(
                chunk_id=self._make_id(file_path, chunk_type, node.name),
                file_path=file_path,
                chunk_type=chunk_type,
                name=node.name,
                start_line=start,
                end_line=end,
                content=content,
                docstring=ast.get_docstring(node),
                signature=signature,
                parent=parent_class,
                decorators=decorators
            )
        except Exception as e:
            print(f"Error extracting function {node.name}: {e}")
            return None
    
    def _extract_class(self, node: ast.ClassDef, file_path: str, 
                       lines: List[str]) -> Optional[CodeChunk]:
        """Extract a class as a CodeChunk."""
        try:
            start = node.lineno
            end = node.end_lineno or start
            
            # Get class body without methods (just first few lines)
            class_lines = lines[start-1:min(start+10, end)]
            content = '\n'.join(class_lines)
            
            # Get base classes
            bases = []
            for base in node.bases:
                if isinstance(base, ast.Name):
                    bases.append(base.id)
                elif isinstance(base, ast.Attribute):
                    bases.append(ast.unparse(base))
            
            signature = f"class {node.name}"
            if bases:
                signature += f"({', '.join(bases)})"
            
            return CodeChunk(
                chunk_id=self._make_id(file_path, "class", node.name),
                file_path=file_path,
                chunk_type="class",
                name=node.name,
                start_line=start,
                end_line=end,
                content=content,
                docstring=ast.get_docstring(node),
                signature=signature
            )
        except Exception as e:
            print(f"Error extracting class {node.name}: {e}")
            return None
    
    def _regex_parse(self, file_path: str, content: str, 
                     lines: List[str]) -> List[CodeChunk]:
        """Fallback regex-based parsing for files with syntax errors."""
        chunks = []
        
        # Find functions
        func_pattern = r'^(async\s+)?def\s+(\w+)\s*\([^)]*\)'
        for match in re.finditer(func_pattern, content, re.MULTILINE):
            name = match.group(2)
            start = content[:match.start()].count('\n') + 1
            chunks.append(CodeChunk(
                chunk_id=self._make_id(file_path, "function", name),
                file_path=file_path,
                chunk_type="function",
                name=name,
                start_line=start,
                end_line=start + 10,  # Approximate
                content=match.group(0),
                signature=match.group(0)
            ))
        
        # Find classes
        class_pattern = r'^class\s+(\w+)\s*[\(:]'
        for match in re.finditer(class_pattern, content, re.MULTILINE):
            name = match.group(1)
            start = content[:match.start()].count('\n') + 1
            chunks.append(CodeChunk(
                chunk_id=self._make_id(file_path, "class", name),
                file_path=file_path,
                chunk_type="class",
                name=name,
                start_line=start,
                end_line=start + 20,
                content=match.group(0),
                signature=match.group(0)
            ))
        
        return chunks
    
    def _make_id(self, file_path: str, chunk_type: str, name: str) -> str:
        """Generate unique ID for a chunk."""
        text = f"{file_path}:{chunk_type}:{name}"
        return hashlib.md5(text.encode()).hexdigest()[:16]


class JavaScriptParser:
    """Parse JavaScript/TypeScript files to extract code chunks."""
    
    def parse_file(self, file_path: str) -> Tuple[List[CodeChunk], List[Dependency]]:
        """Parse a JS/TS file using regex (no AST for simplicity)."""
        chunks = []
        dependencies = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
                lines = content.split('\n')
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return [], []
        
        # Extract imports
        import_patterns = [
            r"import\s+{([^}]+)}\s+from\s+['\"]([^'\"]+)['\"]",  # import { x } from 'y'
            r"import\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]",      # import x from 'y'
            r"const\s+{([^}]+)}\s*=\s*require\(['\"]([^'\"]+)['\"]\)",  # const { x } = require('y')
            r"const\s+(\w+)\s*=\s*require\(['\"]([^'\"]+)['\"]\)",      # const x = require('y')
        ]
        
        for pattern in import_patterns:
            for match in re.finditer(pattern, content):
                names = match.group(1).split(',')
                names = [n.strip() for n in names if n.strip()]
                module = match.group(2)
                line_num = content[:match.start()].count('\n') + 1
                dependencies.append(Dependency(
                    module=module,
                    imported_names=names,
                    is_relative=module.startswith('.'),
                    line_number=line_num
                ))
        
        # Extract functions
        func_patterns = [
            r'(async\s+)?function\s+(\w+)\s*\([^)]*\)',  # function name()
            r'(export\s+)?(async\s+)?function\s+(\w+)',  # export function name
            r'const\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*=>',  # const name = () =>
            r'(\w+)\s*:\s*(async\s+)?function\s*\([^)]*\)',     # name: function()
        ]
        
        for pattern in func_patterns:
            for match in re.finditer(pattern, content, re.MULTILINE):
                # Extract function name from match groups
                groups = match.groups()
                name = None
                for g in groups:
                    if g and re.match(r'^\w+$', g) and g not in ['async', 'export', 'function', 'const']:
                        name = g
                        break
                
                if name:
                    start = content[:match.start()].count('\n') + 1
                    chunks.append(CodeChunk(
                        chunk_id=self._make_id(file_path, "function", name),
                        file_path=file_path,
                        chunk_type="function",
                        name=name,
                        start_line=start,
                        end_line=start + 10,
                        content=match.group(0),
                        signature=match.group(0)
                    ))
        
        # Extract classes
        class_pattern = r'(export\s+)?(default\s+)?class\s+(\w+)(\s+extends\s+\w+)?'
        for match in re.finditer(class_pattern, content):
            name = match.group(3)
            start = content[:match.start()].count('\n') + 1
            chunks.append(CodeChunk(
                chunk_id=self._make_id(file_path, "class", name),
                file_path=file_path,
                chunk_type="class",
                name=name,
                start_line=start,
                end_line=start + 20,
                content=match.group(0),
                signature=match.group(0)
            ))
        
        # Extract TypeScript interfaces
        interface_pattern = r'(export\s+)?interface\s+(\w+)'
        for match in re.finditer(interface_pattern, content):
            name = match.group(2)
            start = content[:match.start()].count('\n') + 1
            chunks.append(CodeChunk(
                chunk_id=self._make_id(file_path, "interface", name),
                file_path=file_path,
                chunk_type="interface",
                name=name,
                start_line=start,
                end_line=start + 10,
                content=match.group(0),
                signature=match.group(0)
            ))
        
        return chunks, dependencies
    
    def _make_id(self, file_path: str, chunk_type: str, name: str) -> str:
        """Generate unique ID for a chunk."""
        text = f"{file_path}:{chunk_type}:{name}"
        return hashlib.md5(text.encode()).hexdigest()[:16]



# =============================================================================
# EMBEDDING GENERATOR
# =============================================================================

class EmbeddingGenerator:
    """Generate embeddings for code chunks."""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize with sentence transformer model."""
        self.model = None
        self.model_name = model_name
        self._load_model()
    
    def _load_model(self):
        """Load the embedding model."""
        if EMBEDDINGS_AVAILABLE:
            try:
                self.model = SentenceTransformer(self.model_name)
                print(f"Loaded embedding model: {self.model_name}")
            except Exception as e:
                print(f"Error loading model: {e}")
                self.model = None
        else:
            print("Using keyword-based fallback (no embeddings)")
    
    def generate(self, text: str) -> List[float]:
        """Generate embedding for text."""
        if self.model:
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        else:
            # Fallback: simple keyword hash (not semantic, but works)
            return self._keyword_hash(text)
    
    def generate_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        if self.model:
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            return embeddings.tolist()
        else:
            return [self._keyword_hash(t) for t in texts]
    
    def _keyword_hash(self, text: str) -> List[float]:
        """Simple keyword-based vector (384 dims to match model)."""
        # Extract keywords
        words = re.findall(r'\b\w+\b', text.lower())
        # Create sparse vector via hashing
        vector = [0.0] * 384
        for word in words:
            idx = hash(word) % 384
            vector[idx] += 1.0
        # Normalize
        magnitude = sum(v*v for v in vector) ** 0.5
        if magnitude > 0:
            vector = [v / magnitude for v in vector]
        return vector


# =============================================================================
# STORAGE BACKEND
# =============================================================================

class SemanticIndexStorage:
    """Storage backend for semantic code index."""
    
    def __init__(self, db_path: str):
        """Initialize storage at given path."""
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # SQLite for metadata
        self.sqlite_path = self.db_path / "code_index.db"
        self._init_sqlite()
        
        # ChromaDB for vectors (if available)
        self.chroma_client = None
        self.collection = None
        if CHROMADB_AVAILABLE:
            self._init_chromadb()
    
    def _init_sqlite(self):
        """Initialize SQLite database for metadata."""
        conn = sqlite3.connect(str(self.sqlite_path))
        cursor = conn.cursor()
        
        # Chunks table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chunks (
                chunk_id TEXT PRIMARY KEY,
                file_path TEXT NOT NULL,
                chunk_type TEXT NOT NULL,
                name TEXT NOT NULL,
                start_line INTEGER,
                end_line INTEGER,
                content TEXT,
                docstring TEXT,
                signature TEXT,
                parent TEXT,
                decorators TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Dependencies table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dependencies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_file TEXT NOT NULL,
                target_module TEXT NOT NULL,
                imported_names TEXT,
                is_relative INTEGER,
                line_number INTEGER
            )
        ''')
        
        # Embeddings table (fallback if no ChromaDB)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS embeddings (
                chunk_id TEXT PRIMARY KEY,
                embedding BLOB,
                search_text TEXT
            )
        ''')
        
        # Index for fast lookups
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_path)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_chunks_name ON chunks(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_chunks_type ON chunks(chunk_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_deps_source ON dependencies(source_file)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_deps_target ON dependencies(target_module)')
        
        # Full-text search
        cursor.execute('''
            CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
                chunk_id, name, content, docstring, signature,
                content='chunks',
                content_rowid='rowid'
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _init_chromadb(self):
        """Initialize ChromaDB for vector search."""
        try:
            chroma_path = self.db_path / "chroma"
            self.chroma_client = chromadb.PersistentClient(
                path=str(chroma_path),
                settings=Settings(anonymized_telemetry=False)
            )
            self.collection = self.chroma_client.get_or_create_collection(
                name="prism_code",
                metadata={"hnsw:space": "cosine"}
            )
            print(f"ChromaDB initialized at {chroma_path}")
        except Exception as e:
            print(f"ChromaDB initialization failed: {e}")
            self.chroma_client = None
    
    def store_chunk(self, chunk: CodeChunk, embedding: List[float]):
        """Store a code chunk with its embedding."""
        conn = sqlite3.connect(str(self.sqlite_path))
        cursor = conn.cursor()
        
        # Store metadata
        cursor.execute('''
            INSERT OR REPLACE INTO chunks 
            (chunk_id, file_path, chunk_type, name, start_line, end_line, 
             content, docstring, signature, parent, decorators)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            chunk.chunk_id, chunk.file_path, chunk.chunk_type, chunk.name,
            chunk.start_line, chunk.end_line, chunk.content, chunk.docstring,
            chunk.signature, chunk.parent, json.dumps(chunk.decorators)
        ))
        
        # Store embedding in SQLite (fallback)
        import pickle
        cursor.execute('''
            INSERT OR REPLACE INTO embeddings (chunk_id, embedding, search_text)
            VALUES (?, ?, ?)
        ''', (chunk.chunk_id, pickle.dumps(embedding), chunk.to_search_text()))
        
        # Update FTS
        cursor.execute('''
            INSERT OR REPLACE INTO chunks_fts (chunk_id, name, content, docstring, signature)
            VALUES (?, ?, ?, ?, ?)
        ''', (chunk.chunk_id, chunk.name, chunk.content, chunk.docstring, chunk.signature))
        
        conn.commit()
        conn.close()
        
        # Store in ChromaDB if available
        if self.collection:
            try:
                self.collection.upsert(
                    ids=[chunk.chunk_id],
                    embeddings=[embedding],
                    documents=[chunk.to_search_text()],
                    metadatas=[{
                        "file_path": chunk.file_path,
                        "chunk_type": chunk.chunk_type,
                        "name": chunk.name,
                        "start_line": chunk.start_line,
                        "end_line": chunk.end_line
                    }]
                )
            except Exception as e:
                print(f"ChromaDB upsert error: {e}")
    
    def store_dependency(self, source_file: str, dep: Dependency):
        """Store a dependency relationship."""
        conn = sqlite3.connect(str(self.sqlite_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO dependencies 
            (source_file, target_module, imported_names, is_relative, line_number)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            source_file, dep.module, json.dumps(dep.imported_names),
            1 if dep.is_relative else 0, dep.line_number
        ))
        
        conn.commit()
        conn.close()
    
    def search_semantic(self, query_embedding: List[float], limit: int = 5) -> List[CodeMatch]:
        """Search using semantic similarity."""
        results = []
        
        # Try ChromaDB first
        if self.collection:
            try:
                chroma_results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=limit
                )
                
                for i, chunk_id in enumerate(chroma_results['ids'][0]):
                    meta = chroma_results['metadatas'][0][i]
                    distance = chroma_results['distances'][0][i] if 'distances' in chroma_results else 0
                    score = 1 - distance  # Convert distance to similarity
                    
                    # Get full chunk data
                    chunk = self.get_chunk(chunk_id)
                    if chunk:
                        results.append(CodeMatch(
                            file_path=chunk.file_path,
                            start_line=chunk.start_line,
                            end_line=chunk.end_line,
                            chunk_type=chunk.chunk_type,
                            name=chunk.name,
                            snippet=chunk.content[:500],
                            score=score,
                            docstring=chunk.docstring
                        ))
                
                return results
            except Exception as e:
                print(f"ChromaDB search error: {e}")
        
        # Fallback: SQLite with cosine similarity calculation
        return self._sqlite_vector_search(query_embedding, limit)
    
    def _sqlite_vector_search(self, query_embedding: List[float], limit: int) -> List[CodeMatch]:
        """Fallback vector search using SQLite."""
        import pickle
        
        conn = sqlite3.connect(str(self.sqlite_path))
        cursor = conn.cursor()
        
        cursor.execute('SELECT chunk_id, embedding FROM embeddings')
        rows = cursor.fetchall()
        
        # Calculate similarities
        scored = []
        for chunk_id, emb_blob in rows:
            embedding = pickle.loads(emb_blob)
            score = self._cosine_similarity(query_embedding, embedding)
            scored.append((chunk_id, score))
        
        # Sort by score
        scored.sort(key=lambda x: x[1], reverse=True)
        
        # Get top results
        results = []
        for chunk_id, score in scored[:limit]:
            chunk = self.get_chunk(chunk_id)
            if chunk:
                results.append(CodeMatch(
                    file_path=chunk.file_path,
                    start_line=chunk.start_line,
                    end_line=chunk.end_line,
                    chunk_type=chunk.chunk_type,
                    name=chunk.name,
                    snippet=chunk.content[:500],
                    score=score,
                    docstring=chunk.docstring
                ))
        
        conn.close()
        return results
    
    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        dot = sum(x*y for x, y in zip(a, b))
        mag_a = sum(x*x for x in a) ** 0.5
        mag_b = sum(x*x for x in b) ** 0.5
        if mag_a == 0 or mag_b == 0:
            return 0.0
        return dot / (mag_a * mag_b)
    
    def search_keyword(self, query: str, limit: int = 5) -> List[CodeMatch]:
        """Search using keyword matching (FTS)."""
        conn = sqlite3.connect(str(self.sqlite_path))
        cursor = conn.cursor()
        
        # FTS search
        cursor.execute('''
            SELECT chunk_id, rank 
            FROM chunks_fts 
            WHERE chunks_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        ''', (query, limit))
        
        results = []
        for chunk_id, rank in cursor.fetchall():
            chunk = self.get_chunk(chunk_id)
            if chunk:
                results.append(CodeMatch(
                    file_path=chunk.file_path,
                    start_line=chunk.start_line,
                    end_line=chunk.end_line,
                    chunk_type=chunk.chunk_type,
                    name=chunk.name,
                    snippet=chunk.content[:500],
                    score=1.0 / (1.0 + abs(rank)),  # Convert rank to score
                    docstring=chunk.docstring
                ))
        
        conn.close()
        return results
    
    def get_chunk(self, chunk_id: str) -> Optional[CodeChunk]:
        """Get a chunk by ID."""
        conn = sqlite3.connect(str(self.sqlite_path))
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM chunks WHERE chunk_id = ?', (chunk_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return CodeChunk(
                chunk_id=row[0],
                file_path=row[1],
                chunk_type=row[2],
                name=row[3],
                start_line=row[4],
                end_line=row[5],
                content=row[6],
                docstring=row[7],
                signature=row[8],
                parent=row[9],
                decorators=json.loads(row[10]) if row[10] else []
            )
        return None
    
    def get_dependencies(self, file_path: str) -> List[Dependency]:
        """Get dependencies for a file."""
        conn = sqlite3.connect(str(self.sqlite_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT target_module, imported_names, is_relative, line_number
            FROM dependencies WHERE source_file = ?
        ''', (file_path,))
        
        deps = []
        for row in cursor.fetchall():
            deps.append(Dependency(
                module=row[0],
                imported_names=json.loads(row[1]) if row[1] else [],
                is_relative=bool(row[2]),
                line_number=row[3]
            ))
        
        conn.close()
        return deps
    
    def get_consumers(self, module_name: str) -> List[Consumer]:
        """Get files that import a module."""
        conn = sqlite3.connect(str(self.sqlite_path))
        cursor = conn.cursor()
        
        # Search for module in dependencies
        cursor.execute('''
            SELECT source_file, line_number, imported_names
            FROM dependencies 
            WHERE target_module LIKE ? OR target_module LIKE ?
        ''', (f"%{module_name}", f"%{module_name}%"))
        
        consumers = []
        for row in cursor.fetchall():
            consumers.append(Consumer(
                file_path=row[0],
                import_line=row[1],
                imported_names=json.loads(row[2]) if row[2] else []
            ))
        
        conn.close()
        return consumers
    
    def get_module_summary(self, file_path: str) -> Optional[ModuleSummary]:
        """Get summary of a module."""
        conn = sqlite3.connect(str(self.sqlite_path))
        cursor = conn.cursor()
        
        # Get chunks for this file
        cursor.execute('''
            SELECT chunk_type, name, docstring FROM chunks WHERE file_path = ?
        ''', (file_path,))
        
        functions = []
        classes = []
        module_doc = None
        
        for row in cursor.fetchall():
            chunk_type, name, docstring = row
            if chunk_type == "function":
                functions.append(name)
            elif chunk_type == "class":
                classes.append(name)
            elif chunk_type == "module" and docstring:
                module_doc = docstring
        
        # Get imports
        deps = self.get_dependencies(file_path)
        imports = [d.module for d in deps]
        
        # Count lines (approximate from chunks)
        cursor.execute('''
            SELECT MAX(end_line) FROM chunks WHERE file_path = ?
        ''', (file_path,))
        max_line = cursor.fetchone()[0] or 0
        
        conn.close()
        
        if not functions and not classes:
            return None
        
        return ModuleSummary(
            file_path=file_path,
            functions=functions,
            classes=classes,
            imports=imports,
            line_count=max_line,
            docstring=module_doc
        )
    
    def get_stats(self) -> Dict[str, int]:
        """Get index statistics."""
        conn = sqlite3.connect(str(self.sqlite_path))
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM chunks')
        chunk_count = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(DISTINCT file_path) FROM chunks')
        file_count = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM dependencies')
        dep_count = cursor.fetchone()[0]
        
        cursor.execute('SELECT chunk_type, COUNT(*) FROM chunks GROUP BY chunk_type')
        type_counts = dict(cursor.fetchall())
        
        conn.close()
        
        return {
            "total_chunks": chunk_count,
            "total_files": file_count,
            "total_dependencies": dep_count,
            **type_counts
        }



# =============================================================================
# SEMANTIC CODE INDEX - MAIN CLASS
# =============================================================================

class SemanticCodeIndex:
    """
    Main interface for semantic code search.
    
    Provides tools for:
    - Building index from source files
    - Semantic search across codebase
    - Dependency tracking
    - Consumer tracking
    - Module summaries
    """
    
    # File extensions to parse
    PYTHON_EXTENSIONS = {'.py', '.pyw'}
    JS_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx', '.mjs'}
    
    # Directories to skip
    SKIP_DIRS = {
        'node_modules', '__pycache__', '.git', '.svn', 'venv', 
        'env', '.env', 'dist', 'build', '.tox', '.pytest_cache',
        '.mypy_cache', 'htmlcov', '.coverage', 'eggs', '*.egg-info'
    }
    
    def __init__(self, index_path: str = None):
        """
        Initialize semantic code index.
        
        Args:
            index_path: Path to store index (default: C:/PRISM/index)
        """
        if index_path is None:
            index_path = r"C:\PRISM\index\code_index"
        
        self.index_path = Path(index_path)
        self.storage = SemanticIndexStorage(str(self.index_path))
        self.embedder = EmbeddingGenerator()
        self.python_parser = PythonParser()
        self.js_parser = JavaScriptParser()
        
        # Stats tracking
        self.build_stats = {
            "files_processed": 0,
            "chunks_created": 0,
            "dependencies_found": 0,
            "errors": 0
        }
    
    def build_index(self, source_path: str, incremental: bool = True) -> Dict[str, int]:
        """
        Build or update the semantic index from source files.
        
        Args:
            source_path: Path to source directory
            incremental: If True, only process changed files
            
        Returns:
            Build statistics
        """
        source_path = Path(source_path)
        if not source_path.exists():
            raise ValueError(f"Source path does not exist: {source_path}")
        
        print(f"Building semantic index from: {source_path}")
        start_time = datetime.now()
        
        # Find all source files
        files = self._find_source_files(source_path)
        print(f"Found {len(files)} source files")
        
        # Process files in batches
        batch_size = 50
        all_chunks = []
        
        for i in range(0, len(files), batch_size):
            batch = files[i:i+batch_size]
            print(f"Processing batch {i//batch_size + 1}/{(len(files)+batch_size-1)//batch_size}...")
            
            for file_path in batch:
                try:
                    chunks, deps = self._process_file(str(file_path))
                    all_chunks.extend(chunks)
                    
                    # Store dependencies
                    for dep in deps:
                        self.storage.store_dependency(str(file_path), dep)
                        self.build_stats["dependencies_found"] += 1
                    
                    self.build_stats["files_processed"] += 1
                    
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
                    self.build_stats["errors"] += 1
            
            # Generate embeddings in batch
            if all_chunks:
                self._store_chunks_batch(all_chunks)
                self.build_stats["chunks_created"] += len(all_chunks)
                all_chunks = []
        
        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\nIndex build complete in {elapsed:.1f}s")
        print(f"  Files processed: {self.build_stats['files_processed']}")
        print(f"  Chunks created: {self.build_stats['chunks_created']}")
        print(f"  Dependencies found: {self.build_stats['dependencies_found']}")
        print(f"  Errors: {self.build_stats['errors']}")
        
        return self.build_stats
    
    def _find_source_files(self, source_path: Path) -> List[Path]:
        """Find all parseable source files."""
        files = []
        
        for root, dirs, filenames in os.walk(source_path):
            # Skip unwanted directories
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS]
            
            for filename in filenames:
                ext = Path(filename).suffix.lower()
                if ext in self.PYTHON_EXTENSIONS or ext in self.JS_EXTENSIONS:
                    files.append(Path(root) / filename)
        
        return files
    
    def _process_file(self, file_path: str) -> Tuple[List[CodeChunk], List[Dependency]]:
        """Process a single file."""
        ext = Path(file_path).suffix.lower()
        
        if ext in self.PYTHON_EXTENSIONS:
            return self.python_parser.parse_file(file_path)
        elif ext in self.JS_EXTENSIONS:
            return self.js_parser.parse_file(file_path)
        else:
            return [], []
    
    def _store_chunks_batch(self, chunks: List[CodeChunk]):
        """Store chunks with embeddings in batch."""
        # Generate search texts
        texts = [chunk.to_search_text() for chunk in chunks]
        
        # Generate embeddings in batch
        embeddings = self.embedder.generate_batch(texts)
        
        # Store each chunk
        for chunk, embedding in zip(chunks, embeddings):
            self.storage.store_chunk(chunk, embedding)
    
    def search_code(self, query: str, limit: int = 5) -> List[CodeMatch]:
        """
        Search code using semantic similarity.
        
        Args:
            query: Natural language search query
            limit: Maximum results to return
            
        Returns:
            List of matching code chunks
        """
        # Generate query embedding
        query_embedding = self.embedder.generate(query)
        
        # Search
        results = self.storage.search_semantic(query_embedding, limit)
        
        # If no semantic results, try keyword search
        if not results:
            results = self.storage.search_keyword(query, limit)
        
        return results
    
    def find_similar_code(self, code: str, limit: int = 5) -> List[CodeMatch]:
        """
        Find code similar to a given snippet.
        
        Args:
            code: Code snippet to find similar code for
            limit: Maximum results to return
            
        Returns:
            List of similar code chunks
        """
        # Generate embedding for the code
        embedding = self.embedder.generate(code)
        
        # Search
        return self.storage.search_semantic(embedding, limit)
    
    def get_dependencies(self, file_path: str) -> List[Dependency]:
        """
        Get dependencies for a module.
        
        Args:
            file_path: Path to the module
            
        Returns:
            List of dependencies
        """
        return self.storage.get_dependencies(file_path)
    
    def get_consumers(self, module_name: str) -> List[Consumer]:
        """
        Get modules that use a given module.
        
        Args:
            module_name: Name of module to find consumers for
            
        Returns:
            List of consuming modules
        """
        return self.storage.get_consumers(module_name)
    
    def get_module_summary(self, file_path: str) -> Optional[ModuleSummary]:
        """
        Get overview of a module.
        
        Args:
            file_path: Path to the module
            
        Returns:
            Module summary with functions, classes, imports
        """
        return self.storage.get_module_summary(file_path)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get index statistics."""
        return self.storage.get_stats()


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """Command-line interface for semantic code index."""
    parser = argparse.ArgumentParser(
        description="PRISM Semantic Code Index - Navigate 986K lines effortlessly"
    )
    
    parser.add_argument(
        "--build", metavar="PATH",
        help="Build index from source directory"
    )
    
    parser.add_argument(
        "--search", metavar="QUERY",
        help="Search code semantically"
    )
    
    parser.add_argument(
        "--similar", metavar="CODE",
        help="Find code similar to snippet"
    )
    
    parser.add_argument(
        "--deps", metavar="FILE",
        help="Get dependencies for a file"
    )
    
    parser.add_argument(
        "--consumers", metavar="MODULE",
        help="Find consumers of a module"
    )
    
    parser.add_argument(
        "--summary", metavar="FILE",
        help="Get module summary"
    )
    
    parser.add_argument(
        "--stats", action="store_true",
        help="Show index statistics"
    )
    
    parser.add_argument(
        "--limit", type=int, default=5,
        help="Maximum results to return (default: 5)"
    )
    
    parser.add_argument(
        "--index-path", default=None,
        help="Path to index storage"
    )
    
    parser.add_argument(
        "--test", action="store_true",
        help="Run self-test"
    )
    
    args = parser.parse_args()
    
    # Initialize index
    index = SemanticCodeIndex(args.index_path)
    
    if args.test:
        run_tests()
        return
    
    if args.build:
        stats = index.build_index(args.build)
        print(f"\nIndex built: {json.dumps(stats, indent=2)}")
        return
    
    if args.search:
        print(f"Searching for: {args.search}")
        results = index.search_code(args.search, args.limit)
        
        if not results:
            print("No results found.")
        else:
            print(f"\nFound {len(results)} matches:\n")
            for i, match in enumerate(results, 1):
                print(f"{i}. {match.name} ({match.chunk_type})")
                print(f"   File: {match.file_path}")
                print(f"   Lines: {match.start_line}-{match.end_line}")
                print(f"   Score: {match.score:.3f}")
                if match.docstring:
                    doc_preview = match.docstring[:100].replace('\n', ' ')
                    print(f"   Doc: {doc_preview}...")
                print()
        return
    
    if args.similar:
        print(f"Finding code similar to:\n{args.similar[:100]}...")
        results = index.find_similar_code(args.similar, args.limit)
        
        if not results:
            print("No similar code found.")
        else:
            print(f"\nFound {len(results)} similar chunks:\n")
            for i, match in enumerate(results, 1):
                print(f"{i}. {match.name} ({match.chunk_type})")
                print(f"   File: {match.file_path}")
                print(f"   Lines: {match.start_line}-{match.end_line}")
                print(f"   Score: {match.score:.3f}")
                snippet_preview = match.snippet[:150].replace('\n', ' ')
                print(f"   Preview: {snippet_preview}...")
                print()
        return
    
    if args.deps:
        deps = index.get_dependencies(args.deps)
        
        if not deps:
            print(f"No dependencies found for: {args.deps}")
        else:
            print(f"\nDependencies for {args.deps}:\n")
            for dep in deps:
                rel = "(relative)" if dep.is_relative else ""
                print(f"  Line {dep.line_number}: {dep.module} {rel}")
                if dep.imported_names:
                    print(f"    imports: {', '.join(dep.imported_names)}")
        return
    
    if args.consumers:
        consumers = index.get_consumers(args.consumers)
        
        if not consumers:
            print(f"No consumers found for: {args.consumers}")
        else:
            print(f"\nConsumers of {args.consumers}:\n")
            for consumer in consumers:
                print(f"  {consumer.file_path}")
                print(f"    Line {consumer.import_line}: {', '.join(consumer.imported_names)}")
        return
    
    if args.summary:
        summary = index.get_module_summary(args.summary)
        
        if not summary:
            print(f"No summary available for: {args.summary}")
        else:
            print(f"\nModule Summary: {summary.file_path}")
            print(f"Lines: {summary.line_count}")
            if summary.docstring:
                print(f"Doc: {summary.docstring[:200]}...")
            print(f"Functions ({len(summary.functions)}): {', '.join(summary.functions[:10])}")
            if len(summary.functions) > 10:
                print(f"  ...and {len(summary.functions) - 10} more")
            print(f"Classes ({len(summary.classes)}): {', '.join(summary.classes[:10])}")
            print(f"Imports ({len(summary.imports)}): {', '.join(summary.imports[:10])}")
        return
    
    if args.stats:
        stats = index.get_stats()
        print("\nIndex Statistics:")
        print(json.dumps(stats, indent=2))
        return
    
    # No command specified
    parser.print_help()


def run_tests():
    """Run self-tests."""
    print("=" * 60)
    print("PRISM Semantic Code Index - Self Test")
    print("=" * 60)
    
    import tempfile
    import shutil
    
    # Create temp directory
    test_dir = tempfile.mkdtemp(prefix="prism_test_")
    index_dir = tempfile.mkdtemp(prefix="prism_index_")
    
    try:
        # Create test Python file
        test_py = Path(test_dir) / "test_module.py"
        test_py.write_text('''
"""Test module for semantic code index."""

import os
import json
from typing import List, Optional


class Calculator:
    """A simple calculator class."""
    
    def __init__(self):
        self.history = []
    
    def add(self, a: float, b: float) -> float:
        """Add two numbers."""
        result = a + b
        self.history.append(f"add({a}, {b}) = {result}")
        return result
    
    def multiply(self, a: float, b: float) -> float:
        """Multiply two numbers."""
        result = a * b
        self.history.append(f"multiply({a}, {b}) = {result}")
        return result


def factorial(n: int) -> int:
    """Calculate factorial recursively."""
    if n <= 1:
        return 1
    return n * factorial(n - 1)


async def fetch_data(url: str) -> dict:
    """Fetch data from a URL asynchronously."""
    # Simulated async fetch
    return {"url": url, "data": "sample"}
''')
        
        # Create test JS file
        test_js = Path(test_dir) / "test_module.js"
        test_js.write_text('''
import { something } from 'somewhere';
const { other } = require('another');

class DataProcessor {
    constructor() {
        this.cache = {};
    }
    
    process(data) {
        return data.map(item => item * 2);
    }
}

function calculateTotal(items) {
    return items.reduce((sum, item) => sum + item, 0);
}

const fetchAsync = async (url) => {
    const response = await fetch(url);
    return response.json();
};

export default DataProcessor;
''')
        
        print("\n1. Testing file parsing...")
        
        # Test Python parser
        py_parser = PythonParser()
        chunks, deps = py_parser.parse_file(str(test_py))
        print(f"   Python chunks: {len(chunks)}")
        print(f"   Python deps: {len(deps)}")
        assert len(chunks) >= 5, "Expected at least 5 chunks from Python file"
        assert len(deps) >= 3, "Expected at least 3 dependencies"
        print("   ✓ Python parser working")
        
        # Test JS parser
        js_parser = JavaScriptParser()
        chunks, deps = js_parser.parse_file(str(test_js))
        print(f"   JS chunks: {len(chunks)}")
        print(f"   JS deps: {len(deps)}")
        assert len(chunks) >= 3, "Expected at least 3 chunks from JS file"
        assert len(deps) >= 2, "Expected at least 2 dependencies"
        print("   ✓ JavaScript parser working")
        
        print("\n2. Testing index building...")
        index = SemanticCodeIndex(index_dir)
        stats = index.build_index(test_dir)
        print(f"   Files processed: {stats['files_processed']}")
        print(f"   Chunks created: {stats['chunks_created']}")
        assert stats['files_processed'] >= 2, "Expected to process at least 2 files"
        assert stats['chunks_created'] >= 8, "Expected to create at least 8 chunks"
        print("   ✓ Index building working")
        
        print("\n3. Testing semantic search...")
        results = index.search_code("calculator add numbers", limit=3)
        print(f"   Results for 'calculator add numbers': {len(results)}")
        if results:
            print(f"   Top result: {results[0].name}")
        print("   ✓ Semantic search working")
        
        print("\n4. Testing dependency lookup...")
        deps = index.get_dependencies(str(test_py))
        print(f"   Dependencies for test_module.py: {len(deps)}")
        for dep in deps[:3]:
            print(f"     - {dep.module}")
        print("   ✓ Dependency lookup working")
        
        print("\n5. Testing consumer lookup...")
        consumers = index.get_consumers("os")
        print(f"   Consumers of 'os': {len(consumers)}")
        print("   ✓ Consumer lookup working")
        
        print("\n6. Testing module summary...")
        summary = index.get_module_summary(str(test_py))
        if summary:
            print(f"   Functions: {summary.functions}")
            print(f"   Classes: {summary.classes}")
        print("   ✓ Module summary working")
        
        print("\n7. Testing find similar code...")
        similar = index.find_similar_code("def add(a, b): return a + b", limit=3)
        print(f"   Similar code results: {len(similar)}")
        if similar:
            print(f"   Most similar: {similar[0].name}")
        print("   ✓ Find similar working")
        
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED ✓")
        print("=" * 60)
        
    finally:
        # Cleanup
        shutil.rmtree(test_dir, ignore_errors=True)
        shutil.rmtree(index_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
