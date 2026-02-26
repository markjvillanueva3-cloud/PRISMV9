const PRISM_OPERATION_PARAM_DATABASE = {
    version: '1.0.0',

    // Parameters by material and operation type
    params: {
        'aluminum': {
            roughing: { docMult: 1.5, wocMult: 0.5, feedMult: 1.2, speedMult: 1.0 },
            finishing: { docMult: 0.1, wocMult: 0.7, feedMult: 0.8, speedMult: 1.1 },
            pocket: { docMult: 1.0, wocMult: 0.4, feedMult: 1.0, speedMult: 1.0 },
            contour: { docMult: 0.5, wocMult: 1.0, feedMult: 0.9, speedMult: 1.0 },
            drilling: { feedMult: 1.0, speedMult: 1.0, peckMult: 3.0 },
            slot: { docMult: 0.5, wocMult: 1.0, feedMult: 0.7, speedMult: 0.9 }
        },
        'steel': {
            roughing: { docMult: 1.0, wocMult: 0.4, feedMult: 1.0, speedMult: 1.0 },
            finishing: { docMult: 0.05, wocMult: 0.6, feedMult: 0.7, speedMult: 1.1 },
            pocket: { docMult: 0.75, wocMult: 0.35, feedMult: 0.9, speedMult: 1.0 },
            contour: { docMult: 0.4, wocMult: 1.0, feedMult: 0.8, speedMult: 1.0 },
            drilling: { feedMult: 0.8, speedMult: 0.9, peckMult: 2.0 },
            slot: { docMult: 0.3, wocMult: 1.0, feedMult: 0.6, speedMult: 0.85 }
        },
        'stainless': {
            roughing: { docMult: 0.8, wocMult: 0.35, feedMult: 0.8, speedMult: 0.8 },
            finishing: { docMult: 0.03, wocMult: 0.5, feedMult: 0.6, speedMult: 0.9 },
            pocket: { docMult: 0.6, wocMult: 0.3, feedMult: 0.7, speedMult: 0.8 },
            contour: { docMult: 0.3, wocMult: 1.0, feedMult: 0.65, speedMult: 0.85 },
            drilling: { feedMult: 0.6, speedMult: 0.7, peckMult: 1.5 },
            slot: { docMult: 0.25, wocMult: 1.0, feedMult: 0.5, speedMult: 0.75 }
        },
        'titanium': {
            roughing: { docMult: 0.6, wocMult: 0.25, feedMult: 0.6, speedMult: 0.5 },
            finishing: { docMult: 0.02, wocMult: 0.4, feedMult: 0.5, speedMult: 0.6 },
            pocket: { docMult: 0.5, wocMult: 0.2, feedMult: 0.55, speedMult: 0.5 },
            contour: { docMult: 0.25, wocMult: 1.0, feedMult: 0.5, speedMult: 0.55 },
            drilling: { feedMult: 0.4, speedMult: 0.4, peckMult: 1.0 },
            slot: { docMult: 0.2, wocMult: 1.0, feedMult: 0.4, speedMult: 0.5 }
        },
        'inconel': {
            roughing: { docMult: 0.4, wocMult: 0.2, feedMult: 0.4, speedMult: 0.3 },
            finishing: { docMult: 0.015, wocMult: 0.3, feedMult: 0.35, speedMult: 0.4 },
            pocket: { docMult: 0.3, wocMult: 0.15, feedMult: 0.35, speedMult: 0.3 },
            contour: { docMult: 0.15, wocMult: 1.0, feedMult: 0.3, speedMult: 0.35 },
            drilling: { feedMult: 0.25, speedMult: 0.25, peckMult: 0.5 },
            slot: { docMult: 0.15, wocMult: 1.0, feedMult: 0.25, speedMult: 0.3 }
        }
    },
    /**
     * Get operation parameters for material and operation type
     */
    getParams(material, operationType, tool) {
        const matKey = this._getMaterialKey(material);
        const opKey = this._getOperationKey(operationType);

        const matParams = this.params[matKey] || this.params['steel'];
        const opParams = matParams[opKey] || matParams['roughing'];

        // Calculate actual values based on tool
        const toolDia = tool?.diameter || 0.5;

        return {
            doc: toolDia * opParams.docMult,
            woc: toolDia * opParams.wocMult,
            feedMult: opParams.feedMult,
            speedMult: opParams.speedMult,
            peckDepth: opParams.peckMult ? toolDia * opParams.peckMult : undefined,
            source: `${matKey}/${opKey}`
        };
    },
    _getMaterialKey(material) {
        const mat = (material || 'steel').toLowerCase();
        if (mat.includes('aluminum') || mat.includes('alum')) return 'aluminum';
        if (mat.includes('stainless') || mat.includes('ss')) return 'stainless';
        if (mat.includes('titanium') || mat.includes('ti6al')) return 'titanium';
        if (mat.includes('inconel') || mat.includes('hastelloy')) return 'inconel';
        return 'steel';
    },
    _getOperationKey(opType) {
        const op = (opType || 'roughing').toLowerCase();
        if (op.includes('rough')) return 'roughing';
        if (op.includes('finish')) return 'finishing';
        if (op.includes('pocket')) return 'pocket';
        if (op.includes('contour') || op.includes('profile')) return 'contour';
        if (op.includes('drill')) return 'drilling';
        if (op.includes('slot')) return 'slot';
        return 'roughing';
    }
}