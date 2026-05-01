const PRISM_STOCK_POSITIONS_DATABASE = {
    version: "1.0.0",
    source: "HyperMILL Stock Positions Reference",

    positions: {
        top: {
            TOP_CENTER: { x: 0.5, y: 0.5, z: 1.0, desc: "Top center" },
            TOP_CENTER_FRONT: { x: 0.5, y: 0, z: 1.0, desc: "Top center front" },
            TOP_CENTER_BACK: { x: 0.5, y: 1.0, z: 1.0, desc: "Top center back" },
            TOP_CENTER_LEFT: { x: 0, y: 0.5, z: 1.0, desc: "Top center left" },
            TOP_CENTER_RIGHT: { x: 1.0, y: 0.5, z: 1.0, desc: "Top center right" },
            TOP_LEFT_FRONT: { x: 0, y: 0, z: 1.0, desc: "Top left front corner" },
            TOP_LEFT_BACK: { x: 0, y: 1.0, z: 1.0, desc: "Top left back corner" },
            TOP_RIGHT_FRONT: { x: 1.0, y: 0, z: 1.0, desc: "Top right front corner" },
            TOP_RIGHT_BACK: { x: 1.0, y: 1.0, z: 1.0, desc: "Top right back corner" }
        },
        bottom: {
            BOTTOM_CENTER: { x: 0.5, y: 0.5, z: 0, desc: "Bottom center" },
            BOTTOM_CENTER_FRONT: { x: 0.5, y: 0, z: 0, desc: "Bottom center front" },
            BOTTOM_CENTER_BACK: { x: 0.5, y: 1.0, z: 0, desc: "Bottom center back" },
            BOTTOM_CENTER_LEFT: { x: 0, y: 0.5, z: 0, desc: "Bottom center left" },
            BOTTOM_CENTER_RIGHT: { x: 1.0, y: 0.5, z: 0, desc: "Bottom center right" },
            BOTTOM_LEFT_FRONT: { x: 0, y: 0, z: 0, desc: "Bottom left front corner" },
            BOTTOM_LEFT_BACK: { x: 0, y: 1.0, z: 0, desc: "Bottom left back corner" },
            BOTTOM_RIGHT_FRONT: { x: 1.0, y: 0, z: 0, desc: "Bottom right front corner" },
            BOTTOM_RIGHT_BACK: { x: 1.0, y: 1.0, z: 0, desc: "Bottom right back corner" }
        }
    },
    getStockPosition: function(positionName, stockBounds) {
        // Returns absolute position given stock bounds
        const pos = this.positions.top[positionName] || this.positions.bottom[positionName];
        if (!pos || !stockBounds) return null;
        return {
            x: stockBounds.minX + (stockBounds.maxX - stockBounds.minX) * pos.x,
            y: stockBounds.minY + (stockBounds.maxY - stockBounds.minY) * pos.y,
            z: stockBounds.minZ + (stockBounds.maxZ - stockBounds.minZ) * pos.z
        };
    }
}