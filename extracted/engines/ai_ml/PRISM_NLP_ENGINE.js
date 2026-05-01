/**
 * PRISM_NLP_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 21
 * Lines: 174
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_NLP_ENGINE = {

    // Manufacturing vocabulary
    vocab: new Map(),
    reverseVocab: new Map(),
    vocabSize: 0,

    // Special tokens
    specialTokens: {
        PAD: 0,
        UNK: 1,
        START: 2,
        END: 3
    },
    /**
     * Initialize vocabulary with manufacturing terms
     */
    initVocab: function() {
        const manufacturingTerms = [
            // Pad and special
            '<PAD>', '<UNK>', '<START>', '<END>',
            // Operations
            'roughing', 'finishing', 'drilling', 'tapping', 'boring', 'facing',
            'turning', 'milling', 'threading', 'grooving', 'parting', 'chamfer',
            // Materials
            'aluminum', 'steel', 'stainless', 'titanium', 'brass', 'bronze',
            'copper', 'plastic', 'delrin', 'peek', 'inconel', 'hastelloy',
            // Tools
            'endmill', 'drill', 'tap', 'reamer', 'insert', 'carbide', 'hss',
            'ceramic', 'diamond', 'cbn', 'coated', 'uncoated', 'flute',
            // Parameters
            'speed', 'feed', 'rpm', 'sfm', 'ipm', 'doc', 'woc', 'stepover',
            'chipload', 'mrr', 'engagement', 'helix', 'lead', 'rake',
            // Problems
            'chatter', 'vibration', 'deflection', 'wear', 'breakage', 'chip',
            'buildup', 'burr', 'finish', 'tolerance', 'runout',
            // Actions
            'calculate', 'optimize', 'increase', 'decrease', 'adjust', 'check',
            'recommend', 'suggest', 'analyze', 'predict', 'simulate',
            // Questions
            'what', 'why', 'how', 'when', 'which', 'should', 'can', 'is',
            // Common words
            'the', 'a', 'an', 'for', 'to', 'of', 'in', 'on', 'with', 'my',
            'best', 'good', 'bad', 'high', 'low', 'fast', 'slow', 'too',
            // Numbers and units
            'mm', 'inch', 'inches', 'ipm', 'sfm', 'rpm', 'percent', '%'
        ];

        this.vocab.clear();
        this.reverseVocab.clear();

        manufacturingTerms.forEach((term, idx) => {
            this.vocab.set(term.toLowerCase(), idx);
            this.reverseVocab.set(idx, term.toLowerCase());
        });

        this.vocabSize = manufacturingTerms.length;
        return this.vocabSize;
    },
    /**
     * Tokenize text
     */
    tokenize: function(text) {
        if (this.vocabSize === 0) this.initVocab();

        // Clean and split
        const cleaned = text.toLowerCase()
            .replace(/[^\w\s<>%-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const words = cleaned.split(' ');
        const tokens = [this.specialTokens.START];

        for (const word of words) {
            if (this.vocab.has(word)) {
                tokens.push(this.vocab.get(word));
            } else {
                // Try to find partial match
                let found = false;
                for (const [term, idx] of this.vocab) {
                    if (word.includes(term) || term.includes(word)) {
                        tokens.push(idx);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    tokens.push(this.specialTokens.UNK);
                }
            }
        }
        tokens.push(this.specialTokens.END);
        return tokens;
    },
    /**
     * Detokenize back to text
     */
    detokenize: function(tokens) {
        return tokens
            .filter(t => t > 3) // Skip special tokens
            .map(t => this.reverseVocab.get(t) || '<UNK>')
            .join(' ');
    },
    /**
     * Pad sequence to fixed length
     */
    padSequence: function(tokens, maxLen, padValue = 0) {
        if (tokens.length >= maxLen) {
            return tokens.slice(0, maxLen);
        }
        return [...tokens, ...Array(maxLen - tokens.length).fill(padValue)];
    },
    /**
     * Create word embeddings
     */
    createEmbedding: function(embeddingDim = 64) {
        if (this.vocabSize === 0) this.initVocab();

        // Initialize with random embeddings
        const embeddings = PRISM_TENSOR_ENHANCED.randomNormal(
            [this.vocabSize, embeddingDim], 0, 0.1
        );

        return {
            vocabSize: this.vocabSize,
            embeddingDim,
            weights: embeddings,

            lookup: function(tokenIds) {
                if (!Array.isArray(tokenIds)) tokenIds = [tokenIds];
                return tokenIds.map(id =>
                    id < this.weights.length ? [...this.weights[id]] :
                    Array(this.embeddingDim).fill(0)
                );
            },
            embed: function(tokens) {
                return this.lookup(tokens);
            }
        };
    },
    /**
     * Simple TF-IDF for intent matching
     */
    computeTFIDF: function(documents) {
        const df = new Map(); // Document frequency
        const tfs = []; // Term frequency per document

        // Compute TF and DF
        for (const doc of documents) {
            const tokens = this.tokenize(doc);
            const tf = new Map();

            for (const token of tokens) {
                tf.set(token, (tf.get(token) || 0) + 1);
            }
            tfs.push(tf);

            for (const token of new Set(tokens)) {
                df.set(token, (df.get(token) || 0) + 1);
            }
        }
        // Compute TF-IDF
        const N = documents.length;
        return documents.map((_, i) => {
            const tfidf = new Map();
            for (const [token, count] of tfs[i]) {
                const idf = Math.log(N / (df.get(token) || 1));
                tfidf.set(token, count * idf);
            }
            return tfidf;
        });
    }
}