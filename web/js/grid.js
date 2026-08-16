/**
 * Pure grid-code helpers shared by the UI and Node tests.
 * Share codes look like 6x6-ABCD2345 so a friend rebuilds the same sized board.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.GWN = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_ROWS = 6;
  const DEFAULT_COLS = 6;
  const MIN_DIM = 4;
  const MAX_DIM = 8;
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

  function isTreasure(nikke) {
    const name = String((nikke && nikke.name) || "");
    const url = String((nikke && nikke.url) || "");
    return /\(\s*treasure\s*\)/i.test(name) || /(?:\?|&)treasure=/i.test(url);
  }

  function playableRoster(nikkes) {
    return (Array.isArray(nikkes) ? nikkes : []).filter((n) => !isTreasure(n));
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

  function clampDim(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(MAX_DIM, Math.max(MIN_DIM, Math.round(n)));
  }

  function normalizeSize(rows, cols, rosterLen) {
    let nextRows = clampDim(rows, DEFAULT_ROWS);
    let nextCols = clampDim(cols, DEFAULT_COLS);
    const maxCells = Math.max(MIN_DIM * MIN_DIM, Number(rosterLen) || nextRows * nextCols);
    while (nextRows * nextCols > maxCells) {
      if (nextCols >= nextRows && nextCols > MIN_DIM) nextCols -= 1;
      else if (nextRows > MIN_DIM) nextRows -= 1;
      else break;
    }
    return { rows: nextRows, cols: nextCols, size: nextRows * nextCols };
  }

  function normalizeCode(code) {
    return String(code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  function isValidCode(code) {
    return normalizeCode(code).length === CODE_LENGTH;
  }

  function formatShareCode(code, rows, cols) {
    const size = normalizeSize(rows, cols, MAX_DIM * MAX_DIM);
    return `${size.rows}x${size.cols}-${normalizeCode(code)}`;
  }

  function parseShareCode(text) {
    const raw = String(text || "").trim().toUpperCase();
    const sized = raw.match(/^(\d+)\s*[X×]\s*(\d+)\s*[-:]\s*([A-Z0-9]{8})$/);
    if (sized) {
      const size = normalizeSize(sized[1], sized[2], MAX_DIM * MAX_DIM);
      return { ok: true, code: sized[3], rows: size.rows, cols: size.cols, size: size.size };
    }
    const plain = normalizeCode(raw);
    if (plain.length === CODE_LENGTH) {
      return { ok: true, code: plain, rows: null, cols: null, size: null };
    }
    return { ok: false, error: "Enter a grid code like 6x6-ABCD2345." };
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

  function selectGrid(nikkes, code, rows, cols) {
    const roster = playableRoster(nikkes);
    const size = normalizeSize(rows, cols, roster.length);
    if (roster.length < size.size) {
      throw new Error("Need a larger Nikke roster for that board size");
    }
    const rng = rngFromCode(code);
    return shuffleCopy(roster, rng).slice(0, size.size);
  }

  function serializeGrid(code, nikkes, rows, cols) {
    const size = normalizeSize(rows, cols, nikkes.length);
    const slugs = nikkes.map((n) => n.url);
    return `${formatShareCode(code, size.rows, size.cols)}:${slugs.join(",")}`;
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
        const parsed = parseShareCode(trimmed.slice(0, idx));
        const slugs = trimmed
          .slice(idx + 1)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (!parsed.ok || !slugs.length) return;
        const size = parsed.size || slugs.length;
        if (parsed.rows && parsed.cols && slugs.length !== parsed.rows * parsed.cols) return;
        const key = parsed.rows && parsed.cols ? formatShareCode(parsed.code, parsed.rows, parsed.cols) : parsed.code;
        map.set(key, {
          code: parsed.code,
          rows: parsed.rows,
          cols: parsed.cols,
          size,
          slugs,
        });
      });
    return map;
  }

  function generateCodeFile(nikkes, count, randFn, rows, cols) {
    const roster = playableRoster(nikkes);
    const size = normalizeSize(rows, cols, roster.length);
    const lines = [];
    const seen = new Set();
    let guard = 0;
    const target = Number(count) || 1000;
    while (lines.length < target && guard < target * 25) {
      guard += 1;
      const code = randomCode(randFn);
      const share = formatShareCode(code, size.rows, size.cols);
      if (seen.has(share)) continue;
      seen.add(share);
      lines.push(serializeGrid(code, selectGrid(roster, code, size.rows, size.cols), size.rows, size.cols));
    }
    return `${lines.join("\n")}\n`;
  }

  function gridFromSlugs(nikkes, slugs) {
    const roster = playableRoster(nikkes);
    const bySlug = new Map(roster.map((n) => [n.url, n]));
    const grid = [];
    slugs.forEach((slug) => {
      const nikke = bySlug.get(slug);
      if (nikke) grid.push(nikke);
    });
    return grid;
  }

  function resolveGrid(nikkes, rawCode, fileMap, rows, cols) {
    const parsed = parseShareCode(rawCode);
    if (!parsed.ok) return parsed;
    const roster = playableRoster(nikkes);
    const size = normalizeSize(parsed.rows || rows, parsed.cols || cols, roster.length);
    const share = formatShareCode(parsed.code, size.rows, size.cols);
    if (fileMap && (fileMap.has(share) || fileMap.has(parsed.code))) {
      const entry = fileMap.get(share) || fileMap.get(parsed.code);
      const grid = gridFromSlugs(roster, entry.slugs);
      if (!grid.length) {
        return { ok: false, error: "That code's roster is incomplete." };
      }
      const entrySize = entry.rows && entry.cols ? normalizeSize(entry.rows, entry.cols, roster.length) : size;
      return {
        ok: true,
        code: parsed.code,
        share: formatShareCode(parsed.code, entrySize.rows, entrySize.cols),
        rows: entrySize.rows,
        cols: entrySize.cols,
        grid,
        fromFile: true,
      };
    }
    return {
      ok: true,
      code: parsed.code,
      share,
      rows: size.rows,
      cols: size.cols,
      grid: selectGrid(roster, parsed.code, size.rows, size.cols),
      fromFile: false,
    };
  }

  return {
    DEFAULT_ROWS,
    DEFAULT_COLS,
    MIN_DIM,
    MAX_DIM,
    GRID_SIZE: DEFAULT_ROWS * DEFAULT_COLS,
    CODE_LENGTH,
    CODE_CHARS,
    burstLabel,
    isTreasure,
    playableRoster,
    fnv1a,
    normalizeCode,
    normalizeSize,
    isValidCode,
    formatShareCode,
    parseShareCode,
    randomCode,
    selectGrid,
    serializeGrid,
    parseGridCodes,
    generateCodeFile,
    gridFromSlugs,
    resolveGrid,
  };
});
