// === BASIC CONFIGURATION ===
let gridSize = 50;      // default grid size (N x N)
let cellSize = 12;      // pixels per cell, recomputed on resize
let grid = [];
let running = false;
let speedMs = 120;      // milliseconds per step
let lastStepTime = 0;

const canvas = document.getElementById("automataCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stepBtn = document.getElementById("stepBtn");
const clearBtn = document.getElementById("clearBtn");
const randomBtn = document.getElementById("randomBtn");
const gridSizeSelect = document.getElementById("gridSizeSelect");
const speedRange = document.getElementById("speedRange");
const speedLabel = document.getElementById("speedLabel");

// === INITIALIZATION ===
function createEmptyGrid(size) {
  const arr = new Array(size);
  for (let y = 0; y < size; y++) {
    arr[y] = new Array(size).fill(0);
  }
  return arr;
}

function randomizeGrid() {
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      grid[y][x] = Math.random() < 0.25 ? 1 : 0;
    }
  }
}

// Fit canvas to container width and recompute cell size.
function resizeCanvas() {
  const maxWidth = Math.min(800, window.innerWidth - 64);
  canvas.width = maxWidth;
  canvas.height = maxWidth;
  cellSize = canvas.width / gridSize;
  drawGrid();
}

// === GAME OF LIFE RULES ===
function countNeighbors(grid, x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
        count += grid[ny][nx];
      }
    }
  }
  return count;
}

function nextGeneration() {
  const newGrid = createEmptyGrid(gridSize);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const neighbors = countNeighbors(grid, x, y);
      const isAlive = grid[y][x] === 1;

      // Conway's Game of Life:
      // Any live cell with 2 or 3 neighbors survives.
      // Any dead cell with exactly 3 neighbors becomes alive.
      // Otherwise, cell dies or stays dead.
      if (isAlive && (neighbors === 2 || neighbors === 3)) {
        newGrid[y][x] = 1;
      } else if (!isAlive && neighbors === 3) {
        newGrid[y][x] = 1;
      } else {
        newGrid[y][x] = 0;
      }
    }
  }
  grid = newGrid;
}

// === RENDERING ===
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw cells
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x] === 1) {
        ctx.fillStyle = "#22c55e"; // live cell
      } else {
        ctx.fillStyle = "#020617"; // dead cell
      }
      const px = x * cellSize;
      const py = y * cellSize;
      ctx.fillRect(px, py, cellSize, cellSize);
    }
  }

  // Grid lines (optional)
  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridSize; i++) {
    const pos = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.stroke();
  }
}

// === ANIMATION LOOP ===
function loop(timestamp) {
  if (running) {
    const delta = timestamp - lastStepTime;
    if (delta >= speedMs) {
      nextGeneration();
      drawGrid();
      lastStepTime = timestamp;
    }
  }
  requestAnimationFrame(loop);
}

// === EVENT HANDLERS ===
startBtn.addEventListener("click", () => {
  running = true;
});

pauseBtn.addEventListener("click", () => {
  running = false;
});

stepBtn.addEventListener("click", () => {
  running = false; // pause to avoid skipping frames
  nextGeneration();
  drawGrid();
});

clearBtn.addEventListener("click", () => {
  running = false;
  grid = createEmptyGrid(gridSize);
  drawGrid();
});

randomBtn.addEventListener("click", () => {
  randomizeGrid();
  drawGrid();
});

gridSizeSelect.addEventListener("change", (e) => {
  gridSize = parseInt(e.target.value, 10);
  grid = createEmptyGrid(gridSize);
  resizeCanvas();
});

speedRange.addEventListener("input", (e) => {
  speedMs = parseInt(e.target.value, 10);
  speedLabel.textContent = speedMs;
});

// Toggle cell on click
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const gridX = Math.floor(x / cellSize);
  const gridY = Math.floor(y / cellSize);

  if (
    gridX >= 0 && gridX < gridSize &&
    gridY >= 0 && gridY < gridSize
  ) {
    grid[gridY][gridX] = grid[gridY][gridX] === 1 ? 0 : 1;
    drawGrid();
  }
});

// Handle window resize
window.addEventListener("resize", resizeCanvas);

// === STARTUP ===
function init() {
  grid = createEmptyGrid(gridSize);
  resizeCanvas();
  speedLabel.textContent = speedMs;
  requestAnimationFrame(loop);
}

init();
