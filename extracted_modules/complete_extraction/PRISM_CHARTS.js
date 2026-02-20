const PRISM_CHARTS = {
    // Simple SVG-based charts
    createBarChart(container, data, options = {}) {
        const { width = 400, height = 200, barColor = '#2196F3', gap = 4 } = options;
        const maxValue = Math.max(...data.map(d => d.value));
        const barWidth = (width - gap * (data.length - 1)) / data.length;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Bar chart');
        
        data.forEach((d, i) => {
            const barHeight = (d.value / maxValue) * (height - 20);
            const x = i * (barWidth + gap);
            const y = height - barHeight - 20;
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', barColor);
            rect.setAttribute('rx', 2);
            
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${d.label}: ${d.value}`;
            rect.appendChild(title);
            
            svg.appendChild(rect);
            
            // Label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x + barWidth / 2);
            text.setAttribute('y', height - 5);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.textContent = d.label;
            svg.appendChild(text);
        });
        
        container.appendChild(svg);
        return svg;
    },
    
    createLineChart(container, data, options = {}) {
        const { width = 400, height = 200, lineColor = '#2196F3', showPoints = true } = options;
        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const range = maxValue - minValue || 1;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        
        const padding = 20;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        const points = data.map((d, i) => ({
            x: padding + (i / (data.length - 1)) * chartWidth,
            y: padding + chartHeight - ((d.value - minValue) / range) * chartHeight
        }));
        
        // Line path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', lineColor);
        path.setAttribute('stroke-width', 2);
        svg.appendChild(path);
        
        // Points
        if (showPoints) {
            points.forEach((p, i) => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', p.x);
                circle.setAttribute('cy', p.y);
                circle.setAttribute('r', 4);
                circle.setAttribute('fill', lineColor);
                
                const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                title.textContent = `${data[i].label}: ${data[i].value}`;
                circle.appendChild(title);
                
                svg.appendChild(circle);
            });
        }
        
        container.appendChild(svg);
        return svg;
    },
    
    createSparkline(container, values, options = {}) {
        const { width = 100, height = 30, color = '#2196F3' } = options;
        const max = Math.max(...values);
        const min = Math.min(...values);
        const range = max - min || 1;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        
        const points = values.map((v, i) => 
            `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * height}`
        ).join(' ');
        
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', points);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', color);
        polyline.setAttribute('stroke-width', 1.5);
        
        svg.appendChild(polyline);
        container.appendChild(svg);
        return svg;
    },
    
    createGauge(container, value, max = 100, options = {}) {
        const { size = 120, color = '#2196F3', bgColor = '#E0E0E0', thickness = 10 } = options;
        const radius = (size - thickness) / 2;
        const circumference = radius * Math.PI; // Half circle
        const progress = (value / max) * circumference;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size / 2 + 10);
        svg.setAttribute('viewBox', `0 0 ${size} ${size / 2 + 10}`);
        
        // Background arc
        const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bgPath.setAttribute('d', `M ${thickness/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - thickness/2} ${size/2}`);
        bgPath.setAttribute('fill', 'none');
        bgPath.setAttribute('stroke', bgColor);
        bgPath.setAttribute('stroke-width', thickness);
        bgPath.setAttribute('stroke-linecap', 'round');
        svg.appendChild(bgPath);
        
        // Value arc
        const valuePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        valuePath.setAttribute('d', `M ${thickness/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - thickness/2} ${size/2}`);
        valuePath.setAttribute('fill', 'none');
        valuePath.setAttribute('stroke', color);
        valuePath.setAttribute('stroke-width', thickness);
        valuePath.setAttribute('stroke-linecap', 'round');
        valuePath.setAttribute('stroke-dasharray', `${progress} ${circumference}`);
        svg.appendChild(valuePath);
        
        // Value text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', size / 2);
        text.setAttribute('y', size / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '20');
        text.setAttribute('font-weight', 'bold');
        text.textContent = Math.round(value);
        svg.appendChild(text);
        
        container.appendChild(svg);
        return svg;
    }
}