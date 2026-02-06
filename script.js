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
let tooltip = null;

function init() {
    canvas = document.getElementById('chart');
    ctx = canvas.getContext('2d');
    
    // Create tooltip element
    tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '13px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '1000';
    document.body.appendChild(tooltip);
    
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
    
    const thresholdInput = document.getElementById('thresholdInput');
    
    // Handle input changes
    thresholdInput.addEventListener('change', handleThresholdInput);
    thresholdInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            handleThresholdInput(e);
        }
    });
    
    function handleThresholdInput(e) {
        const value = parseFloat(e.target.value);
        const min = Math.min(...filteredData.map(d => d.houseCount));
        const max = Math.max(...filteredData.map(d => d.houseCount));
        
        if (isNaN(value) || e.target.value.trim() === '') {
            alert('Please enter a valid number');
            e.target.value = Math.round(thresholdValue);
            return;
        }
        
        if (value < min) {
            thresholdValue = min;
        } else if (value > max) {
            thresholdValue = max;
        } else {
            thresholdValue = value;
        }
        
        e.target.value = Math.round(thresholdValue);
        drawChart();
        updateStatistics();
    }
    
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
    canvas.width = container.clientWidth - 40;
    canvas.height = container.clientHeight - 40;
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
    const sorted = [...filteredData].sort((a, b) => a.houseCount - b.houseCount);
    const index = Math.floor(sorted.length * INITIAL_THRESHOLD_PERCENTILE / 100);
    thresholdValue = sorted[Math.min(index, sorted.length - 1)].houseCount;
}

function calculatePercentile(value) {
    const sorted = [...filteredData].sort((a, b) => a.houseCount - b.houseCount);
    const minValue = sorted[0].houseCount;
    const maxValue = sorted[sorted.length - 1].houseCount;
    
    // If at or below minimum, return 0
    if (value <= minValue) {
        return "0.0";
    }
    
    // If at or above maximum, return 100
    if (value >= maxValue) {
        return "100.0";
    }
    
    // Count values strictly less than the threshold
    let count = 0;
    for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].houseCount < value) {
            count++;
        }
    }
    return ((count / sorted.length) * 100).toFixed(1);
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
    
    // Calculate chart area with reduced padding
    const padding = { top: 30, right: 30, bottom: 35, left: 60 };
    chartArea = {
        x: padding.left,
        y: padding.top,
        width: canvas.width - padding.left - padding.right,
        height: canvas.height - padding.top - padding.bottom
    };
    
    // Get data ranges
    const years = filteredData.map(d => d.year);
    const houseCounts = filteredData.map(d => d.houseCount);
    const minCount = Math.min(...houseCounts);
    const maxCount = Math.max(...houseCounts);
    
    // Add some padding to the y-axis range
    const yPadding = (maxCount - minCount) * 0.1;
    const yMin = Math.max(0, minCount - yPadding);
    const yMax = maxCount + yPadding;
    
    // Helper functions - spread years evenly on x-axis
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
    
    // Draw y-axis labels with larger font and integer values
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
    
    // Draw x-axis labels with larger font - evenly spaced (removed Year label)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '14px sans-serif';
    filteredData.forEach((d, index) => {
        const x = scaleX(index);
        ctx.fillText(d.year, x, chartArea.y + chartArea.height + 10);
    });
    
    // Draw points only (no connecting lines)
    ctx.fillStyle = POINT_COLOR;
    filteredData.forEach((d, index) => {
        const x = scaleX(index);
        const y = scaleY(d.houseCount);
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
    
    // Draw threshold label with integer value
    ctx.fillStyle = THRESHOLD_COLOR;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Threshold: ${Math.round(thresholdValue)}`, chartArea.x + 5, thresholdY - 5);
    
    // Update threshold input and percentile display with integer value
    document.getElementById('thresholdInput').value = Math.round(thresholdValue);
    document.getElementById('percentileDisplay').textContent = `(${calculatePercentile(thresholdValue)}th percentile)`;
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const houseCounts = filteredData.map(d => d.houseCount);
    const minCount = Math.min(...houseCounts);
    const maxCount = Math.max(...houseCounts);
    const yPadding = (maxCount - minCount) * 0.1;
    const yMin = Math.max(0, minCount - yPadding);
    const yMax = maxCount + yPadding;
    
    function scaleY(count) {
        return chartArea.y + chartArea.height - ((count - yMin) / (yMax - yMin)) * chartArea.height;
    }
    
    const thresholdY = scaleY(thresholdValue);
    
    // Check if click is near threshold line (using cursor center)
    if (Math.abs(mouseY - thresholdY) < 15 && 
        mouseX >= chartArea.x && 
        mouseX <= chartArea.x + chartArea.width) {
        isDragging = true;
        canvas.style.cursor = 'ns-resize';
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (isDragging) {
        const houseCounts = filteredData.map(d => d.houseCount);
        const minCount = Math.min(...houseCounts);
        const maxCount = Math.max(...houseCounts);
        const yPadding = (maxCount - minCount) * 0.1;
        const yMin = Math.max(0, minCount - yPadding);
        const yMax = maxCount + yPadding;
        
        // Convert mouse Y to data value
        const normalizedY = (chartArea.y + chartArea.height - mouseY) / chartArea.height;
        const newValue = yMin + normalizedY * (yMax - yMin);
        
        // Clamp to data range
        thresholdValue = Math.max(minCount, Math.min(maxCount, newValue));
        
        drawChart();
        updateStatistics();
        tooltip.style.display = 'none';
    } else {
        // Check for point hover
        const houseCounts = filteredData.map(d => d.houseCount);
        const minCount = Math.min(...houseCounts);
        const maxCount = Math.max(...houseCounts);
        const yPadding = (maxCount - minCount) * 0.1;
        const yMin = Math.max(0, minCount - yPadding);
        const yMax = maxCount + yPadding;
        
        function scaleX(index) {
            return chartArea.x + (index / (filteredData.length - 1)) * chartArea.width;
        }
        
        function scaleY(count) {
            return chartArea.y + chartArea.height - ((count - yMin) / (yMax - yMin)) * chartArea.height;
        }
        
        const thresholdY = scaleY(thresholdValue);
        
        // Check for point hover with larger detection radius
        let foundPoint = false;
        for (let i = 0; i < filteredData.length; i++) {
            const x = scaleX(i);
            const y = scaleY(filteredData[i].houseCount);
            const distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));
            
            if (distance < 20) {  // Increased from 8 to 20 for easier hovering
                foundPoint = true;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY - 30) + 'px';
                tooltip.innerHTML = `<strong>${filteredData[i].year}</strong><br/>Count: ${Math.round(filteredData[i].houseCount)}`;
                canvas.style.cursor = 'pointer';
                break;
            }
        }
        
        if (!foundPoint) {
            tooltip.style.display = 'none';
            
            // Change cursor when hovering over threshold line (using cursor center)
            if (Math.abs(mouseY - thresholdY) < 15 && 
                mouseX >= chartArea.x && 
                mouseX <= chartArea.x + chartArea.width) {
                canvas.style.cursor = 'ns-resize';
            } else {
                canvas.style.cursor = 'crosshair';
            }
        }
    }
}

function handleMouseUp() {
    isDragging = false;
    canvas.style.cursor = 'crosshair';
}

function updateStatistics() {
    const minValue = Math.min(...filteredData.map(d => d.houseCount));
    const maxValue = Math.max(...filteredData.map(d => d.houseCount));
    
    let above, below;
    
    // If threshold is at or below minimum, all points are above
    if (thresholdValue <= minValue) {
        above = filteredData.length;
        below = 0;
    } 
    // If threshold is at or above maximum, all points are below or equal
    else if (thresholdValue >= maxValue) {
        above = 0;
        below = filteredData.length;
    } 
    // Normal case
    else {
        above = filteredData.filter(d => d.houseCount > thresholdValue).length;
        below = filteredData.filter(d => d.houseCount <= thresholdValue).length;
    }
    
    const total = filteredData.length;
    
    document.getElementById('aboveCount').textContent = above;
    document.getElementById('abovePercentage').textContent = `${((above / total) * 100).toFixed(1)}%`;
    document.getElementById('belowCount').textContent = below;
    document.getElementById('belowPercentage').textContent = `${((below / total) * 100).toFixed(1)}%`;
}

// Initialize when page loads
window.addEventListener('load', init);
