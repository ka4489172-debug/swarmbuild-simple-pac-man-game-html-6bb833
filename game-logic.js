/**
 * game-logic.js
 * Pure game logic functions for the Pac-Man game.
 * These are exported for use in game.js and for unit testing.
 *
 * Tile types used in the maze 2D array:
 *   0 = empty (no dot)
 *   1 = wall
 *   2 = dot
 *   3 = power pellet
 *   4 = ghost house door (passable only by ghosts)
 */

// ─── Maze / Collision ────────────────────────────────────────────────────────

/**
 * Returns true if the given tile is a wall (impassable for Pac-Man).
 * @param {number[][]} maze
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
function isWall(maze, row, col) {
  if (row < 0 || col < 0 || row >= maze.length || col >= maze[0].length) {
    return true; // treat out-of-bounds as wall
  }
  return maze[row][col] === 1;
}

/**
 * Returns true if Pac-Man can move to the given tile
 * (not a wall and not out of bounds).
 * @param {number[][]} maze
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
function canMove(maze, row, col) {
  return !isWall(maze, row, col);
}

// ─── Dot / Pellet Collection ─────────────────────────────────────────────────

const SCORE = {
  DOT: 10,
  POWER_PELLET: 50,
  GHOST_BASE: 200, // first ghost eaten per power-pellet sequence
};

/**
 * Attempts to collect a dot or power pellet at (row, col).
 * Mutates the maze array in place (sets tile to 0).
 *
 * @param {number[][]} maze
 * @param {number} row
 * @param {number} col
 * @param {Object} gameState  - must have { score, frightened, frightenedTimer, ghostEatenCount }
 * @returns {{ collected: boolean, type: 'dot'|'pellet'|null }}
 */
function collectTile(maze, row, col, gameState) {
  const tile = maze[row][col];
  if (tile === 2) {
    maze[row][col] = 0;
    gameState.score += SCORE.DOT;
    return { collected: true, type: 'dot' };
  }
  if (tile === 3) {
    maze[row][col] = 0;
    gameState.score += SCORE.POWER_PELLET;
    gameState.frightened = true;
    gameState.frightenedTimer = 0;
    gameState.ghostEatenCount = 0;
    return { collected: true, type: 'pellet' };
  }
  return { collected: false, type: null };
}

// ─── Ghost Frightened Mode ────────────────────────────────────────────────────

const FRIGHTENED_DURATION = 7000; // ms

/**
 * Returns true if ghosts are currently frightened.
 * @param {Object} gameState  - { frightened: boolean, frightenedTimer: number }
 * @param {number} deltaMs    - elapsed time since last frame (ms)
 * @returns {boolean}  still frightened after updating timer
 */
function updateFrightenedState(gameState, deltaMs) {
  if (!gameState.frightened) return false;
  gameState.frightenedTimer += deltaMs;
  if (gameState.frightenedTimer >= FRIGHTENED_DURATION) {
    gameState.frightened = false;
    gameState.frightenedTimer = 0;
    gameState.ghostEatenCount = 0;
  }
  return gameState.frightened;
}

// ─── Scoring: Ghost Eating ────────────────────────────────────────────────────

/**
 * Returns the score awarded for eating a ghost.
 * Each consecutive ghost eaten in a single power-pellet sequence doubles:
 *   1st → 200, 2nd → 400, 3rd → 800, 4th → 1600
 * @param {number} ghostEatenCount  number of ghosts eaten so far this sequence (0-indexed)
 * @returns {number}
 */
function getGhostEatScore(ghostEatenCount) {
  return SCORE.GHOST_BASE * Math.pow(2, ghostEatenCount);
}

/**
 * Handles Pac-Man eating a ghost.
 * Mutates gameState: increments score and ghostEatenCount.
 * @param {Object} gameState
 */
function eatGhost(gameState) {
  if (!gameState.frightened) return;
  const points = getGhostEatScore(gameState.ghostEatenCount);
  gameState.score += points;
  gameState.ghostEatenCount += 1;
}

// ─── Collision Detection ──────────────────────────────────────────────────────

/**
 * Returns true if Pac-Man and a ghost occupy the same tile.
 * @param {{ row: number, col: number }} pacman
 * @param {{ row: number, col: number }} ghost
 * @returns {boolean}
 */
function isSameTile(pacman, ghost) {
  return pacman.row === ghost.row && pacman.col === ghost.col;
}

// ─── Win / Lose Conditions ────────────────────────────────────────────────────

/**
 * Returns true if no dots or power pellets remain in the maze.
 * @param {number[][]} maze
 * @returns {boolean}
 */
function checkWin(maze) {
  for (const row of maze) {
    for (const cell of row) {
      if (cell === 2 || cell === 3) return false;
    }
  }
  return true;
}

/**
 * Returns true if the player has no lives remaining.
 * @param {number} lives
 * @returns {boolean}
 */
function checkGameOver(lives) {
  return lives <= 0;
}

/**
 * Counts total collectible tiles (dots + power pellets) in the maze.
 * @param {number[][]} maze
 * @returns {number}
 */
function countDots(maze) {
  let count = 0;
  for (const row of maze) {
    for (const cell of row) {
      if (cell === 2 || cell === 3) count++;
    }
  }
  return count;
}

// ─── Ghost Movement Helpers ───────────────────────────────────────────────────

/**
 * Returns valid neighbouring tiles a ghost can move to.
 * Ghosts cannot reverse direction (unless no other option).
 * @param {number[][]} maze
 * @param {{ row: number, col: number, dir: { dr: number, dc: number } }} ghost
 * @returns {{ dr: number, dc: number }[]}
 */
function getValidGhostMoves(maze, ghost) {
  const directions = [
    { dr: -1, dc: 0 }, // up
    { dr: 1,  dc: 0 }, // down
    { dr: 0,  dc: -1 }, // left
    { dr: 0,  dc: 1 },  // right
  ];
  const reverseDir = { dr: -ghost.dir.dr, dc: -ghost.dir.dc };

  const forward = directions.filter(d => {
    if (d.dr === reverseDir.dr && d.dc === reverseDir.dc) return false; // no reversing
    return canMove(maze, ghost.row + d.dr, ghost.col + d.dc);
  });

  if (forward.length > 0) return forward;
  // If forced to reverse
  if (canMove(maze, ghost.row + reverseDir.dr, ghost.col + reverseDir.dc)) {
    return [reverseDir];
  }
  return [];
}

// ─── Module Export ────────────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SCORE,
    FRIGHTENED_DURATION,
    isWall,
    canMove,
    collectTile,
    updateFrightenedState,
    getGhostEatScore,
    eatGhost,
    isSameTile,
    checkWin,
    checkGameOver,
    countDots,
    getValidGhostMoves,
  };
}
