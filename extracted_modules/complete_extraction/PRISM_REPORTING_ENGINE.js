const PRISM_REPORTING_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_REPORTING_ENGINE',
    
    // Report definitions
    reports: {
        shop_dashboard: { name: 'Shop Dashboard', type: 'dashboard', refresh: 60000 },
        production_summary: { name: 'Production Summary', type: 'summary', period: 'daily' },
        quality_report: { name: 'Quality Report', type: 'detail', period: 'weekly' },
        customer_analysis: { name: 'Customer Analysis', type: 'analysis', period: 'monthly' },
        machine_utilization: { name: 'Machine Utilization', type: 'kpi', period: 'daily' },
        financial_summary: { name: 'Financial Summary', type: 'financial', period: 'monthly' },
        operator_performance: { name: 'Operator Performance', type: 'kpi', period: 'weekly' }
    },
    
    // KPI definitions
    kpis: {
        oee: { name: 'Overall Equipment Effectiveness', target: 85, unit: '%', direction: 'higher' },
        onTimeDelivery: { name: 'On-Time Delivery', target: 95, unit: '%', direction: 'higher' },
        firstPassYield: { name: 'First Pass Yield', target: 98, unit: '%', direction: 'higher' },
        scrapRate: { name: 'Scrap Rate', target: 2, unit: '%', direction: 'lower' },
        laborEfficiency: { name: 'Labor Efficiency', target: 90, unit: '%', direction: 'higher' },
        quoteWinRate: { name: 'Quote Win Rate', target: 40, unit: '%', direction: 'higher' },
        avgLeadTime: { name: 'Avg Lead Time', target: 5, unit: 'days', direction: 'lower' },
        revenuePerEmployee: { name: 'Revenue/Employee', target: 150000, unit: '$', direction: 'higher' }
    },
    
    generateDashboard: function() {
        // Collect data from all managers
        const orderMetrics = typeof PRISM_ORDER_MANAGER !== 'undefined' ? 
            PRISM_ORDER_MANAGER.getMetrics() : {};
        const qualityMetrics = typeof PRISM_QUALITY_MANAGER !== 'undefined' ? 
            PRISM_QUALITY_MANAGER.getQualityMetrics() : {};
        const quotingStats = typeof PRISM_QUOTING_LEARNING !== 'undefined' ? 
            PRISM_QUOTING_LEARNING.getStatistics() : {};
        const shopLearning = typeof PRISM_SHOP_LEARNING_ENGINE !== 'undefined' ?
            PRISM_SHOP_LEARNING_ENGINE.getStatistics() : {};
        
        // Calculate KPIs
        const kpiValues = this._calculateKPIs(orderMetrics, qualityMetrics, quotingStats, shopLearning);
        
        return {
            timestamp: Date.now(),
            summary: {
                activeOrders: orderMetrics.activeOrders || 0,
                activeWorkOrders: orderMetrics.activeWorkOrders || 0,
                orderValue: orderMetrics.totalValue || 0,
                openNCRs: qualityMetrics.openNCRs || 0
            },
            kpis: kpiValues,
            alerts: this._generateAlerts(kpiValues),
            charts: {
                orderStatus: this._getOrderStatusChart(),
                productionTrend: this._getProductionTrend(),
                qualityTrend: this._getQualityTrend()
            }
        };
    },
    
    generateProductionReport: function(period = 'daily', startDate = null, endDate = null) {
        const now = Date.now();
        const start = startDate || (period === 'daily' ? now - 24*60*60*1000 : 
                                    period === 'weekly' ? now - 7*24*60*60*1000 : 
                                    now - 30*24*60*60*1000);
        const end = endDate || now;
        
        const workOrders = typeof PRISM_ORDER_MANAGER !== 'undefined' ?
            Object.values(PRISM_ORDER_MANAGER.workOrders).filter(wo => 
                wo.created >= start && wo.created <= end
            ) : [];
        
        const completed = workOrders.filter(wo => wo.status === 'complete');
        const totalHours = completed.reduce((a, wo) => a + wo.actualHours, 0);
        const estimatedHours = completed.reduce((a, wo) => a + wo.totalEstimatedHours, 0);
        
        return {
            period,
            startDate: new Date(start).toISOString(),
            endDate: new Date(end).toISOString(),
            generated: new Date().toISOString(),
            summary: {
                workOrdersCreated: workOrders.length,
                workOrdersCompleted: completed.length,
                totalActualHours: totalHours.toFixed(1),
                totalEstimatedHours: estimatedHours.toFixed(1),
                efficiency: estimatedHours > 0 ? ((estimatedHours / totalHours) * 100).toFixed(1) + '%' : 'N/A'
            },
            byMachine: this._groupByMachine(completed),
            byOperator: this._groupByOperator(completed),
            details: completed.map(wo => ({
                id: wo.id,
                orderId: wo.orderId,
                estimatedHours: wo.totalEstimatedHours,
                actualHours: wo.actualHours,
                efficiency: wo.totalEstimatedHours > 0 ? 
                    ((wo.totalEstimatedHours / wo.actualHours) * 100).toFixed(1) + '%' : 'N/A'
            }))
        };
    },
    
    generateQualityReport: function(period = 'weekly') {
        const metrics = typeof PRISM_QUALITY_MANAGER !== 'undefined' ?
            PRISM_QUALITY_MANAGER.getQualityMetrics() : {};
        
        const ncrs = typeof PRISM_QUALITY_MANAGER !== 'undefined' ?
            Object.values(PRISM_QUALITY_MANAGER.ncrs) : [];
        
        // Group NCRs by defect type
        const byDefectType = {};
        for (const ncr of ncrs) {
            byDefectType[ncr.defectType] = (byDefectType[ncr.defectType] || 0) + 1;
        }
        
        // Pareto analysis
        const paretoData = Object.entries(byDefectType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count], idx, arr) => {
                const cumulative = arr.slice(0, idx + 1).reduce((a, [, c]) => a + c, 0);
                const total = arr.reduce((a, [, c]) => a + c, 0);
                return { defectType: type, count, cumulative, cumulativePercent: (cumulative / total * 100).toFixed(1) };
            });
        
        return {
            period,
            generated: new Date().toISOString(),
            summary: metrics,
            paretoAnalysis: paretoData,
            openNCRs: ncrs.filter(n => n.status !== 'closed').map(n => ({
                id: n.id,
                partNumber: n.partNumber,
                description: n.description,
                status: n.status,
                age: Math.floor((Date.now() - n.created) / (24*60*60*1000)) + ' days'
            })),
            recommendations: this._generateQualityRecommendations(paretoData, metrics)
        };
    },
    
    generateFinancialSummary: function(period = 'monthly') {
        const orders = typeof PRISM_ORDER_MANAGER !== 'undefined' ?
            Object.values(PRISM_ORDER_MANAGER.orders) : [];
        const quotes = typeof PRISM_QUOTING_LEARNING !== 'undefined' ?
            PRISM_QUOTING_LEARNING.learningData.quotes : [];
        
        const completedOrders = orders.filter(o => o.status === 'closed' || o.status === 'invoiced');
        const totalRevenue = completedOrders.reduce((a, o) => a + o.total, 0);
        
        const wonQuotes = quotes.filter(q => q.won);
        const avgMargin = wonQuotes.length > 0 ?
            wonQuotes.filter(q => q.margin).reduce((a, q) => a + q.margin, 0) / wonQuotes.filter(q => q.margin).length : 0;
        
        const qualityMetrics = typeof PRISM_QUALITY_MANAGER !== 'undefined' ?
            PRISM_QUALITY_MANAGER.getQualityMetrics() : {};
        
        return {
            period,
            generated: new Date().toISOString(),
            revenue: {
                total: totalRevenue,
                orderCount: completedOrders.length,
                avgOrderValue: completedOrders.length > 0 ? (totalRevenue / completedOrders.length).toFixed(2) : 0
            },
            quoting: {
                totalQuotes: quotes.length,
                wonQuotes: wonQuotes.length,
                winRate: quotes.length > 0 ? (wonQuotes.length / quotes.length * 100).toFixed(1) + '%' : 'N/A',
                avgMargin: (avgMargin * 100).toFixed(1) + '%'
            },
            costs: {
                qualityCost: qualityMetrics.totalNCRCost || 0,
                avgNCRCost: qualityMetrics.avgNCRCost || 0
            },
            profitability: {
                grossProfit: totalRevenue * avgMargin,
                grossMargin: (avgMargin * 100).toFixed(1) + '%'
            }
        };
    },
    
    generateCustomReport: function(config) {
        const { metrics = [], groupBy = null, filters = {}, format = 'json' } = config;
        
        const data = {};
        
        // Collect requested metrics
        if (metrics.includes('orders')) {
            data.orders = typeof PRISM_ORDER_MANAGER !== 'undefined' ?
                PRISM_ORDER_MANAGER.getMetrics() : {};
        }
        if (metrics.includes('quality')) {
            data.quality = typeof PRISM_QUALITY_MANAGER !== 'undefined' ?
                PRISM_QUALITY_MANAGER.getQualityMetrics() : {};
        }
        if (metrics.includes('quoting')) {
            data.quoting = typeof PRISM_QUOTING_LEARNING !== 'undefined' ?
                PRISM_QUOTING_LEARNING.getStatistics() : {};
        }
        if (metrics.includes('customers')) {
            data.customers = typeof PRISM_CUSTOMER_MANAGER !== 'undefined' ?
                { total: Object.keys(PRISM_CUSTOMER_MANAGER.customers).length,
                  segments: PRISM_CUSTOMER_MANAGER.getCustomerSegments() } : {};
        }
        
        return {
            config,
            generated: new Date().toISOString(),
            data
        };
    },
    
    exportReport: function(report, format = 'json') {
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        }
        
        if (format === 'csv') {
            // Simple CSV export for flat data
            const rows = [];
            const flatten = (obj, prefix = '') => {
                for (const [key, value] of Object.entries(obj)) {
                    const newKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        flatten(value, newKey);
                    } else {
                        rows.push([newKey, Array.isArray(value) ? value.length : value]);
                    }
                }
            };
            flatten(report);
            return 'Key,Value\n' + rows.map(r => r.join(',')).join('\n');
        }
        
        return report;
    },
    
    _calculateKPIs: function(orderMetrics, qualityMetrics, quotingStats, shopLearning) {
        const kpiValues = {};
        
        // OEE (simplified)
        kpiValues.oee = {
            value: orderMetrics.avgEfficiency ? parseFloat(orderMetrics.avgEfficiency) : 0,
            target: this.kpis.oee.target,
            status: this._getKPIStatus('oee', parseFloat(orderMetrics.avgEfficiency) || 0)
        };
        
        // First Pass Yield
        const fpyValue = qualityMetrics.passRate ? parseFloat(qualityMetrics.passRate) : 100;
        kpiValues.firstPassYield = {
            value: fpyValue,
            target: this.kpis.firstPassYield.target,
            status: this._getKPIStatus('firstPassYield', fpyValue)
        };
        
        // Scrap Rate
        const scrapValue = qualityMetrics.scrapRate ? parseFloat(qualityMetrics.scrapRate) : 0;
        kpiValues.scrapRate = {
            value: scrapValue,
            target: this.kpis.scrapRate.target,
            status: this._getKPIStatus('scrapRate', scrapValue)
        };
        
        // Quote Win Rate
        const winRateValue = quotingStats.winRate ? parseFloat(quotingStats.winRate) : 0;
        kpiValues.quoteWinRate = {
            value: winRateValue,
            target: this.kpis.quoteWinRate.target,
            status: this._getKPIStatus('quoteWinRate', winRateValue)
        };
        
        return kpiValues;
    },
    
    _getKPIStatus: function(kpiName, value) {
        const kpi = this.kpis[kpiName];
        if (!kpi) return 'unknown';
        
        const diff = kpi.direction === 'higher' ? value - kpi.target : kpi.target - value;
        
        if (diff >= 0) return 'good';
        if (diff > -5) return 'warning';
        return 'critical';
    },
    
    _generateAlerts: function(kpiValues) {
        const alerts = [];
        
        for (const [name, kpi] of Object.entries(kpiValues)) {
            if (kpi.status === 'critical') {
                alerts.push({
                    level: 'critical',
                    kpi: name,
                    message: `${this.kpis[name]?.name || name} is below target: ${kpi.value}% vs ${kpi.target}%`
                });
            } else if (kpi.status === 'warning') {
                alerts.push({
                    level: 'warning',
                    kpi: name,
                    message: `${this.kpis[name]?.name || name} approaching target: ${kpi.value}% vs ${kpi.target}%`
                });
            }
        }
        
        return alerts;
    },
    
    _getOrderStatusChart: function() {
        if (typeof PRISM_ORDER_MANAGER === 'undefined') return [];
        
        const byStatus = PRISM_ORDER_MANAGER.getOrdersByStatus();
        return Object.entries(byStatus).map(([status, orders]) => ({
            status,
            count: orders.length,
            value: orders.reduce((a, o) => a + o.total, 0)
        }));
    },
    
    _getProductionTrend: function() {
        // Would aggregate production data over time
        return [];
    },
    
    _getQualityTrend: function() {
        // Would aggregate quality data over time
        return [];
    },
    
    _groupByMachine: function(workOrders) {
        const groups = {};
        for (const wo of workOrders) {
            const machine = wo.machineId || 'Unassigned';
            if (!groups[machine]) groups[machine] = { count: 0, hours: 0 };
            groups[machine].count++;
            groups[machine].hours += wo.actualHours;
        }
        return groups;
    },
    
    _groupByOperator: function(workOrders) {
        const groups = {};
        for (const wo of workOrders) {
            for (const te of wo.timeEntries || []) {
                const op = te.operatorId || 'Unknown';
                if (!groups[op]) groups[op] = { hours: 0, entries: 0 };
                groups[op].hours += te.hours;
                groups[op].entries++;
            }
        }
        return groups;
    },
    
    _generateQualityRecommendations: function(paretoData, metrics) {
        const recommendations = [];
        
        if (paretoData.length > 0 && parseFloat(paretoData[0].cumulativePercent) > 50) {
            recommendations.push({
                priority: 'high',
                issue: `${paretoData[0].defectType} defects account for ${paretoData[0].cumulativePercent}% of NCRs`,
                action: 'Focus corrective actions on this defect type for maximum impact'
            });
        }
        
        const passRate = parseFloat(metrics.passRate) || 100;
        if (passRate < 95) {
            recommendations.push({
                priority: 'high',
                issue: `First pass yield is ${metrics.passRate}`,
                action: 'Review inspection criteria and process controls'
            });
        }
        
        return recommendations;
    },
    
    runSelfTests: function() {
        console.log('[REPORTING_ENGINE] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const d = this.generateDashboard();
            if (d.timestamp && d.summary && d.kpis) { results.passed++; results.tests.push({ name: 'Dashboard', status: 'PASS' }); }
            else throw new Error('Invalid dashboard');
        } catch (e) { results.failed++; results.tests.push({ name: 'Dashboard', status: 'FAIL', error: e.message }); }
        
        try {
            const r = this.generateProductionReport('daily');
            if (r.period && r.summary) { results.passed++; results.tests.push({ name: 'Production Report', status: 'PASS' }); }
            else throw new Error('Invalid report');
        } catch (e) { results.failed++; results.tests.push({ name: 'Production Report', status: 'FAIL', error: e.message }); }
        
        try {
            const r = this.generateQualityReport();
            if (r.summary && r.paretoAnalysis) { results.passed++; results.tests.push({ name: 'Quality Report', status: 'PASS' }); }
            else throw new Error('Invalid report');
        } catch (e) { results.failed++; results.tests.push({ name: 'Quality Report', status: 'FAIL', error: e.message }); }
        
        try {
            const r = this.generateFinancialSummary();
            if (r.revenue && r.quoting) { results.passed++; results.tests.push({ name: 'Financial Summary', status: 'PASS' }); }
            else throw new Error('Invalid report');
        } catch (e) { results.failed++; results.tests.push({ name: 'Financial Summary', status: 'FAIL', error: e.message }); }
        
        console.log('[REPORTING_ENGINE] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
}