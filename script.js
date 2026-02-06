// ====================== DATA ======================
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
    { year: 2022, subdelta: "Peace", houseCount: 232.2 }
];

const INITIAL_THRESHOLD_PERCENTILE = 50;

let canvas, ctx;
let filteredData = [];
let currentSubdelta;
let thresholdValue;
let chartArea = {};
let isDragging = false;
let tooltip;

// ====================== INIT ======================
window.addEventListener("load", init);

function init() {
    canvas = document.getElementById("chart");
    ctx = canvas.getContext("2d");

    tooltip = document.createElement("div");
    tooltip.style.position = "absolute";
    tooltip.style.background = "rgba(0,0,0,0.8)";
    tooltip.style.color = "white";
    tooltip.style.padding = "6px 10px";
    tooltip.style.borderRadius = "4px";
    tooltip.style.fontSize = "13px";
    tooltip.style.pointerEvents = "none";
    tooltip.style.display = "none";
    document.body.appendChild(tooltip);

    resizeCanvas();
    window.addEventListener("resize", () => {
        resizeCanvas();
        drawChart();
    });

    const select = document.getElementById("subdeltaSelect");
    [...new Set(DATA.map(d => d.subdelta))].forEach(sd => {
        const opt = document.createElement("option");
        opt.value = sd;
        opt.textContent = sd;
        select.appendChild(opt);
    });

    currentSubdelta = select.value;
    select.addEventListener("change", e => {
        currentSubdelta = e.target.value;
        filterData();
        setInitialThreshold();
        drawChart();
        updateStatistics();
    });

    const thresholdInput = document.getElementById("thresholdInput");
    thresholdInput.addEventListener("input", handleThresholdInput);

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", () => isDragging = false);
    canvas.addEventListener("mouseleave", () => isDragging = false);

    filterData();
    setInitialThreshold();
    drawChart();
    updateStatistics();
}

// ====================== HELPERS ======================
function resizeCanvas() {
    const c = canvas.parentElement;
    canvas.width = c.clientWidth - 16;
    canvas.height = c.clientHeight - 16;
}

function filterData() {
    filteredData = DATA.filter(d => d.subdelta === currentSubdelta)
        .sort((a, b) => a.year - b.year);
}

function setInitialThreshold() {
    const sorted = [...filteredData].sort((a, b) => a.houseCount - b.houseCount);
    const i = Math.floor(sorted.length * INITIAL_THRESHOLD_PERCENTILE / 100);
    thresholdValue = sorted[Math.min(i, sorted.length - 1)].houseCount;
}

function handleThresholdInput(e) {
    thresholdValue = parseFloat(e.target.value);
    drawChart();
    updateStatistics();
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// ====================== DRAW ======================
function drawChart() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = { top: 30, right: 30, bottom: 40, left: 60 };
    chartArea = {
        x: padding.left,
        y: padding.top,
        width: canvas.width - padding.left - padding.right,
        height: canvas.height - padding.top - padding.bottom
    };

    const values = filteredData.map(d => d.houseCount);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.1;

    const scaleX = i => chartArea.x + (i / (filteredData.length - 1)) * chartArea.width;
    const scaleY = v =>
        chartArea.y + chartArea.height - ((v - (min - pad)) / ((max + pad) - (min - pad))) * chartArea.height;

    filteredData.forEach((d, i) => {
        ctx.beginPath();
        ctx.arc(scaleX(i), scaleY(d.houseCount), 6, 0, Math.PI * 2);
        ctx.fillStyle = "#4a90e2";
        ctx.fill();
    });

    const yT = scaleY(thresholdValue);
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(chartArea.x, yT);
    ctx.lineTo(chartArea.x + chartArea.width, yT);
    ctx.strokeStyle = "#e74c3c";
    ctx.stroke();
    ctx.setLineDash([]);

    document.getElementById("thresholdInput").value = Math.round(thresholdValue);
}

// ====================== MOUSE ======================
function handleMouseDown(e) {
    const m = getMousePos(e);
    const values = filteredData.map(d => d.houseCount);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const y =
        chartArea.y +
        chartArea.height -
        ((thresholdValue - min) / (max - min)) * chartArea.height;

    if (Math.abs(m.y - y) < 15) isDragging = true;
}

function handleMouseMove(e) {
    const m = getMousePos(e);

    if (isDragging) {
        const values = filteredData.map(d => d.houseCount);
        const min = Math.min(...values);
        const max = Math.max(...values);
        thresholdValue =
            min +
            ((chartArea.y + chartArea.height - m.y) / chartArea.height) *
                (max - min);
        drawChart();
        updateStatistics();
        return;
    }

    tooltip.style.display = "none";
    filteredData.forEach((d, i) => {
        const x = chartArea.x + (i / (filteredData.length - 1)) * chartArea.width;
        const y = chartArea.y + chartArea.height - ((d.houseCount - min) / (max - min)) * chartArea.height;
        if (Math.hypot(m.x - x, m.y - y) < 10) {
            tooltip.style.display = "block";
            tooltip.style.left = e.clientX + 10 + "px";
            tooltip.style.top = e.clientY - 30 + "px";
            tooltip.innerHTML = `<strong>${d.year}</strong><br>${Math.round(d.houseCount)}`;
        }
    });
}

// ====================== STATS ======================
function updateStatistics() {
    const above = filteredData.filter(d => d.houseCount > thresholdValue).length;
    const below = filteredData.length - above;

    document.getElementById("aboveCount").textContent = above;
    document.getElementById("belowCount").textContent = below;
}
