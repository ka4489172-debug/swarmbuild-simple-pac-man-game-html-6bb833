'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const TILE = 16;
const COLS = 28;
const ROWS = 31;
const CANVAS_W = COLS * TILE; // 448
const CANVAS_H = ROWS * TILE; // 496

// Tile types
const EMPTY  = 0;
const WALL   = 1;
const DOT    = 2;
const PELLET = 3;
const DOOR   = 4; // ghost house door

// Directions
const DIR = {
  UP:    { dr: -1, dc: 0 },
  DOWN:  { dr:  1, dc: 0 },
  LEFT:  { dr:  0, dc: -1 },
  RIGHT: { dr:  0, dc: 1 },
  NONE:  { dr:  0, dc: 0 },
};

const FRIGHTENED_DURATION = 7000; // ms
const GHOST_EATEN_SCORES  = [200, 400, 800, 1600];

// ─── Maze Layout ──────────────────────────────────────────────────────────────
// 28 columns × 31 rows  (classic Pac-Man proportions)
// 1=wall 2=dot 3=pellet 4=door 0=empty
const BASE_MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,4,4,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Deep copy maze for reset
function cloneMaze() {
  return BASE_MAZE.map(r => r.slice());
}

// ─── Game State ───────────────────────────────────────────────────────────────
let maze, score, highScore, lives, level;
let frightened, frightenedTimer, ghostEatenCount;
let gameRunning, gamePaused, gameOver, gameWon;
let animFrame;

// Pac-Man
let pac;

// Ghosts: Blinky(red), Pinky(pink), Inky(cyan), Clyde(orange)
const GHOST_COLORS      = ['#FF0000','#FFB8FF','#00FFFF','#FFB852'];
const GHOST_NAMES       = ['Blinky','Pinky','Inky','Clyde'];
const GHOST_START_POS   = [
  { row: 13, col: 14 }, // ghost house
  { row: 14, col: 12 },
  { row: 14, col: 14 },
  { row: 14, col: 16 },
];
let ghosts;

// Timing
let lastTime = 0;
let pacMoveTimer  = 0;
let ghostMoveTimer = 0;
const PAC_SPEED   = 150; // ms per tile
const GHOST_SPEED = 200; // ms per tile

// ─── DOM References ───────────────────────────────────────────────────────────
const canvas   = document.getElementById('game-canvas');
const ctx      = canvas.getContext('2d');
const scoreEl  = document.getElementById('score');
const hiScoreEl= document.getElementById('high-score');
const livesEl  = document.getElementById('lives-icons');
const startScreen   = document.getElementById('start-screen');
const gameOverScreen= document.getElementById('game-over-screen');
const winScreen     = document.getElementById('win-screen');
const finalScoreEl  = document.getElementById('final-score-display');
const winScoreEl    = document.getElementById('win-score-display');

// ─── Canvas Setup ─────────────────────────────────────────────────────────────
function setupCanvas() {
  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;
  // Scale for small screens
  const maxW = Math.min(window.innerWidth - 20, 600);
  const scale = Math.min(1, maxW / CANVAS_W);
  canvas.style.width  = (CANVAS_W * scale) + 'px';
  canvas.style.height = (CANVAS_H * scale) + 'px';
}

window.addEventListener('resize', setupCanvas);

// ─── Init / Reset ─────────────────────────────────────────────────────────────
function initGame() {
  maze = cloneMaze();
  score = 0;
  lives = 3;
  level = 1;
  frightened = false;
  frightenedTimer = 0;
  ghostEatenCount = 0;
  gameOver = false;
  gameWon  = false;
  gamePaused = false;

  pac = {
    row: 23, col: 14,
    x: 14 * TILE, y: 23 * TILE,
    dir: DIR.NONE,
    nextDir: DIR.NONE,
    mouthAngle: 0.25,
    mouthDir: 1,
    moving: false,
  };

  ghosts = GHOST_NAMES.map((name, i) => ({
    name,
    color: GHOST_COLORS[i],
    row: GHOST_START_POS[i].row,
    col: GHOST_START_POS[i].col,
    x: GHOST_START_POS[i].col * TILE,
    y: GHOST_START_POS[i].row * TILE,
    dir: DIR.LEFT,
    frightened: false,
    eaten: false,
    releaseTimer: i * 2000, // stagger releases
    released: i === 0,      // Blinky starts released
  }));

  updateHUD();
}

// ─── Maze Helpers ─────────────────────────────────────────────────────────────
function isWall(row, col) {
  if (row < 0 || col < 0 || row >= ROWS || col >= COLS) return true;
  return maze[row][col] === WALL;
}

function isGhostWall(row, col) {
  if (row < 0 || col < 0 || row >= ROWS || col >= COLS) return true;
  const t = maze[row][col];
  return t === WALL;
}

function wrapCol(col) {
  if (col < 0) return COLS - 1;
  if (col >= COLS) return 0;
  return col;
}

// ─── Maze Rendering ───────────────────────────────────────────────────────────
function drawMaze() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = maze[r][c];
      const x = c * TILE;
      const y = r * TILE;

      if (t === WALL) {
        ctx.fillStyle = '#00f';
        ctx.fillRect(x, y, TILE, TILE);
        // Inner highlight
        ctx.fillStyle = '#33f';
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      } else if (t === DOT) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + TILE/2, y + TILE/2, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (t === PELLET) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + TILE/2, y + TILE/2, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (t === DOOR) {
        ctx.fillStyle = '#FFB8FF';
        ctx.fillRect(x + 2, y + TILE/2 - 1, TILE - 4, 3);
      }
    }
  }
}

// ─── Pac-Man Rendering ────────────────────────────────────────────────────────
function drawPacman() {
  const cx = pac.x + TILE / 2;
  const cy = pac.y + TILE / 2;
  const r  = TILE / 2 - 1;

  // mouth angle oscillates
  let startAngle, endAngle;
  const mouth = pac.mouthAngle * Math.PI;

  const d = pac.dir;
  let rotation = 0;
  if (d === DIR.RIGHT || d === DIR.NONE) rotation = 0;
  else if (d === DIR.DOWN)  rotation = 0.5 * Math.PI;
  else if (d === DIR.LEFT)  rotation = Math.PI;
  else if (d === DIR.UP)    rotation = 1.5 * Math.PI;

  startAngle = rotation + mouth;
  endAngle   = rotation + 2 * Math.PI - mouth;

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.closePath();
  ctx.fill();
}

// ─── Ghost Rendering ──────────────────────────────────────────────────────────
function drawGhost(g) {
  const x = g.x;
  const y = g.y;
  const w = TILE;
  const h = TILE;

  let color = g.color;
  if (g.frightened && !g.eaten) {
    color = frightenedTimer > FRIGHTENED_DURATION * 0.6 ? '#00f' : (Math.floor(Date.now() / 200) % 2 === 0 ? '#fff' : '#00f');
  }
  if (g.eaten) color = 'transparent';

  if (!g.eaten) {
    ctx.fillStyle = color;
    // Body
    ctx.beginPath();
    ctx.arc(x + w/2, y + h/2, w/2 - 1, Math.PI, 0);
    ctx.lineTo(x + w - 1, y + h - 1);
    // Wavy bottom
    const waves = 3;
    const waveW = (w - 2) / waves;
    for (let i = waves; i >= 0; i--) {
      const wx = x + 1 + i * waveW;
      const wy = (i % 2 === 0) ? y + h - 1 : y + h - 4;
      ctx.lineTo(wx, wy);
    }
    ctx.lineTo(x + 1, y + h - 1);
    ctx.closePath();
    ctx.fill();

    // Eyes (only when not frightened)
    if (!g.frightened) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x + w*0.35, y + h*0.35, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w*0.65, y + h*0.35, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#00f';
      ctx.beginPath(); ctx.arc(x + w*0.35, y + h*0.4, 1.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w*0.65, y + h*0.4, 1.5, 0, Math.PI*2); ctx.fill();
    } else {
      // Frightened eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x + w*0.35, y + h*0.4, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w*0.65, y + h*0.4, 2, 0, Math.PI*2); ctx.fill();
    }
  } else {
    // Eaten ghost: just eyes floating back
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + w*0.35, y + h*0.35, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w*0.65, y + h*0.35, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#00f';
    ctx.beginPath(); ctx.arc(x + w*0.35, y + h*0.4, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w*0.65, y + h*0.4, 1.5, 0, Math.PI*2); ctx.fill();
  }
}

// ─── HUD Update ───────────────────────────────────────────────────────────────
function updateHUD() {
  scoreEl.textContent  = score;
  hiScoreEl.textContent = highScore || 0;
  livesEl.innerHTML = '';
  for (let i = 0; i < lives; i++) {
    const icon = document.createElement('div');
    icon.className = 'life-icon';
    livesEl.appendChild(icon);
  }
}

// ─── Pac-Man Movement ─────────────────────────────────────────────────────────
function movePacman(dt) {
  pacMoveTimer += dt;
  if (pacMoveTimer < PAC_SPEED) return;
  pacMoveTimer -= PAC_SPEED;

  // Try queued direction first
  const nd = pac.nextDir;
  if (nd !== DIR.NONE) {
    const nr = pac.row + nd.dr;
    const nc = wrapCol(pac.col + nd.dc);
    if (!isWall(nr, nc)) {
      pac.dir = nd;
      pac.nextDir = DIR.NONE;
    }
  }

  // Move in current direction
  const d = pac.dir;
  if (d !== DIR.NONE) {
    const nr = pac.row + d.dr;
    const nc = wrapCol(pac.col + d.dc);
    if (!isWall(nr, nc)) {
      pac.row = nr;
      pac.col = nc;
      pac.x = pac.col * TILE;
      pac.y = pac.row * TILE;
      pac.moving = true;
    } else {
      pac.moving = false;
    }
  }

  collectTile();
}

function animateMouth(dt) {
  if (!pac.moving) return;
  pac.mouthAngle += pac.mouthDir * dt * 0.003;
  if (pac.mouthAngle >= 0.25) { pac.mouthAngle = 0.25; pac.mouthDir = -1; }
  if (pac.mouthAngle <= 0.01) { pac.mouthAngle = 0.01; pac.mouthDir =  1; }
}

// ─── Dot Collection ───────────────────────────────────────────────────────────
function collectTile() {
  const t = maze[pac.row][pac.col];
  if (t === DOT) {
    maze[pac.row][pac.col] = EMPTY;
    score += 10;
    checkWin();
  } else if (t === PELLET) {
    maze[pac.row][pac.col] = EMPTY;
    score += 50;
    frightened = true;
    frightenedTimer = 0;
    ghostEatenCount = 0;
    ghosts.forEach(g => { if (!g.eaten) g.frightened = true; });
    checkWin();
  }
  if (score > (highScore || 0)) highScore = score;
  updateHUD();
}

// ─── Ghost AI ─────────────────────────────────────────────────────────────────
function moveGhosts(dt) {
  ghostMoveTimer += dt;
  const speed = frightened ? GHOST_SPEED * 1.5 : GHOST_SPEED;
  if (ghostMoveTimer < speed) return;
  ghostMoveTimer -= speed;

  ghosts.forEach((g, i) => {
    // Release timer
    if (!g.released) {
      g.releaseTimer -= dt;
      if (g.releaseTimer <= 0) g.released = true;
      else return;
    }

    // Eaten ghosts return to house fast
    const targetRow = g.eaten ? 13 : pac.row;
    const targetCol = g.eaten ? 14 : pac.col;

    const dirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
    const reverse = { dr: -g.dir.dr, dc: -g.dir.dc };

    let validDirs = dirs.filter(d => {
      if (d.dr === reverse.dr && d.dc === reverse.dc) return false;
      const nr = g.row + d.dr;
      const nc = wrapCol(g.col + d.dc);
      if (isGhostWall(nr, nc)) return false;
      if (maze[nr] && maze[nr][nc] === DOOR && !g.eaten) return false;
      return true;
    });

    if (validDirs.length === 0) {
      // Forced reverse
      const nr = g.row + reverse.dr;
      const nc = wrapCol(g.col + reverse.dc);
      if (!isGhostWall(nr, nc)) validDirs = [reverse];
    }

    if (validDirs.length === 0) return;

    let chosen;
    if (g.frightened && !g.eaten) {
      // Random movement
      chosen = validDirs[Math.floor(Math.random() * validDirs.length)];
    } else {
      // Chase: pick direction that minimizes distance to target
      let best = Infinity;
      chosen = validDirs[0];
      validDirs.forEach(d => {
        const nr = g.row + d.dr;
        const nc = wrapCol(g.col + d.dc);
        const dist = Math.abs(nr - targetRow) + Math.abs(nc - targetCol);
        if (dist < best) { best = dist; chosen = d; }
      });
      // Clyde: random when far
      if (i === 3 && !g.eaten) {
        const distToPac = Math.abs(g.row - pac.row) + Math.abs(g.col - pac.col);
        if (distToPac > 8) chosen = validDirs[Math.floor(Math.random() * validDirs.length)];
      }
    }

    g.dir = chosen;
    g.row += chosen.dr;
    g.col = wrapCol(g.col + chosen.dc);
    g.x = g.col * TILE;
    g.y = g.row * TILE;

    // Return to house: un-eat
    if (g.eaten && g.row === 13 && g.col === 14) {
      g.eaten = false;
      g.frightened = false;
      g.released = false;
      g.releaseTimer = 3000;
    }
  });
}

// ─── Collision Detection ──────────────────────────────────────────────────────
function checkCollisions() {
  ghosts.forEach(g => {
    if (g.row === pac.row && g.col === pac.col) {
      if (g.frightened && !g.eaten) {
        // Eat ghost
        g.eaten = true;
        g.frightened = false;
        score += GHOST_EATEN_SCORES[Math.min(ghostEatenCount, 3)];
        ghostEatenCount++;
        if (score > (highScore || 0)) highScore = score;
        updateHUD();
      } else if (!g.eaten) {
        // Pac-Man dies
        loseLife();
      }
    }
  });
}

function loseLife() {
  lives--;
  updateHUD();
  if (lives <= 0) {
    triggerGameOver();
  } else {
    resetPositions();
  }
}

function resetPositions() {
  pac.row = 23; pac.col = 14;
  pac.x = 14 * TILE; pac.y = 23 * TILE;
  pac.dir = DIR.NONE; pac.nextDir = DIR.NONE;
  pac.moving = false;
  frightened = false;
  frightenedTimer = 0;
  ghostEatenCount = 0;

  ghosts.forEach((g, i) => {
    g.row = GHOST_START_POS[i].row;
    g.col = GHOST_START_POS[i].col;
    g.x = g.col * TILE; g.y = g.row * TILE;
    g.dir = DIR.LEFT;
    g.frightened = false;
    g.eaten = false;
    g.released = i === 0;
    g.releaseTimer = i * 2000;
  });
}

// ─── Frightened Timer ─────────────────────────────────────────────────────────
function updateFrightened(dt) {
  if (!frightened) return;
  frightenedTimer += dt;
  if (frightenedTimer >= FRIGHTENED_DURATION) {
    frightened = false;
    frightenedTimer = 0;
    ghostEatenCount = 0;
    ghosts.forEach(g => { g.frightened = false; });
  }
}

// ─── Win / Game Over ──────────────────────────────────────────────────────────
function checkWin() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (maze[r][c] === DOT || maze[r][c] === PELLET) return;
    }
  }
  triggerWin();
}

function triggerWin() {
  gameWon = true;
  gameRunning = false;
  cancelAnimationFrame(animFrame);
  winScoreEl.textContent = score;
  winScreen.classList.remove('hidden');
}

function triggerGameOver() {
  gameOver = true;
  gameRunning = false;
  cancelAnimationFrame(animFrame);
  finalScoreEl.textContent = score;
  gameOverScreen.classList.remove('hidden');
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
function gameLoop(ts) {
  const dt = Math.min(ts - lastTime, 100); // cap delta at 100ms
  lastTime = ts;

  if (!gamePaused) {
    movePacman(dt);
    animateMouth(dt);
    moveGhosts(dt);
    updateFrightened(dt);
    checkCollisions();

    // Draw
    drawMaze();
    drawPacman();
    ghosts.forEach(drawGhost);
  } else {
    // Draw paused state
    drawMaze();
    drawPacman();
    ghosts.forEach(drawGhost);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#FFD700';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2);
    ctx.textAlign = 'left';
  }

  if (gameRunning) animFrame = requestAnimationFrame(gameLoop);
}

// ─── Input ────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!gameRunning) return;
  switch (e.key) {
    case 'ArrowUp':    case 'w': case 'W': pac.nextDir = DIR.UP;    e.preventDefault(); break;
    case 'ArrowDown':  case 's': case 'S': pac.nextDir = DIR.DOWN;  e.preventDefault(); break;
    case 'ArrowLeft':  case 'a': case 'A': pac.nextDir = DIR.LEFT;  e.preventDefault(); break;
    case 'ArrowRight': case 'd': case 'D': pac.nextDir = DIR.RIGHT; e.preventDefault(); break;
    case 'p': case 'P': gamePaused = !gamePaused; break;
  }
});

// Mobile swipe
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy)) {
    pac.nextDir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
  } else {
    pac.nextDir = dy > 0 ? DIR.DOWN : DIR.UP;
  }
  e.preventDefault();
}, { passive: false });

// ─── Button Handlers ──────────────────────────────────────────────────────────
function startGame() {
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  winScreen.classList.add('hidden');
  initGame();
  setupCanvas();
  gameRunning = true;
  lastTime = performance.now();
  animFrame = requestAnimationFrame(gameLoop);
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn-over').addEventListener('click', startGame);
document.getElementById('restart-btn-win').addEventListener('click', startGame);

// ─── Init ─────────────────────────────────────────────────────────────────────
highScore = parseInt(localStorage.getItem('pacman_hi') || '0');
setupCanvas();

// Save high score on page unload
window.addEventListener('beforeunload', () => {
  localStorage.setItem('pacman_hi', highScore || 0);
});
