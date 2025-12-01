// === BASIC CONFIGURATION ===
let gridSize = 80;      // larger grid so the word and shapes fit nicely
let cellSize = 10;      // pixels per cell (recomputed on resize)
let grid = [];
let running = true;
let speedMs = 5000;      // milliseconds per step (slower evolution)
const resetIntervalMs = 20000; // 60 seconds for new random shape scatter

const canvas = document.getElementById("automataCanvas");
const ctx = canvas.getContext("2d");

let lastStepTime = 0;
let lastResetTime = 0;

// Ripples: each ripple has a center (x, y), current age, and maximum age.
// At each generation, the ripple radius grows by 1 cell.
const ripples = []; // { x, y, age, maxAge }

// === GRID HELPERS ===
function createEmptyGrid(size) {
  const arr = new Array(size);
  for (let y = 0; y < size; y++) {
    arr[y] = new Array(size).fill(0);
  }
  return arr;
}

function setCellAlive(x, y) {
  if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
    grid[y][x] = 1;
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

      // Conway's Game of Life update rule
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

// === PATTERN STAMPING UTILITIES ===

// Stamp a pattern of "0"/"1" strings at an offset
function stampPattern(pattern, offsetX, offsetY) {
  const height = pattern.length;
  const width = pattern[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pattern[y][x] === "1") {
        const gx = offsetX + x;
        const gy = offsetY + y;
        if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
          grid[gy][gx] = 1;
        }
      }
    }
  }
}

// === LETTER PATTERNS FOR "ANDER" ===
// Each letter is 5 (width) x 7 (height)
const LETTERS = {
  A: [
    "01110",
    "10001",
    "10001",
    "11111",
    "10001",
    "10001",
    "10001"
  ],
  N: [
    "10001",
    "11001",
    "10101",
    "10011",
    "10001",
    "10001",
    "10001"
  ],
  D: [
    "11110",
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "11110"
  ],
  E: [
    "11111",
    "10000",
    "10000",
    "11111",
    "10000",
    "10000",
    "11111"
  ],
  R: [
    "11110",
    "10001",
    "10001",
    "11110",
    "10100",
    "10010",
    "10001"
  ]
};

const LETTER_WIDTH = 5;
const LETTER_HEIGHT = 7;
const LETTER_SPACING = 1;

// Place "ANDER" in the center of the grid
function placeWordANDER() {
  const word = "ANDER";
  const totalWidth =
    word.length * LETTER_WIDTH + (word.length - 1) * LETTER_SPACING;

  const startX = Math.floor((gridSize - totalWidth) / 2);
  const startY = Math.floor((gridSize - LETTER_HEIGHT) / 2);

  let x = startX;
  for (const ch of word) {
    const pattern = LETTERS[ch];
    stampPattern(pattern, x, startY);
    x += LETTER_WIDTH + LETTER_SPACING;
  }
}

// === NATURE SHAPES (SIMPLIFIED PIXEL ART) ===

const SHAPES = {
  tree: [
    "00100",
    "01110",
    "11111",
    "00100",
    "00100",
    "00100",
    "01110"
  ],
  ant: [
    "00100",
    "11111",
    "01110",
    "00100",
    "01010",
    "10001",
    "00000"
  ],
  octopus: [
    "0011100",
    "0111110",
    "1111111",
    "1111111",
    "0011100",
    "0101010",
    "0101010"
  ],
  leaf: [
    "00100",
    "01110",
    "11111",
    "01110",
    "00100",
    "00100",
    "00100"
  ]
};

// Scatter multiple nature shapes across the grid
function placeRandomNatureShapesScattered() {
  const names = Object.keys(SHAPES);

  // Number of shapes to scatter; adjust as desired
  const minShapes = 12;
  const maxShapes = 25;
  const numShapes =
    Math.floor(Math.random() * (maxShapes - minShapes + 1)) + minShapes;

  for (let i = 0; i < numShapes; i++) {
    const shapeName = names[Math.floor(Math.random() * names.length)];
    const pattern = SHAPES[shapeName];

    const height = pattern.length;
    const width = pattern[0].length;

    // Random position such that the entire pattern fits inside the grid
    const startX = Math.floor(Math.random() * (gridSize - width));
    const startY = Math.floor(Math.random() * (gridSize - height));

    stampPattern(pattern, startX, startY);
  }
}

// === RIPPLE EFFECT ===

// Create a new ripple centered at (x, y) in grid coordinates.
function spawnRipple(x, y) {
  ripples.push({
    x,
    y,
    age: 0,
    maxAge: 10 // number of "rings" before the ripple disappears
  });
}

// At each generation, expand ripples and seed their ring cells as alive.
function applyRipplesToGrid() {
  for (const r of ripples) {
    const radius = r.age;

    // Age 0: just light up the center cell
    if (radius === 0) {
      setCellAlive(r.x, r.y);
      continue;
    }

    const minX = Math.max(0, r.x - radius);
    const maxX = Math.min(gridSize - 1, r.x + radius);
    const minY = Math.max(0, r.y - radius);
    const maxY = Math.min(gridSize - 1, r.y + radius);

    // Draw an approximate ring with radius "radius" (Euclidean distance)
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - r.x;
        const dy = y - r.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Thickness of the ring: 1 cell (±0.5)
        if (dist >= radius - 0.5 && dist <= radius + 0.5) {
          setCellAlive(x, y);
        }
      }
    }
  }
}

// Increase ripple age and remove finished ripples
function updateRipples() {
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].age++;
    if (ripples[i].age > ripples[i].maxAge) {
      ripples.splice(i, 1);
    }
  }
}

// === RENDERING ===
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  // Optional grid lines
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
      // Update automaton
      nextGeneration();

      // Apply ripple rings as live cells
      applyRipplesToGrid();

      // Age and clean up ripples
      updateRipples();

      // Redraw grid
      drawGrid();
      lastStepTime = timestamp;
    }

    // Every resetIntervalMs, clear and scatter shapes again
    if (timestamp - lastResetTime >= resetIntervalMs) {
      grid = createEmptyGrid(gridSize);
      placeRandomNatureShapesScattered();
      drawGrid();
      lastResetTime = timestamp;
    }
  }

  requestAnimationFrame(loop);
}

// === CLICK HANDLER: SPAWN RIPPLE ON CLICK ===
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
    // Instead of just toggling one cell, spawn a ripple
    spawnRipple(gridX, gridY);
  }
});

// Handle window resize
window.addEventListener("resize", resizeCanvas);

// === INITIALIZATION ===
function init() {
  grid = createEmptyGrid(gridSize);

  // Initial pattern: your name ANDER in the middle
  placeWordANDER();

  resizeCanvas();
  drawGrid();

  const now = performance.now();
  lastStepTime = now;
  lastResetTime = now; // first scatter happens after resetIntervalMs

  requestAnimationFrame(loop);
}

init();
