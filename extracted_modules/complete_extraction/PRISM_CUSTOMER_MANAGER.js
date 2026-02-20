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