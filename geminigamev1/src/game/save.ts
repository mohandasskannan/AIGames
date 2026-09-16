import { SAVE_KEY, SAVE_VERSION } from "./constants";

export type SaveData = {
  version: number;
  bestTime: number | null;
  bestCoins: number;
  muted: boolean;
};

const defaults: SaveData = {
  version: SAVE_VERSION,
  bestTime: null,
  bestCoins: 0,
  muted: false,
};

function migrate(raw: SaveData): SaveData {
  const s = { ...defaults, ...raw };
  s.version = SAVE_VERSION;
  return s;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...defaults };
    return migrate(JSON.parse(raw) as SaveData);
  } catch {
    return { ...defaults };
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, version: SAVE_VERSION }));
  } catch {
    /* private mode / quota */
  }
}
