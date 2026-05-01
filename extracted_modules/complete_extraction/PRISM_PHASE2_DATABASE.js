const PRISM_PHASE2_DATABASE = {
    version: '8.47.000',
    phase: 'Phase 2: Database Systems',
    buildDate: '2026-01-12',
    sources: ['MIT 6.830', 'MIT 6.046J', 'CMU 15-445', 'MIT 6.814'],

    // ███████╗███████╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗     ██╗
    // ██╔════╝██╔════╝██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║    ███║
    // ███████╗█████╗  ██║        ██║   ██║██║   ██║██╔██╗ ██║    ╚██║
    // ╚════██║██╔══╝  ██║        ██║   ██║██║   ██║██║╚██╗██║     ██║
    // ███████║███████╗╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║     ██║
    // ╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝     ╚═╝
    // B+ TREE INDEX - MIT 6.046J / 6.830
    // MIT 6.046J Analysis:
    //   - Height h = O(log_b n) where b = order (fanout)
    //   - With b=128, n=10^6: h ≈ 3 (only 3 disk accesses!)
    //   - Search: O(log n), Insert: O(log n), Delete: O(log n)
    //   - Range query: O(log n + k) where k = result size
    // Key Design Decisions (MIT 6.830):
    //   - All data in leaves (better for range scans)
    //   - Leaves doubly-linked (bidirectional traversal)
    //   - High fanout minimizes height
    //   - Bulk loading for initial data (O(n) vs O(n log n))

    BPlusTree: class {
        constructor(order = 128) {
            this.order = order;  // Max children per node
            this.root = this._createNode(true);
            this.size = 0;
            this.height = 1;
            this.leafHead = this.root;
            this.leafTail = this.root;

            // Statistics for query optimizer (MIT 6.830 cost model)
            this.stats = {
                searches: 0,
                inserts: 0,
                deletes: 0,
                splits: 0,
                merges: 0,
                rangeScans: 0,
                totalSearchDepth: 0,
                histogram: new Map()  // For cardinality estimation
            };
        }
        _createNode(isLeaf) {
            return {
                isLeaf,
                keys: [],
                values: [],  // Children (internal) or data (leaf)
                parent: null,
                next: null,
                prev: null
            };
        }
        // Binary search - O(log b) within node
        _findKeyIndex(node, key) {
            let lo = 0, hi = node.keys.length;
            while (lo < hi) {
                const mid = (lo + hi) >>> 1;
                if (node.keys[mid] < key) lo = mid + 1;
                else hi = mid;
            }
            return lo;
        }
        // Navigate to leaf - O(log_b n)
        _findLeaf(key) {
            let node = this.root;
            let depth = 0;

            while (!node.isLeaf) {
                depth++;
                const idx = this._findKeyIndex(node, key);
                node = node.values[idx < node.keys.length && key >= node.keys[idx] ? idx + 1 : idx];
            }
            this.stats.totalSearchDepth += depth;
            return node;
        }
        // SEARCH: O(log n)
        search(key) {
            this.stats.searches++;
            const leaf = this._findLeaf(key);
            const idx = this._findKeyIndex(leaf, key);

            if (idx < leaf.keys.length && leaf.keys[idx] === key) {
                return leaf.values[idx];
            }
            return null;
        }
        // RANGE SEARCH: O(log n + k) - Uses leaf chain
        rangeSearch(startKey, endKey, inclusive = true) {
            this.stats.rangeScans++;
            const results = [];
            let leaf = this._findLeaf(startKey);

            outer: while (leaf) {
                for (let i = 0; i < leaf.keys.length; i++) {
                    const key = leaf.keys[i];
                    if (inclusive ? key > endKey : key >= endKey) break outer;
                    if (inclusive ? key >= startKey : key > startKey) {
                        results.push({ key, value: leaf.values[i] });
                    }
                }
                leaf = leaf.next;
            }
            return results;
        }
        // INSERT: O(log n) amortized
        insert(key, value) {
            this.stats.inserts++;
            const leaf = this._findLeaf(key);
            const idx = this._findKeyIndex(leaf, key);

            // Update existing
            if (idx < leaf.keys.length && leaf.keys[idx] === key) {
                leaf.values[idx] = value;
                return false;
            }
            // Insert new
            leaf.keys.splice(idx, 0, key);
            leaf.values.splice(idx, 0, value);
            this.size++;

            // Update histogram for query optimizer
            const bucket = Math.floor(key / 100);
            this.stats.histogram.set(bucket, (this.stats.histogram.get(bucket) || 0) + 1);

            // Split if overflow
            if (leaf.keys.length >= this.order) {
                this._splitLeaf(leaf);
            }
            return true;
        }
        _splitLeaf(leaf) {
            this.stats.splits++;
            const mid = Math.ceil(leaf.keys.length / 2);
            const newLeaf = this._createNode(true);

            // Move upper half
            newLeaf.keys = leaf.keys.splice(mid);
            newLeaf.values = leaf.values.splice(mid);

            // Update chain
            newLeaf.next = leaf.next;
            newLeaf.prev = leaf;
            if (leaf.next) leaf.next.prev = newLeaf;
            else this.leafTail = newLeaf;
            leaf.next = newLeaf;

            this._insertIntoParent(leaf, newLeaf.keys[0], newLeaf);
        }
        _insertIntoParent(left, key, right) {
            if (!left.parent) {
                // New root
                const newRoot = this._createNode(false);
                newRoot.keys = [key];
                newRoot.values = [left, right];
                left.parent = right.parent = newRoot;
                this.root = newRoot;
                this.height++;
                return;
            }
            const parent = left.parent;
            right.parent = parent;
            const idx = parent.values.indexOf(left);
            parent.keys.splice(idx, 0, key);
            parent.values.splice(idx + 1, 0, right);

            if (parent.keys.length >= this.order) {
                this._splitInternal(parent);
            }
        }
        _splitInternal(node) {
            this.stats.splits++;
            const mid = Math.floor(node.keys.length / 2);
            const pushUpKey = node.keys[mid];
            const newNode = this._createNode(false);

            newNode.keys = node.keys.splice(mid + 1);
            newNode.values = node.values.splice(mid + 1);
            node.keys.pop();

            for (const child of newNode.values) {
                child.parent = newNode;
            }
            this._insertIntoParent(node, pushUpKey, newNode);
        }
        // DELETE: O(log n)
        delete(key) {
            this.stats.deletes++;
            const leaf = this._findLeaf(key);
            const idx = this._findKeyIndex(leaf, key);

            if (idx >= leaf.keys.length || leaf.keys[idx] !== key) {
                return false;
            }
            leaf.keys.splice(idx, 1);
            leaf.values.splice(idx, 1);
            this.size--;

            // Update histogram
            const bucket = Math.floor(key / 100);
            const count = this.stats.histogram.get(bucket);
            if (count > 1) this.stats.histogram.set(bucket, count - 1);
            else this.stats.histogram.delete(bucket);

            return true;
        }
        // BULK LOAD: O(n) for sorted data - MIT 6.830 optimization
        bulkLoad(sortedData) {
            if (!sortedData.length) return;

            // Create leaf level
            const leaves = [];
            let leaf = this._createNode(true);
            leaves.push(leaf);

            for (const { key, value } of sortedData) {
                if (leaf.keys.length >= this.order - 1) {
                    const newLeaf = this._createNode(true);
                    leaf.next = newLeaf;
                    newLeaf.prev = leaf;
                    leaves.push(newLeaf);
                    leaf = newLeaf;
                }
                leaf.keys.push(key);
                leaf.values.push(value);
                this.size++;

                // Update histogram
                const bucket = Math.floor(key / 100);
                this.stats.histogram.set(bucket, (this.stats.histogram.get(bucket) || 0) + 1);
            }
            this.leafHead = leaves[0];
            this.leafTail = leaves[leaves.length - 1];

            // Build internal levels bottom-up
            let level = leaves;
            while (level.length > 1) {
                const parents = [];
                let parent = this._createNode(false);
                parents.push(parent);

                for (let i = 0; i < level.length; i++) {
                    if (parent.values.length >= this.order) {
                        parent = this._createNode(false);
                        parents.push(parent);
                    }
                    level[i].parent = parent;
                    parent.values.push(level[i]);
                    if (parent.values.length > 1) {
                        parent.keys.push(level[i].keys[0]);
                    }
                }
                level = parents;
                this.height++;
            }
            this.root = level[0];
        }
        // Sequential scan iterator
        *scan() {
            let leaf = this.leafHead;
            while (leaf) {
                for (let i = 0; i < leaf.keys.length; i++) {
                    yield { key: leaf.keys[i], value: leaf.values[i] };
                }
                leaf = leaf.next;
            }
        }
        // Statistics for query optimizer
        getStatistics() {
            return {
                size: this.size,
                height: this.height,
                order: this.order,
                avgSearchDepth: this.stats.searches ?
                    this.stats.totalSearchDepth / this.stats.searches : 0,
                estimatedFanout: Math.pow(this.size, 1 / this.height),
                ...this.stats
            };
        }
        // Cardinality estimation (MIT 6.830)
        estimateCardinality(startKey, endKey) {
            let count = 0;
            const startBucket = Math.floor(startKey / 100);
            const endBucket = Math.floor(endKey / 100);

            for (let b = startBucket; b <= endBucket; b++) {
                count += this.stats.histogram.get(b) || 0;
            }
            return count;
        }
    },
    // ███████╗███████╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗    ██████╗
    // ██╔════╝██╔════╝██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║    ╚════██╗
    // ███████╗█████╗  ██║        ██║   ██║██║   ██║██╔██╗ ██║     █████╔╝
    // ╚════██║██╔══╝  ██║        ██║   ██║██║   ██║██║╚██╗██║    ██╔═══╝
    // ███████║███████╗╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║    ███████╗
    // ╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝    ╚══════╝
    // HASH INDEX - Extendible Hashing (MIT 6.830)

    HashIndex: class {
        constructor(bucketSize = 64) {
            this.bucketSize = bucketSize;
            this.globalDepth = 1;
            this.size = 0;
            this.directory = [
                { localDepth: 1, entries: new Map() },
                { localDepth: 1, entries: new Map() }
            ];
            this.stats = { lookups: 0, inserts: 0, splits: 0, doublings: 0 };
        }
        // MurmurHash3-inspired hash function
        _hash(key) {
            const str = String(key);
            let h = 0x811c9dc5;
            for (let i = 0; i < str.length; i++) {
                h ^= str.charCodeAt(i);
                h = Math.imul(h, 0x01000193);
            }
            h ^= h >>> 16;
            h = Math.imul(h, 0x85ebca6b);
            h ^= h >>> 13;
            return h >>> 0;
        }
        _getBucketIndex(key) {
            return this._hash(key) & ((1 << this.globalDepth) - 1);
        }
        search(key) {
            this.stats.lookups++;
            return this.directory[this._getBucketIndex(key)].entries.get(key) ?? null;
        }
        insert(key, value) {
            this.stats.inserts++;
            const idx = this._getBucketIndex(key);
            const bucket = this.directory[idx];

            if (bucket.entries.has(key)) {
                bucket.entries.set(key, value);
                return false;
            }
            if (bucket.entries.size >= this.bucketSize) {
                this._split(idx);
                return this.insert(key, value);
            }
            bucket.entries.set(key, value);
            this.size++;
            return true;
        }
        _split(bucketIdx) {
            this.stats.splits++;
            const bucket = this.directory[bucketIdx];

            if (bucket.localDepth === this.globalDepth) {
                this.stats.doublings++;
                this.directory = [...this.directory, ...this.directory];
                this.globalDepth++;
            }
            const newBucket = { localDepth: bucket.localDepth + 1, entries: new Map() };
            bucket.localDepth++;

            const splitBit = 1 << (bucket.localDepth - 1);
            const toMove = [];

            for (const [k, v] of bucket.entries) {
                if (this._hash(k) & splitBit) toMove.push([k, v]);
            }
            for (const [k, v] of toMove) {
                bucket.entries.delete(k);
                newBucket.entries.set(k, v);
            }
            for (let i = 0; i < this.directory.length; i++) {
                if (this.directory[i] === bucket && (i & splitBit)) {
                    this.directory[i] = newBucket;
                }
            }
        }
        delete(key) {
            const bucket = this.directory[this._getBucketIndex(key)];
            if (bucket.entries.has(key)) {
                bucket.entries.delete(key);
                this.size--;
                return true;
            }
            return false;
        }
        getStatistics() {
            const uniqueBuckets = new Set(this.directory).size;
            return {
                size: this.size,
                globalDepth: this.globalDepth,
                directorySize: this.directory.length,
                uniqueBuckets,
                avgBucketLoad: this.size / uniqueBuckets,
                ...this.stats
            };
        }
    }
}