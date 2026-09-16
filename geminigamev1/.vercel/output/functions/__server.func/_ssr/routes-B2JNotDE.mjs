import { i as __toESM } from "../_runtime.mjs";
import { L as require_react, v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Play, i as RotateCcw, n as Volume2, o as Pause, t as VolumeX } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-B2JNotDE.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FIXED_DT = 1 / 60;
var MAX_FRAME_DT = .1;
var ACCEL_GROUND = 2600;
var FRICTION = 2400;
var ACCEL_AIR = 1500;
var AIR_DRAG = .18;
var GRAVITY_UP = 1450;
var GRAVITY_DOWN = 2500;
var JUMP_V = -470;
var JUMP_CUT = .48;
var COYOTE = .1;
var JUMP_BUFFER = .13;
var DROP_TIME = .18;
var SAVE_KEY = "emberfox-save-v1";
var GameAudio = class {
	ctx = null;
	bus = null;
	muted = false;
	unlocked = false;
	unlock() {
		if (!this.ctx) {
			const C = window.AudioContext || window.webkitAudioContext;
			this.ctx = new C({ latencyHint: "interactive" });
			const master = this.ctx.createGain();
			const sfx = this.ctx.createGain();
			const music = this.ctx.createGain();
			sfx.gain.value = .7;
			music.gain.value = .22;
			sfx.connect(master);
			music.connect(master);
			master.connect(this.ctx.destination);
			this.bus = {
				master,
				sfx,
				music
			};
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
		this.unlocked = true;
		this.applyMute();
	}
	resume() {
		if (this.ctx?.state === "suspended") this.ctx.resume();
	}
	setMuted(m) {
		this.muted = m;
		this.applyMute();
	}
	applyMute() {
		if (!this.bus || !this.ctx) return;
		const g = this.muted ? 0 : 1;
		this.bus.master.gain.setTargetAtTime(g, this.ctx.currentTime, .02);
	}
	tone(freq, dur, type, gain = .12, slide = 0, dest = "sfx") {
		if (!this.ctx || !this.bus || this.muted) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t);
		if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		osc.connect(g);
		g.connect(this.bus[dest]);
		osc.start(t);
		osc.stop(t + dur + .02);
	}
	noise(dur, gain = .08, hp = 400) {
		if (!this.ctx || !this.bus || this.muted) return;
		const n = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
		const d = n.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
		const src = this.ctx.createBufferSource();
		src.buffer = n;
		const filter = this.ctx.createBiquadFilter();
		filter.type = "highpass";
		filter.frequency.value = hp;
		const g = this.ctx.createGain();
		const t = this.ctx.currentTime;
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		src.connect(filter);
		filter.connect(g);
		g.connect(this.bus.sfx);
		src.start(t);
	}
	jump() {
		this.tone(520 + Math.random() * 30, .12, "square", .07, 1.6);
	}
	land() {
		this.noise(.08, .06, 200);
		this.tone(140, .08, "sine", .05, .5);
	}
	coin() {
		this.tone(880, .08, "sine", .07, 1.4);
		this.tone(1320, .14, "sine", .05, 1.1);
	}
	checkpoint() {
		this.tone(392, .16, "triangle", .07);
		this.tone(523, .22, "triangle", .05);
	}
	hurt() {
		this.tone(220, .22, "sawtooth", .08, .4);
		this.noise(.12, .05, 120);
	}
	win() {
		this.tone(523, .18, "triangle", .08);
		this.tone(659, .22, "triangle", .07);
		this.tone(784, .4, "triangle", .07);
	}
	step() {
		this.noise(.04, .03, 600);
	}
};
function fill(grid, x, y, w, h, c) {
	const H = grid.length;
	const W = grid[0].length;
	for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
		const gx = x + i;
		const gy = y + j;
		if (gx >= 0 && gx < W && gy >= 0 && gy < H) grid[gy][gx] = c;
	}
}
function put(grid, x, y, c) {
	if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) grid[y][x] = c;
}
/** 140×18 tile hollow: meadows, gaps, one-ways, spike pits, a climb, the lantern. */
function buildLevel() {
	const W = 140;
	const H = 18;
	const grid = Array.from({ length: H }, () => Array(W).fill("."));
	const ground = (x, w, top = 14) => {
		fill(grid, x, top, w, H - top, "#");
	};
	const pit = (x, w) => {
		fill(grid, x, 14, w, 4, ".");
		fill(grid, x, 17, w, 1, "^");
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
	let spawn = {
		x: 4,
		y: 13
	};
	let coinTotal = 0;
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		if (grid[y][x] === "P") {
			spawn = {
				x,
				y
			};
			grid[y][x] = ".";
		}
		if (grid[y][x] === "o") coinTotal++;
	}
	return {
		w: W,
		h: H,
		grid,
		spawn,
		coinTotal
	};
}
function isSolid(c) {
	return c === "#";
}
function isOneWay(c) {
	return c === "=";
}
var defaults = {
	version: 1,
	bestTime: null,
	bestCoins: 0,
	muted: false
};
function migrate(raw) {
	const s = {
		...defaults,
		...raw
	};
	s.version = 1;
	return s;
}
function loadSave() {
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return { ...defaults };
		return migrate(JSON.parse(raw));
	} catch {
		return { ...defaults };
	}
}
function writeSave(data) {
	try {
		localStorage.setItem(SAVE_KEY, JSON.stringify({
			...data,
			version: 1
		}));
	} catch {}
}
function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(/* @__PURE__ */ new Error(`Failed to load ${src}`));
		img.src = src;
	});
}
async function loadAssets() {
	const foxIdle = await Promise.all([
		1,
		2,
		3,
		4
	].map((i) => loadImage(`/game/fox-idle-${i}.png`)));
	const foxRun = await Promise.all([
		1,
		2,
		3,
		4,
		5,
		6
	].map((i) => loadImage(`/game/fox-run-${i}.png`)));
	const foxJump = await Promise.all([
		1,
		2,
		3,
		4
	].map((i) => loadImage(`/game/fox-jump-${i}.png`)));
	const firefly = await Promise.all([
		1,
		2,
		3,
		4
	].map((i) => loadImage(`/game/firefly-${i}.png`)));
	const [spike, lantern, g1, g2, g3, dirt, sky, far] = await Promise.all([
		loadImage("/game/spike.png"),
		loadImage("/game/lantern.png"),
		loadImage("/game/grass-1.png"),
		loadImage("/game/grass-2.png"),
		loadImage("/game/grass-3.png"),
		loadImage("/game/dirt.png"),
		loadImage("/game/sky.jpg"),
		loadImage("/game/far.jpg")
	]);
	return {
		foxIdle,
		foxRun,
		foxJump,
		firefly,
		spike,
		lantern,
		grass: [
			g1,
			g2,
			g3
		],
		dirt,
		sky,
		far
	};
}
function makePlayer(tx, ty) {
	return {
		x: tx * 32 + 9,
		y: ty * 32 + 32 - 22 - 1,
		vx: 0,
		vy: 0,
		w: 14,
		h: 22,
		facing: 1,
		grounded: false,
		coyote: 0,
		jumpBuffer: 0,
		dropTimer: 0,
		anim: "idle",
		animT: 0,
		squashX: 1,
		squashY: 1,
		invuln: 0
	};
}
var EmberfoxGame = class {
	canvas;
	ctx;
	onUi;
	assets = null;
	level = buildLevel();
	player = makePlayer(this.level.spawn.x, this.level.spawn.y);
	spawn = {
		x: 0,
		y: 0
	};
	keys = /* @__PURE__ */ new Set();
	injected = null;
	touch = {
		left: false,
		right: false,
		jump: false,
		down: false
	};
	jumpHeldPrev = false;
	pauseHeldPrev = false;
	mode = "title";
	coins = 0;
	collected = /* @__PURE__ */ new Set();
	checkpointLit = /* @__PURE__ */ new Set();
	lives = 3;
	time = 0;
	save = loadSave();
	audio = new GameAudio();
	camX = 0;
	camY = 0;
	lookX = 0;
	trauma = 0;
	particles = [];
	motes = [];
	raf = 0;
	acc = 0;
	last = 0;
	running = false;
	reduced = false;
	lastUi = "";
	stepT = 0;
	destroyed = false;
	constructor(canvas, onUi) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas 2D unavailable");
		this.ctx = ctx;
		this.onUi = onUi;
		this.spawn = {
			x: this.level.spawn.x * 32 + 9,
			y: this.level.spawn.y * 32 + 32 - 22 - 1
		};
		this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		this.audio.setMuted(this.save.muted);
		this.bind();
		this.wireControlsTest();
		for (let i = 0; i < 40; i++) this.motes.push({
			x: Math.random() * this.level.w * 32,
			y: Math.random() * this.level.h * 32,
			s: .4 + Math.random() * 1.2,
			p: Math.random() * Math.PI * 2
		});
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
	setMuted(m) {
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
	setTouch(partial) {
		Object.assign(this.touch, partial);
	}
	resetRun(full) {
		this.level = buildLevel();
		this.player = makePlayer(this.level.spawn.x, this.level.spawn.y);
		this.spawn = {
			x: this.player.x,
			y: this.player.y
		};
		this.coins = 0;
		this.collected.clear();
		this.checkpointLit.clear();
		this.lives = 3;
		this.time = 0;
		this.particles = [];
		this.trauma = 0;
		this.camX = this.player.x - 224;
		this.camY = this.player.y - 216;
	}
	bind = () => {
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
		window.addEventListener("blur", this.onBlur);
		document.addEventListener("visibilitychange", this.onVis);
		window.addEventListener("resize", this.resize);
	};
	unbind = () => {
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
		window.removeEventListener("blur", this.onBlur);
		document.removeEventListener("visibilitychange", this.onVis);
		window.removeEventListener("resize", this.resize);
	};
	onKeyDown = (e) => {
		if ((/* @__PURE__ */ new Set([
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
			"KeyM"
		])).has(e.code)) e.preventDefault();
		this.keys.add(e.code);
		if (e.code === "KeyM") this.setMuted(!this.save.muted);
	};
	onKeyUp = (e) => {
		this.keys.delete(e.code);
	};
	onBlur = () => {
		this.keys.clear();
	};
	onVis = () => {
		if (document.hidden) {
			this.keys.clear();
			if (this.mode === "playing") this.pause();
		} else this.audio.resume();
	};
	resize = () => {
		const parent = this.canvas.parentElement;
		if (!parent) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const scale = Math.min(parent.clientWidth / 640, parent.clientHeight / 360);
		const cssW = Math.max(1, Math.floor(640 * scale));
		const cssH = Math.max(1, Math.floor(360 * scale));
		this.canvas.style.width = `${cssW}px`;
		this.canvas.style.height = `${cssH}px`;
		this.canvas.width = Math.floor(640 * dpr);
		this.canvas.height = Math.floor(360 * dpr);
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.ctx.imageSmoothingEnabled = true;
		this.ctx.imageSmoothingQuality = "high";
	};
	held(code) {
		return (this.injected ?? this.keys).has(code);
	}
	actions() {
		let moveX = 0;
		if (this.held("KeyA") || this.held("ArrowLeft") || this.touch.left) moveX -= 1;
		if (this.held("KeyD") || this.held("ArrowRight") || this.touch.right) moveX += 1;
		const pads = navigator.getGamepads?.() ?? [];
		for (const pad of pads) {
			if (!pad) continue;
			const ax = pad.axes[0] ?? 0;
			if (Math.abs(ax) > .25) moveX += Math.sign(ax);
			if (pad.buttons[14]?.pressed) moveX -= 1;
			if (pad.buttons[15]?.pressed) moveX += 1;
		}
		moveX = Math.max(-1, Math.min(1, moveX));
		const jumpHeld = this.held("Space") || this.held("KeyW") || this.held("ArrowUp") || this.touch.jump || pads.some((p) => p?.buttons[0]?.pressed);
		const jumpPressed = jumpHeld && !this.jumpHeldPrev;
		this.jumpHeldPrev = jumpHeld;
		const down = this.held("KeyS") || this.held("ArrowDown") || this.touch.down || pads.some((p) => p?.buttons[13]?.pressed);
		const pauseHeld = this.held("KeyP") || this.held("Escape") || pads.some((p) => p?.buttons[9]?.pressed);
		const pausePressed = pauseHeld && !this.pauseHeldPrev;
		this.pauseHeldPrev = pauseHeld;
		return {
			moveX,
			jumpHeld,
			jumpPressed,
			down,
			pausePressed
		};
	}
	loop = (now) => {
		if (!this.running) return;
		const dt = Math.min(MAX_FRAME_DT, (now - this.last) / 1e3);
		this.last = now;
		this.acc += dt;
		while (this.acc >= FIXED_DT) {
			this.step(FIXED_DT);
			this.acc -= FIXED_DT;
		}
		this.draw(this.acc / FIXED_DT);
		this.raf = requestAnimationFrame(this.loop);
	};
	step(dt) {
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
		const target = act.moveX * 215;
		const accel = p.grounded ? ACCEL_GROUND : ACCEL_AIR;
		if (act.moveX !== 0) {
			p.vx += Math.sign(target - p.vx) * accel * dt;
			if (Math.abs(p.vx) > 215) p.vx = Math.sign(p.vx) * 215;
			p.facing = act.moveX < 0 ? -1 : 1;
		} else if (p.grounded) {
			const s = Math.sign(p.vx);
			p.vx -= s * FRICTION * dt;
			if (Math.sign(p.vx) !== s) p.vx = 0;
		} else p.vx *= 1 - AIR_DRAG * dt * 60;
		const canJump = p.coyote > 0;
		if (p.jumpBuffer > 0 && canJump) {
			p.vy = JUMP_V;
			p.grounded = false;
			p.coyote = 0;
			p.jumpBuffer = 0;
			p.squashX = .72;
			p.squashY = 1.28;
			this.audio.jump();
			this.burst(p.x + p.w / 2, p.y + p.h, 6, "#d7d1c4");
		}
		if (!act.jumpHeld && p.vy < 0) p.vy *= Math.pow(JUMP_CUT, dt * 8);
		let g = GRAVITY_DOWN;
		if (p.vy < 0) g = GRAVITY_UP;
		if (Math.abs(p.vy) < 48) g = 720;
		p.vy = Math.min(740, p.vy + g * dt);
		this.moveAxis(p, p.vx * dt, 0);
		this.moveAxis(p, 0, p.vy * dt);
		this.overlaps();
		if (p.y > this.level.h * 32 + 40) this.die();
		const moving = Math.abs(p.vx) > 18;
		if (!p.grounded) p.anim = "jump";
		else if (moving) p.anim = "run";
		else p.anim = "idle";
		p.animT += dt * (p.anim === "run" ? 11 : p.anim === "jump" ? 8 : 6);
		if (p.grounded && moving) {
			this.stepT += dt;
			if (this.stepT > .22) {
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
	moveAxis(p, dx, dy) {
		const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 12.8));
		const sx = dx / steps;
		const sy = dy / steps;
		for (let i = 0; i < steps; i++) {
			p.x += sx;
			p.y += sy;
			this.collide(p, sx, sy);
		}
	}
	cellAt(tx, ty) {
		if (ty < 0 || ty >= this.level.h || tx < 0 || tx >= this.level.w) return ".";
		return this.level.grid[ty][tx];
	}
	collide(p, dx, dy) {
		const x0 = Math.floor(p.x / 32);
		const x1 = Math.floor((p.x + p.w - .001) / 32);
		const y0 = Math.floor(p.y / 32);
		const y1 = Math.floor((p.y + p.h - .001) / 32);
		let grounded = p.grounded;
		if (dy !== 0) grounded = false;
		for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
			const c = this.cellAt(tx, ty);
			const solid = isSolid(c);
			const oneWay = isOneWay(c);
			if (!solid && !oneWay) continue;
			const left = tx * 32;
			const top = ty * 32;
			const right = left + 32;
			const bottom = top + 32;
			if (dx !== 0 && solid) {
				if (Math.min(p.y + p.h, bottom) - Math.max(p.y, top) < 3) continue;
				if (dx > 0) p.x = left - p.w;
				else p.x = right;
				p.vx = 0;
			}
			if (dy !== 0) {
				if (oneWay) {
					if (dy < 0) continue;
					if (p.dropTimer > 0) continue;
					if (p.y + p.h - dy > top + 4) continue;
				}
				if (dy > 0) {
					p.y = top - p.h;
					if (p.vy > 220) {
						p.squashX = 1.22;
						p.squashY = .78;
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
		if (dy !== 0) p.grounded = grounded;
	}
	overlaps() {
		const p = this.player;
		const x0 = Math.floor(p.x / 32);
		const x1 = Math.floor((p.x + p.w) / 32);
		const y0 = Math.floor(p.y / 32);
		const y1 = Math.floor((p.y + p.h) / 32);
		for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
			const c = this.cellAt(tx, ty);
			const key = `${tx},${ty}`;
			if (c === "o" && !this.collected.has(key)) {
				const cx = tx * 32 + 16;
				const cy = ty * 32 + 16;
				if (aabb(p.x, p.y, p.w, p.h, cx - 8, cy - 8, 16, 16)) {
					this.collected.add(key);
					this.coins++;
					this.audio.coin();
					this.burst(cx, cy, 10, "#f0e2b0");
					this.emit();
				}
			}
			if (c === "C") {
				const cx = tx * 32 + 16;
				const cy = ty * 32 + 8;
				if (aabb(p.x, p.y, p.w, p.h, cx - 10, cy - 14, 20, 28)) {
					const nx = tx * 32 + 9;
					const ny = ty * 32 + 32 - 22 - 1;
					if (this.spawn.x !== nx || this.spawn.y !== ny) {
						this.spawn = {
							x: nx,
							y: ny
						};
						this.checkpointLit.add(key);
						this.audio.checkpoint();
						this.burst(cx, cy, 12, "#ece7dc");
					}
				}
			}
			if (c === "G" && this.mode === "playing") {
				const cx = tx * 32 + 16;
				const cy = ty * 32 + 4;
				if (aabb(p.x, p.y, p.w, p.h, cx - 12, cy - 8, 24, 36)) this.win();
			}
			if (c === "^" && p.invuln <= 0 && this.mode === "playing") {
				const sx = tx * 32 + 6;
				const sy = ty * 32 + 14;
				if (aabb(p.x, p.y, p.w, p.h, sx, sy, 20, 18)) this.die();
			}
		}
	}
	die() {
		if (this.mode !== "playing") return;
		this.audio.hurt();
		this.trauma = Math.min(1, this.trauma + .7);
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
	win() {
		this.mode = "win";
		this.audio.win();
		this.trauma = .35;
		this.coins, this.level.coinTotal;
		if (this.save.bestTime === null || this.time < this.save.bestTime) this.save.bestTime = this.time;
		if (this.coins > this.save.bestCoins) this.save.bestCoins = this.coins;
		writeSave(this.save);
		const p = this.player;
		this.burst(p.x + p.w / 2, p.y, 24, "#f0e2b0");
		this.emit();
	}
	burst(x, y, n, color) {
		if (this.reduced) n = Math.min(n, 4);
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2;
			const s = 40 + Math.random() * 90;
			this.particles.push({
				x,
				y,
				vx: Math.cos(a) * s,
				vy: Math.sin(a) * s - 30,
				life: .35 + Math.random() * .35,
				max: .7,
				size: 1.5 + Math.random() * 2.5,
				color
			});
		}
	}
	tickParticles(dt) {
		for (const q of this.particles) {
			q.life -= dt;
			q.x += q.vx * dt;
			q.y += q.vy * dt;
			q.vy += 280 * dt;
		}
		this.particles = this.particles.filter((q) => q.life > 0);
	}
	updateCamera(dt) {
		const p = this.player;
		this.lookX += (p.facing * 48 - this.lookX) * (1 - Math.exp(-3 * dt));
		const targetX = p.x + p.w / 2 - 268.8 + this.lookX;
		const targetY = p.y + p.h / 2 - 360 * .58;
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
		const maxX = this.level.w * 32 - 640;
		const maxY = this.level.h * 32 - 360;
		this.camX = Math.max(0, Math.min(maxX, this.camX));
		this.camY = Math.max(0, Math.min(Math.max(0, maxY), this.camY));
	}
	draw(_alpha) {
		const ctx = this.ctx;
		const a = this.assets;
		ctx.clearRect(0, 0, 640, 360);
		const shake = this.reduced ? 0 : this.trauma * this.trauma;
		const ox = shake ? (Math.random() * 2 - 1) * 10 * shake : 0;
		const oy = shake ? (Math.random() * 2 - 1) * 8 * shake : 0;
		const camX = Math.round(this.camX + ox);
		const camY = Math.round(this.camY + oy);
		if (a) {
			const skyScale = 360 / a.sky.height;
			const skyW = a.sky.width * skyScale;
			const par = camX * .08 % skyW;
			ctx.drawImage(a.sky, -par, 0, skyW, 360);
			ctx.drawImage(a.sky, -par + skyW, 0, skyW, 360);
			const farScale = 360 / a.far.height;
			const farW = a.far.width * farScale;
			const farPar = camX * .28 % farW;
			ctx.globalAlpha = .92;
			ctx.drawImage(a.far, -farPar, 8, farW, 360);
			ctx.drawImage(a.far, -farPar + farW, 8, farW, 360);
			ctx.globalAlpha = 1;
		} else {
			ctx.fillStyle = "#0c1018";
			ctx.fillRect(0, 0, 640, 360);
		}
		const t = performance.now() / 1e3;
		for (const m of this.motes) {
			const mx = m.x - camX * .55;
			const my = m.y - camY * .55 + Math.sin(t * .6 + m.p) * 8;
			const sx = (mx % 640 + 640) % 640;
			const sy = (my % 360 + 360) % 360;
			ctx.globalAlpha = .18 + Math.sin(t + m.p) * .1;
			ctx.fillStyle = "#f0e2b0";
			ctx.beginPath();
			ctx.arc(sx, sy, m.s, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
		const tx0 = Math.max(0, Math.floor(camX / 32) - 1);
		const ty0 = Math.max(0, Math.floor(camY / 32) - 1);
		const tx1 = Math.min(this.level.w - 1, Math.ceil((camX + 640) / 32) + 1);
		const ty1 = Math.min(this.level.h - 1, Math.ceil((camY + 360) / 32) + 1);
		if (a) {
			for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
				const c = this.level.grid[ty][tx];
				const wx = tx * 32 - camX;
				const wy = ty * 32 - camY;
				if (isSolid(c)) {
					if (isSolid(this.cellAt(tx, ty - 1))) {
						const sx = tx * 37 % (a.dirt.width - 32);
						const sy = ty * 53 % (a.dirt.height - 32);
						ctx.drawImage(a.dirt, sx, sy, 32, 32, wx, wy, 32, 32);
					} else {
						const left = isSolid(this.cellAt(tx - 1, ty));
						const right = isSolid(this.cellAt(tx + 1, ty));
						const gi = !left && right ? 0 : left && !right ? 2 : 1;
						ctx.drawImage(a.grass[gi], wx - 2, wy - 10, 36, 44);
					}
				} else if (isOneWay(c)) {
					const left = isOneWay(this.cellAt(tx - 1, ty));
					const right = isOneWay(this.cellAt(tx + 1, ty));
					const gi = !left && right ? 0 : left && !right ? 2 : 1;
					ctx.drawImage(a.grass[gi], wx - 2, wy - 8, 36, 22);
				}
			}
			for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
				const c = this.level.grid[ty][tx];
				const wx = tx * 32 - camX;
				const wy = ty * 32 - camY;
				const key = `${tx},${ty}`;
				if (c === "^") ctx.drawImage(a.spike, wx + 2, wy + 4, 28, 28);
				if (c === "o" && !this.collected.has(key)) {
					const fi = Math.floor(t * 8 + tx) % a.firefly.length;
					const bob = Math.sin(t * 3 + tx) * 3;
					ctx.drawImage(a.firefly[fi], wx + 4, wy + 4 + bob, 24, 24);
				}
				if (c === "C") {
					ctx.globalAlpha = this.checkpointLit.has(key) ? 1 : .7;
					ctx.drawImage(a.lantern, wx + 4, wy - 10, 24, 42);
					ctx.globalAlpha = 1;
				}
				if (c === "G") {
					ctx.globalAlpha = .55 + Math.sin(t * 2.4) * .15;
					ctx.drawImage(a.lantern, wx - 4, wy - 28, 40, 60);
					ctx.globalAlpha = 1;
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
	drawPlayer(camX, camY, t) {
		const a = this.assets;
		const p = this.player;
		if (p.invuln > 0 && Math.floor(t * 18) % 2 === 0) return;
		let frames = a?.foxIdle;
		if (p.anim === "run") frames = a?.foxRun;
		if (p.anim === "jump") frames = a?.foxJump;
		const idx = frames ? Math.floor(p.animT) % frames.length : 0;
		const px = p.x - camX;
		const py = p.y - camY;
		const sw = 48 * p.squashX;
		const sh = 48 * p.squashY;
		const dx = px + p.w / 2;
		const dy = py + p.h;
		const ctx = this.ctx;
		ctx.save();
		ctx.translate(dx, dy);
		ctx.scale(p.facing, 1);
		if (frames) ctx.drawImage(frames[idx], -sw / 2, -sh + 4, sw, sh);
		else {
			ctx.fillStyle = "#ece7dc";
			ctx.fillRect(-p.w / 2, -p.h, p.w, p.h);
		}
		ctx.restore();
	}
	emit() {
		const ui = {
			mode: this.mode,
			coins: this.coins,
			totalCoins: this.level.coinTotal,
			lives: this.lives,
			time: this.time,
			bestTime: this.save.bestTime,
			muted: this.save.muted,
			collectedAll: this.coins >= this.level.coinTotal
		};
		const sig = JSON.stringify(ui);
		if (sig === this.lastUi) return;
		this.lastUi = sig;
		this.onUi(ui);
	}
	wireControlsTest() {
		window.__controlsTest = {
			getYaw: () => this.player.facing === -1 ? 1 : -1,
			getSpeed: () => Math.abs(this.player.vx),
			getX: () => this.player.x,
			getVx: () => this.player.vx,
			setKeys: (codes) => {
				this.injected = codes.length ? new Set(codes) : null;
			},
			setSteer: (v) => {
				if (v > .1) this.injected = /* @__PURE__ */ new Set(["KeyA"]);
				else if (v < -.1) this.injected = /* @__PURE__ */ new Set(["KeyD"]);
				else this.injected = null;
			}
		};
	}
};
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
	return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
var idleUi = {
	mode: "title",
	coins: 0,
	totalCoins: 0,
	lives: 3,
	time: 0,
	bestTime: null,
	muted: false,
	collectedAll: false
};
function formatTime(t) {
	const m = Math.floor(t / 60);
	return `${m}:${(t - m * 60).toFixed(1).padStart(4, "0")}`;
}
function Game() {
	const canvasRef = (0, import_react.useRef)(null);
	const hostRef = (0, import_react.useRef)(null);
	const gameRef = (0, import_react.useRef)(null);
	const [ui, setUi] = (0, import_react.useState)(idleUi);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [coarse, setCoarse] = (0, import_react.useState)(false);
	const pointers = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const game = new EmberfoxGame(canvas, setUi);
		gameRef.current = game;
		let live = true;
		game.start().then(() => {
			if (live) setReady(true);
		});
		const mq = window.matchMedia("(pointer: coarse), (max-width: 720px)");
		const sync = () => setCoarse(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => {
			live = false;
			mq.removeEventListener("change", sync);
			game.destroy();
			gameRef.current = null;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const host = hostRef.current;
		if (!host) return;
		const ro = new ResizeObserver(() => gameRef.current?.resize());
		ro.observe(host);
		return () => ro.disconnect();
	}, []);
	const onPad = (name, down) => {
		gameRef.current?.setTouch({ [name]: down });
	};
	const bindPad = (name) => ({
		onPointerDown: (e) => {
			e.preventDefault();
			e.currentTarget.setPointerCapture(e.pointerId);
			pointers.current.set(e.pointerId, name);
			onPad(name, true);
		},
		onPointerUp: (e) => {
			const n = pointers.current.get(e.pointerId);
			if (n) onPad(n, false);
			pointers.current.delete(e.pointerId);
		},
		onPointerCancel: (e) => {
			const n = pointers.current.get(e.pointerId);
			if (n) onPad(n, false);
			pointers.current.delete(e.pointerId);
		}
	});
	const playing = ui.mode === "playing";
	const overlay = ui.mode !== "playing";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-[100dvh] w-full flex-col bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			ref: hostRef,
			className: "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
					ref: canvasRef,
					className: "block max-h-full max-w-full touch-none select-none",
					"aria-label": "Emberfox game"
				}),
				playing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute inset-0 flex flex-col justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3 rounded-lg bg-bg/70 px-3 py-2 text-sm tracking-wide",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-medium tabular-nums text-fg",
									children: [ui.coins, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-muted",
										children: ["/", ui.totalCoins]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-subtle",
									"aria-hidden": true,
									children: "·"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums text-muted",
									children: formatTime(ui.time)
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pointer-events-auto flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "rounded-lg bg-bg/70 px-3 py-2 text-sm tabular-nums text-muted",
									children: [
										ui.lives,
										" ",
										ui.lives === 1 ? "life" : "lives"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "flex size-11 items-center justify-center rounded-md bg-bg/70 text-fg transition-transform duration-[var(--motion-quick,150ms)] active:scale-[0.98]",
									onClick: () => gameRef.current?.setMuted(!ui.muted),
									"aria-label": ui.muted ? "Unmute" : "Mute",
									children: ui.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "flex size-11 items-center justify-center rounded-md bg-bg/70 text-fg transition-transform duration-[var(--motion-quick,150ms)] active:scale-[0.98]",
									onClick: () => gameRef.current?.pause(),
									"aria-label": "Pause",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" })
								})
							]
						})]
					})
				}),
				overlay && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-0 flex items-center justify-center bg-bg/55 p-4 pt-[max(1rem,env(safe-area-inset-top))]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "w-full max-w-[22rem] rounded-xl bg-surface p-6 shadow-[var(--shadow-panel)] sm:p-8",
						children: [
							ui.mode === "title" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-6",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col gap-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs font-medium uppercase tracking-[0.18em] text-muted",
												children: "Twilight hollow"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
												className: "font-display text-4xl font-medium leading-tight tracking-[-0.03em] text-fg sm:text-5xl",
												children: "Emberfox"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "max-w-[18rem] text-sm leading-relaxed text-muted",
												children: "Carry the lantern through the vale. Collect fireflies, keep your footing, light the last lamp."
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.98] disabled:opacity-50",
											onClick: () => gameRef.current?.play(),
											disabled: !ready,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }), ready ? "Play" : "Loading"]
										}), ui.bestTime != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-center text-xs tabular-nums text-subtle",
											children: ["Best ", formatTime(ui.bestTime)]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs leading-relaxed text-subtle",
										children: coarse ? "Pads below: move, jump. Hold down to drop through thin ledges." : "A / D or arrows to run. Space or W to jump. Down to drop through ledges. P to pause."
									})
								]
							}),
							ui.mode === "paused" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-display text-3xl font-medium tracking-[-0.03em]",
									children: "Paused"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.98]",
											onClick: () => gameRef.current?.resume(),
											children: "Resume"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface-2 px-4 text-sm font-medium text-fg transition-transform duration-150 active:scale-[0.98]",
											onClick: () => gameRef.current?.restart(),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" }), "Restart"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-muted",
											onClick: () => gameRef.current?.setMuted(!ui.muted),
											children: [ui.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4" }), ui.muted ? "Sound off" : "Sound on"]
										})
									]
								})]
							}),
							ui.mode === "win" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs font-medium uppercase tracking-[0.18em] text-muted",
											children: "The hollow is lit"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "font-display text-3xl font-medium tracking-[-0.03em]",
											children: "You made it"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-sm tabular-nums text-muted",
											children: [
												formatTime(ui.time),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-subtle",
													children: " · "
												}),
												ui.coins,
												"/",
												ui.totalCoins,
												" fireflies"
											]
										}),
										ui.collectedAll && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-fg",
											children: "Every firefly found."
										}),
										ui.bestTime != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs tabular-nums text-subtle",
											children: ["Best ", formatTime(ui.bestTime)]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.98]",
									onClick: () => gameRef.current?.restart(),
									children: "Play again"
								})]
							}),
							ui.mode === "lost" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-display text-3xl font-medium tracking-[-0.03em]",
										children: "The light went out"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-muted",
										children: "Three falls. The vale stays dark — try the path again."
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.98]",
									onClick: () => gameRef.current?.restart(),
									children: "Try again"
								})]
							})
						]
					})
				})
			]
		}), coarse && (ui.mode === "playing" || ui.mode === "title") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex shrink-0 items-end justify-between gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-14 w-16 rounded-lg bg-surface text-lg font-medium text-fg active:bg-surface-2",
					"aria-label": "Move left",
					...bindPad("left"),
					children: "←"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-14 w-16 rounded-lg bg-surface text-lg font-medium text-fg active:bg-surface-2",
					"aria-label": "Move right",
					...bindPad("right"),
					children: "→"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-14 w-14 rounded-lg bg-surface text-xs font-medium text-muted active:bg-surface-2",
					"aria-label": "Drop through",
					...bindPad("down"),
					children: "Down"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-16 w-20 rounded-lg bg-accent text-sm font-medium text-accent-fg active:opacity-90",
					"aria-label": "Jump",
					...bindPad("jump"),
					children: "Jump"
				})]
			})]
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Game, {});
}
//#endregion
export { Home as component };
