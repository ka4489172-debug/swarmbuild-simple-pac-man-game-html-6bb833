/**
 * tests/game.test.js
 *
 * Unit tests for Pac-Man game logic (game-logic.js).
 * Runs in Node.js without any external dependencies.
 * Also compatible with Jest if installed.
 *
 * Usage:
 *   node tests/game.test.js          # standalone
 *   npx jest tests/game.test.js      # via Jest
 */

'use strict';

const {
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
} = require('../game-logic');

// ─── Minimal test framework (no-op when running under Jest) ─────────────────

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (typeof test !== 'undefined') {
    // Jest environment — just throw
    if (!condition) throw new Error(msg);
    return;
  }
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function assertEqual(a, b, msg) {
  const ok = a === b;
  assert(ok, `${msg} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`);
}

function describe(label, fn) {
  if (typeof test !== 'undefined') {
    // Jest will handle describe natively
    fn();
    return;
  }
  console.log(`\n${label}`);
  fn();
}

function it(label, fn) {
  if (typeof test !== 'undefined') {
    test(label, fn);
    return;
  }
  try {
    fn();
  } catch (e) {
    failed++;
    console.error(`  ✗ ${label}\n    ${e.message}`);
  }
}

// ─── Helper: build a simple 5x5 maze ─────────────────────────────────────────
//   1 = wall, 2 = dot, 3 = pellet, 0 = empty
//
//   1 1 1 1 1
//   1 2 0 2 1
//   1 0 3 0 1
//   1 2 0 2 1
//   1 1 1 1 1

function makeMaze() {
  return [
    [1, 1, 1, 1, 1],
    [1, 2, 0, 2, 1],
    [1, 0, 3, 0, 1],
    [1, 2, 0, 2, 1],
    [1, 1, 1, 1, 1],
  ];
}

function makeGameState(overrides = {}) {
  return Object.assign({
    score: 0,
    frightened: false,
    frightenedTimer: 0,
    ghostEatenCount: 0,
  }, overrides);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('isWall / canMove', () => {
  it('wall tile returns true', () => {
    const maze = makeMaze();
    assert(isWall(maze, 0, 0), 'corner is wall');
    assert(isWall(maze, 0, 2), 'top edge is wall');
    assert(isWall(maze, 4, 4), 'bottom-right corner is wall');
  });

  it('dot tile is not a wall', () => {
    const maze = makeMaze();
    assert(!isWall(maze, 1, 1), 'dot tile is not wall');
    assert(!isWall(maze, 3, 3), 'dot tile bottom is not wall');
  });

  it('power pellet tile is not a wall', () => {
    const maze = makeMaze();
    assert(!isWall(maze, 2, 2), 'power pellet is not wall');
  });

  it('empty tile is not a wall', () => {
    const maze = makeMaze();
    assert(!isWall(maze, 1, 2), 'empty tile is not wall');
  });

  it('out-of-bounds is treated as wall', () => {
    const maze = makeMaze();
    assert(isWall(maze, -1, 0), 'row -1 is out of bounds → wall');
    assert(isWall(maze, 0, -1), 'col -1 is out of bounds → wall');
    assert(isWall(maze, 10, 0), 'row 10 is out of bounds → wall');
    assert(isWall(maze, 0, 10), 'col 10 is out of bounds → wall');
  });

  it('canMove mirrors isWall inverted', () => {
    const maze = makeMaze();
    assertEqual(canMove(maze, 1, 1), true, 'canMove on dot tile');
    assertEqual(canMove(maze, 0, 0), false, 'canMove on wall tile');
  });
});

describe('collectTile — dot collection', () => {
  it('collecting a dot increments score by 10 and removes tile', () => {
    const maze = makeMaze();
    const state = makeGameState();
    const result = collectTile(maze, 1, 1, state);
    assertEqual(result.collected, true, 'collected flag');
    assertEqual(result.type, 'dot', 'type is dot');
    assertEqual(state.score, SCORE.DOT, 'score incremented');
    assertEqual(maze[1][1], 0, 'tile cleared to empty');
  });

  it('collecting another dot accumulates score', () => {
    const maze = makeMaze();
    const state = makeGameState();
    collectTile(maze, 1, 1, state);
    collectTile(maze, 1, 3, state);
    assertEqual(state.score, SCORE.DOT * 2, 'score is 20 after two dots');
  });

  it('empty tile returns collected: false', () => {
    const maze = makeMaze();
    const state = makeGameState();
    const result = collectTile(maze, 1, 2, state); // empty tile
    assertEqual(result.collected, false, 'nothing to collect');
    assertEqual(result.type, null, 'type is null');
    assertEqual(state.score, 0, 'score unchanged');
  });

  it('wall tile returns collected: false', () => {
    const maze = makeMaze();
    const state = makeGameState();
    const result = collectTile(maze, 0, 0, state); // wall
    assertEqual(result.collected, false, 'wall not collected');
    assertEqual(state.score, 0, 'score unchanged on wall');
  });
});

describe('collectTile — power pellet', () => {
  it('collecting a power pellet gives 50 pts and activates frightened mode', () => {
    const maze = makeMaze();
    const state = makeGameState();
    const result = collectTile(maze, 2, 2, state);
    assertEqual(result.collected, true, 'pellet collected');
    assertEqual(result.type, 'pellet', 'type is pellet');
    assertEqual(state.score, SCORE.POWER_PELLET, 'score is 50');
    assertEqual(state.frightened, true, 'frightened activated');
    assertEqual(state.frightenedTimer, 0, 'frightened timer reset to 0');
    assertEqual(maze[2][2], 0, 'pellet tile cleared');
  });

  it('collecting a power pellet resets ghostEatenCount', () => {
    const maze = makeMaze();
    const state = makeGameState({ ghostEatenCount: 2 });
    collectTile(maze, 2, 2, state);
    assertEqual(state.ghostEatenCount, 0, 'ghostEatenCount reset');
  });
});

describe('updateFrightenedState', () => {
  it('returns false if not frightened', () => {
    const state = makeGameState({ frightened: false });
    const result = updateFrightenedState(state, 100);
    assertEqual(result, false, 'not frightened → returns false');
  });

  it('remains frightened while timer < FRIGHTENED_DURATION', () => {
    const state = makeGameState({ frightened: true, frightenedTimer: 0 });
    updateFrightenedState(state, 3000);
    assertEqual(state.frightened, true, 'still frightened at 3s');
    assertEqual(state.frightenedTimer, 3000, 'timer incremented');
  });

  it('turns off frightened mode at exactly FRIGHTENED_DURATION', () => {
    const state = makeGameState({ frightened: true, frightenedTimer: 0 });
    updateFrightenedState(state, FRIGHTENED_DURATION);
    assertEqual(state.frightened, false, 'frightened ended');
    assertEqual(state.frightenedTimer, 0, 'timer reset');
    assertEqual(state.ghostEatenCount, 0, 'ghostEatenCount reset');
  });

  it('turns off frightened mode after exceeding FRIGHTENED_DURATION', () => {
    const state = makeGameState({ frightened: true, frightenedTimer: 6000 });
    updateFrightenedState(state, 1500); // 7500 > 7000
    assertEqual(state.frightened, false, 'frightened ended after overshoot');
  });

  it('multiple updates accumulate correctly', () => {
    const state = makeGameState({ frightened: true, frightenedTimer: 0 });
    updateFrightenedState(state, 2000);
    updateFrightenedState(state, 2000);
    assertEqual(state.frightened, true, 'still frightened at 4s');
    updateFrightenedState(state, 3500); // total: 7500 > 7000
    assertEqual(state.frightened, false, 'frightened ended after 7.5s total');
  });
});

describe('getGhostEatScore', () => {
  it('first ghost eaten gives 200 pts', () => {
    assertEqual(getGhostEatScore(0), 200, '1st ghost = 200');
  });
  it('second ghost eaten gives 400 pts', () => {
    assertEqual(getGhostEatScore(1), 400, '2nd ghost = 400');
  });
  it('third ghost eaten gives 800 pts', () => {
    assertEqual(getGhostEatScore(2), 800, '3rd ghost = 800');
  });
  it('fourth ghost eaten gives 1600 pts', () => {
    assertEqual(getGhostEatScore(3), 1600, '4th ghost = 1600');
  });
});

describe('eatGhost', () => {
  it('eating first ghost scores 200 and increments count', () => {
    const state = makeGameState({ frightened: true, ghostEatenCount: 0 });
    eatGhost(state);
    assertEqual(state.score, 200, 'score after eating 1st ghost');
    assertEqual(state.ghostEatenCount, 1, 'count incremented');
  });

  it('eating consecutive ghosts doubles score each time', () => {
    const state = makeGameState({ frightened: true, ghostEatenCount: 0 });
    eatGhost(state); // 200
    eatGhost(state); // 400
    eatGhost(state); // 800
    eatGhost(state); // 1600
    assertEqual(state.score, 200 + 400 + 800 + 1600, 'cumulative ghost score = 3000');
    assertEqual(state.ghostEatenCount, 4, 'four ghosts eaten');
  });

  it('does not score if not frightened', () => {
    const state = makeGameState({ frightened: false, score: 100 });
    eatGhost(state);
    assertEqual(state.score, 100, 'score unchanged when not frightened');
    assertEqual(state.ghostEatenCount, 0, 'count unchanged');
  });
});

describe('isSameTile (collision detection)', () => {
  it('same tile → collision', () => {
    assert(isSameTile({ row: 2, col: 3 }, { row: 2, col: 3 }), 'same position is collision');
  });

  it('different row → no collision', () => {
    assert(!isSameTile({ row: 2, col: 3 }, { row: 3, col: 3 }), 'different row');
  });

  it('different col → no collision', () => {
    assert(!isSameTile({ row: 2, col: 3 }, { row: 2, col: 4 }), 'different col');
  });

  it('both different → no collision', () => {
    assert(!isSameTile({ row: 1, col: 1 }, { row: 4, col: 4 }), 'far apart');
  });
});

describe('checkWin', () => {
  it('returns false when dots remain', () => {
    const maze = makeMaze();
    assertEqual(checkWin(maze), false, 'dots remain → not won');
  });

  it('returns true when all collectibles cleared', () => {
    const maze = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ];
    assertEqual(checkWin(maze), true, 'no dots → win');
  });

  it('returns false if only power pellets remain', () => {
    const maze = [
      [1, 1, 1],
      [1, 3, 1],
      [1, 1, 1],
    ];
    assertEqual(checkWin(maze), false, 'power pellet counts as uncollected');
  });

  it('collecting all dots triggers win', () => {
    const maze = makeMaze();
    const state = makeGameState();
    // Collect all 4 dots + 1 power pellet
    collectTile(maze, 1, 1, state);
    collectTile(maze, 1, 3, state);
    collectTile(maze, 2, 2, state);
    collectTile(maze, 3, 1, state);
    collectTile(maze, 3, 3, state);
    assertEqual(checkWin(maze), true, 'all collected → win');
    assertEqual(state.score, 4 * SCORE.DOT + SCORE.POWER_PELLET, 'score tallied correctly');
  });
});

describe('checkGameOver', () => {
  it('returns true when lives = 0', () => {
    assertEqual(checkGameOver(0), true, 'zero lives = game over');
  });

  it('returns true when lives < 0 (edge case)', () => {
    assertEqual(checkGameOver(-1), true, 'negative lives = game over');
  });

  it('returns false when lives > 0', () => {
    assertEqual(checkGameOver(1), false, '1 life remaining');
    assertEqual(checkGameOver(3), false, '3 lives remaining');
  });
});

describe('countDots', () => {
  it('counts dots and pellets correctly', () => {
    const maze = makeMaze(); // 4 dots + 1 pellet = 5
    assertEqual(countDots(maze), 5, '5 collectibles in test maze');
  });

  it('returns 0 on cleared maze', () => {
    const maze = [[1, 0, 1], [0, 0, 0], [1, 0, 1]];
    assertEqual(countDots(maze), 0, 'no collectibles = 0');
  });

  it('decreases as dots are collected', () => {
    const maze = makeMaze();
    const state = makeGameState();
    assertEqual(countDots(maze), 5, 'starts with 5');
    collectTile(maze, 1, 1, state);
    assertEqual(countDots(maze), 4, '4 after collecting one dot');
    collectTile(maze, 2, 2, state); // pellet
    assertEqual(countDots(maze), 3, '3 after collecting pellet');
  });
});

describe('getValidGhostMoves', () => {
  const maze = [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ];

  it('ghost at corridor has valid moves excluding reverse and walls', () => {
    const ghost = { row: 1, col: 2, dir: { dr: 0, dc: 1 } }; // moving right
    const moves = getValidGhostMoves(maze, ghost);
    // At (1,2) moving right, can go: right (1,3), down (2,2) blocked by wall
    // Valid: right (continue), NOT left (reverse), NOT up/down walls
    const hasContinue = moves.some(m => m.dr === 0 && m.dc === 1);
    assert(hasContinue, 'can continue moving right');
    const hasReverse = moves.some(m => m.dr === 0 && m.dc === -1);
    assert(!hasReverse, 'cannot reverse direction');
  });

  it('ghost at intersection has multiple choices', () => {
    // At (1,2) moving up: left (1,1) and right (1,3) are valid; up/down are walls; reverse=down excluded
    const ghost = { row: 1, col: 2, dir: { dr: -1, dc: 0 } };
    const moves = getValidGhostMoves(maze, ghost);
    assert(moves.length >= 2, 'at least 2 valid moves at T-junction');
  });

  it('ghost forced to reverse when only option', () => {
    // Dead end: ghost is at (1,1) moving left — only reverse is possible if surrounded by walls
    const deadEndMaze = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ];
    const ghost = { row: 1, col: 1, dir: { dr: 0, dc: -1 } }; // moving left into wall
    const moves = getValidGhostMoves(deadEndMaze, ghost);
    // (1,1): up=wall, down=wall, left=wall, right=wall — no moves
    assertEqual(moves.length, 0, 'no moves in closed dead end');
  });
});

// ─── Integration: score a full game sequence ─────────────────────────────────

describe('Integration: full scoring sequence', () => {
  it('collect 2 dots, eat pellet, eat 2 ghosts, verify total score', () => {
    const maze = makeMaze();
    const state = makeGameState();

    // Two dots: 2 * 10 = 20
    collectTile(maze, 1, 1, state);
    collectTile(maze, 1, 3, state);
    assertEqual(state.score, 20, '20 pts after 2 dots');

    // Power pellet: +50, frightened on
    collectTile(maze, 2, 2, state);
    assertEqual(state.score, 70, '70 pts after pellet');
    assert(state.frightened, 'frightened active');

    // Eat 2 ghosts: +200 +400 = 600
    eatGhost(state);
    eatGhost(state);
    assertEqual(state.score, 70 + 200 + 400, '670 pts after eating 2 ghosts');

    // Frightened ends naturally
    updateFrightenedState(state, FRIGHTENED_DURATION);
    assertEqual(state.frightened, false, 'frightened ended');

    // Two more dots: +20
    collectTile(maze, 3, 1, state);
    collectTile(maze, 3, 3, state);
    assertEqual(state.score, 690, 'final score 690');

    // All dots collected → win
    assertEqual(checkWin(maze), true, 'game won');
    assertEqual(checkGameOver(3), false, 'still alive with 3 lives');
  });
});

// ─── Runner (Node.js only) ────────────────────────────────────────────────────

if (typeof test === 'undefined') {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED');
  }
}
