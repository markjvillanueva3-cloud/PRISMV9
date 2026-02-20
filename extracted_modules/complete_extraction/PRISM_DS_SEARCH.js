const PRISM_DS_SEARCH = {
    // Knowledge base registry - add new KBs here for extensibility
    kbs: {
        data_structures: PRISM_DATA_STRUCTURES_KB,
        algorithms: PRISM_ALGORITHMS_KB,
        systems: PRISM_SYSTEMS_KB,
        manufacturing: PRISM_MFG_STRUCTURES_KB,
        ai_ml: PRISM_AI_STRUCTURES_KB
    },
    
    // Register new knowledge base (for future data integration)
    registerKB: function(name, kb) {
        this.kbs[name] = kb;
        console.log('[PRISM] Registered KB:', name);
    },
    
    // Search across all knowledge bases
    search: function(query, domains = null) {
        const results = [];
        const q = query.toLowerCase();
        const searchDomains = domains || Object.keys(this.kbs);
        
        for (const domain of searchDomains) {
            const kb = this.kbs[domain];
            if (!kb) continue;
            
            for (const [category, items] of Object.entries(kb)) {
                if (typeof items !== 'object') continue;
                
                for (const [key, item] of Object.entries(items)) {
                    if (!item || typeof item !== 'object') continue;
                    
                    const name = (item.name || '').toLowerCase();
                    const desc = (item.description || '').toLowerCase();
                    
                    if (name.includes(q) || desc.includes(q)) {
                        results.push({
                            domain,
                            category,
                            key,
                            ...item,
                            relevance: name.includes(q) ? 1.0 : 0.5
                        });
                    }
                }
            }
        }
        
        return results.sort((a, b) => b.relevance - a.relevance);
    },
    
    // Get specific item
    get: function(domain, category, key) {
        return this.kbs[domain]?.[category]?.[key] || null;
    },
    
    // List category items
    list: function(domain, category) {
        const cat = this.kbs[domain]?.[category];
        if (!cat) return [];
        return Object.entries(cat).map(([k, v]) => ({ key: k, ...v }));
    },
    
    // Get statistics
    stats: function() {
        const s = {};
        for (const [d, kb] of Object.entries(this.kbs)) {
            s[d] = { _total: 0 };
            for (const [c, items] of Object.entries(kb)) {
                const n = Object.keys(items).length;
                s[d][c] = n;
                s[d]._total += n;
            }
        }
        return s;
    },
    
    // Import additional data (for future integration)
    importData: function(domain, category, items) {
        if (!this.kbs[domain]) {
            this.kbs[domain] = {};
        }
        if (!this.kbs[domain][category]) {
            this.kbs[domain][category] = {};
        }
        
        for (const item of items) {
            const key = item.key || item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            this.kbs[domain][category][key] = item;
        }
        
        console.log('[PRISM] Imported', items.length, 'items to', domain + '/' + category);
    }
}