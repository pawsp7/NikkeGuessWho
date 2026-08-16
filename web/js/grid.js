/**
 * Pure grid-code helpers shared by the UI and Node tests.
 * Seeded codes always rebuild the same 36 Nikkes — no sidecar file required.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.GWN = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const GRID_SIZE = 36;
  const CODE_LENGTH = 8;
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  function burstLabel(burst) {
    const value = String(burst == null ? "" : burst).toLowerCase();
    if (value === "p") return "III+";
    if (value === "1") return "I";
    if (value === "2") return "II";
    if (value === "3") return "III";
    return String(burst || "?");
  }

  function fnv1a(str) {
    let hash = 2166136261;
    const text = String(str);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalizeCode(code) {
    return String(code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  function isValidCode(code) {
    const clean = normalizeCode(code);
    return clean.length === CODE_LENGTH;
  }

  function rngFromCode(code) {
    return mulberry32(fnv1a(normalizeCode(code)));
  }

  function randomCode(randFn) {
    const next = typeof randFn === "function" ? randFn : Math.random;
    let out = "";
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      out += CODE_CHARS[Math.floor(next() * CODE_CHARS.length) % CODE_CHARS.length];
    }
    return out;
  }

  function shuffleCopy(list, rng) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function selectGrid(nikkes, code) {
    if (!Array.isArray(nikkes) || nikkes.length < GRID_SIZE) {
      throw new Error("Need at least 36 Nikkes on the roster");
    }
    const rng = rngFromCode(code);
    return shuffleCopy(nikkes, rng).slice(0, GRID_SIZE);
  }

  function serializeGrid(code, nikkes) {
    const slugs = nikkes.map((n) => n.url);
    return `${normalizeCode(code)}:${slugs.join(",")}`;
  }

  function parseGridCodes(text) {
    const map = new Map();
    String(text || "")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const idx = trimmed.indexOf(":");
        if (idx < 1) return;
        const code = normalizeCode(trimmed.slice(0, idx));
        const slugs = trimmed
          .slice(idx + 1)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (code && slugs.length === GRID_SIZE) {
          map.set(code, slugs);
        }
      });
    return map;
  }

  function generateCodeFile(nikkes, count, randFn) {
    const lines = [];
    const seen = new Set();
    let guard = 0;
    const target = Number(count) || 1000;
    while (lines.length < target && guard < target * 25) {
      guard += 1;
      const code = randomCode(randFn);
      if (seen.has(code)) continue;
      seen.add(code);
      lines.push(serializeGrid(code, selectGrid(nikkes, code)));
    }
    return `${lines.join("\n")}\n`;
  }

  function gridFromSlugs(nikkes, slugs) {
    const bySlug = new Map(nikkes.map((n) => [n.url, n]));
    const grid = [];
    slugs.forEach((slug) => {
      const nikke = bySlug.get(slug);
      if (nikke) grid.push(nikke);
    });
    return grid;
  }

  function resolveGrid(nikkes, code, fileMap) {
    const clean = normalizeCode(code);
    if (!isValidCode(clean)) {
      return { ok: false, error: "Enter an 8-character grid code." };
    }
    if (fileMap && fileMap.has(clean)) {
      const grid = gridFromSlugs(nikkes, fileMap.get(clean));
      if (grid.length !== GRID_SIZE) {
        return { ok: false, error: "That code's roster is incomplete." };
      }
      return { ok: true, code: clean, grid, fromFile: true };
    }
    return { ok: true, code: clean, grid: selectGrid(nikkes, clean), fromFile: false };
  }

  return {
    GRID_SIZE,
    CODE_LENGTH,
    CODE_CHARS,
    burstLabel,
    fnv1a,
    normalizeCode,
    isValidCode,
    randomCode,
    selectGrid,
    serializeGrid,
    parseGridCodes,
    generateCodeFile,
    gridFromSlugs,
    resolveGrid,
  };
});
