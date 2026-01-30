# Data Structures Quick Reference

## Selection Guide

```
NEED TO...                          USE...                 COMPLEXITY
─────────────────────────────────────────────────────────────────────
Look up by ID/key                   HashMap/Object         O(1)
Keep items sorted                   BST / Sorted Array     O(log n) / O(n)
Find min/max quickly                Binary Heap            O(1) get, O(log n) pop
Check membership                    Set                    O(1)
Maintain insertion order            Array / LinkedList     O(1) append
Insert/delete in middle             LinkedList             O(1) if have ref
Range queries (1D)                  Segment Tree           O(log n)
Nearest neighbor (2D/3D)            KD-Tree / Spatial Hash O(log n) / O(1)
Find connected groups               Union-Find             O(α(n)) ≈ O(1)
Path finding                        Graph + BFS/Dijkstra   O(V+E) / O(E log V)
Prefix/autocomplete                 Trie                   O(k) k=length
LRU Cache                           HashMap + DoublyLinked O(1)
```

## PRISM-Specific Recommendations

### For Material/Tool/Machine Lookups
```javascript
// Primary: HashMap for O(1) by ID
const materialsById = new Map();
materials.forEach(m => materialsById.set(m.id, m));

// Secondary: Index by common query fields
const materialsByType = new Map();  // 'steel' -> [materials...]
const materialsByHardness = [];     // Sorted for range queries
```

### For Toolpath Points
```javascript
// Array for sequential access (most common)
const points = [];  // [{x, y, z, f, s}, ...]

// Spatial hash for collision queries
const spatialIndex = new SpatialHash(cellSize);
points.forEach((p, i) => spatialIndex.insert(p, i));
```

### For Machine Kinematics
```javascript
// Graph for axis relationships
const kinematicChain = {
    'base': ['X'],
    'X': ['Y'],
    'Y': ['Z'],
    'Z': ['A'],
    'A': ['C'],
    'C': ['spindle']
};
```

### For Job Scheduling
```javascript
// Priority queue (heap) for job ordering
class JobQueue {
    constructor() {
        this.heap = [];  // Min-heap by due date
    }
    insert(job) { /* heap insert O(log n) */ }
    getNext() { /* heap extract-min O(log n) */ }
    peek() { return this.heap[0]; }  // O(1)
}
```

### For Feature Recognition
```javascript
// Graph for face adjacency
const faceGraph = {
    'face1': ['face2', 'face3'],  // Adjacent faces
    'face2': ['face1', 'face4'],
    // ...
};

// Union-Find for grouping related features
const featureGroups = new UnionFind(numFaces);
```

---

## Implementation Templates

### HashMap with Default
```javascript
class DefaultMap extends Map {
    constructor(defaultFactory) {
        super();
        this.defaultFactory = defaultFactory;
    }
    get(key) {
        if (!this.has(key)) {
            this.set(key, this.defaultFactory());
        }
        return super.get(key);
    }
}

// Usage: Group items by category
const byCategory = new DefaultMap(() => []);
items.forEach(item => byCategory.get(item.category).push(item));
```

### LRU Cache
```javascript
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
    }
    
    get(key) {
        if (!this.cache.has(key)) return undefined;
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);  // Move to end
        return value;
    }
    
    set(key, value) {
        if (this.cache.has(key)) this.cache.delete(key);
        else if (this.cache.size >= this.capacity) {
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, value);
    }
}
```

### Binary Heap (Min)
```javascript
class MinHeap {
    constructor(compareFn = (a, b) => a - b) {
        this.data = [];
        this.compare = compareFn;
    }
    
    push(val) {
        this.data.push(val);
        this._bubbleUp(this.data.length - 1);
    }
    
    pop() {
        const min = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = last;
            this._bubbleDown(0);
        }
        return min;
    }
    
    _bubbleUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.compare(this.data[i], this.data[parent]) >= 0) break;
            [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
            i = parent;
        }
    }
    
    _bubbleDown(i) {
        const n = this.data.length;
        while (true) {
            const left = 2 * i + 1, right = 2 * i + 2;
            let smallest = i;
            if (left < n && this.compare(this.data[left], this.data[smallest]) < 0) smallest = left;
            if (right < n && this.compare(this.data[right], this.data[smallest]) < 0) smallest = right;
            if (smallest === i) break;
            [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
            i = smallest;
        }
    }
}
```

### Union-Find (Disjoint Set)
```javascript
class UnionFind {
    constructor(n) {
        this.parent = Array.from({length: n}, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }
    
    find(x) {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);  // Path compression
        }
        return this.parent[x];
    }
    
    union(x, y) {
        const px = this.find(x), py = this.find(y);
        if (px === py) return false;
        
        // Union by rank
        if (this.rank[px] < this.rank[py]) this.parent[px] = py;
        else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
        else { this.parent[py] = px; this.rank[px]++; }
        return true;
    }
    
    connected(x, y) { return this.find(x) === this.find(y); }
}
```

### Spatial Hash (3D)
```javascript
class SpatialHash3D {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }
    
    _key(x, y, z) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        const cz = Math.floor(z / this.cellSize);
        return `${cx},${cy},${cz}`;
    }
    
    insert(obj, x, y, z) {
        const key = this._key(x, y, z);
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push({obj, x, y, z});
    }
    
    queryNear(x, y, z, radius) {
        const results = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                    const key = this._key(
                        x + dx * this.cellSize,
                        y + dy * this.cellSize,
                        z + dz * this.cellSize
                    );
                    const cell = this.grid.get(key);
                    if (cell) {
                        for (const item of cell) {
                            const dist = Math.sqrt(
                                (item.x - x) ** 2 + 
                                (item.y - y) ** 2 + 
                                (item.z - z) ** 2
                            );
                            if (dist <= radius) results.push(item);
                        }
                    }
                }
            }
        }
        return results;
    }
}
```

---

## Complexity Cheat Sheet

| Operation | Array | LinkedList | HashMap | BST | Heap |
|-----------|-------|------------|---------|-----|------|
| Access by index | O(1) | O(n) | - | - | - |
| Search | O(n) | O(n) | O(1) | O(log n) | O(n) |
| Insert (end) | O(1)* | O(1) | O(1) | O(log n) | O(log n) |
| Insert (middle) | O(n) | O(1)** | - | O(log n) | - |
| Delete | O(n) | O(1)** | O(1) | O(log n) | O(log n) |
| Min/Max | O(n) | O(n) | O(n) | O(log n) | O(1) |

*Amortized  **If have reference to node
