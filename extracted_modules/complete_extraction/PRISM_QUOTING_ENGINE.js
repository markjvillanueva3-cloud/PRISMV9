const PRISM_QUOTING_ENGINE = {

    version: '1.0.0',

    // Markup and margin targets
    defaultPricing: {
        targetMargin: 0.35,           // 35% gross margin target
        minMargin: 0.20,              // 20% minimum margin
        rushMultiplier: 1.5,          // 50% premium for rush jobs
        prototypeMultiplier: 1.25,    // 25% premium for prototypes
        repeatOrderDiscount: 0.10,    // 10% discount for repeat orders
        volumeDiscountTiers: [
            { minQty: 100, discount: 0.05 },
            { minQty: 500, discount: 0.10 },
            { minQty: 1000, discount: 0.15 },
            { minQty: 5000, discount: 0.20 }
        ]
    },
    /**
     * Generate complete quote
     */
    generateQuote: function(jobSpec, options = {}) {
        // Get base costs
        const costs = PRISM_JOB_COSTING_ENGINE.calculateJobCost(jobSpec);

        // Determine pricing multipliers
        const multipliers = this._calculateMultipliers(jobSpec, options);

        // Calculate base price with margin
        const targetMargin = options.targetMargin || this.defaultPricing.targetMargin;
        const basePrice = costs.total / (1 - targetMargin);

        // Apply multipliers
        let adjustedPrice = basePrice * multipliers.total;

        // Apply volume discount
        const volumeDiscount = this._getVolumeDiscount(jobSpec.quantity);
        adjustedPrice *= (1 - volumeDiscount);

        // Round to appropriate precision
        const finalPrice = this._roundPrice(adjustedPrice);
        const pricePerPart = this._roundPrice(finalPrice / (jobSpec.quantity || 1));

        // Calculate actual margin
        const actualMargin = (finalPrice - costs.total) / finalPrice;

        // Generate quote document
        const quote = {
            quoteNumber: this._generateQuoteNumber(),
            date: new Date().toISOString().split('T')[0],
            validUntil: this._getValidUntilDate(options.validDays || 30),

            customer: options.customer || {},

            jobSummary: {
                partName: jobSpec.partName || 'Custom Part',
                partNumber: jobSpec.partNumber || 'N/A',
                quantity: jobSpec.quantity || 1,
                material: jobSpec.material?.type || 'Unknown',
                complexity: jobSpec.complexity || 'medium'
            },
            pricing: {
                unitPrice: pricePerPart,
                totalPrice: finalPrice,

                breakdown: {
                    baseCost: costs.total,
                    margin: (finalPrice - costs.total),
                    marginPercent: (actualMargin * 100).toFixed(1) + '%'
                },
                adjustments: {
                    rushPremium: multipliers.rush > 1 ? `+${((multipliers.rush - 1) * 100).toFixed(0)}%` : null,
                    prototypePremium: multipliers.prototype > 1 ? `+${((multipliers.prototype - 1) * 100).toFixed(0)}%` : null,
                    repeatDiscount: multipliers.repeat < 1 ? `-${((1 - multipliers.repeat) * 100).toFixed(0)}%` : null,
                    volumeDiscount: volumeDiscount > 0 ? `-${(volumeDiscount * 100).toFixed(0)}%` : null
                }
            },
            leadTime: this._calculateLeadTime(jobSpec, options),

            costBreakdown: {
                material: costs.material.cost,
                machining: costs.machining.cost,
                setup: costs.setup.cost,
                programming: costs.programming.cost,
                inspection: costs.inspection.cost,
                finishing: costs.finishing.cost,
                overhead: costs.overhead.cost
            },
            terms: {
                payment: options.paymentTerms || 'Net 30',
                delivery: options.deliveryTerms || 'FOB Origin',
                warranty: '90 days workmanship guarantee'
            },
            notes: this._generateNotes(jobSpec, options)
        };
        return quote;
    },
    _calculateMultipliers: function(jobSpec, options) {
        let rushMultiplier = 1.0;
        let prototypeMultiplier = 1.0;
        let repeatMultiplier = 1.0;

        // Rush job
        if (options.rush || jobSpec.rush) {
            rushMultiplier = this.defaultPricing.rushMultiplier;
        }
        // Prototype
        if (jobSpec.quantity === 1 || options.prototype) {
            prototypeMultiplier = this.defaultPricing.prototypeMultiplier;
        }
        // Repeat order
        if (options.repeatOrder) {
            repeatMultiplier = 1 - this.defaultPricing.repeatOrderDiscount;
        }
        return {
            rush: rushMultiplier,
            prototype: prototypeMultiplier,
            repeat: repeatMultiplier,
            total: rushMultiplier * prototypeMultiplier * repeatMultiplier
        };
    },
    _getVolumeDiscount: function(quantity) {
        const tiers = this.defaultPricing.volumeDiscountTiers;
        for (let i = tiers.length - 1; i >= 0; i--) {
            if (quantity >= tiers[i].minQty) {
                return tiers[i].discount;
            }
        }
        return 0;
    },
    _roundPrice: function(price) {
        if (price < 100) return Math.ceil(price * 100) / 100;
        if (price < 1000) return Math.ceil(price / 5) * 5;
        return Math.ceil(price / 10) * 10;
    },
    _generateQuoteNumber: function() {
        const prefix = 'Q';
        const year = new Date().getFullYear().toString().slice(-2);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}${year}-${random}`;
    },
    _getValidUntilDate: function(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    },
    _calculateLeadTime: function(jobSpec, options) {
        const quantity = jobSpec.quantity || 1;
        const complexity = jobSpec.complexity || 'medium';

        // Base lead time by complexity
        const baseDays = {
            'simple': 5,
            'medium': 10,
            'complex': 15,
            'very_complex': 25
        }[complexity] || 10;

        // Add time for quantity
        const qtyDays = Math.ceil(quantity / 50) * 2;

        // Add time for finishing
        const finishDays = (jobSpec.finishingOperations?.length || 0) * 3;

        const totalDays = baseDays + qtyDays + finishDays;

        return {
            standard: totalDays,
            rush: Math.ceil(totalDays * 0.5),
            unit: 'business days'
        };
    },
    _generateNotes: function(jobSpec, options) {
        const notes = [];

        if (jobSpec.material?.customerSupplied) {
            notes.push('Material to be supplied by customer');
        }
        if (jobSpec.firstArticleRequired) {
            notes.push('First article inspection included');
        }
        if (jobSpec.certifications?.length) {
            notes.push(`Certifications required: ${jobSpec.certifications.join(', ')}`);
        }
        if (options.notes) {
            notes.push(options.notes);
        }
        return notes;
    },
    /**
     * Calculate price breaks for multiple quantities
     */
    generatePriceBreaks: function(jobSpec, quantities = [1, 10, 25, 50, 100, 250, 500]) {
        const priceBreaks = [];

        quantities.forEach(qty => {
            const spec = { ...jobSpec, quantity: qty };
            const quote = this.generateQuote(spec);
            priceBreaks.push({
                quantity: qty,
                unitPrice: quote.pricing.unitPrice,
                totalPrice: quote.pricing.totalPrice,
                leadTime: quote.leadTime.standard
            });
        });

        return priceBreaks;
    }
}