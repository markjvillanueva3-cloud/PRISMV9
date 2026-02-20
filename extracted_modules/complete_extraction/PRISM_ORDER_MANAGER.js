const PRISM_ORDER_MANAGER = {
    version: '1.0.0',
    authority: 'PRISM_ORDER_MANAGER',
    
    // Order database
    orders: {},
    workOrders: {},
    
    // Order statuses
    ORDER_STATUSES: ['quote', 'pending', 'confirmed', 'in_progress', 'complete', 'shipped', 'invoiced', 'closed', 'cancelled'],
    WO_STATUSES: ['created', 'released', 'in_progress', 'complete', 'on_hold', 'cancelled'],
    
    createOrder: function(params) {
        const { customerId, items = [], notes = '', dueDate = null, priority = 'normal' } = params;
        
        if (!customerId) throw new Error('Customer ID required');
        if (items.length === 0) throw new Error('Order must have items');
        
        const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
        
        // Calculate totals
        let subtotal = 0;
        const processedItems = items.map((item, idx) => {
            const lineTotal = (item.quantity || 1) * (item.unitPrice || 0);
            subtotal += lineTotal;
            return {
                lineNumber: idx + 1,
                partNumber: item.partNumber || '',
                description: item.description || '',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                lineTotal,
                material: item.material || '',
                operations: item.operations || [],
                estimatedHours: item.estimatedHours || 0
            };
        });
        
        const taxRate = 0; // Would come from customer/location
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        
        this.orders[orderId] = {
            id: orderId,
            customerId,
            status: 'quote',
            items: processedItems,
            notes,
            dueDate,
            priority,
            subtotal, tax, total,
            created: Date.now(),
            modified: Date.now(),
            statusHistory: [{ status: 'quote', timestamp: Date.now(), user: 'system' }],
            workOrders: [],
            shipments: [],
            invoices: [],
            attachments: []
        };
        
        this._persistData();
        return this.orders[orderId];
    },
    
    updateOrderStatus: function(orderId, newStatus, user = 'system', notes = '') {
        const order = this.orders[orderId];
        if (!order) throw new Error('Order not found');
        if (!this.ORDER_STATUSES.includes(newStatus)) throw new Error('Invalid status');
        
        const oldStatus = order.status;
        order.status = newStatus;
        order.modified = Date.now();
        order.statusHistory.push({ status: newStatus, from: oldStatus, timestamp: Date.now(), user, notes });
        
        // Auto-update customer analytics when complete
        if (newStatus === 'complete' || newStatus === 'shipped') {
            if (typeof PRISM_CUSTOMER_MANAGER !== 'undefined') {
                PRISM_CUSTOMER_MANAGER.recordOrder(order.customerId, { orderId, amount: order.total });
            }
        }
        
        this._persistData();
        return order;
    },
    
    createWorkOrder: function(orderId, params = {}) {
        const order = this.orders[orderId];
        if (!order) throw new Error('Order not found');
        
        const { lineNumbers = [], machineId = null, operatorId = null, scheduledStart = null } = params;
        
        const woId = 'WO-' + Date.now().toString(36).toUpperCase();
        
        // Get items for this work order
        const items = lineNumbers.length > 0 ?
            order.items.filter(i => lineNumbers.includes(i.lineNumber)) :
            order.items;
        
        const workOrder = {
            id: woId,
            orderId,
            customerId: order.customerId,
            status: 'created',
            items: items.map(i => ({ ...i, completedQty: 0, scrapQty: 0 })),
            machineId,
            operatorId,
            scheduledStart,
            actualStart: null,
            completedDate: null,
            totalEstimatedHours: items.reduce((a, i) => a + (i.estimatedHours || 0), 0),
            actualHours: 0,
            notes: '',
            created: Date.now(),
            modified: Date.now(),
            statusHistory: [{ status: 'created', timestamp: Date.now() }],
            timeEntries: [],
            qualityRecords: []
        };
        
        this.workOrders[woId] = workOrder;
        order.workOrders.push(woId);
        
        this._persistData();
        return workOrder;
    },
    
    updateWorkOrderStatus: function(woId, newStatus, details = {}) {
        const wo = this.workOrders[woId];
        if (!wo) throw new Error('Work order not found');
        if (!this.WO_STATUSES.includes(newStatus)) throw new Error('Invalid status');
        
        const oldStatus = wo.status;
        wo.status = newStatus;
        wo.modified = Date.now();
        wo.statusHistory.push({ status: newStatus, from: oldStatus, timestamp: Date.now(), ...details });
        
        if (newStatus === 'in_progress' && !wo.actualStart) wo.actualStart = Date.now();
        if (newStatus === 'complete') wo.completedDate = Date.now();
        
        this._persistData();
        return wo;
    },
    
    recordTimeEntry: function(woId, entry) {
        const wo = this.workOrders[woId];
        if (!wo) throw new Error('Work order not found');
        
        const { operatorId, hours, operation = '', notes = '' } = entry;
        
        wo.timeEntries.push({
            id: 'TE-' + Date.now().toString(36),
            operatorId, hours, operation, notes,
            timestamp: Date.now()
        });
        
        wo.actualHours += hours;
        wo.modified = Date.now();
        
        this._persistData();
        return wo;
    },
    
    recordProduction: function(woId, production) {
        const wo = this.workOrders[woId];
        if (!wo) throw new Error('Work order not found');
        
        const { lineNumber, completedQty, scrapQty = 0, notes = '' } = production;
        
        const item = wo.items.find(i => i.lineNumber === lineNumber);
        if (!item) throw new Error('Line not found');
        
        item.completedQty += completedQty;
        item.scrapQty += scrapQty;
        wo.modified = Date.now();
        
        // Check if all items complete
        const allComplete = wo.items.every(i => i.completedQty >= i.quantity);
        if (allComplete && wo.status === 'in_progress') {
            this.updateWorkOrderStatus(woId, 'complete');
        }
        
        this._persistData();
        return item;
    },
    
    getOrder: function(orderId) {
        return this.orders[orderId] || null;
    },
    
    getWorkOrder: function(woId) {
        return this.workOrders[woId] || null;
    },
    
    searchOrders: function(query = '', filters = {}) {
        const { status = null, customerId = null, fromDate = null, toDate = null, priority = null } = filters;
        const queryLower = query.toLowerCase();
        
        return Object.values(this.orders).filter(o => {
            const textMatch = !query || 
                o.id.toLowerCase().includes(queryLower) ||
                o.items.some(i => i.partNumber.toLowerCase().includes(queryLower) || i.description.toLowerCase().includes(queryLower));
            
            const statusMatch = !status || o.status === status;
            const customerMatch = !customerId || o.customerId === customerId;
            const dateMatch = (!fromDate || o.created >= fromDate) && (!toDate || o.created <= toDate);
            const priorityMatch = !priority || o.priority === priority;
            
            return textMatch && statusMatch && customerMatch && dateMatch && priorityMatch;
        });
    },
    
    getOrdersByStatus: function() {
        const byStatus = {};
        for (const status of this.ORDER_STATUSES) byStatus[status] = [];
        
        for (const order of Object.values(this.orders)) {
            if (byStatus[order.status]) byStatus[order.status].push(order);
        }
        
        return byStatus;
    },
    
    getWorkOrderQueue: function(machineId = null) {
        let wos = Object.values(this.workOrders).filter(wo => 
            wo.status === 'released' || wo.status === 'in_progress'
        );
        
        if (machineId) wos = wos.filter(wo => wo.machineId === machineId);
        
        // Sort by priority (from parent order) and scheduled start
        return wos.sort((a, b) => {
            const orderA = this.orders[a.orderId];
            const orderB = this.orders[b.orderId];
            const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
            
            const pA = priorityOrder[orderA?.priority] ?? 2;
            const pB = priorityOrder[orderB?.priority] ?? 2;
            
            if (pA !== pB) return pA - pB;
            return (a.scheduledStart || a.created) - (b.scheduledStart || b.created);
        });
    },
    
    getMetrics: function(dateRange = null) {
        const orders = Object.values(this.orders);
        const workOrders = Object.values(this.workOrders);
        
        const active = orders.filter(o => !['closed', 'cancelled'].includes(o.status));
        const completed = orders.filter(o => o.status === 'closed');
        
        const completedWOs = workOrders.filter(wo => wo.status === 'complete');
        const avgEfficiency = completedWOs.length > 0 ?
            completedWOs.reduce((a, wo) => a + (wo.totalEstimatedHours / Math.max(0.1, wo.actualHours)), 0) / completedWOs.length : 1;
        
        return {
            totalOrders: orders.length,
            activeOrders: active.length,
            completedOrders: completed.length,
            totalValue: active.reduce((a, o) => a + o.total, 0),
            totalWorkOrders: workOrders.length,
            activeWorkOrders: workOrders.filter(wo => ['released', 'in_progress'].includes(wo.status)).length,
            avgEfficiency: (avgEfficiency * 100).toFixed(1) + '%',
            onTimeRate: 'N/A' // Would need due date tracking
        };
    },
    
    _persistData: function() {
        try {
            localStorage.setItem('prism_orders', JSON.stringify({ orders: this.orders, workOrders: this.workOrders }));
        } catch (e) { /* Storage unavailable */ }
    },
    
    loadPersistedData: function() {
        try {
            const saved = localStorage.getItem('prism_orders');
            if (saved) {
                const data = JSON.parse(saved);
                this.orders = data.orders || {};
                this.workOrders = data.workOrders || {};
            }
        } catch (e) { /* Storage unavailable */ }
    },
    
    runSelfTests: function() {
        console.log('[ORDER_MANAGER] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const o = this.createOrder({ 
                customerId: 'C1', 
                items: [{ partNumber: 'P1', quantity: 10, unitPrice: 50 }] 
            });
            if (o.id && o.total === 500) { results.passed++; results.tests.push({ name: 'Create Order', status: 'PASS' }); }
            else throw new Error('Invalid order');
            
            // Test status update
            this.updateOrderStatus(o.id, 'confirmed');
            if (o.status === 'confirmed') { results.passed++; results.tests.push({ name: 'Update Status', status: 'PASS' }); }
            else throw new Error('Status not updated');
            
            // Test work order
            const wo = this.createWorkOrder(o.id);
            if (wo.id && wo.orderId === o.id) { results.passed++; results.tests.push({ name: 'Create WO', status: 'PASS' }); }
            else throw new Error('Invalid WO');
            
            // Cleanup
            delete this.orders[o.id];
            delete this.workOrders[wo.id];
        } catch (e) { 
            results.failed++; 
            results.tests.push({ name: 'Order Tests', status: 'FAIL', error: e.message }); 
        }
        
        try {
            const m = this.getMetrics();
            if (typeof m.totalOrders === 'number') { results.passed++; results.tests.push({ name: 'Metrics', status: 'PASS' }); }
            else throw new Error('Invalid metrics');
        } catch (e) { results.failed++; results.tests.push({ name: 'Metrics', status: 'FAIL', error: e.message }); }
        
        console.log('[ORDER_MANAGER] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
}