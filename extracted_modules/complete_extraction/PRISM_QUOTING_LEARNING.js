const PRISM_QUOTING_LEARNING = {
    version: '1.0.0',
    authority: 'PRISM_QUOTING_LEARNING',
    
    // Learning data storage
    learningData: {
        quotes: [],           // {quoteId, customerId, estimatedCost, actualCost, won, margin}
        materialCosts: {},    // materialId -> {avgCost, lastUpdated, samples}
        laborRates: {},       // operationType -> {avgRate, efficiency}
        setupTimes: {},       // machineType -> operationType -> {avgTime, samples}
        cycleAccuracy: [],    // {estimated, actual, partComplexity, materialType}
        wonLostPatterns: []   // {features, won, margin, competitorPrice}
    },
    
    // Bayesian priors for quote adjustments
    priors: {
        setup_factor: { mean: 1.0, variance: 0.04 },      // +/-20% typical
        cycle_factor: { mean: 1.0, variance: 0.0225 },    // +/-15% typical
        material_factor: { mean: 1.0, variance: 0.01 },   // +/-10% typical
        overhead_factor: { mean: 1.0, variance: 0.0625 }, // +/-25% typical
        margin_factor: { mean: 0.25, variance: 0.01 }     // 25% +/-10% typical
    },
    
    recordQuoteOutcome: function(params) {
        const { quoteId, customerId, estimatedCost, actualCost, won, finalPrice, competitorPrice = null } = params;
        
        const margin = won && actualCost > 0 ? (finalPrice - actualCost) / finalPrice : null;
        const accuracy = actualCost > 0 ? estimatedCost / actualCost : null;
        
        const record = {
            timestamp: Date.now(),
            quoteId, customerId, estimatedCost, actualCost, won, finalPrice, 
            competitorPrice, margin, accuracy
        };
        
        this.learningData.quotes.push(record);
        
        // Update Bayesian priors based on accuracy
        if (accuracy && accuracy > 0) {
            this._updateBayesianPrior('cycle_factor', accuracy);
        }
        
        // Track won/lost patterns
        if (competitorPrice) {
            this.learningData.wonLostPatterns.push({
                priceRatio: finalPrice / competitorPrice,
                won, margin,
                timestamp: Date.now()
            });
        }
        
        this._persistData();
        return record;
    },
    
    recordMaterialCost: function(materialId, actualCost, quantity) {
        if (!this.learningData.materialCosts[materialId]) {
            this.learningData.materialCosts[materialId] = { avgCost: actualCost, samples: 1, lastUpdated: Date.now() };
        } else {
            const mc = this.learningData.materialCosts[materialId];
            mc.avgCost = (mc.avgCost * mc.samples + actualCost) / (mc.samples + 1);
            mc.samples++;
            mc.lastUpdated = Date.now();
        }
        this._persistData();
    },
    
    recordSetupTime: function(machineType, operationType, actualTime) {
        const key = `${machineType}_${operationType}`;
        if (!this.learningData.setupTimes[key]) {
            this.learningData.setupTimes[key] = { avgTime: actualTime, samples: 1 };
        } else {
            const st = this.learningData.setupTimes[key];
            st.avgTime = (st.avgTime * st.samples + actualTime) / (st.samples + 1);
            st.samples++;
        }
        this._persistData();
    },
    
    adjustQuoteEstimate: function(baseEstimate) {
        const { setupCost = 0, cycleCost = 0, materialCost = 0, overhead = 0 } = baseEstimate;
        
        const adjustedSetup = setupCost * this.priors.setup_factor.mean;
        const adjustedCycle = cycleCost * this.priors.cycle_factor.mean;
        const adjustedMaterial = materialCost * this.priors.material_factor.mean;
        const adjustedOverhead = overhead * this.priors.overhead_factor.mean;
        
        const totalCost = adjustedSetup + adjustedCycle + adjustedMaterial + adjustedOverhead;
        const suggestedMargin = this.priors.margin_factor.mean;
        const suggestedPrice = totalCost / (1 - suggestedMargin);
        
        // Calculate confidence based on variance
        const confidence = 1 - Math.sqrt(
            (this.priors.setup_factor.variance + this.priors.cycle_factor.variance + 
             this.priors.material_factor.variance + this.priors.overhead_factor.variance) / 4
        );
        
        return {
            adjustedCost: totalCost,
            breakdown: { setup: adjustedSetup, cycle: adjustedCycle, material: adjustedMaterial, overhead: adjustedOverhead },
            suggestedPrice,
            suggestedMargin: suggestedMargin * 100,
            confidence: Math.max(0, Math.min(1, confidence)),
            confidenceInterval: {
                low: totalCost * 0.85,
                high: totalCost * 1.15
            }
        };
    },
    
    getOptimalMargin: function(customerHistory = null, partComplexity = 'medium', competitionLevel = 'normal') {
        let baseMargin = this.priors.margin_factor.mean;
        
        // Adjust for complexity
        const complexityAdjust = { low: -0.05, medium: 0, high: 0.05, extreme: 0.10 };
        baseMargin += complexityAdjust[partComplexity] || 0;
        
        // Adjust for competition
        const competitionAdjust = { low: 0.05, normal: 0, high: -0.03, fierce: -0.07 };
        baseMargin += competitionAdjust[competitionLevel] || 0;
        
        // Adjust based on won/lost patterns
        const recentPatterns = this.learningData.wonLostPatterns.slice(-50);
        if (recentPatterns.length >= 10) {
            const wonPatterns = recentPatterns.filter(p => p.won);
            const avgWonRatio = wonPatterns.length > 0 ? 
                wonPatterns.reduce((a, p) => a + p.priceRatio, 0) / wonPatterns.length : 1.0;
            
            // If we're winning at higher ratios, we can increase margin
            if (avgWonRatio > 1.05) baseMargin += 0.02;
            if (avgWonRatio < 0.95) baseMargin -= 0.02;
        }
        
        return {
            suggestedMargin: Math.max(0.10, Math.min(0.40, baseMargin)),
            reasoning: {
                base: this.priors.margin_factor.mean,
                complexityAdjust: complexityAdjust[partComplexity] || 0,
                competitionAdjust: competitionAdjust[competitionLevel] || 0,
                patternAdjust: baseMargin - this.priors.margin_factor.mean - (complexityAdjust[partComplexity] || 0) - (competitionAdjust[competitionLevel] || 0)
            }
        };
    },
    
    getWinProbability: function(proposedPrice, estimatedCost, competitorEstimate = null) {
        const margin = (proposedPrice - estimatedCost) / proposedPrice;
        const recentPatterns = this.learningData.wonLostPatterns.slice(-100);
        
        if (recentPatterns.length < 10) {
            // Not enough data, use simple heuristic
            if (margin < 0.15) return { probability: 0.7, confidence: 'low', dataPoints: recentPatterns.length };
            if (margin < 0.25) return { probability: 0.5, confidence: 'low', dataPoints: recentPatterns.length };
            if (margin < 0.35) return { probability: 0.3, confidence: 'low', dataPoints: recentPatterns.length };
            return { probability: 0.15, confidence: 'low', dataPoints: recentPatterns.length };
        }
        
        // Find similar margin quotes
        const similar = recentPatterns.filter(p => {
            const pMargin = p.margin || 0.25;
            return Math.abs(pMargin - margin) < 0.05;
        });
        
        const winRate = similar.length > 0 ? similar.filter(p => p.won).length / similar.length : 0.5;
        
        return {
            probability: winRate,
            confidence: similar.length >= 20 ? 'high' : similar.length >= 10 ? 'medium' : 'low',
            dataPoints: similar.length,
            historicalWinRate: this.learningData.quotes.filter(q => q.won).length / Math.max(1, this.learningData.quotes.length)
        };
    },
    
    getStatistics: function() {
        const quotes = this.learningData.quotes;
        const won = quotes.filter(q => q.won);
        const withActual = quotes.filter(q => q.actualCost > 0);
        
        const avgAccuracy = withActual.length > 0 ?
            withActual.reduce((a, q) => a + q.accuracy, 0) / withActual.length : null;
        
        const avgMargin = won.filter(q => q.margin).length > 0 ?
            won.filter(q => q.margin).reduce((a, q) => a + q.margin, 0) / won.filter(q => q.margin).length : null;
        
        return {
            totalQuotes: quotes.length,
            wonQuotes: won.length,
            winRate: quotes.length > 0 ? (won.length / quotes.length * 100).toFixed(1) + '%' : 'N/A',
            avgEstimateAccuracy: avgAccuracy ? (avgAccuracy * 100).toFixed(1) + '%' : 'N/A',
            avgActualMargin: avgMargin ? (avgMargin * 100).toFixed(1) + '%' : 'N/A',
            materialCostsTracked: Object.keys(this.learningData.materialCosts).length,
            setupTimesTracked: Object.keys(this.learningData.setupTimes).length,
            bayesianConfidence: (1 - Math.sqrt(this.priors.cycle_factor.variance)) * 100
        };
    },
    
    _updateBayesianPrior: function(priorName, observedValue) {
        const prior = this.priors[priorName];
        if (!prior) return;
        
        const priorPrecision = 1 / prior.variance;
        const likelihoodPrecision = 10; // Assume moderate confidence in observation
        const posteriorPrecision = priorPrecision + likelihoodPrecision;
        
        prior.mean = (priorPrecision * prior.mean + likelihoodPrecision * observedValue) / posteriorPrecision;
        prior.variance = 1 / posteriorPrecision;
    },
    
    _persistData: function() {
        try {
            localStorage.setItem('prism_quoting_learning', JSON.stringify({
                learningData: this.learningData,
                priors: this.priors
            }));
        } catch (e) { /* Storage unavailable */ }
    },
    
    loadPersistedData: function() {
        try {
            const saved = localStorage.getItem('prism_quoting_learning');
            if (saved) {
                const data = JSON.parse(saved);
                this.learningData = data.learningData || this.learningData;
                this.priors = data.priors || this.priors;
            }
        } catch (e) { /* Storage unavailable */ }
    },
    
    runSelfTests: function() {
        console.log('[QUOTING_LEARNING] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const r = this.recordQuoteOutcome({ quoteId: 'Q1', customerId: 'C1', estimatedCost: 1000, actualCost: 950, won: true, finalPrice: 1300 });
            if (r.margin > 0 && r.accuracy > 0) { results.passed++; results.tests.push({ name: 'Record Quote', status: 'PASS' }); }
            else throw new Error('Invalid record');
        } catch (e) { results.failed++; results.tests.push({ name: 'Record Quote', status: 'FAIL', error: e.message }); }
        
        try {
            const r = this.adjustQuoteEstimate({ setupCost: 100, cycleCost: 500, materialCost: 200, overhead: 50 });
            if (r.adjustedCost > 0 && r.suggestedPrice > r.adjustedCost) { results.passed++; results.tests.push({ name: 'Adjust Quote', status: 'PASS' }); }
            else throw new Error('Invalid adjustment');
        } catch (e) { results.failed++; results.tests.push({ name: 'Adjust Quote', status: 'FAIL', error: e.message }); }
        
        try {
            const r = this.getOptimalMargin(null, 'high', 'normal');
            if (r.suggestedMargin >= 0.10 && r.suggestedMargin <= 0.40) { results.passed++; results.tests.push({ name: 'Optimal Margin', status: 'PASS' }); }
            else throw new Error('Invalid margin');
        } catch (e) { results.failed++; results.tests.push({ name: 'Optimal Margin', status: 'FAIL', error: e.message }); }
        
        try {
            const r = this.getWinProbability(1300, 1000);
            if (r.probability >= 0 && r.probability <= 1) { results.passed++; results.tests.push({ name: 'Win Probability', status: 'PASS' }); }
            else throw new Error('Invalid probability');
        } catch (e) { results.failed++; results.tests.push({ name: 'Win Probability', status: 'FAIL', error: e.message }); }
        
        console.log('[QUOTING_LEARNING] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
};

if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('quoting.record', 'PRISM_QUOTING_LEARNING.recordQuoteOutcome');
    PRISM_GATEWAY.register('quoting.adjust', 'PRISM_QUOTING_LEARNING.adjustQuoteEstimate');
    PRISM_GATEWAY.register('quoting.margin', 'PRISM_QUOTING_LEARNING.getOptimalMargin');
    PRISM_GATEWAY.register('quoting.winProb', 'PRISM_QUOTING_LEARNING.getWinProbability');
    PRISM_GATEWAY.register('quoting.stats', 'PRISM_QUOTING_LEARNING.getStatistics');
}

console.log('[PRISM_QUOTING_LEARNING] Loaded v1.0.0');

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT 3: BUSINESS/SHOP/ERP SYSTEM - CUSTOMER MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_CUSTOMER_MANAGER = {
    version: '1.0.0',
    authority: 'PRISM_CUSTOMER_MANAGER',
    
    // Customer database
    customers: {},
    
    // Customer schema
    createCustomer: function(params) {
        const { name, company = '', email = '', phone = '', address = {}, industry = '', notes = '' } = params;
        
        if (!name) throw new Error('Customer name required');
        
        const id = 'CUST-' + Date.now().toString(36).toUpperCase();
        
        this.customers[id] = {
            id, name, company, email, phone, address, industry, notes,
            created: Date.now(),
            modified: Date.now(),
            status: 'active',
            creditLimit: 0,
            paymentTerms: 'NET30',
            taxExempt: false,
            contacts: [],
            tags: [],
            customFields: {},
            // Analytics
            analytics: {
                totalOrders: 0,
                totalRevenue: 0,
                avgOrderValue: 0,
                lastOrderDate: null,
                firstOrderDate: null,
                lifetimeValue: 0,
                onTimePaymentRate: 1.0,
                avgPaymentDays: 0
            },
            // Communication history
            communications: [],
            // Order history (references)
            orderHistory: []
        };
        
        this._persistData();
        return this.customers[id];
    },
    
    updateCustomer: function(customerId, updates) {
        if (!this.customers[customerId]) throw new Error('Customer not found: ' + customerId);
        
        const customer = this.customers[customerId];
        const allowed = ['name', 'company', 'email', 'phone', 'address', 'industry', 'notes', 
                         'status', 'creditLimit', 'paymentTerms', 'taxExempt', 'tags', 'customFields'];
        
        for (const key of allowed) {
            if (updates[key] !== undefined) customer[key] = updates[key];
        }
        
        customer.modified = Date.now();
        this._persistData();
        return customer;
    },
    
    getCustomer: function(customerId) {
        return this.customers[customerId] || null;
    },
    
    searchCustomers: function(query, options = {}) {
        const { status = null, industry = null, minOrders = 0, minRevenue = 0, tags = [] } = options;
        const queryLower = query.toLowerCase();
        
        return Object.values(this.customers).filter(c => {
            // Text search
            const textMatch = !query || 
                c.name.toLowerCase().includes(queryLower) ||
                c.company.toLowerCase().includes(queryLower) ||
                c.email.toLowerCase().includes(queryLower);
            
            // Filters
            const statusMatch = !status || c.status === status;
            const industryMatch = !industry || c.industry === industry;
            const ordersMatch = c.analytics.totalOrders >= minOrders;
            const revenueMatch = c.analytics.totalRevenue >= minRevenue;
            const tagsMatch = tags.length === 0 || tags.some(t => c.tags.includes(t));
            
            return textMatch && statusMatch && industryMatch && ordersMatch && revenueMatch && tagsMatch;
        });
    },
    
    addContact: function(customerId, contact) {
        const customer = this.customers[customerId];
        if (!customer) throw new Error('Customer not found');
        
        const contactId = 'CONT-' + Date.now().toString(36).toUpperCase();
        customer.contacts.push({
            id: contactId,
            name: contact.name || '',
            title: contact.title || '',
            email: contact.email || '',
            phone: contact.phone || '',
            isPrimary: contact.isPrimary || customer.contacts.length === 0,
            created: Date.now()
        });
        
        this._persistData();
        return customer.contacts[customer.contacts.length - 1];
    },
    
    recordOrder: function(customerId, orderData) {
        const customer = this.customers[customerId];
        if (!customer) throw new Error('Customer not found');
        
        const { orderId, amount, date = Date.now() } = orderData;
        
        customer.orderHistory.push({ orderId, amount, date });
        customer.analytics.totalOrders++;
        customer.analytics.totalRevenue += amount;
        customer.analytics.avgOrderValue = customer.analytics.totalRevenue / customer.analytics.totalOrders;
        customer.analytics.lastOrderDate = date;
        if (!customer.analytics.firstOrderDate) customer.analytics.firstOrderDate = date;
        
        // Simplified LTV calculation (could use more sophisticated models)
        const monthsActive = (Date.now() - customer.analytics.firstOrderDate) / (30 * 24 * 60 * 60 * 1000);
        const ordersPerMonth = monthsActive > 0 ? customer.analytics.totalOrders / monthsActive : 1;
        customer.analytics.lifetimeValue = customer.analytics.avgOrderValue * ordersPerMonth * 24; // 2-year projection
        
        this._persistData();
        return customer.analytics;
    },
    
    recordPayment: function(customerId, paymentData) {
        const customer = this.customers[customerId];
        if (!customer) throw new Error('Customer not found');
        
        const { invoiceDate, paymentDate, amount, onTime } = paymentData;
        const paymentDays = (paymentDate - invoiceDate) / (24 * 60 * 60 * 1000);
        
        // Update payment analytics
        const n = customer.analytics.totalOrders || 1;
        customer.analytics.avgPaymentDays = ((customer.analytics.avgPaymentDays * (n - 1)) + paymentDays) / n;
        customer.analytics.onTimePaymentRate = ((customer.analytics.onTimePaymentRate * (n - 1)) + (onTime ? 1 : 0)) / n;
        
        this._persistData();
        return customer.analytics;
    },
    
    logCommunication: function(customerId, commData) {
        const customer = this.customers[customerId];
        if (!customer) throw new Error('Customer not found');
        
        customer.communications.push({
            id: 'COMM-' + Date.now().toString(36).toUpperCase(),
            type: commData.type || 'note', // email, call, meeting, note
            subject: commData.subject || '',
            content: commData.content || '',
            date: commData.date || Date.now(),
            user: commData.user || 'system'
        });
        
        this._persistData();
        return customer.communications[customer.communications.length - 1];
    },
    
    getCustomerSegments: function() {
        const customers = Object.values(this.customers);
        
        // RFM Segmentation (Recency, Frequency, Monetary)
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const ninetyDays = 90 * 24 * 60 * 60 * 1000;
        
        const segments = {
            champions: [],     // High value, recent, frequent
            loyal: [],         // Regular customers
            potential: [],     // Growing customers
            atRisk: [],        // Haven't ordered recently
            inactive: [],      // No orders in 90+ days
            new: []            // Recent first order
        };
        
        for (const c of customers) {
            if (c.status !== 'active') continue;
            
            const daysSinceOrder = c.analytics.lastOrderDate ? 
                (now - c.analytics.lastOrderDate) / (24 * 60 * 60 * 1000) : 999;
            
            const isHigh = c.analytics.totalRevenue > 10000;
            const isFrequent = c.analytics.totalOrders >= 5;
            const isRecent = daysSinceOrder < 30;
            const isNew = c.analytics.totalOrders === 1 && daysSinceOrder < 60;
            
            if (isNew) segments.new.push(c);
            else if (isHigh && isFrequent && isRecent) segments.champions.push(c);
            else if (isFrequent && isRecent) segments.loyal.push(c);
            else if (daysSinceOrder > 90) segments.inactive.push(c);
            else if (daysSinceOrder > 30) segments.atRisk.push(c);
            else segments.potential.push(c);
        }
        
        return segments;
    },
    
    getTopCustomers: function(limit = 10, sortBy = 'revenue') {
        const customers = Object.values(this.customers).filter(c => c.status === 'active');
        
        const sorters = {
            revenue: (a, b) => b.analytics.totalRevenue - a.analytics.totalRevenue,
            orders: (a, b) => b.analytics.totalOrders - a.analytics.totalOrders,
            ltv: (a, b) => b.analytics.lifetimeValue - a.analytics.lifetimeValue,
            recent: (a, b) => (b.analytics.lastOrderDate || 0) - (a.analytics.lastOrderDate || 0)
        };
        
        return customers.sort(sorters[sortBy] || sorters.revenue).slice(0, limit);
    },
    
    _persistData: function() {
        try {
            localStorage.setItem('prism_customers', JSON.stringify(this.customers));
        } catch (e) { /* Storage unavailable */ }
    },
    
    loadPersistedData: function() {
        try {
            const saved = localStorage.getItem('prism_customers');
            if (saved) this.customers = JSON.parse(saved);
        } catch (e) { /* Storage unavailable */ }
    },
    
    runSelfTests: function() {
        console.log('[CUSTOMER_MANAGER] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const c = this.createCustomer({ name: 'Test Corp', company: 'Test Industries', email: 'test@test.com' });
            if (c.id && c.name === 'Test Corp') { results.passed++; results.tests.push({ name: 'Create Customer', status: 'PASS' }); }
            else throw new Error('Invalid customer');
            
            // Cleanup
            delete this.customers[c.id];
        } catch (e) { results.failed++; results.tests.push({ name: 'Create Customer', status: 'FAIL', error: e.message }); }
        
        try {
            const c = this.createCustomer({ name: 'Test2' });
            this.recordOrder(c.id, { orderId: 'O1', amount: 5000 });
            if (c.analytics.totalOrders === 1 && c.analytics.totalRevenue === 5000) { 
                results.passed++; results.tests.push({ name: 'Record Order', status: 'PASS' }); 
            }
            else throw new Error('Invalid analytics');
            delete this.customers[c.id];
        } catch (e) { results.failed++; results.tests.push({ name: 'Record Order', status: 'FAIL', error: e.message }); }
        
        try {
            const s = this.getCustomerSegments();
            if (s.champions && s.loyal && s.atRisk) { results.passed++; results.tests.push({ name: 'Segments', status: 'PASS' }); }
            else throw new Error('Invalid segments');
        } catch (e) { results.failed++; results.tests.push({ name: 'Segments', status: 'FAIL', error: e.message }); }
        
        console.log('[CUSTOMER_MANAGER] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
}