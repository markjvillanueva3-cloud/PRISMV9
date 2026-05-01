const PRISM_INVENTORY_ENGINE = {

    version: '1.0.0',

    /**
     * Economic Order Quantity (EOQ)
     */
    calculateEOQ: function(params) {
        const { annualDemand, orderCost, holdingCostPerUnit } = params;

        const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
        const ordersPerYear = annualDemand / eoq;
        const totalOrderCost = ordersPerYear * orderCost;
        const avgInventory = eoq / 2;
        const totalHoldingCost = avgInventory * holdingCostPerUnit;
        const totalCost = totalOrderCost + totalHoldingCost;

        return {
            eoq: Math.round(eoq),
            ordersPerYear: ordersPerYear.toFixed(1),
            orderInterval: (365 / ordersPerYear).toFixed(0) + ' days',
            costs: {
                totalAnnual: '$' + totalCost.toFixed(2),
                ordering: '$' + totalOrderCost.toFixed(2),
                holding: '$' + totalHoldingCost.toFixed(2)
            }
        };
    },
    /**
     * Safety Stock Calculation
     */
    calculateSafetyStock: function(params) {
        const {
            avgDemand,
            demandStdDev,
            avgLeadTime,
            leadTimeStdDev = 0,
            serviceLevel = 0.95
        } = params;

        // Z-score for service level
        const zScores = { 0.90: 1.28, 0.95: 1.65, 0.99: 2.33 };
        const z = zScores[serviceLevel] || 1.65;

        // Safety stock formula considering both demand and lead time variability
        const demandVariability = Math.sqrt(avgLeadTime) * demandStdDev;
        const leadTimeVariability = avgDemand * leadTimeStdDev;
        const combinedStdDev = Math.sqrt(Math.pow(demandVariability, 2) + Math.pow(leadTimeVariability, 2));

        const safetyStock = z * combinedStdDev;

        return {
            safetyStock: Math.ceil(safetyStock),
            reorderPoint: Math.ceil(avgDemand * avgLeadTime + safetyStock),
            serviceLevel: (serviceLevel * 100) + '%',
            formula: 'Safety Stock = Z × √(LT × σd² + d² × σLT²)'
        };
    },
    /**
     * ABC Classification
     */
    classifyABC: function(items) {
        // Calculate annual value for each item
        const itemsWithValue = items.map(item => ({
            ...item,
            annualValue: (item.annualUsage || 0) * (item.unitCost || 0)
        }));

        // Sort by annual value descending
        itemsWithValue.sort((a, b) => b.annualValue - a.annualValue);

        // Calculate total value
        const totalValue = itemsWithValue.reduce((sum, item) => sum + item.annualValue, 0);

        // Classify items
        let cumulativePercent = 0;
        const classified = itemsWithValue.map(item => {
            const percent = item.annualValue / totalValue;
            cumulativePercent += percent;

            let classification;
            if (cumulativePercent <= 0.80) classification = 'A';
            else if (cumulativePercent <= 0.95) classification = 'B';
            else classification = 'C';

            return {
                ...item,
                percentOfValue: (percent * 100).toFixed(2) + '%',
                cumulativePercent: (cumulativePercent * 100).toFixed(2) + '%',
                classification
            };
        });

        // Summary
        const summary = {
            A: { count: 0, value: 0 },
            B: { count: 0, value: 0 },
            C: { count: 0, value: 0 }
        };
        classified.forEach(item => {
            summary[item.classification].count++;
            summary[item.classification].value += item.annualValue;
        });

        return {
            items: classified,
            summary: {
                A: {
                    items: summary.A.count,
                    percentItems: ((summary.A.count / items.length) * 100).toFixed(1) + '%',
                    percentValue: ((summary.A.value / totalValue) * 100).toFixed(1) + '%'
                },
                B: {
                    items: summary.B.count,
                    percentItems: ((summary.B.count / items.length) * 100).toFixed(1) + '%',
                    percentValue: ((summary.B.value / totalValue) * 100).toFixed(1) + '%'
                },
                C: {
                    items: summary.C.count,
                    percentItems: ((summary.C.count / items.length) * 100).toFixed(1) + '%',
                    percentValue: ((summary.C.value / totalValue) * 100).toFixed(1) + '%'
                }
            }
        };
    },
    /**
     * Tool Inventory Optimization
     */
    optimizeToolInventory: function(tools) {
        return tools.map(tool => {
            const eoq = this.calculateEOQ({
                annualDemand: tool.annualUsage,
                orderCost: tool.orderCost || 25,
                holdingCostPerUnit: tool.unitCost * 0.25 // 25% holding cost
            });

            const safety = this.calculateSafetyStock({
                avgDemand: tool.annualUsage / 52, // Weekly demand
                demandStdDev: tool.demandVariability || tool.annualUsage * 0.1 / 52,
                avgLeadTime: tool.leadTimeWeeks || 2
            });

            return {
                tool: tool.name || tool.id,
                eoq: eoq.eoq,
                safetyStock: safety.safetyStock,
                reorderPoint: safety.reorderPoint,
                minStock: safety.safetyStock,
                maxStock: eoq.eoq + safety.safetyStock
            };
        });
    }
}