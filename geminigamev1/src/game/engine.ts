import {
  ACCEL_AIR,
  ACCEL_GROUND,
  AIR_DRAG,
  APEX_THRESH,
  COYOTE,
  DROP_TIME,
  FIXED_DT,
  FRICTION,
  GRAVITY_APEX,
  GRAVITY_DOWN,
  GRAVITY_UP,
  JUMP_BUFFER,
  JUMP_CUT,
  JUMP_V,
  MAX_FALL,
  MAX_FRAME_DT,
  PLAYER_H,
  PLAYER_W,
  RUN_SPEED,
  SPRITE,
  TILE,
  VIEW_H,
  VIEW_W,
} from "./constants";
import { GameAudio } from "./audio";
import { buildLevel, isOneWay, isSolid, type Cell, type Level } from "./level";
import { loadSave, writeSave, type SaveData } from "./save";

export type Mode = "title" | "playing" | "paused" | "win" | "lost";

export type GameUi = {
  mode: Mode;
  coins: number;
  totalCoins: number;
  lives: number;
  time: number;
  bestTime: number | null;
  muted: boolean;
  collectedAll: boolean;
};

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getX: () => number;
  getVx: () => number;
  setSteer?: (v: number) => void;
  setKeys?: (codes: string[]) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

type Assets = {
  foxIdle: HTMLImageElement[];
  foxRun: HTMLImageElement[];
  foxJump: HTMLImageElement[];
  firefly: HTMLImageElement[];
  spike: HTMLImageElement;
  lantern: HTMLImageElement;
  grass: HTMLImageElement[];
  dirt: HTMLImageElement;
  sky: HTMLImageElement;
  far: HTMLImageElement;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function loadAssets(): Promise<Assets> {
  const foxIdle = await Promise.all([1, 2, 3, 4].map((i) => loadImage(`/game/fox-idle-${i}.png`)));
  const foxRun = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => loadImage(`/game/fox-run-${i}.png`)));
  const foxJump = await Promise.all([1, 2, 3, 4].map((i) => loadImage(`/game/fox-jump-${i}.png`)));
  const firefly = await Promise.all([1, 2, 3, 4].map((i) => loadImage(`/game/firefly-${i}.png`)));
  const [spike, lantern, g1, g2, g3, dirt, sky, far] = await Promise.all([
    loadImage("/game/spike.png"),
    loadImage("/game/lantern.png"),
    loadImage("/game/grass-1.png"),
    loadImage("/game/grass-2.png"),
    loadImage("/game/grass-3.png"),
    loadImage("/game/dirt.png"),
    loadImage("/game/sky.jpg"),
    loadImage("/game/far.jpg"),
  ]);
  return { foxIdle, foxRun, foxJump, firefly, spike, lantern, grass: [g1, g2, g3], dirt, sky, far };
}

type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  grounded: boolean;
  coyote: number;
  jumpBuffer: number;
  dropTimer: number;
  anim: "idle" | "run" | "jump";
  animT: number;
  squashX: number;
  squashY: number;
  invuln: number;
};

function makePlayer(tx: number, ty: number): Player {
  return {
    x: tx * TILE + (TILE - PLAYER_W) / 2,
    y: ty * TILE + TILE - PLAYER_H - 1,
    vx: 0,
    vy: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    facing: 1,
    grounded: false,
    coyote: 0,
    jumpBuffer: 0,
    dropTimer: 0,
    anim: "idle",
    animT: 0,
    squashX: 1,
    squashY: 1,
    invuln: 0,
  };
}

export class EmberfoxGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  onUi: (ui: GameUi) => void;
  assets: Assets | null = null;
  level: Level = buildLevel();
  player: Player = makePlayer(this.level.spawn.x, this.level.spawn.y);
  spawn = { x: 0, y: 0 };
  keys = new Set<string>();
  injected: Set<string> | null = null;
  touch = { left: false, right: false, jump: false, down: false };
  jumpHeldPrev = false;
  pauseHeldPrev = false;
  mode: Mode = "title";
  coins = 0;
  collected = new Set<string>();
  checkpointLit = new Set<string>();
  lives = 3;
  time = 0;
  save: SaveData = loadSave();
  audio = new GameAudio();
  camX = 0;
  camY = 0;
  lookX = 0;
  trauma = 0;
  particles: Particle[] = [];
  motes: { x: number; y: number; s: number; p: number }[] = [];
  raf = 0;
  acc = 0;
  last = 0;
  running = false;
  reduced = false;
  lastUi: string = "";
  stepT = 0;
  destroyed = false;

  constructor(canvas: HTMLCanvasElement, onUi: (ui: GameUi) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;
    this.onUi = onUi;
    this.spawn = {
      x: this.level.spawn.x * TILE + (TILE - PLAYER_W) / 2,
      y: this.level.spawn.y * TILE + TILE - PLAYER_H - 1,
    };
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.audio.setMuted(this.save.muted);
    this.bind();
    this.wireControlsTest();
    for (let i = 0; i < 40; i++) {
      this.motes.push({
        x: Math.random() * this.level.w * TILE,
        y: Math.random() * this.level.h * TILE,
        s: 0.4 + Math.random() * 1.2,
        p: Math.random() * Math.PI * 2,
      });
    }
  }

  async start() {
    this.assets = await loadAssets();
    if (this.destroyed) return;
    this.running = true;
    this.last = performance.now();
    this.resize();
    this.emit();
    this.loop(this.last);
  }

  destroy() {
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.unbind();
    if (window.__controlsTest) delete window.__controlsTest;
  }

  setMuted(m: boolean) {
    this.save.muted = m;
    this.audio.setMuted(m);
    writeSave(this.save);
    this.emit();
  }

  play() {
    this.audio.unlock();
    this.resetRun(false);
    this.mode = "playing";
    this.emit();
  }

  resume() {
    if (this.mode === "paused") {
      this.mode = "playing";
      this.audio.unlock();
      this.emit();
    }
  }

  pause() {
    if (this.mode === "playing") {
      this.mode = "paused";
      this.emit();
    }
  }

  restart() {
    this.audio.unlock();
    this.resetRun(true);
    this.mode = "playing";
    this.emit();
  }

  setTouch(partial: Partial<typeof this.touch>) {
    Object.assign(this.touch, partial);
  }

  private resetRun(full: boolean) {
    this.level = buildLevel();
    this.player = makePlayer(this.level.spawn.x, this.level.spawn.y);
    this.spawn = { x: this.player.x, y: this.player.y };
    this.coins = 0;
    this.collected.clear();
    this.checkpointLit.clear();
    this.lives = 3;
    this.time = 0;
    this.particles = [];
    this.trauma = 0;
    this.camX = this.player.x - VIEW_W * 0.35;
    this.camY = this.player.y - VIEW_H * 0.6;
  }

  private bind = () => {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVis);
    window.addEventListener("resize", this.resize);
  };

  private unbind = () => {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVis);
    window.removeEventListener("resize", this.resize);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const gameKeys = new Set([
      "KeyA",
      "KeyD",
      "KeyW",
      "KeyS",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Space",
      "KeyP",
      "Escape",
      "KeyR",
      "KeyM",
    ]);
    if (gameKeys.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
    if (e.code === "KeyM") this.setMuted(!this.save.muted);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => {
    this.keys.clear();
  };

  private onVis = () => {
    if (document.hidden) {
      this.keys.clear();
      if (this.mode === "playing") this.pause();
    } else {
      this.audio.resume();
    }
  };

  resize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(parent.clientWidth / VIEW_W, parent.clientHeight / VIEW_H);
    const cssW = Math.max(1, Math.floor(VIEW_W * scale));
    const cssH = Math.max(1, Math.floor(VIEW_H * scale));
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.floor(VIEW_W * dpr);
    this.canvas.height = Math.floor(VIEW_H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
  };

  private held(code: string) {
    const src = this.injected ?? this.keys;
    return src.has(code);
  }

  private actions() {
    let moveX = 0;
    if (this.held("KeyA") || this.held("ArrowLeft") || this.touch.left) moveX -= 1;
    if (this.held("KeyD") || this.held("ArrowRight") || this.touch.right) moveX += 1;
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes[0] ?? 0;
      if (Math.abs(ax) > 0.25) moveX += Math.sign(ax);
      if (pad.buttons[14]?.pressed) moveX -= 1;
      if (pad.buttons[15]?.pressed) moveX += 1;
    }
    moveX = Math.max(-1, Math.min(1, moveX));

    const jumpHeld =
      this.held("Space") ||
      this.held("KeyW") ||
      this.held("ArrowUp") ||
      this.touch.jump ||
      pads.some((p) => p?.buttons[0]?.pressed);
    const jumpPressed = jumpHeld && !this.jumpHeldPrev;
    this.jumpHeldPrev = jumpHeld;

    const down =
      this.held("KeyS") ||
      this.held("ArrowDown") ||
      this.touch.down ||
      pads.some((p) => p?.buttons[13]?.pressed);

    const pauseHeld = this.held("KeyP") || this.held("Escape") || pads.some((p) => p?.buttons[9]?.pressed);
    const pausePressed = pauseHeld && !this.pauseHeldPrev;
    this.pauseHeldPrev = pauseHeld;

    return { moveX, jumpHeld, jumpPressed, down, pausePressed };
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(MAX_FRAME_DT, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    while (this.acc >= FIXED_DT) {
      this.step(FIXED_DT);
      this.acc -= FIXED_DT;
    }
    this.draw(this.acc / FIXED_DT);
    this.raf = requestAnimationFrame(this.loop);
  };

  private step(dt: number) {
    const act = this.actions();
    if (act.pausePressed) {
      if (this.mode === "playing") this.pause();
      else if (this.mode === "paused") this.resume();
    }
    if (this.mode === "paused" || this.mode === "lost") return;
    if (this.mode === "win") {
      this.tickParticles(dt);
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
      return;
    }
    if (this.mode === "title") {
      const p = this.player;
      p.anim = "idle";
      p.animT += dt * 6;
      this.updateCamera(dt);
      this.tickParticles(dt);
      return;
    }

    if (this.mode === "playing") this.time += dt;

    const p = this.player;
    if (act.jumpPressed) p.jumpBuffer = JUMP_BUFFER;
    else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    p.coyote = p.grounded ? COYOTE : Math.max(0, p.coyote - dt);
    p.dropTimer = Math.max(0, p.dropTimer - dt);
    p.invuln = Math.max(0, p.invuln - dt);

    if (act.down && p.grounded) p.dropTimer = DROP_TIME;

    const target = act.moveX * RUN_SPEED;
    const accel = p.grounded ? ACCEL_GROUND : ACCEL_AIR;
    if (act.moveX !== 0) {
      p.vx += Math.sign(target - p.vx) * accel * dt;
      if (Math.abs(p.vx) > RUN_SPEED) p.vx = Math.sign(p.vx) * RUN_SPEED;
      p.facing = act.moveX < 0 ? -1 : 1;
    } else if (p.grounded) {
      const s = Math.sign(p.vx);
      p.vx -= s * FRICTION * dt;
      if (Math.sign(p.vx) !== s) p.vx = 0;
    } else {
      p.vx *= 1 - AIR_DRAG * dt * 60;
    }

    const canJump = p.coyote > 0;
    if (p.jumpBuffer > 0 && canJump) {
      p.vy = JUMP_V;
      p.grounded = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      p.squashX = 0.72;
      p.squashY = 1.28;
      this.audio.jump();
      this.burst(p.x + p.w / 2, p.y + p.h, 6, "#d7d1c4");
    }
    if (!act.jumpHeld && p.vy < 0) p.vy *= Math.pow(JUMP_CUT, dt * 8);

    let g = GRAVITY_DOWN;
    if (p.vy < 0) g = GRAVITY_UP;
    if (Math.abs(p.vy) < APEX_THRESH) g = GRAVITY_APEX;
    p.vy = Math.min(MAX_FALL, p.vy + g * dt);

    this.moveAxis(p, p.vx * dt, 0);
    this.moveAxis(p, 0, p.vy * dt);

    this.overlaps();

    if (p.y > this.level.h * TILE + 40) this.die();

    const moving = Math.abs(p.vx) > 18;
    if (!p.grounded) p.anim = "jump";
    else if (moving) p.anim = "run";
    else p.anim = "idle";
    p.animT += dt * (p.anim === "run" ? 11 : p.anim === "jump" ? 8 : 6);

    if (p.grounded && moving) {
      this.stepT += dt;
      if (this.stepT > 0.22) {
        this.stepT = 0;
        this.audio.step();
        this.burst(p.x + p.w / 2, p.y + p.h, 2, "#c4b89a");
      }
    }

    const tx = 1;
    p.squashX += (tx - p.squashX) * (1 - Math.exp(-14 * dt));
    p.squashY += (tx - p.squashY) * (1 - Math.exp(-14 * dt));

    this.tickParticles(dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.updateCamera(dt);

    if (this.time * 10 - Math.floor(this.time * 10) < dt * 10) this.emit();
  }

  private moveAxis(p: Player, dx: number, dy: number) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (TILE * 0.4)));
    const sx = dx / steps;
    const sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      p.x += sx;
      p.y += sy;
      this.collide(p, sx, sy);
    }
  }

  private cellAt(tx: number, ty: number): Cell {
    if (ty < 0 || ty >= this.level.h || tx < 0 || tx >= this.level.w) return ".";
    return this.level.grid[ty][tx];
  }

  private collide(p: Player, dx: number, dy: number) {
    const x0 = Math.floor(p.x / TILE);
    const x1 = Math.floor((p.x + p.w - 0.001) / TILE);
    const y0 = Math.floor(p.y / TILE);
    const y1 = Math.floor((p.y + p.h - 0.001) / TILE);
    let grounded = p.grounded;
    if (dy !== 0) grounded = false;

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.cellAt(tx, ty);
        const solid = isSolid(c);
        const oneWay = isOneWay(c);
        if (!solid && !oneWay) continue;
        const left = tx * TILE;
        const top = ty * TILE;
        const right = left + TILE;
        const bottom = top + TILE;

        if (dx !== 0 && solid) {
          const overlapY = Math.min(p.y + p.h, bottom) - Math.max(p.y, top);
          if (overlapY < 3) continue;
          if (dx > 0) p.x = left - p.w;
          else p.x = right;
          p.vx = 0;
        }
        if (dy !== 0) {
          if (oneWay) {
            if (dy < 0) continue;
            if (p.dropTimer > 0) continue;
            const prevBottom = p.y + p.h - dy;
            if (prevBottom > top + 4) continue;
          }
          if (dy > 0) {
            p.y = top - p.h;
            if (p.vy > 220) {
              p.squashX = 1.22;
              p.squashY = 0.78;
              this.audio.land();
              this.burst(p.x + p.w / 2, p.y + p.h, 8, "#d7d1c4");
            }
            p.vy = 0;
            grounded = true;
          } else if (solid) {
            p.y = bottom;
            p.vy = 0;
          }
        }
      }
    }
    if (dy !== 0) p.grounded = grounded;
  }

  private overlaps() {
    const p = this.player;
    const x0 = Math.floor(p.x / TILE);
    const x1 = Math.floor((p.x + p.w) / TILE);
    const y0 = Math.floor(p.y / TILE);
    const y1 = Math.floor((p.y + p.h) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.cellAt(tx, ty);
        const key = `${tx},${ty}`;
        if (c === "o" && !this.collected.has(key)) {
          const cx = tx * TILE + TILE / 2;
          const cy = ty * TILE + TILE / 2;
          if (aabb(p.x, p.y, p.w, p.h, cx - 8, cy - 8, 16, 16)) {
            this.collected.add(key);
            this.coins++;
            this.audio.coin();
            this.burst(cx, cy, 10, "#f0e2b0");
            this.emit();
          }
        }
        if (c === "C") {
          const cx = tx * TILE + TILE / 2;
          const cy = ty * TILE + 8;
          if (aabb(p.x, p.y, p.w, p.h, cx - 10, cy - 14, 20, 28)) {
            const nx = tx * TILE + (TILE - PLAYER_W) / 2;
            const ny = ty * TILE + TILE - PLAYER_H - 1;
            if (this.spawn.x !== nx || this.spawn.y !== ny) {
              this.spawn = { x: nx, y: ny };
              this.checkpointLit.add(key);
              this.audio.checkpoint();
              this.burst(cx, cy, 12, "#ece7dc");
            }
          }
        }
        if (c === "G" && this.mode === "playing") {
          const cx = tx * TILE + TILE / 2;
          const cy = ty * TILE + 4;
          if (aabb(p.x, p.y, p.w, p.h, cx - 12, cy - 8, 24, 36)) this.win();
        }
        if (c === "^" && p.invuln <= 0 && this.mode === "playing") {
          const sx = tx * TILE + 6;
          const sy = ty * TILE + 14;
          if (aabb(p.x, p.y, p.w, p.h, sx, sy, TILE - 12, TILE - 14)) this.die();
        }
      }
    }
  }

  private die() {
    if (this.mode !== "playing") return;
    this.audio.hurt();
    this.trauma = Math.min(1, this.trauma + 0.7);
    this.burst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 16, "#c45c4a");
    this.lives -= 1;
    if (this.lives <= 0) {
      this.mode = "lost";
      this.emit();
      return;
    }
    this.player.x = this.spawn.x;
    this.player.y = this.spawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.invuln = 1.1;
    this.emit();
  }

  private win() {
    this.mode = "win";
    this.audio.win();
    this.trauma = 0.35;
    const all = this.coins >= this.level.coinTotal;
    if (this.save.bestTime === null || this.time < this.save.bestTime) this.save.bestTime = this.time;
    if (this.coins > this.save.bestCoins) this.save.bestCoins = this.coins;
    writeSave(this.save);
    const p = this.player;
    this.burst(p.x + p.w / 2, p.y, 24, "#f0e2b0");
    this.emit();
    void all;
  }

  private burst(x: number, y: number, n: number, color: string) {
    if (this.reduced) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 90;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 30,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        size: 1.5 + Math.random() * 2.5,
        color,
      });
    }
  }

  private tickParticles(dt: number) {
    for (const q of this.particles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 280 * dt;
    }
    this.particles = this.particles.filter((q) => q.life > 0);
  }

  private updateCamera(dt: number) {
    const p = this.player;
    this.lookX += (p.facing * 48 - this.lookX) * (1 - Math.exp(-3 * dt));
    const targetX = p.x + p.w / 2 - VIEW_W * 0.42 + this.lookX;
    const targetY = p.y + p.h / 2 - VIEW_H * 0.58;
    const deadX = 28;
    const deadY = 18;
    let dx = targetX - this.camX;
    let dy = targetY - this.camY;
    if (Math.abs(dx) < deadX) dx = 0;
    else dx -= Math.sign(dx) * deadX;
    if (Math.abs(dy) < deadY) dy = 0;
    else dy -= Math.sign(dy) * deadY;
    this.camX += dx * (1 - Math.exp(-6 * dt));
    this.camY += dy * (1 - Math.exp(-5 * dt));
    const maxX = this.level.w * TILE - VIEW_W;
    const maxY = this.level.h * TILE - VIEW_H;
    this.camX = Math.max(0, Math.min(maxX, this.camX));
    this.camY = Math.max(0, Math.min(Math.max(0, maxY), this.camY));
  }

  private draw(_alpha: number) {
    const ctx = this.ctx;
    const a = this.assets;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    const shake = this.reduced ? 0 : this.trauma * this.trauma;
    const ox = shake ? (Math.random() * 2 - 1) * 10 * shake : 0;
    const oy = shake ? (Math.random() * 2 - 1) * 8 * shake : 0;
    const camX = Math.round(this.camX + ox);
    const camY = Math.round(this.camY + oy);

    if (a) {
      const skyScale = VIEW_H / a.sky.height;
      const skyW = a.sky.width * skyScale;
      const par = (camX * 0.08) % skyW;
      ctx.drawImage(a.sky, -par, 0, skyW, VIEW_H);
      ctx.drawImage(a.sky, -par + skyW, 0, skyW, VIEW_H);
      const farScale = VIEW_H / a.far.height;
      const farW = a.far.width * farScale;
      const farPar = (camX * 0.28) % farW;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(a.far, -farPar, 8, farW, VIEW_H);
      ctx.drawImage(a.far, -farPar + farW, 8, farW, VIEW_H);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = "#0c1018";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    const t = performance.now() / 1000;
    for (const m of this.motes) {
      const mx = m.x - camX * 0.55;
      const my = m.y - camY * 0.55 + Math.sin(t * 0.6 + m.p) * 8;
      const sx = ((mx % VIEW_W) + VIEW_W) % VIEW_W;
      const sy = ((my % VIEW_H) + VIEW_H) % VIEW_H;
      ctx.globalAlpha = 0.18 + Math.sin(t + m.p) * 0.1;
      ctx.fillStyle = "#f0e2b0";
      ctx.beginPath();
      ctx.arc(sx, sy, m.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const tx0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const ty0 = Math.max(0, Math.floor(camY / TILE) - 1);
    const tx1 = Math.min(this.level.w - 1, Math.ceil((camX + VIEW_W) / TILE) + 1);
    const ty1 = Math.min(this.level.h - 1, Math.ceil((camY + VIEW_H) / TILE) + 1);

    if (a) {
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const c = this.level.grid[ty][tx];
          const wx = tx * TILE - camX;
          const wy = ty * TILE - camY;
          if (isSolid(c)) {
            const above = this.cellAt(tx, ty - 1);
            if (isSolid(above)) {
              const sx = (tx * 37) % (a.dirt.width - TILE);
              const sy = (ty * 53) % (a.dirt.height - TILE);
              ctx.drawImage(a.dirt, sx, sy, TILE, TILE, wx, wy, TILE, TILE);
            } else {
              const left = isSolid(this.cellAt(tx - 1, ty));
              const right = isSolid(this.cellAt(tx + 1, ty));
              const gi = !left && right ? 0 : left && !right ? 2 : 1;
              ctx.drawImage(a.grass[gi], wx - 2, wy - 10, TILE + 4, TILE + 12);
            }
          } else if (isOneWay(c)) {
            const left = isOneWay(this.cellAt(tx - 1, ty));
            const right = isOneWay(this.cellAt(tx + 1, ty));
            const gi = !left && right ? 0 : left && !right ? 2 : 1;
            ctx.drawImage(a.grass[gi], wx - 2, wy - 8, TILE + 4, 22);
          }
        }
      }
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const c = this.level.grid[ty][tx];
          const wx = tx * TILE - camX;
          const wy = ty * TILE - camY;
          const key = `${tx},${ty}`;
          if (c === "^") ctx.drawImage(a.spike, wx + 2, wy + 4, TILE - 4, TILE - 4);
          if (c === "o" && !this.collected.has(key)) {
            const fi = Math.floor(t * 8 + tx) % a.firefly.length;
            const bob = Math.sin(t * 3 + tx) * 3;
            ctx.drawImage(a.firefly[fi], wx + 4, wy + 4 + bob, TILE - 8, TILE - 8);
          }
          if (c === "C") {
            ctx.globalAlpha = this.checkpointLit.has(key) ? 1 : 0.7;
            ctx.drawImage(a.lantern, wx + 4, wy - 10, TILE - 8, TILE + 10);
            ctx.globalAlpha = 1;
          }
          if (c === "G") {
            const glow = 0.55 + Math.sin(t * 2.4) * 0.15;
            ctx.globalAlpha = glow;
            ctx.drawImage(a.lantern, wx - 4, wy - 28, TILE + 8, TILE + 28);
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x - camX, q.y - camY, q.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawPlayer(camX, camY, t);
  }

  private drawPlayer(camX: number, camY: number, t: number) {
    const a = this.assets;
    const p = this.player;
    if (p.invuln > 0 && Math.floor(t * 18) % 2 === 0) return;
    let frames = a?.foxIdle;
    if (p.anim === "run") frames = a?.foxRun;
    if (p.anim === "jump") frames = a?.foxJump;
    const idx = frames ? Math.floor(p.animT) % frames.length : 0;
    const px = p.x - camX;
    const py = p.y - camY;
    const sw = SPRITE * p.squashX;
    const sh = SPRITE * p.squashY;
    const dx = px + p.w / 2;
    const dy = py + p.h;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.scale(p.facing, 1);
    if (frames) {
      ctx.drawImage(frames[idx], -sw / 2, -sh + 4, sw, sh);
    } else {
      ctx.fillStyle = "#ece7dc";
      ctx.fillRect(-p.w / 2, -p.h, p.w, p.h);
    }
    ctx.restore();
  }

  private emit() {
    const ui: GameUi = {
      mode: this.mode,
      coins: this.coins,
      totalCoins: this.level.coinTotal,
      lives: this.lives,
      time: this.time,
      bestTime: this.save.bestTime,
      muted: this.save.muted,
      collectedAll: this.coins >= this.level.coinTotal,
    };
    const sig = JSON.stringify(ui);
    if (sig === this.lastUi) return;
    this.lastUi = sig;
    this.onUi(ui);
  }

  private wireControlsTest() {
    window.__controlsTest = {
      getYaw: () => (this.player.facing === -1 ? 1 : -1),
      getSpeed: () => Math.abs(this.player.vx),
      getX: () => this.player.x,
      getVx: () => this.player.vx,
      setKeys: (codes: string[]) => {
        this.injected = codes.length ? new Set(codes) : null;
      },
      setSteer: (v: number) => {
        if (v > 0.1) this.injected = new Set(["KeyA"]);
        else if (v < -0.1) this.injected = new Set(["KeyD"]);
        else this.injected = null;
      },
    };
  }
}

function aabb(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
