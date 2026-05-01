const PRISM_NLP_ENGINE_ADVANCED = {
    // Tokenization
    tokenize(text, options = {}) {
        const { lowercase = true, removeStopwords = false, stemming = false } = options;
        
        let processed = text;
        if (lowercase) processed = processed.toLowerCase();
        
        // Split on whitespace and punctuation
        let tokens = processed.split(/[\s,.!?;:()\[\]{}'"]+/).filter(t => t.length > 0);
        
        if (removeStopwords) {
            tokens = tokens.filter(t => !this.stopwords.has(t));
        }
        
        if (stemming) {
            tokens = tokens.map(t => this.stem(t));
        }
        
        return tokens;
    },
    
    // Simple Porter Stemmer (subset)
    stem(word) {
        let w = word;
        
        // Step 1: plurals
        if (w.endsWith('sses')) w = w.slice(0, -2);
        else if (w.endsWith('ies')) w = w.slice(0, -2) + 'y';
        else if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
        
        // Step 2: -ed, -ing
        if (w.endsWith('eed')) w = w.slice(0, -1);
        else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
        else if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
        
        return w;
    },
    
    stopwords: new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
        'through', 'during', 'before', 'after', 'above', 'below', 'between',
        'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
        'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just']),
    
    // TF-IDF calculation
    calculateTFIDF(documents) {
        const N = documents.length;
        const docFreq = new Map();
        const tfidf = [];
        
        // Calculate document frequency
        documents.forEach(doc => {
            const tokens = new Set(this.tokenize(doc));
            tokens.forEach(token => {
                docFreq.set(token, (docFreq.get(token) || 0) + 1);
            });
        });
        
        // Calculate TF-IDF for each document
        documents.forEach(doc => {
            const tokens = this.tokenize(doc);
            const termFreq = new Map();
            tokens.forEach(t => termFreq.set(t, (termFreq.get(t) || 0) + 1));
            
            const docTfidf = new Map();
            termFreq.forEach((tf, term) => {
                const df = docFreq.get(term) || 1;
                const idf = Math.log(N / df);
                docTfidf.set(term, (tf / tokens.length) * idf);
            });
            
            tfidf.push(docTfidf);
        });
        
        return tfidf;
    },
    
    // Cosine similarity
    cosineSimilarity(vec1, vec2) {
        const allKeys = new Set([...vec1.keys(), ...vec2.keys()]);
        let dotProduct = 0, norm1 = 0, norm2 = 0;
        
        allKeys.forEach(key => {
            const v1 = vec1.get(key) || 0;
            const v2 = vec2.get(key) || 0;
            dotProduct += v1 * v2;
            norm1 += v1 * v1;
            norm2 += v2 * v2;
        });
        
        if (norm1 === 0 || norm2 === 0) return 0;
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    },
    
    // N-grams
    ngrams(tokens, n) {
        const grams = [];
        for (let i = 0; i <= tokens.length - n; i++) {
            grams.push(tokens.slice(i, i + n).join(' '));
        }
        return grams;
    },
    
    // Intent classification
    intents: {
        patterns: new Map(),
        
        register(intent, patterns, entities = []) {
            this.patterns.set(intent, {
                patterns: patterns.map(p => new RegExp(p, 'i')),
                entities,
                examples: []
            });
        },
        
        classify(text) {
            const results = [];
            
            this.patterns.forEach((config, intent) => {
                let score = 0;
                let matchedPatterns = [];
                
                config.patterns.forEach(pattern => {
                    if (pattern.test(text)) {
                        score += 1;
                        matchedPatterns.push(pattern.source);
                    }
                });
                
                if (score > 0) {
                    results.push({
                        intent,
                        confidence: Math.min(score / config.patterns.length, 1),
                        matchedPatterns
                    });
                }
            });
            
            return results.sort((a, b) => b.confidence - a.confidence);
        }
    },
    
    // Entity extraction for manufacturing
    entities: {
        extractors: new Map(),
        
        register(entityType, patterns, normalizer = null) {
            this.extractors.set(entityType, {
                patterns: patterns.map(p => new RegExp(p, 'gi')),
                normalizer
            });
        },
        
        extract(text) {
            const entities = [];
            
            this.extractors.forEach((config, type) => {
                config.patterns.forEach(pattern => {
                    let match;
                    while ((match = pattern.exec(text)) !== null) {
                        let value = match[1] || match[0];
                        if (config.normalizer) {
                            value = config.normalizer(value);
                        }
                        entities.push({
                            type,
                            value,
                            raw: match[0],
                            start: match.index,
                            end: match.index + match[0].length
                        });
                    }
                });
            });
            
            return entities;
        }
    },
    
    // Initialize manufacturing-specific patterns
    initManufacturingPatterns() {
        // Intents
        this.intents.register('calculate_speed_feed', [
            'calculate.*speed.*feed',
            'what.*speed.*feed',
            'recommend.*parameter',
            'optimal.*cutting',
            'how fast.*cut',
            'rpm.*for',
            'feed.*rate.*for'
        ], ['material', 'tool', 'operation']);
        
        this.intents.register('tool_life_query', [
            'tool.*life',
            'how long.*tool.*last',
            'when.*replace.*tool',
            'tool.*wear',
            'expected.*life'
        ], ['tool', 'material', 'speed']);
        
        this.intents.register('material_query', [
            'what.*material',
            'properties.*of',
            'hardness.*of',
            'machinability',
            'cutting.*data.*for'
        ], ['material']);
        
        this.intents.register('troubleshoot', [
            'chatter',
            'vibration',
            'poor.*finish',
            'tool.*break',
            'problem.*with',
            'issue.*with',
            'help.*with'
        ], ['issue', 'operation']);
        
        this.intents.register('post_processor', [
            'post.*processor',
            'generate.*gcode',
            'g-?code.*for',
            'controller.*type',
            'fanuc|siemens|haas|mazak'
        ], ['controller', 'machine']);
        
        // Entities
        this.entities.register('material', [
            '\b(aluminum|aluminium|steel|stainless|titanium|brass|copper|plastic|inconel|hastelloy)\b',
            '\b(6061|7075|4140|304|316|Ti-?6Al-?4V)\b',
            '\b([0-9]+(?:\.[0-9]+)?\s*HRC)\b'
        ], val => val.toLowerCase());
        
        this.entities.register('tool_type', [
            '\b(end\s*mill|drill|tap|reamer|face\s*mill|ball\s*mill)\b',
            '\b(carbide|HSS|ceramic|CBN|PCD)\b'
        ], val => val.toLowerCase().replace(/\s+/g, '_'));
        
        this.entities.register('dimension', [
            '([0-9]+(?:\.[0-9]+)?(?:\s*(?:mm|in|inch|\"|\'|cm)))',
            '([0-9]+/[0-9]+(?:\s*(?:in|inch|\")))'
        ], val => {
            // Normalize to mm
            const num = parseFloat(val);
            if (val.includes('in') || val.includes('"')) return num * 25.4;
            return num;
        });
        
        this.entities.register('speed', [
            '([0-9]+(?:\.[0-9]+)?\s*(?:rpm|RPM))',
            '([0-9]+(?:\.[0-9]+)?\s*(?:sfm|SFM|m/min))'
        ]);
        
        this.entities.register('feed', [
            '([0-9]+(?:\.[0-9]+)?\s*(?:ipm|IPM|mm/min|in/min))',
            '([0-9]+(?:\.[0-9]+)?\s*(?:ipt|IPT|mm/tooth))'
        ]);
        
        this.entities.register('operation', [
            '\b(roughing|finishing|drilling|tapping|facing|profiling|pocketing|slotting)\b'
        ], val => val.toLowerCase());
        
        this.entities.register('number', [
            '\b([0-9]+(?:\.[0-9]+)?)\b'
        ], parseFloat);
    },
    
    // Process query and return structured result
    processQuery(text) {
        const intents = this.intents.classify(text);
        const entities = this.entities.extract(text);
        const tokens = this.tokenize(text, { removeStopwords: true });
        
        return {
            text,
            tokens,
            topIntent: intents[0] || { intent: 'unknown', confidence: 0 },
            allIntents: intents,
            entities,
            timestamp: Date.now()
        };
    }
};