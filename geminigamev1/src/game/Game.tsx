import { useEffect, useRef, useState } from "react";
import { EmberfoxGame, type GameUi } from "./engine";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

const idleUi: GameUi = {
  mode: "title",
  coins: 0,
  totalCoins: 0,
  lives: 3,
  time: 0,
  bestTime: null,
  muted: false,
  collectedAll: false,
};

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<EmberfoxGame | null>(null);
  const [ui, setUi] = useState<GameUi>(idleUi);
  const [ready, setReady] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const pointers = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new EmberfoxGame(canvas, setUi);
    gameRef.current = game;
    let live = true;
    void game.start().then(() => {
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

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => gameRef.current?.resize());
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const onPad = (name: "left" | "right" | "jump" | "down", down: boolean) => {
    gameRef.current?.setTouch({ [name]: down });
  };

  const bindPad = (name: "left" | "right" | "jump" | "down") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, name);
      onPad(name, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      const n = pointers.current.get(e.pointerId);
      if (n) onPad(n as typeof name, false);
      pointers.current.delete(e.pointerId);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      const n = pointers.current.get(e.pointerId);
      if (n) onPad(n as typeof name, false);
      pointers.current.delete(e.pointerId);
    },
  });

  const playing = ui.mode === "playing";
  const overlay = ui.mode !== "playing";

  return (
    <div className="relative flex h-[100dvh] w-full flex-col bg-bg text-fg">
      <div
        ref={hostRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="block max-h-full max-w-full touch-none select-none"
          aria-label="Emberfox game"
        />

        {playing && (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 rounded-lg bg-bg/70 px-3 py-2 text-sm tracking-wide">
                <span className="font-medium tabular-nums text-fg">
                  {ui.coins}
                  <span className="text-muted">/{ui.totalCoins}</span>
                </span>
                <span className="text-subtle" aria-hidden>
                  ·
                </span>
                <span className="tabular-nums text-muted">{formatTime(ui.time)}</span>
              </div>
              <div className="pointer-events-auto flex items-center gap-2">
                <span className="rounded-lg bg-bg/70 px-3 py-2 text-sm tabular-nums text-muted">
                  {ui.lives} {ui.lives === 1 ? "life" : "lives"}
                </span>
                <button
                  type="button"
                  className="flex size-11 items-center justify-center rounded-md bg-bg/70 text-fg transition-transform duration-[var(--motion-quick,150ms)] active:scale-[0.98]"
                  onClick={() => gameRef.current?.setMuted(!ui.muted)}
                  aria-label={ui.muted ? "Unmute" : "Mute"}
                >
                  {ui.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
                <button
                  type="button"
                  className="flex size-11 items-center justify-center rounded-md bg-bg/70 text-fg transition-transform duration-[var(--motion-quick,150ms)] active:scale-[0.98]"
                  onClick={() => gameRef.current?.pause()}
                  aria-label="Pause"
                >
                  <Pause className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {overlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/55 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="w-full max-w-[22rem] rounded-xl bg-surface p-6 shadow-[var(--shadow-panel)] sm:p-8">
              {ui.mode === "title" && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Twilight hollow</p>
                    <h1 className="font-display text-4xl font-medium leading-tight tracking-[-0.03em] text-fg sm:text-5xl">
                      Emberfox
                    </h1>
                    <p className="max-w-[18rem] text-sm leading-relaxed text-muted">
                      Carry the lantern through the vale. Collect fireflies, keep your footing, light the last lamp.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
                      onClick={() => gameRef.current?.play()}
                      disabled={!ready}
                    >
                      <Play className="size-4" />
                      {ready ? "Play" : "Loading"}
                    </button>
                    {ui.bestTime != null && (
                      <p className="text-center text-xs tabular-nums text-subtle">
                        Best {formatTime(ui.bestTime)}
                      </p>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-subtle">
                    {coarse
                      ? "Pads below: move, jump. Hold down to drop through thin ledges."
                      : "A / D or arrows to run. Space or W to jump. Down to drop through ledges. P to pause."}
                  </p>
                </div>
              )}

              {ui.mode === "paused" && (
                <div className="flex flex-col gap-5">
                  <h2 className="font-display text-3xl font-medium tracking-[-0.03em]">Paused</h2>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.98]"
                      onClick={() => gameRef.current?.resume()}
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      className="flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface-2 px-4 text-sm font-medium text-fg transition-transform duration-150 active:scale-[0.98]"
                      onClick={() => gameRef.current?.restart()}
                    >
                      <RotateCcw className="size-4" />
                      Restart
                    </button>
                    <button
                      type="button"
                      className="flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-muted"
                      onClick={() => gameRef.current?.setMuted(!ui.muted)}
                    >
                      {ui.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                      {ui.muted ? "Sound off" : "Sound on"}
                    </button>
                  </div>
                </div>
              )}

              {ui.mode === "win" && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">The hollow is lit</p>
                    <h2 className="font-display text-3xl font-medium tracking-[-0.03em]">You made it</h2>
                    <p className="text-sm tabular-nums text-muted">
                      {formatTime(ui.time)}
                      <span className="text-subtle"> · </span>
                      {ui.coins}/{ui.totalCoins} fireflies
                    </p>
                    {ui.collectedAll && (
                      <p className="text-sm text-fg">Every firefly found.</p>
                    )}
                    {ui.bestTime != null && (
                      <p className="text-xs tabular-nums text-subtle">Best {formatTime(ui.bestTime)}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.98]"
                    onClick={() => gameRef.current?.restart()}
                  >
                    Play again
                  </button>
                </div>
              )}

              {ui.mode === "lost" && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <h2 className="font-display text-3xl font-medium tracking-[-0.03em]">The light went out</h2>
                    <p className="text-sm text-muted">Three falls. The vale stays dark — try the path again.</p>
                  </div>
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.98]"
                    onClick={() => gameRef.current?.restart()}
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {coarse && (ui.mode === "playing" || ui.mode === "title") && (
        <div className="flex shrink-0 items-end justify-between gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <div className="flex gap-2">
            <button
              type="button"
              className="h-14 w-16 rounded-lg bg-surface text-lg font-medium text-fg active:bg-surface-2"
              aria-label="Move left"
              {...bindPad("left")}
            >
              ←
            </button>
            <button
              type="button"
              className="h-14 w-16 rounded-lg bg-surface text-lg font-medium text-fg active:bg-surface-2"
              aria-label="Move right"
              {...bindPad("right")}
            >
              →
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-14 w-14 rounded-lg bg-surface text-xs font-medium text-muted active:bg-surface-2"
              aria-label="Drop through"
              {...bindPad("down")}
            >
              Down
            </button>
            <button
              type="button"
              className="h-16 w-20 rounded-lg bg-accent text-sm font-medium text-accent-fg active:opacity-90"
              aria-label="Jump"
              {...bindPad("jump")}
            >
              Jump
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
