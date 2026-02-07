// ====================================================================
// CONFIGURATION - Update these values as needed
// ====================================================================

// Data: Add or modify your data here
const DATA = [
    { year: 1975, subdelta: "North Athabasca", houseCount: 42 },
    { year: 1976, subdelta: "North Athabasca", houseCount: 45.57 },
    { year: 1999, subdelta: "North Athabasca", houseCount: 115.38 },
    { year: 2015, subdelta: "North Athabasca", houseCount: 233 },
    { year: 2016, subdelta: "North Athabasca", houseCount: 34 },
    { year: 2021, subdelta: "North Athabasca", houseCount: 22.5 },
    { year: 2022, subdelta: "North Athabasca", houseCount: 48.75 },
    { year: 1975, subdelta: "Peace", houseCount: 157.25 },
    { year: 1976, subdelta: "Peace", houseCount: 191.25 },
    { year: 1999, subdelta: "Peace", houseCount: 212.3 },
    { year: 2015, subdelta: "Peace", houseCount: 19.6 },
    { year: 2016, subdelta: "Peace", houseCount: 2 },
    { year: 2021, subdelta: "Peace", houseCount: 81.75 },
    { year: 2022, subdelta: "Peace", houseCount: 232.2 },
    { year: 2015, subdelta: "East Athabasca", houseCount: 93.8 },
    { year: 2016, subdelta: "East Athabasca", houseCount: 0.5 },
    { year: 2021, subdelta: "East Athabasca", houseCount: 47 },
    { year: 2022, subdelta: "East Athabasca", houseCount: 4.7 },
    { year: 2015, subdelta: "West Athabasca", houseCount: 69.8 },
    { year: 2016, subdelta: "West Athabasca", houseCount: 1 },
    { year: 2021, subdelta: "West Athabasca", houseCount: 0 },
    // { year: 2022, subdelta: "West Athabasca", houseCount: null }, // Skip missing data
    { year: 2015, subdelta: "Birch", houseCount: 194 },
    { year: 2016, subdelta: "Birch", houseCount: 31 },
    { year: 2021, subdelta: "Birch", houseCount: 1.5 },
    { year: 2022, subdelta: "Birch", houseCount: 4 }
];

// Initial threshold percentile (0-100)
const INITIAL_THRESHOLD_PERCENTILE = 50;

// Chart colors
const LINE_COLOR = "#4a90e2";
const POINT_COLOR = "#4a90e2";
const THRESHOLD_COLOR = "#e74c3c";
const AXIS_COLOR = "#999";
const TEXT_COLOR = "#333";

// ====================================================================
// APPLICATION CODE
// ====================================================================

let canvas, ctx;
let currentSubdelta;
let filteredData = [];
let thresholdValue;
let isDragging = false;
let chartArea = {};
let hoveredPoint = null;

function init() {
    canvas = document.getElementById('chart');
    ctx = canvas.getContext('2d');
    
    // Set up canvas size
    resizeCanvas();
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawChart();
    });
    
    // Populate sub-delta dropdown
    const subdeltas = [...new Set(DATA.map(d => d.subdelta))];
    const select = document.getElementById('subdeltaSelect');
    subdeltas.forEach(subdelta => {
        const option = document.createElement('option');
        option.value = subdelta;
        option.textContent = subdelta;
        select.appendChild(option);
    });
    
    // Set initial sub-delta
    currentSubdelta = subdeltas[0];
    select.value = currentSubdelta;
    
    // Event listeners
    select.addEventListener('change', (e) => {
        currentSubdelta = e.target.value;
        filterData();
        setInitialThreshold();
        drawChart();
        updateStatistics();
    });
    
    document.getElementById('thresholdInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const value = parseInt(e.target.value);
            if (!isNaN(value)) {
                const min = Math.min(...filteredData.map(d => Math.round(d.houseCount)));
                const max = Math.max(...filteredData.map(d => Math.round(d.houseCount)));
                thresholdValue = Math.max(min, Math.min(max, value));
                drawChart();
                updateStatistics();
            }
        }
    });
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    
    // Initialize
    filterData();
    setInitialThreshold();
    drawChart();
    updateStatistics();
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 30;
    canvas.height = container.clientHeight - 30;
}

function filterData() {
    filteredData = DATA.filter(d => 
        d.subdelta === currentSubdelta && 
        d.houseCount !== null && 
        d.houseCount !== undefined && 
        d.houseCount !== ''
    ).sort((a, b) => a.year - b.year);
}

function setInitialThreshold() {
    const sorted = [...filteredData].map(d => Math.round(d.houseCount)).sort((a, b) => a - b);
    const index = Math.floor(sorted.length * INITIAL_THRESHOLD_PERCENTILE / 100);
    thresholdValue = sorted[Math.min(index, sorted.length - 1)];
}

function calculatePercentile(value) {
    const sorted = [...filteredData].map(d => Math.round(d.houseCount)).sort((a, b) => a - b);
    const totalCount = sorted.length;
    const maxValue = Math.max(...sorted);
    
    // If at max value, return 100th percentile
    if (value >= maxValue) {
        return 100;
    }
    
    let countBelow = 0;
    
    for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] < value) {
            countBelow++;
        }
    }
    
    // Calculate percentile: percentage of values that are below the threshold
    const percentile = (countBelow / totalCount) * 100;
    
    return Math.round(percentile);
}

function drawChart() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (filteredData.length === 0) {
        ctx.fillStyle = TEXT_COLOR;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Calculate chart area
    const padding = { top: 30, right: 40, bottom: 50, left: 70 };
    chartArea = {
        x: padding.left,
        y: padding.top,
        width: canvas.width - padding.left - padding.right,
        height: canvas.height - padding.top - padding.bottom
    };
    
    // Get data ranges - round all values
    const houseCounts = filteredData.map(d => Math.round(d.houseCount));
    const minCount = Math.min(...houseCounts);
    const maxCount = Math.max(...houseCounts);
    
    // Add some padding to the y-axis range
    const yPadding = (maxCount - minCount) * 0.1;
    const yMin = Math.max(0, Math.floor(minCount - yPadding));
    const yMax = Math.ceil(maxCount + yPadding);
    
    // Helper functions - evenly space x-axis
    function scaleX(index) {
        return chartArea.x + (index / (filteredData.length - 1)) * chartArea.width;
    }
    
    function scaleY(count) {
        return chartArea.y + chartArea.height - ((count - yMin) / (yMax - yMin)) * chartArea.height;
    }
    
    // Draw axes
    ctx.strokeStyle = AXIS_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(chartArea.x, chartArea.y);
    ctx.lineTo(chartArea.x, chartArea.y + chartArea.height);
    ctx.lineTo(chartArea.x + chartArea.width, chartArea.y + chartArea.height);
    ctx.stroke();
    
    // Draw y-axis labels with larger font
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
        const value = yMin + (yMax - yMin) * (i / yTicks);
        const y = scaleY(value);
        ctx.fillText(Math.round(value), chartArea.x - 10, y);
    }
    
    // Y-axis label with larger font
    ctx.save();
    ctx.translate(15, chartArea.y + chartArea.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Average House Count', 0, 0);
    ctx.restore();
    
    // Draw x-axis labels (years) with larger font, evenly spaced
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    filteredData.forEach((d, i) => {
        const x = scaleX(i);
        ctx.fillText(d.year, x, chartArea.y + chartArea.height + 10);
    });
    
    // Draw points only (no connecting lines)
    ctx.fillStyle = POINT_COLOR;
    filteredData.forEach((d, i) => {
        const x = scaleX(i);
        const y = scaleY(Math.round(d.houseCount));
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw threshold line
    const thresholdY = scaleY(thresholdValue);
    ctx.strokeStyle = THRESHOLD_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(chartArea.x, thresholdY);
    ctx.lineTo(chartArea.x + chartArea.width, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw threshold label
    ctx.fillStyle = THRESHOLD_COLOR;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Threshold: ${thresholdValue}`, chartArea.x + 5, thresholdY - 5);
    
    // Draw hover tooltip if hovering over a point
    if (hoveredPoint !== null) {
        const d = filteredData[hoveredPoint];
        const x = scaleX(hoveredPoint);
        const y = scaleY(Math.round(d.houseCount));
        
        // Draw tooltip background
        const tooltipText = `${d.year}: ${Math.round(d.houseCount)}`;
        ctx.font = 'bold 14px sans-serif';
        const textWidth = ctx.measureText(tooltipText).width;
        const tooltipX = x - textWidth / 2 - 8;
        const tooltipY = y - 35;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(tooltipX, tooltipY, textWidth + 16, 24);
        
        // Draw tooltip text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tooltipText, x, tooltipY + 12);
        
        // Highlight the point
        ctx.fillStyle = THRESHOLD_COLOR;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Update threshold input and percentile display
    document.getElementById('thresholdInput').value = thresholdValue;
    const percentile = calculatePercentile(thresholdValue);
    document.getElementById('percentileDisplay').textContent = `(${percentile}th percentile)`;
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    const houseCounts = filteredData.map(d => Math.round(d.houseCount));
    const minCount = Math.min(...houseCounts);
    const maxCount = Math.max(...houseCounts);
    const yPadding = (maxCount - minCount) * 0.1;
    const yMin = Math.max(0, Math.floor(minCount - yPadding));
    const yMax = Math.ceil(maxCount + yPadding);
    
    function scaleY(count) {
        return chartArea.y + chartArea.height - ((count - yMin) / (yMax - yMin)) * chartArea.height;
    }
    
    const thresholdY = scaleY(thresholdValue);
    
    // Check if click is near threshold line
    if (Math.abs(mouseY - thresholdY) < 10 && 
        e.clientX - rect.left >= chartArea.x && 
        e.clientX - rect.left <= chartArea.x + chartArea.width) {
        isDragging = true;
        canvas.style.cursor = 'ns-resize';
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (isDragging) {
        const houseCounts = filteredData.map(d => Math.round(d.houseCount));
        const minCount = Math.min(...houseCounts);
        const maxCount = Math.max(...houseCounts);
        const yPadding = (maxCount - minCount) * 0.1;
        const yMin = Math.max(0, Math.floor(minCount - yPadding));
        const yMax = Math.ceil(maxCount + yPadding);
        
        // Convert mouse Y to data value
        const normalizedY = (chartArea.y + chartArea.height - mouseY) / chartArea.height;
        const newValue = yMin + normalizedY * (yMax - yMin);
        
        // Clamp to data range and round
        thresholdValue = Math.round(Math.max(minCount, Math.min(maxCount, newValue)));
        
        drawChart();
        updateStatistics();
    } else {
        // Check for hover over points
        let foundHover = false;
        filteredData.forEach((d, i) => {
            const houseCounts = filteredData.map(d => Math.round(d.houseCount));
            const minCount = Math.min(...houseCounts);
            const maxCount = Math.max(...houseCounts);
            const yPadding = (maxCount - minCount) * 0.1;
            const yMin = Math.max(0, Math.floor(minCount - yPadding));
            const yMax = Math.ceil(maxCount + yPadding);
            
            function scaleX(index) {
                return chartArea.x + (index / (filteredData.length - 1)) * chartArea.width;
            }
            
            function scaleY(count) {
                return chartArea.y + chartArea.height - ((count - yMin) / (yMax - yMin)) * chartArea.height;
            }
            
            const x = scaleX(i);
            const y = scaleY(Math.round(d.houseCount));
            const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
            
            if (distance < 10) {
                hoveredPoint = i;
                foundHover = true;
            }
        });
        
        if (!foundHover) {
            hoveredPoint = null;
        }
        
        // Change cursor when hovering over threshold line
        const houseCounts = filteredData.map(d => Math.round(d.houseCount));
        const minCount = Math.min(...houseCounts);
        const maxCount = Math.max(...houseCounts);
        const yPadding = (maxCount - minCount) * 0.1;
        const yMin = Math.max(0, Math.floor(minCount - yPadding));
        const yMax = Math.ceil(maxCount + yPadding);
        
        function scaleY(count) {
            return chartArea.y + chartArea.height - ((count - yMin) / (yMax - yMin)) * chartArea.height;
        }
        
        const thresholdY = scaleY(thresholdValue);
        
        if (Math.abs(mouseY - thresholdY) < 10 && 
            mouseX >= chartArea.x && 
            mouseX <= chartArea.x + chartArea.width) {
            canvas.style.cursor = 'ns-resize';
        } else if (hoveredPoint !== null) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'crosshair';
        }
        
        drawChart();
    }
}

function handleMouseUp() {
    isDragging = false;
    canvas.style.cursor = 'crosshair';
}

function updateStatistics() {
    const roundedCounts = filteredData.map(d => Math.round(d.houseCount));
    const minValue = Math.min(...roundedCounts);
    
    let above, below;
    
    // If threshold is at minimum, all points are above (none below or equal)
    if (thresholdValue <= minValue) {
        above = roundedCounts.length;
        below = 0;
    } else {
        above = roundedCounts.filter(count => count > thresholdValue).length;
        below = roundedCounts.filter(count => count <= thresholdValue).length;
    }
    
    const total = filteredData.length;
    
    document.getElementById('aboveCount').textContent = above;
    document.getElementById('abovePercentage').textContent = `${((above / total) * 100).toFixed(1)}%`;
    document.getElementById('belowCount').textContent = below;
    document.getElementById('belowPercentage').textContent = `${((below / total) * 100).toFixed(1)}%`;
}

// Initialize when page loads
window.addEventListener('load', init);
