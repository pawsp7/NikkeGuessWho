"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const gridSource = fs.readFileSync(path.join(root, "web/js/grid.js"), "utf8");
const dataSource = fs.readFileSync(path.join(root, "web/js/nikkes-data.js"), "utf8");

const sandbox = { window: {}, module: { exports: {} }, console };
vm.createContext(sandbox);
vm.runInContext(gridSource, sandbox, { filename: "grid.js" });
vm.runInContext(dataSource, sandbox, { filename: "nikkes-data.js" });

const GWN = sandbox.GWN;
const nikkes = sandbox.window.NIKKES;
const portraitsDir = path.join(root, "web/portraits");
const playable = GWN.playableRoster(nikkes);

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok  ${message}`);
  }
}

assert(Array.isArray(nikkes), "roster is an array");
assert(nikkes.length === 205, `full dump has every tier-list Nikke (got ${nikkes.length})`);
assert(playable.length === 188, `treasure versions are excluded (got ${playable.length})`);
assert(playable.every((n) => !GWN.isTreasure(n)), "playable roster has no treasure variants");
assert(
  nikkes.filter((n) => GWN.isTreasure(n)).length === 17,
  "the dump still contains the 17 treasure variants"
);
assert(new Set(playable.map((n) => n.name)).size === playable.length, "playable names are unique");
assert(new Set(nikkes.map((n) => n.url)).size === nikkes.length, "Nikke slugs are unique");

const missingPortraits = playable.filter((n) => !fs.existsSync(path.join(portraitsDir, `${n.img}.webp`)));
assert(missingPortraits.length === 0, `every playable Nikke has a portrait file (missing ${missingPortraits.length})`);

const required = ["id", "name", "url", "img", "manufacturer", "class", "burst", "rarity", "weapon", "element"];
assert(
  playable.every((n) => required.every((key) => n[key] != null && String(n[key]).trim() !== "")),
  "every playable Nikke has the fields needed for Guess Who questions"
);

const code = "ABCD2345";
const gridA = GWN.selectGrid(nikkes, code, 6, 6);
const gridB = GWN.selectGrid(nikkes, code, 6, 6);
assert(gridA.length === 36, "default seeded grid has 36 Nikkes");
assert(GWN.selectGrid(nikkes, code, 5, 5).length === 25, "5×5 boards have 25 Nikkes");
assert(GWN.selectGrid(nikkes, code, 8, 8).length === 64, "8×8 boards have 64 Nikkes");
assert(new Set(gridA.map((n) => n.url)).size === 36, "a grid never repeats a Nikke");
assert(gridA.every((n) => !GWN.isTreasure(n)), "generated boards never include treasure versions");
assert(
  gridA.map((n) => n.url).join(",") === gridB.map((n) => n.url).join(","),
  "the same code always rebuilds the same board"
);
assert(
  GWN.selectGrid(nikkes, "ZZZZZZZZ", 6, 6)
    .map((n) => n.url)
    .join(",") !== gridA.map((n) => n.url).join(","),
  "different codes produce different boards"
);

assert(GWN.formatShareCode(code, 6, 6) === "6x6-ABCD2345", "share codes include board size");
assert(GWN.parseShareCode("6x6-abcd2345").ok, "sized share codes parse");
assert(GWN.parseShareCode("6x6-abcd2345").rows === 6, "parsed share codes keep rows");
assert(GWN.burstLabel("1") === "I", "burst 1 -> I");
assert(GWN.burstLabel("2") === "II", "burst 2 -> II");
assert(GWN.burstLabel("3") === "III", "burst 3 -> III");
assert(GWN.burstLabel("p") === "III+", "Red Hood burst p -> III+");
assert(GWN.isValidCode("abcdefgh") === true, "8-character codes are valid");
assert(GWN.isValidCode("short") === false, "short codes are rejected");

const fileText = GWN.generateCodeFile(nikkes, 12, Math.random, 5, 5);
const parsed = GWN.parseGridCodes(fileText);
assert(parsed.size === 12, `generated code file parses 12 grids (got ${parsed.size})`);
assert(
  Array.from(parsed.values()).every((entry) => entry.slugs.length === 25),
  "generated code files honor the selected board size"
);

const firstCode = parsed.keys().next().value;
const resolved = GWN.resolveGrid(nikkes, firstCode, parsed, 5, 5);
assert(resolved.ok && resolved.grid.length === 25, "resolveGrid loads a file-backed sized code");

const seeded = GWN.resolveGrid(nikkes, "PLAYNIK1", new Map(), 7, 7);
assert(seeded.ok && seeded.fromFile === false && seeded.grid.length === 49, "unknown codes still seed a board at the chosen size");

const html = fs.readFileSync(path.join(root, "web/index.html"), "utf8");
assert(html.includes("js/game.js"), "index.html loads the game");
assert(html.includes("js/nikkes-data.js"), "index.html loads the roster");
assert(html.includes("Original game by TheSakurist"), "index.html credits TheSakurist under the logo");
assert(html.includes("id=\"rowsSelect\""), "index.html has a board size picker");

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll tests passed");
