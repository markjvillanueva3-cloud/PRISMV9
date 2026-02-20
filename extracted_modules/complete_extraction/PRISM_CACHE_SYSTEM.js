const PRISM_CACHE_SYSTEM = {
    // Create an LRU cache
    createLRU(capacity = 100) {
        return {
            capacity,
            cache: new Map(),
            
            get(key) {
                if (!this.cache.has(key)) {
                    return undefined;
                }
                
                // Move to end (most recently used)
                const value = this.cache.get(key);
                this.cache.delete(key);
                this.cache.set(key, value);
                
                return value;
            },
            
            set(key, value) {
                if (this.cache.has(key)) {
                    this.cache.delete(key);
                } else if (this.cache.size >= this.capacity) {
                    // Remove least recently used (first item)
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                
                this.cache.set(key, value);
            },
            
            has(key) {
                return this.cache.has(key);
            },
            
            delete(key) {
                return this.cache.delete(key);
            },
            
            clear() {
                this.cache.clear();
            },
            
            size() {
                return this.cache.size;
            }
        };
    },
    
    // Create a TTL cache
    createTTL(defaultTTL = 60000) {
        return {
            defaultTTL,
            cache: new Map(),
            timers: new Map(),
            
            get(key) {
                const entry = this.cache.get(key);
                if (!entry) return undefined;
                
                if (Date.now() > entry.expiry) {
                    this.delete(key);
                    return undefined;
                }
                
                return entry.value;
            },
            
            set(key, value, ttl = this.defaultTTL) {
                this.delete(key); // Clear existing timer
                
                const expiry = Date.now() + ttl;
                this.cache.set(key, { value, expiry });
                
                // Set expiry timer
                const timer = setTimeout(() => this.delete(key), ttl);
                this.timers.set(key, timer);
            },
            
            has(key) {
                const entry = this.cache.get(key);
                if (!entry) return false;
                
                if (Date.now() > entry.expiry) {
                    this.delete(key);
                    return false;
                }
                
                return true;
            },
            
            delete(key) {
                const timer = this.timers.get(key);
                if (timer) {
                    clearTimeout(timer);
                    this.timers.delete(key);
                }
                return this.cache.delete(key);
            },
            
            clear() {
                for (const timer of this.timers.values()) {
                    clearTimeout(timer);
                }
                this.timers.clear();
                this.cache.clear();
            },
            
            // Refresh TTL
            touch(key, ttl = this.defaultTTL) {
                const entry = this.cache.get(key);
                if (entry) {
                    this.set(key, entry.value, ttl);
                }
            },
            
            size() {
                return this.cache.size;
            }
        };
    },
    
    // Create a write-through cache
    createWriteThrough(cache, storage) {
        return {
            cache,
            storage,
            
            async get(key) {
                // Try cache first
                let value = this.cache.get(key);
                
                if (value === undefined) {
                    // Load from storage
                    value = await this.storage.get(key);
                    if (value !== undefined) {
                        this.cache.set(key, value);
                    }
                }
                
                return value;
            },
            
            async set(key, value) {
                // Write to both
                this.cache.set(key, value);
                await this.storage.set(key, value);
            },
            
            async delete(key) {
                this.cache.delete(key);
                await this.storage.delete(key);
            },
            
            async clear() {
                this.cache.clear();
                await this.storage.clear();
            }
        };
    },
    
    // Create a memoization helper
    memoize(fn, options = {}) {
        const { 
            maxSize = 100, 
            ttl = 0, 
            keyFn = (...args) => JSON.stringify(args) 
        } = options;
        
        const cache = ttl > 0 
            ? this.createTTL(ttl) 
            : this.createLRU(maxSize);
        
        const memoized = function(...args) {
            const key = keyFn(...args);
            
            if (cache.has(key)) {
                return cache.get(key);
            }
            
            const result = fn.apply(this, args);
            
            if (result instanceof Promise) {
                return result.then(value => {
                    cache.set(key, value);
                    return value;
                });
            }
            
            cache.set(key, result);
            return result;
        };
        
        memoized.cache = cache;
        memoized.clear = () => cache.clear();
        
        return memoized;
    },
    
    // Multi-level cache
    createMultiLevel(...caches) {
        return {
            caches,
            
            async get(key) {
                for (let i = 0; i < this.caches.length; i++) {
                    const value = await this.caches[i].get(key);
                    
                    if (value !== undefined) {
                        // Populate higher-level caches
                        for (let j = 0; j < i; j++) {
                            await this.caches[j].set(key, value);
                        }
                        return value;
                    }
                }
                
                return undefined;
            },
            
            async set(key, value) {
                for (const cache of this.caches) {
                    await cache.set(key, value);
                }
            },
            
            async delete(key) {
                for (const cache of this.caches) {
                    await cache.delete(key);
                }
            },
            
            async clear() {
                for (const cache of this.caches) {
                    await cache.clear();
                }
            }
        };
    },
    
    // Cache with invalidation tags
    createTaggedCache(baseCache) {
        return {
            cache: baseCache || this.createLRU(1000),
            tags: new Map(), // tag -> Set of keys
            keyTags: new Map(), // key -> Set of tags
            
            get(key) {
                return this.cache.get(key);
            },
            
            set(key, value, tags = []) {
                this.cache.set(key, value);
                
                // Store tag associations
                this.keyTags.set(key, new Set(tags));
                
                for (const tag of tags) {
                    if (!this.tags.has(tag)) {
                        this.tags.set(tag, new Set());
                    }
                    this.tags.get(tag).add(key);
                }
            },
            
            delete(key) {
                // Remove tag associations
                const tags = this.keyTags.get(key);
                if (tags) {
                    for (const tag of tags) {
                        const tagKeys = this.tags.get(tag);
                        if (tagKeys) {
                            tagKeys.delete(key);
                        }
                    }
                    this.keyTags.delete(key);
                }
                
                return this.cache.delete(key);
            },
            
            // Invalidate all entries with a tag
            invalidateTag(tag) {
                const keys = this.tags.get(tag);
                if (!keys) return 0;
                
                let count = 0;
                for (const key of keys) {
                    this.delete(key);
                    count++;
                }
                
                this.tags.delete(tag);
                return count;
            },
            
            // Invalidate multiple tags
            invalidateTags(tags) {
                let count = 0;
                for (const tag of tags) {
                    count += this.invalidateTag(tag);
                }
                return count;
            },
            
            clear() {
                this.cache.clear();
                this.tags.clear();
                this.keyTags.clear();
            },
            
            getStats() {
                return {
                    entries: this.cache.size(),
                    tags: this.tags.size,
                    tagCounts: Object.fromEntries(
                        Array.from(this.tags.entries()).map(([tag, keys]) => [tag, keys.size])
                    )
                };
            }
        };
    }
}