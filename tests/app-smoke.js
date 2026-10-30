/*
 * Headless smoke test for app.js: stubs just enough DOM + localStorage to
 * run init(), add an item, run the demo loader, save the note, and confirm
 * the page re-renders and restores from localStorage on reload.
 * Run with: node tests/app-smoke.js   (exit code 1 on failure)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const UnitMath = require(path.join(root, "unit-math.js"));

function makeEl(id) {
  return {
    id,
    value: "",
    innerHTML: "",
    textContent: "",
    hidden: true,
    classList: { toggle() {}, add() {}, remove() {} },
    dataset: {},
    listeners: {},
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    querySelectorAll() { return []; },
    appendChild() {},
    remove() {},
    reset() {},
    focus() {},
  };
}

const els = ["storage-status", "item-form", "demo-btn", "rankings", "totals",
  "note", "note-status", "save-note-btn", "export-btn", "import-file",
  "clear-btn"].reduce((acc, id) => {
    acc[id] = makeEl(id);
    return acc;
  }, {});

let storageError = null;
const storage = {
  setItem(k, v) { if (storageError) throw storageError; storage[k] = v; },
  getItem(k) { return k in storage ? storage[k] : null; },
  removeItem(k) { delete storage[k]; },
};

let domContentLoadedCb = null;
global.document = {
  getElementById(id) { return els[id]; },
  addEventListener(type, cb) { if (type === "DOMContentLoaded") domContentLoadedCb = cb; },
  createElement() { return makeEl("tmp"); },
  body: { appendChild() {} },
};
global.window = { UnitMath };
global.localStorage = storage;

const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
new Function(appSrc)();

// Fire init.
if (!domContentLoadedCb) throw new Error("init never registered");
domContentLoadedCb();

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
assert(els.rankings.innerHTML.includes("No items yet"), "empty state renders");
assert(!els["storage-status"].hidden === false, "no storage warning when storage works");

// Add an item through the real form handler.
const fakeForm = Object.assign(makeEl("item-form"), {
  store: Object.assign(makeEl("f-store"), { value: "Store A" }),
  shelf: Object.assign(makeEl("f-shelf"), { value: "Paper towels" }),
  name: Object.assign(makeEl("f-name"), { value: "Test Towels 100 pack" }),
  price: Object.assign(makeEl("f-price"), { value: "9.99" }),
  size: Object.assign(makeEl("f-size"), { value: "100" }),
  unit: Object.assign(makeEl("f-unit"), { value: "sheets" }),
});
els["item-form"].listeners.submit[0]({ preventDefault() {}, target: fakeForm });

assert(els.rankings.innerHTML.includes("Test Towels"), "added item renders in rankings");
assert(els.rankings.innerHTML.includes("0.0999"), "unit price $0.0999/sheet renders");
assert(els.totals.innerHTML.includes("$9.99"), "totals table renders the shelf price");

// Demo loader adds cross-store cross-shelf data.
els["demo-btn"].listeners.click[0]();
assert(els.rankings.innerHTML.includes("best value"), "best-value badge renders after demo");
assert(els.totals.innerHTML.includes("Store B"), "store totals render after demo");

// Save note through the real handler.
els.note.value = "winning cart: Store B";
els["save-note-btn"].listeners.click[0]();
assert(storage["unit-price-compare.v1"].includes("winning cart: Store B"),
  "note persists to localStorage");

// Reload path: simulate a fresh page load against the same storage.
// Fresh element stubs, same localStorage — saved items must come back.
const els2 = {};
for (const id of ["storage-status", "item-form", "demo-btn", "rankings", "totals",
  "note", "note-status", "save-note-btn", "export-btn", "import-file", "clear-btn"]) {
  els2[id] = makeEl(id);
}
let cb2 = null;
global.document = {
  getElementById(id) { return els2[id] || makeEl(id); },
  addEventListener(type, cb) { if (type === "DOMContentLoaded") cb2 = cb; },
  createElement() { return makeEl("tmp"); },
  body: { appendChild() {} },
};
new Function(appSrc)();
cb2();
assert(els2.rankings.innerHTML.includes("Test Towels"), "saved items restore from localStorage on reload");

console.log("SMOKE PASS — app renders, adds items, demos, saves note, and restores on reload");
