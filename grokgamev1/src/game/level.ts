export type Cell = "." | "#" | "=" | "^" | "o" | "C" | "G" | "P";

export type Level = {
  w: number;
  h: number;
  grid: Cell[][];
  spawn: { x: number; y: number };
  coinTotal: number;
};

function fill(grid: Cell[][], x: number, y: number, w: number, h: number, c: Cell) {
  const H = grid.length;
  const W = grid[0].length;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const gx = x + i;
      const gy = y + j;
      if (gx >= 0 && gx < W && gy >= 0 && gy < H) grid[gy][gx] = c;
    }
  }
}

function put(grid: Cell[][], x: number, y: number, c: Cell) {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) grid[y][x] = c;
}

/** 140×18 tile hollow: meadows, gaps, one-ways, spike pits, a climb, the lantern. */
export function buildLevel(): Level {
  const W = 140;
  const H = 18;
  const grid: Cell[][] = Array.from({ length: H }, () => Array<Cell>(W).fill("."));

  const ground = (x: number, w: number, top = 14) => {
    fill(grid, x, top, w, H - top, "#");
  };
  const pit = (x: number, w: number) => {
    fill(grid, x, 14, w, H - 14, ".");
    fill(grid, x, H - 1, w, 1, "^");
  };

  ground(0, 20);
  pit(20, 4);
  ground(24, 16);
  pit(40, 5);
  ground(45, 18);
  pit(63, 5);
  ground(68, 16);
  pit(84, 4);
  ground(88, 52);

  fill(grid, 11, 12, 4, 1, "=");
  fill(grid, 21, 11, 3, 1, "=");
  fill(grid, 33, 12, 3, 1, "=");
  fill(grid, 40, 10, 4, 1, "=");
  fill(grid, 50, 12, 3, 1, "=");
  fill(grid, 64, 12, 4, 1, "=");
  fill(grid, 66, 10, 3, 1, "=");
  fill(grid, 76, 12, 4, 1, "=");
  fill(grid, 85, 12, 4, 1, "=");
  fill(grid, 89, 10, 3, 1, "=");
  fill(grid, 93, 8, 4, 1, "=");
  fill(grid, 99, 10, 3, 1, "=");
  fill(grid, 105, 12, 4, 1, "=");
  fill(grid, 118, 12, 5, 1, "=");

  fill(grid, 34, 13, 4, 1, "#");
  fill(grid, 78, 13, 5, 1, "#");
  fill(grid, 112, 13, 6, 1, "#");

  put(grid, 4, 13, "P");
  put(grid, 8, 13, "o");
  put(grid, 12, 11, "o");
  put(grid, 22, 10, "o");
  put(grid, 28, 13, "o");
  put(grid, 34, 12, "o");
  put(grid, 41, 9, "o");
  put(grid, 50, 13, "o");
  put(grid, 51, 11, "o");
  put(grid, 56, 13, "C");
  put(grid, 65, 11, "o");
  put(grid, 67, 9, "o");
  put(grid, 74, 13, "o");
  put(grid, 80, 12, "o");
  put(grid, 86, 11, "o");
  put(grid, 90, 9, "o");
  put(grid, 94, 7, "o");
  put(grid, 100, 9, "o");
  put(grid, 106, 11, "o");
  put(grid, 114, 12, "o");
  put(grid, 120, 11, "o");
  put(grid, 128, 13, "G");
  put(grid, 133, 13, "o");

  fill(grid, 20, 17, 4, 1, "^");
  fill(grid, 40, 17, 5, 1, "^");
  fill(grid, 63, 17, 5, 1, "^");
  fill(grid, 84, 17, 4, 1, "^");

  let spawn = { x: 4, y: 13 };
  let coinTotal = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y][x] === "P") {
        spawn = { x, y };
        grid[y][x] = ".";
      }
      if (grid[y][x] === "o") coinTotal++;
    }
  }

  return { w: W, h: H, grid, spawn, coinTotal };
}

export function isSolid(c: Cell) {
  return c === "#";
}

export function isOneWay(c: Cell) {
  return c === "=";
}
