const PRISM_SEARCH = {
    // Fuzzy search with Levenshtein distance
    fuzzyMatch(query, text, threshold = 0.6) {
        query = query.toLowerCase();
        text = text.toLowerCase();
        
        if (text.includes(query)) return { match: true, score: 1 };
        
        // Levenshtein distance
        const distance = this.levenshtein(query, text);
        const maxLen = Math.max(query.length, text.length);
        const similarity = 1 - distance / maxLen;
        
        return { match: similarity >= threshold, score: similarity };
    },
    
    levenshtein(a, b) {
        const matrix = Array(b.length + 1).fill().map((_, i) => 
            Array(a.length + 1).fill().map((_, j) => i === 0 ? j : j === 0 ? i : 0)
        );
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                matrix[i][j] = b[i-1] === a[j-1] ?
                    matrix[i-1][j-1] :
                    Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
            }
        }
        
        return matrix[b.length][a.length];
    },
    
    // Search array of objects
    search(items, query, keys, options = {}) {
        const { fuzzy = false, threshold = 0.6, limit = 0 } = options;
        
        if (!query.trim()) return items;
        
        const results = items.map(item => {
            let bestScore = 0;
            let matched = false;
            
            for (const key of keys) {
                const value = String(this.getNestedValue(item, key) || '');
                
                if (fuzzy) {
                    const { match, score } = this.fuzzyMatch(query, value, threshold);
                    if (match && score > bestScore) {
                        bestScore = score;
                        matched = true;
                    }
                } else {
                    if (value.toLowerCase().includes(query.toLowerCase())) {
                        matched = true;
                        bestScore = 1;
                    }
                }
            }
            
            return { item, score: bestScore, matched };
        })
        .filter(r => r.matched)
        .sort((a, b) => b.score - a.score)
        .map(r => r.item);
        
        return limit > 0 ? results.slice(0, limit) : results;
    },
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((o, k) => o?.[k], obj);
    },
    
    // Filter by multiple criteria
    filter(items, filters) {
        return items.filter(item => {
            for (const [key, filter] of Object.entries(filters)) {
                const value = this.getNestedValue(item, key);
                
                if (typeof filter === 'function') {
                    if (!filter(value)) return false;
                } else if (Array.isArray(filter)) {
                    if (!filter.includes(value)) return false;
                } else if (typeof filter === 'object') {
                    if (filter.min !== undefined && value < filter.min) return false;
                    if (filter.max !== undefined && value > filter.max) return false;
                    if (filter.eq !== undefined && value !== filter.eq) return false;
                    if (filter.ne !== undefined && value === filter.ne) return false;
                    if (filter.contains !== undefined && !String(value).includes(filter.contains)) return false;
                } else {
                    if (value !== filter) return false;
                }
            }
            return true;
        });
    },
    
    // Multi-key sort
    sort(items, sortBy) {
        return [...items].sort((a, b) => {
            for (const { key, order = 'asc' } of sortBy) {
                const aVal = this.getNestedValue(a, key);
                const bVal = this.getNestedValue(b, key);
                
                let comparison = 0;
                if (aVal < bVal) comparison = -1;
                if (aVal > bVal) comparison = 1;
                
                if (comparison !== 0) {
                    return order === 'desc' ? -comparison : comparison;
                }
            }
            return 0;
        });
    },
    
    // Highlight matches
    highlight(text, query, className = 'highlight') {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\]/g, '\$&')})`, 'gi');
        return text.replace(regex, `<mark class="${className}">$1</mark>`);
    },
    
    // Create search index for fast lookup
    createIndex(items, keys) {
        const index = new Map();
        
        items.forEach((item, idx) => {
            keys.forEach(key => {
                const value = String(this.getNestedValue(item, key) || '').toLowerCase();
                const words = value.split(/\s+/);
                
                words.forEach(word => {
                    for (let i = 1; i <= word.length; i++) {
                        const prefix = word.slice(0, i);
                        if (!index.has(prefix)) index.set(prefix, new Set());
                        index.get(prefix).add(idx);
                    }
                });
            });
        });
        
        return {
            search: (query) => {
                const q = query.toLowerCase();
                const matches = index.get(q);
                return matches ? Array.from(matches).map(i => items[i]) : [];
            }
        };
    }
}