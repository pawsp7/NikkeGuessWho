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
assert(nikkes.length === 205, `roster has every tier-list Nikke (got ${nikkes.length})`);
assert(new Set(nikkes.map((n) => n.name)).size === nikkes.length, "Nikke names are unique");
assert(new Set(nikkes.map((n) => n.url)).size === nikkes.length, "Nikke slugs are unique");

const missingPortraits = nikkes.filter((n) => !fs.existsSync(path.join(portraitsDir, `${n.img}.webp`)));
assert(missingPortraits.length === 0, `every Nikke has a portrait file (missing ${missingPortraits.length})`);

const required = ["id", "name", "url", "img", "manufacturer", "class", "burst", "rarity", "weapon", "element"];
assert(
  nikkes.every((n) => required.every((key) => n[key] != null && String(n[key]).trim() !== "")),
  "every Nikke has the fields needed for Guess Who questions"
);

const code = "ABCD2345";
const gridA = GWN.selectGrid(nikkes, code);
const gridB = GWN.selectGrid(nikkes, code);
assert(gridA.length === 36, "seeded grid has 36 Nikkes");
assert(new Set(gridA.map((n) => n.url)).size === 36, "a grid never repeats a Nikke");
assert(
  gridA.map((n) => n.url).join(",") === gridB.map((n) => n.url).join(","),
  "the same code always rebuilds the same board"
);
assert(
  GWN.selectGrid(nikkes, "ZZZZZZZZ")
    .map((n) => n.url)
    .join(",") !== gridA.map((n) => n.url).join(","),
  "different codes produce different boards"
);

assert(GWN.burstLabel("1") === "I", "burst 1 -> I");
assert(GWN.burstLabel("2") === "II", "burst 2 -> II");
assert(GWN.burstLabel("3") === "III", "burst 3 -> III");
assert(GWN.burstLabel("p") === "III+", "Red Hood burst p -> III+");
assert(GWN.isValidCode("abcdefgh") === true, "8-character codes are valid");
assert(GWN.isValidCode("short") === false, "short codes are rejected");

const fileText = GWN.generateCodeFile(nikkes, 12, GWN.mulberry32 ? undefined : Math.random);
const parsed = GWN.parseGridCodes(fileText);
assert(parsed.size === 12, `generated code file parses 12 grids (got ${parsed.size})`);

const firstCode = parsed.keys().next().value;
const resolved = GWN.resolveGrid(nikkes, firstCode, parsed);
assert(resolved.ok && resolved.grid.length === 36, "resolveGrid loads a file-backed code");

const seeded = GWN.resolveGrid(nikkes, "PLAYNIK1", new Map());
assert(seeded.ok && seeded.fromFile === false && seeded.grid.length === 36, "unknown codes still seed a board");

const html = fs.readFileSync(path.join(root, "web/index.html"), "utf8");
assert(html.includes("js/game.js"), "index.html loads the game");
assert(html.includes("js/nikkes-data.js"), "index.html loads the roster");

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll tests passed");
